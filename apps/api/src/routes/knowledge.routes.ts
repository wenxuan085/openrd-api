import { Router } from 'express';
import { asyncHandler } from '../utils/async-handler.js';
import { KnowledgeService } from '../services/knowledge.service.js';

const router = Router();
const ks = new KnowledgeService();

// upsert 文档
router.post(
  '/upsert',
  asyncHandler(async (req, res) => {
    const { id, content, metadata } = req.body;
    if (!content) return res.status(400).json({ error: 'content required' });

    const docId = await ks.upsertDocument({ id, content, metadata });
    res.json({ id: docId });
  }),
);

// 语义检索
router.post(
  '/search',
  asyncHandler(async (req, res) => {
    const { query, top_k } = req.body;
    if (!query) return res.status(400).json({ error: 'query required' });

    const results = await ks.semanticSearch(query, top_k || 5);
    res.json({ results });
  }),
);

// 健康检查
router.get('/health', (_req, res) => {
  res.json({ service: 'Knowledge', status: 'active', timestamp: new Date().toISOString() });
});

export { router as knowledgeRoutes };
