import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { AppSidebar } from "./components/AppSidebar";
import { MobileNav } from "./components/MobileNav";
import Index from "./pages/Index";
import { Profile } from "./pages/Profile";
import { Discover } from "./pages/Discover";
import { Feed } from "./pages/Feed";
import { Materials } from "./pages/Materials";
import Quiz from "./pages/Quiz";
import OmrScanner from "./pages/OmrScanner";
import ArScanner from "./pages/ArScanner";
import AdminQuiz from "./pages/AdminQuiz";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import { Chat } from "./pages/Chat";
import { ChatNotificationsProvider } from "./context/ChatNotificationsContext";
import { NotificationsProvider } from "./context/NotificationsContext";
import { MascotProvider } from "./context/MascotContext";
import MascotCompanion from "./components/MascotCompanion";
import MascotGreeter from "./components/MascotGreeter";
import MascotChat from "./components/MascotChat";
import { useGoalReminders } from "./hooks/useGoalReminders";

const queryClient = new QueryClient();

const AppContent = () => {
  const { user } = useAuth();
  useGoalReminders();
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(() => {
    return localStorage.getItem("sidebar-collapsed") === "true";
  });

  const handleSidebarCollapse = (collapsed: boolean) => {
    setSidebarCollapsed(collapsed);
    localStorage.setItem("sidebar-collapsed", String(collapsed));
  };

  return (
    <BrowserRouter>
      <div className="flex min-h-screen w-full">
        {user && <AppSidebar collapsed={sidebarCollapsed} onCollapseToggle={handleSidebarCollapse} />}
        {user && <MobileNav />}
        {user && <MascotGreeter />}
        {user && <MascotCompanion />}
        {user && <MascotChat />}
        <main className={`flex-1 transition-all duration-300 ${user ? (sidebarCollapsed ? 'lg:pl-[70px]' : 'lg:pl-64') : ''}`}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/feed" element={<Feed />} />
            <Route path="/quiz" element={<Quiz />} />
            <Route path="/omr-scan" element={<OmrScanner />} />
            <Route path="/ar-scanner" element={<ArScanner />} />
            <Route path="/admin" element={<AdminQuiz />} />
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
        <NotificationsProvider>
          <MascotProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <AppContent />
            </TooltipProvider>
          </MascotProvider>
        </NotificationsProvider>
      </ChatNotificationsProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
