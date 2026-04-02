import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Tables } from "@/integrations/supabase/types";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChevronLeft, Loader2, MessageSquare, Search, Send, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns";
import { useChatNotifications } from "@/context/ChatNotificationsContext";
import { fetchMutualFollowIds } from "@/hooks/useMutualFollow";
import { UserPlus } from "lucide-react";
import { Link } from "react-router-dom";

type ChatMessage = Tables<"chat_messages">;

type ProfileSummary = {
  user_id: string;
  username: string | null;
  avatar_url: string | null;
};

type ConversationPreview = Record<
  string,
  {
    lastMessage: string;
    lastTimestamp: string;
    isUserSender: boolean;
  }
>;

const getDisplayName = (profile?: ProfileSummary | null) =>
  profile?.username || "Community member";

const getAvatarFallback = (profile?: ProfileSummary | null) =>
  profile?.username?.[0]?.toUpperCase() ?? "A";

const getDateLabel = (dateStr: string) => {
  const date = new Date(dateStr);
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "MMMM d, yyyy");
};

export const Chat = () => {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const userId = user?.id;
  const { unreadCounts, clearUnread } = useChatNotifications();

  const [contacts, setContacts] = useState<ProfileSummary[]>([]);
  const [currentProfile, setCurrentProfile] = useState<ProfileSummary | null>(null);
  const [selectedContact, setSelectedContact] = useState<ProfileSummary | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationPreviews, setConversationPreviews] = useState<ConversationPreview>({});
  const [messageInput, setMessageInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoadingContacts, setIsLoadingContacts] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showContactsList, setShowContactsList] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const targetUserId = searchParams.get("userId");

  const fetchContacts = useCallback(async () => {
    if (!userId) return;

    setIsLoadingContacts(true);
    try {
      // Only show mutual follows as chat contacts
      const mutualIds = await fetchMutualFollowIds(userId);

      if (mutualIds.length === 0) {
        setContacts([]);
        setIsLoadingContacts(false);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, username, avatar_url")
        .in("user_id", mutualIds)
        .order("username", { ascending: true });

      if (error) throw error;
      setContacts(data || []);
    } catch (error) {
      console.error("Failed to load contacts", error);
      toast({
        title: "Unable to load contacts",
        description: "Please try refreshing the page.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingContacts(false);
    }
  }, [toast, userId]);

  const fetchCurrentProfile = useCallback(async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, username, avatar_url")
        .eq("user_id", userId)
        .single();

      if (error) throw error;
      setCurrentProfile(data);
    } catch (error) {
      console.error("Failed to load current profile", error);
    }
  }, [userId]);

  const fetchMessages = useCallback(
    async (contactId: string) => {
      if (!userId) return;
      setIsLoadingMessages(true);

      try {
        const { data, error } = await supabase
          .from("chat_messages")
          .select("*")
          .or(
            `and(sender_id.eq.${userId},receiver_id.eq.${contactId}),and(sender_id.eq.${contactId},receiver_id.eq.${userId})`
          )
          .order("created_at", { ascending: true })
          .limit(200);

        if (error) throw error;
        setMessages(data || []);
      } catch (error) {
        console.error("Failed to load conversation", error);
        toast({
          title: "Unable to load chat",
          description: "Please try selecting the chat again.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingMessages(false);
      }
    },
    [toast, userId]
  );

  const updateConversationPreview = useCallback(
    (message: ChatMessage) => {
      if (!userId) return;

      const otherUserId =
        message.sender_id === userId ? message.receiver_id : message.sender_id;

      setConversationPreviews((prev) => {
        const prevEntry = prev[otherUserId];
        if (prevEntry && new Date(prevEntry.lastTimestamp) > new Date(message.created_at)) {
          return prev;
        }

        return {
          ...prev,
          [otherUserId]: {
            lastMessage: message.content,
            lastTimestamp: message.created_at,
            isUserSender: message.sender_id === userId,
          },
        };
      });
    },
    [userId]
  );

  const fetchConversationPreviews = useCallback(async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) throw error;

      const previews: ConversationPreview = {};
      (data || []).forEach((message) => {
        const otherUserId =
          message.sender_id === userId ? message.receiver_id : message.sender_id;

        if (!previews[otherUserId]) {
          previews[otherUserId] = {
            lastMessage: message.content,
            lastTimestamp: message.created_at,
            isUserSender: message.sender_id === userId,
          };
        }
      });

      setConversationPreviews(previews);
    } catch (error) {
      console.error("Failed to load conversation previews", error);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    fetchContacts();
    fetchCurrentProfile();
    fetchConversationPreviews();
  }, [fetchContacts, fetchConversationPreviews, fetchCurrentProfile, userId]);

  useEffect(() => {
    if (selectedContact) {
      clearUnread(selectedContact.user_id);
    }
  }, [selectedContact, clearUnread]);

  useEffect(() => {
    if (!selectedContact || !userId) return;
    setMessages([]);
    fetchMessages(selectedContact.user_id);
  }, [fetchMessages, selectedContact, userId]);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`chat-realtime-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        (payload) => {
          const newMessage = payload.new as ChatMessage;

          const involvesUser =
            newMessage.sender_id === userId || newMessage.receiver_id === userId;

          if (!involvesUser) return;

          updateConversationPreview(newMessage);

          if (
            selectedContact &&
            (newMessage.sender_id === selectedContact.user_id ||
              newMessage.receiver_id === selectedContact.user_id)
          ) {
            if (newMessage.sender_id !== userId) {
              clearUnread(newMessage.sender_id);
            }
            setMessages((prev) => [...prev, newMessage]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clearUnread, selectedContact, updateConversationPreview, userId]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, selectedContact]);

  useEffect(() => {
    if (!contacts.length) return;

    if (targetUserId) {
      const match = contacts.find((contact) => contact.user_id === targetUserId);
      if (match && (!selectedContact || selectedContact.user_id !== match.user_id)) {
        setSelectedContact(match);
        return;
      }
    }

    if (!selectedContact) {
      setSelectedContact(contacts[0]);
    }
  }, [contacts, selectedContact, targetUserId]);

  const filteredContacts = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return contacts;
    return contacts.filter((contact) =>
      getDisplayName(contact).toLowerCase().includes(query)
    );
  }, [contacts, searchTerm]);

  // Sort: conversations with recent messages first, then alphabetical
  const sortedContacts = useMemo(() => {
    return [...filteredContacts].sort((a, b) => {
      const aPreview = conversationPreviews[a.user_id];
      const bPreview = conversationPreviews[b.user_id];
      if (aPreview && !bPreview) return -1;
      if (!aPreview && bPreview) return 1;
      if (aPreview && bPreview) {
        return (
          new Date(bPreview.lastTimestamp).getTime() -
          new Date(aPreview.lastTimestamp).getTime()
        );
      }
      return getDisplayName(a).localeCompare(getDisplayName(b));
    });
  }, [filteredContacts, conversationPreviews]);

  // Group messages by date
  const groupedMessages = useMemo(() => {
    const groups: { date: string; messages: ChatMessage[] }[] = [];
    messages.forEach((msg) => {
      const label = getDateLabel(msg.created_at);
      const last = groups[groups.length - 1];
      if (last && last.date === label) {
        last.messages.push(msg);
      } else {
        groups.push({ date: label, messages: [msg] });
      }
    });
    return groups;
  }, [messages]);

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedContact || !userId) return;

    setIsSending(true);
    const content = messageInput.trim();

    try {
      const { error, data } = await supabase
        .from("chat_messages")
        .insert({
          content,
          sender_id: userId,
          receiver_id: selectedContact.user_id,
        })
        .select()
        .single();

      if (error) throw error;
      setMessageInput("");
      if (data) {
        updateConversationPreview(data);
      }
    } catch (error) {
      console.error("Failed to send message", error);
      toast({
        title: "Message not sent",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleSelectContact = (contact: ProfileSummary) => {
    setSelectedContact(contact);
    setSearchParams(contact ? { userId: contact.user_id } : {});
    clearUnread(contact.user_id);
    setShowContactsList(false);
  };

  const handleTextareaKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] lg:h-screen w-full overflow-hidden bg-background">
      {/* ── Left panel: contacts ── */}
      <div className={`${showContactsList ? 'flex' : 'hidden'} lg:flex w-full lg:w-80 flex-shrink-0 flex-col border-r bg-muted/20`}>
        {/* Panel header */}
        <div className="border-b px-5 py-4">
          <h1 className="text-base font-semibold tracking-tight">Messages</h1>
          {!isLoadingContacts && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {contacts.length} {contacts.length === 1 ? "member" : "members"} available
            </p>
          )}
        </div>

        {/* Search */}
        <div className="px-4 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search members..."
              className="h-9 border-border/60 bg-background pl-9 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Contact list */}
        <div className="flex-1 overflow-y-auto px-2 pb-4 scrollbar-hide">
          {isLoadingContacts ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : contacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-center px-3">
              <div className="rounded-full bg-muted p-3">
                <UserPlus className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">No connections yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  You can only chat with people who follow you back.
                </p>
              </div>
              <Link
                to="/discover"
                className="mt-1 text-xs font-medium text-primary hover:underline"
              >
                Discover people to follow →
              </Link>
            </div>
          ) : sortedContacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
              <Users className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                No results for "{searchTerm}"
              </p>
            </div>
          ) : (
            sortedContacts.map((contact) => {
              const preview = conversationPreviews[contact.user_id];
              const unreadCount = unreadCounts[contact.user_id];
              const isSelected = selectedContact?.user_id === contact.user_id;

              return (
                <div
                  key={contact.user_id}
                  onClick={() => handleSelectContact(contact)}
                  className={cn(
                    "flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all duration-150",
                    isSelected
                      ? "bg-primary/10 ring-1 ring-primary/20"
                      : "hover:bg-muted/60"
                  )}
                >
                  {/* Avatar → navigates to profile */}
                  <Link
                    to={`/profile/${contact.user_id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="relative flex-shrink-0"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={contact.avatar_url || undefined} />
                      <AvatarFallback
                        className={cn(
                          "text-sm font-medium",
                          isSelected && "bg-primary/20 text-primary"
                        )}
                      >
                        {getAvatarFallback(contact)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-background bg-emerald-500" />
                  </Link>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      {/* Name → navigates to profile */}
                      <Link
                        to={`/profile/${contact.user_id}`}
                        onClick={(e) => e.stopPropagation()}
                        className={cn(
                          "truncate text-sm hover:underline",
                          unreadCount ? "font-semibold text-foreground" : "font-medium"
                        )}
                      >
                        {getDisplayName(contact)}
                      </Link>
                      {preview && (
                        <span className="flex-shrink-0 text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(preview.lastTimestamp), {
                            addSuffix: false,
                          })}
                        </span>
                      )}
                    </div>
                    <p
                      className={cn(
                        "truncate text-xs",
                        unreadCount
                          ? "font-medium text-foreground"
                          : "text-muted-foreground"
                      )}
                    >
                      {preview
                        ? `${preview.isUserSender ? "You: " : ""}${preview.lastMessage}`
                        : "Start a conversation"}
                    </p>
                  </div>

                  {unreadCount > 0 && (
                    <span className="ml-1 flex h-5 min-w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Right panel: conversation ── */}
      <div className={`${!showContactsList ? 'flex' : 'hidden'} lg:flex flex-1 flex-col overflow-hidden`}>
        {selectedContact ? (
          <>
            {/* Chat header */}
            <div className="flex items-center justify-between border-b bg-background px-4 lg:px-6 py-3.5">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowContactsList(true)}
                  className="lg:hidden flex items-center justify-center w-8 h-8 rounded-full hover:bg-muted transition-colors mr-1"
                  aria-label="Back to contacts"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <Link
                  to={`/profile/${selectedContact.user_id}`}
                  className="relative flex-shrink-0"
                >
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={selectedContact.avatar_url || undefined} />
                    <AvatarFallback>{getAvatarFallback(selectedContact)}</AvatarFallback>
                  </Avatar>
                  <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-background bg-emerald-500" />
                </Link>
                <div>
                  <Link
                    to={`/profile/${selectedContact.user_id}`}
                    className="text-sm font-semibold leading-tight hover:underline"
                  >
                    {getDisplayName(selectedContact)}
                  </Link>
                  <p className="text-xs font-medium text-emerald-600">Online</p>
                </div>
              </div>

              <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
                <MessageSquare className="h-3 w-3" />
                Direct message
              </span>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-5 scrollbar-hide">
              {isLoadingMessages ? (
                <div className="flex h-full items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                  <div className="rounded-full bg-muted p-4">
                    <MessageSquare className="h-7 w-7 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">No messages yet</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Send a message to start the conversation with{" "}
                      {getDisplayName(selectedContact)}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {groupedMessages.map(({ date, messages: dayMessages }) => (
                    <div key={date}>
                      {/* Date separator */}
                      <div className="relative mb-5 flex items-center">
                        <div className="flex-1 border-t border-border/50" />
                        <span className="mx-3 flex-shrink-0 rounded-full bg-muted px-3 py-1 text-[11px] font-medium text-muted-foreground">
                          {date}
                        </span>
                        <div className="flex-1 border-t border-border/50" />
                      </div>

                      {/* Messages for this day */}
                      <div className="space-y-2">
                        {dayMessages.map((message, index) => {
                          const isOwn = message.sender_id === userId;
                          const profileForMsg = isOwn ? currentProfile : selectedContact;
                          const isLastInRun =
                            index === dayMessages.length - 1 ||
                            dayMessages[index + 1]?.sender_id !== message.sender_id;

                          return (
                            <div
                              key={message.id}
                              className={cn(
                                "flex items-end gap-2",
                                isOwn && "flex-row-reverse"
                              )}
                            >
                              {/* Avatar — only shown on last message in a run */}
                              <div
                                className={cn(
                                  "w-7 flex-shrink-0",
                                  !isLastInRun && "invisible"
                                )}
                              >
                                <Link
                                  to={`/profile/${isOwn ? userId : selectedContact.user_id}`}
                                  className="block"
                                >
                                  <Avatar className="h-7 w-7">
                                    <AvatarImage
                                      src={profileForMsg?.avatar_url || undefined}
                                    />
                                    <AvatarFallback className="text-[10px]">
                                      {getAvatarFallback(profileForMsg)}
                                    </AvatarFallback>
                                  </Avatar>
                                </Link>
                              </div>

                              <div
                                className={cn(
                                  "group flex flex-col gap-1",
                                  isOwn ? "items-end" : "items-start"
                                )}
                              >
                                <div
                                  className={cn(
                                    "max-w-[min(26rem,65vw)] break-words whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm",
                                    isOwn
                                      ? "bg-gradient-primary text-primary-foreground rounded-br-sm"
                                      : "bg-muted text-foreground rounded-bl-sm"
                                  )}
                                >
                                  {message.content}
                                </div>
                                {/* Timestamp — visible on hover */}
                                <span className="px-1 text-[10px] text-muted-foreground opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                                  {format(new Date(message.created_at), "h:mm a")}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Input bar */}
            <div className="border-t bg-background px-6 py-4">
              <div className="flex items-end gap-3 rounded-2xl border border-border/70 bg-muted/30 px-4 py-3 focus-within:border-primary/40 focus-within:ring-1 focus-within:ring-primary/20 transition-all">
                <Avatar className="mb-0.5 h-7 w-7 flex-shrink-0 self-end">
                  <AvatarImage src={currentProfile?.avatar_url || undefined} />
                  <AvatarFallback className="text-xs">
                    {getAvatarFallback(currentProfile)}
                  </AvatarFallback>
                </Avatar>
                <Textarea
                  placeholder={`Message ${getDisplayName(selectedContact)}...`}
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={handleTextareaKeyDown}
                  rows={1}
                  className="min-h-0 flex-1 resize-none border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/60"
                  disabled={isSending}
                />
                <Button
                  size="sm"
                  onClick={handleSendMessage}
                  disabled={!messageInput.trim() || isSending}
                  className="h-8 w-8 flex-shrink-0 rounded-full p-0"
                >
                  {isSending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
              <p className="mt-2 text-center text-[10px] text-muted-foreground">
                Press Enter to send · Shift+Enter for new line
              </p>
            </div>
          </>
        ) : (
          /* Empty state when no contact is selected */
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
            <div className="rounded-full bg-muted p-5">
              <MessageSquare className="h-9 w-9 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-semibold">Select a conversation</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Choose a member from the list to start messaging
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;
