import { useState } from "react";
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
  Target
} from "lucide-react";

interface ExamPaper {
  id: string;
  title: string;
  subject: string;
  location: string;
  year: number;
  questionCount: number;
  duration: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  completions: number;
}

const Quiz = () => {
  const [selectedSubject, setSelectedSubject] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Mock statistics
  const stats = [
    {
      icon: FileText,
      value: "127",
      label: "papers completed",
      color: "text-blue-500",
      bgColor: "bg-blue-50"
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

  const subjects = ["All", "Computer Science", "Mathematics", "Physics", "Chemistry", "Biology"];

  const examPapers: ExamPaper[] = [
    {
      id: "1009",
      title: "Computer Science | Data Structures | 2024",
      subject: "Computer Science",
      location: "Federal Territory",
      year: 2024,
      questionCount: 25,
      duration: 90,
      difficulty: "Medium",
      completions: 1234
    },
    {
      id: "1008", 
      title: "Mathematics | Calculus Set 2 | 2024",
      subject: "Mathematics",
      location: "Selangor",
      year: 2024,
      questionCount: 30,
      duration: 120,
      difficulty: "Hard",
      completions: 987
    },
    {
      id: "1007",
      title: "Physics | Mechanics Set 1 | 2024", 
      subject: "Physics",
      location: "Penang",
      year: 2024,
      questionCount: 20,
      duration: 75,
      difficulty: "Medium",
      completions: 654
    },
    {
      id: "1006",
      title: "Chemistry | Organic Chemistry | 2024",
      subject: "Chemistry", 
      location: "Johor",
      year: 2024,
      questionCount: 35,
      duration: 100,
      difficulty: "Hard",
      completions: 543
    },
    {
      id: "1005",
      title: "Biology | Cell Biology Set 2 | 2024",
      subject: "Biology",
      location: "Kuala Lumpur",
      year: 2024,
      questionCount: 28,
      duration: 85,
      difficulty: "Easy",
      completions: 765
    },
    {
      id: "1004",
      title: "Computer Science | Algorithms | 2024",
      subject: "Computer Science",
      location: "Sabah",
      year: 2024,
      questionCount: 22,
      duration: 80,
      difficulty: "Medium",
      completions: 432
    },
    {
      id: "1003",
      title: "Mathematics | Statistics | 2024",
      subject: "Mathematics", 
      location: "Sarawak",
      year: 2024,
      questionCount: 26,
      duration: 95,
      difficulty: "Easy",
      completions: 678
    },
    {
      id: "1002",
      title: "Physics | Thermodynamics | 2024",
      subject: "Physics",
      location: "Melaka",
      year: 2024,
      questionCount: 24,
      duration: 90,
      difficulty: "Hard",
      completions: 321
    }
  ];

  // Filter exam papers
  const filteredPapers = examPapers.filter(paper => {
    const matchesSubject = selectedSubject === "All" || paper.subject === selectedSubject;
    const matchesSearch = paper.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         paper.location.toLowerCase().includes(searchQuery.toLowerCase());
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
    <div className="min-h-screen pt-20 pb-8 bg-gradient-to-br from-background via-muted/20 to-background">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Target className="w-8 h-8 text-primary" />
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

        {/* Search Bar */}
        <div className="relative mb-8">
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
          <Button 
            size="sm" 
            className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-gradient-primary"
          >
            Search
          </Button>
        </div>

        {/* Exam Papers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {paginatedPapers.map((paper) => (
            <Card key={paper.id} className="shadow-elegant hover:shadow-glow transition-all cursor-pointer group">
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
                    <span className="text-xs">{paper.location}</span>
                  </div>

                  <Button 
                    className="w-full mt-4 bg-gradient-primary shadow-glow"
                    size="sm"
                  >
                    Start Exam
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

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