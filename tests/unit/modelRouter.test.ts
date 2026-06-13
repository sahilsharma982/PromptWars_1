import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { callModel, resolveTier, getMode } from '@/lib/modelRouter';
import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';

const generateMock = vi.fn().mockResolvedValue({
  text: '{"result": "gemini mock response"}',
});

const createMock = vi.fn().mockResolvedValue({
  choices: [
    {
      message: {
        content: '{"result": "openai mock response"}',
      },
    },
  ],
});

vi.mock('@google/genai', () => {
  return {
    GoogleGenAI: class {
      models = {
        generateContent: generateMock,
      };
    },
  };
});

vi.mock('openai', () => {
  return {
    default: class {
      chat = {
        completions: {
          create: createMock,
        },
      };
    },
  };
});

describe('modelRouter', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.clearAllMocks();
  });

  describe('resolveTier', () => {
    it('should resolve heavy/2 to tier 2', () => {
      expect(resolveTier('heavy')).toBe(2);
      expect(resolveTier('2')).toBe(2);
      expect(resolveTier(' HEAVY ')).toBe(2);
    });

    it('should resolve standard/1 to tier 1', () => {
      expect(resolveTier('standard')).toBe(1);
      expect(resolveTier('1')).toBe(1);
      expect(resolveTier(null)).toBe(1);
      expect(resolveTier(undefined)).toBe(1);
    });

    it('should resolve light/0 and unknowns to tier 0', () => {
      expect(resolveTier('light')).toBe(0);
      expect(resolveTier('0')).toBe(0);
      expect(resolveTier('unknown-tier')).toBe(0);
    });
  });

  describe('getMode', () => {
    it('should return USE_MODE if valid', () => {
      process.env.USE_MODE = 'NIM';
      expect(getMode()).toBe('NIM');

      process.env.USE_MODE = 'GEMINI';
      expect(getMode()).toBe('GEMINI');

      process.env.USE_MODE = 'OPENAI';
      expect(getMode()).toBe('OPENAI');
    });

    it('should fallback to GEMINI if invalid or missing', () => {
      process.env.USE_MODE = 'INVALID';
      expect(getMode()).toBe('GEMINI');

      delete process.env.USE_MODE;
      expect(getMode()).toBe('GEMINI');
    });
  });

  describe('callModel', () => {
    it('should correctly call Gemini when mode is GEMINI', async () => {
      process.env.USE_MODE = 'GEMINI';
      process.env.GEMINI_MODELS = 'gemini-lite,gemini-standard,gemini-pro';
      process.env.GEMINI_API_KEY = 'mock-key';

      const result = await callModel({
        userPrompt: 'Hello Gemini',
        tier: 1,
        jsonMode: true,
      });

      expect(result.provider).toBe('GEMINI');
      expect(result.model).toBe('gemini-standard');
      expect(result.tier).toBe(1);
      expect(result.text).toBe('{"result": "gemini mock response"}');
    });

    it('should correctly call OpenAI when mode is OPENAI', async () => {
      process.env.USE_MODE = 'OPENAI';
      process.env.OPENAI_MODELS = 'gpt-light,gpt-standard,gpt-heavy';
      process.env.OPENAI_KEY = 'mock-key';

      const result = await callModel({
        userPrompt: 'Hello OpenAI',
        tier: 2,
        jsonMode: true,
      });

      expect(result.provider).toBe('OPENAI');
      expect(result.model).toBe('gpt-heavy');
      expect(result.tier).toBe(2);
      expect(result.text).toBe('{"result": "openai mock response"}');
    });

    it('should correctly call NIM when mode is NIM', async () => {
      process.env.USE_MODE = 'NIM';
      process.env.NIM_MODELS = 'nim-light,nim-standard,nim-heavy';
      process.env.NIM_API_KEY = 'mock-key';

      const result = await callModel({
        userPrompt: 'Hello NIM',
        tier: 0,
        jsonMode: false,
      });

      expect(result.provider).toBe('NIM');
      expect(result.model).toBe('nim-light');
      expect(result.tier).toBe(0);
      expect(result.text).toBe('{"result": "openai mock response"}');
    });
  });
});
