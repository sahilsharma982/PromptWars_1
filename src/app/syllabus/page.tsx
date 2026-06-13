"use client";

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  ChevronRight, ChevronDown, BookOpen, Layers,
  Lightbulb, Minus, Upload, Sparkles, RefreshCw, Trash2,
  Clock, CheckCircle2, Copy, Check, BookMarked, Cloud, CloudOff,
  Calendar, ArrowRight, X, CalendarCheck,
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

// ── Style maps ────────────────────────────────────────────────────────────────

// ── Style maps (with safe fallback for unknown AI-generated types) ────────────

const VALID_TYPES = new Set(['subject', 'unit', 'chapter', 'topic', 'subtopic'] as const);

const TYPE_ICON_MAP: Record<string, React.ElementType> = {
  subject:  BookMarked,
  unit:     Layers,
  chapter:  BookOpen,
  topic:    Lightbulb,
  subtopic: Minus,
  // common AI aliases
  module:   Layers,
  section:  BookOpen,
  lesson:   Lightbulb,
};
function getNodeIcon(type: string): React.ElementType {
  return TYPE_ICON_MAP[type] ?? Minus;
}

const TYPE_COLOR: Record<string, string> = {
  subject:  '#D97757', unit: '#7C3AED', chapter: '#1D4ED8',
  topic:    '#0F766E', subtopic: '#71717A',
};
function getNodeColor(type: string): string {
  return TYPE_COLOR[type] ?? '#A1A1AA';
}

const TYPE_BG: Record<string, string> = {
  subject:  '#FFF7ED', unit: '#F5F3FF', chapter: '#EFF6FF',
  topic:    '#F0FDFA', subtopic: 'transparent',
};
function getNodeBg(type: string): string {
  return TYPE_BG[type] ?? 'transparent';
}

const WEIGHT_CONFIG = {
  high:   { color: '#EF4444', bg: '#FEF2F2', label: '★ High'  },
  medium: { color: '#F59E0B', bg: '#FFFBEB', label: '◆ Med'   },
  low:    { color: '#22C55E', bg: '#F0FDF4', label: '◇ Low'   },
};
const DIFF_CONFIG = {
  easy:   { color: '#22C55E', label: 'Easy'   },
  medium: { color: '#F59E0B', label: 'Medium' },
  hard:   { color: '#EF4444', label: 'Hard'   },
};


// ── localStorage helpers (L1 cache — instant restore) ────────────────────────

const LS_KEY = 'mindspace_syllabus_v1';
function lsLoad(): { tree: SyllabusNode[]; raw: string } | null {
  if (typeof window === 'undefined') return null;
  try { return JSON.parse(localStorage.getItem(LS_KEY) ?? 'null'); } catch { return null; }
}
function lsSave(tree: SyllabusNode[], raw: string) {
  try { localStorage.setItem(LS_KEY, JSON.stringify({ tree, raw })); } catch {}
}
function lsClear() { try { localStorage.removeItem(LS_KEY); } catch {} }

// ── Sanitize tree from AI (normalise types, ensure unique IDs) ────────────────

let _idSeq = 0;
function sanitizeNode(n: any, depth = 0): SyllabusNode {
  const type = VALID_TYPES.has(n.type) ? n.type as SyllabusNode['type'] :
    depth === 0 ? 'subject' :
    depth === 1 ? 'unit' :
    depth === 2 ? 'chapter' : 'topic';

  return {
    id:            n.id && typeof n.id === 'string' ? n.id : `node-${++_idSeq}`,
    name:          n.name ?? 'Untitled',
    type,
    description:   n.description,
    weight:        ['high','medium','low'].includes(n.weight)         ? n.weight    : undefined,
    difficulty:    ['easy','medium','hard'].includes(n.difficulty)    ? n.difficulty : undefined,
    estimatedHours: typeof n.estimatedHours === 'number' ? n.estimatedHours : undefined,
    children:      Array.isArray(n.children) && n.children.length
      ? n.children.map((c: any) => sanitizeNode(c, depth + 1))
      : undefined,
  };
}
function sanitizeTree(raw: any[]): SyllabusNode[] {
  _idSeq = 0;
  // De-duplicate IDs by regenerating them if any clash
  const seen = new Set<string>();
  function dedup(nodes: SyllabusNode[]): SyllabusNode[] {
    return nodes.map(n => {
      if (seen.has(n.id)) n = { ...n, id: `node-${++_idSeq}` };
      seen.add(n.id);
      return { ...n, children: n.children ? dedup(n.children) : undefined };
    });
  }
  return dedup(raw.map(n => sanitizeNode(n, 0)));
}

