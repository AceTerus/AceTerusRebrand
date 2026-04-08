import { useState } from "react";
import { createPortal } from "react-dom";
import { Bell, Heart, MessageCircle, UserPlus, X, BookOpen, Flame, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNotifications, Notification } from "@/context/NotificationsContext";
import { useFollow } from "@/hooks/useFollow";
import { formatDistanceToNow } from "date-fns";

const FollowNotifActions = ({ actorId }: { actorId: string }) => {
  const { isFollowing, isLoading, toggleFollow } = useFollow(actorId);
  return (
    <Button
      size="sm"
      variant={isFollowing ? "outline" : "default"}
      className="text-xs h-7 px-3 shrink-0"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleFollow();
      }}
      disabled={isLoading}
    >
      {isFollowing ? "Following" : "Follow Back"}
    </Button>
  );
};

const NotifIcon = ({ type }: { type: Notification["type"] }) => {
  if (type === "follow") return <UserPlus className="w-3.5 h-3.5 text-blue-500" />;
  if (type === "like") return <Heart className="w-3.5 h-3.5 text-rose-500" />;
  if (type === "material_like") return <Heart className="w-3.5 h-3.5 text-rose-500" />;
  if (type === "comment") return <MessageCircle className="w-3.5 h-3.5 text-emerald-500" />;
  if (type === "material_comment") return <MessageCircle className="w-3.5 h-3.5 text-emerald-500" />;
  if (type === "quiz_published") return <BookOpen className="w-3.5 h-3.5 text-violet-500" />;
  if (type === "streak_milestone") return <Flame className="w-3.5 h-3.5 text-orange-500" />;
  if (type === "streak_broken") return <AlertTriangle className="w-3.5 h-3.5 text-yellow-500" />;
  return <MessageCircle className="w-3.5 h-3.5 text-emerald-500" />;
};

const notifText = (notif: Notification): string => {
  switch (notif.type) {
    case "follow": return "started following you";
    case "like": return "liked your post";
    case "material_like": return "liked your material";
    case "comment": return "commented on your post";
    case "material_comment": return "commented on your material";
    case "quiz_published":
      return `New quiz category published: ${notif.metadata?.category_name ?? ""}`;
    case "streak_milestone":
      return `You reached a ${notif.metadata?.streak}-day streak! 🔥`;
    case "streak_broken":
      return `Your ${notif.metadata?.old_streak}-day streak was broken`;
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

/** Self-notifications (streak, quiz_published for recipient) have actor_id === user_id */
const isSelfNotif = (notif: Notification) =>
  notif.type === "streak_milestone" ||
  notif.type === "streak_broken" ||
  notif.type === "quiz_published";

interface NotificationItemProps {
  notif: Notification;
  onMarkRead: (id: string) => void;
}

const NotificationItem = ({ notif, onMarkRead }: NotificationItemProps) => {
  const actorName = notif.actor?.username ?? "Someone";
  const avatarUrl = notif.actor?.avatar_url ?? undefined;
  const timeAgo = formatDistanceToNow(new Date(notif.created_at), { addSuffix: true });
  const selfNotif = isSelfNotif(notif);

  const inner = (
    <div
      className={`flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer ${
        !notif.read ? "bg-blue-50/50 dark:bg-blue-950/20" : ""
      }`}
      onClick={() => !notif.read && onMarkRead(notif.id)}
    >
      <div className="relative shrink-0">
        {selfNotif ? (
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
            <NotifIcon type={notif.type} />
          </span>
        ) : (
          <>
            <Avatar className="h-9 w-9">
              <AvatarImage src={avatarUrl} />
              <AvatarFallback>{actorName[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
            <span className="absolute -bottom-0.5 -right-0.5 bg-background rounded-full p-0.5 border border-border">
              <NotifIcon type={notif.type} />
            </span>
          </>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm leading-snug">
          {!selfNotif && <span className="font-semibold">{actorName} </span>}
          <span className={selfNotif ? "font-medium" : "text-muted-foreground"}>
            {notifText(notif)}
          </span>
        </p>
        <p className="text-[11px] text-muted-foreground mt-0.5">{timeAgo}</p>
      </div>
      {notif.type === "follow" && (
        <FollowNotifActions actorId={notif.actor_id} />
      )}
      {!notif.read && (
        <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1.5" />
      )}
    </div>
  );

  return <Link to={notifLink(notif)}>{inner}</Link>;
};

interface NotificationsBellProps {
  /** compact: smaller icon for mobile or tight spaces */
  compact?: boolean;
}

export const NotificationsBell = ({ compact = false }: NotificationsBellProps) => {
  const { notifications, unreadCount, markAllRead, markRead, isLoading } =
    useNotifications();
  const [open, setOpen] = useState(false);

  const panel = (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-[59] bg-black/30"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Slide-in panel */}
      <div
        className={`
          fixed top-0 h-screen w-80 bg-background border-r border-border shadow-xl z-[60]
          flex flex-col
          transition-transform duration-300 ease-in-out
          left-0 lg:left-64
          ${open ? "translate-x-0 visible pointer-events-auto" : "-translate-x-full invisible pointer-events-none"}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <h3 className="font-semibold text-sm">Notifications</h3>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                className="text-xs text-primary hover:underline"
                onClick={markAllRead}
              >
                Mark all read
              </button>
            )}
            <button
              className="p-1 rounded hover:bg-muted/50 transition-colors"
              onClick={() => setOpen(false)}
              aria-label="Close notifications"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable list */}
        <div className="flex-1 overflow-y-auto divide-y divide-border">
          {isLoading ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              Loading…
            </div>
          ) : notifications.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              No notifications yet
            </div>
          ) : (
            notifications.map((n) => (
              <NotificationItem
                key={n.id}
                notif={n}
                onMarkRead={markRead}
              />
            ))
          )}
        </div>
      </div>
    </>
  );

  return (
    <>
      <Button
        variant="ghost"
        size={compact ? "sm" : "icon"}
        className="relative"
        aria-label="Notifications"
        onClick={() => setOpen((v) => !v)}
      >
        <Bell className={compact ? "w-4 h-4" : "w-5 h-5"} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 inline-flex min-w-[1.1rem] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground leading-none py-0.5">
            {Math.min(unreadCount, 99)}
          </span>
        )}
      </Button>
      {createPortal(panel, document.body)}
    </>
  );
};
