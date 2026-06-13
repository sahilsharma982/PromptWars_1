"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  TrendingUp, TrendingDown, Minus, Brain, BookOpen,
  Calendar, MessageSquare, Sparkles, ArrowRight, Activity,
  AlertCircle,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface JournalEntry {
  id?: string;
  mood: number;
  content: string;
  triggers: string[];
  support_message: string | null;
  strategies: string[];
  created_at?: string;
}

// ── Demo / fallback data (shown when DB has no entries yet) ────────────────────

const DEMO_ENTRIES: JournalEntry[] = [
  { mood: 7, content: 'Felt good about Physics today', triggers: ['Mock Test Anxiety'], support_message: null, strategies: ['Take breaks'], created_at: new Date(Date.now() - 86400000 * 0).toISOString() },
  { mood: 5, content: 'Struggled with organic chemistry', triggers: ['Peer Comparison', 'Sleep Deprivation'], support_message: null, strategies: ['4-7-8 breathing'], created_at: new Date(Date.now() - 86400000 * 1).toISOString() },
  { mood: 6, content: 'Decent mock test performance', triggers: ['Mock Test Anxiety'], support_message: null, strategies: ['Walk after study'], created_at: new Date(Date.now() - 86400000 * 2).toISOString() },
  { mood: 8, content: 'Great study session, finished mechanics', triggers: [], support_message: null, strategies: ['No screens after 9pm'], created_at: new Date(Date.now() - 86400000 * 3).toISOString() },
  { mood: 4, content: 'Very tired, could not focus', triggers: ['Sleep Deprivation', 'Burnout'], support_message: null, strategies: ['Sleep by 11pm'], created_at: new Date(Date.now() - 86400000 * 4).toISOString() },
  { mood: 7, content: 'Revised thermodynamics effectively', triggers: ['Time Pressure'], support_message: null, strategies: ['Pomodoro technique'], created_at: new Date(Date.now() - 86400000 * 5).toISOString() },
  { mood: 6, content: 'Average day, maintained schedule', triggers: ['Peer Comparison'], support_message: null, strategies: ['Journaling daily'], created_at: new Date(Date.now() - 86400000 * 6).toISOString() },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function avg(nums: number[]) {
  return nums.length ? (nums.reduce((a, b) => a + b, 0) / nums.length) : 0;
}

function stressLevel(avgMood: number) {
  if (avgMood >= 7.5) return { label: 'Low', color: '#22C55E' };
  if (avgMood >= 5.5) return { label: 'Moderate', color: '#F59E0B' };
  return { label: 'High', color: '#EF4444' };
}

function topTriggers(entries: JournalEntry[]): { name: string; count: number }[] {
  const counts: Record<string, number> = {};
  for (const e of entries) {
    for (const t of e.triggers) {
      counts[t] = (counts[t] ?? 0) + 1;
    }
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));
}

function topStrategies(entries: JournalEntry[]): string[] {
  const counts: Record<string, number> = {};
  for (const e of entries) {
    for (const s of e.strategies) {
      counts[s] = (counts[s] ?? 0) + 1;
    }
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([s]) => s);
}

// ── Mood Chart ─────────────────────────────────────────────────────────────────

function MoodSparkline({ entries }: { entries: JournalEntry[] }) {
  const pts = [...entries].reverse().slice(-7);
  const H = 48, W = 200;
  const xStep = W / Math.max(pts.length - 1, 1);

  const points = pts.map((e, i) => ({
    x: i * xStep,
    y: H - ((e.mood - 1) / 9) * H,
    mood: e.mood,
  }));

  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="overflow-visible">
      {/* Grid lines */}
      {[3, 5, 7, 9].map(v => {
        const y = H - ((v - 1) / 9) * H;
        return <line key={v} x1={0} x2={W} y1={y} y2={y} stroke="#E4E4E7" strokeWidth={0.5} />;
      })}
      {/* Line */}
      <motion.path
        d={path}
        fill="none" stroke="#D97757" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1 }}
      />
      {/* Dots */}
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={3} fill="#D97757" />
      ))}
    </svg>
  );
}

// ── Quick-link card ────────────────────────────────────────────────────────────

