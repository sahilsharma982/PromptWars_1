"use client";

import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Plus, BookOpen, X } from 'lucide-react';
import {
  loadLocalJournalEntries,
  mergeJournalEntries,
  type StoredJournalEntry,
} from '@/lib/journalStorage';

const MOODS: Record<number, string> = {
  1: '😞', 2: '😔', 3: '😟', 4: '😐', 5: '🙂',
  6: '😊', 7: '😄', 8: '🤩', 9: '🥳', 10: '🚀',
};

function formatEntryDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();

  if (isToday) return 'Today';
  if (isYesterday) return 'Yesterday';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatEntryTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

interface JournalContextValue {
  entries: StoredJournalEntry[];
  activeId: string | null;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  refreshEntries: () => void;
}

const JournalContext = createContext<JournalContextValue>({
  entries: [],
  activeId: null,
  sidebarOpen: false,
  setSidebarOpen: () => {},
  refreshEntries: () => {},
});

export function useJournal() {
  return useContext(JournalContext);
}

function mapDbEntry(e: Record<string, unknown>): StoredJournalEntry {
  return {
    id: String(e.id),
    mood: Number(e.mood),
    content: String(e.content),
    triggers: (e.triggers as string[]) ?? [],
    support_message: (e.support_message as string | null) ?? null,
    strategies: (e.strategies as string[]) ?? [],
    created_at: String(e.created_at),
  };
}

function EntryList({
  entries,
  activeId,
  onSelect,
}: {
  entries: StoredJournalEntry[];
  activeId: string | null;
  onSelect?: () => void;
}) {
  if (entries.length === 0) {
    return (
      <div className="px-4 py-8 text-center">
        <BookOpen className="w-8 h-8 text-[#E4E4E7] mx-auto mb-2" />
        <p className="text-xs text-[#A1A1AA]">No entries yet</p>
        <p className="text-[11px] text-[#D4D4D8] mt-1">Write your first reflection</p>
      </div>
    );
  }

  return (
    <div className="space-y-0.5 px-2">
      {entries.map((entry) => {
        const isActive = activeId === entry.id;
        const preview = entry.content.trim().slice(0, 60) + (entry.content.length > 60 ? '…' : '');
        return (
          <Link
            key={entry.id}
            href={`/journal/${entry.id}`}
            onClick={onSelect}
            className={`block px-3 py-2.5 rounded-xl text-left transition-all ${
              isActive
                ? 'bg-white border border-[#E4E4E7] shadow-sm'
                : 'hover:bg-white/60 border border-transparent'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-base leading-none">{MOODS[entry.mood] ?? '🙂'}</span>
              <span className="text-[11px] text-[#A1A1AA]">
                {formatEntryDate(entry.created_at)} · {formatEntryTime(entry.created_at)}
              </span>
            </div>
            <p className={`text-[13px] truncate ${isActive ? 'text-[#27272A] font-medium' : 'text-[#52525B]'}`}>
              {preview || 'Empty entry'}
            </p>
            <p className="text-[10px] text-[#A1A1AA] mt-0.5">Mood {entry.mood}/10</p>
          </Link>
        );
      })}
    </div>
  );
}

function SidebarContent({
  entries,
  activeId,
  onClose,
}: {
  entries: StoredJournalEntry[];
  activeId: string | null;
  onClose?: () => void;
}) {
  return (
    <>
      <div className="px-3 pt-4 pb-3">
        <Link
          href="/journal"
          onClick={onClose}
          className="flex items-center justify-center gap-2 w-full px-3 py-2.5 rounded-xl text-sm font-medium bg-[#27272A] text-white hover:bg-[#3F3F46] transition-colors"
        >
          <Plus className="w-4 h-4" />
          New entry
        </Link>
      </div>

      <p className="text-[10px] font-semibold uppercase tracking-widest text-[#A1A1AA] px-5 mb-2">
        History
      </p>

      <div className="flex-1 overflow-y-auto scrollbar-hide pb-4">
        <EntryList entries={entries} activeId={activeId} onSelect={onClose} />
      </div>
    </>
  );
}

export default function JournalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [entries, setEntries] = useState<StoredJournalEntry[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const loadEntries = useCallback(async () => {
    const local = loadLocalJournalEntries();
    try {
      const res = await fetch('/api/journal');
      if (res.ok) {
        const data = await res.json();
        const db = (data.entries || []).map(mapDbEntry);
        setEntries(mergeJournalEntries(db, local));
        return;
      }
    } catch {
      // fall through
    }
    setEntries(local);
  }, []);

  useEffect(() => {
    loadEntries();
    const onUpdate = () => loadEntries();
    window.addEventListener('journal:entry-saved', onUpdate);
    return () => window.removeEventListener('journal:entry-saved', onUpdate);
  }, [loadEntries]);

  const activeId = pathname.startsWith('/journal/')
    ? pathname.split('/journal/')[1]?.split('/')[0] ?? null
    : null;

  const ctx: JournalContextValue = {
    entries,
    activeId,
    sidebarOpen,
    setSidebarOpen,
    refreshEntries: loadEntries,
  };

  return (
    <JournalContext.Provider value={ctx}>
      <div className="max-w-6xl mx-auto flex gap-4 py-4 lg:py-6" style={{ minHeight: 'calc(100vh - 3.5rem)' }}>
        <aside className="hidden md:flex flex-col w-60 shrink-0 bg-[#F4F4F5]/50 border border-[#E4E4E7] rounded-2xl overflow-hidden">
          <SidebarContent entries={entries} activeId={activeId} />
        </aside>

        {sidebarOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex">
            <div
              className="absolute inset-0 bg-black/30 backdrop-blur-sm"
              onClick={() => setSidebarOpen(false)}
            />
            <aside className="relative flex flex-col w-[min(280px,85vw)] h-full bg-[#FDFCF8] border-r border-[#E4E4E7] shadow-xl">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#E4E4E7]">
                <span className="font-serif text-sm font-semibold text-[#27272A]">Journal History</span>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-[#71717A] hover:bg-[#F4F4F5]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <SidebarContent
                entries={entries}
                activeId={activeId}
                onClose={() => setSidebarOpen(false)}
              />
            </aside>
          </div>
        )}

        <div className="flex-1 min-w-0">
          {children}
        </div>
      </div>
    </JournalContext.Provider>
  );
}
