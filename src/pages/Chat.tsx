import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Tables } from "@/integrations/supabase/types";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChevronLeft, Loader2, MessageSquare, Search, Send, Users, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns";
import { useChatNotifications } from "@/context/ChatNotificationsContext";
import { fetchMutualFollowIds } from "@/hooks/useMutualFollow";
import { Link } from "react-router-dom";

/* ── brand ── */
const C = {
  cyan: '#3BD6F5', blue: '#2F7CFF', indigo: '#2E2BE5',
  ink: '#0F172A', skySoft: '#DDF3FF', indigoSoft: '#D6D4FF',
};
const DISPLAY = "font-['Baloo_2'] tracking-tight";

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
  useEffect(() => {
    document.title = "Messages – AceTerus";
    return () => { document.title = "AceTerus – AI Tutor & Quiz Platform for Malaysian Students"; };
  }, []);
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
      const mutualIds = await fetchMutualFollowIds(userId);
      if (mutualIds.length === 0) { setContacts([]); setIsLoadingContacts(false); return; }
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, username, avatar_url")
        .in("user_id", mutualIds)
        .order("username", { ascending: true });
      if (error) throw error;
      setContacts(data || []);
    } catch (error) {
      console.error("Failed to load contacts", error);
      toast({ title: "Unable to load contacts", description: "Please try refreshing the page.", variant: "destructive" });
    } finally {
      setIsLoadingContacts(false);
    }
  }, [toast, userId]);

  const fetchCurrentProfile = useCallback(async () => {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from("profiles").select("user_id, username, avatar_url").eq("user_id", userId).single();
      if (error) throw error;
      setCurrentProfile(data);
    } catch (error) {
      console.error("Failed to load current profile", error);
    }
  }, [userId]);

  const fetchMessages = useCallback(async (contactId: string) => {
    if (!userId) return;
    setIsLoadingMessages(true);
    try {
      const { data, error } = await supabase
        .from("chat_messages").select("*")
        .or(`and(sender_id.eq.${userId},receiver_id.eq.${contactId}),and(sender_id.eq.${contactId},receiver_id.eq.${userId})`)
        .order("created_at", { ascending: true }).limit(200);
      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error("Failed to load conversation", error);
      toast({ title: "Unable to load chat", description: "Please try selecting the chat again.", variant: "destructive" });
    } finally {
      setIsLoadingMessages(false);
    }
  }, [toast, userId]);

  const updateConversationPreview = useCallback((message: ChatMessage) => {
    if (!userId) return;
    const otherUserId = message.sender_id === userId ? message.receiver_id : message.sender_id;
    setConversationPreviews((prev) => {
      const prevEntry = prev[otherUserId];
      if (prevEntry && new Date(prevEntry.lastTimestamp) > new Date(message.created_at)) return prev;
      return { ...prev, [otherUserId]: { lastMessage: message.content, lastTimestamp: message.created_at, isUserSender: message.sender_id === userId } };
    });
  }, [userId]);

  const fetchConversationPreviews = useCallback(async () => {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from("chat_messages").select("*")
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      const previews: ConversationPreview = {};
      (data || []).forEach((message) => {
        const otherUserId = message.sender_id === userId ? message.receiver_id : message.sender_id;
        if (!previews[otherUserId]) {
          previews[otherUserId] = { lastMessage: message.content, lastTimestamp: message.created_at, isUserSender: message.sender_id === userId };
        }
      });
      setConversationPreviews(previews);
    } catch (error) {
      console.error("Failed to load conversation previews", error);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    fetchContacts(); fetchCurrentProfile(); fetchConversationPreviews();
  }, [fetchContacts, fetchConversationPreviews, fetchCurrentProfile, userId]);

  useEffect(() => {
    if (selectedContact) clearUnread(selectedContact.user_id);
  }, [selectedContact, clearUnread]);

  useEffect(() => {
    if (!selectedContact || !userId) return;
    setMessages([]);
    fetchMessages(selectedContact.user_id);
  }, [fetchMessages, selectedContact, userId]);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase.channel(`chat-realtime-${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, (payload) => {
        const newMessage = payload.new as ChatMessage;
        const involvesUser = newMessage.sender_id === userId || newMessage.receiver_id === userId;
        if (!involvesUser) return;
        updateConversationPreview(newMessage);
        if (selectedContact && (newMessage.sender_id === selectedContact.user_id || newMessage.receiver_id === selectedContact.user_id)) {
          if (newMessage.sender_id !== userId) clearUnread(newMessage.sender_id);
          setMessages((prev) => [...prev, newMessage]);
        }
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [clearUnread, selectedContact, updateConversationPreview, userId]);

  useEffect(() => {
    if (messagesEndRef.current) messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
  }, [messages, selectedContact]);

  useEffect(() => {
    if (!contacts.length) return;
    if (targetUserId) {
      const match = contacts.find((c) => c.user_id === targetUserId);
      if (match && (!selectedContact || selectedContact.user_id !== match.user_id)) { setSelectedContact(match); return; }
    }
    if (!selectedContact) setSelectedContact(contacts[0]);
  }, [contacts, selectedContact, targetUserId]);

  const filteredContacts = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return contacts;
    return contacts.filter((c) => getDisplayName(c).toLowerCase().includes(query));
  }, [contacts, searchTerm]);

  const sortedContacts = useMemo(() => {
    return [...filteredContacts].sort((a, b) => {
      const aP = conversationPreviews[a.user_id];
      const bP = conversationPreviews[b.user_id];
      if (aP && !bP) return -1;
      if (!aP && bP) return 1;
      if (aP && bP) return new Date(bP.lastTimestamp).getTime() - new Date(aP.lastTimestamp).getTime();
      return getDisplayName(a).localeCompare(getDisplayName(b));
    });
  }, [filteredContacts, conversationPreviews]);

  const groupedMessages = useMemo(() => {
    const groups: { date: string; messages: ChatMessage[] }[] = [];
    messages.forEach((msg) => {
      const label = getDateLabel(msg.created_at);
      const last = groups[groups.length - 1];
      if (last && last.date === label) { last.messages.push(msg); }
      else { groups.push({ date: label, messages: [msg] }); }
    });
    return groups;
  }, [messages]);

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedContact || !userId) return;
    setIsSending(true);
    const content = messageInput.trim();
    try {
      const { error, data } = await supabase.from("chat_messages")
        .insert({ content, sender_id: userId, receiver_id: selectedContact.user_id })
        .select().single();
      if (error) throw error;
      setMessageInput("");
      if (data) updateConversationPreview(data);
    } catch (error) {
      console.error("Failed to send message", error);
      toast({ title: "Message not sent", description: "Please try again.", variant: "destructive" });
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
    if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); handleSendMessage(); }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: C.indigo }} />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  return (
    <div className="flex h-[calc(100vh-4rem)] lg:h-screen w-full overflow-hidden bg-transparent">

      {/* ── Left panel: contacts ── */}
      <div className={`${showContactsList ? 'flex' : 'hidden'} lg:flex w-full lg:w-80 flex-shrink-0 flex-col bg-white border-r-[2.5px] border-[#0F172A]`}>

        {/* Panel header */}
        <div className="border-b-[2.5px] border-[#0F172A] px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-[10px] border-[2px] border-[#0F172A] shadow-[2px_2px_0_0_#0F172A] flex items-center justify-center shrink-0"
              style={{ background: C.indigo }}
            >
              <MessageSquare className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className={`${DISPLAY} font-extrabold text-lg leading-tight`}>Messages</h1>
              {!isLoadingContacts && (
                <p className="text-[11px] font-semibold text-slate-400">
                  {contacts.length} {contacts.length === 1 ? "connection" : "connections"}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b-[2px] border-[#0F172A]/10">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: C.indigo }} />
            <input
              placeholder="Search contacts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm font-semibold border-[2px] border-[#0F172A] rounded-full shadow-[1px_1px_0_0_#0F172A] bg-white outline-none focus:shadow-[2px_2px_0_0_#0F172A] transition-shadow placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Contact list */}
        <div className="flex-1 overflow-y-auto px-2 py-2 scrollbar-hide">
          {isLoadingContacts ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin" style={{ color: C.indigo }} />
            </div>
          ) : contacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-center px-3">
              <div
                className="w-12 h-12 rounded-[14px] border-[2.5px] border-[#0F172A] shadow-[2px_2px_0_0_#0F172A] flex items-center justify-center"
                style={{ background: C.skySoft }}
              >
                <UserPlus className="h-5 w-5" style={{ color: C.indigo }} />
              </div>
              <div>
                <p className={`${DISPLAY} font-extrabold text-sm`}>No connections yet</p>
                <p className="text-xs font-semibold text-slate-400 mt-1">
                  You can only chat with people who follow you back.
                </p>
              </div>
              <Link
                to="/discover"
                className="mt-1 text-xs font-bold hover:underline"
                style={{ color: C.indigo }}
              >
                Discover people →
              </Link>
            </div>
          ) : sortedContacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
              <Users className="h-7 w-7 text-slate-300" />
              <p className="text-sm font-semibold text-slate-400">
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
                    "flex w-full cursor-pointer items-center gap-3 rounded-[14px] px-3 py-2.5 transition-all duration-150 border-[2px]",
                    isSelected
                      ? "border-[#0F172A] shadow-[2px_2px_0_0_#0F172A]"
                      : "border-transparent hover:border-[#0F172A]/20 hover:bg-slate-50"
                  )}
                  style={isSelected ? { background: C.indigoSoft } : {}}
                >
                  <Link
                    to={`/profile/${contact.user_id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="relative flex-shrink-0"
                  >
                    <Avatar className="h-10 w-10 border-[2px] border-[#0F172A] shadow-[1px_1px_0_0_#0F172A]">
                      <AvatarImage src={contact.avatar_url || undefined} className="object-cover" />
                      <AvatarFallback
                        className={`${DISPLAY} font-extrabold text-sm`}
                        style={{ background: C.cyan, color: C.ink }}
                      >
                        {getAvatarFallback(contact)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" />
                  </Link>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <Link
                        to={`/profile/${contact.user_id}`}
                        onClick={(e) => e.stopPropagation()}
                        className={cn(
                          `${DISPLAY} truncate text-sm hover:underline`,
                          unreadCount ? "font-extrabold text-[#0F172A]" : "font-bold text-[#0F172A]"
                        )}
                      >
                        {getDisplayName(contact)}
                      </Link>
                      {preview && (
                        <span className="flex-shrink-0 text-[10px] font-semibold text-slate-400">
                          {formatDistanceToNow(new Date(preview.lastTimestamp), { addSuffix: false })}
                        </span>
                      )}
                    </div>
                    <p className={cn(
                      "truncate text-xs font-semibold",
                      unreadCount ? "text-[#0F172A]" : "text-slate-400"
                    )}>
                      {preview
                        ? `${preview.isUserSender ? "You: " : ""}${preview.lastMessage}`
                        : "Start a conversation"}
                    </p>
                  </div>

                  {unreadCount > 0 && (
                    <span
                      className="ml-1 flex h-5 min-w-5 flex-shrink-0 items-center justify-center rounded-full px-1.5 text-[10px] font-bold text-white border-[1.5px] border-[#0F172A]"
                      style={{ background: C.indigo }}
                    >
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
      <div className={`${!showContactsList ? 'flex' : 'hidden'} lg:flex flex-1 flex-col overflow-hidden bg-white`}>
        {selectedContact ? (
          <>
            {/* Chat header */}
            <div className="flex items-center justify-between border-b-[2.5px] border-[#0F172A] bg-white px-4 lg:px-6 py-3.5">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowContactsList(true)}
                  className="lg:hidden flex items-center justify-center w-8 h-8 rounded-full border-[2px] border-[#0F172A] shadow-[1px_1px_0_0_#0F172A] bg-white hover:shadow-[2px_2px_0_0_#0F172A] transition-shadow mr-1"
                  aria-label="Back to contacts"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <Link to={`/profile/${selectedContact.user_id}`} className="relative flex-shrink-0">
                  <Avatar className="h-9 w-9 border-[2px] border-[#0F172A] shadow-[1px_1px_0_0_#0F172A]">
                    <AvatarImage src={selectedContact.avatar_url || undefined} className="object-cover" />
                    <AvatarFallback
                      className={`${DISPLAY} font-extrabold text-sm`}
                      style={{ background: C.cyan, color: C.ink }}
                    >
                      {getAvatarFallback(selectedContact)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" />
                </Link>
                <div>
                  <Link
                    to={`/profile/${selectedContact.user_id}`}
                    className={`${DISPLAY} font-extrabold text-sm leading-tight hover:underline`}
                  >
                    {getDisplayName(selectedContact)}
                  </Link>
                  <p className="text-xs font-semibold text-emerald-500">Online</p>
                </div>
              </div>

              <span
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold border-[2px] border-[#0F172A] shadow-[1px_1px_0_0_#0F172A]"
                style={{ background: C.indigoSoft, color: C.indigo }}
              >
                <MessageSquare className="h-3 w-3" />
                Direct message
              </span>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-5 scrollbar-hide" style={{ background: '#F8FAFF' }}>
              {isLoadingMessages ? (
                <div className="flex h-full items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin" style={{ color: C.indigo }} />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                  <div
                    className="w-16 h-16 rounded-[18px] border-[2.5px] border-[#0F172A] shadow-[3px_3px_0_0_#0F172A] flex items-center justify-center"
                    style={{ background: C.skySoft }}
                  >
                    <MessageSquare className="h-7 w-7" style={{ color: C.indigo }} />
                  </div>
                  <div>
                    <p className={`${DISPLAY} font-extrabold text-base`}>No messages yet</p>
                    <p className="mt-1 text-sm font-semibold text-slate-400">
                      Say hello to {getDisplayName(selectedContact)}!
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {groupedMessages.map(({ date, messages: dayMessages }) => (
                    <div key={date}>
                      {/* Date separator */}
                      <div className="relative mb-5 flex items-center">
                        <div className="flex-1 border-t-[2px] border-[#0F172A]/10" />
                        <span
                          className="mx-3 flex-shrink-0 rounded-full px-3 py-1 text-[11px] font-bold border-[2px] border-[#0F172A]/20"
                          style={{ background: C.skySoft, color: C.indigo }}
                        >
                          {date}
                        </span>
                        <div className="flex-1 border-t-[2px] border-[#0F172A]/10" />
                      </div>

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
                              className={cn("flex items-end gap-2", isOwn && "flex-row-reverse")}
                            >
                              <div className={cn("w-7 flex-shrink-0", !isLastInRun && "invisible")}>
                                <Link to={`/profile/${isOwn ? userId : selectedContact.user_id}`} className="block">
                                  <Avatar className="h-7 w-7 border-[1.5px] border-[#0F172A]">
                                    <AvatarImage src={profileForMsg?.avatar_url || undefined} className="object-cover" />
                                    <AvatarFallback
                                      className="text-[10px] font-bold"
                                      style={{ background: C.cyan, color: C.ink }}
                                    >
                                      {getAvatarFallback(profileForMsg)}
                                    </AvatarFallback>
                                  </Avatar>
                                </Link>
                              </div>

                              <div className={cn("group flex flex-col gap-1", isOwn ? "items-end" : "items-start")}>
                                <div
                                  className={cn(
                                    "max-w-[min(26rem,65vw)] break-words whitespace-pre-wrap px-4 py-2.5 text-sm leading-relaxed font-medium border-[2px] border-[#0F172A] shadow-[2px_2px_0_0_#0F172A]",
                                    isOwn
                                      ? "text-white rounded-2xl rounded-br-sm"
                                      : "bg-white text-[#0F172A] rounded-2xl rounded-bl-sm"
                                  )}
                                  style={isOwn ? { background: `linear-gradient(135deg, ${C.indigo}, ${C.blue})` } : {}}
                                >
                                  {message.content}
                                </div>
                                <span className="px-1 text-[10px] font-semibold text-slate-400 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
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
            <div className="border-t-[2.5px] border-[#0F172A] bg-white px-6 py-4">
              <div className="flex items-end gap-3 rounded-2xl border-[2.5px] border-[#0F172A] shadow-[2px_2px_0_0_#0F172A] bg-white px-4 py-3 focus-within:shadow-[3px_3px_0_0_#0F172A] transition-shadow">
                <Avatar className="mb-0.5 h-7 w-7 flex-shrink-0 self-end border-[1.5px] border-[#0F172A]">
                  <AvatarImage src={currentProfile?.avatar_url || undefined} className="object-cover" />
                  <AvatarFallback
                    className="text-xs font-bold"
                    style={{ background: C.cyan, color: C.ink }}
                  >
                    {getAvatarFallback(currentProfile)}
                  </AvatarFallback>
                </Avatar>
                <Textarea
                  placeholder={`Message ${getDisplayName(selectedContact)}...`}
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={handleTextareaKeyDown}
                  rows={1}
                  className="min-h-0 flex-1 resize-none border-0 bg-transparent p-0 text-sm font-semibold shadow-none focus-visible:ring-0 placeholder:text-slate-400"
                  disabled={isSending}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!messageInput.trim() || isSending}
                  className="h-8 w-8 flex-shrink-0 rounded-full flex items-center justify-center border-[2px] border-[#0F172A] shadow-[2px_2px_0_0_#0F172A] text-white disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-[3px_3px_0_0_#0F172A] transition-shadow"
                  style={{ background: C.indigo }}
                >
                  {isSending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
              <p className="mt-2 text-center text-[10px] font-semibold text-slate-400">
                Enter to send · Shift+Enter for new line
              </p>
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
            <div
              className="w-20 h-20 rounded-[22px] border-[2.5px] border-[#0F172A] shadow-[4px_4px_0_0_#0F172A] flex items-center justify-center"
              style={{ background: C.skySoft }}
            >
              <MessageSquare className="h-9 w-9" style={{ color: C.indigo }} />
            </div>
            <div>
              <p className={`${DISPLAY} font-extrabold text-xl`}>Select a conversation</p>
              <p className="mt-1 text-sm font-semibold text-slate-400">
                Choose a contact from the list to start messaging
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;
