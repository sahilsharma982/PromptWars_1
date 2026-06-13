"use client";

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ── Types ─────────────────────────────────────────────────────────────────────

type ConnectionStatus = 'connected' | 'disconnected' | 'pending';
type Tab = 'sleep' | 'screentime' | 'activity';

interface SleepNight {
  date: string;          // ISO yyyy-mm-dd
  hours: number;
  quality: 'poor' | 'fair' | 'good' | 'great';
  bedtime: string;
  wakeTime: string;
  deep: number;   // fraction 0–1
  rem: number;    // fraction 0–1
  light: number;  // fraction 0–1
}

interface IntegrationState {
  appleWatch: ConnectionStatus;
  fitbit: ConnectionStatus;
  screenTime: ConnectionStatus;
}

// ── Persistence ────────────────────────────────────────────────────────────────

const LS_INT = 'ms_integrations_v2';
const DEFAULT_INT: IntegrationState = { appleWatch: 'disconnected', fitbit: 'disconnected', screenTime: 'disconnected' };

function loadInt(): IntegrationState {
  if (typeof window === 'undefined') return DEFAULT_INT;
  try { return { ...DEFAULT_INT, ...JSON.parse(localStorage.getItem(LS_INT) ?? '{}') }; }
  catch { return DEFAULT_INT; }
}
function saveInt(s: IntegrationState) { localStorage.setItem(LS_INT, JSON.stringify(s)); }

// ── Demo data ──────────────────────────────────────────────────────────────────

const SLEEP: SleepNight[] = [
  { date: 'Jun 13', hours: 6.2, quality: 'fair',  bedtime: '1:15 AM', wakeTime: '7:24 AM', deep: 0.18, rem: 0.21, light: 0.55 },
  { date: 'Jun 12', hours: 7.8, quality: 'good',  bedtime: '11:40 PM', wakeTime: '7:29 AM', deep: 0.22, rem: 0.25, light: 0.45 },
  { date: 'Jun 11', hours: 5.1, quality: 'poor',  bedtime: '2:30 AM', wakeTime: '7:38 AM', deep: 0.11, rem: 0.16, light: 0.55 },
  { date: 'Jun 10', hours: 8.1, quality: 'great', bedtime: '11:00 PM', wakeTime: '7:06 AM', deep: 0.27, rem: 0.28, light: 0.41 },
  { date: 'Jun 9',  hours: 7.2, quality: 'good',  bedtime: '12:15 AM', wakeTime: '7:27 AM', deep: 0.20, rem: 0.23, light: 0.52 },
  { date: 'Jun 8',  hours: 6.9, quality: 'fair',  bedtime: '12:45 AM', wakeTime: '7:39 AM', deep: 0.17, rem: 0.22, light: 0.56 },
  { date: 'Jun 7',  hours: 7.5, quality: 'good',  bedtime: '11:30 PM', wakeTime: '7:00 AM', deep: 0.24, rem: 0.26, light: 0.46 },
];

const HR_DATA = [
  { time: 'Mon', rhr: 62, peak: 142 },
  { time: 'Tue', rhr: 64, peak: 151 },
  { time: 'Wed', rhr: 61, peak: 138 },
  { time: 'Thu', rhr: 63, peak: 159 },
  { time: 'Fri', rhr: 65, peak: 145 },
  { time: 'Sat', rhr: 60, peak: 133 },
  { time: 'Sun', rhr: 62, peak: 128 },
];

const APPS = [
  { name: 'YouTube',   min: 142, cat: 'Entertainment', color: '#FF2D55', icon: '▶' },
  { name: 'Instagram', min: 87,  cat: 'Social',         color: '#FF375F', icon: '◈' },
  { name: 'WhatsApp',  min: 63,  cat: 'Social',         color: '#34C759', icon: '◉' },
  { name: 'Notes',     min: 34,  cat: 'Productivity',   color: '#007AFF', icon: '◻' },
  { name: 'Safari',    min: 28,  cat: 'Browser',        color: '#5856D6', icon: '◎' },
];

// ── Color helpers ──────────────────────────────────────────────────────────────

const Q_COLOR = { poor: '#FF3B30', fair: '#FF9F0A', good: '#30D158', great: '#5E5CE6' };
const Q_LABEL = { poor: 'Poor', fair: 'Fair', good: 'Good', great: 'Excellent' };

