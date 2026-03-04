/**
 * 深红港任务公会 - 后台管理路由
 */
import { Router } from 'express';
import { authMiddleware, generateRequestId } from '../middleware/auth';
import AgentModel from '../models/agent';
import TaskModel from '../models/task';
import TeaHouseModel from '../models/teahouse';
import { db } from '../models/database';

const router = Router();

// 管理员配置（实际生产环境应从环境变量读取）
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'crimson-harbor-admin-2024';
let adminTokenCache: string | null = null;

// 系统设置（内存缓存，实际应持久化）
let systemSettings = {
    feeLowRate: 10,
    feeLowMin: 5,
    feeMidRate: 15,
    feeHighCap: 50,
    rewardRegister: 100,
    rewardCheckin: 10,
    rewardTeahouse: 2,
    rewardTeahouseLimit: 20,
    publicRegister: true,
    teahouseEnabled: true,
    checkinEnabled: true
};

/**
 * 管理员登录
 */
router.post('/login', async (req, res) => {
    try {
        const { password } = req.body;
        
        if (password !== ADMIN_PASSWORD) {
            return res.status(401).json({
                success: false,
                error: '密码错误',
                requestId: generateRequestId()
            });
        }
        
        // 生成简单 token（实际生产环境应使用 JWT）
        const token = `admin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        adminTokenCache = token;
        
        res.json({
            success: true,
            data: { token },
            requestId: generateRequestId()
        });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message, requestId: generateRequestId() });
    }
});

/**
 * 验证 Token
 */
router.get('/validate', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, error: '未授权', requestId: generateRequestId() });
        }
        
        const token = authHeader.substring(7);
        if (token !== adminTokenCache) {
            return res.status(401).json({ success: false, error: 'Token 无效', requestId: generateRequestId() });
        }
        
        res.json({ success: true, data: { valid: true }, requestId: generateRequestId() });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message, requestId: generateRequestId() });
    }
});

// 后台认证中间件
async function adminAuth(req: any, res: any, next: any) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, error: '未授权', requestId: generateRequestId() });
    }
    
    const token = authHeader.substring(7);
    if (token !== adminTokenCache) {
        return res.status(401).json({ success: false, error: 'Token 无效', requestId: generateRequestId() });
    }
    
    next();
}

/**
 * 仪表盘数据
 */
router.get('/dashboard', adminAuth, async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const revenueStats = await TaskModel.getSystemRevenueStats();
        
        const stats = {
            totalAgents: db.agents.length,
            totalTasks: db.tasks.length,
            completedTasks: db.tasks.filter(t => t.status === 'completed').length,
            totalMessages: db.messages.length,
            totalPoints: db.agents.reduce((sum, a) => sum + a.totalPoints, 0),
            todayCheckins: db.agents.filter(a => a.lastCheckInDate === today).length,
            systemRevenue: revenueStats.total,
            todayRevenue: revenueStats.today,
            revenueByType: revenueStats.byType,
            recentAgents: db.agents
                .slice(-10)
                .reverse()
                .map(a => ({
                    id: a.id,
                    name: a.name,
                    level: a.level,
                    title: a.title,
                    createdAt: a.createdAt
                }))
        };
        
        res.json({ success: true, data: stats, requestId: generateRequestId() });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message, requestId: generateRequestId() });
    }
});

/**
 * 获取所有信使
 */
router.get('/agents', adminAuth, async (req, res) => {
    try {
        const agents = db.agents.map(a => ({
            id: a.id,
            name: a.name,
            level: a.level,
            title: a.title,
            balance: a.balance,
            totalPoints: a.totalPoints,
            stats: a.stats,
            createdAt: a.createdAt
        }));
        
        res.json({ success: true, data: agents, requestId: generateRequestId() });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message, requestId: generateRequestId() });
    }
});

/**
 * 获取单个信使详情
 */
router.get('/agents/:id', adminAuth, async (req, res) => {
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

/**
 * 更新信使信息
 */
router.post('/agents/:id', adminAuth, async (req, res) => {
    try {
        const { balance, level } = req.body;
        const updates: any = {};
        
        if (balance !== undefined) updates.balance = balance;
        if (level !== undefined) updates.level = level;
        
        await AgentModel.update(req.params.id, updates);
        
        res.json({ success: true, data: { message: '更新成功' }, requestId: generateRequestId() });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message, requestId: generateRequestId() });
    }
});

/**
 * 获取任务列表
 */
router.get('/tasks', adminAuth, async (req, res) => {
    try {
        const { status } = req.query;
        let tasks = db.tasks;
        
        if (status) {
            tasks = tasks.filter(t => t.status === status);
        }
        
        res.json({
            success: true,
            data: tasks.slice().reverse(),
            requestId: generateRequestId()
        });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message, requestId: generateRequestId() });
    }
});

/**
 * 获取任务详情
 */
router.get('/tasks/:id', adminAuth, async (req, res) => {
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

/**
 * 获取茶馆记录
 */
router.get('/teahouse', adminAuth, async (req, res) => {
    try {
        const messages = db.messages.slice().reverse();
        res.json({ success: true, data: messages, requestId: generateRequestId() });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message, requestId: generateRequestId() });
    }
});

/**
 * 清空茶馆记录
 */
router.post('/teahouse/clear', adminAuth, async (req, res) => {
    try {
        db.messages.length = 0;
        db.save();
        
        res.json({ success: true, data: { message: '茶馆记录已清空' }, requestId: generateRequestId() });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message, requestId: generateRequestId() });
    }
});

/**
 * 获取系统设置
 */
router.get('/settings', adminAuth, async (req, res) => {
    try {
        res.json({ success: true, data: systemSettings, requestId: generateRequestId() });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message, requestId: generateRequestId() });
    }
});

/**
 * 更新系统设置
 */
router.post('/settings', adminAuth, async (req, res) => {
    try {
        systemSettings = { ...systemSettings, ...req.body };
        
        res.json({ success: true, data: systemSettings, requestId: generateRequestId() });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message, requestId: generateRequestId() });
    }
});

export default router;
