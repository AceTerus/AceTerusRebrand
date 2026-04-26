import { useEffect, useRef, useState } from 'react';
import { X, Send } from 'lucide-react';
import { useMascot } from '@/context/MascotContext';
import { supabase } from '@/integrations/supabase/client';
const mascotGif = '/mascot1.gif';

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

const MascotChat = () => {
  const { isChatOpen, closeChat, mood } = useMascot();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const initialized = useRef(false);

  // Send opening greeting once when chat opens
  useEffect(() => {
    if (!isChatOpen) {
      // Reset on close so next open starts fresh
      initialized.current = false;
      setMessages([]);
      return;
    }
    if (initialized.current) return;
    initialized.current = true;
    setMessages([{ role: 'model', text: "Hey! 👋 What are we studying today?" }]);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [isChatOpen]);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = { role: 'user', text };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput('');
    setIsLoading(true);

    try {
      // Pass history excluding the greeting and the new message
      const history = nextMessages
        .slice(1, -1) // skip opening greeting, skip just-added user msg
        .map((m) => ({ role: m.role, text: m.text }));

      const { data, error } = await supabase.functions.invoke('mascot-chat', {
        body: { message: text, history },
      });

      if (error || !data?.reply) throw new Error(error?.message ?? 'No reply');

      setMessages((prev) => [...prev, { role: 'model', text: data.reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'model', text: "Hmm, I couldn't connect right now. Try again in a moment! 😅" },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!isChatOpen) return null;

  const moodColor =
    mood === 'celebrating' ? 'bg-yellow-400' :
    mood === 'urgent'      ? 'bg-red-400'    :
                              'bg-blue-400';

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      onClick={closeChat}
    >
      <div
        className="relative flex w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        style={{ maxHeight: '80vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={closeChat}
          className="absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
          aria-label="Close chat"
        >
          <X size={14} />
        </button>

        {/* Header */}
        <div className={`h-1 w-full ${moodColor}`} />

        {/* Body: mascot left + chat right */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left: mascot */}
          <div className="flex w-36 shrink-0 flex-col items-center justify-center border-r border-gray-100 bg-gray-50 py-6">
            <img
              src={mascotGif}
              alt="Ace"
              className="w-28 h-auto mascot-float"
            />
            <span className="mt-2 text-xs font-bold text-gray-500 tracking-wide">ACE</span>
          </div>

          {/* Right: messages */}
          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-snug ${
                      msg.role === 'user'
                        ? 'bg-blue-500 text-white rounded-br-sm'
                        : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}

              {/* Typing indicator */}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-gray-100 px-4 py-3">
                    <span className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:0ms]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:150ms]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="flex items-end gap-2 border-t border-gray-100 px-3 py-3">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask Ace anything..."
                rows={1}
                className="flex-1 resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-400 focus:bg-white transition-colors"
                style={{ maxHeight: '80px' }}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || isLoading}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500 text-white shadow transition-colors hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Send"
              >
                <Send size={15} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MascotChat;
