"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, Bot, Paperclip, Calendar as CalendarIcon, Loader2,
  CheckCircle, BarChart2, Zap
} from 'lucide-react';

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
  metadata?: any;
  agents?: AgentInfo[];
}

const SUGGESTED_PROMPTS = [
  "Give me a quick quiz on Thermodynamics",
  "Add 2hr Physics revision tomorrow at 10am",
  "How am I doing this week?",
  "I'm feeling burnt out, help me",
];

function QuizCard({ metadata }: { metadata: any }) {
  const [selected, setSelected] = useState<number | null>(null);
  const correctIndex = metadata.options?.findIndex((o: string) => o.startsWith(metadata.correct));

  return (
    <div className="mt-4 bg-white border border-[#E4E4E7] rounded-2xl p-6 text-left shadow-sm max-w-sm">
      <div className="flex items-center gap-2 mb-3">
        <Zap className="w-4 h-4 text-[#D97757]" />
        <span className="text-xs font-semibold uppercase tracking-wider text-[#D97757]">Quiz · {metadata.topic}</span>
      </div>
      <p className="text-[#27272A] font-medium mb-4 text-[15px] leading-snug">{metadata.question}</p>
      <div className="space-y-2">
        {metadata.options?.map((opt: string, i: number) => {
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
          {selected === correctIndex ? '✓ Correct!' : `✗ Correct answer: ${metadata.options?.[correctIndex]}`}
        </p>
      )}
    </div>
  );
}

function AgentBadges({ agents }: { agents: AgentInfo[] }) {
  return (
    <div className="flex flex-wrap gap-1.5 mt-3">
      {agents.map((a) => (
        <span
          key={a.key}
          title={a.summary}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#F4F4F5] border border-[#E4E4E7] text-[11px] text-[#71717A] cursor-help"
        >
          <span>{a.emoji}</span>
          <span>{a.name}</span>
        </span>
      ))}
    </div>
  );
}

export default function CompanionPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'assistant',
      content: "Hello! I'm MindSpace — powered by a committee of specialist agents. I can quiz you, schedule sessions, check your mood trends, and more. What do you need?",
      type: 'text',
      agents: [{ key: 'academic', name: 'Academic Agent', emoji: '📚', summary: 'Initial greeting' }],
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingAgents, setTypingAgents] = useState<string[]>([]);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Focus input on mount & keyboard shortcut
  useEffect(() => {
    inputRef.current?.focus();
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isTyping) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text, type: 'text' };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);
    setTypingAgents(['Routing...']);

    try {
      // Show router in progress briefly
      await new Promise(r => setTimeout(r, 400));
      setTypingAgents(['Academic Agent', 'Wellness Agent']);

      const res = await fetch('/api/hive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });

      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.reply || 'Something went wrong.',
        type: data.type || 'text',
        metadata: data.metadata,
        agents: data.agents_invoked,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.error('[Companion]', err);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 2).toString(),
          role: 'assistant',
          content: "I'm having trouble connecting right now. Please check your API key and try again.",
          type: 'text',
        },
      ]);
    } finally {
      setIsTyping(false);
      setTypingAgents([]);
    }
  }, [isTyping]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <div className="max-w-3xl mx-auto flex flex-col" style={{ height: 'calc(100vh - 3.5rem)' }}>
      {/* Header */}
      <div className="border-b border-[#E4E4E7] px-6 py-4 flex items-center justify-between shrink-0">
        <div>
          <h1 className="font-serif text-[#27272A] text-lg font-semibold">Companion</h1>
          <p className="text-[11px] text-[#A1A1AA] mt-0.5">Hive of Minds · 5 specialist agents</p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs text-[#71717A]">Agents active</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto scrollbar-hide px-6 py-6 space-y-8">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 shrink-0 rounded-full bg-[#27272A] flex items-center justify-center mt-0.5">
                  <Bot className="w-4 h-4 text-white" strokeWidth={1.5} />
                </div>
              )}
              <div className={`max-w-[80%] ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col`}>
                <div
                  className={`px-4 py-3 rounded-2xl text-[15px] leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-[#27272A] text-white rounded-tr-sm'
                      : 'bg-[#F4F4F5] text-[#27272A] rounded-tl-sm'
                  }`}
                >
                  {msg.content}
                </div>

                {/* Rich action cards */}
                {msg.type === 'calendar_event' && msg.metadata && (
                  <div className="mt-3 bg-white border border-[#E4E4E7] p-4 rounded-2xl flex items-start gap-3 shadow-sm">
                    <CalendarIcon className="w-4 h-4 text-[#D97757] shrink-0 mt-0.5" strokeWidth={1.5} />
                    <div>
                      <p className="font-medium text-[#27272A] text-sm">{msg.metadata.title}</p>
                      {msg.metadata.date && <p className="text-[#A1A1AA] text-xs mt-0.5">{msg.metadata.date}{msg.metadata.duration_hours ? ` · ${msg.metadata.duration_hours}h` : ''}</p>}
                      <p className="text-green-600 text-xs mt-1 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Added to Calendar</p>
                    </div>
                  </div>
                )}

                {msg.type === 'quiz' && msg.metadata && <QuizCard metadata={msg.metadata} />}

                {msg.type === 'insight' && msg.metadata && (
                  <div className="mt-3 bg-white border border-[#E4E4E7] p-4 rounded-2xl flex items-center gap-4 shadow-sm">
                    <BarChart2 className="w-5 h-5 text-[#D97757] shrink-0" />
                    <div>
                      <p className="text-xs text-[#A1A1AA] uppercase tracking-wider">{msg.metadata.label}</p>
                      <p className="font-serif font-semibold text-[#27272A] text-lg">{msg.metadata.value}</p>
                    </div>
                  </div>
                )}

                {/* Agent badges */}
                {msg.role === 'assistant' && msg.agents && msg.agents.length > 0 && (
                  <AgentBadges agents={msg.agents} />
                )}
              </div>
            </motion.div>
          ))}

          {/* Typing indicator */}
          {isTyping && (
            <motion.div
              key="typing"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex gap-3"
            >
              <div className="w-8 h-8 shrink-0 rounded-full bg-[#27272A] flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" strokeWidth={1.5} />
              </div>
              <div className="bg-[#F4F4F5] rounded-2xl rounded-tl-sm px-4 py-3 flex flex-col gap-1">
                <div className="flex items-center gap-2 text-[#A1A1AA]">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span className="text-xs">
                    {typingAgents.length > 0 ? typingAgents.join(', ') : 'Thinking...'}
                  </span>
                </div>
                <div className="flex gap-1 mt-1">
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
        <div ref={endRef} />
      </div>

      {/* Bottom input area */}
      <div className="shrink-0 border-t border-[#E4E4E7] px-6 py-4 bg-[#FDFCF8]">
        {/* Suggested prompts — only show when no conversation yet */}
        {messages.length <= 1 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {SUGGESTED_PROMPTS.map((p) => (
              <button
                key={p}
                onClick={() => sendMessage(p)}
                className="text-[12px] px-3 py-1.5 rounded-full border border-[#E4E4E7] text-[#71717A] hover:border-[#D97757] hover:text-[#D97757] transition-colors"
              >
                {p}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex gap-2 items-end">
          <div className="flex-1 bg-white border border-[#E4E4E7] rounded-2xl flex items-center overflow-hidden focus-within:border-[#27272A] transition-colors">
            <button type="button" className="p-3 text-[#A1A1AA] hover:text-[#52525B] transition-colors shrink-0">
              <Paperclip className="w-4 h-4" strokeWidth={1.5} />
            </button>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Message the Hive..."
              className="flex-1 py-3 pr-3 text-[15px] text-[#27272A] placeholder:text-[#A1A1AA] bg-transparent focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={!input.trim() || isTyping}
            className="p-3.5 bg-[#27272A] text-white rounded-xl hover:bg-[#3F3F46] transition-colors disabled:opacity-40 shrink-0"
          >
            <Send className="w-4 h-4" strokeWidth={2} />
          </button>
        </form>
        <p className="text-[11px] text-[#A1A1AA] mt-2 text-center">
          ⌘K to focus · MindSpace can make mistakes
        </p>
      </div>
    </div>
  );
}
