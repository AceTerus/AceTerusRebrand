import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Bell, Heart, MessageCircle, UserPlus, X,
  BookOpen, Flame, AlertTriangle, Target, Sparkles, CheckCheck,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNotifications, Notification } from "@/context/NotificationsContext";
import { useFollow } from "@/hooks/useFollow";
import { formatDistanceToNow } from "date-fns";

/* ── brand tokens ── */
const C = {
  ink: "#0F172A", blue: "#2F7CFF", cyan: "#3BD6F5", indigo: "#2E2BE5",
  skySoft: "#DDF3FF", indigoSoft: "#D6D4FF", pop: "#FF7A59", sun: "#FFD65C",
};

const TYPE_CONFIG: Record<Notification["type"], { bg: string; color: string; icon: React.ElementType }> = {
  follow:           { bg: C.skySoft,    color: C.blue,    icon: UserPlus },
  like:             { bg: "#FFE4E6",    color: C.pop,     icon: Heart },
  material_like:    { bg: "#FFE4E6",    color: C.pop,     icon: Heart },
  comment:          { bg: "#D1FAE5",    color: "#15803d", icon: MessageCircle },
  material_comment: { bg: "#D1FAE5",    color: "#15803d", icon: MessageCircle },
  quiz_published:   { bg: C.indigoSoft, color: C.indigo,  icon: BookOpen },
  streak_milestone: { bg: "#FEF3C7",    color: "#b45309", icon: Flame },
  streak_broken:    { bg: "#FFE4D6",    color: C.pop,     icon: AlertTriangle },
  goal_reminder:    { bg: "#FEF9C3",    color: "#92400e", icon: Target },
};

const notifText = (notif: Notification): string => {
  switch (notif.type) {
    case "follow":           return "started following you";
    case "like":             return "liked your post";
    case "material_like":    return "liked your material";
    case "comment":          return "commented on your post";
    case "material_comment": return "commented on your material";
    case "quiz_published":   return `New quiz: ${notif.metadata?.category_name ?? ""}`;
    case "streak_milestone": return `${notif.metadata?.streak}-day streak reached! 🔥`;
    case "streak_broken":    return `Your ${notif.metadata?.old_streak}-day streak was broken`;
    case "goal_reminder": {
      const text = notif.metadata?.text ?? "a goal";
      return `Reminder: "${text.length > 40 ? text.slice(0, 40) + "…" : text}"`;
    }
    default: return "";
  }
};

const notifLink = (notif: Notification): string => {
  if (notif.type === "follow") return `/profile/${notif.actor_id}`;
  if (notif.type === "like" || notif.type === "comment") return "/feed";
  if (notif.type === "material_like" || notif.type === "material_comment") return "/materials";
  if (notif.type === "quiz_published") return "/quiz";
  return "/feed";
};

const isSelfNotif = (n: Notification) =>
  n.type === "streak_milestone" || n.type === "streak_broken" ||
  n.type === "quiz_published"   || n.type === "goal_reminder";

/* ── Follow-back button ── */
const FollowBack = ({ actorId }: { actorId: string }) => {
  const { isFollowing, isLoading, toggleFollow } = useFollow(actorId);
  return (
    <button
      disabled={isLoading}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFollow(); }}
      className="shrink-0 inline-flex items-center gap-1 font-extrabold font-['Baloo_2'] text-[11px] border-[2px] border-[#0F172A] rounded-full px-3 py-1 shadow-[2px_2px_0_0_#0F172A] transition-all hover:-translate-y-0.5 cursor-pointer disabled:opacity-40"
      style={{ background: isFollowing ? "#f1f5f9" : C.blue, color: isFollowing ? C.ink : "#fff" }}
    >
      {isFollowing ? "Following" : "Follow Back"}
    </button>
  );
};

