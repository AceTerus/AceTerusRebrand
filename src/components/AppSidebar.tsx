import { Link, useLocation, useNavigate } from "react-router-dom";
import { BookOpen, User, Search, LogOut, Compass, FileText, MessageCircle, ShieldCheck, ScanLine, ChevronLeft, ChevronRight } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import Logo from "../assets/logo.png";
import { useChatNotifications } from "@/context/ChatNotificationsContext";
import { NotificationsBell } from "@/components/NotificationsBell";

interface AppSidebarProps {
  collapsed: boolean;
  onCollapseToggle: (collapsed: boolean) => void;
}

export const AppSidebar = ({ collapsed, onCollapseToggle }: AppSidebarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin, signOut } = useAuth();
  const { toast } = useToast();
  const { totalSenders } = useChatNotifications();

  const isActive = (path: string) => location.pathname === path;

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
    toast({
      title: "Signed out",
      description: "You have been successfully signed out.",
    });
  };

  const navItems = [
    { href: "/feed", label: "Feed", icon: Compass },
    { href: "/discover", label: "Discover", icon: Search },
    {
      href: "/chat",
      label: "Chat",
      icon: MessageCircle,
      badge: totalSenders > 0 ? Math.min(totalSenders, 99) : undefined,
    },
    { href: "/quiz", label: "Quiz", icon: BookOpen },
    { href: "/materials", label: "Materials", icon: FileText },
    { href: "/ar-scanner", label: "AR Scanner", icon: ScanLine },
    { href: "/profile", label: "Profile", icon: User },
    ...(isAdmin ? [{ href: "/admin", label: "Admin", icon: ShieldCheck }] : []),
  ];

  return (
    <aside
      className={`
        hidden lg:flex lg:flex-col fixed left-0 top-0 h-screen border-r border-border bg-white z-50
        transition-all duration-300
        ${collapsed ? "w-[70px]" : "w-64"}
      `}
    >
      {/* Logo */}
      <div className="flex items-center justify-center mb-4 mt-3">
        <Link to="/feed" className="group">
          <img
            src={Logo}
            alt="AceTerus Logo"
            className="w-[10vh] h-[10vh] object-contain rounded-xl group-hover:shadow-glow transition-all duration-300"
          />
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col space-y-1 flex-1 px-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              to={item.href}
              title={collapsed ? item.label : undefined}
              className={`
                relative flex items-center rounded-xl transition-all duration-200 group
                ${collapsed ? "justify-center px-0 py-4" : "px-5 py-4 space-x-4"}
                ${active
                  ? "bg-primary/10 text-primary font-semibold"
                  : "text-foreground/70 hover:bg-muted/60 hover:text-foreground"
                }
              `}
            >
              {/* Active indicator bar */}
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-r-full bg-primary" />
              )}

              <div className="relative flex-shrink-0">
                <Icon className={`w-6 h-6 ${active ? "stroke-[2.5]" : "stroke-[1.8]"}`} />
                {item.badge && (
                  <span className="absolute -top-1.5 -right-2 inline-flex min-w-[1.1rem] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground leading-none py-0.5">
                    {item.badge}
                  </span>
                )}
              </div>

              {!collapsed && (
                <span className="text-[17px] flex-1">{item.label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle button */}
      <div className={`px-3 pb-2 ${collapsed ? "flex justify-center" : ""}`}>
        <button
          onClick={() => onCollapseToggle(!collapsed)}
          className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* User Section at Bottom */}
      {user && (
        <div className="border-t border-border pt-4 pb-4 px-3 space-y-2">
          {collapsed ? (
            <div className="flex flex-col items-center gap-2">
              <Link to="/profile" title="Profile">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={user?.user_metadata?.avatar_url} />
                  <AvatarFallback>
                    {user?.email?.[0]?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
              </Link>
              <NotificationsBell />
              <button
                onClick={handleSignOut}
                title="Sign Out"
                className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <Link to="/profile" className="flex items-center space-x-3 px-2 py-2 rounded-xl hover:bg-muted/60 transition-all flex-1 min-w-0">
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarImage src={user?.user_metadata?.avatar_url} />
                    <AvatarFallback>
                      {user?.email?.[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">
                      {user?.email?.split("@")[0] || "User"}
                    </p>
                  </div>
                </Link>
                <NotificationsBell />
              </div>
              <Button
                variant="ghost"
                onClick={handleSignOut}
                className="w-full justify-start space-x-2 hover:bg-muted rounded-xl text-muted-foreground hover:text-foreground"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </Button>
            </>
          )}
        </div>
      )}
    </aside>
  );
};
