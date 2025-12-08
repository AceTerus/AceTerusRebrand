import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Tables } from "@/integrations/supabase/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2, MessageSquare, Search, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { useChatNotifications } from "@/context/ChatNotificationsContext";

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

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const targetUserId = searchParams.get("userId");

  const fetchContacts = useCallback(async () => {
    if (!userId) return;

    setIsLoadingContacts(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, username, avatar_url")
        .neq("user_id", userId)
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
    <div className="h-screen w-full overflow-hidden bg-background px-4 py-6 lg:px-10">
      <div className="mx-auto flex h-full w-full max-w-[1600px] flex-col gap-6 overflow-hidden lg:flex-row lg:items-stretch lg:gap-8">
        <Card className="flex h-full flex-col self-stretch lg:w-96 lg:flex-shrink-0">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Messages</CardTitle>
            <p className="text-sm text-muted-foreground">
              Choose a study buddy to start chatting.
            </p>
          </CardHeader>
          <CardContent className="flex h-full flex-col space-y-4 overflow-hidden">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by username"
                className="pl-9"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>

            {isLoadingContacts ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : contacts.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                No other learners are available yet.
              </div>
            ) : filteredContacts.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                No matches for “{searchTerm}”.
              </div>
            ) : (
              <div className="flex-1 space-y-2 overflow-y-auto scrollbar-hide">
                {filteredContacts.map((contact) => {
                  const preview = conversationPreviews[contact.user_id];
                  const previewOwnerLabel = preview?.isUserSender ? "You" : getDisplayName(contact);
                  const unreadCount = unreadCounts[contact.user_id];

                  return (
                    <button
                      key={contact.user_id}
                      type="button"
                      onClick={() => handleSelectContact(contact)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl border border-transparent px-3 py-2 text-left transition hover:border-muted hover:bg-muted/60",
                        selectedContact?.user_id === contact.user_id && "border-primary/50 bg-muted"
                      )}
                    >
                      <div className="flex w-full items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={contact.avatar_url || undefined} />
                          <AvatarFallback>{getAvatarFallback(contact)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {getDisplayName(contact)}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {preview ? `${previewOwnerLabel}: ${preview.lastMessage}` : "Tap to open chat"}
                          </p>
                          {preview && (
                            <p className="text-[11px] text-muted-foreground/80">
                              {formatDistanceToNow(new Date(preview.lastTimestamp), { addSuffix: true })}
                            </p>
                          )}
                        </div>
                        {unreadCount && (
                          <span className="inline-flex min-w-[1.5rem] items-center justify-center rounded-full bg-primary px-2 text-xs font-semibold text-primary-foreground">
                            {unreadCount > 99 ? "99+" : unreadCount}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="flex h-full flex-1 flex-col overflow-hidden">
          {selectedContact ? (
            <>
              <CardHeader className="flex flex-row items-center justify-between gap-4 shrink-0">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={selectedContact.avatar_url || undefined} />
                    <AvatarFallback>{getAvatarFallback(selectedContact)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-xl">
                      {getDisplayName(selectedContact)}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">Direct messages</p>
                  </div>
                </div>
                <Badge variant="secondary" className="gap-1">
                  <MessageSquare className="h-4 w-4" />
                  Connected
                </Badge>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col overflow-hidden">
                <div className="flex flex-1 flex-col gap-4 overflow-hidden">
                  <div className="flex-1 space-y-4 overflow-y-auto scrollbar-hide rounded-2xl border border-border/60 bg-muted/20 p-4">
                    {isLoadingMessages ? (
                      <div className="flex h-full items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
                        <MessageSquare className="mb-3 h-10 w-10" />
                        <p className="text-sm">No messages yet. Say hello!</p>
                      </div>
                    ) : (
                      messages.map((message) => {
                        const isOwnMessage = message.sender_id === userId;
                        const profileForMessage = isOwnMessage ? currentProfile : selectedContact;

                        return (
                          <div
                            key={message.id}
                            className={cn(
                              "flex items-end gap-3",
                              isOwnMessage && "flex-row-reverse text-right"
                            )}
                          >
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={profileForMessage?.avatar_url || undefined} />
                              <AvatarFallback>{getAvatarFallback(profileForMessage)}</AvatarFallback>
                            </Avatar>
                            <div className="space-y-1">
                              <div
                                className={cn(
                                  "inline-flex max-w-[min(28rem,70vw)] rounded-2xl px-4 py-2 text-left text-sm shadow-sm break-words whitespace-pre-wrap",
                                  isOwnMessage
                                    ? "bg-gradient-primary text-primary-foreground shadow-glow"
                                    : "bg-background border"
                                )}
                              >
                                {message.content}
                              </div>
                              <span className="block text-xs text-muted-foreground">
                                {new Date(message.created_at).toLocaleString()}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  <div className="rounded-2xl border p-4 shadow-sm shrink-0">
                    <Textarea
                      placeholder={`Message ${getDisplayName(selectedContact)}`}
                      value={messageInput}
                      onChange={(event) => setMessageInput(event.target.value)}
                      onKeyDown={handleTextareaKeyDown}
                      rows={4}
                      className="resize-none"
                      disabled={isSending}
                    />
                    <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                      <span>Press Enter to send • Shift + Enter for a new line</span>
                      <Button
                        onClick={handleSendMessage}
                        disabled={!messageInput.trim() || isSending}
                        className="gap-2"
                      >
                        {isSending ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Sending
                          </>
                        ) : (
                          <>
                            <Send className="h-4 w-4" />
                            Send
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </>
          ) : (
            <CardContent className="flex min-h-[60vh] flex-col items-center justify-center text-center text-muted-foreground">
              <MessageSquare className="mb-4 h-10 w-10" />
              <p className="text-base font-medium">Start a new conversation</p>
              <p className="mt-1 text-sm">
                Use the list on the left to pick someone to message.
              </p>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Chat;