function QuickCard({
  href, icon: Icon, label, sublabel, color,
}: {
  href: string; icon: React.ElementType; label: string; sublabel: string; color: string;
}) {
  return (
    <Link
      href={href}
      className="group bg-white border border-[#E4E4E7] rounded-2xl p-5 hover:shadow-sm transition-all hover:border-[#27272A]"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: color + '18' }}>
          <Icon className="w-5 h-5" style={{ color }} strokeWidth={1.5} />
        </div>
        <ArrowRight className="w-4 h-4 text-[#A1A1AA] group-hover:text-[#27272A] group-hover:translate-x-0.5 transition-all" />
      </div>
      <p className="font-medium text-[#27272A] text-sm">{label}</p>
      <p className="text-[11px] text-[#A1A1AA] mt-0.5">{sublabel}</p>
    </Link>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/journal');
        if (res.ok) {
          const data = await res.json();
          const live = (data.entries ?? []) as JournalEntry[];
          if (live.length > 0) {
            setEntries(live);
          } else {
            setEntries(DEMO_ENTRIES);
            setIsDemo(true);
          }
        } else {
          setEntries(DEMO_ENTRIES);
          setIsDemo(true);
        }
      } catch {
        setEntries(DEMO_ENTRIES);
        setIsDemo(true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const moods = entries.map(e => e.mood);
  const avgMood = parseFloat(avg(moods).toFixed(1));
  const stress = stressLevel(avgMood);
  const trend = moods.length >= 2
    ? moods[0] > moods[moods.length - 1] ? 'up' : moods[0] < moods[moods.length - 1] ? 'down' : 'flat'
    : 'flat';
  const triggers = topTriggers(entries);
  const strategies = topStrategies(entries);

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? '#22C55E' : trend === 'down' ? '#EF4444' : '#A1A1AA';

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-8 animate-pulse">
        <div className="h-9 w-40 bg-[#E4E4E7] rounded-lg mb-2" />
        <div className="h-4 w-64 bg-[#F4F4F5] rounded mb-10" />
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[0, 1, 2].map(i => <div key={i} className="h-28 bg-white border border-[#E4E4E7] rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[0, 1, 2, 3].map(i => <div key={i} className="h-20 bg-white border border-[#E4E4E7] rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-serif text-[#27272A]">Dashboard</h1>
        <p className="text-[#71717A] text-sm mt-1">Your well-being snapshot · updated from journal entries</p>
      </div>

      {/* Demo notice */}
      {isDemo && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 bg-[#FFFBF7] border border-[#F0E4D7] rounded-2xl px-5 py-4"
        >
          <AlertCircle className="w-4 h-4 text-[#D97757] shrink-0 mt-0.5" strokeWidth={1.5} />
          <p className="text-sm text-[#71717A]">
            <span className="font-medium text-[#27272A]">Demo mode</span> — no journal entries yet.{' '}
            <Link href="/journal" className="text-[#D97757] hover:underline">Write your first entry →</Link>
          </p>
        </motion.div>
      )}

      {/* Key metrics */}
      <section aria-label="Key metrics">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Mood card */}
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}
            className="bg-white border border-[#E4E4E7] rounded-2xl p-5 shadow-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-[#A1A1AA]">Avg Mood · 7 days</p>
              <TrendIcon className="w-4 h-4" style={{ color: trendColor }} strokeWidth={2} />
            </div>
            <p className="font-serif text-4xl text-[#27272A] mb-1">{avgMood}<span className="text-xl text-[#A1A1AA]">/10</span></p>
            <MoodSparkline entries={entries} />
          </motion.div>

          {/* Stress level */}
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.07 }}
            className="bg-white border border-[#E4E4E7] rounded-2xl p-5 shadow-sm"
          >
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#A1A1AA] mb-4">Stress Level</p>
            <p className="font-serif text-4xl font-semibold mb-2" style={{ color: stress.color }}>
              {stress.label}
            </p>
            <div className="flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-[#A1A1AA]" strokeWidth={1.5} />
              <p className="text-xs text-[#A1A1AA]">Based on {entries.length} journal entries</p>
            </div>
          </motion.div>

          {/* Exam target */}
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}
            className="bg-white border border-[#E4E4E7] rounded-2xl p-5 shadow-sm"
          >
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#A1A1AA] mb-4">Exam Target</p>
            <p className="font-serif text-2xl text-[#27272A] font-semibold mb-2">JEE Advanced 2027</p>
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-violet-400" strokeWidth={1.5} />
              <p className="text-xs text-[#A1A1AA]">Context Engine active</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Triggers + Strategies */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Detected triggers */}
        <section aria-label="Detected stress triggers">
          <div className="bg-white border border-[#E4E4E7] rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-[#F4F4F5]">
              <h2 className="font-serif text-[#27272A] text-lg">Detected Triggers</h2>
              <p className="text-xs text-[#A1A1AA] mt-0.5">AI-extracted from journal entries</p>
            </div>
            {triggers.length === 0 ? (
              <p className="px-5 py-6 text-sm text-[#A1A1AA]">No triggers detected yet — write more journal entries.</p>
            ) : (
              <div className="divide-y divide-[#F4F4F5]">
                {triggers.map(({ name, count }, i) => {
                  const max = triggers[0].count;
                  return (
                    <div key={name} className="px-5 py-3 flex items-center gap-4">
                      <span className="text-sm text-[#3F3F46] flex-1">{name}</span>
                      <div className="w-24 h-1.5 bg-[#F4F4F5] rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(count / max) * 100}%` }}
                          transition={{ duration: 0.5, delay: i * 0.05 }}
                          className="h-full rounded-full bg-[#D97757]"
                        />
                      </div>
                      <span className="text-xs text-[#A1A1AA] w-12 text-right">{count} logs</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Active strategies */}
        <section aria-label="Active coping strategies">
          <div className="bg-white border border-[#E4E4E7] rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-[#F4F4F5]">
              <h2 className="font-serif text-[#27272A] text-lg">Coping Strategies</h2>
              <p className="text-xs text-[#A1A1AA] mt-0.5">Recommended across your entries</p>
            </div>
            {strategies.length === 0 ? (
              <p className="px-5 py-6 text-sm text-[#A1A1AA]">No strategies yet — the AI will suggest some after your first journal entry.</p>
            ) : (
              <div className="divide-y divide-[#F4F4F5]">
                {strategies.map((s, i) => (
                  <motion.div
                    key={s}
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-start gap-3 px-5 py-3.5"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-[#D97757] mt-2 shrink-0" />
                    <p className="text-sm text-[#3F3F46]">{s}</p>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Quick links */}
      <section aria-label="Quick navigation">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-[#A1A1AA] mb-4">Quick Access</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <QuickCard href="/journal"      icon={BookOpen}       label="Journal"      sublabel="Log mood & reflect"         color="#D97757" />
          <QuickCard href="/companion"    icon={MessageSquare}  label="Companion"    sublabel="Talk to the Hive"           color="#7C3AED" />
          <QuickCard href="/calendar"     icon={Calendar}       label="Calendar"     sublabel="Schedule study blocks"      color="#1D4ED8" />
          <QuickCard href="/syllabus"     icon={Brain}          label="Syllabus"     sublabel="AI-organised topic tree"    color="#0F766E" />
        </div>
      </section>
    </div>
  );
}