/* ── Single notification row ── */
const NotificationItem = ({ notif, onMarkRead, onClose }: {
  notif: Notification;
  onMarkRead: (id: string) => void;
  onClose: () => void;
}) => {
  const cfg = TYPE_CONFIG[notif.type] ?? TYPE_CONFIG.comment;
  const Icon = cfg.icon;
  const actorName = notif.actor?.username ?? "Someone";
  const avatarUrl  = notif.actor?.avatar_url ?? undefined;
  const timeAgo    = formatDistanceToNow(new Date(notif.created_at), { addSuffix: true });
  const self       = isSelfNotif(notif);

  return (
    <Link
      to={notifLink(notif)}
      onClick={() => { if (!notif.read) onMarkRead(notif.id); onClose(); }}
      className="block"
    >
      <div
        className={`flex items-start gap-3 px-4 py-3 transition-colors hover:bg-slate-50 border-b border-[#0F172A]/5 ${
          !notif.read ? "bg-[#F0F7FF]" : "bg-white"
        }`}
      >
        <div className="relative shrink-0">
          {self ? (
            <span
              className="flex h-9 w-9 items-center justify-center rounded-[12px] border-[2px] border-[#0F172A] shadow-[2px_2px_0_0_#0F172A]"
              style={{ background: cfg.bg }}
            >
              <Icon className="w-4 h-4" style={{ color: cfg.color }} />
            </span>
          ) : (
            <>
              <Avatar className="h-9 w-9 border-[2px] border-[#0F172A] shadow-[2px_2px_0_0_#0F172A]">
                <AvatarImage src={avatarUrl} className="object-cover" />
                <AvatarFallback className="font-extrabold text-sm" style={{ background: cfg.bg, color: cfg.color }}>
                  {actorName[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span
                className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full border-[2px] border-white flex items-center justify-center"
                style={{ background: cfg.bg }}
              >
                <Icon className="w-2.5 h-2.5" style={{ color: cfg.color }} />
              </span>
            </>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm leading-snug text-[#0F172A]">
            {!self && <span className="font-bold">{actorName} </span>}
            <span className={self ? "font-semibold" : "text-slate-600"}>{notifText(notif)}</span>
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5 font-semibold">{timeAgo}</p>
        </div>

        {notif.type === "follow" && <FollowBack actorId={notif.actor_id} />}

        {!notif.read && (
          <span className="w-2 h-2 rounded-full shrink-0 mt-2" style={{ background: C.blue }} />
        )}
      </div>
    </Link>
  );
};

/* ── Main export ── */
export const NotificationsBell = () => {
  const { notifications, unreadCount, markAllRead, markRead, isLoading } = useNotifications();
  const [open, setOpen] = useState(false);
  const bellRef  = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  /* Position the panel to the right of the bell button */
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  const openPanel = () => {
    if (!bellRef.current) return;
    const r = bellRef.current.getBoundingClientRect();
    const panelW = 320;
    const panelH = Math.min(520, window.innerHeight - 32);
    const left   = r.right + 10;
    // Clamp vertically so it never overflows the screen
    const top    = Math.min(r.top, window.innerHeight - panelH - 16);
    setPos({ top, left });
    setOpen(true);
  };

  /* Close on outside click */
  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (
        bellRef.current?.contains(e.target as Node) ||
        panelRef.current?.contains(e.target as Node)
      ) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  /* Reposition on scroll / resize */
  useEffect(() => {
    if (!open) return;
    const update = () => {
      if (!bellRef.current) return;
      const r = bellRef.current.getBoundingClientRect();
      const panelH = Math.min(520, window.innerHeight - 32);
      setPos({ top: Math.min(r.top, window.innerHeight - panelH - 16), left: r.right + 10 });
    };
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open]);

  const panel = open && pos ? (
    <div
      ref={panelRef}
      className="fixed z-[60] flex flex-col border-[3px] border-[#0F172A] rounded-[24px] shadow-[6px_6px_0_0_#0F172A] bg-white overflow-hidden"
      style={{ top: pos.top, left: pos.left, width: 320, maxHeight: Math.min(520, window.innerHeight - 32) }}
    >
      {/* Gradient bar */}
      <div className="h-1.5 w-full shrink-0" style={{ background: `linear-gradient(90deg, ${C.blue}, ${C.cyan})` }} />

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b-[2.5px] border-[#0F172A]/10 shrink-0">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-[10px] border-[2px] border-[#0F172A] shadow-[2px_2px_0_0_#0F172A] flex items-center justify-center shrink-0"
            style={{ background: C.skySoft }}
          >
            <Bell className="w-4 h-4" style={{ color: C.blue }} />
          </div>
          <div>
            <p className="font-extrabold font-['Baloo_2'] text-base leading-tight">Notifications</p>
            {unreadCount > 0 && (
              <p className="text-[11px] font-bold text-slate-400">{unreadCount} unread</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="inline-flex items-center gap-1 text-[11px] font-bold border-[2px] border-[#0F172A] rounded-full px-2.5 py-1 shadow-[2px_2px_0_0_#0F172A] transition-all hover:-translate-y-0.5 cursor-pointer"
              style={{ background: C.skySoft, color: C.blue }}
            >
              <CheckCheck className="w-3 h-3" /> All read
            </button>
          )}
          <button
            onClick={() => setOpen(false)}
            className="w-7 h-7 rounded-[8px] border-[2px] border-[#0F172A] shadow-[2px_2px_0_0_#0F172A] flex items-center justify-center transition-all hover:-translate-y-0.5 cursor-pointer"
            style={{ background: "#FFE4E6" }}
          >
            <X className="w-3.5 h-3.5" style={{ color: C.pop }} />
          </button>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-36 gap-3">
            <div className="w-9 h-9 rounded-[12px] border-[2px] border-[#0F172A] shadow-[2px_2px_0_0_#0F172A] flex items-center justify-center animate-pulse" style={{ background: C.skySoft }}>
              <Bell className="w-4 h-4" style={{ color: C.blue }} />
            </div>
            <p className="text-sm font-semibold text-slate-400">Loading…</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3 px-6 text-center">
            <div className="w-12 h-12 rounded-[16px] border-[2.5px] border-[#0F172A] shadow-[3px_3px_0_0_#0F172A] flex items-center justify-center" style={{ background: C.indigoSoft }}>
              <Sparkles className="w-6 h-6" style={{ color: C.indigo }} />
            </div>
            <p className="font-extrabold font-['Baloo_2'] text-base">All caught up!</p>
            <p className="text-sm font-semibold text-slate-400">No notifications yet.</p>
          </div>
        ) : (
          notifications.map((n) => (
            <NotificationItem key={n.id} notif={n} onMarkRead={markRead} onClose={() => setOpen(false)} />
          ))
        )}
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        ref={bellRef}
        aria-label="Notifications"
        onClick={() => open ? setOpen(false) : openPanel()}
        className="relative w-8 h-8 rounded-[10px] border-[2px] border-[#0F172A] shadow-[2px_2px_0_0_#0F172A] flex items-center justify-center transition-all hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_#0F172A] cursor-pointer shrink-0"
        style={{ background: open ? C.blue : C.skySoft }}
      >
        <Bell className="w-4 h-4" style={{ color: open ? "#fff" : C.blue }} />
        {unreadCount > 0 && (
          <span
            className="absolute -top-1.5 -right-1.5 inline-flex min-w-[1.1rem] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white leading-none py-0.5 border-[1.5px] border-white"
            style={{ background: C.pop }}
          >
            {Math.min(unreadCount, 99)}
          </span>
        )}
      </button>
      {createPortal(panel, document.body)}
    </>
  );
};
