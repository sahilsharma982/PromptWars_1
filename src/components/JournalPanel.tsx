"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Loader2, Sparkles, PanelLeft, BookOpen } from 'lucide-react';
import { useJournal } from '@/app/journal/layout';
import {
  upsertLocalJournalEntry,
  getLocalJournalEntry,
  type StoredJournalEntry,
} from '@/lib/journalStorage';

// ── Decorative SVG Sketches ───────────────────────────────────────────────────
function SketchDecorations() {
  return (
    <div className="pointer-events-none select-none absolute inset-0 overflow-hidden" aria-hidden>
      <svg className="absolute -top-4 -left-6 w-52 h-52 opacity-[0.07]" viewBox="0 0 200 200" fill="none">
        <path d="M20 180 Q60 80 160 20 Q140 80 80 120 Q40 140 20 180Z" stroke="#3F3F46" strokeWidth="1.5" fill="none"/>
        <path d="M20 180 Q90 130 160 20" stroke="#3F3F46" strokeWidth="1" strokeDasharray="4 3"/>
      </svg>
      <svg className="absolute top-8 right-8 w-32 h-32 opacity-[0.09]" viewBox="0 0 120 120" fill="none">
        <path d="M60 10 L65 45 L100 50 L65 55 L60 90 L55 55 L20 50 L55 45 Z" stroke="#D97757" strokeWidth="1.2" fill="none"/>
      </svg>
      <svg className="absolute -bottom-4 -right-4 w-60 h-60 opacity-[0.07]" viewBox="0 0 220 220" fill="none">
        <path d="M200 200 Q140 100 40 40 Q80 120 140 160 Q170 180 200 200Z" stroke="#3F3F46" strokeWidth="1.5" fill="none"/>
      </svg>
    </div>
  );
}

const MOODS = [
  { score: 1, emoji: '😞', label: 'Terrible' },
  { score: 2, emoji: '😔', label: 'Very Low' },
  { score: 3, emoji: '😟', label: 'Low' },
  { score: 4, emoji: '😐', label: 'Meh' },
  { score: 5, emoji: '🙂', label: 'Okay' },
  { score: 6, emoji: '😊', label: 'Good' },
  { score: 7, emoji: '😄', label: 'Great' },
  { score: 8, emoji: '🤩', label: 'Amazing' },
  { score: 9, emoji: '🥳', label: 'Fantastic' },
  { score: 10, emoji: '🚀', label: 'On Fire!' },
];

function formatFullDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function InsightsSection({ entry }: { entry: StoredJournalEntry }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-[#E4E4E7]" />
        <span className="text-xs font-semibold uppercase tracking-widest text-[#A1A1AA]">AI Insights</span>
        <div className="flex-1 h-px bg-[#E4E4E7]" />
      </div>

      {entry.triggers?.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#A1A1AA] mb-3">Detected Triggers</p>
          <div className="flex flex-wrap gap-2">
            {entry.triggers.map((trigger, i) => (
              <span
                key={i}
                className="px-3 py-1.5 bg-white border border-[#E4E4E7] rounded-full text-sm text-[#3F3F46] shadow-sm"
              >
                {trigger}
              </span>
            ))}
          </div>
        </div>
      )}

      {entry.support_message && (
        <div className="bg-white border border-[#E4E4E7] rounded-2xl p-6 shadow-sm relative overflow-hidden">
          <div className="absolute left-0 top-4 bottom-4 w-1 bg-[#D97757] rounded-r-full" />
          <p className="pl-4 text-[#3F3F46] leading-relaxed text-[15px]">{entry.support_message}</p>
        </div>
      )}

      {entry.strategies?.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#A1A1AA] mb-4">Suggested Strategies</p>
          <ul className="space-y-3">
            {entry.strategies.map((strategy, i) => (
              <li
                key={i}
                className="flex gap-4 items-start bg-white border border-[#E4E4E7] rounded-xl px-5 py-4 shadow-sm"
              >
                <span className="font-serif text-[#D97757] font-bold text-lg leading-none mt-0.5">{i + 1}</span>
                <span className="text-[#3F3F46] text-[14px] leading-relaxed">{strategy}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </motion.div>
  );
}

function EntryDetail({ entry }: { entry: StoredJournalEntry }) {
  const moodInfo = MOODS.find(m => m.score === entry.mood) ?? MOODS[4];

  return (
    <div className="bg-white border border-[#E4E4E7] rounded-2xl shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-[#F4F4F5] flex items-center justify-between">
        <div>
          <p className="text-xs text-[#A1A1AA]">{formatFullDate(entry.created_at)}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-2xl">{moodInfo.emoji}</span>
            <span className="text-sm text-[#71717A]">{moodInfo.label} · {entry.mood}/10</span>
          </div>
        </div>
        <BookOpen className="w-5 h-5 text-[#D97757] opacity-60" />
      </div>

      <div className="relative">
        <div className="absolute left-0 top-0 bottom-0 w-10 border-r border-red-100 bg-red-50/40" />
        <div
          className="absolute inset-0 left-10 pointer-events-none"
          style={{
            backgroundImage: 'repeating-linear-gradient(transparent, transparent 31px, #E4E4E7 31px, #E4E4E7 32px)',
            backgroundPosition: '0 16px',
          }}
        />
        <div className="relative z-10 pl-14 pr-5 py-4 text-[15px] leading-8 text-[#27272A] whitespace-pre-wrap">
          {entry.content}
        </div>
      </div>
    </div>
  );
}

interface JournalPanelProps {
  entryId?: string;
}

export default function JournalPanel({ entryId }: JournalPanelProps) {
  const router = useRouter();
  const { setSidebarOpen } = useJournal();

  const [mood, setMood] = useState(5);
  const [journal, setJournal] = useState('');
  const [charCount, setCharCount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [savedEntry, setSavedEntry] = useState<StoredJournalEntry | null>(null);
  const [loadingEntry, setLoadingEntry] = useState(!!entryId);

  useEffect(() => {
    if (!entryId) {
      setSavedEntry(null);
      setLoadingEntry(false);
      return;
    }

    const id = entryId;
    let cancelled = false;
    async function loadEntry() {
      setLoadingEntry(true);
      const local = getLocalJournalEntry(id);
      try {
        const res = await fetch(`/api/journal/${id}`);
        if (res.ok) {
          const data = await res.json();
          if (!cancelled && data.entry) {
            setSavedEntry({
              id: data.entry.id,
              mood: data.entry.mood,
              content: data.entry.content,
              triggers: data.entry.triggers ?? [],
              support_message: data.entry.support_message ?? null,
              strategies: data.entry.strategies ?? [],
              created_at: data.entry.created_at,
            });
          } else if (!cancelled && local) {
            setSavedEntry(local);
          }
        } else if (!cancelled) {
          setSavedEntry(local);
        }
      } catch {
        if (!cancelled) setSavedEntry(local);
      } finally {
        if (!cancelled) setLoadingEntry(false);
      }
    }
    loadEntry();
    return () => { cancelled = true; };
  }, [entryId]);

  const handleJournalChange = (val: string) => {
    setJournal(val);
    setCharCount(val.length);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!journal.trim()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mood, journal }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Analysis failed');

      const entry: StoredJournalEntry = {
        id: data.entry?.id || `local-${Date.now()}`,
        mood: data.entry?.mood ?? mood,
        content: data.entry?.content ?? journal,
        triggers: data.entry?.triggers ?? data.triggers ?? [],
        support_message: data.entry?.support_message ?? data.supportMessage ?? null,
        strategies: data.entry?.strategies ?? data.strategies ?? [],
        created_at: data.entry?.created_at ?? new Date().toISOString(),
      };

      upsertLocalJournalEntry(entry);
      window.dispatchEvent(new CustomEvent('journal:entry-saved'));
      router.push(`/journal/${entry.id}`);
    } catch (error) {
      console.error('Error analyzing journal:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedMood = MOODS.find(m => m.score === mood) ?? MOODS[4];
  const isCompose = !entryId;

  return (
    <div className="relative min-h-full bg-[#FDFCF8] border border-[#E4E4E7] rounded-2xl shadow-sm overflow-hidden">
      <SketchDecorations />

      <div className="relative z-10 max-w-2xl mx-auto py-8 px-4 sm:px-6">
        {/* Header */}
        <div className="flex items-start gap-3 mb-8">
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden w-9 h-9 flex items-center justify-center rounded-xl text-[#71717A] hover:bg-[#F4F4F5] transition-colors shrink-0 mt-1"
            aria-label="Open journal history"
          >
            <PanelLeft className="w-4 h-4" />
          </button>

          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-1 text-center md:text-left"
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-[#A1A1AA] mb-2">
              {isCompose
                ? new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
                : 'Journal entry'}
            </p>
            <h1 className="text-3xl sm:text-4xl font-serif text-[#27272A]">
              {isCompose ? 'How was your day?' : 'Your reflection'}
            </h1>
            <p className="text-[#A1A1AA] text-sm mt-2">
              {isCompose
                ? 'Write freely — your words stay private & the AI analyzes patterns, not you.'
                : 'Saved entry with AI-generated insights.'}
            </p>
          </motion.div>
        </div>

        {loadingEntry ? (
          <div className="flex flex-col items-center justify-center py-24 text-[#A1A1AA] gap-3">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Loading entry…</span>
          </div>
        ) : !isCompose && savedEntry ? (
          <div className="space-y-8">
            <EntryDetail entry={savedEntry} />
            <InsightsSection entry={savedEntry} />
          </div>
        ) : !isCompose && !savedEntry ? (
          <div className="text-center py-24">
            <BookOpen className="w-10 h-10 text-[#E4E4E7] mx-auto mb-3" />
            <p className="text-sm text-[#71717A]">Entry not found</p>
            <button
              onClick={() => router.push('/journal')}
              className="mt-4 text-sm text-[#D97757] hover:underline"
            >
              Write a new entry
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Mood Picker */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white border border-[#E4E4E7] rounded-2xl p-6 shadow-sm"
            >
              <div className="flex items-center justify-between mb-5">
                <p className="font-serif text-[#27272A] text-lg">Mood check-in</p>
                <motion.div
                  key={mood}
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="flex items-center gap-2"
                >
                  <span className="text-3xl">{selectedMood.emoji}</span>
                  <span className="text-sm text-[#71717A]">{selectedMood.label}</span>
                </motion.div>
              </div>

              <div className="flex gap-1.5 flex-wrap justify-between">
                {MOODS.map((m) => (
                  <motion.button
                    key={m.score}
                    type="button"
                    onClick={() => setMood(m.score)}
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.95 }}
                    className={`relative w-9 h-9 flex items-center justify-center text-xl rounded-xl transition-all ${
                      mood === m.score
                        ? 'bg-[#27272A] shadow-md ring-2 ring-[#27272A] ring-offset-2'
                        : 'bg-[#F4F4F5] hover:bg-[#E4E4E7]'
                    }`}
                    title={`${m.label} (${m.score}/10)`}
                  >
                    {m.emoji}
                  </motion.button>
                ))}
              </div>

              <div className="mt-5 h-1.5 bg-[#F4F4F5] rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-red-300 via-amber-300 to-green-400"
                  animate={{ width: `${(mood / 10) * 100}%` }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              </div>
            </motion.div>

            {/* Journal Textarea */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18 }}
            >
              <div className="bg-white border border-[#E4E4E7] rounded-2xl shadow-sm overflow-hidden">
                <div className="flex items-center gap-2 px-5 py-3 border-b border-[#F4F4F5]">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-300" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-300" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-300" />
                  <span className="ml-2 text-xs text-[#A1A1AA]">Today&apos;s entry</span>
                </div>

                <div className="relative">
                  <div className="absolute left-0 top-0 bottom-0 w-10 border-r border-red-100 bg-red-50/40" />
                  <div
                    className="absolute inset-0 left-10 pointer-events-none"
                    style={{
                      backgroundImage: 'repeating-linear-gradient(transparent, transparent 31px, #E4E4E7 31px, #E4E4E7 32px)',
                      backgroundPosition: '0 16px',
                    }}
                  />
                  <textarea
                    value={journal}
                    onChange={(e) => handleJournalChange(e.target.value)}
                    placeholder="Write freely... What happened today? What's on your mind?"
                    className="relative z-10 w-full h-56 pl-14 pr-5 py-4 text-[15px] leading-8 text-[#27272A] placeholder:text-[#C4C4C7] bg-transparent focus:outline-none resize-none font-sans"
                  />
                </div>

                <div className="flex items-center justify-between px-5 py-3 border-t border-[#F4F4F5]">
                  <span className="text-xs text-[#A1A1AA]">{charCount} characters</span>
                  <span className="text-xs text-[#A1A1AA]">Private &amp; secure</span>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25 }}
              className="flex justify-end"
            >
              <motion.button
                type="submit"
                disabled={isSubmitting || !journal.trim()}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className="flex items-center gap-2.5 bg-[#27272A] text-white font-medium py-3 px-8 rounded-xl transition-colors hover:bg-[#3F3F46] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Reflect &amp; Analyze
                  </>
                )}
              </motion.button>
            </motion.div>
          </form>
        )}
      </div>
    </div>
  );
}
