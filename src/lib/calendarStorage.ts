/**
 * Client-side calendar persistence for when Supabase is unavailable.
 */

export interface StoredCalEvent {
  id: string | number;
  title: string;
  date: string;
  time?: string;
  type: 'study' | 'exam' | 'wellness' | 'deadline' | 'ai';
  ai?: boolean;
  note?: string;
}

const STORAGE_KEY = 'mindspace_calendar_events';

export function loadLocalCalendarEvents(): StoredCalEvent[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveLocalCalendarEvents(events: StoredCalEvent[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  } catch (err) {
    console.error('[calendarStorage] Failed to save:', err);
  }
}

export function mergeCalendarEvents(
  dbEvents: StoredCalEvent[],
  localEvents: StoredCalEvent[],
): StoredCalEvent[] {
  const byId = new Map<string | number, StoredCalEvent>();
  for (const e of localEvents) byId.set(e.id, e);
  for (const e of dbEvents) byId.set(e.id, e);
  return Array.from(byId.values()).sort((a, b) => {
    const dateCmp = a.date.localeCompare(b.date);
    if (dateCmp !== 0) return dateCmp;
    return (a.time || '').localeCompare(b.time || '');
  });
}

export function isLocalOnlyId(id: string | number): boolean {
  return typeof id === 'string' && (id.startsWith('local-') || id.startsWith('seed-'));
}
