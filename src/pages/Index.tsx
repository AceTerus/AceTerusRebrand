import { Link, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { User, Brain, ArrowRight, Sparkles, Zap, Quote } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import Logo from "../assets/logo.png";

const heroStats = [
  { label: "Active learners", value: "12K+" },
  { label: "Resources shared", value: "4.3K" },
  { label: "Avg. session score", value: "4.9/5" },
];

const trustedBy = ["PoliTech", "Northstar STEM", "ACE Collegiate", "Quantum Labs"];

const testimonials = [
  {
    quote:
      "AceTerus helps me stay consistent with CS prep. The quizzes feel like mini wins every day.",
    author: "Nadia Rahman",
    role: "2nd year CS, Purdue",
  },
  {
    quote: "Materials + community feedback have replaced three separate tools I used before.",
    author: "Aiden Cross",
    role: "AP CS Student",
  },
];

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
    <div className="min-h-screen overflow-hidden bg-background text-foreground">
      <Navbar />
      <main>
        <section className="relative min-h-[95vh] flex items-center overflow-hidden">
          <video
            className="absolute inset-0 w-full h-full object-cover opacity-80"
            src="/videos/promotional.mp4"
            autoPlay
            muted
            loop
            playsInline
          />
          <div className="absolute inset-0 bg-gradient-to-br from-background/95 via-background/60 to-background/30 backdrop-brightness-75" />
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20" />

          <div className="container relative mx-auto px-6 py-24">
            <div className="grid items-center gap-12">
              <div className="space-y-8 text-foreground">
                <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/80 px-4 py-2 shadow-sm">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium tracking-wide text-foreground">Where learning meets achievement</span>
                </div>

                <h1 className="text-5xl font-bold leading-tight tracking-tight text-foreground md:text-7xl lg:text-8xl">
                  Ace your
                  <span className="block text-primary">journey</span>
                  with AceTerus
                </h1>

                <p className="max-w-2xl text-lg text-foreground/80 md:text-2xl">
                  Immersive quizzes, collaborative materials, and live insights—crafted to keep you learning, sharing, and celebrating every win.
                </p>

                <div className="flex flex-wrap gap-4">
                  <Button
                    size="lg"
                    className="group h-14 px-8 text-lg shadow-glow"
                    onClick={() => {
                      document.getElementById("GetStarted")?.scrollIntoView({ behavior: "smooth" });
                    }}
                  >
                    Start Learning
                    <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </Button>

                  <Link to="/auth">
                    <Button size="lg" variant="outline" className="h-14 px-8 text-lg">
                      Sign Up — it’s free!
                    </Button>
                  </Link>
                </div>

                <div className="grid gap-6 pt-10 sm:grid-cols-3">
                  {heroStats.map((stat) => (
                    <div key={stat.label} className="rounded-2xl border border-black/10 bg-white/80 p-4 text-center shadow-md">
                      <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                      <p className="text-sm uppercase tracking-wide text-foreground/70">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-muted/40 bg-muted/20 py-8">
          <div className="container mx-auto px-6">
            <p className="mb-6 text-center text-sm uppercase tracking-[0.5em] text-muted-foreground">Trusted by learners at</p>
            <div className="grid gap-4 text-center text-base font-semibold text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
              {trustedBy.map((logo) => (
                <div key={logo} className="rounded-2xl border border-muted/30 bg-card/40 px-6 py-4">
                  {logo}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="GetStarted" className="relative overflow-hidden py-32">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-secondary/5 to-muted/30" />
          <div className="absolute inset-x-0 top-10 mx-auto h-48 w-48 rounded-full bg-primary/20 blur-3xl" />
          <div className="container relative mx-auto px-6">
            <div className="mx-auto mb-16 max-w-4xl text-center space-y-6">
              <h2 className="text-4xl font-bold md:text-6xl">Start your journey with AceTerus</h2>
              <p className="text-xl text-muted-foreground">
                A powerful all-in-one platform to help you master computer science through quizzes, study materials, AI analytics, and a thriving community.
              </p>
            </div>

            <div className="grid gap-10 md:grid-cols-2 max-w-6xl mx-auto">
              <div className="rounded-3xl border border-white/20 bg-white/70 p-8 shadow-2xl backdrop-blur-lg dark:bg-black/30">
                <h3 className="text-3xl font-semibold">1. Sign up — free</h3>
                <p className="mt-4 text-muted-foreground">
                  Create your account instantly using Google or email. No friction, no commitment—just immediate access to your dashboard.
                </p>
              </div>

              <div className="rounded-3xl border border-white/20 bg-white/70 p-8 shadow-2xl backdrop-blur-lg dark:bg-black/30">
                <h3 className="text-3xl font-semibold">2. Personalize everything</h3>
                <p className="mt-4 text-muted-foreground">
                  Choose topics, pace, and study goals so AceTerus can adapt quizzes, reminders, and recommended materials to you.
                </p>
              </div>
            </div>

            <div className="mt-10 rounded-[2.5rem] border border-white/20 bg-white/80 p-10 shadow-2xl backdrop-blur-lg dark:bg-black/30">
              <h3 className="mb-10 text-center text-3xl font-semibold">3. Explore the toolkit</h3>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { title: "Quizzes", tagline: "500+ curated CS questions" },
                  { title: "Materials", tagline: "Notes & diagrams for fast learning" },
                  { title: "AI Analytics", tagline: "Track strengths & weaknesses" },
                  { title: "Tutor Classes", tagline: "Live & recorded CS sessions" },
                ].map((feature) => (
                  <div key={feature.title} className="rounded-2xl border border-muted/30 bg-card/80 p-6 text-center shadow-lg">
                    <h4 className="text-2xl font-semibold">{feature.title}</h4>
                    <p className="mt-2 text-sm text-muted-foreground">{feature.tagline}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-10 rounded-3xl border border-muted/40 bg-card/90 p-10 text-center shadow-xl">
              <h3 className="text-3xl font-semibold">4. Join the community feed</h3>
              <p className="mt-4 text-muted-foreground">
                Share your progress, ask questions, get feedback, and learn together with other students. AceTerus isn’t just a platform—it’s a community.
              </p>
            </div>
          </div>
        </section>

        <section className="bg-muted/30 py-28">
          <div className="container mx-auto px-6">
            <div className="mx-auto mb-16 max-w-3xl text-center">
              <p className="text-sm uppercase tracking-[0.4em] text-primary">What's inside</p>
              <h2 className="mt-4 text-4xl font-bold md:text-5xl">Everything you need to succeed in education</h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Each module is designed to keep you accountable, inspired, and in sync with your learning milestones.
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-2">
              <Link to="/quiz" className="group md:col-span-2">
                <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-10 shadow-2xl transition-all duration-300 hover:shadow-glow">
                  <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-primary/10 blur-3xl group-hover:bg-primary/20" />
                  <div className="relative">
                    <Brain className="mb-6 h-12 w-12 text-primary" />
                    <h3 className="text-4xl font-semibold">Interactive quizzes</h3>
                    <p className="mt-3 text-lg text-muted-foreground">
                      Test your knowledge with engaging computer science quizzes designed to challenge and improve your skills.
                    </p>
                    <div className="mt-6 flex items-center gap-2 text-primary">
                      Take a quiz
                      <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-2" />
                    </div>
                  </div>
                </div>
              </Link>

              <Link to="/profile" className="group">
                <div className="h-full rounded-3xl border border-border bg-card p-8 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-glow">
                  <User className="mb-6 h-10 w-10 text-primary" />
                  <h3 className="text-2xl font-semibold">Your profile</h3>
                  <p className="mt-4 text-muted-foreground">
                    Build your academic identity with posts, uploads, and achievements that grow alongside you.
                  </p>
                  <div className="mt-6 flex items-center gap-2 text-primary text-sm font-semibold">
                    View profiles
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </Link>

              <Link to="/discover" className="group">
                <div className="h-full rounded-3xl border border-border bg-card p-8 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-glow">
                  <Zap className="mb-6 h-10 w-10 text-primary" />
                  <h3 className="text-2xl font-semibold">Connect & grow</h3>
                  <p className="mt-4 text-muted-foreground">
                    Join a community of learners, share knowledge, and grow together with curated rooms and discussions.
                  </p>
                  <div className="mt-6 flex items-center gap-2 text-primary text-sm font-semibold">
                    Discover more
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </section>

        <section className="py-28">
          <div className="container mx-auto px-6">
            <div className="grid gap-10 lg:grid-cols-2">
              {testimonials.map((item) => (
                <div key={item.author} className="rounded-[2rem] border border-border bg-card/90 p-10 shadow-xl backdrop-blur">
                  <Quote className="h-10 w-10 text-primary" />
                  <p className="mt-6 text-2xl font-light leading-relaxed">{item.quote}</p>
                  <div className="mt-8 text-sm uppercase tracking-[0.3em] text-primary">{item.role}</div>
                  <p className="text-lg font-semibold">{item.author}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-32">
          <div className="container mx-auto px-6">
            <div className="mx-auto max-w-4xl rounded-[3rem] border border-primary/30 bg-gradient-to-br from-primary via-primary/80 to-secondary p-12 text-center text-primary-foreground shadow-2xl">
              <h2 className="text-4xl font-bold md:text-5xl">Ready to level up your CS skills?</h2>
              <p className="mt-4 text-xl text-primary-foreground/90">Join 1,200+ students already learning on AceTerus.</p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                <Link to="/quiz">
                  <Button size="lg" className="h-14 px-10 text-lg">
                    <img
                      src={Logo}
                      alt="AceTerus Logo"
                      className="mr-3 h-8 w-8 rounded-lg object-contain"
                    />
                    Start your first quiz
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link to="/auth">
                  <Button size="lg" variant="secondary" className="h-14 px-8 text-lg text-primary">
                    Create free account
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Index;
