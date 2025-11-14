import { Link, useLocation, useNavigate } from "react-router-dom";
import { BookOpen, User, Search, LogOut, Compass, FileText } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const navItems = [
  { href: "/feed", label: "Feed", icon: Compass },
  { href: "/discover", label: "Discover", icon: Search },
  { href: "/quiz", label: "Quiz", icon: BookOpen },
  { href: "/materials", label: "Materials", icon: FileText },
  { href: "/profile", label: "Profile", icon: User },
];

export const AppSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { toast } = useToast();

  const isActive = (path: string) => location.pathname === path;

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
    toast({
      title: "Signed out",
      description: "You have been successfully signed out.",
    });
  };

  return (
    <aside className="hidden lg:flex lg:flex-col fixed left-0 top-0 h-screen w-64 border-r border-border bg-background p-6 z-50">
      {/* Logo */}
      <Link to="/feed" className="flex items-center space-x-2 mb-8 group">
        <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center group-hover:shadow-glow transition-all duration-300">
          <BookOpen className="w-5 h-5 text-primary-foreground" />
        </div>
        <span className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          EduHub
        </span>
      </Link>

      {/* Navigation */}
      <nav className="flex flex-col space-y-2 flex-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              to={item.href}
              className={`
                flex items-center space-x-4 px-4 py-3 rounded-lg transition-smooth
                ${isActive(item.href)
                  ? "bg-muted font-semibold"
                  : "hover:bg-muted/50"
                }
              `}
            >
              <Icon className={`w-6 h-6 ${isActive(item.href) ? "stroke-[2.5]" : ""}`} />
              <span className="text-base">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Section at Bottom */}
      {user && (
        <div className="border-t border-border pt-4 space-y-4">
          <Link to="/profile" className="flex items-center space-x-3 px-2 py-2 rounded-lg hover:bg-muted/50 transition-smooth">
            <Avatar className="h-10 w-10">
              <AvatarImage src={user?.user_metadata?.avatar_url} />
              <AvatarFallback>
                {user?.email?.[0]?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {user?.email?.split("@")[0] || "User"}
              </p>
            </div>
          </Link>
          <Button
            variant="ghost"
            onClick={handleSignOut}
            className="w-full justify-start space-x-2 hover:bg-muted"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </Button>
        </div>
      )}
    </aside>
  );
};
