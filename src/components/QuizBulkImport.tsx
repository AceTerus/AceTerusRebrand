import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Upload, FileText, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface QuizData {
  title: string;
  subject: string;
  location?: string;
  year?: number;
  description?: string;
  duration: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  questions: Array<{
    question_text: string;
    question_type: 'multiple_choice' | 'true_false' | 'short_answer';
    correct_answer: string;
    points?: number;
    options?: string[];
    explanation?: string;
  }>;
}

export const QuizBulkImport = ({ onImportSuccess }: { onImportSuccess: () => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [importMethod, setImportMethod] = useState<'csv' | 'json'>('csv');
  const [csvText, setCsvText] = useState("");
  const [jsonText, setJsonText] = useState("");
  const [quizMetadata, setQuizMetadata] = useState({
    title: "",
    subject: "",
    location: "",
    year: new Date().getFullYear(),
    description: "",
    duration: 60,
    difficulty: 'Medium' as 'Easy' | 'Medium' | 'Hard'
  });
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const parseCSV = (text: string): QuizData['questions'] => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) {
      throw new Error("CSV must have at least a header row and one question row");
    }

    const questions: QuizData['questions'] = [];
    const headers = lines[0].toLowerCase().split(',').map(h => h.trim());

    // Expected CSV format:
    // question,option1,option2,option3,option4,correct_answer,points,explanation
    // or for true/false: question,correct_answer,points,explanation

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      
      if (values.length < 2) continue;

      const questionText = values[0];
      let questionType: 'multiple_choice' | 'true_false' | 'short_answer' = 'multiple_choice';
      let correctAnswer = "";
      let options: string[] = [];
      let points = 1;
      let explanation = "";

      // Check if it's a true/false question (only 2-4 columns)
      if (values.length <= 4) {
        questionType = 'true_false';
        correctAnswer = values[1]?.toLowerCase() === 'true' ? 'true' : 'false';
        points = parseInt(values[2]) || 1;
        explanation = values[3] || "";
      } else {
        // Multiple choice question
        options = values.slice(1, 5).filter(v => v); // options 1-4
        correctAnswer = values[5] || "0"; // index of correct answer (0-3)
        points = parseInt(values[6]) || 1;
        explanation = values[7] || "";
      }

      questions.push({
        question_text: questionText,
        question_type: questionType,
        correct_answer: correctAnswer,
        points,
        options: questionType === 'multiple_choice' ? options : undefined,
        explanation
      });
    }

    return questions;
  };

  const parseJSON = (text: string): QuizData => {
    try {
      const data = JSON.parse(text);
      if (!data.title || !data.subject || !data.questions || !Array.isArray(data.questions)) {
        throw new Error("JSON must have title, subject, and questions array");
      }
      return data;
    } catch (error: any) {
      throw new Error(`Invalid JSON: ${error.message}`);
    }
  };

  const handleImport = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to import quizzes",
        variant: "destructive",
      });
      return;
    }

    if (!quizMetadata.title || !quizMetadata.subject) {
      toast({
        title: "Missing information",
        description: "Please provide quiz title and subject",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      let questions: QuizData['questions'] = [];

      if (importMethod === 'csv') {
        if (!csvText.trim()) {
          throw new Error("Please provide CSV data");
        }
        questions = parseCSV(csvText);
      } else {
        if (!jsonText.trim()) {
          throw new Error("Please provide JSON data");
        }
        const jsonData = parseJSON(jsonText);
        // Merge JSON metadata with form metadata (form takes precedence)
        Object.assign(quizMetadata, {
          title: jsonData.title || quizMetadata.title,
          subject: jsonData.subject || quizMetadata.subject,
          location: jsonData.location || quizMetadata.location,
          year: jsonData.year || quizMetadata.year,
          description: jsonData.description || quizMetadata.description,
          duration: jsonData.duration || quizMetadata.duration,
          difficulty: jsonData.difficulty || quizMetadata.difficulty,
        });
        questions = jsonData.questions;
      }

      if (questions.length === 0) {
        throw new Error("No questions found in import data");
      }

      // Create quiz
      const { data: quiz, error: quizError } = await supabase
        .from('quizzes' as any)
        .insert({
          title: quizMetadata.title,
          subject: quizMetadata.subject,
          location: quizMetadata.location || null,
          year: quizMetadata.year || null,
          description: quizMetadata.description || null,
          duration: quizMetadata.duration,
          difficulty: quizMetadata.difficulty,
          created_by: user.id,
        })
        .select()
        .single();

      if (quizError) throw quizError;

      // Create questions and options
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];

        const { data: question, error: questionError } = await supabase
          .from('questions' as any)
          .insert({
            quiz_id: quiz.id,
            question_text: q.question_text,
            question_type: q.question_type,
            correct_answer: q.correct_answer,
            points: q.points || 1,
            position: i,
            explanation: q.explanation || null,
          })
          .select()
          .single();

        if (questionError) throw questionError;

        // Create options for multiple choice questions
        if (q.question_type === 'multiple_choice' && q.options && q.options.length > 0) {
          const optionsToInsert = q.options.map((opt, idx) => ({
            question_id: question.id,
            option_text: opt,
            option_index: idx,
          }));

          const { error: optionsError } = await supabase
            .from('question_options' as any)
            .insert(optionsToInsert);

          if (optionsError) throw optionsError;
        }
      }

      toast({
        title: "Quiz imported successfully!",
        description: `Imported ${questions.length} questions`,
      });

      // Reset form
      setCsvText("");
      setJsonText("");
      setQuizMetadata({
        title: "",
        subject: "",
        location: "",
        year: new Date().getFullYear(),
        description: "",
        duration: 60,
        difficulty: 'Medium'
      });
      setIsOpen(false);
      onImportSuccess();

    } catch (error: any) {
      console.error("Import error:", error);
      toast({
        title: "Import failed",
        description: error.message || "Failed to import quiz",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <Upload className="w-4 h-4 mr-2" />
          Bulk Import Quiz
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Import Quiz</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Quiz Metadata */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quiz Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={quizMetadata.title}
                    onChange={(e) => setQuizMetadata({ ...quizMetadata, title: e.target.value })}
                    placeholder="e.g., Computer Science | Data Structures | 2024"
                  />
                </div>
                <div>
                  <Label htmlFor="subject">Subject *</Label>
                  <Input
                    id="subject"
                    value={quizMetadata.subject}
                    onChange={(e) => setQuizMetadata({ ...quizMetadata, subject: e.target.value })}
                    placeholder="e.g., Computer Science"
                  />
                </div>
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={quizMetadata.location}
                    onChange={(e) => setQuizMetadata({ ...quizMetadata, location: e.target.value })}
                    placeholder="e.g., Federal Territory"
                  />
                </div>
                <div>
                  <Label htmlFor="year">Year</Label>
                  <Input
                    id="year"
                    type="number"
                    value={quizMetadata.year}
                    onChange={(e) => setQuizMetadata({ ...quizMetadata, year: parseInt(e.target.value) || new Date().getFullYear() })}
                  />
                </div>
                <div>
                  <Label htmlFor="duration">Duration (minutes) *</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={quizMetadata.duration}
                    onChange={(e) => setQuizMetadata({ ...quizMetadata, duration: parseInt(e.target.value) || 60 })}
                  />
                </div>
                <div>
                  <Label htmlFor="difficulty">Difficulty *</Label>
                  <Select
                    value={quizMetadata.difficulty}
                    onValueChange={(value: 'Easy' | 'Medium' | 'Hard') => setQuizMetadata({ ...quizMetadata, difficulty: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Easy">Easy</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="Hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={quizMetadata.description}
                  onChange={(e) => setQuizMetadata({ ...quizMetadata, description: e.target.value })}
                  placeholder="Optional description"
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Import Method Selection */}
          <div>
            <Label>Import Format</Label>
            <div className="flex gap-2 mt-2">
              <Button
                variant={importMethod === 'csv' ? 'default' : 'outline'}
                onClick={() => setImportMethod('csv')}
              >
                CSV
              </Button>
              <Button
                variant={importMethod === 'json' ? 'default' : 'outline'}
                onClick={() => setImportMethod('json')}
              >
                JSON
              </Button>
            </div>
          </div>

          {/* CSV Import */}
          {importMethod === 'csv' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">CSV Format</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted p-3 rounded text-sm">
                  <p className="font-semibold mb-2">CSV Format (Multiple Choice):</p>
                  <code className="text-xs">
                    question,option1,option2,option3,option4,correct_answer_index,points,explanation
                  </code>
                  <p className="font-semibold mt-3 mb-2">CSV Format (True/False):</p>
                  <code className="text-xs">
                    question,correct_answer,points,explanation
                  </code>
                  <p className="text-xs mt-2 text-muted-foreground">
                    Example: What is 2+2?,4,5,6,7,0,1,The answer is 4
                  </p>
                </div>
                <div>
                  <Label htmlFor="csv">CSV Data *</Label>
                  <Textarea
                    id="csv"
                    value={csvText}
                    onChange={(e) => setCsvText(e.target.value)}
                    placeholder="Paste your CSV data here..."
                    rows={10}
                    className="font-mono text-sm"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* JSON Import */}
          {importMethod === 'json' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">JSON Format</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted p-3 rounded text-sm">
                  <p className="font-semibold mb-2">JSON Format:</p>
                  <pre className="text-xs overflow-x-auto">
{`{
  "title": "Quiz Title",
  "subject": "Subject Name",
  "questions": [
    {
      "question_text": "Question?",
      "question_type": "multiple_choice",
      "correct_answer": "0",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "points": 1,
      "explanation": "Explanation"
    }
  ]
}`}
                  </pre>
                </div>
                <div>
                  <Label htmlFor="json">JSON Data *</Label>
                  <Textarea
                    id="json"
                    value={jsonText}
                    onChange={(e) => setJsonText(e.target.value)}
                    placeholder="Paste your JSON data here..."
                    rows={15}
                    className="font-mono text-sm"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isUploading}>
              Cancel
            </Button>
            <Button onClick={handleImport} disabled={isUploading}>
              {isUploading ? "Importing..." : "Import Quiz"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