// ── Tree helpers ──────────────────────────────────────────────────────────────

function sumHours(nodes: SyllabusNode[]): number {
  return nodes.reduce((a, n) => a + (n.estimatedHours ?? 0) + (n.children ? sumHours(n.children) : 0), 0);
}
function countLeaves(nodes: SyllabusNode[]): number {
  return nodes.reduce((a, n) => a + (!n.children?.length ? 1 : countLeaves(n.children!)), 0);
}


// ── Tree node component ────────────────────────────────────────────────────────

function TreeNode({ node, depth = 0, defaultOpen }: {
  node: SyllabusNode;
  depth?: number;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen ?? depth < 2);
  const hasChildren = !!node.children?.length;
  const Icon = getNodeIcon(node.type);
  const color = getNodeColor(node.type);
  const bg    = getNodeBg(node.type);

  return (
    <div>
      <button
        onClick={() => hasChildren && setOpen(o => !o)}
        className="w-full text-left"
        style={{ paddingLeft: `${depth * 20 + 12}px` }}
      >
        <div className={`flex items-start gap-3 py-2.5 pr-4 rounded-xl transition-colors ${hasChildren ? 'hover:bg-[#F9F9F9]' : ''}`}>
          <span className="shrink-0 mt-1 w-4">
            {hasChildren
              ? open
                ? <ChevronDown className="w-3.5 h-3.5 text-[#A1A1AA]" />
                : <ChevronRight className="w-3.5 h-3.5 text-[#A1A1AA]" />
              : null}
          </span>

          <span
            className="w-7 h-7 shrink-0 rounded-lg flex items-center justify-center mt-0.5"
            style={{ backgroundColor: bg !== 'transparent' ? bg : undefined }}
          >
            <Icon className="w-3.5 h-3.5" style={{ color }} strokeWidth={1.5} />
          </span>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`font-medium leading-snug ${
                node.type === 'subject' ? 'text-base text-[#27272A]' :
                node.type === 'unit'    ? 'text-[15px] text-[#27272A]' :
                node.type === 'chapter' ? 'text-sm text-[#3F3F46]' :
                                          'text-sm text-[#52525B]'
              }`}>{node.name}</span>

              {node.weight && node.type !== 'subtopic' && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ color: WEIGHT_CONFIG[node.weight].color, backgroundColor: WEIGHT_CONFIG[node.weight].bg }}>
                  {WEIGHT_CONFIG[node.weight].label}
                </span>
              )}
              {node.difficulty && node.type !== 'subtopic' && (
                <span className="text-[10px] font-medium" style={{ color: DIFF_CONFIG[node.difficulty].color }}>
                  {DIFF_CONFIG[node.difficulty].label}
                </span>
              )}
              {node.estimatedHours && node.type !== 'subtopic' && (
                <span className="text-[10px] text-[#A1A1AA] flex items-center gap-0.5">
                  <Clock className="w-3 h-3" />{node.estimatedHours}h
                </span>
              )}
            </div>
            {node.description && (
              <p className="text-[12px] text-[#A1A1AA] mt-0.5 leading-relaxed">{node.description}</p>
            )}
          </div>

          {hasChildren && (
            <span className="shrink-0 text-[10px] text-[#A1A1AA] bg-[#F4F4F5] px-2 py-0.5 rounded-full mt-1">
              {node.children!.length}
            </span>
          )}
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && hasChildren && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="relative" style={{ paddingLeft: `${depth * 20 + 32}px` }}>
              <div className="absolute top-0 bottom-0 w-px bg-[#E4E4E7]" style={{ left: `${depth * 20 + 32}px` }} />
              {node.children!.map(child => (
                <TreeNode key={child.id} node={child} depth={depth + 1} defaultOpen={depth < 1} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Stats bar ─────────────────────────────────────────────────────────────────

function StatsBar({ tree }: { tree: SyllabusNode[] }) {
  const totalHours = sumHours(tree);
  const topics     = countLeaves(tree);
  return (
    <div className="grid grid-cols-3 gap-3 mb-6">
      {[
        { label: 'Subjects',    value: tree.length, icon: BookMarked, color: '#D97757' },
        { label: 'Total topics', value: topics,     icon: Lightbulb,  color: '#7C3AED' },
        { label: 'Est. hours',   value: `${totalHours}h`, icon: Clock, color: '#0F766E' },
      ].map(s => (
        <div key={s.label} className="bg-white border border-[#E4E4E7] rounded-2xl p-4 shadow-sm">
          <s.icon className="w-4 h-4 mb-2" style={{ color: s.color }} strokeWidth={1.5} />
          <p className="font-serif text-2xl font-semibold text-[#27272A]">{s.value}</p>
          <p className="text-[11px] text-[#A1A1AA] mt-0.5">{s.label}</p>
        </div>
      ))}
    </div>
  );
}

// ── Schedule modal ────────────────────────────────────────────────────────────

interface ScheduleResult { total: number; persisted: number; }

function ScheduleModal({
  tree, onClose,
}: {
  tree: SyllabusNode[];
  onClose: () => void;
}) {
  const today = new Date().toISOString().split('T')[0];
  const inYear = new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0];

  const [startDate,   setStartDate]   = useState(today);
  const [examDate,    setExamDate]    = useState(inYear);
  const [hoursPerDay, setHoursPerDay] = useState(4);
  const [startTime,   setStartTime]   = useState('09:00');
  const [sunOff,      setSunOff]      = useState(true);
  const [satOff,      setSatOff]      = useState(false);
  const [scheduling,  setScheduling]  = useState(false);
  const [result,      setResult]      = useState<ScheduleResult | null>(null);
  const [err,         setErr]         = useState('');

  const schedule = async () => {
    setScheduling(true);
    setErr('');
    const daysOff: number[] = [];
    if (sunOff) daysOff.push(0);
    if (satOff) daysOff.push(6);
    try {
      const res  = await fetch('/api/syllabus/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tree, startDate, examDate, hoursPerDay, startTime, daysOff }),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error ?? 'Something went wrong'); return; }
      setResult({ total: data.total, persisted: data.persisted });
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setScheduling(false);
    }
  };

  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div>
      <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#A1A1AA] mb-1.5">{label}</label>
      {children}
    </div>
  );

  const inputCls = "w-full bg-white border border-[#E4E4E7] rounded-xl px-3 py-2 text-sm text-[#27272A] focus:outline-none focus:border-[#27272A] transition-colors";

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <motion.div
        initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="fixed bottom-0 left-0 right-0 sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:max-w-md w-full bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl z-50 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#F4F4F5]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#EFF6FF] flex items-center justify-center">
              <Calendar className="w-4.5 h-4.5 text-[#1D4ED8]" strokeWidth={1.5} />
            </div>
            <div>
              <p className="font-semibold text-[#27272A] text-sm">Schedule on Calendar</p>
              <p className="text-[11px] text-[#A1A1AA]">AI will sequence topics across your study days</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-[#F4F4F5] flex items-center justify-center transition-colors">
            <X className="w-4 h-4 text-[#71717A]" />
          </button>
        </div>

        {result ? (
          /* Success state */
          <div className="px-6 py-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-green-50 flex items-center justify-center mx-auto mb-4">
              <CalendarCheck className="w-7 h-7 text-green-600" strokeWidth={1.5} />
            </div>
            <p className="font-serif text-xl text-[#27272A] mb-1">{result.total} sessions scheduled</p>
            <p className="text-sm text-[#71717A] mb-6">
              {result.persisted > 0
                ? `All ${result.persisted} events saved to your calendar`
                : 'Events created (set up DB to persist across sessions)'}
            </p>
            <Link
              href="/calendar"
              onClick={onClose}
              className="inline-flex items-center gap-2 bg-[#27272A] text-white text-sm font-medium px-5 py-3 rounded-2xl hover:bg-[#3F3F46] transition-colors"
            >
              View Calendar <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          /* Form */
          <div className="px-6 py-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Start date">
                <input type="date" value={startDate} min={today} onChange={e => setStartDate(e.target.value)} className={inputCls} />
              </Field>
              <Field label="Exam / deadline">
                <input type="date" value={examDate} min={startDate} onChange={e => setExamDate(e.target.value)} className={inputCls} />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Hours per day">
                <div className="flex items-center gap-3">
                  <input type="range" min={1} max={10} value={hoursPerDay}
                    onChange={e => setHoursPerDay(Number(e.target.value))}
                    className="flex-1" />
                  <span className="text-sm font-medium text-[#27272A] w-8 text-right">{hoursPerDay}h</span>
                </div>
              </Field>
              <Field label="Session start time">
                <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className={inputCls} />
              </Field>
            </div>

            <Field label="Days off">
              <div className="flex gap-2">
                {[
                  { label: 'Sun', val: sunOff, set: setSunOff },
                  { label: 'Sat', val: satOff, set: setSatOff },
                ].map(({ label, val, set }) => (
                  <button
                    key={label}
                    onClick={() => set(v => !v)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      val ? 'bg-[#27272A] text-white border-[#27272A]' : 'bg-white text-[#71717A] border-[#E4E4E7] hover:border-[#27272A]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </Field>

            {err && (
              <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-xl px-3 py-2">⚠ {err}</p>
            )}

            <button
              onClick={schedule}
              disabled={scheduling || !startDate || !examDate || startDate >= examDate}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-[#27272A] text-white text-sm font-medium hover:bg-[#3F3F46] transition-colors disabled:opacity-40"
            >
              {scheduling
                ? <><RefreshCw className="w-4 h-4 animate-spin" />Sequencing topics…</>
                : <><Calendar className="w-4 h-4" />Create Study Schedule</>}
            </button>
            <p className="text-[11px] text-center text-[#A1A1AA]">AI will order topics logically, then fill your study days</p>
          </div>
        )}
      </motion.div>
    </>
  );
}

// ── Demo content ──────────────────────────────────────────────────────────────

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
  Chapter 1: Limits, Continuity, Differentiability
  Chapter 2: Integration - Indefinite, Definite, Applications
  Chapter 3: Differential Equations
Unit 2: Algebra
  Chapter 4: Complex Numbers, Matrices & Determinants
  Chapter 5: Permutation, Combination, Binomial Theorem`;

// ── Page ──────────────────────────────────────────────────────────────────────

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export default function SyllabusPage() {
  const [raw,       setRaw]       = useState('');
  const [tree,      setTree]      = useState<SyllabusNode[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [dbLoading, setDbLoading] = useState(true);   // loading from DB on mount
  const [error,     setError]     = useState('');
  const [copied,    setCopied]    = useState(false);
  const [expandAll, setExpandAll] = useState(false);
  const [treeKey,   setTreeKey]   = useState(0);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [showSchedule, setShowSchedule] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);


  // ── On mount: L1 (localStorage) → L2 (DB) ─────────────────────────────────
  useEffect(() => {
    // Immediately restore from localStorage for instant display
    const ls = lsLoad();
    if (ls?.tree?.length) {
      setTree(sanitizeTree(ls.tree));
      setRaw(ls.raw ?? '');
    }

    // Then try DB for the authoritative latest version
    fetch('/api/syllabus')
      .then(r => r.json())
      .then(data => {
        if (data?.tree?.length) {
          setTree(sanitizeTree(data.tree));
          setRaw(data.raw ?? '');
          lsSave(data.tree, data.raw ?? '');
        }
      })
      .catch(() => {/* DB not set up yet – localStorage is fine */})
      .finally(() => setDbLoading(false));
  }, []);

  // ── Background DB save (debounced) ────────────────────────────────────────
  const saveToDBDebounced = useCallback((tree: SyllabusNode[], raw: string) => {
    clearTimeout(saveTimer.current);
    setSaveStatus('saving');
    saveTimer.current = setTimeout(async () => {
      try {
        await fetch('/api/syllabus', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tree, raw }),
        });
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 3000);
      } catch {
        setSaveStatus('error');
      }
    }, 800);
  }, []);

  // ── Parse ─────────────────────────────────────────────────────────────────
  const parse = useCallback(async (text?: string) => {
    const input = (text ?? raw).trim();
    if (!input) { setError('Paste your syllabus above first.'); return; }
    setLoading(true);
    setError('');
    try {
      const res  = await fetch('/api/syllabus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: input }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Something went wrong'); return; }

      const clean = sanitizeTree(Array.isArray(data.tree) ? data.tree : []);
      setTree(clean);
      lsSave(clean, input);
      saveToDBDebounced(clean, input);
      setTreeKey(k => k + 1);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [raw, saveToDBDebounced]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const text = ev.target?.result as string;
      setRaw(text);
      parse(text);
    };
    reader.readAsText(file);
  }, [parse]);

  const copyJSON = async () => {
    await navigator.clipboard.writeText(JSON.stringify(tree, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const clear = () => {
    setTree([]); setRaw(''); lsClear();
    // Clear DB too
    fetch('/api/syllabus', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tree: [], raw: '' }),
    }).catch(() => {});
  };

  const hasTree = tree.length > 0;

  return (
    <div className="max-w-5xl mx-auto py-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-serif text-3xl text-[#27272A]">Syllabus Organizer</h1>
          <p className="text-[#A1A1AA] text-sm mt-1">Paste your syllabus · AI structures it into a context-aware tree</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Sync status */}
          {saveStatus !== 'idle' && (
            <span className="flex items-center gap-1.5 text-[11px] text-[#A1A1AA]">
              {saveStatus === 'saving' && <><RefreshCw className="w-3 h-3 animate-spin" />Saving…</>}
              {saveStatus === 'saved'  && <><Cloud className="w-3 h-3 text-green-500" />Saved</>}
              {saveStatus === 'error'  && <><CloudOff className="w-3 h-3 text-amber-500" />Local only</>}
            </span>
          )}
          {hasTree && (
            <>
              <button
                onClick={copyJSON}
                className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl border border-[#E4E4E7] text-[#71717A] hover:border-[#27272A] hover:text-[#27272A] transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied!' : 'Export JSON'}
              </button>
              <button
                onClick={clear}
                className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl border border-[#E4E4E7] text-[#71717A] hover:border-red-200 hover:text-red-500 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear
              </button>
            </>
          )}
        </div>
      </div>

      <div className={`grid gap-6 ${hasTree ? 'grid-cols-1 lg:grid-cols-[420px_1fr]' : 'grid-cols-1'}`}>

        {/* ── Input panel ── */}
        <div className="space-y-4">
          <div
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            className="relative"
          >
            <textarea
              value={raw}
              onChange={e => setRaw(e.target.value)}
              placeholder={`Paste your syllabus here, or drag & drop a .txt file…\n\nExample:\n${DEMO_SYLLABUS.slice(0, 180)}…`}
              className="w-full h-72 text-sm text-[#27272A] placeholder:text-[#C4C4C7] bg-white border border-[#E4E4E7] rounded-2xl px-4 py-4 resize-none focus:outline-none focus:border-[#27272A] transition-colors leading-relaxed font-mono"
            />
            <div className="absolute bottom-3 right-3 flex items-center gap-1.5 text-[#D4D4D8] text-[11px] pointer-events-none">
              <Upload className="w-3 h-3" /> drag & drop
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => parse()}
              disabled={loading || !raw.trim()}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-[#27272A] text-white text-sm font-medium hover:bg-[#3F3F46] transition-colors disabled:opacity-40"
            >
              {loading
                ? <><RefreshCw className="w-4 h-4 animate-spin" />Analysing…</>
                : <><Sparkles className="w-4 h-4" />Organise with AI</>}
            </button>
            <button
              onClick={() => setRaw(DEMO_SYLLABUS)}
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

          {!hasTree && !loading && (
            <div className="bg-[#FFFBF7] border border-[#F0E4D7] rounded-2xl p-4 space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#A1A1AA]">Tips</p>
              {[
                'Copy directly from your PDF or study guide — any format works',
                'Multiple subjects supported: each becomes its own tree branch',
                'AI estimates study hours & flags high-weight exam topics',
                'Your tree syncs to the cloud and reloads on every visit',
              ].map(tip => (
                <div key={tip} className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#D97757] shrink-0 mt-0.5" />
                  <p className="text-[12px] text-[#71717A] leading-relaxed">{tip}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Tree panel ── */}
        {hasTree && (
          <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25 }}>
            <StatsBar tree={tree} />

            <div className="flex items-center justify-between mb-3 px-1">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#A1A1AA]">Content Tree</p>
              <div className="flex gap-2 text-[11px] text-[#71717A]">
                <button onClick={() => { setExpandAll(true);  setTreeKey(k => k + 1); }} className="hover:text-[#27272A] transition-colors">Expand all</button>
                <span className="text-[#E4E4E7]">·</span>
                <button onClick={() => { setExpandAll(false); setTreeKey(k => k + 1); }} className="hover:text-[#27272A] transition-colors">Collapse all</button>
              </div>
            </div>

            <div key={treeKey} className="bg-white border border-[#E4E4E7] rounded-2xl shadow-sm overflow-hidden">
              {/* Legend */}
              <div className="border-b border-[#F4F4F5] px-4 py-3 flex flex-wrap gap-4">
                {(['subject', 'unit', 'chapter', 'topic'] as SyllabusNode['type'][]).map(t => {
                  const Ic = getNodeIcon(t);
                  return (
                    <span key={t} className="flex items-center gap-1.5 text-[11px] text-[#71717A]">
                      <Ic className="w-3 h-3" style={{ color: getNodeColor(t) }} strokeWidth={1.5} />
                      <span className="capitalize">{t}</span>
                    </span>
                  );
                })}
                <span className="ml-auto flex items-center gap-3 text-[10px] text-[#A1A1AA]">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400" />High</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" />Med</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400" />Low</span>
                </span>
              </div>

              <div className="py-2 px-1">
                {tree.map(node => (
                  <TreeNode key={node.id} node={node} depth={0} defaultOpen={expandAll || true} />
                ))}
              </div>
            </div>

            {/* Schedule CTA */}
            <motion.button
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              onClick={() => setShowSchedule(true)}
              className="mt-4 w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl bg-gradient-to-r from-[#1D4ED8] to-[#7C3AED] text-white text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm"
            >
              <Calendar className="w-4 h-4" />
              Schedule across Calendar
              <ArrowRight className="w-4 h-4 ml-auto opacity-70" />
            </motion.button>

            <button
              onClick={() => parse(raw)}
              disabled={loading}
              className="mt-2 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-[#E4E4E7] text-sm text-[#71717A] hover:border-[#27272A] hover:text-[#27272A] transition-colors disabled:opacity-40"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Re-analyse
            </button>
          </motion.div>
        )}

        {/* Loading skeleton (first parse, no existing tree) */}
        {loading && !hasTree && (
          <div className="animate-pulse space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {[0, 1, 2].map(i => (
                <div key={i} className="bg-white border border-[#E4E4E7] rounded-2xl p-4 h-20">
                  <div className="w-6 h-6 bg-[#F4F4F5] rounded mb-2" />
                  <div className="h-5 w-10 bg-[#F4F4F5] rounded mb-1" />
                  <div className="h-3 w-16 bg-[#F4F4F5] rounded" />
                </div>
              ))}
            </div>
            <div className="bg-white border border-[#E4E4E7] rounded-2xl p-4 space-y-3">
              {[0.7, 0.9, 0.6, 0.8, 0.5, 0.75].map((w, i) => (
                <div key={i} className="flex items-center gap-3" style={{ paddingLeft: `${(i % 3) * 20}px` }}>
                  <div className="w-5 h-5 bg-[#F4F4F5] rounded-lg shrink-0" />
                  <div className="h-4 bg-[#F4F4F5] rounded" style={{ width: `${w * 100}%` }} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Schedule modal */}
      <AnimatePresence>
        {showSchedule && (
          <ScheduleModal tree={tree} onClose={() => setShowSchedule(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
