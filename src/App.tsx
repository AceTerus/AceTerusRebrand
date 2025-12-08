import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { AppSidebar } from "./components/AppSidebar";
import { ThemeToggle } from "./components/ThemeToggle";
import Index from "./pages/Index";
import { Profile } from "./pages/Profile";
import { Discover } from "./pages/Discover";
import { Feed } from "./pages/Feed";
import { Materials } from "./pages/Materials";
import Quiz from "./pages/Quiz";
import { QuizTaking } from "./pages/QuizTaking";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import { Chat } from "./pages/Chat";
import { ChatNotificationsProvider } from "./context/ChatNotificationsContext";

const queryClient = new QueryClient();

const AppContent = () => {
  const { user } = useAuth();

  return (
    <BrowserRouter>
      <div className="flex min-h-screen w-full">
        {user && <AppSidebar />}
        <main className={`flex-1 ${user ? 'lg:pl-64' : ''}`}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/feed" element={<Feed />} />
            <Route path="/quiz" element={<Quiz />} />
            <Route path="/quiz/:quizId" element={<QuizTaking />} />
            <Route path="/materials" element={<Materials />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/profile/:userId" element={<Profile />} />
            <Route path="/discover" element={<Discover />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/auth" element={<Auth />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <ChatNotificationsProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <ThemeToggle />
          <AppContent />
        </TooltipProvider>
      </ChatNotificationsProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