// ── Activity Rings (SVG) ───────────────────────────────────────────────────────

function ActivityRing({
  pct, color, size = 60, stroke = 8,
}: {
  pct: number; color: string; size?: number; stroke?: number;
}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color + '25'} strokeWidth={stroke} />
      <motion.circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: circ - dash }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
      />
    </svg>
  );
}

function NestedRings() {
  const rings = [
    { pct: 84, color: '#FF2D55', label: 'Move',    value: '420', unit: 'CAL', goal: '500' },
    { pct: 93, color: '#30D158', label: 'Exercise', value: '28',  unit: 'MIN', goal: '30' },
    { pct: 75, color: '#40C8E0', label: 'Stand',   value: '9',   unit: 'HRS', goal: '12' },
  ];

  return (
    <div className="flex items-center gap-8">
      {/* Nested ring SVG */}
      <div className="relative" style={{ width: 160, height: 160 }}>
        <svg width="160" height="160" className="absolute inset-0" style={{ transform: 'rotate(-90deg)' }}>
          {rings.map(({ pct, color }, i) => {
            const size = 160 - i * 36;
            const offset = i * 18;
            const r = (size - 12) / 2;
            const circ = 2 * Math.PI * r;
            const dash = (pct / 100) * circ;
            return (
              <g key={i} transform={`translate(${offset}, ${offset})`}>
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color + '25'} strokeWidth={12} />
                <motion.circle
                  cx={size / 2} cy={size / 2} r={r}
                  fill="none" stroke={color} strokeWidth={12}
                  strokeLinecap="round"
                  strokeDasharray={circ}
                  initial={{ strokeDashoffset: circ }}
                  animate={{ strokeDashoffset: circ - dash }}
                  transition={{ duration: 1.2, delay: i * 0.15, ease: 'easeOut' }}
                />
              </g>
            );
          })}
        </svg>
      </div>

      {/* Ring legend */}
      <div className="space-y-4">
        {rings.map(({ label, value, unit, goal, color, pct }) => (
          <div key={label} className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
            <div>
              <p className="text-xs text-[#8E8E93] font-medium">{label}</p>
              <p className="text-sm font-semibold text-[#1C1C1E]">
                {value} <span className="text-xs font-normal text-[#8E8E93]">/ {goal} {unit}</span>
              </p>
            </div>
            <span className="ml-auto text-xs font-semibold" style={{ color }}>{pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Heart Rate Chart ───────────────────────────────────────────────────────────

function HeartRateChart() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const [drawn, setDrawn] = useState(false);

  const BAR_W = 28;
  const GAP = 12;
  const H = 120;
  const PADDING = 16;
  const MIN_HR = 56;
  const MAX_HR = 68;

  const chartW = HR_DATA.length * (BAR_W + GAP) - GAP + PADDING * 2;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // HiDPI
    const dpr = window.devicePixelRatio || 1;
    canvas.width = chartW * dpr;
    canvas.height = (H + 36) * dpr;
    canvas.style.width = `${chartW}px`;
    canvas.style.height = `${H + 36}px`;
    ctx.scale(dpr, dpr);

    let frame = 0;
    const totalFrames = 40;

    function draw(progress: number) {
      if (!ctx) return;
      ctx.clearRect(0, 0, chartW, H + 36);

      HR_DATA.forEach((d, i) => {
        const x = PADDING + i * (BAR_W + GAP);
        const barH = ((d.rhr - MIN_HR) / (MAX_HR - MIN_HR)) * (H - 20) * progress;
        const y = H - barH;

        // Bar gradient
        const grad = ctx.createLinearGradient(0, y, 0, H);
        grad.addColorStop(0, '#FF375F');
        grad.addColorStop(1, '#FF375F40');

        const isHov = hovered === i;
        ctx.globalAlpha = isHov ? 1 : 0.85;
        ctx.beginPath();
        ctx.roundRect(x, y, BAR_W, barH, [6, 6, 0, 0]);
        ctx.fillStyle = isHov ? '#FF2D55' : grad;
        ctx.fill();
        ctx.globalAlpha = 1;

        // BPM label on hover
        if (isHov) {
          ctx.font = '600 12px -apple-system, Inter, sans-serif';
          ctx.fillStyle = '#1C1C1E';
          ctx.textAlign = 'center';
          ctx.fillText(`${d.rhr}`, x + BAR_W / 2, y - 6);
        }

        // Day label
        ctx.font = '11px -apple-system, Inter, sans-serif';
        ctx.fillStyle = '#8E8E93';
        ctx.textAlign = 'center';
        ctx.fillText(d.time, x + BAR_W / 2, H + 18);
      });
    }

    function animate() {
      frame++;
      draw(Math.min(frame / totalFrames, 1));
      if (frame < totalFrames) requestAnimationFrame(animate);
      else setDrawn(true);
    }
    animate();
  }, [hovered]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left - PADDING;
    const idx = Math.floor(x / (BAR_W + GAP));
    setHovered(idx >= 0 && idx < HR_DATA.length ? idx : null);
  };

  return (
    <div>
      <div className="flex items-end gap-2 mb-1">
        <span className="font-bold text-4xl text-[#1C1C1E]">62</span>
        <span className="text-[#8E8E93] text-sm mb-1.5">BPM</span>
      </div>
      <p className="text-xs text-[#8E8E93] mb-4">Avg resting · this week</p>
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHovered(null)}
        className="cursor-crosshair"
        style={{ display: 'block' }}
      />
      <div className="flex items-center justify-between mt-3 text-xs text-[#8E8E93]">
        <span>Peak this week: <strong className="text-[#1C1C1E]">{Math.max(...HR_DATA.map(d => d.peak))} BPM</strong></span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-[#FF2D55]" /> Resting HR
        </span>
      </div>
    </div>
  );
}

// ── iOS-style Toggle ───────────────────────────────────────────────────────────

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={`relative w-12 h-7 rounded-full transition-colors duration-200 ${on ? 'bg-[#34C759]' : 'bg-[#E5E5EA]'}`}
      role="switch"
      aria-checked={on}
    >
      <motion.span
        layout
        transition={{ type: 'spring', stiffness: 700, damping: 40 }}
        className="absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-md"
        style={{ left: on ? 'calc(100% - 26px)' : '2px' }}
      />
    </button>
  );
}

