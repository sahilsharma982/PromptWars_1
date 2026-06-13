"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, Bot, Calendar as CalendarIcon, Loader2,
  CheckCircle, BarChart2, Zap, Link2, PanelLeft,
  Sparkles, Check, MessageSquare,
} from 'lucide-react';
import {
  loadLocalMessages,
  saveLocalMessages,
  upsertLocalConversation,
  type StoredMessage,
} from '@/lib/chatStorage';
import { useCompanion } from '@/app/companion/layout';

interface AgentInfo {
  key: string;
  name: string;
  emoji: string;
  summary: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  type?: 'text' | 'quiz' | 'calendar_event' | 'insight';
  metadata?: Record<string, unknown> | null;
  agents?: AgentInfo[];
  created_at?: string;
}

const GREETING: Message = {
  id: 'greeting',
  role: 'assistant',
  content: "Hello! I'm MindSpace — powered by a committee of specialist agents. I can quiz you, schedule sessions, check your mood trends, and more. What do you need?",
  type: 'text',
  agents: [{ key: 'academic', name: 'Academic Agent', emoji: '📚', summary: 'Initial greeting' }],
};

const SUGGESTED_PROMPTS = [
  { label: 'Quick quiz', text: 'Give me a quick quiz on Thermodynamics' },
  { label: 'Schedule study', text: 'Add 2hr Physics revision tomorrow at 10am' },
  { label: 'Weekly check-in', text: 'How am I doing this week?' },
  { label: 'Burnout help', text: "I'm feeling burnt out, help me" },
];

function toMessage(m: StoredMessage): Message {
  return {
    id: m.id,
    role: m.role,
    content: m.content,
    type: m.type,
    metadata: m.metadata,
    agents: m.agents,
    created_at: m.created_at,
  };
}

