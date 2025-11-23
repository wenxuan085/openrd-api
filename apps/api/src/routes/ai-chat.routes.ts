import { Router } from 'express';
import { AIChatService } from '../services/ai-chat.service';
import { KnowledgeService } from '../services/knowledge.service.js';
import { authenticate } from '../middleware/auth.js'; 

const router = Router();
const aiService = new AIChatService();
const knowledgeService = new KnowledgeService();

// AI问答接口
router.post('/ask', async (req, res) => {
  try {
    const { question, userContext } = req.body;
    
    if (!question) {
      return res.status(400).json({
        error: '问题不能为空'
      });
    }

    const answer = await aiService.askFSHDQuestion({
      question,
      userContext
    });

    res.json({
      success: true,
      data: {
        question,
        answer,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('AI问答API错误:', error);
    res.status(500).json({
      error: 'AI服务暂时不可用'
    });
  }
});

// RAG 问答：先从知识库检索，再把检索到的片段传给 LLM
router.post('/ask_with_kb', async (req, res) => {
  try {
    const { question, userContext, top_k } = req.body;
    if (!question) {
      return res.status(400).json({ error: '问题不能为空' });
    }

    // 先从知识库检索
    const fragments = await knowledgeService.semanticSearch(question, top_k || 3);
    const contextFragments = fragments.map((f: any) => f.content);

    const answer = await aiService.askFSHDQuestion({
      question,
      userContext,
      contextFragments,
    });

    res.json({
      success: true,
      data: {
        question,
        answer,
        kb_used: contextFragments.length,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('RAG API 错误:', error);
    res.status(500).json({ error: 'RAG 服务暂时不可用' });
  }
});

// 健康检查接口
router.get('/health', (req, res) => {
  res.json({
    service: 'AI Chat',
    status: 'active',
    timestamp: new Date().toISOString()
  });
});

export { router as aiChatRoutes };
