"use client";

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  format, addMonths, subMonths, startOfMonth, endOfMonth,
  startOfWeek, endOfWeek, eachDayOfInterval, isSameDay,
  isSameMonth, isToday, parseISO,
} from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, X, Clock, Sparkles, BookOpen, AlertCircle } from 'lucide-react';
import FileUploadDialog from '@/components/FileUploadDialog';
import {
  loadLocalCalendarEvents,
  saveLocalCalendarEvents,
  mergeCalendarEvents,
  isLocalOnlyId,
} from '@/lib/calendarStorage';

// ── Types ─────────────────────────────────────────────────────────────────────

type EventType = 'study' | 'exam' | 'wellness' | 'deadline' | 'ai';

interface CalEvent {
  id: string | number;
  title: string;
  date: string;       // ISO YYYY-MM-DD
  time?: string;      // HH:MM optional
  type: EventType;
  ai?: boolean;
  note?: string;
}

// ── Event colours ─────────────────────────────────────────────────────────────

const TYPE_STYLES: Record<EventType, { dot: string; pill: string; text: string }> = {
  study:    { dot: 'bg-blue-400',   pill: 'bg-blue-50 border-blue-100',   text: 'text-blue-700' },
  exam:     { dot: 'bg-red-400',    pill: 'bg-red-50  border-red-100',    text: 'text-red-700'  },
  wellness: { dot: 'bg-green-400',  pill: 'bg-green-50 border-green-100', text: 'text-green-700'},
  deadline: { dot: 'bg-amber-400',  pill: 'bg-amber-50 border-amber-100', text: 'text-amber-700'},
  ai:       { dot: 'bg-violet-400', pill: 'bg-violet-50 border-violet-100', text: 'text-violet-700' },
};

// ── Seed Events (Fallback in case DB is empty/not configured) ─────────────────

const today = new Date();
const fmt = (d: Date) => format(d, 'yyyy-MM-dd');

const SEED_EVENTS: CalEvent[] = [
  { id: 'seed-1', title: 'Physics Mock Test',      date: fmt(addMonths(today, 0)), time: '10:00', type: 'exam' },
  { id: 'seed-2', title: 'Thermodynamics Revision',date: fmt(today),               time: '09:00', type: 'study' },
  { id: 'seed-3', title: 'Morning Walk',            date: fmt(today),               time: '07:00', type: 'wellness' },
  { id: 'seed-4', title: 'JEE Paper 2024 Practice',date: fmt(addMonths(today, 0)), time: '14:00', type: 'study' },
  { id: 'seed-5', title: 'Assignment Deadline',     date: fmt(addMonths(today, 0)), time: '23:59', type: 'deadline' },
];

// Helper to map DB event to local CalEvent
const mapDbEventToCalEvent = (dbEvent: any): CalEvent => ({
  id: dbEvent.id,
  title: dbEvent.title,
  date: dbEvent.event_date,
  time: dbEvent.event_time ? dbEvent.event_time.slice(0, 5) : undefined, // format 'HH:MM:SS' -> 'HH:MM'
  type: dbEvent.type,
  ai: dbEvent.ai_scheduled,
  note: dbEvent.note || undefined,
});

// ── Add-event modal ───────────────────────────────────────────────────────────