function formatMessageTime(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function QuizCard({ metadata }: { metadata: Record<string, unknown> }) {
  const [selected, setSelected] = useState<number | null>(null);
  const options = (metadata.options as string[]) || [];
  const correct = metadata.correct as string | undefined;
  const correctIndex = options.findIndex((o) => correct && o.startsWith(correct));

  return (
    <div className="mt-3 w-full max-w-md bg-white border border-[#E4E4E7] rounded-2xl p-5 text-left shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Zap className="w-4 h-4 text-[#D97757]" />
        <span className="text-xs font-semibold uppercase tracking-wider text-[#D97757]">
          Quiz · {String(metadata.topic)}
        </span>
      </div>
      <p className="text-[#27272A] font-medium mb-4 text-[15px] leading-snug">{String(metadata.question)}</p>
      <div className="space-y-2">
        {options.map((opt, i) => {
          const isSelected = selected === i;
          const isCorrect = i === correctIndex;
          let style = 'border-[#E4E4E7] text-[#3F3F46] hover:border-[#D97757] hover:bg-[#FFFBF7]';
          if (selected !== null) {
            if (isSelected && isCorrect) style = 'border-green-400 bg-green-50 text-green-800';
            else if (isSelected && !isCorrect) style = 'border-red-300 bg-red-50 text-red-700';
            else if (!isSelected && isCorrect) style = 'border-green-200 bg-green-50 text-green-700';
            else style = 'border-[#E4E4E7] text-[#A1A1AA]';
          }
          return (
            <button
              key={i}
              disabled={selected !== null}
              onClick={() => setSelected(i)}
              className={`w-full text-left px-4 py-2.5 rounded-xl border text-[13px] transition-colors disabled:cursor-default ${style}`}
            >
              {opt}
            </button>
          );
        })}
      </div>
      {selected !== null && (
        <p className={`mt-3 text-xs font-medium ${selected === correctIndex ? 'text-green-600' : 'text-red-500'}`}>
          {selected === correctIndex ? '✓ Correct!' : `✗ Correct answer: ${options[correctIndex]}`}
        </p>
      )}
    </div>
  );
}

function AgentBadges({ agents }: { agents: AgentInfo[] }) {
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {agents.map((a) => (
        <span
          key={a.key}
          title={a.summary}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white border border-[#E4E4E7] text-[11px] text-[#71717A]"
        >
          <span>{a.emoji}</span>
          <span>{a.name}</span>
        </span>
      ))}
    </div>
  );
}

function UserAvatar() {
  return (
    <div className="w-8 h-8 shrink-0 rounded-full bg-[#D97757] flex items-center justify-center mt-0.5 text-white text-xs font-serif font-semibold">
      S
    </div>
  );
}

function WelcomeScreen({ onPrompt }: { onPrompt: (text: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] px-4 text-center">
      <div className="w-14 h-14 rounded-2xl bg-[#27272A] flex items-center justify-center mb-5 shadow-lg shadow-black/10">
        <Bot className="w-7 h-7 text-white" strokeWidth={1.5} />
      </div>
      <h2 className="font-serif text-2xl text-[#27272A] mb-2">How can I help today?</h2>
      <p className="text-sm text-[#71717A] max-w-sm mb-8 leading-relaxed">
        Ask anything — quizzes, scheduling, mood check-ins, or study planning. Five specialist agents are ready.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
        {SUGGESTED_PROMPTS.map((p) => (
          <button
            key={p.text}
            onClick={() => onPrompt(p.text)}
            className="text-left px-4 py-3 rounded-xl border border-[#E4E4E7] bg-[#FAFAF9] hover:border-[#D97757] hover:bg-[#FFFBF7] transition-all group"
          >
            <p className="text-xs font-semibold text-[#D97757] mb-0.5">{p.label}</p>
            <p className="text-[13px] text-[#52525B] group-hover:text-[#27272A] leading-snug">{p.text}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

async function persistMessage(
  conversationId: string,
  msg: Message,
  title?: string,
): Promise<void> {
  const stored: StoredMessage = {
    id: msg.id,
    role: msg.role,
    content: msg.content,
    type: msg.type,
    metadata: msg.metadata,
    agents: msg.agents,
    created_at: msg.created_at || new Date().toISOString(),
  };

  const local = loadLocalMessages(conversationId);
  saveLocalMessages(conversationId, [...local.filter(m => m.id !== msg.id), stored]);

  const now = new Date().toISOString();
  upsertLocalConversation({
    id: conversationId,
    title: title || 'New conversation',
    created_at: now,
    updated_at: now,
  });

  try {
    await fetch(`/api/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messageId: msg.id,
        role: msg.role,
        content: msg.content,
        type: msg.type || 'text',
        metadata: msg.metadata,
        agents: msg.agents,
        title,
      }),
    });
  } catch (err) {
    console.error('[Companion] Failed to persist message:', err);
  }
}

interface CompanionChatProps {
  conversationId?: string;
}

export default function CompanionChat({ conversationId }: CompanionChatProps) {
  const router = useRouter();
  const { conversations, activeId, setSidebarOpen } = useCompanion();
  const [activeConvId, setActiveConvId] = useState<string | undefined>(conversationId);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(!!conversationId);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingAgents, setTypingAgents] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const activeConversation = conversations.find(c => c.id === (activeConvId || activeId));
  const conversationTitle = activeConversation?.title
    || (activeConvId ? 'Conversation' : 'New chat');

  useEffect(() => {
    setActiveConvId(conversationId);
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      setLoadingHistory(false);
      return;
    }

    const convId = conversationId;
    let cancelled = false;

    async function loadHistory() {
      setLoadingHistory(true);
      const local = loadLocalMessages(convId);
      try {
        const res = await fetch(`/api/conversations/${convId}`);
        if (res.ok) {
          const data = await res.json();
          const dbMsgs = (data.messages || []).map((m: StoredMessage) => toMessage(m));
          const merged = dbMsgs.length > 0 ? dbMsgs : local.map(toMessage);
          if (!cancelled) {
            setMessages(merged);
            if (merged.length > 0) {
              saveLocalMessages(convId, merged.map((m: Message) => ({
                ...m,
                created_at: m.created_at || new Date().toISOString(),
              })));
            }
          }
        } else if (!cancelled) {
          setMessages(local.map(toMessage));
        }
      } catch {
        if (!cancelled) setMessages(local.map(toMessage));
      } finally {
        if (!cancelled) setLoadingHistory(false);
      }
    }
    loadHistory();
    return () => { cancelled = true; };
  }, [conversationId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    textareaRef.current?.focus();
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        textareaRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [conversationId]);

  const adjustTextareaHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, []);

  useEffect(() => {
    adjustTextareaHeight();
  }, [input, adjustTextareaHeight]);

  const copyLink = async () => {
    if (!activeConvId) return;
    const url = `${window.location.origin}/companion/${activeConvId}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const ensureConversation = useCallback(async (firstMessage: string): Promise<string> => {
    if (activeConvId) return activeConvId;

    const id = crypto.randomUUID();
    const title = firstMessage.trim().slice(0, 80);

    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, title }),
      });
      if (res.ok) {
        const data = await res.json();
        const convId = data.conversation?.id || id;
        const now = new Date().toISOString();
        upsertLocalConversation({
          id: convId,
          title: data.conversation?.title || title,
          created_at: data.conversation?.created_at || now,
          updated_at: data.conversation?.updated_at || now,
        });
        setActiveConvId(convId);
        router.replace(`/companion/${convId}`);
        window.dispatchEvent(new CustomEvent('companion:conversation-created'));
        return convId;
      }
    } catch (err) {
      console.error('[Companion] Failed to create conversation:', err);
    }

    const now = new Date().toISOString();
    upsertLocalConversation({ id, title, created_at: now, updated_at: now });
    setActiveConvId(id);
    router.replace(`/companion/${id}`);
    window.dispatchEvent(new CustomEvent('companion:conversation-created'));
    return id;
  }, [activeConvId, router]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isTyping) return;

    const convId = await ensureConversation(text);
    const now = new Date().toISOString();
    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      type: 'text',
      created_at: now,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setIsTyping(true);
    setTypingAgents(['Routing...']);

    await persistMessage(convId, userMsg, text.trim().slice(0, 80));

    try {
      await new Promise(r => setTimeout(r, 400));
      setTypingAgents(['Academic Agent', 'Wellness Agent']);

      const res = await fetch('/api/hive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, conversationId: convId }),
      });

      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();

      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.reply || 'Something went wrong.',
        type: data.type || 'text',
        metadata: data.metadata,
        agents: data.agents_invoked,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
      await persistMessage(convId, assistantMsg);

      const ts = new Date().toISOString();
      upsertLocalConversation({
        id: convId,
        title: text.trim().slice(0, 80),
        created_at: ts,
        updated_at: ts,
      });
      window.dispatchEvent(new CustomEvent('companion:conversation-updated'));
    } catch (err) {
      console.error('[Companion]', err);
      const errMsg: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: "I'm having trouble connecting right now. Please check your API key and try again.",
        type: 'text',
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errMsg]);
      await persistMessage(convId, errMsg);
    } finally {
      setIsTyping(false);
      setTypingAgents([]);
    }
  }, [isTyping, ensureConversation]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const displayMessages = messages.length === 0 && !conversationId ? [] : messages;
  const showWelcome = !loadingHistory && displayMessages.length === 0 && !conversationId;
  const showEmptyThread = !loadingHistory && displayMessages.length === 0 && !!conversationId;

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <header className="shrink-0 border-b border-[#F4F4F5] px-4 sm:px-5 py-3.5 flex items-center gap-3">
        <button
          onClick={() => setSidebarOpen(true)}
          className="md:hidden w-9 h-9 flex items-center justify-center rounded-xl text-[#71717A] hover:bg-[#F4F4F5] transition-colors shrink-0"
          aria-label="Open conversations"
        >
          <PanelLeft className="w-4 h-4" />
        </button>

        <div className="flex-1 min-w-0">
          <h1 className="font-serif text-[#27272A] text-base font-semibold truncate">
            {conversationTitle}
          </h1>
          <p className="text-[11px] text-[#A1A1AA] mt-0.5 flex items-center gap-1.5">
            <Sparkles className="w-3 h-3" />
            Hive of Minds · 5 specialist agents
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {activeConvId && (
            <button
              onClick={copyLink}
              title="Copy conversation link"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-[#71717A] hover:bg-[#F4F4F5] hover:text-[#27272A] transition-colors border border-transparent hover:border-[#E4E4E7]"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Link2 className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{copied ? 'Copied' : 'Share'}</span>
            </button>
          )}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-green-50 border border-green-100">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[11px] text-green-700 font-medium">Live</span>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {loadingHistory ? (
          <div className="flex flex-col items-center justify-center h-full text-[#A1A1AA] text-sm gap-3">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Loading conversation…</span>
          </div>
        ) : showWelcome ? (
          <WelcomeScreen onPrompt={sendMessage} />
        ) : showEmptyThread ? (
          <div className="flex flex-col items-center justify-center h-full px-4 text-center">
            <MessageSquareEmpty />
            <p className="text-sm text-[#71717A] mt-4">This conversation is empty.</p>
            <p className="text-xs text-[#A1A1AA] mt-1">Send a message below to get started.</p>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-6">
            <AnimatePresence initial={false}>
              {displayMessages.map((msg, idx) => {
                const isUser = msg.role === 'user';
                const showGreeting = msg.id === 'greeting';
                const prevRole = idx > 0 ? displayMessages[idx - 1].role : null;
                const showAvatar = !isUser && (idx === 0 || prevRole === 'user');

                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    {isUser ? (
                      <UserAvatar />
                    ) : showAvatar ? (
                      <div className="w-8 h-8 shrink-0 rounded-full bg-[#27272A] flex items-center justify-center mt-0.5">
                        <Bot className="w-4 h-4 text-white" strokeWidth={1.5} />
                      </div>
                    ) : (
                      <div className="w-8 shrink-0" />
                    )}

                    <div className={`flex flex-col min-w-0 max-w-[85%] ${isUser ? 'items-end' : 'items-start'}`}>
                      <div
                        className={`px-4 py-2.5 rounded-2xl text-[15px] leading-relaxed whitespace-pre-wrap break-words ${
                          isUser
                            ? 'bg-[#27272A] text-white rounded-tr-md'
                            : 'bg-[#F4F4F5] text-[#27272A] rounded-tl-md'
                        }`}
                      >
                        {msg.content}
                      </div>

                      {msg.type === 'calendar_event' && msg.metadata && (
                        <div className="mt-2 w-full max-w-md bg-white border border-[#E4E4E7] p-4 rounded-2xl flex items-start gap-3 shadow-sm">
                          <CalendarIcon className="w-4 h-4 text-[#D97757] shrink-0 mt-0.5" strokeWidth={1.5} />
                          <div>
                            <p className="font-medium text-[#27272A] text-sm">{String(msg.metadata.title)}</p>
                            {!!msg.metadata.date && (
                              <p className="text-[#A1A1AA] text-xs mt-0.5">
                                {String(msg.metadata.date)}
                                {msg.metadata.duration_hours ? ` · ${String(msg.metadata.duration_hours)}h` : ''}
                              </p>
                            )}
                            <p className="text-green-600 text-xs mt-1.5 flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" /> Added to Calendar
                            </p>
                          </div>
                        </div>
                      )}

                      {msg.type === 'quiz' && msg.metadata && <QuizCard metadata={msg.metadata} />}

                      {msg.type === 'insight' && msg.metadata && (
                        <div className="mt-2 w-full max-w-md bg-white border border-[#E4E4E7] p-4 rounded-2xl flex items-center gap-4 shadow-sm">
                          <BarChart2 className="w-5 h-5 text-[#D97757] shrink-0" />
                          <div>
                            <p className="text-xs text-[#A1A1AA] uppercase tracking-wider">{String(msg.metadata.label)}</p>
                            <p className="font-serif font-semibold text-[#27272A] text-lg">{String(msg.metadata.value)}</p>
                          </div>
                        </div>
                      )}

                      {!isUser && msg.agents && msg.agents.length > 0 && !showGreeting && (
                        <AgentBadges agents={msg.agents} />
                      )}

                      {msg.created_at && (
                        <span className="text-[10px] text-[#D4D4D8] mt-1 px-1">
                          {formatMessageTime(msg.created_at)}
                        </span>
                      )}
                    </div>
                  </motion.div>
                );
              })}

              {isTyping && (
                <motion.div
                  key="typing"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-3"
                >
                  <div className="w-8 h-8 shrink-0 rounded-full bg-[#27272A] flex items-center justify-center">
                    <Bot className="w-4 h-4 text-white" strokeWidth={1.5} />
                  </div>
                  <div className="bg-[#F4F4F5] rounded-2xl rounded-tl-md px-4 py-3">
                    <div className="flex items-center gap-2 text-[#A1A1AA] mb-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span className="text-xs">
                        {typingAgents.length > 0 ? typingAgents.join(' · ') : 'Thinking…'}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          className="w-1.5 h-1.5 rounded-full bg-[#A1A1AA]"
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                        />
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <div ref={endRef} className="h-1" />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-[#F4F4F5] px-4 sm:px-5 py-4 bg-[#FAFAF9]/80">
        <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
          <div className="flex gap-2 items-end">
            <div className="flex-1 bg-white border border-[#E4E4E7] rounded-2xl flex items-end overflow-hidden shadow-sm focus-within:border-[#27272A] focus-within:ring-1 focus-within:ring-[#27272A]/10 transition-all">
              <textarea
                ref={textareaRef}
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Message the Hive…"
                className="flex-1 py-3 px-4 text-[15px] text-[#27272A] placeholder:text-[#A1A1AA] bg-transparent focus:outline-none resize-none leading-relaxed max-h-[120px]"
              />
            </div>
            <button
              type="submit"
              disabled={!input.trim() || isTyping}
              className="p-3 bg-[#27272A] text-white rounded-xl hover:bg-[#3F3F46] transition-colors disabled:opacity-30 disabled:cursor-not-allowed shrink-0 shadow-sm"
              aria-label="Send message"
            >
              <Send className="w-4 h-4" strokeWidth={2} />
            </button>
          </div>
          <p className="text-[11px] text-[#A1A1AA] mt-2 text-center">
            Enter to send · Shift+Enter for new line · ⌘K to focus
          </p>
        </form>
      </div>
    </div>
  );
}

function MessageSquareEmpty() {
  return (
    <div className="w-12 h-12 rounded-2xl bg-[#F4F4F5] flex items-center justify-center">
      <MessageSquare className="w-5 h-5 text-[#A1A1AA]" />
    </div>
  );
}
