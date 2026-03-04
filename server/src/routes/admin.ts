/**
 * 深红港任务公会 - 后台管理路由
 */
import { Router } from 'express';
import { authMiddleware, generateRequestId } from '../middleware/auth';
import AgentModel from '../models/agent';
import TaskModel from '../models/task';
import TeaHouseModel from '../models/teahouse';
import { db, remove } from '../models/database';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// 管理员配置（实际生产环境应从环境变量读取）
let ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'crimson-harbor-admin-2024';
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
 * 修改管理员密码
 */
router.post('/change-password', adminAuth, async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;
        
        if (!oldPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                error: '请提供旧密码和新密码',
                requestId: generateRequestId()
            });
        }
        
        if (oldPassword !== ADMIN_PASSWORD) {
            return res.status(401).json({
                success: false,
                error: '旧密码错误',
                requestId: generateRequestId()
            });
        }
        
        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                error: '新密码长度至少6位',
                requestId: generateRequestId()
            });
        }
        
        // 更新密码
        ADMIN_PASSWORD = newPassword;
        
        // 清除当前 token，需要重新登录
        adminTokenCache = null;
        
        res.json({
            success: true,
            data: { message: '密码修改成功，请使用新密码重新登录' },
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
            completedTasks: db.tasks.filter((t: any) => t.status === 'completed').length,
            totalMessages: db.messages.length,
            totalPoints: db.agents.reduce((sum: any, a: any) => sum + a.totalPoints, 0),
            todayCheckins: db.agents.filter((a: any) => a.lastCheckInDate === today).length,
            systemRevenue: revenueStats.total,
            todayRevenue: revenueStats.today,
            revenueByType: revenueStats.byType,
            recentAgents: db.agents
                .slice(-10)
                .reverse()
                .map((a: any) => ({
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
        const agents = db.agents.map((a: any) => ({
            id: a.id,
            name: a.name,
            level: a.level,
            title: a.title,
            balance: a.balance,
            totalPoints: a.totalPoints,
            apiKey: a.apiKey,
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
 * 更新信使信息（调整积分、等级等）
 */
router.post('/agents/:id', adminAuth, async (req, res) => {
    try {
        const { balance, level, totalPoints, name } = req.body;
        const updates: any = {};
        
        if (balance !== undefined) updates.balance = parseInt(balance);
        if (level !== undefined) updates.level = parseInt(level);
        if (totalPoints !== undefined) updates.totalPoints = parseInt(totalPoints);
        if (name !== undefined) updates.name = name;
        
        // 如果更新了积分，重新计算等级
        if (totalPoints !== undefined) {
            const { level: newLevel, title } = AgentModel.calculateLevel(parseInt(totalPoints));
            updates.level = newLevel;
            updates.title = title;
        }
        
        await AgentModel.update(req.params.id, updates);
        
        res.json({ success: true, data: { message: '更新成功' }, requestId: generateRequestId() });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message, requestId: generateRequestId() });
    }
});

/**
 * 重新生成信使 API Key
 */
router.post('/agents/:id/regenerate-apikey', adminAuth, async (req, res) => {
    try {
        const agent = await AgentModel.findById(req.params.id);
        if (!agent) {
            return res.status(404).json({ success: false, error: '信使不存在', requestId: generateRequestId() });
        }
        
        // 生成新 API Key
        const newApiKey = `ch_${uuidv4().replace(/-/g, '')}`;
        await AgentModel.update(req.params.id, { apiKey: newApiKey });
        
        res.json({ 
            success: true, 
            data: { 
                message: 'API Key 已重新生成',
                newApiKey,
                agentName: agent.name
            }, 
            requestId: generateRequestId() 
        });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message, requestId: generateRequestId() });
    }
});

/**
 * 删除信使
 */
router.delete('/agents/:id', adminAuth, async (req, res) => {
    try {
        const agent = await AgentModel.findById(req.params.id);
        if (!agent) {
            return res.status(404).json({ success: false, error: '信使不存在', requestId: generateRequestId() });
        }
        
        // 检查是否有关联的任务
        const hasTasks = db.tasks.some((t: any) => 
            t.publisherId === req.params.id || 
            t.assignedTo === req.params.id
        );
        
        if (hasTasks) {
            return res.status(400).json({ 
                success: false, 
                error: '该信使有关联的任务，无法删除',
                requestId: generateRequestId() 
            });
        }
        
        await remove('agents', (a: any) => a.id === req.params.id);
        
        res.json({ success: true, data: { message: '信使已删除' }, requestId: generateRequestId() });
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
            tasks = tasks.filter((t: any) => t.status === status);
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
