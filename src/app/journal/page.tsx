"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Loader2, Sparkles } from 'lucide-react';

// ── Decorative SVG Sketches ───────────────────────────────────────────────────
function SketchDecorations() {
  return (
    <div className="pointer-events-none select-none absolute inset-0 overflow-hidden" aria-hidden>
      {/* Top-left botanical leaf */}
      <svg className="absolute -top-4 -left-6 w-52 h-52 opacity-[0.07]" viewBox="0 0 200 200" fill="none">
        <path d="M20 180 Q60 80 160 20 Q140 80 80 120 Q40 140 20 180Z" stroke="#3F3F46" strokeWidth="1.5" fill="none"/>
        <path d="M20 180 Q90 130 160 20" stroke="#3F3F46" strokeWidth="1" strokeDasharray="4 3"/>
        <path d="M60 160 Q80 110 130 60" stroke="#3F3F46" strokeWidth="0.8" strokeDasharray="3 4"/>
        <path d="M100 145 Q110 100 145 70" stroke="#3F3F46" strokeWidth="0.7" strokeDasharray="3 4"/>
      </svg>

      {/* Top-right stars cluster */}
      <svg className="absolute top-8 right-8 w-32 h-32 opacity-[0.09]" viewBox="0 0 120 120" fill="none">
        <path d="M60 10 L65 45 L100 50 L65 55 L60 90 L55 55 L20 50 L55 45 Z" stroke="#D97757" strokeWidth="1.2" fill="none"/>
        <circle cx="95" cy="20" r="4" stroke="#D97757" strokeWidth="1"/>
        <path d="M15 80 L17 88 L25 90 L17 92 L15 100 L13 92 L5 90 L13 88 Z" stroke="#D97757" strokeWidth="1" fill="none"/>
      </svg>

      {/* Middle-left wavy lines */}
      <svg className="absolute top-1/3 -left-8 w-24 h-48 opacity-[0.06]" viewBox="0 0 80 180" fill="none">
        <path d="M10 0 Q30 20 10 40 Q-10 60 10 80 Q30 100 10 120 Q-10 140 10 160 Q30 180 10 200" stroke="#3F3F46" strokeWidth="1.2" fill="none"/>
        <path d="M30 0 Q50 20 30 40 Q10 60 30 80 Q50 100 30 120 Q10 140 30 160 Q50 180 30 200" stroke="#3F3F46" strokeWidth="1" fill="none"/>
      </svg>

      {/* Bottom-right leaf cluster */}
      <svg className="absolute -bottom-4 -right-4 w-60 h-60 opacity-[0.07]" viewBox="0 0 220 220" fill="none">
        <path d="M200 200 Q140 100 40 40 Q80 120 140 160 Q170 180 200 200Z" stroke="#3F3F46" strokeWidth="1.5" fill="none"/>
        <path d="M200 200 Q110 150 40 40" stroke="#3F3F46" strokeWidth="1" strokeDasharray="4 3"/>
        <path d="M170 185 Q130 140 80 90" stroke="#3F3F46" strokeWidth="0.8" strokeDasharray="3 4"/>
      </svg>

      {/* Bottom-left moon */}
      <svg className="absolute bottom-16 left-8 w-16 h-16 opacity-[0.08]" viewBox="0 0 60 60" fill="none">
        <path d="M35 5 A25 25 0 1 0 35 55 A18 18 0 1 1 35 5Z" stroke="#D97757" strokeWidth="1.2" fill="none"/>
      </svg>

      {/* Scattered tiny dots */}
      {[[85, 12],[92, 35],[10, 55],[78, 68],[15, 82],[88, 88],[55, 5],[42, 93]].map(([x, y], i) => (
        <div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-[#D97757] opacity-10"
          style={{ left: `${x}%`, top: `${y}%` }}
        />
      ))}
    </div>
  );
}

// ── Mood Selector ─────────────────────────────────────────────────────────────
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

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function JournalPage() {
  const [mood, setMood] = useState<number>(5);
  const [journal, setJournal] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [charCount, setCharCount] = useState(0);

  const handleJournalChange = (val: string) => {
    setJournal(val);
    setCharCount(val.length);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!journal.trim()) return;

    setIsSubmitting(true);
    setAnalysisResult(null);
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mood, journal }),
      });
      const data = await response.json();
      setAnalysisResult(data);
    } catch (error) {
      console.error('Error analyzing journal:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedMood = MOODS.find(m => m.score === mood) ?? MOODS[4];

  return (
    <div className="relative min-h-[calc(100vh-3.5rem)] bg-[#FDFCF8] overflow-hidden">
      <SketchDecorations />

      <div className="relative z-10 max-w-2xl mx-auto py-12 px-4">

        {/* Page header */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10 text-center"
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-[#A1A1AA] mb-2">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
          <h1 className="text-4xl font-serif text-[#27272A]">How was your day?</h1>
          <p className="text-[#A1A1AA] text-sm mt-2">
            Write freely — your words stay private &amp; the AI analyzes patterns, not you.
          </p>
        </motion.div>

        <form onSubmit={handleSubmit} className="space-y-8">

          {/* ── Mood Picker ── */}
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

            {/* Emoji grid */}
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

            {/* Score bar */}
            <div className="mt-5 h-1.5 bg-[#F4F4F5] rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-red-300 via-amber-300 to-green-400"
                animate={{ width: `${(mood / 10) * 100}%` }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              />
            </div>
          </motion.div>

          {/* ── Journal Textarea — Notebook Style ── */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }}
            className="relative"
          >
            <div className="bg-white border border-[#E4E4E7] rounded-2xl shadow-sm overflow-hidden">
              {/* Notebook header strip */}
              <div className="flex items-center gap-2 px-5 py-3 border-b border-[#F4F4F5]">
                <div className="w-2.5 h-2.5 rounded-full bg-red-300" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-300" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-300" />
                <span className="ml-2 text-xs text-[#A1A1AA]">Today&apos;s entry</span>
              </div>

              {/* Lined background simulation + textarea */}
              <div className="relative">
                {/* Lined guide marks — decorative left margin */}
                <div className="absolute left-0 top-0 bottom-0 w-10 border-r border-red-100 bg-red-50/40" />
                {/* Horizontal lines */}
                <div className="absolute inset-0 left-10 pointer-events-none"
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

              {/* Footer */}
              <div className="flex items-center justify-between px-5 py-3 border-t border-[#F4F4F5]">
                <span className="text-xs text-[#A1A1AA]">{charCount} characters</span>
                <span className="text-xs text-[#A1A1AA]">Private &amp; secure</span>
              </div>
            </div>
          </motion.div>

          {/* ── Submit ── */}
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

        {/* ── AI Insights ── */}
        <AnimatePresence>
          {analysisResult && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="mt-12 space-y-6"
            >
              {/* Section label */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-[#E4E4E7]" />
                <span className="text-xs font-semibold uppercase tracking-widest text-[#A1A1AA]">AI Insights</span>
                <div className="flex-1 h-px bg-[#E4E4E7]" />
              </div>

              {/* Triggers */}
              {analysisResult.triggers?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#A1A1AA] mb-3">Detected Triggers</p>
                  <div className="flex flex-wrap gap-2">
                    {analysisResult.triggers.map((trigger: string, i: number) => (
                      <motion.span
                        key={i}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.07 }}
                        className="px-3 py-1.5 bg-white border border-[#E4E4E7] rounded-full text-sm text-[#3F3F46] shadow-sm"
                      >
                        {trigger}
                      </motion.span>
                    ))}
                  </div>
                </div>
              )}

              {/* Support message */}
              {analysisResult.supportMessage && (
                <div className="bg-white border border-[#E4E4E7] rounded-2xl p-6 shadow-sm relative overflow-hidden">
                  {/* Accent bar */}
                  <div className="absolute left-0 top-4 bottom-4 w-1 bg-[#D97757] rounded-r-full" />
                  <p className="pl-4 text-[#3F3F46] leading-relaxed text-[15px]">{analysisResult.supportMessage}</p>
                </div>
              )}

              {/* Strategies */}
              {analysisResult.strategies?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#A1A1AA] mb-4">Suggested Strategies</p>
                  <ul className="space-y-3">
                    {analysisResult.strategies.map((strategy: string, i: number) => (
                      <motion.li
                        key={i}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="flex gap-4 items-start bg-white border border-[#E4E4E7] rounded-xl px-5 py-4 shadow-sm"
                      >
                        <span className="font-serif text-[#D97757] font-bold text-lg leading-none mt-0.5">{i + 1}</span>
                        <span className="text-[#3F3F46] text-[14px] leading-relaxed">{strategy}</span>
                      </motion.li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Write another */}
              <div className="text-center pt-2">
                <button
                  onClick={() => { setJournal(''); setAnalysisResult(null); setCharCount(0); }}
                  className="text-sm text-[#A1A1AA] hover:text-[#27272A] transition-colors underline underline-offset-2"
                >
                  Write another entry
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
