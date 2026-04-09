import { Link, useLocation } from "react-router-dom";
import { BookOpen, User, Compass, FileText, MessageCircle, ScanLine } from "lucide-react";
import { useChatNotifications } from "@/context/ChatNotificationsContext";
import { NotificationsBell } from "@/components/NotificationsBell";

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
    { href: "/ar-scanner.html", label: "AR", icon: ScanLine, external: true },
    { href: "/profile", label: "Profile", icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-t border-border lg:hidden">
      <div className="flex items-center justify-around px-1 pb-safe">
        <div className="flex flex-col items-center gap-0.5 px-3 py-2 min-w-0 flex-1">
          <NotificationsBell compact />
          <span className="text-[10px] font-medium text-muted-foreground">Alerts</span>
        </div>
        {items.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          if (item.external) {
            return (
              <a
                key={item.href}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg transition-colors text-muted-foreground min-w-0 flex-1"
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium truncate w-full text-center">{item.label}</span>
              </a>
            );
          }
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