function AddEventModal({
  date, onAdd, onClose,
}: {
  date: Date;
  onAdd: (e: Omit<CalEvent, 'id'>) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('09:00');
  const [type, setType] = useState<EventType>('study');
  const [note, setNote] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd({ title, date: fmt(date), time, type, note });
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 10 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="bg-white rounded-2xl shadow-2xl shadow-black/10 w-full max-w-sm mx-4 p-6 border border-[#E4E4E7]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-5">
          <h3 className="font-serif text-[#27272A] text-lg">
            New Event · <span className="text-[#A1A1AA] font-sans text-sm font-normal">{format(date, 'EEE, MMM d')}</span>
          </h3>
          <button onClick={onClose} className="text-[#A1A1AA] hover:text-[#27272A] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            autoFocus
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Event title"
            className="w-full text-[15px] text-[#27272A] placeholder:text-[#A1A1AA] border border-[#E4E4E7] rounded-xl px-4 py-2.5 focus:outline-none focus:border-[#27272A] transition-colors"
          />

          <div className="flex gap-2">
            <input
              type="time"
              value={time}
              onChange={e => setTime(e.target.value)}
              className="flex-1 text-sm text-[#27272A] border border-[#E4E4E7] rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#27272A] transition-colors"
            />
            <select
              value={type}
              onChange={e => setType(e.target.value as EventType)}
              className="flex-1 text-sm text-[#27272A] border border-[#E4E4E7] rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#27272A] transition-colors bg-white"
            >
              <option value="study">📚 Study</option>
              <option value="exam">📝 Exam</option>
              <option value="wellness">🌿 Wellness</option>
              <option value="deadline">⚠️ Deadline</option>
            </select>
          </div>

          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Notes (optional)"
            rows={2}
            className="w-full text-sm text-[#27272A] placeholder:text-[#A1A1AA] border border-[#E4E4E7] rounded-xl px-4 py-2.5 resize-none focus:outline-none focus:border-[#27272A] transition-colors"
          />

          <button
            type="submit"
            disabled={!title.trim()}
            className="w-full bg-[#27272A] text-white text-sm font-medium py-2.5 rounded-xl hover:bg-[#3F3F46] transition-colors disabled:opacity-40"
          >
            Add Event
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ── Calendar Skeleton ─────────────────────────────────────────────────────────

function CalendarSkeleton() {
  return (
    <div className="max-w-5xl mx-auto py-8 px-0 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center justify-between mb-8 px-1">
        <div>
          <div className="h-8 w-32 bg-[#E4E4E7] rounded-lg" />
          <div className="h-4 w-52 bg-[#F4F4F5] rounded mt-2" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-36 bg-[#F4F4F5] rounded-xl" />
          <div className="h-9 w-28 bg-[#E4E4E7] rounded-xl" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
        {/* Calendar grid skeleton */}
        <div className="bg-white border border-[#E4E4E7] rounded-2xl overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#F4F4F5]">
            <div className="h-6 w-36 bg-[#E4E4E7] rounded" />
            <div className="flex gap-1">
              <div className="w-8 h-8 bg-[#F4F4F5] rounded-lg" />
              <div className="w-16 h-8 bg-[#F4F4F5] rounded-lg" />
              <div className="w-8 h-8 bg-[#F4F4F5] rounded-lg" />
            </div>
          </div>
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-[#F4F4F5]">
            {['S','M','T','W','T','F','S'].map((d, i) => (
              <div key={i} className="py-2 flex justify-center">
                <div className="h-3 w-4 bg-[#F4F4F5] rounded" />
              </div>
            ))}
          </div>
          {/* Day cells */}
          <div className="grid grid-cols-7">
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="min-h-[80px] p-2 border-b border-r border-[#F4F4F5]">
                <div className="w-6 h-6 bg-[#F4F4F5] rounded-full mb-1" />
                {i % 4 === 0 && <div className="h-3.5 bg-[#F4F4F5] rounded mt-1" />}
                {i % 7 === 2 && <div className="h-3.5 bg-[#F4F4F5] rounded mt-1" />}
              </div>
            ))}
          </div>
        </div>

        {/* Side panel skeleton */}
        <div className="space-y-4">
          <div className="bg-white border border-[#E4E4E7] rounded-2xl overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-[#F4F4F5]">
              <div className="h-3 w-20 bg-[#F4F4F5] rounded mb-2" />
              <div className="h-7 w-32 bg-[#E4E4E7] rounded" />
            </div>
            <div className="px-5 py-8 flex flex-col items-center gap-2">
              <div className="h-4 w-16 bg-[#F4F4F5] rounded" />
              <div className="h-3 w-12 bg-[#F4F4F5] rounded" />
            </div>
          </div>
          <div className="bg-white border border-[#E4E4E7] rounded-2xl p-4 shadow-sm">
            <div className="h-3 w-14 bg-[#F4F4F5] rounded mb-3" />
            {[0,1,2,3,4].map(i => (
              <div key={i} className="flex items-center gap-2 mb-1.5">
                <div className="w-2 h-2 rounded-full bg-[#F4F4F5]" />
                <div className="h-3 w-20 bg-[#F4F4F5] rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Calendar Page ────────────────────────────────────────────────────────

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date>(today);
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForDate, setAddForDate] = useState<Date>(today);
  const [showUpload, setShowUpload] = useState(false);
  const [visible, setVisible] = useState(false);

  // Load events from database + localStorage on mount
  useEffect(() => {
    async function loadEvents() {
      const localEvents = loadLocalCalendarEvents();
      try {
        const res = await fetch('/api/calendar');
        if (res.ok) {
          const data = await res.json();
          const dbEvents = (data.events || []).map(mapDbEventToCalEvent);
          const merged = mergeCalendarEvents(dbEvents, localEvents);
          setEvents(merged.length > 0 ? merged : SEED_EVENTS);
          if (merged.length > 0) saveLocalCalendarEvents(merged);
        } else {
          setEvents(localEvents.length > 0 ? localEvents : SEED_EVENTS);
        }
      } catch (err) {
        console.error('[Calendar] Failed to load events from API:', err);
        setEvents(localEvents.length > 0 ? localEvents : SEED_EVENTS);
      } finally {
        setLoading(false);
        // Trigger fade-in on next tick so the DOM has painted at opacity 0 first
        requestAnimationFrame(() => setVisible(true));
      }
    }
    loadEvents();
  }, []);

  // Keep localStorage in sync whenever events change
  useEffect(() => {
    if (!loading && events.length > 0) {
      saveLocalCalendarEvents(events);
    }
  }, [events, loading]);

  // Build calendar grid (Sun → Sat, 6 weeks)
  const calDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 0 });
    const end   = endOfWeek(endOfMonth(currentMonth),     { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const selectedDayEvents = useMemo(
    () => events.filter(e => e.date === fmt(selectedDay)).sort((a, b) => (a.time || '').localeCompare(b.time || '')),
    [events, selectedDay],
  );

  const addEvent = async (event: Omit<CalEvent, 'id'>) => {
    try {
      const res = await fetch('/api/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: event.title,
          event_date: event.date,
          event_time: event.time,
          type: event.type,
          ai_scheduled: event.ai ?? false,
          note: event.note,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.event) {
          const saved = mapDbEventToCalEvent(data.event);
          setEvents(prev => {
            const next = [...prev, saved];
            saveLocalCalendarEvents(next);
            return next;
          });
          return;
        }
      }
      // If server returned non-persisted fallback or error, add locally
      setEvents(prev => {
        const next = [...prev, { ...event, id: `local-${Date.now()}` }];
        saveLocalCalendarEvents(next);
        return next;
      });
    } catch (err) {
      console.error('[Calendar] Failed to save event to API:', err);
      setEvents(prev => {
        const next = [...prev, { ...event, id: `local-${Date.now()}` }];
        saveLocalCalendarEvents(next);
        return next;
      });
    }
  };

  const removeEvent = async (id: string | number) => {
    setEvents(prev => {
      const next = prev.filter(e => e.id !== id);
      saveLocalCalendarEvents(next);
      return next;
    });

    if (typeof id === 'string' && !isLocalOnlyId(id)) {
      try {
        const res = await fetch(`/api/calendar?id=${id}`, {
          method: 'DELETE',
        });
        if (!res.ok) {
          console.error('[Calendar] API failed to delete event');
        }
      } catch (err) {
        console.error('[Calendar] Failed to delete event via API:', err);
      }
    }
  };

  const handleUpload = (data: any) => {
    const newEvents: CalEvent[] = (data.events || []).map((e: any, i: number) => ({
      id: `local-upload-${Date.now() + i}`,
      title: e.title,
      date: fmt(new Date(e.date)),
      type: 'ai' as EventType,
      ai: true,
    }));
    setEvents(prev => {
      const next = [...prev, ...newEvents];
      saveLocalCalendarEvents(next);
      return next;
    });
  };

  const openAddFor = (date: Date) => {
    setAddForDate(date);
    setShowAddModal(true);
  };

  if (loading) return <CalendarSkeleton />;

  return (
    <div
      className="max-w-5xl mx-auto py-8 px-0 transition-opacity duration-300"
      style={{ opacity: visible ? 1 : 0 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-8 px-1">
        <div>
          <h1 className="font-serif text-3xl text-[#27272A]">Calendar</h1>
          <p className="text-[#A1A1AA] text-sm mt-1">Agentic scheduling · Context Engine active</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowUpload(s => !s)}
            className="flex items-center gap-2 text-sm px-4 py-2 rounded-xl border border-[#E4E4E7] text-[#71717A] hover:border-[#27272A] hover:text-[#27272A] transition-colors"
          >
            <Sparkles className="w-4 h-4" /> Upload Syllabus
          </button>
          <button
            onClick={() => openAddFor(selectedDay)}
            className="flex items-center gap-2 text-sm px-4 py-2 rounded-xl bg-[#27272A] text-white hover:bg-[#3F3F46] transition-colors"
          >
            <Plus className="w-4 h-4" /> New Event
          </button>
        </div>
      </div>

      {/* Upload panel */}
      <AnimatePresence>
        {showUpload && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 overflow-hidden"
          >
            <FileUploadDialog onUploadSuccess={(data) => { handleUpload(data); setShowUpload(false); }} />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">

        {/* ── Calendar Grid ── */}
        <div className="bg-white border border-[#E4E4E7] rounded-2xl overflow-hidden shadow-sm">
          {/* Month nav */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#F4F4F5]">
            <h2 className="font-serif text-[#27272A] text-xl">{format(currentMonth, 'MMMM yyyy')}</h2>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentMonth(m => subMonths(m, 1))}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-[#71717A] hover:bg-[#F4F4F5] hover:text-[#27272A] transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentMonth(new Date())}
                className="px-3 h-8 text-xs font-medium rounded-lg text-[#71717A] hover:bg-[#F4F4F5] hover:text-[#27272A] transition-colors"
              >
                Today
              </button>
              <button
                onClick={() => setCurrentMonth(m => addMonths(m, 1))}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-[#71717A] hover:bg-[#F4F4F5] hover:text-[#27272A] transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 border-b border-[#F4F4F5]">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-[#A1A1AA]">{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7">
            {calDays.map((day, i) => {
              const dayEvents = events.filter(e => e.date === fmt(day));
              const isSelected = isSameDay(day, selectedDay);
              const _isToday = isToday(day);
              const inMonth = isSameMonth(day, currentMonth);

              return (
                <button
                  key={i}
                  onClick={() => { setSelectedDay(day); setCurrentMonth(day); }}
                  onDoubleClick={() => openAddFor(day)}
                  className={`relative min-h-[80px] p-1.5 border-b border-r border-[#F4F4F5] text-left transition-colors group
                    ${isSelected ? 'bg-[#FAFAF9]' : 'hover:bg-[#FAFAF9]'}
                    ${!inMonth ? 'opacity-35' : ''}
                  `}
                >
                  {/* Day number */}
                  <div className="flex items-start justify-between mb-1">
                    <span
                      className={`w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium transition-colors
                        ${_isToday ? 'bg-[#D97757] text-white font-semibold' : ''}
                        ${isSelected && !_isToday ? 'bg-[#27272A] text-white' : ''}
                        ${!isSelected && !_isToday ? 'text-[#3F3F46] group-hover:bg-[#F4F4F5]' : ''}
                      `}
                    >
                      {format(day, 'd')}
                    </span>
                    {/* Quick-add on hover */}
                    <span
                      onClick={(e) => { e.stopPropagation(); openAddFor(day); }}
                      className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center text-[#A1A1AA] hover:text-[#27272A] transition-all"
                    >
                      <Plus className="w-3 h-3" />
                    </span>
                  </div>

                  {/* Event dots / pills */}
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 3).map(ev => {
                      const s = TYPE_STYLES[ev.type];
                      return (
                        <div key={ev.id} className={`flex items-center gap-1 px-1 py-0.5 rounded text-[10px] border ${s.pill} ${s.text} truncate`}>
                          <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.dot}`} />
                          <span className="truncate leading-tight">{ev.title}</span>
                        </div>
                      );
                    })}
                    {dayEvents.length > 3 && (
                      <div className="text-[10px] text-[#A1A1AA] px-1">+{dayEvents.length - 3} more</div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Side Panel: Selected Day ── */}
        <div className="space-y-4">
          <div className="bg-white border border-[#E4E4E7] rounded-2xl overflow-hidden shadow-sm">
            {/* Selected day header */}
            <div className="px-5 py-4 border-b border-[#F4F4F5] flex justify-between items-center">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-[#A1A1AA]">
                  {format(selectedDay, 'EEEE')}
                </p>
                <p className="font-serif text-[#27272A] text-2xl">{format(selectedDay, 'MMMM d')}</p>
              </div>
              <button
                onClick={() => openAddFor(selectedDay)}
                className="w-8 h-8 rounded-full bg-[#F4F4F5] hover:bg-[#E4E4E7] flex items-center justify-center transition-colors"
              >
                <Plus className="w-4 h-4 text-[#71717A]" />
              </button>
            </div>

            {/* Events list */}
            <div className="divide-y divide-[#F4F4F5]">
              <AnimatePresence>
                {selectedDayEvents.length === 0 ? (
                  <div className="px-5 py-8 text-center text-[#A1A1AA] text-sm">
                    <p>No events</p>
                    <button
                      onClick={() => openAddFor(selectedDay)}
                      className="mt-2 text-[#D97757] text-xs hover:underline"
                    >
                      + Add one
                    </button>
                  </div>
                ) : selectedDayEvents.map(ev => {
                  const s = TYPE_STYLES[ev.type];
                  return (
                    <motion.div
                      key={ev.id}
                      layout
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -8 }}
                      className="flex items-start gap-3 px-5 py-3.5 group hover:bg-[#FAFAF9] transition-colors"
                    >
                      <div className={`w-2 h-2 rounded-full ${s.dot} mt-1.5 shrink-0`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium text-[#27272A] truncate">{ev.title}</p>
                          {ev.ai && <Sparkles className="w-3 h-3 text-violet-400 shrink-0" />}
                        </div>
                        {ev.time && (
                          <p className="text-xs text-[#A1A1AA] flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" /> {ev.time}
                          </p>
                        )}
                        {ev.note && <p className="text-xs text-[#71717A] mt-0.5 truncate">{ev.note}</p>}
                      </div>
                      <button
                        onClick={() => removeEvent(ev.id)}
                        className="opacity-0 group-hover:opacity-100 text-[#A1A1AA] hover:text-red-400 transition-all"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>

          {/* Legend */}
          <div className="bg-white border border-[#E4E4E7] rounded-2xl p-4 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#A1A1AA] mb-3">Legend</p>
            <div className="space-y-1.5">
              {(Object.entries(TYPE_STYLES) as [EventType, typeof TYPE_STYLES[EventType]][]).map(([type, s]) => (
                <div key={type} className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${s.dot}`} />
                  <span className="text-xs text-[#71717A] capitalize">{type === 'ai' ? 'AI Scheduled' : type}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Tip */}
          <div className="bg-[#FFFBF7] border border-[#F0E4D7] rounded-2xl p-4">
            <p className="text-[11px] text-[#A1A1AA] uppercase tracking-wider font-semibold mb-1">Tip</p>
            <p className="text-xs text-[#71717A] leading-relaxed">Double-click any day to quickly add an event. Upload your syllabus to let AI auto-schedule study blocks.</p>
          </div>
        </div>
      </div>

      {/* Add event modal */}
      <AnimatePresence>
        {showAddModal && (
          <AddEventModal
            date={addForDate}
            onAdd={addEvent}
            onClose={() => setShowAddModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