// ── Device connection card ─────────────────────────────────────────────────────

function DeviceCard({
  name,
  subtitle,
  status,
  emoji,
  color,
  metrics,
  onToggle,
  loading,
}: {
  name: string;
  subtitle: string;
  status: ConnectionStatus;
  emoji: string;
  color: string;
  metrics?: { label: string; value: string }[];
  onToggle: () => void;
  loading: boolean;
}) {
  const on = status === 'connected';

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-[#E5E5EA]">
      {/* Header row */}
      <div className="flex items-center gap-4 px-5 py-4">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0"
          style={{ backgroundColor: color + '18' }}
        >
          {emoji}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-[#1C1C1E] text-[15px]">{name}</p>
          <p className="text-xs text-[#8E8E93] mt-0.5">{subtitle}</p>
        </div>
        {loading
          ? <div className="w-6 h-6 rounded-full border-2 border-[#E5E5EA] border-t-[#007AFF] animate-spin" />
          : <Toggle on={on} onChange={onToggle} />
        }
      </div>

      {/* Metrics strip (only when connected) */}
      <AnimatePresence>
        {on && metrics && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-[#F2F2F7] grid divide-x divide-[#F2F2F7]"
                 style={{ gridTemplateColumns: `repeat(${metrics.length}, 1fr)` }}>
              {metrics.map(m => (
                <div key={m.label} className="px-4 py-3 text-center">
                  <p className="text-xs text-[#8E8E93]">{m.label}</p>
                  <p className="text-sm font-semibold text-[#1C1C1E] mt-0.5">{m.value}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Sleep bar row ──────────────────────────────────────────────────────────────

function SleepRow({ night }: { night: SleepNight }) {
  const MAX = 9;
  const pct = Math.min((night.hours / MAX) * 100, 100);
  const color = Q_COLOR[night.quality];

  return (
    <div className="flex items-center gap-4 group">
      <span className="text-xs text-[#8E8E93] w-14 shrink-0 text-right tabular-nums">{night.date}</span>
      <div className="flex-1 h-6 bg-[#F2F2F7] rounded-full overflow-hidden relative">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
        />
        {/* Stage breakdown overlay */}
        <div className="absolute inset-0 flex rounded-full overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity">
          <motion.div style={{ width: `${night.deep * pct}%`, backgroundColor: '#5E5CE6' }} />
          <motion.div style={{ width: `${night.rem  * pct}%`, backgroundColor: '#BF5AF2' }} />
          <motion.div style={{ width: `${night.light * pct}%`, backgroundColor: color + '90' }} />
        </div>
      </div>
      <span className="text-xs font-semibold text-[#1C1C1E] w-10 shrink-0 tabular-nums">{night.hours}h</span>
      <span
        className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full shrink-0 w-16 text-center"
        style={{ color, backgroundColor: color + '18' }}
      >
        {Q_LABEL[night.quality]}
      </span>
    </div>
  );
}

// ── Wellness insight banner ────────────────────────────────────────────────────

function WellnessInsight({ text }: { text: string }) {
  return (
    <div className="flex gap-3 bg-[#F0FDF4] border border-green-200/80 rounded-2xl p-4">
      <span className="text-xl shrink-0 mt-0.5">🌿</span>
      <div>
        <p className="text-xs font-semibold text-green-700 uppercase tracking-wider mb-1">Wellness Agent</p>
        <p className="text-sm text-green-800 leading-relaxed">{text}</p>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<IntegrationState>(DEFAULT_INT);
  const [loadingKey, setLoadingKey] = useState<keyof IntegrationState | null>(null);
  const [tab, setTab] = useState<Tab>('sleep');

  useEffect(() => {
    setIntegrations(loadInt());
  }, []);

  const toggle = async (key: keyof IntegrationState) => {
    setLoadingKey(key);
    await new Promise(r => setTimeout(r, 900));
    setIntegrations(prev => {
      const next = { ...prev, [key]: prev[key] === 'connected' ? 'disconnected' : 'connected' };
      saveInt(next);
      return next;
    });
    setLoadingKey(null);
  };

  const avgSleep = (SLEEP.reduce((s, n) => s + n.hours, 0) / SLEEP.length).toFixed(1);
  const goodNights = SLEEP.filter(n => n.quality === 'good' || n.quality === 'great').length;
  const totalScreenMin = APPS.reduce((s, a) => s + a.min, 0);

  const TABS: { id: Tab; label: string }[] = [
    { id: 'sleep', label: 'Sleep' },
    { id: 'screentime', label: 'Screen Time' },
    { id: 'activity', label: 'Activity' },
  ];

  return (
    <div className="max-w-3xl mx-auto py-8 px-0">
      {/* ── Header ── */}
      <div className="mb-8">
        <h1 className="text-[28px] font-bold text-[#1C1C1E] tracking-tight">Integrations</h1>
        <p className="text-[#8E8E93] text-sm mt-1">Connect your devices · synced with Wellness Agent</p>
      </div>

      {/* ── Devices ── */}
      <section className="space-y-3 mb-8">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-[#8E8E93] px-1 mb-3">Devices</p>
        <DeviceCard
          name="Apple Watch"
          subtitle="Sleep stages · Heart rate · Activity rings"
          status={integrations.appleWatch}
          emoji="⌚️"
          color="#1C1C1E"
          loading={loadingKey === 'appleWatch'}
          onToggle={() => toggle('appleWatch')}
          metrics={[
            { label: 'Heart Rate', value: '62 BPM' },
            { label: 'Sleep Score', value: '78 / 100' },
            { label: 'Move Ring', value: '84%' },
          ]}
        />
        <DeviceCard
          name="Fitbit"
          subtitle="SpO2 · HRV · Stress management score"
          status={integrations.fitbit}
          emoji="🩺"
          color="#00B0B9"
          loading={loadingKey === 'fitbit'}
          onToggle={() => toggle('fitbit')}
          metrics={[
            { label: 'HRV', value: '42 ms' },
            { label: 'SpO2', value: '97%' },
            { label: 'Stress', value: 'Low' },
          ]}
        />
        <DeviceCard
          name="Screen Time"
          subtitle="iOS Screen Time · App usage · Pickups"
          status={integrations.screenTime}
          emoji="📱"
          color="#007AFF"
          loading={loadingKey === 'screenTime'}
          onToggle={() => toggle('screenTime')}
          metrics={[
            { label: 'Today', value: `${Math.floor(totalScreenMin / 60)}h ${totalScreenMin % 60}m` },
            { label: 'Pickups', value: '67' },
            { label: 'Distracted', value: '64%' },
          ]}
        />
      </section>

      {/* ── Tab bar ── */}
      <div className="bg-[#F2F2F7] p-1 rounded-xl flex gap-0.5 mb-6">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-2 rounded-[10px] text-sm font-semibold transition-all relative ${
              tab === t.id ? 'text-[#1C1C1E]' : 'text-[#8E8E93]'
            }`}
          >
            {tab === t.id && (
              <motion.span
                layoutId="tab-bg"
                className="absolute inset-0 bg-white rounded-[10px] shadow-sm"
                transition={{ type: 'spring', stiffness: 500, damping: 40 }}
              />
            )}
            <span className="relative z-10">{t.label}</span>
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      <AnimatePresence mode="wait">
        {tab === 'sleep' && (
          <motion.div
            key="sleep"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Avg Sleep', value: `${avgSleep}h`, sub: 'last 7 nights', color: '#5E5CE6' },
                { label: 'Good Nights', value: `${goodNights} of 7`, sub: 'quality threshold', color: '#30D158' },
                { label: 'Bedtime', value: '12:17 AM', sub: '7-night avg', color: '#FF9F0A' },
              ].map(card => (
                <div key={card.label} className="bg-white rounded-2xl p-4 shadow-sm border border-[#E5E5EA]">
                  <div className="w-8 h-8 rounded-full mb-3 flex items-center justify-center" style={{ backgroundColor: card.color + '18' }}>
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: card.color }} />
                  </div>
                  <p className="text-[22px] font-bold text-[#1C1C1E] leading-tight">{card.value}</p>
                  <p className="text-[11px] text-[#8E8E93] mt-1">{card.label}</p>
                </div>
              ))}
            </div>

            {/* Sleep chart */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#E5E5EA]">
              <div className="flex items-center justify-between mb-1">
                <p className="font-semibold text-[#1C1C1E]">Sleep Duration</p>
                <div className="flex gap-3 text-[10px] text-[#8E8E93]">
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#5E5CE6]" />Deep</span>
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#BF5AF2]" />REM</span>
                </div>
              </div>
              <p className="text-xs text-[#8E8E93] mb-5">Hover to see sleep stages</p>
              <div className="space-y-2.5">
                {SLEEP.map(n => <SleepRow key={n.date} night={n} />)}
              </div>
            </div>

            {/* Stage breakdown for last night */}
            <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-[#E5E5EA]">
              <div className="px-5 py-4 border-b border-[#F2F2F7]">
                <p className="font-semibold text-[#1C1C1E]">Last Night · {SLEEP[0].date}</p>
                <p className="text-xs text-[#8E8E93] mt-0.5">{SLEEP[0].bedtime} → {SLEEP[0].wakeTime}</p>
              </div>
              <div className="divide-y divide-[#F2F2F7]">
                {[
                  { label: 'Deep Sleep',  value: `${Math.round(SLEEP[0].deep  * SLEEP[0].hours * 60)} min`, pct: Math.round(SLEEP[0].deep * 100), color: '#5E5CE6' },
                  { label: 'REM Sleep',   value: `${Math.round(SLEEP[0].rem   * SLEEP[0].hours * 60)} min`, pct: Math.round(SLEEP[0].rem  * 100), color: '#BF5AF2' },
                  { label: 'Light Sleep', value: `${Math.round(SLEEP[0].light * SLEEP[0].hours * 60)} min`, pct: Math.round(SLEEP[0].light * 100), color: '#30D158' },
                ].map(row => (
                  <div key={row.label} className="flex items-center gap-4 px-5 py-3.5">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: row.color }} />
                    <p className="text-sm text-[#1C1C1E] flex-1">{row.label}</p>
                    <p className="text-sm font-semibold text-[#1C1C1E]">{row.value}</p>
                    <div className="w-20 h-1.5 bg-[#F2F2F7] rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }} animate={{ width: `${row.pct}%` }}
                        transition={{ duration: 0.6 }}
                        className="h-full rounded-full" style={{ backgroundColor: row.color }}
                      />
                    </div>
                    <span className="text-xs text-[#8E8E93] w-8 text-right">{row.pct}%</span>
                  </div>
                ))}
              </div>
            </div>

            <WellnessInsight
              text={`You averaged ${avgSleep}h of sleep this week — ${parseFloat(avgSleep) >= 7 ? 'within the healthy 7–9h range. Consistent bedtimes are helping your memory consolidation and exam performance.' : 'slightly below the recommended 7–9h. Late study sessions are pushing your bedtime past midnight. Try completing review by 11 PM to gain a full extra hour.'}`}
            />
          </motion.div>
        )}

        {tab === 'screentime' && (
          <motion.div
            key="screentime"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {/* Total */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#E5E5EA]">
              <p className="text-xs text-[#8E8E93] font-semibold uppercase tracking-wider mb-1">Today</p>
              <div className="flex items-end gap-2 mb-4">
                <span className="text-4xl font-bold text-[#1C1C1E]">
                  {Math.floor(totalScreenMin / 60)}h {totalScreenMin % 60}m
                </span>
              </div>

              {/* Category breakdown bar */}
              <div className="h-3 rounded-full overflow-hidden flex mb-3">
                {APPS.map(app => (
                  <motion.div
                    key={app.name}
                    initial={{ width: 0 }}
                    animate={{ width: `${(app.min / totalScreenMin) * 100}%` }}
                    transition={{ duration: 0.6 }}
                    style={{ backgroundColor: app.color }}
                  />
                ))}
              </div>

              {/* App list */}
              <div className="space-y-4 mt-5">
                {APPS.map(app => (
                  <div key={app.name} className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-lg shrink-0 font-bold"
                      style={{ backgroundColor: app.color }}
                    >
                      <span className="text-xs">{app.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium text-[#1C1C1E]">{app.name}</p>
                        <p className="text-xs text-[#8E8E93] tabular-nums">
                          {Math.floor(app.min / 60) > 0 ? `${Math.floor(app.min / 60)}h ` : ''}{app.min % 60}m
                        </p>
                      </div>
                      <div className="h-1.5 bg-[#F2F2F7] rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(app.min / totalScreenMin) * 100}%` }}
                          transition={{ duration: 0.6 }}
                          className="h-full rounded-full"
                          style={{ backgroundColor: app.color }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <WellnessInsight
              text={`${Math.floor(totalScreenMin / 60)}h ${totalScreenMin % 60}m of screen time today. Entertainment & social apps account for ${Math.round((APPS.filter(a => a.cat === 'Entertainment' || a.cat === 'Social').reduce((s, a) => s + a.min, 0) / totalScreenMin) * 100)}% — consider enabling Screen Time limits during dedicated study blocks to reduce distraction-switching costs.`}
            />
          </motion.div>
        )}

        {tab === 'activity' && (
          <motion.div
            key="activity"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {/* Activity rings */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#E5E5EA]">
              <p className="font-semibold text-[#1C1C1E] mb-5">Activity Rings</p>
              <NestedRings />
            </div>

            {/* Heart rate */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#E5E5EA]">
              <p className="font-semibold text-[#1C1C1E] mb-4">Heart Rate</p>
              <HeartRateChart />
            </div>

            {/* Step count */}
            <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-[#E5E5EA]">
              <div className="px-5 py-4 border-b border-[#F2F2F7]">
                <p className="font-semibold text-[#1C1C1E]">Steps Today</p>
              </div>
              <div className="px-5 py-4 flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold text-[#1C1C1E]">7,842</p>
                  <p className="text-xs text-[#8E8E93] mt-1">Goal: 10,000 steps</p>
                </div>
                <div className="relative">
                  <ActivityRing pct={78} color="#30D158" size={72} stroke={9} />
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-[#1C1C1E]">78%</span>
                </div>
              </div>
              <div className="px-5 pb-4">
                <div className="h-1.5 bg-[#F2F2F7] rounded-full">
                  <motion.div
                    initial={{ width: 0 }} animate={{ width: '78%' }}
                    transition={{ duration: 0.8 }}
                    className="h-full rounded-full bg-[#30D158]"
                  />
                </div>
              </div>
            </div>

            <WellnessInsight
              text="You're on track to close all three activity rings today. Regular movement breaks during study sessions improve cognitive performance — try a 5-min walk every 50 minutes using the Pomodoro technique."
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
