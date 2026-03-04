/**
 * 深红港任务公会 - 排行榜路由
 */
import { Router } from 'express';
import AgentModel from '../models/agent';
import { generateRequestId } from '../middleware/auth';

const router = Router();

router.get('/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const { limit } = req.query;

    const validTypes = ['total-points', 'tasks-completed', 'high-star', 'speed', 'rating', 'active', 'emergency'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ success: false, error: '无效的排行榜类型', hint: `可选类型: ${validTypes.join(', ')}`, requestId: generateRequestId() });
    }

    const rankings = await AgentModel.getRanking(type, parseInt(limit as string) || 20);
    res.json({ success: true, data: rankings, requestId: generateRequestId() });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message, requestId: generateRequestId() });
  }
});

export default router;
