import { Link, useLocation } from "react-router-dom";
import { BookOpen, User, Compass, FileText, MessageCircle } from "lucide-react";
import { useChatNotifications } from "@/context/ChatNotificationsContext";

export const MobileNav = () => {
  const location = useLocation();
  const { totalSenders } = useChatNotifications();

  const isActive = (path: string) => location.pathname === path;

  const items = [
    { href: "/feed", label: "Feed", icon: Compass },
    {
      href: "/chat",
      label: "Chat",
      icon: MessageCircle,
      badge: totalSenders > 0 ? Math.min(totalSenders, 99) : undefined,
    },
    { href: "/quiz", label: "Quiz", icon: BookOpen },
    { href: "/materials", label: "Materials", icon: FileText },
    { href: "/profile", label: "Profile", icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-t border-border lg:hidden">
      <div className="flex items-center justify-around px-1 pb-safe">
        {items.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              to={item.href}
              className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg transition-colors relative min-w-0 flex-1 ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${active ? "stroke-[2.5]" : ""}`} />
                {item.badge && (
                  <span className="absolute -top-1.5 -right-2 inline-flex min-w-[1.1rem] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground leading-none py-0.5">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] font-medium truncate w-full text-center ${active ? "text-primary" : ""}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
