"use client";

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  ChevronRight, ChevronDown, BookOpen, Layers,
  Lightbulb, Minus, Upload, Sparkles, RefreshCw, Trash2,
  Clock, CheckCircle2, Copy, Check, BookMarked, Cloud, CloudOff,
  Calendar, ArrowRight, X, CalendarCheck, GraduationCap,
  Zap, Target, FileText, BarChart3,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface SyllabusNode {
  id: string;
  name: string;
  type: 'subject' | 'unit' | 'chapter' | 'topic' | 'subtopic';
  description?: string;
  weight?: 'high' | 'medium' | 'low';
  difficulty?: 'easy' | 'medium' | 'hard';
  estimatedHours?: number;
  children?: SyllabusNode[];
}

// ── Safe icon/color helpers ───────────────────────────────────────────────────

const VALID_TYPES = new Set(['subject', 'unit', 'chapter', 'topic', 'subtopic'] as const);

const ICON_MAP: Record<string, React.ElementType> = {
  subject: BookMarked, unit: Layers, chapter: BookOpen,
  topic: Lightbulb, subtopic: Minus,
  module: Layers, section: BookOpen, lesson: Lightbulb,
};
const icon = (t: string) => ICON_MAP[t] ?? Minus;

// Rotating palette for subjects — each subject gets a distinct color
const SUBJECT_PALETTE = [
  { text: '#B45309', bg: '#FFF7ED', border: '#FDE68A', accent: '#F59E0B' },
  { text: '#6D28D9', bg: '#F5F3FF', border: '#DDD6FE', accent: '#8B5CF6' },
  { text: '#0369A1', bg: '#EFF6FF', border: '#BAE6FD', accent: '#0EA5E9' },
  { text: '#047857', bg: '#ECFDF5', border: '#A7F3D0', accent: '#10B981' },
  { text: '#BE185D', bg: '#FDF2F8', border: '#FBCFE8', accent: '#EC4899' },
  { text: '#9A3412', bg: '#FFF7ED', border: '#FDBA74', accent: '#F97316' },
];

const TYPE_STYLE: Record<string, { text: string; bg: string }> = {
  unit:     { text: '#6D28D9', bg: '#F5F3FF' },
  chapter:  { text: '#0369A1', bg: '#EFF6FF' },
  topic:    { text: '#047857', bg: '#ECFDF5' },
  subtopic: { text: '#71717A', bg: 'transparent' },
};

const WEIGHT_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  high:   { label: 'High',   color: '#DC2626', bg: '#FEF2F2' },
  medium: { label: 'Medium', color: '#D97706', bg: '#FFFBEB' },
  low:    { label: 'Low',    color: '#16A34A', bg: '#F0FDF4' },
};

const DIFF_DOT: Record<string, string> = {
  easy: '#22C55E', medium: '#F59E0B', hard: '#EF4444',
};

// ── Sanitisation ──────────────────────────────────────────────────────────────

let _seq = 0;
function sanitize(n: any, depth = 0): SyllabusNode {
  const type = VALID_TYPES.has(n.type) ? n.type as SyllabusNode['type']
    : depth === 0 ? 'subject' : depth === 1 ? 'unit' : depth === 2 ? 'chapter' : 'topic';
  // Subjects are containers — don't show weight/difficulty on them
  const isContainer = type === 'subject';
  return {
    id:             n.id && typeof n.id === 'string' ? n.id : `n-${++_seq}`,
    name:           n.name ?? 'Untitled',
    type,
    description:    typeof n.description === 'string' ? n.description : undefined,
    weight:         !isContainer && ['high','medium','low'].includes(n.weight) ? n.weight : undefined,
    difficulty:     !isContainer && ['easy','medium','hard'].includes(n.difficulty) ? n.difficulty : undefined,
    estimatedHours: typeof n.estimatedHours === 'number' && n.estimatedHours > 0 ? n.estimatedHours : undefined,
    children:       Array.isArray(n.children) && n.children.length
      ? n.children.map((c: any) => sanitize(c, depth + 1)) : undefined,
  };
}
function sanitizeTree(raw: any[]): SyllabusNode[] {
  _seq = 0;
  const seen = new Set<string>();
  function dedup(nodes: SyllabusNode[]): SyllabusNode[] {
    return nodes.map(n => {
      if (seen.has(n.id)) n = { ...n, id: `n-${++_seq}` };
      seen.add(n.id);
      return { ...n, children: n.children ? dedup(n.children) : undefined };
    });
  }
  return dedup(raw.map(n => sanitize(n, 0)));
}

