import { Link, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BookOpen, User, Brain, ArrowRight, Sparkles, Zap } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";

const Index = () => {
  const { user, isLoading } = useAuth();

  // Redirect authenticated users to feed
  if (isLoading) {
    return null; // or a loading spinner
  }

  if (user) {
    return <Navigate to="/feed" replace />;
  }

  return (
    <div className="min-h-screen overflow-hidden">
      <Navbar />
      {/* Hero Section - Asymmetric Layout */}
      <section className="relative min-h-[90vh] flex items-center">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Column - Main Content */}
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/20 bg-primary/5">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Where learning meets achievement</span>
              </div>
              
              <h1 className="text-6xl md:text-7xl lg:text-8xl font-bold leading-none">
                Learn.
                <br />
                <span className="text-primary">Quiz.</span>
                <br />
                Excel.
              </h1>
              
              <p className="text-xl md:text-2xl text-muted-foreground max-w-lg leading-relaxed">
                Master computer science through interactive quizzes, connect with peers, and track your journey to success.
              </p>
              
              <div className="flex flex-wrap gap-4">
                <Link to="/quiz">
                  <Button size="lg" className="text-lg px-8 h-14 group">
                    Start Learning
                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <Link to="/auth">
                  <Button variant="outline" size="lg" className="text-lg px-8 h-14">
                    Sign Up Free
                  </Button>
                </Link>
              </div>
            </div>

            {/* Right Column - Visual Elements */}
            <div className="relative hidden lg:block">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent rounded-3xl blur-3xl" />
              <div className="relative space-y-4">
                {/* Floating Stat Cards */}
                <div className="flex justify-end animate-fade-in" style={{ animationDelay: "0.1s" }}>
                  <div className="bg-card border rounded-2xl p-6 shadow-elegant inline-block">
                    <div className="text-4xl font-bold text-primary mb-1">1,200+</div>
                    <div className="text-sm text-muted-foreground">Active Students</div>
                  </div>
                </div>
                
                <div className="flex justify-start animate-fade-in" style={{ animationDelay: "0.2s" }}>
                  <div className="bg-card border rounded-2xl p-6 shadow-elegant inline-block">
                    <div className="text-4xl font-bold text-primary mb-1">500+</div>
                    <div className="text-sm text-muted-foreground">Quiz Questions</div>
                  </div>
                </div>
                
                <div className="flex justify-end animate-fade-in" style={{ animationDelay: "0.3s" }}>
                  <div className="bg-card border rounded-2xl p-6 shadow-elegant inline-block">
                    <div className="text-4xl font-bold text-primary mb-1">85%</div>
                    <div className="text-sm text-muted-foreground">Success Rate</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section - Creative Grid */}
      <section className="py-32 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-20">
              <h2 className="text-5xl md:text-6xl font-bold mb-6">
                Why AceTerus?
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Everything you need to succeed in computer science
              </p>
            </div>

            {/* Asymmetric Feature Grid */}
            <div className="grid md:grid-cols-2 gap-8">
              {/* Feature 1 - Large */}
              <Link to="/quiz" className="group md:col-span-2">
                <div className="relative bg-card border rounded-3xl p-10 md:p-12 hover:shadow-glow transition-all duration-300 overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors" />
                  <div className="relative">
                    <Brain className="w-12 h-12 text-primary mb-6" />
                    <h3 className="text-3xl md:text-4xl font-bold mb-4">Interactive Quizzes</h3>
                    <p className="text-lg text-muted-foreground mb-6 max-w-2xl">
                      Test your knowledge with engaging computer science quizzes designed to challenge and improve your skills
                    </p>
                    <div className="flex items-center gap-2 text-primary font-medium">
                      Take a quiz
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-2 transition-transform" />
                    </div>
                  </div>
                </div>
              </Link>

              {/* Feature 2 */}
              <Link to="/profile" className="group">
                <div className="bg-card border rounded-3xl p-8 h-full hover:shadow-glow transition-all duration-300">
                  <User className="w-10 h-10 text-primary mb-6" />
                  <h3 className="text-2xl font-bold mb-3">Your Profile</h3>
                  <p className="text-muted-foreground mb-4">
                    Build your academic identity with posts, uploads, and achievements
                  </p>
                  <div className="flex items-center gap-2 text-primary font-medium text-sm">
                    View profiles
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-2 transition-transform" />
                  </div>
                </div>
              </Link>

              {/* Feature 3 */}
              <Link to="/discover" className="group">
                <div className="bg-card border rounded-3xl p-8 h-full hover:shadow-glow transition-all duration-300">
                  <Zap className="w-10 h-10 text-primary mb-6" />
                  <h3 className="text-2xl font-bold mb-3">Connect & Grow</h3>
                  <p className="text-muted-foreground mb-4">
                    Join a community of learners, share knowledge, and grow together
                  </p>
                  <div className="flex items-center gap-2 text-primary font-medium text-sm">
                    Discover more
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-2 transition-transform" />
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section - Bold and Simple */}
      <section className="py-32">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <h2 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight">
              Ready to level up your CS skills?
            </h2>
            <p className="text-2xl text-muted-foreground">
              Join 1,200+ students already learning on AceTerus
            </p>
            <div className="flex flex-wrap gap-4 justify-center pt-4">
              <Link to="/quiz">
                <Button size="lg" className="text-lg px-10 h-14 group">
                  <BookOpen className="w-5 h-5 mr-2" />
                  Start Your First Quiz
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
