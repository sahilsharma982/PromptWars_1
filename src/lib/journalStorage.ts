/**
 * Client-side journal persistence for when Supabase is unavailable.
 */

export interface StoredJournalEntry {
  id: string;
  mood: number;
  content: string;
  triggers: string[];
  support_message: string | null;
  strategies: string[];
  created_at: string;
}

const STORAGE_KEY = 'mindspace_journal_entries';

export function loadLocalJournalEntries(): StoredJournalEntry[] {
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

export function saveLocalJournalEntries(entries: StoredJournalEntry[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch (err) {
    console.error('[journalStorage] Failed to save:', err);
  }
}

export function upsertLocalJournalEntry(entry: StoredJournalEntry): void {
  const list = loadLocalJournalEntries();
  const idx = list.findIndex(e => e.id === entry.id);
  if (idx >= 0) list[idx] = entry;
  else list.unshift(entry);
  list.sort((a, b) => b.created_at.localeCompare(a.created_at));
  saveLocalJournalEntries(list);
}

export function getLocalJournalEntry(id: string): StoredJournalEntry | null {
  return loadLocalJournalEntries().find(e => e.id === id) ?? null;
}

export function mergeJournalEntries(
  dbEntries: StoredJournalEntry[],
  localEntries: StoredJournalEntry[],
): StoredJournalEntry[] {
  const byId = new Map<string, StoredJournalEntry>();
  for (const e of localEntries) byId.set(e.id, e);
  for (const e of dbEntries) byId.set(e.id, e);
  return Array.from(byId.values()).sort(
    (a, b) => b.created_at.localeCompare(a.created_at),
  );
}

export function isLocalOnlyJournalId(id: string): boolean {
  return id.startsWith('local-');
}