// ── Persistence ───────────────────────────────────────────────────────────────

const LS = 'mindspace_syllabus_v1';
const lsLoad = (): { tree: SyllabusNode[]; raw: string } | null => {
  if (typeof window === 'undefined') return null;
  try { return JSON.parse(localStorage.getItem(LS) ?? 'null'); } catch { return null; }
};
const lsSave = (tree: SyllabusNode[], raw: string) => {
  try { localStorage.setItem(LS, JSON.stringify({ tree, raw })); } catch {}
};
const lsClear = () => { try { localStorage.removeItem(LS); } catch {} };

// ── Tree math ─────────────────────────────────────────────────────────────────

function sumHours(nodes: SyllabusNode[]): number {
  return nodes.reduce((a, n) => a + (n.estimatedHours ?? 0) + (n.children ? sumHours(n.children) : 0), 0);
}
function countNodes(nodes: SyllabusNode[], type?: string): number {
  return nodes.reduce((a, n) => {
    const match = !type || n.type === type ? 1 : 0;
    return a + match + (n.children ? countNodes(n.children, type) : 0);
  }, 0);
}

// ── Tree Node ─────────────────────────────────────────────────────────────────

function TreeNode({
  node, depth = 0, defaultOpen, subjectIdx = 0,
}: {
  node: SyllabusNode;
  depth?: number;
  defaultOpen?: boolean;
  subjectIdx?: number;
}) {
  const [open, setOpen] = useState(defaultOpen ?? depth < 2);
  const hasKids = !!node.children?.length;
  const Icon = icon(node.type);
  const palette = SUBJECT_PALETTE[subjectIdx % SUBJECT_PALETTE.length];

  const isSubject = node.type === 'subject';
  const style = isSubject
    ? { text: palette.text, bg: palette.bg, iconBg: palette.bg, border: palette.border }
    : {
        text: TYPE_STYLE[node.type]?.text ?? '#52525B',
        bg: 'transparent',
        iconBg: TYPE_STYLE[node.type]?.bg ?? '#F4F4F5',
        border: 'transparent',
      };

  if (isSubject) {
    // Subject-level: render as a card header
    return (
      <div className="mb-4">
        <button
          onClick={() => hasKids && setOpen(o => !o)}
          className="w-full text-left"
        >
          <div
            className="flex items-center gap-3 px-5 py-4 rounded-2xl border transition-all hover:shadow-sm"
            style={{ backgroundColor: style.bg, borderColor: style.border }}
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: palette.accent + '18' }}
            >
              <Icon className="w-4.5 h-4.5" style={{ color: palette.accent }} strokeWidth={1.5} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-[15px]" style={{ color: style.text }}>{node.name}</p>
              {node.description && (
                <p className="text-xs mt-0.5 opacity-60" style={{ color: style.text }}>{node.description}</p>
              )}
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {node.estimatedHours && node.estimatedHours > 0 && (
                <span className="text-xs font-medium flex items-center gap-1 opacity-60" style={{ color: style.text }}>
                  <Clock className="w-3 h-3" />{node.estimatedHours}h
                </span>
              )}
              {hasKids && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: palette.accent + '15', color: palette.accent }}>
                  {node.children!.length}
                </span>
              )}
              {hasKids && (
                <motion.span animate={{ rotate: open ? 90 : 0 }} transition={{ duration: 0.15 }}>
                  <ChevronRight className="w-4 h-4 opacity-40" style={{ color: style.text }} />
                </motion.span>
              )}
            </div>
          </div>
        </button>

        <AnimatePresence initial={false}>
          {open && hasKids && (
            <motion.div
              initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="ml-5 pl-4 border-l-2 mt-1 space-y-0.5" style={{ borderColor: palette.border }}>
                {node.children!.map(child => (
                  <TreeNode key={child.id} node={child} depth={depth + 1} defaultOpen={depth < 1} subjectIdx={subjectIdx} />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Non-subject nodes
  return (
    <div>
      <button
        onClick={() => hasKids && setOpen(o => !o)}
        className="w-full text-left group"
      >
        <div className={`flex items-center gap-2.5 py-2 px-3 rounded-xl transition-colors ${hasKids ? 'hover:bg-[#FAFAFA] cursor-pointer' : 'cursor-default'}`}>
          {hasKids && (
            <motion.span animate={{ rotate: open ? 90 : 0 }} transition={{ duration: 0.12 }} className="shrink-0">
              <ChevronRight className="w-3 h-3 text-[#C4C4C7]" />
            </motion.span>
          )}
          {!hasKids && <span className="w-3 shrink-0" />}

          <span
            className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
            style={{ backgroundColor: style.iconBg }}
          >
            <Icon className="w-3 h-3" style={{ color: style.text }} strokeWidth={1.5} />
          </span>

          <span className={`flex-1 min-w-0 truncate ${
            node.type === 'unit' ? 'text-sm font-semibold text-[#27272A]' :
            node.type === 'chapter' ? 'text-[13px] font-medium text-[#3F3F46]' :
            'text-[13px] text-[#52525B]'
          }`}>
            {node.name}
          </span>

          {/* Badges — weight on unit/chapter only, hours on anything with value */}
          <div className="flex items-center gap-1.5 shrink-0">
            {node.weight && (node.type === 'unit' || node.type === 'chapter') && WEIGHT_BADGE[node.weight] && (
              <span
                className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-px rounded"
                style={{ color: WEIGHT_BADGE[node.weight].color, backgroundColor: WEIGHT_BADGE[node.weight].bg }}
              >
                {WEIGHT_BADGE[node.weight].label}
              </span>
            )}
            {node.difficulty && DIFF_DOT[node.difficulty] && (
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: DIFF_DOT[node.difficulty] }} />
            )}
            {node.estimatedHours && node.estimatedHours > 0 && (
              <span className="text-[10px] text-[#A1A1AA] tabular-nums">{node.estimatedHours}h</span>
            )}
            {hasKids && (
              <span className="text-[9px] text-[#C4C4C7] bg-[#F4F4F5] px-1.5 py-px rounded-full">{node.children!.length}</span>
            )}
          </div>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && hasKids && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.15, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="ml-[22px] pl-3 border-l border-[#EBEBEB] space-y-px">
              {node.children!.map(child => (
                <TreeNode key={child.id} node={child} depth={depth + 1} defaultOpen={depth < 1} subjectIdx={subjectIdx} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Schedule Modal ────────────────────────────────────────────────────────────

interface ScheduleResult { total: number; persisted: number }

function ScheduleModal({ tree, onClose }: { tree: SyllabusNode[]; onClose: () => void }) {
  const today    = new Date().toISOString().split('T')[0];
  const in3Month = new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0];

  const [startDate,   setStartDate]   = useState(today);
  const [examDate,    setExamDate]    = useState(in3Month);
  const [hoursPerDay, setHoursPerDay] = useState(4);
  const [startTime,   setStartTime]   = useState('09:00');
  const [sunOff,      setSunOff]      = useState(true);
  const [satOff,      setSatOff]      = useState(false);
  const [scheduling,  setScheduling]  = useState(false);
  const [result,      setResult]      = useState<ScheduleResult | null>(null);
  const [err,         setErr]         = useState('');

  const go = async () => {
    setScheduling(true); setErr('');
    const daysOff: number[] = [];
    if (sunOff) daysOff.push(0);
    if (satOff) daysOff.push(6);
    try {
      const r = await fetch('/api/syllabus/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tree, startDate, examDate, hoursPerDay, startTime, daysOff }),
      });
      const d = await r.json();
      if (!r.ok) { setErr(d.error ?? 'Failed'); return; }
      setResult({ total: d.total, persisted: d.persisted });
    } catch (e: any) { setErr(e.message); }
    finally { setScheduling(false); }
  };

  const inp = "w-full bg-white border border-[#E4E4E7] rounded-xl px-3 py-2.5 text-sm text-[#27272A] focus:outline-none focus:border-[#27272A] transition-colors";

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/25 backdrop-blur-sm z-40" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 24, scale: 0.97 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="fixed bottom-0 left-0 right-0 sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:max-w-md w-full bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl z-50 overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#F4F4F5]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-blue-600" strokeWidth={1.5} />
            </div>
            <div>
              <p className="font-semibold text-[#27272A]">Schedule on Calendar</p>
              <p className="text-[11px] text-[#A1A1AA]">AI sequences topics across your study days</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-[#F4F4F5] flex items-center justify-center transition-colors">
            <X className="w-4 h-4 text-[#71717A]" />
          </button>
        </div>

        {result ? (
          <div className="px-6 py-10 text-center">
            <div className="w-16 h-16 rounded-3xl bg-green-50 flex items-center justify-center mx-auto mb-5">
              <CalendarCheck className="w-8 h-8 text-green-600" strokeWidth={1.5} />
            </div>
            <p className="font-serif text-2xl text-[#27272A] mb-1">{result.total} sessions scheduled</p>
            <p className="text-sm text-[#71717A] mb-8">
              {result.persisted > 0 ? `All events saved to your calendar` : 'Events created locally'}
            </p>
            <Link href="/calendar" onClick={onClose}
              className="inline-flex items-center gap-2 bg-[#27272A] text-white text-sm font-medium px-6 py-3 rounded-2xl hover:bg-[#3F3F46] transition-colors">
              View Calendar <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="px-6 py-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#A1A1AA] mb-1.5">Start date</label>
                <input type="date" value={startDate} min={today} onChange={e => setStartDate(e.target.value)} className={inp} />
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#A1A1AA] mb-1.5">Exam / deadline</label>
                <input type="date" value={examDate} min={startDate} onChange={e => setExamDate(e.target.value)} className={inp} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#A1A1AA] mb-1.5">Hours per day</label>
                <div className="flex items-center gap-3">
                  <input type="range" min={1} max={10} value={hoursPerDay} onChange={e => setHoursPerDay(Number(e.target.value))} className="flex-1 accent-[#27272A]" />
                  <span className="text-sm font-semibold text-[#27272A] w-8 text-right tabular-nums">{hoursPerDay}h</span>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#A1A1AA] mb-1.5">Start time</label>
                <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className={inp} />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#A1A1AA] mb-1.5">Days off</label>
              <div className="flex gap-2">
                {[
                  { l: 'Sun', v: sunOff, s: setSunOff },
                  { l: 'Sat', v: satOff, s: setSatOff },
                ].map(({ l, v, s }) => (
                  <button key={l} onClick={() => s((x: boolean) => !x)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      v ? 'bg-[#27272A] text-white border-[#27272A] shadow-sm' : 'bg-white text-[#71717A] border-[#E4E4E7] hover:border-[#27272A]'
                    }`}>{l}</button>
                ))}
              </div>
            </div>
            {err && <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-xl px-3 py-2">⚠ {err}</p>}
            <button onClick={go} disabled={scheduling || !startDate || !examDate || startDate >= examDate}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-[#27272A] text-white text-sm font-medium hover:bg-[#3F3F46] transition-colors disabled:opacity-40">
              {scheduling ? <><RefreshCw className="w-4 h-4 animate-spin" />Sequencing…</> : <><Calendar className="w-4 h-4" />Create Study Schedule</>}
            </button>
          </div>
        )}
      </motion.div>
    </>
  );
}

// ── Demo ──────────────────────────────────────────────────────────────────────

const DEMO_SYLLABUS = `Physics - JEE Advanced 2027
Unit 1: Mechanics
  Chapter 1: Kinematics - Motion in 1D, Projectile, Circular Motion
  Chapter 2: Laws of Motion - Newton's Laws, Friction, Pulleys
  Chapter 3: Work Energy Theorem, Conservation Laws
Unit 2: Thermodynamics
  Chapter 4: Kinetic Theory of Gases
  Chapter 5: Thermodynamic Processes - Carnot Cycle, Entropy

Mathematics - JEE Advanced 2027
Unit 1: Calculus
  Limits, Continuity, Differentiability
  Integration - Indefinite, Definite, Applications
  Differential Equations
Unit 2: Algebra
  Complex Numbers, Matrices & Determinants
  Permutation, Combination, Binomial Theorem`;

// ── Page ──────────────────────────────────────────────────────────────────────

type Sync = 'idle' | 'saving' | 'saved' | 'error';

export default function SyllabusPage() {
  const [raw,          setRaw]          = useState('');
  const [tree,         setTree]         = useState<SyllabusNode[]>([]);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');
  const [copied,       setCopied]       = useState(false);
  const [treeKey,      setTreeKey]      = useState(0);
  const [sync,         setSync]         = useState<Sync>('idle');
  const [showSchedule, setShowSchedule] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // ── Load on mount ──────────────────────────────────────────────────────────
  useEffect(() => {
    const ls = lsLoad();
    if (ls?.tree?.length) { setTree(sanitizeTree(ls.tree)); setRaw(ls.raw ?? ''); }

    fetch('/api/syllabus').then(r => r.json()).then(d => {
      if (d?.tree?.length) {
        const t = sanitizeTree(d.tree);
        setTree(t); setRaw(d.raw ?? ''); lsSave(t, d.raw ?? '');
      }
    }).catch(() => {});
  }, []);

  // ── DB sync (debounced) ────────────────────────────────────────────────────
  const dbSave = useCallback((t: SyllabusNode[], r: string) => {
    clearTimeout(timer.current); setSync('saving');
    timer.current = setTimeout(async () => {
      try {
        await fetch('/api/syllabus', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tree: t, raw: r }) });
        setSync('saved'); setTimeout(() => setSync('idle'), 3000);
      } catch { setSync('error'); }
    }, 800);
  }, []);

  // ── Parse ──────────────────────────────────────────────────────────────────
  const parse = useCallback(async (text: string) => {
    const input = text.trim();
    if (!input) { setError('Paste your syllabus above first.'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/syllabus', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: input }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error ?? 'Something went wrong'); return; }
      const clean = sanitizeTree(Array.isArray(d.tree) ? d.tree : []);
      setTree(clean); lsSave(clean, input); dbSave(clean, input); setTreeKey(k => k + 1);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [dbSave]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => { const t = ev.target?.result as string; setRaw(t); parse(t); };
    reader.readAsText(file);
  }, [parse]);

  const clear = () => {
    setTree([]); setRaw(''); lsClear();
    fetch('/api/syllabus', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tree: [], raw: '' }) }).catch(() => {});
  };

  const copyJSON = async () => {
    await navigator.clipboard.writeText(JSON.stringify(tree, null, 2));
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const hasTree = tree.length > 0;
  const totalHours = hasTree ? sumHours(tree) : 0;
  const totalTopics = hasTree ? countNodes(tree, 'topic') + countNodes(tree, 'chapter') : 0;

  return (
    <div className="max-w-6xl mx-auto py-8">
      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-[#D97757]" strokeWidth={1.5} />
            </div>
            <h1 className="font-serif text-3xl text-[#27272A]">Syllabus Organizer</h1>
          </div>
          <p className="text-[#A1A1AA] text-sm ml-[52px]">Paste raw text → AI builds an interactive study tree</p>
        </div>
        <div className="flex items-center gap-2">
          {sync !== 'idle' && (
            <span className="flex items-center gap-1.5 text-[11px] text-[#A1A1AA] mr-1">
              {sync === 'saving' && <><RefreshCw className="w-3 h-3 animate-spin" />Saving…</>}
              {sync === 'saved'  && <><Cloud className="w-3 h-3 text-green-500" />Synced</>}
              {sync === 'error'  && <><CloudOff className="w-3 h-3 text-amber-500" />Local</>}
            </span>
          )}
          {hasTree && (
            <>
              <button onClick={copyJSON}
                className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl border border-[#E4E4E7] text-[#71717A] hover:border-[#27272A] hover:text-[#27272A] transition-colors">
                {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied!' : 'Export'}
              </button>
              <button onClick={clear}
                className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl border border-[#E4E4E7] text-[#71717A] hover:border-red-200 hover:text-red-500 transition-colors">
                <Trash2 className="w-3.5 h-3.5" /> Clear
              </button>
            </>
          )}
        </div>
      </div>

      <div className={`grid gap-8 ${hasTree ? 'grid-cols-1 lg:grid-cols-[380px_1fr]' : 'grid-cols-1 max-w-2xl mx-auto'}`}>
        {/* ── Left: Input ── */}
        <div className="space-y-4">
          <div onDrop={handleDrop} onDragOver={e => e.preventDefault()} className="relative group">
            <textarea
              value={raw}
              onChange={e => setRaw(e.target.value)}
              placeholder={`Paste your syllabus here…\n\nExample:\nPhysics - JEE Advanced\n  Unit 1: Mechanics\n    Kinematics, Laws of Motion\n  Unit 2: Thermodynamics\n    Kinetic Theory, Carnot Cycle`}
              className="w-full h-64 text-sm text-[#27272A] placeholder:text-[#D4D4D8] bg-white border border-[#E4E4E7] rounded-2xl px-4 py-4 resize-none focus:outline-none focus:border-[#27272A] focus:shadow-sm transition-all leading-relaxed font-mono"
            />
            <div className="absolute bottom-3 right-3 flex items-center gap-1.5 text-[#D4D4D8] text-[10px] pointer-events-none">
              <Upload className="w-3 h-3" /> or drag a file
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => parse(raw)}
              disabled={loading || !raw.trim()}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-[#27272A] text-white text-sm font-medium hover:bg-[#3F3F46] transition-colors disabled:opacity-40"
            >
              {loading
                ? <><RefreshCw className="w-4 h-4 animate-spin" />Analysing…</>
                : <><Sparkles className="w-4 h-4" />Organise with AI</>}
            </button>
            <button
              onClick={() => { setRaw(DEMO_SYLLABUS); parse(DEMO_SYLLABUS); }}
              className="px-4 py-3 rounded-2xl border border-[#E4E4E7] text-[#71717A] text-sm hover:border-[#27272A] hover:text-[#27272A] transition-colors"
            >
              Try demo
            </button>
          </div>

          {error && (
            <div className="flex gap-2 items-start text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              ⚠ {error}
            </div>
          )}

          {/* Empty-state tips */}
          {!hasTree && !loading && (
            <div className="space-y-3 mt-4">
              {[
                { icon: FileText, text: 'Paste from PDF, website, or study guide', color: '#D97757' },
                { icon: Zap,      text: 'AI detects structure — no formatting needed', color: '#7C3AED' },
                { icon: Target,   text: 'High-weight exam topics flagged automatically', color: '#0EA5E9' },
                { icon: BarChart3, text: 'Study hours estimated per topic', color: '#10B981' },
              ].map(({ icon: Ic, text, color }) => (
                <div key={text} className="flex items-center gap-3 px-4 py-3 bg-white border border-[#F4F4F5] rounded-xl">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: color + '10' }}>
                    <Ic className="w-3.5 h-3.5" style={{ color }} strokeWidth={1.5} />
                  </div>
                  <p className="text-[13px] text-[#52525B]">{text}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Right: Tree ── */}
        {hasTree && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}>
            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[
                { label: 'Subjects',   value: tree.length,  icon: BookMarked, gradient: 'from-amber-500/10 to-orange-500/10', color: '#D97757' },
                { label: 'Topics',     value: totalTopics,  icon: Lightbulb,  gradient: 'from-violet-500/10 to-purple-500/10', color: '#7C3AED' },
                { label: 'Est. hours', value: `${totalHours}h`, icon: Clock,  gradient: 'from-teal-500/10 to-emerald-500/10', color: '#0F766E' },
              ].map(s => (
                <div key={s.label} className="bg-white border border-[#F0F0F0] rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                  <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${s.gradient} flex items-center justify-center mb-3`}>
                    <s.icon className="w-4 h-4" style={{ color: s.color }} strokeWidth={1.5} />
                  </div>
                  <p className="font-serif text-2xl font-semibold text-[#27272A] tabular-nums">{s.value}</p>
                  <p className="text-[11px] text-[#A1A1AA] mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Tree container */}
            <div key={treeKey} className="bg-white border border-[#F0F0F0] rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
              {/* Tree header */}
              <div className="border-b border-[#F4F4F5] px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <p className="text-xs font-semibold uppercase tracking-widest text-[#A1A1AA]">Content Tree</p>
                  <div className="flex items-center gap-2">
                    {(['subject', 'unit', 'chapter', 'topic'] as const).map(t => {
                      const Ic = icon(t);
                      const color = t === 'subject' ? '#D97757' : t === 'unit' ? '#7C3AED' : t === 'chapter' ? '#0369A1' : '#047857';
                      return (
                        <span key={t} className="flex items-center gap-1 text-[10px] text-[#A1A1AA]">
                          <Ic className="w-2.5 h-2.5" style={{ color }} strokeWidth={1.5} />
                          <span className="capitalize hidden sm:inline">{t}</span>
                        </span>
                      );
                    })}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5 text-[9px] text-[#C4C4C7]">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400" />H
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />M
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400" />L
                  </span>
                </div>
              </div>

              {/* Tree body */}
              <div className="p-4 space-y-1">
                {tree.map((node, i) => (
                  <TreeNode key={node.id} node={node} depth={0} defaultOpen={true} subjectIdx={i} />
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div className="mt-5 space-y-2">
              <button
                onClick={() => setShowSchedule(true)}
                className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl bg-gradient-to-r from-[#1D4ED8] to-[#7C3AED] text-white text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm"
              >
                <Calendar className="w-4 h-4" />
                Schedule across Calendar
                <ArrowRight className="w-4 h-4 opacity-60" />
              </button>
              <button
                onClick={() => parse(raw)}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-[#E4E4E7] text-sm text-[#71717A] hover:border-[#27272A] hover:text-[#27272A] transition-colors disabled:opacity-40"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                Re-analyse
              </button>
            </div>
          </motion.div>
        )}

        {/* Loading skeleton */}
        {loading && !hasTree && (
          <div className="animate-pulse space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {[0, 1, 2].map(i => (
                <div key={i} className="bg-white border border-[#F0F0F0] rounded-2xl p-4 h-24">
                  <div className="w-8 h-8 bg-[#F4F4F5] rounded-xl mb-3" />
                  <div className="h-6 w-12 bg-[#F4F4F5] rounded mb-1" />
                  <div className="h-3 w-16 bg-[#F4F4F5] rounded" />
                </div>
              ))}
            </div>
            <div className="bg-white border border-[#F0F0F0] rounded-2xl p-5 space-y-4">
              {[0.8, 1, 0.6, 0.9, 0.5, 0.7, 0.85].map((w, i) => (
                <div key={i} className="flex items-center gap-3" style={{ paddingLeft: `${(i % 3) * 24}px` }}>
                  <div className="w-6 h-6 bg-[#F4F4F5] rounded-lg shrink-0" />
                  <div className="h-4 bg-[#F4F4F5] rounded-lg" style={{ width: `${w * 100}%` }} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Schedule modal */}
      <AnimatePresence>
        {showSchedule && <ScheduleModal tree={tree} onClose={() => setShowSchedule(false)} />}
      </AnimatePresence>
    </div>
  );
}
