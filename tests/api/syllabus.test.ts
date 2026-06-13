import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, PATCH, POST } from '@/app/api/syllabus/route';
import { callModel } from '@/lib/modelRouter';

vi.mock('@/lib/modelRouter', () => ({
  callModel: vi.fn(),
}));

const mockUpsert = vi.fn().mockResolvedValue({ error: null });
const mockSingle = vi.fn().mockResolvedValue({ data: null, error: null });

vi.mock('@/lib/supabaseClient', () => ({
  getAdminClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => ({
            limit: () => ({
              single: mockSingle,
            }),
          }),
        }),
      }),
      upsert: mockUpsert,
    }),
  }),
}));

describe('Syllabus API Endpoint', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('GET', () => {
    it('should return null tree if Supabase is unconfigured', async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = '';
      const response = await GET();
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body).toEqual({ tree: null, raw: null });
    });

    it('should return syllabus tree from database when present', async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://mock.supabase.co';
      const fakeSyllabus = { tree: [{ id: 'maths', name: 'Mathematics' }], raw_text: 'JEE maths' };
      mockSingle.mockResolvedValue({ data: fakeSyllabus, error: null });

      const response = await GET();
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body).toEqual({ tree: fakeSyllabus.tree, raw: fakeSyllabus.raw_text });
    });
  });

  describe('PATCH', () => {
    it('should return 400 for malformed payload (tree is not array)', async () => {
      const req = new NextRequest('http://localhost/api/syllabus', {
        method: 'PATCH',
        body: JSON.stringify({ tree: 'not-an-array' }),
      });

      const response = await PATCH(req);
      expect(response.status).toBe(400);

      const body = await response.json();
      expect(body.error).toBe('Invalid tree');
    });

    it('should return ok: true and upsert into database when tree is valid', async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://mock.supabase.co';
      const tree = [{ id: 'physics', name: 'Physics' }];
      const req = new NextRequest('http://localhost/api/syllabus', {
        method: 'PATCH',
        body: JSON.stringify({ tree, raw: 'Physics syllabus content' }),
      });

      const response = await PATCH(req);
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.ok).toBe(true);
      expect(mockUpsert).toHaveBeenCalled();
    });
  });

  describe('POST (AI parser)', () => {
    it('should return 400 if no content is provided', async () => {
      const req = new NextRequest('http://localhost/api/syllabus', {
        method: 'POST',
        body: JSON.stringify({ content: '' }),
      });

      const response = await POST(req);
      expect(response.status).toBe(400);

      const body = await response.json();
      expect(body.error).toContain('content provided');
    });

    it('should truncate input content to 4000 characters for security/DoS protection', async () => {
      const longContent = 'A'.repeat(5000);
      vi.mocked(callModel).mockResolvedValue({
        text: '[]',
        model: 'gemini-lite',
        provider: 'GEMINI',
        tier: 0,
      });

      const req = new NextRequest('http://localhost/api/syllabus', {
        method: 'POST',
        body: JSON.stringify({ content: longContent, save: false }),
      });

      await POST(req);

      // Verify callModel was called and prompt received only first 4000 characters of the content
      expect(callModel).toHaveBeenCalled();
      const callArg = vi.mocked(callModel).mock.calls[0][0];
      expect(callArg.userPrompt).toContain('A'.repeat(4000));
      expect(callArg.userPrompt).not.toContain('A'.repeat(4001));
    });

    it('should return parsed tree if AI response is valid JSON', async () => {
      const mockResultTree = [{ id: 'chemistry', name: 'Chemistry', type: 'subject' }];
      vi.mocked(callModel).mockResolvedValue({
        text: JSON.stringify(mockResultTree),
        model: 'gemini-lite',
        provider: 'GEMINI',
        tier: 0,
      });

      const req = new NextRequest('http://localhost/api/syllabus', {
        method: 'POST',
        body: JSON.stringify({ content: 'Chemistry syllabus text', save: false }),
      });

      const response = await POST(req);
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.tree).toEqual(mockResultTree);
      expect(body.model).toBe('gemini-lite');
    });

    it('should handle markdown-wrapped json from models', async () => {
      const mockResultTree = [{ id: 'chemistry', name: 'Chemistry', type: 'subject' }];
      vi.mocked(callModel).mockResolvedValue({
        text: '```json\n' + JSON.stringify(mockResultTree) + '\n```',
        model: 'gemini-lite',
        provider: 'GEMINI',
        tier: 0,
      });

      const req = new NextRequest('http://localhost/api/syllabus', {
        method: 'POST',
        body: JSON.stringify({ content: 'Chemistry syllabus text', save: false }),
      });

      const response = await POST(req);
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.tree).toEqual(mockResultTree);
    });

    it('should return 500 with descriptive error if AI returns malformed JSON', async () => {
      vi.mocked(callModel).mockResolvedValue({
        text: 'not-json-content',
        model: 'gemini-lite',
        provider: 'GEMINI',
        tier: 0,
      });

      const req = new NextRequest('http://localhost/api/syllabus', {
        method: 'POST',
        body: JSON.stringify({ content: 'Chemistry syllabus text', save: false }),
      });

      const response = await POST(req);
      expect(response.status).toBe(500);

      const body = await response.json();
      expect(body.error).toContain('AI returned invalid JSON');
    });
  });
});
