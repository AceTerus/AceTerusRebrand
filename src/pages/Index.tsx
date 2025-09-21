import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, User, Brain, Trophy, Users, TrendingUp } from "lucide-react";

const Index = () => {
  const features = [
    {
      icon: Brain,
      title: "Interactive Quizzes",
      description: "Test your knowledge with engaging computer science quizzes",
      link: "/quiz"
    },
    {
      icon: User,
      title: "Student Profiles",
      description: "Create and manage your academic profile with posts and uploads",
      link: "/profile"
    },
    {
      icon: Trophy,
      title: "Track Progress",
      description: "Monitor your learning journey and achievements",
      link: "/quiz"
    },
    {
      icon: Users,
      title: "Study Groups",
      description: "Connect with classmates and form study groups",
      link: "/profile"
    }
  ];

  const stats = [
    { icon: Users, value: "1,200+", label: "Active Students" },
    { icon: BookOpen, value: "500+", label: "Quiz Questions" },
    { icon: TrendingUp, value: "85%", label: "Pass Rate" },
    { icon: Trophy, value: "2,500+", label: "Completed Quizzes" }
  ];

  return (
    <div className="min-h-screen pt-16">
      {/* Hero Section */}
      <section className="relative py-20 bg-gradient-to-br from-background via-muted/20 to-background">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              Welcome to{" "}
              <span className="bg-gradient-primary bg-clip-text text-transparent">
                EduHub
              </span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Your comprehensive platform for computer science learning, quizzes, and academic collaboration. 
              Connect with classmates, test your knowledge, and track your progress.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/quiz">
                <Button size="lg" className="bg-gradient-primary shadow-glow text-lg px-8">
                  <Brain className="w-5 h-5 mr-2" />
                  Start Quiz
                </Button>
              </Link>
              <Link to="/auth">
                <Button variant="outline" size="lg" className="text-lg px-8">
                  <User className="w-5 h-5 mr-2" />
                  Sign In / Sign Up
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div key={index} className="text-center">
                  <div className="w-12 h-12 bg-gradient-primary rounded-lg flex items-center justify-center mx-auto mb-3 shadow-glow">
                    <Icon className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <div className="text-2xl font-bold text-primary mb-1">{stat.value}</div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything You Need to{" "}
              <span className="bg-gradient-primary bg-clip-text text-transparent">
                Excel
              </span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Discover powerful features designed to enhance your learning experience and academic success.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card key={index} className="shadow-elegant hover:shadow-glow transition-shadow cursor-pointer">
                  <Link to={feature.link}>
                    <CardContent className="p-6">
                      <div className="w-12 h-12 bg-gradient-primary rounded-lg flex items-center justify-center mb-4 shadow-glow">
                        <Icon className="w-6 h-6 text-primary-foreground" />
                      </div>
                      <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                      <p className="text-muted-foreground">{feature.description}</p>
                    </CardContent>
                  </Link>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-hero">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-2xl mx-auto text-primary-foreground">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Start Learning?
            </h2>
            <p className="text-xl mb-8 opacity-90">
              Join thousands of students already using EduHub to enhance their computer science education.
            </p>
            <Link to="/quiz">
              <Button size="lg" variant="secondary" className="text-lg px-8 shadow-lg">
                <BookOpen className="w-5 h-5 mr-2" />
                Take Your First Quiz
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
