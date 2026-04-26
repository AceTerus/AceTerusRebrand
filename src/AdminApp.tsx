import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Link } from "react-router-dom";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import AdminQuiz from "./pages/AdminQuiz";
import Logo from "./assets/logo.png";
import { Loader2, ExternalLink } from "lucide-react";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 1000 * 60 * 2 } },
});

const DISPLAY = "font-['Baloo_2'] tracking-tight";

function AdminNavbar() {
  const { user, isAdmin, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-50 border-b-[2.5px] border-[#0F172A] bg-white shadow-[0_2px_0_0_#0F172A]">
      <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <img src={Logo} alt="AceTerus" className="w-8 h-8 rounded-xl" />
          <span className={`${DISPLAY} font-extrabold text-[17px] text-[#0F172A]`}>
            AceTerus <span className="text-[#2E2BE5]">Admin</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="https://aceterus.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-[2px] border-[#0F172A]/20 text-[13px] font-bold font-['Nunito'] text-[#0F172A]/60 hover:border-[#0F172A] hover:text-[#0F172A] transition-all"
          >
            <ExternalLink className="w-3.5 h-3.5" /> AceTerus
          </a>
          <a
            href="https://events.aceterus.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-[2px] border-[#0F172A]/20 text-[13px] font-bold font-['Nunito'] text-[#0F172A]/60 hover:border-[#0F172A] hover:text-[#0F172A] transition-all"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Events
          </a>
          {user && (
            <button
              onClick={() => signOut()}
              className="px-3 py-1.5 rounded-xl border-[2px] border-red-200 text-[13px] font-bold font-['Nunito'] text-red-500 hover:bg-red-50 transition-all"
            >
              Sign Out
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

function AdminGuard() {
  const { user, isAdmin, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#2E2BE5]" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="border-[2.5px] border-[#0F172A] rounded-[24px] shadow-[6px_6px_0_0_#0F172A] bg-white p-10 text-center space-y-5 max-w-sm w-full">
          <div className="text-5xl">🔐</div>
          <h2 className={`${DISPLAY} font-extrabold text-[24px] text-[#0F172A]`}>Admin Access</h2>
          <p className="font-['Nunito'] text-[#0F172A]/60 text-[14px]">Sign in to AceTerus to access admin tools.</p>
          <a
            href="https://aceterus.com/auth"
            className="flex items-center justify-center gap-2 w-full px-5 py-3 rounded-xl border-[2.5px] border-[#0F172A] bg-[#2E2BE5] text-white font-bold font-['Nunito'] shadow-[3px_3px_0_0_#0F172A] hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_#0F172A] transition-all"
          >
            Sign In via AceTerus
          </a>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="border-[2.5px] border-[#0F172A] rounded-[24px] shadow-[6px_6px_0_0_#0F172A] bg-white p-10 text-center space-y-5 max-w-sm w-full">
          <div className="text-5xl">🚫</div>
          <h2 className={`${DISPLAY} font-extrabold text-[24px] text-[#0F172A]`}>Access Denied</h2>
          <p className="font-['Nunito'] text-[#0F172A]/60 text-[14px]">You don't have admin privileges.</p>
          <a
            href="https://aceterus.com"
            className="flex items-center justify-center gap-2 w-full px-5 py-3 rounded-xl border-[2.5px] border-[#0F172A] bg-white font-bold font-['Nunito'] shadow-[3px_3px_0_0_#0F172A] hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_#0F172A] transition-all"
          >
            Back to AceTerus
          </a>
        </div>
      </div>
    );
  }

  return <AdminQuiz />;
}

const AdminApp = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Sonner />
        <BrowserRouter basename={window.location.pathname.startsWith("/admin.html") ? "/admin.html" : "/"}>
          <div className="min-h-screen bg-[#F8F9FF]">
            <AdminNavbar />
            <Routes>
              <Route path="/" element={<AdminGuard />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default AdminApp;
