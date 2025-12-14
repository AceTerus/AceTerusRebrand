import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Clock, CheckCircle2, XCircle, ArrowLeft, ArrowRight } from "lucide-react";
import { useStreak } from "@/hooks/useStreak";
import { apiClient } from "@/lib/api-client";
import type { SessionWithDeck, Question as OMCQuestion, Answer } from "@/types/openmultiplechoice";

interface Question {
  id: string;
  question_text: string;
  question_type: 'multiple_choice' | 'true_false' | 'short_answer';
  correct_answer: string;
  points: number;
  position: number;
  explanation: string | null;
  options?: Array<{ id: string; option_text: string; option_index: number }>;
}

interface Quiz {
  id: string;
  title: string;
  subject: string;
  duration: number;
  difficulty: string;
}

export const QuizTaking = () => {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { updateStreak } = useStreak();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0); // in seconds
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState<{ score: number; total: number; percentage: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [startTime, setStartTime] = useState<Date | null>(null);

  useEffect(() => {
    if (quizId) {
      fetchQuiz();
    }
  }, [quizId]);

  useEffect(() => {
    if (quiz && timeRemaining > 0 && !isSubmitted) {
      const timer = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            handleSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [quiz, timeRemaining, isSubmitted]);

  const fetchQuiz = async () => {
    if (!quizId) return;

    try {
      setIsLoading(true);

      // Fetch session with deck and questions from openmultiplechoice API
      const sessionData = await apiClient.fetchSession(quizId) as SessionWithDeck;
      
      if (!sessionData.session || !sessionData.deck) {
        throw new Error('Session or deck not found');
      }

      const deck = sessionData.deck;
      const session = sessionData.session;

      // Map deck to quiz format
      const quizData: Quiz = {
        id: session.id.toString(),
        title: deck.name,
        subject: deck.module?.subject?.name || deck.module?.name || 'Unknown',
        duration: deck.questions ? Math.max(30, Math.ceil(deck.questions.length * 2)) : 60,
        difficulty: deck.questions && deck.questions.length > 50 ? 'Hard' : 
                   deck.questions && deck.questions.length < 20 ? 'Easy' : 'Medium',
      };

      setQuiz(quizData);
      setTimeRemaining(quizData.duration * 60);
      setStartTime(new Date());

      // Map openmultiplechoice questions to component format
      const mappedQuestions: Question[] = (deck.questions || []).map((q: OMCQuestion, index: number) => {
        const answers = q.answers || [];
        const correctAnswerId = q.correct_answer_id?.toString() || '';

        return {
          id: q.id.toString(),
          question_text: q.text,
          question_type: 'multiple_choice' as const,
          correct_answer: correctAnswerId,
          points: 1,
          position: index + 1,
          explanation: q.comment || null,
          options: answers.map((answer: Answer) => ({
            id: answer.id.toString(),
            option_text: answer.text,
            option_index: parseInt(answer.id.toString()),
          })),
        };
      });

      setQuestions(mappedQuestions);
    } catch (error: any) {
      console.error("Error fetching quiz:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to load quiz",
        variant: "destructive",
      });
      navigate('/quiz');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers({ ...answers, [questionId]: answer });
  };

  const handleSubmit = async () => {
    if (!user || !quiz || !quizId || questions.length === 0) return;

    setIsSubmitted(true);

    try {
      let totalScore = 0;
      let totalPoints = 0;
      let correctCount = 0;

      // Submit answers and calculate score
      for (const question of questions) {
        totalPoints += question.points;
        const userAnswerId = answers[question.id];
        
        if (!userAnswerId) {
          continue; // Skip unanswered questions
        }

        // Create answer choice via API
        try {
          await apiClient.createAnswerChoice(
            parseInt(quizId),
            parseInt(question.id),
            parseInt(userAnswerId)
          );
        } catch (error) {
          console.error(`Error submitting answer for question ${question.id}:`, error);
        }

        // Check if answer is correct
        const isCorrect = userAnswerId === question.correct_answer;
        if (isCorrect) {
          totalScore += question.points;
          correctCount++;
        }
      }

      const percentage = totalPoints > 0 ? (totalScore / totalPoints) * 100 : 0;

      // Update streak if score is good enough
      if (percentage >= 50 && quizId) {
        try {
          await updateStreak(quizId);
        } catch (error) {
          console.error('Error updating streak:', error);
        }
      }

      setScore({ score: totalScore, total: totalPoints, percentage });

      toast({
        title: "Quiz submitted!",
        description: `You scored ${totalScore}/${totalPoints} (${percentage.toFixed(1)}%)`,
      });
    } catch (error: any) {
      console.error("Error submitting quiz:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit quiz",
        variant: "destructive",
      });
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const currentQuestion = questions[currentQuestionIndex];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Loading quiz...</p>
        </div>
      </div>
    );
  }

  if (!quiz || questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Quiz not found</p>
          <Button onClick={() => navigate('/quiz')} className="mt-4">
            Back to Quizzes
          </Button>
        </div>
      </div>
    );
  }

  if (isSubmitted && score) {
    return (
      <div className="min-h-screen p-4 bg-gradient-to-br from-background via-muted/20 to-background">
        <div className="container mx-auto max-w-4xl">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-2xl">Quiz Results</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center">
                <div className="text-6xl font-bold mb-2">
                  {score.percentage.toFixed(1)}%
                </div>
                <p className="text-muted-foreground">
                  {score.score} out of {score.total} points
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Correct</p>
                  <p className="text-2xl font-bold text-green-600">
                    {questions.filter((q, idx) => {
                      const userAnswer = answers[q.id] || "";
                      if (q.question_type === 'multiple_choice') {
                        return userAnswer === q.correct_answer;
                      } else if (q.question_type === 'true_false') {
                        return userAnswer.toLowerCase() === q.correct_answer.toLowerCase();
                      } else {
                        return userAnswer.toLowerCase().trim() === q.correct_answer.toLowerCase().trim();
                      }
                    }).length}
                  </p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Incorrect</p>
                  <p className="text-2xl font-bold text-red-600">
                    {questions.length - questions.filter((q) => {
                      const userAnswer = answers[q.id] || "";
                      if (q.question_type === 'multiple_choice') {
                        return userAnswer === q.correct_answer;
                      } else if (q.question_type === 'true_false') {
                        return userAnswer.toLowerCase() === q.correct_answer.toLowerCase();
                      } else {
                        return userAnswer.toLowerCase().trim() === q.correct_answer.toLowerCase().trim();
                      }
                    }).length}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Review Answers</h3>
                {questions.map((question, idx) => {
                  const userAnswer = answers[question.id] || "";
                  let isCorrect = false;
                  
                  if (question.question_type === 'multiple_choice') {
                    isCorrect = userAnswer === question.correct_answer;
                  } else if (question.question_type === 'true_false') {
                    isCorrect = userAnswer.toLowerCase() === question.correct_answer.toLowerCase();
                  } else {
                    isCorrect = userAnswer.toLowerCase().trim() === question.correct_answer.toLowerCase().trim();
                  }

                  return (
                    <Card key={question.id} className={isCorrect ? "border-green-500" : "border-red-500"}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-2 mb-2">
                          {isCorrect ? (
                            <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                          )}
                          <div className="flex-1">
                            <p className="font-medium mb-2">
                              {idx + 1}. {question.question_text}
                            </p>
                            <div className="space-y-1 text-sm">
                              <p>
                                <span className="font-medium">Your answer:</span>{" "}
                                <span className={isCorrect ? "text-green-600" : "text-red-600"}>
                                  {userAnswer || "No answer"}
                                </span>
                              </p>
                              {!isCorrect && (
                                <p>
                                  <span className="font-medium">Correct answer:</span>{" "}
                                  <span className="text-green-600">
                                    {question.question_type === 'multiple_choice' && question.options
                                      ? question.options[parseInt(question.correct_answer)]?.option_text
                                      : question.correct_answer}
                                  </span>
                                </p>
                              )}
                              {question.explanation && (
                                <p className="text-muted-foreground mt-2">
                                  <span className="font-medium">Explanation:</span> {question.explanation}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              <div className="flex gap-2">
                <Button onClick={() => navigate('/quiz')} className="flex-1">
                  Back to Quizzes
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setAnswers({});
                    setCurrentQuestionIndex(0);
                    setIsSubmitted(false);
                    setScore(null);
                    setTimeRemaining(quiz.duration * 60);
                    setStartTime(new Date());
                  }}
                >
                  Retake Quiz
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 bg-gradient-to-br from-background via-muted/20 to-background">
      <div className="container mx-auto max-w-4xl">
        {/* Header with Timer */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">{quiz.title}</h1>
                <p className="text-sm text-muted-foreground">{quiz.subject}</p>
              </div>
              <div className="flex items-center gap-4">
                <Badge variant="outline">{quiz.difficulty}</Badge>
                <div className="flex items-center gap-2 text-lg font-semibold">
                  <Clock className="w-5 h-5" />
                  {formatTime(timeRemaining)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
            <span>{Math.round(((currentQuestionIndex + 1) / questions.length) * 100)}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all"
              style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Question Card */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-4">
                {currentQuestion.question_text}
              </h2>

              {currentQuestion.question_type === 'multiple_choice' && currentQuestion.options && (
                <RadioGroup
                  value={answers[currentQuestion.id] || ""}
                  onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
                >
                  {currentQuestion.options.map((option) => (
                    <div key={option.id} className="flex items-center space-x-2 p-3 rounded-lg hover:bg-muted cursor-pointer">
                      <RadioGroupItem value={option.id} id={option.id} />
                      <Label htmlFor={option.id} className="flex-1 cursor-pointer">
                        {option.option_text}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              )}

              {currentQuestion.question_type === 'true_false' && (
                <RadioGroup
                  value={answers[currentQuestion.id] || ""}
                  onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
                >
                  <div className="flex items-center space-x-2 p-3 rounded-lg hover:bg-muted cursor-pointer">
                    <RadioGroupItem value="true" id="true" />
                    <Label htmlFor="true" className="cursor-pointer">True</Label>
                  </div>
                  <div className="flex items-center space-x-2 p-3 rounded-lg hover:bg-muted cursor-pointer">
                    <RadioGroupItem value="false" id="false" />
                    <Label htmlFor="false" className="cursor-pointer">False</Label>
                  </div>
                </RadioGroup>
              )}

              {currentQuestion.question_type === 'short_answer' && (
                <div>
                  <input
                    type="text"
                    value={answers[currentQuestion.id] || ""}
                    onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                    className="w-full p-3 border rounded-lg"
                    placeholder="Type your answer..."
                  />
                </div>
              )}
            </div>

            {/* Navigation */}
            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                disabled={currentQuestionIndex === 0}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>
              <div className="flex gap-2">
                {currentQuestionIndex < questions.length - 1 ? (
                  <Button
                    onClick={() => setCurrentQuestionIndex(currentQuestionIndex + 1)}
                  >
                    Next
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                ) : (
                  <Button onClick={handleSubmit} className="bg-green-600 hover:bg-green-700">
                    Submit Quiz
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Question Navigation Grid */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Question Navigation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-10 gap-2">
              {questions.map((q, idx) => (
                <Button
                  key={q.id}
                  variant={answers[q.id] ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentQuestionIndex(idx)}
                  className={currentQuestionIndex === idx ? "ring-2 ring-primary" : ""}
                >
                  {idx + 1}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

