import request from 'supertest';
import { vi, describe, it, expect, beforeAll } from 'vitest';

// mock db pool to avoid real DB connections during tests
vi.mock('../../db/pool', () => ({
  initPool: vi.fn(),
  getPool: vi.fn(),
}));

// Mock KnowledgeService to return predictable fragments
vi.mock('../../services/knowledge.service', () => {
  return {
    KnowledgeService: class {
      async semanticSearch(_query: string, _topK = 3) {
        return [
          { id: '1', content: 'KB 片段一：康复的建议 A', metadata: {}, score: 0.1 },
          { id: '2', content: 'KB 片段二：康复的建议 B', metadata: {}, score: 0.2 },
        ];
      }
    },
  };
});

// Mock AIChatService to avoid calling external OpenAI API
vi.mock('../../services/ai-chat.service', () => {
  return {
    AIChatService: class {
      async askFSHDQuestion(req: any) {
        // verify that contextFragments is passed in
        if (Array.isArray(req.contextFragments) && req.contextFragments.length > 0) {
          return '基于知识库的回答（mock）';
        }
        return '普通回答（mock）';
      }
    },
  };
});

import express from 'express';
import { loadAppEnv } from '../../config/env';
import { createLogger } from '../../config/logger';
import { registerRoutes } from '../../routes/index';

let app: any;
beforeAll(() => {
  // set minimal env for server creation
  process.env.NODE_ENV = 'test';
  process.env.PORT = '4010';
  process.env.DATABASE_URL = 'postgres://postgres:postgres@localhost:5432/fshd_openrd_test';

  const env = loadAppEnv();
  const logger = createLogger(env);

  // Create a minimal express app and register routes directly to avoid initPool side-effects
  const server = express();
  server.use(express.json());
  registerRoutes(server, { env, logger });
  app = server;
});

describe('RAG AI Chat route', () => {
  it('returns answer using knowledge fragments', async () => {
    const res = await request(app)
      .post('/api/ai/ask_with_kb')
      .send({ question: '如何康复？' })
      .expect(200);

    expect(res.body).toHaveProperty('success', true);
    expect(res.body.data).toHaveProperty('answer', '基于知识库的回答（mock）');
    expect(res.body.data).toHaveProperty('kb_used', 2);
  });
});
