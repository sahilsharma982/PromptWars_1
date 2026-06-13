import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  saveJournalEntry,
  getRecentJournalEntries,
  getCalendarEvents,
  createCalendarEvent,
  deleteCalendarEvent,
  getUserProfile,
  buildStudentContext,
} from '@/lib/db';

const mockFrom = vi.fn();
const mockInsert = vi.fn();
const mockSelect = vi.fn();
const mockSingle = vi.fn();
const mockEq = vi.fn();
const mockOrder = vi.fn();
const mockLimit = vi.fn();
const mockDelete = vi.fn();

vi.mock('@/lib/supabaseClient', () => {
  return {
    getAdminClient: () => ({
      from: mockFrom,
    }),
  };
});

describe('Database Helpers', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };

    // Reset all mock chains
    mockFrom.mockReset();
    mockInsert.mockReset();
    mockSelect.mockReset();
    mockSingle.mockReset();
    mockEq.mockReset();
    mockOrder.mockReset();
    mockLimit.mockReset();
    mockDelete.mockReset();

    // Setup base chain mapping
    mockFrom.mockReturnValue({
      insert: mockInsert,
      select: mockSelect,
      delete: mockDelete,
      update: vi.fn(),
      upsert: vi.fn(),
    });
    mockInsert.mockReturnValue({
      select: mockSelect,
    });
    mockSelect.mockReturnValue({
      single: mockSingle,
      eq: mockEq,
      order: mockOrder,
      limit: mockLimit,
    });
    mockEq.mockReturnValue({
      single: mockSingle,
      order: mockOrder,
      limit: mockLimit,
      eq: mockEq,
    });
    mockOrder.mockReturnValue({
      order: mockOrder,
      limit: mockLimit,
    });
    mockLimit.mockReturnValue(Promise.resolve({ data: [], error: null }));
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.clearAllMocks();
  });

  describe('Zero-Config Demo Mode (Supabase not configured)', () => {
    beforeEach(() => {
      // Empty Supabase URL signals "unconfigured"
      process.env.NEXT_PUBLIC_SUPABASE_URL = '';
    });

    it('should degrade saveJournalEntry gracefully', async () => {
      const result = await saveJournalEntry({
        user_id: '123',
        mood: 4,
        content: 'Feeling good',
        triggers: ['study'],
        support_message: 'Keep it up',
        strategies: ['break'],
      });
      expect(result).toBeNull();
      expect(mockFrom).not.toHaveBeenCalled();
    });

    it('should degrade getRecentJournalEntries to empty array', async () => {
      const result = await getRecentJournalEntries('123');
      expect(result).toEqual([]);
      expect(mockFrom).not.toHaveBeenCalled();
    });

    it('should degrade getCalendarEvents to empty array', async () => {
      const result = await getCalendarEvents('123');
      expect(result).toEqual([]);
      expect(mockFrom).not.toHaveBeenCalled();
    });
  });

  describe('Configured Mode (Supabase active)', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://mock.supabase.co';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-key';
    });

    it('should call select and insert with correct values on saveJournalEntry', async () => {
      const entry = {
        user_id: 'test-user',
        mood: 5,
        content: 'Excited',
        triggers: ['exam'],
        support_message: 'Go win!',
        strategies: ['breath'],
      };

      const mockSingleResult = { data: { id: 'journal-1', ...entry }, error: null };
      mockSelect.mockReturnValue({ single: mockSingle });
      mockSingle.mockResolvedValue(mockSingleResult);

      const result = await saveJournalEntry(entry);

      expect(mockFrom).toHaveBeenCalledWith('journal_entries');
      expect(mockInsert).toHaveBeenCalledWith(entry);
      expect(result).toEqual({ id: 'journal-1', ...entry });
    });

    it('should return empty list when getRecentJournalEntries is called but DB query fails', async () => {
      mockLimit.mockResolvedValue({ data: null, error: { message: 'DB Error' } });

      const result = await getRecentJournalEntries('test-user');
      expect(result).toEqual([]);
    });

    it('should delete calendar events successfully', async () => {
      mockDelete.mockReturnValue({ eq: mockEq });
      mockEq.mockResolvedValue({ error: null });

      const ok = await deleteCalendarEvent('event-123');
      expect(ok).toBe(true);
      expect(mockFrom).toHaveBeenCalledWith('calendar_events');
      expect(mockDelete).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith('id', 'event-123');
    });
  });

  describe('Context Engine Builder', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://mock.supabase.co';
    });

    it('should compile correct student context structure', async () => {
      // Setup mock queries for profile, journal, calendar, materials
      mockSingle.mockResolvedValue({
        data: { id: 'user-1', name: 'Sahil', target_exam: 'JEE', weaknesses: ['Maths'] },
        error: null,
      });

      // Journals mock resolver (7 limit)
      mockLimit.mockResolvedValue({
        data: [
          { mood: 3, content: 'Tired', created_at: '2026-06-13T10:00:00Z' },
        ],
        error: null,
      });

      // Calendar mock resolver (getCalendarEvents)
      // Since it retrieves all, it doesn't chain limit, it just resolves directly on select/eq/order
      mockOrder.mockReturnValue(Promise.resolve({
        data: [
          { title: 'Physics exam', event_date: '2026-06-15', event_time: '10:00', type: 'exam', ai_scheduled: false },
        ],
        error: null,
      }));

      const context = await buildStudentContext('user-1');

      expect(context.profile.name).toBe('Sahil');
      expect(context.profile.target_exam).toBe('JEE');
      expect(context.profile.weaknesses).toEqual(['Maths']);
      expect(context.mood_history).toEqual([
        { date: '2026-06-13', score: 3, note: 'Tired' },
      ]);
      expect(context.upcoming_events).toEqual([
        { title: 'Physics exam', date: '2026-06-15' },
      ]);
    });
  });
});
