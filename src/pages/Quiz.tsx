import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  Clock, 
  FileText, 
  Users, 
  Calendar,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  GraduationCap,
  Target,
  Flame
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useStreak } from "@/hooks/useStreak";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import Logo from "@/assets/logo.png";
import { apiClient } from "@/lib/api-client";
import { mapDecksToExamPapers, type ExamPaper } from "@/lib/deck-to-quiz-mapper";
import type { Deck, PaginatedResponse } from "@/types/openmultiplechoice";

const Quiz = () => {
  const navigate = useNavigate();
  const [selectedSubject, setSelectedSubject] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [examPapers, setExamPapers] = useState<ExamPaper[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const itemsPerPage = 6;
  const { user } = useAuth();
  const { streak } = useStreak();
  const { toast } = useToast();

  useEffect(() => {
    fetchQuizzes();
  }, []);

  const fetchQuizzes = async () => {
    try {
      setIsLoading(true);
      
      // Fetch decks from openmultiplechoice API
      // Use public endpoint first (no authentication required)
      let response;
      try {
        // Try public endpoint first (works without authentication)
        response = await apiClient.get('/decks/public');
      } catch (error) {
        // Fallback: try authenticated endpoint if user is logged in
        if (user) {
          try {
            response = await apiClient.fetchDecks({ kind: 'public-rw-listed' });
          } catch (authError) {
            // Last fallback: try user decks
            try {
              response = await apiClient.fetchDecks({ kind: 'user' });
            } catch (finalError) {
              throw error; // Throw original error
            }
          }
        } else {
          throw error;
        }
      }
      
      // Handle paginated response or array response
      let decks: Deck[];
      if (Array.isArray(response)) {
        decks = response;
      } else if ((response as PaginatedResponse<Deck>).data) {
        decks = (response as PaginatedResponse<Deck>).data;
      } else {
        decks = [];
      }

      // Filter out archived and ephemeral decks
      decks = decks.filter(deck => !deck.is_archived && !deck.is_ephemeral);

      // Map decks to exam papers format
      const examPapersData = mapDecksToExamPapers(decks);
      setExamPapers(examPapersData);
    } catch (error: any) {
      console.error("Error fetching quizzes:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to load quizzes. Please check your connection and ensure the API server is running.",
        variant: "destructive",
      });
      setExamPapers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartExam = async (deckId: string) => {
    // Validate user authentication
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to take quizzes",
        variant: "destructive"
      });
      return;
    }

    // Validate deckId
    const parsedDeckId = parseInt(deckId);
    if (isNaN(parsedDeckId) || parsedDeckId <= 0) {
      console.error("Invalid deck ID:", deckId);
      toast({
        title: "Invalid quiz",
        description: "The selected quiz is invalid. Please try selecting another quiz.",
        variant: "destructive",
      });
      return;
    }

    // Find the exam paper to validate it exists and has questions
    const examPaper = examPapers.find(paper => paper.id === deckId);
    if (examPaper && examPaper.questionCount === 0) {
      toast({
        title: "No questions available",
        description: "This quiz has no questions. Please select another quiz.",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log("Creating session for deck:", {
        deckId: parsedDeckId,
        examPaperTitle: examPaper?.title,
        questionCount: examPaper?.questionCount,
      });

      // Create a session from the deck
      const session = await apiClient.createSession(parsedDeckId) as { id: number };
      
      if (!session || !session.id) {
        throw new Error("Invalid session response from server");
      }

      console.log("Session created successfully:", session.id);
      
      // Navigate to quiz taking page with session ID
      navigate(`/quiz/${session.id}`);
    } catch (error: any) {
      // Enhanced error logging
      console.error("Error creating session:", {
        deckId: parsedDeckId,
        error: error.message || error,
        errorType: error.constructor?.name,
        stack: error.stack,
      });

      // Extract error message - ApiError has a message property
      let errorMessage = "Failed to start quiz";
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }

      // Show user-friendly error message
      toast({
        title: "Error starting quiz",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  // Statistics
  const stats = [
    {
      icon: Flame,
      value: streak.toString(),
      label: "day streak",
      color: "text-orange-500",
      bgColor: "bg-orange-50"
    },
    {
      icon: Calendar,
      value: "-257",
      label: "days to SPM Bertutur",
      color: "text-orange-500",
      bgColor: "bg-orange-50"
    },
    {
      icon: Clock,
      value: "-250", 
      label: "days to SPM Amali",
      color: "text-cyan-500",
      bgColor: "bg-cyan-50"
    },
    {
      icon: GraduationCap,
      value: "-226",
      label: "days to SPM Bertulis", 
      color: "text-red-500",
      bgColor: "bg-red-50"
    }
  ];

  // Get unique subjects from quizzes
  const subjects = ["All", ...Array.from(new Set(examPapers.map(p => p.subject))).sort()];

  // Filter exam papers
  const filteredPapers = examPapers.filter(paper => {
    const matchesSubject = selectedSubject === "All" || paper.subject === selectedSubject;
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = searchQuery === "" || 
      paper.title.toLowerCase().includes(searchLower) ||
      (paper.location && paper.location.toLowerCase().includes(searchLower));
    return matchesSubject && matchesSearch;
  });

  // Pagination
  const totalPages = Math.ceil(filteredPapers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedPapers = filteredPapers.slice(startIndex, startIndex + itemsPerPage);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return 'text-green-600 bg-green-50 border-green-200';
      case 'Medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'Hard': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="min-h-screen pb-8 bg-gradient-to-br from-background via-muted/20 to-background">
      {!user && <Navbar />}
      <div className={`container mx-auto px-4 max-w-6xl ${!user ? 'pt-20' : ''}`}>
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <img src={Logo} alt="AceTerus Logo" className="w-16 h-16" />
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              AceTerus
            </h1>
          </div>
          <p className="text-muted-foreground">
            Practice with authentic exam papers and track your progress
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index} className="shadow-elegant hover:shadow-glow transition-shadow">
                <CardContent className="p-4 text-center">
                  <div className={`w-12 h-12 ${stat.bgColor} rounded-lg flex items-center justify-center mx-auto mb-3`}>
                    <Icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                  <div className="text-2xl font-bold text-primary mb-1">
                    {stat.value}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {stat.label}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Subject Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          {subjects.map((subject) => (
            <Button
              key={subject}
              variant={selectedSubject === subject ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setSelectedSubject(subject);
                setCurrentPage(1);
              }}
              className={selectedSubject === subject ? "bg-gradient-primary shadow-glow" : ""}
            >
              {subject}
            </Button>
          ))}
        </div>

        {/* Search */}
        <div className="mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search for exam papers"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-10"
            />
          </div>
        </div>

        {/* Exam Papers Grid */}
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading quizzes...</p>
          </div>
        ) : paginatedPapers.length === 0 ? (
          <Card className="mb-8">
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground mb-4">No quizzes found.</p>
              <p className="text-sm text-muted-foreground">
                {searchQuery || selectedSubject !== "All" 
                  ? "Try adjusting your search or filters." 
                  : "No decks are available at the moment."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {paginatedPapers.map((paper) => (
            <Card key={paper.id} className="shadow-elegant hover:shadow-glow transition-all group">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between mb-2">
                  <Badge variant="outline" className="text-xs font-medium">
                    {paper.id}
                  </Badge>
                  <Badge className={`text-xs ${getDifficultyColor(paper.difficulty)}`}>
                    {paper.difficulty}
                  </Badge>
                </div>
                <CardTitle className="text-lg leading-tight group-hover:text-primary transition-colors">
                  {paper.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center space-x-1">
                      <BookOpen className="w-3 h-3" />
                      <span>{paper.questionCount} questions</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>{paper.duration} min</span>
                    </div>
                  </div>
                  
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center space-x-1">
                      <Users className="w-3 h-3" />
                      <span>{paper.completions.toLocaleString()} completed</span>
                    </div>
                    {paper.location && (
                      <span className="text-xs">{paper.location}</span>
                    )}
                  </div>

                  <Button 
                    className="w-full mt-4 bg-gradient-primary shadow-glow hover:opacity-90 transition-opacity"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStartExam(paper.id);
                    }}
                    disabled={paper.questionCount === 0}
                  >
                    {paper.questionCount === 0 ? "No Questions" : "Start Quiz"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(currentPage - 1)}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <Button
                key={page}
                variant={currentPage === page ? "default" : "outline"}
                size="sm"
                onClick={() => setCurrentPage(page)}
                className={currentPage === page ? "bg-gradient-primary" : ""}
              >
                {page}
              </Button>
            ))}

            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(currentPage + 1)}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Quiz;