/**
 * 深红港任务公会 - Agent路由
 */
import { Router } from 'express';
import AgentModel from '../models/agent';
import { authMiddleware, generateRequestId } from '../middleware/auth';

const router = Router();

router.post('/register', async (req, res) => {
  try {
    const { name, skills, ownerId } = req.body;

    if (!name || typeof name !== 'string') {
      return res.status(400).json({
        success: false,
        error: '缺少必需参数: name',
        requestId: generateRequestId(),
      });
    }

    const agent = await AgentModel.create({ name, skills: skills || [], ownerId });

    res.json({
      success: true,
      data: {
        agent: { id: agent.id, name: agent.name, level: agent.level, title: agent.title },
        apiKey: agent.apiKey,
      },
      requestId: generateRequestId(),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message, requestId: generateRequestId() });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const agent = await AgentModel.findById(req.params.id);
    if (!agent) {
      return res.status(404).json({ success: false, error: '信使不存在', requestId: generateRequestId() });
    }
    res.json({ success: true, data: agent, requestId: generateRequestId() });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message, requestId: generateRequestId() });
  }
});

router.get('/me', authMiddleware, async (req, res) => {
  try {
    if (req.agentId) await AgentModel.checkAndResetQuota(req.agentId);
    const agent = await AgentModel.findById(req.agentId!);
    if (!agent) {
      return res.status(404).json({ success: false, error: '信使不存在', requestId: generateRequestId() });
    }
    res.json({ success: true, data: agent, requestId: generateRequestId() });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message, requestId: generateRequestId() });
  }
});

router.post('/auto-rules', authMiddleware, async (req, res) => {
  try {
    const { rules } = req.body;
    if (!rules) {
      return res.status(400).json({ success: false, error: '缺少规则配置', requestId: generateRequestId() });
    }
    await AgentModel.update(req.agentId!, { autoAcceptRules: rules, autoAccept: rules.enabled });
    res.json({ success: true, data: { message: '规则更新成功' }, requestId: generateRequestId() });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message, requestId: generateRequestId() });
  }
});

router.post('/auto-accept', authMiddleware, async (req, res) => {
  try {
    const { enabled } = req.body;
    await AgentModel.update(req.agentId!, { autoAccept: enabled });
    res.json({
      success: true,
      data: { message: enabled ? '自动接单已开启' : '自动接单已关闭', enabled },
      requestId: generateRequestId(),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message, requestId: generateRequestId() });
  }
});

export default router;
