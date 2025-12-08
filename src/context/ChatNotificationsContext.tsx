import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type UnreadMap = Record<string, number>;

interface ChatNotificationsContextValue {
  unreadCounts: UnreadMap;
  clearUnread: (userId: string) => void;
  totalSenders: number;
}

const ChatNotificationsContext = createContext<ChatNotificationsContextValue | undefined>(undefined);

export const ChatNotificationsProvider = ({ children }: { children: ReactNode }) => {
  const [unreadCounts, setUnreadCounts] = useState<UnreadMap>({});
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
      setUnreadCounts({});
    });
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!userId) return;

    let isMounted = true;
    const loadUnread = async () => {
      const { data, error } = await supabase
        .from("chat_unread_counts")
        .select("sender_id, unread_count")
        .eq("user_id", userId);
      if (error || !isMounted) return;
      const next: UnreadMap = {};
      (data || []).forEach((row: any) => {
        if (row.unread_count > 0) {
          next[row.sender_id] = row.unread_count;
        }
      });
      setUnreadCounts(next);
    };
    loadUnread();
    return () => {
      isMounted = false;
    };
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`chat-unread-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_unread_counts",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newRow: any = payload.new;
          if (!newRow) return;
          setUnreadCounts((prev) => {
            if (newRow.unread_count <= 0) {
              if (!(newRow.sender_id in prev)) return prev;
              const { [newRow.sender_id]: _, ...rest } = prev;
              return rest;
            }
            return {
              ...prev,
              [newRow.sender_id]: newRow.unread_count,
            };
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const clearUnread = useCallback(
    async (senderId: string) => {
      if (!senderId) return;
      setUnreadCounts((prev) => {
        if (!(senderId in prev)) {
          return prev;
        }
        const { [senderId]: _, ...rest } = prev;
        return rest;
      });

      if (!userId) return;
      await supabase.rpc("reset_unread_count", {
        target_user: userId,
        target_sender: senderId,
      });
    },
    [userId]
  );

  const totalSenders = useMemo(() => Object.keys(unreadCounts).length, [unreadCounts]);

  return (
    <ChatNotificationsContext.Provider
      value={{ unreadCounts, clearUnread, totalSenders }}
    >
      {children}
    </ChatNotificationsContext.Provider>
  );
};

export const useChatNotifications = () => {
  const context = useContext(ChatNotificationsContext);
  if (!context) {
    throw new Error("useChatNotifications must be used within ChatNotificationsProvider");
  }
  return context;
};

