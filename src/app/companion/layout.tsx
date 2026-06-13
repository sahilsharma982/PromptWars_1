"use client";

import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Plus, MessageSquare, X, Trash2 } from 'lucide-react';
import {
  loadLocalConversations,
  deleteLocalConversation,
  type StoredConversation,
} from '@/lib/chatStorage';

function formatRelative(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

interface CompanionContextValue {
  conversations: StoredConversation[];
  activeId: string | null;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  refreshConversations: () => void;
}

const CompanionContext = createContext<CompanionContextValue>({
  conversations: [],
  activeId: null,
  sidebarOpen: false,
  setSidebarOpen: () => {},
  refreshConversations: () => {},
});

export function useCompanion() {
  return useContext(CompanionContext);
}

function ConversationList({
  conversations,
  activeId,
  onSelect,
  onDelete,
}: {
  conversations: StoredConversation[];
  activeId: string | null;
  onSelect?: () => void;
  onDelete?: (id: string) => void;
}) {
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirmingId === id) {
      onDelete?.(id);
      setConfirmingId(null);
    } else {
      setConfirmingId(id);
      setTimeout(() => setConfirmingId(ci => ci === id ? null : ci), 2500);
    }
  };

  if (conversations.length === 0) {
    return (
      <div className="px-4 py-8 text-center">
        <MessageSquare className="w-8 h-8 text-[#E4E4E7] mx-auto mb-2" />
        <p className="text-xs text-[#A1A1AA]">No conversations yet</p>
        <p className="text-[11px] text-[#D4D4D8] mt-1">Start a new chat to begin</p>
      </div>
    );
  }

  return (
    <div className="space-y-0.5 px-2">
      {conversations.map((conv) => {
        const isActive = activeId === conv.id;
        return (
          <div key={conv.id} className="relative group">
            <Link
              href={`/companion/${conv.id}`}
              onClick={onSelect}
              className={`block px-3 py-2.5 pr-8 rounded-xl text-left transition-all ${
                isActive
                  ? 'bg-white border border-[#E4E4E7] shadow-sm'
                  : 'hover:bg-white/60 border border-transparent'
              }`}
            >
              <p className={`text-[13px] font-medium truncate ${isActive ? 'text-[#27272A]' : 'text-[#3F3F46]'}`}>
                {conv.title}
              </p>
              <p className="text-[11px] text-[#A1A1AA] mt-0.5">{formatRelative(conv.updated_at)}</p>
            </Link>
            {/* Delete button with 2-step confirm */}
            <button
              onClick={(e) => handleDelete(e, conv.id)}
              className={`absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 rounded-md px-1.5 py-1 text-[10px] font-medium transition-all ${
                confirmingId === conv.id
                  ? 'opacity-100 bg-red-50 text-red-500 border border-red-200'
                  : 'opacity-0 group-hover:opacity-100 text-[#A1A1AA] hover:text-red-400 hover:bg-red-50'
              }`}
              title={confirmingId === conv.id ? 'Click again to confirm' : 'Delete conversation'}
            >
              <Trash2 className="w-3 h-3" />
              {confirmingId === conv.id && <span>Sure?</span>}
            </button>
          </div>
        );
      })}
    </div>
  );
}

function SidebarContent({
  conversations,
  activeId,
  onClose,
  onDelete,
}: {
  conversations: StoredConversation[];
  activeId: string | null;
  onClose?: () => void;
  onDelete?: (id: string) => void;
}) {
  return (
    <>
      <div className="px-3 pt-4 pb-3">
        <Link
          href="/companion"
          onClick={onClose}
          className="flex items-center justify-center gap-2 w-full px-3 py-2.5 rounded-xl text-sm font-medium bg-[#27272A] text-white hover:bg-[#3F3F46] transition-colors"
        >
          <Plus className="w-4 h-4" />
          New chat
        </Link>
      </div>

      <p className="text-[10px] font-semibold uppercase tracking-widest text-[#A1A1AA] px-5 mb-2">
        Recent
      </p>

      <div className="flex-1 overflow-y-auto scrollbar-hide pb-4">
        <ConversationList
          conversations={conversations}
          activeId={activeId}
          onSelect={onClose}
          onDelete={onDelete}
        />
      </div>
    </>
  );
}

export default function CompanionLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [conversations, setConversations] = useState<StoredConversation[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const loadConversations = useCallback(async () => {
    const local = loadLocalConversations();
    try {
      const res = await fetch('/api/conversations');
      if (res.ok) {
        const data = await res.json();
        const db = (data.conversations || []) as StoredConversation[];
        const byId = new Map<string, StoredConversation>();
        for (const c of local) byId.set(c.id, c);
        for (const c of db) byId.set(c.id, c);
        const merged = Array.from(byId.values()).sort(
          (a, b) => b.updated_at.localeCompare(a.updated_at),
        );
        setConversations(merged);
        return;
      }
    } catch {
      // fall through
    }
    setConversations(local);
  }, []);

  useEffect(() => {
    loadConversations();
    const onUpdate = () => loadConversations();
    window.addEventListener('companion:conversation-created', onUpdate);
    window.addEventListener('companion:conversation-updated', onUpdate);
    return () => {
      window.removeEventListener('companion:conversation-created', onUpdate);
      window.removeEventListener('companion:conversation-updated', onUpdate);
    };
  }, [loadConversations]);

  const activeId = pathname.startsWith('/companion/')
    ? pathname.split('/companion/')[1]?.split('/')[0] ?? null
    : null;

  const handleDelete = useCallback((id: string) => {
    deleteLocalConversation(id);
    setConversations(prev => prev.filter(c => c.id !== id));
    // Navigate away if we just deleted the active conversation
    if (id === activeId) {
      router.push('/companion');
    }
  }, [activeId, router]);

  const ctx: CompanionContextValue = {
    conversations,
    activeId,
    sidebarOpen,
    setSidebarOpen,
    refreshConversations: loadConversations,
  };

  return (
    <CompanionContext.Provider value={ctx}>
      <div className="max-w-6xl mx-auto flex gap-4 py-4 lg:py-6" style={{ height: 'calc(100vh - 3.5rem)' }}>
        {/* Desktop sidebar */}
        <aside className="hidden md:flex flex-col w-60 shrink-0 bg-[#F4F4F5]/50 border border-[#E4E4E7] rounded-2xl overflow-hidden">
          <SidebarContent conversations={conversations} activeId={activeId} onDelete={handleDelete} />
        </aside>

        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex">
            <div
              className="absolute inset-0 bg-black/30 backdrop-blur-sm"
              onClick={() => setSidebarOpen(false)}
            />
            <aside className="relative flex flex-col w-[min(280px,85vw)] h-full bg-[#FDFCF8] border-r border-[#E4E4E7] shadow-xl">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#E4E4E7]">
                <span className="font-serif text-sm font-semibold text-[#27272A]">Conversations</span>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-[#71717A] hover:bg-[#F4F4F5]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <SidebarContent
                conversations={conversations}
                activeId={activeId}
                onClose={() => setSidebarOpen(false)}
                onDelete={handleDelete}
              />
            </aside>
          </div>
        )}

        {/* Main chat panel */}
        <div className="flex-1 min-w-0 flex flex-col bg-white border border-[#E4E4E7] rounded-2xl shadow-sm overflow-hidden">
          {children}
        </div>
      </div>
    </CompanionContext.Provider>
  );
}
