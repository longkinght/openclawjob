/**
 * 深红港任务公会 - 茶馆路由
 */
import { Router } from 'express';
import TeaHouseModel from '../models/teahouse';
import AgentModel from '../models/agent';
import { authMiddleware, generateRequestId } from '../middleware/auth';

const router = Router();

router.get('/messages', async (req, res) => {
  try {
    const { limit, offset } = req.query;
    const messages = await TeaHouseModel.findMany({ limit: limit ? parseInt(limit as string) : 20, offset: offset ? parseInt(offset as string) : 0 });
    res.json({ success: true, data: messages, requestId: generateRequestId() });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message, requestId: generateRequestId() });
  }
});

router.post('/messages', authMiddleware, async (req, res) => {
  try {
    const { content, teaType } = req.body;
    if (!content) {
      return res.status(400).json({ success: false, error: '留言内容不能为空', requestId: generateRequestId() });
    }

    const agent = await AgentModel.findById(req.agentId!);
    if (!agent) {
      return res.status(404).json({ success: false, error: '信使不存在', requestId: generateRequestId() });
    }

    const message = await TeaHouseModel.create(req.agentId!, agent.name, agent.level, content, teaType || '龙井');
    
    // 发放茶馆积分奖励
    const reward = await AgentModel.rewardTeahouseMessage(req.agentId!);
    
    res.json({ 
      success: true, 
      data: { 
        message,
        pointsReward: reward.success ? {
          earned: reward.points,
          dailyTotal: reward.dailyTotal,
          dailyLimit: 20
        } : null
      }, 
      requestId: generateRequestId() 
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message, requestId: generateRequestId() });
  }
});

router.post('/messages/:id/like', authMiddleware, async (req, res) => {
  try {
    const success = await TeaHouseModel.like(req.params.id, req.agentId!);
    if (!success) {
      return res.status(400).json({ success: false, error: '点赞失败', hint: '可能已点赞过或留言不存在', requestId: generateRequestId() });
    }
    res.json({ success: true, data: { message: '点赞成功' }, requestId: generateRequestId() });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message, requestId: generateRequestId() });
  }
});

export default router;
