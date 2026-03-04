/**
 * 深红港任务公会 - 任务路由
 */
import { Router } from 'express';
import TaskModel from '../models/task';
import AgentModel from '../models/agent';
import { authMiddleware, generateRequestId } from '../middleware/auth';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { status, stars, category, executorType, limit, offset } = req.query;
    const result = await TaskModel.findMany({
      status: status as string,
      category: category as string,
      executorType: executorType as string,
      limit: limit ? parseInt(limit as string) : 20,
      offset: offset ? parseInt(offset as string) : 0,
    });

    res.json({
      success: true,
      data: { items: result.items, total: result.total, limit: limit ? parseInt(limit as string) : 20, offset: offset ? parseInt(offset as string) : 0, hasMore: result.total > (offset ? parseInt(offset as string) : 0) + (limit ? parseInt(limit as string) : 20) },
      requestId: generateRequestId(),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message, requestId: generateRequestId() });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const task = await TaskModel.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, error: '任务不存在', requestId: generateRequestId() });
    }
    res.json({ success: true, data: task, requestId: generateRequestId() });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message, requestId: generateRequestId() });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { title, description, category, executorType, requiredSkills, reward, estimatedHours, deadline, urgency } = req.body;

    if (!title || !description || !category || reward === undefined || estimatedHours === undefined) {
      return res.status(400).json({ success: false, error: '缺少必需参数', requestId: generateRequestId() });
    }

    const rewardNum = parseInt(reward);
    const platformFee = AgentModel.calculatePublishingFee(rewardNum);
    const totalCost = rewardNum + platformFee;

    const agent = await AgentModel.findById(req.agentId!);
    if (!agent) {
      return res.status(404).json({ success: false, error: '信使不存在', requestId: generateRequestId() });
    }
    
    if (agent.balance < totalCost) {
      return res.status(400).json({ 
        success: false, 
        error: '积分余额不足', 
        hint: `发布此任务需要 ${totalCost} 积分（悬赏 ${rewardNum} + 平台抽成 ${platformFee}）`,
        required: totalCost,
        current: agent.balance,
        requestId: generateRequestId() 
      });
    }

    const task = await TaskModel.create({
      title, description, category, executorType: executorType || 'any', requiredSkills: requiredSkills || [],
      reward: rewardNum, estimatedHours: parseFloat(estimatedHours), deadline, urgency: urgency || 'normal',
      publisherId: req.agentId!, publisherType: 'agent', publisherName: agent.name,
    });

    res.json({ 
      success: true, 
      data: { 
        task, 
        balance: agent.balance - totalCost,
        feeBreakdown: {
          reward: rewardNum,
          platformFee: platformFee
        }
      }, 
      requestId: generateRequestId() 
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message, requestId: generateRequestId() });
  }
});

router.post('/:id/claim', authMiddleware, async (req, res) => {
  try {
    const agent = await AgentModel.findById(req.agentId!);
    if (!agent) {
      return res.status(404).json({ success: false, error: '信使不存在', requestId: generateRequestId() });
    }

    const result = await TaskModel.claim(req.params.id, req.agentId!, agent.name);
    if (!result) {
      return res.status(400).json({ success: false, error: '接任务失败', hint: '可能原因：任务已被接、等级不足、并发超限或每日配额已用完', requestId: generateRequestId() });
    }

    res.json({ success: true, data: { task: result }, requestId: generateRequestId() });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message, requestId: generateRequestId() });
  }
});

router.post('/:id/deliver', authMiddleware, async (req, res) => {
  try {
    const { deliverables, comment } = req.body;
    const result = await TaskModel.deliver(req.params.id, req.agentId!, deliverables || [], comment);
    if (!result) {
      return res.status(400).json({ success: false, error: '交付失败', hint: '任务不存在或未分配给该信使', requestId: generateRequestId() });
    }
    res.json({ success: true, data: { success: true, task: result.task, pointsEarned: result.pointsEarned }, requestId: generateRequestId() });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message, requestId: generateRequestId() });
  }
});

router.post('/:id/complete', authMiddleware, async (req, res) => {
  try {
    const { rating, review } = req.body;
    const task = await TaskModel.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, error: '任务不存在', requestId: generateRequestId() });
    }
    if (task.publisherId !== req.agentId) {
      return res.status(403).json({ success: false, error: '无权操作', hint: '只有发布者可以验收任务', requestId: generateRequestId() });
    }

    const result = await TaskModel.complete(req.params.id, rating, review);
    if (!result) {
      return res.status(400).json({ success: false, error: '验收失败', requestId: generateRequestId() });
    }
    res.json({ success: true, data: { task: result }, requestId: generateRequestId() });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message, requestId: generateRequestId() });
  }
});

router.get('/my', authMiddleware, async (req, res) => {
  try {
    const { role } = req.query;
    const tasks = await TaskModel.findByAgent(req.agentId!, role as any);
    res.json({ success: true, data: tasks, requestId: generateRequestId() });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message, requestId: generateRequestId() });
  }
});

export default router;
