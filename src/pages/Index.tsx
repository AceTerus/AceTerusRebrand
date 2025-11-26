import { Link, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BookOpen, User, Brain, ArrowRight, Sparkles, Zap } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import Logo from "../assets/logo.png";

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
        <section className="relative min-h-[90vh] flex items-center overflow-hidden">

            {/* GIF Background */}
            <img
              src="src/assets/images/aceterus.gif"  // <-- path to your GIF
              alt="Hero Background"
              className="absolute top-0 left-0 w-full h-full object-cover z-[-1]"
            />

          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-12 items-center">

              {/* Left Column - Main Content */}
              <div className="space-y-8 relative z-10 text-white">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/20 bg-primary/30">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Where learning meets achievement</span>
                </div>

                <h1
                  className="text-6xl md:text-7xl lg:text-8xl font-bold leading-none text-white"
                  style={{ WebkitTextStroke: "1px black" }}
                >
                  Ace
                  <br />
                  with
                  <br />
                  <span className="text-primary">
                    AceTerus.
                  </span>
                </h1>

                <div className="bg-black/40 p-6 md:p-8 rounded-2xl shadow-lg max-w-lg">
                  <p
                    className="text-xl md:text-3xl leading-relaxed text-white"
                  >
                    Your all-in-one platform for mastering education through interactive quizzes, community engagement, and resource sharing.
                  </p>
                </div>

                <div className="flex flex-wrap gap-4">
                  <Button
                    size="lg"
                    className="text-lg px-8 h-14 group"
                    onClick={() => {
                      document.getElementById("GetStarted").scrollIntoView({
                        behavior: "smooth"
                      });
                    }}
                  >
                    Start Learning
                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>

                  <Link to="/auth">
                    <Button size="lg" className="text-lg px-8 h-14 bg-purple-600 text-white hover:bg-purple-700 transition-colors">
                      Sign Up - It's Free!
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Right Column - Visual Elements */}
              <div className="relative hidden lg:block z-10">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent rounded-3xl blur-3xl" />
                <div className="relative space-y-4">
                  {/* 1 — Top Card */}
                  <div className="flex justify-end animate-fade-in" style={{ animationDelay: "0.1s" }}>
                    <div className="bg-card border rounded-2xl p-6 shadow-elegant inline-block">
                      <div className="text-4xl font-bold text-primary mb-1">1,200+</div>
                      <div className="text-sm text-muted-foreground">Active Students</div>
                    </div>
                  </div>

                  {/* ⭐ CENTER LOGO CARD */}
                  <div className="flex justify-center animate-fade-in" style={{ animationDelay: "0.18s" }}>
                    <img 
                      src="/Round Logo.png" 
                      alt="Logo Placeholder"
                      className="w-60 h-60 object-contain opacity-100"
                    />
                  </div>

                  {/* 2 — Middle Stat Card */}
                  <div className="flex justify-start animate-fade-in" style={{ animationDelay: "0.2s" }}>
                    <div className="bg-card border rounded-2xl p-6 shadow-elegant inline-block">
                      <div className="text-4xl font-bold text-primary mb-1">500+</div>
                      <div className="text-sm text-muted-foreground">Quiz Questions</div>
                    </div>
                  </div>

                  {/* 3 — Bottom Card */}
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

      <section id="GetStarted" className="relative py-40 overflow-hidden">

        {/* Animated Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/30 via-purple-600/30 to-pink-500/30 animate-gradient bg-[length:300%_300%]"></div>

        {/* Floating Decorations */}
        <div className="absolute top-10 left-20 w-40 h-40 bg-white/10 rounded-full blur-2xl animate-float-slow"></div>
        <div className="absolute bottom-10 right-20 w-52 h-52 bg-white/10 rounded-full blur-3xl animate-float"></div>

        <div className="container relative mx-auto px-6">
          
          {/* Section Title */}
          <div className="text-center max-w-4xl mx-auto space-y-6 mb-24">
            <h2 className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-black drop-shadow-xl">
              Start Your Journey With AceTerus
            </h2>

            <p className="text-xl md:text-2xl text-black/80 leading-relaxed">
              A powerful all-in-one platform to help you master Computer Science through quizzes, 
              study materials, AI analytics, and a thriving learning community.
            </p>
          </div>

          {/* Step Grid */}
          <div className="grid md:grid-cols-2 gap-12 max-w-6xl mx-auto">

            {/* Step 1 */}
            <div className="bg-green/10 backdrop-blur-xl p-10 rounded-3xl shadow-2xl 
                            animate-fade-up border border-white/20 hover:scale-[1.03] transition-all duration-300">
              <h3 className="text-4xl font-bold text-black">1. Sign Up — Free</h3>
              <p className="text-black/80 mt-4">
                Create your AceTerus account instantly using Google or email. No friction,
                no commitment — start learning right away.
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-white/10 backdrop-blur-xl p-10 rounded-3xl shadow-2xl 
                            animate-fade-up delay-100 border border-white/20 hover:scale-[1.03] transition-all duration-300">
              <h3 className="text-4xl font-bold text-black">2. Personalize Your Profile</h3>
              <p className="text-black/80 mt-4">
                Choose topics, difficulty level, and goals — and our AI automatically
                adjusts quizzes and content for your level.
              </p>
            </div>

            {/* Step 3 */}
            <div className="md:col-span-2 bg-white/10 backdrop-blur-xl p-12 rounded-3xl shadow-xl 
                            animate-fade-up delay-200 border border-white/20">
              
              <h3 className="text-4xl font-bold text-center text-black mb-10">
                3. Explore Features
              </h3>

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">

                <div className="bg-white/10 p-6 rounded-2xl border border-white/20 shadow-lg text-center">
                  <h4 className="text-2xl font-bold text-black mb-2">Quizzes</h4>
                  <p className="text-black/70">500+ curated CS questions</p>
                </div>

                <div className="bg-white/10 p-6 rounded-2xl border border-white/20 shadow-lg text-center">
                  <h4 className="text-2xl font-bold text-black mb-2">Materials</h4>
                  <p className="text-black/70">Notes & diagrams for fast learning</p>
                </div>

                <div className="bg-white/10 p-6 rounded-2xl border border-white/20 shadow-lg text-center">
                  <h4 className="text-2xl font-bold text-black mb-2">AI Analytics</h4>
                  <p className="text-black/70">Track strengths & weaknesses</p>
                </div>

                <div className="bg-white/10 p-6 rounded-2xl border border-white/20 shadow-lg text-center">
                  <h4 className="text-2xl font-bold text-black mb-2">Tutor Classes</h4>
                  <p className="text-black/70">Live & recorded CS sessions</p>
                </div>

              </div>
            </div>

            {/* Step 4 */}
            <div className="md:col-span-2 bg-white/10 backdrop-blur-xl p-10 rounded-3xl shadow-2xl 
                            animate-fade-up delay-300 border border-white/20 hover:scale-[1.02] transition-all duration-300">
              <h3 className="text-4xl font-bold text-black text-center">
                4. Join the Community Feed
              </h3>
              <p className="text-black/80 mt-4 text-center max-w-3xl mx-auto">
                Share your progress, ask questions, get feedback, and learn together with 
                other students. AceTerus isn’t just a platform — it’s a community.
              </p>
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
                  <img
                    src={Logo}
                    alt="AceTerus Logo"
                    className="w-8 h-8 object-contain rounded-lg group-hover:shadow-glow transition-all duration-300"
                  />
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
