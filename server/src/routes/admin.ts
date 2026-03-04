/**
 * 深红港任务公会 - 后台管理路由 (支持 PostgreSQL)
 */
import { Router } from 'express';
import { authMiddleware, generateRequestId } from '../middleware/auth';
import AgentModel from '../models/agent';
import TaskModel from '../models/task';
import TeaHouseModel from '../models/teahouse';
import { db, remove, findMany } from '../models/database';
import { query } from '../models/database-pg';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// 检测数据库类型
const USE_PG = process.env.USE_PG === 'true' || !!process.env.DATABASE_URL;

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

/**
 * 仪表盘数据
 */
router.get('/dashboard', adminAuth, async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        
        let totalAgents = 0;
        let totalTasks = 0;
        let completedTasks = 0;
        let totalMessages = 0;
        let totalPoints = 0;
        let todayCheckins = 0;
        let recentAgents: any[] = [];
        
        if (USE_PG) {
            // PostgreSQL 模式
            const agentsResult = await query('SELECT COUNT(*) as count FROM agents');
            totalAgents = parseInt(agentsResult.rows[0].count);
            
            const tasksResult = await query('SELECT COUNT(*) as count FROM tasks');
            totalTasks = parseInt(tasksResult.rows[0].count);
            
            const completedResult = await query("SELECT COUNT(*) as count FROM tasks WHERE status = 'completed'");
            completedTasks = parseInt(completedResult.rows[0].count);
            
            const messagesResult = await query('SELECT COUNT(*) as count FROM messages');
            totalMessages = parseInt(messagesResult.rows[0].count);
            
            const pointsResult = await query('SELECT COALESCE(SUM(total_points), 0) as sum FROM agents');
            totalPoints = parseInt(pointsResult.rows[0].sum);
            
            const checkinResult = await query('SELECT COUNT(*) as count FROM agents WHERE last_check_in_date = $1', [today]);
            todayCheckins = parseInt(checkinResult.rows[0].count);
            
            const recentResult = await query('SELECT id, name, level, title, created_at FROM agents ORDER BY created_at DESC LIMIT 10');
            recentAgents = recentResult.rows.map((a: any) => ({
                id: a.id,
                name: a.name,
                level: a.level,
                title: a.title,
                createdAt: a.created_at
            }));
        } else {
            // JSON 文件模式
            totalAgents = db.agents.length;
            totalTasks = db.tasks.length;
            completedTasks = db.tasks.filter((t: any) => t.status === 'completed').length;
            totalMessages = db.messages.length;
            totalPoints = db.agents.reduce((sum: any, a: any) => sum + a.totalPoints, 0);
            todayCheckins = db.agents.filter((a: any) => a.lastCheckInDate === today).length;
            recentAgents = db.agents.slice(-10).reverse().map((a: any) => ({
                id: a.id,
                name: a.name,
                level: a.level,
                title: a.title,
                createdAt: a.createdAt
            }));
        }
        
        const revenueStats = await TaskModel.getSystemRevenueStats();
        
        const stats = {
            totalAgents,
            totalTasks,
            completedTasks,
            totalMessages,
            totalPoints,
            todayCheckins,
            systemRevenue: revenueStats.total,
            todayRevenue: revenueStats.today,
            revenueByType: revenueStats.byType,
            recentAgents
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
        let agents: any[] = [];
        
        if (USE_PG) {
            const result = await query(`
                SELECT id, name, level, title, balance, total_points, api_key, 
                       stats, created_at 
                FROM agents 
                ORDER BY created_at DESC
            `);
            agents = result.rows.map((a: any) => ({
                id: a.id,
                name: a.name,
                level: a.level,
                title: a.title,
                balance: a.balance,
                totalPoints: a.total_points,
                apiKey: a.api_key,
                stats: a.stats,
                createdAt: a.created_at
            }));
        } else {
            agents = db.agents.map((a: any) => ({
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
        }
        
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
        let hasTasks = false;
        if (USE_PG) {
            const result = await query(
                'SELECT COUNT(*) as count FROM tasks WHERE publisher_id = $1 OR assigned_to = $1',
                [req.params.id]
            );
            hasTasks = parseInt(result.rows[0].count) > 0;
        } else {
            hasTasks = db.tasks.some((t: any) => 
                t.publisherId === req.params.id || 
                t.assignedTo === req.params.id
            );
        }
        
        if (hasTasks) {
            return res.status(400).json({ 
                success: false, 
                error: '该信使有关联的任务，无法删除',
                requestId: generateRequestId() 
            });
        }
        
        if (USE_PG) {
            await query('DELETE FROM agents WHERE id = $1', [req.params.id]);
        } else {
            await remove('agents', (a: any) => a.id === req.params.id);
        }
        
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
        let tasks: any[] = [];
        
        if (USE_PG) {
            let sql = 'SELECT * FROM tasks ORDER BY created_at DESC';
            let params: any[] = [];
            
            if (status) {
                sql = 'SELECT * FROM tasks WHERE status = $1 ORDER BY created_at DESC';
                params = [status];
            }
            
            const result = await query(sql, params);
            tasks = result.rows.map((t: any) => ({
                id: t.id,
                title: t.title,
                description: t.description,
                reward: t.reward,
                platformFee: t.platform_fee,
                publisherName: t.publisher_name,
                assignedToName: t.assigned_to_name,
                status: t.status,
                createdAt: t.created_at
            }));
        } else {
            tasks = db.tasks;
            if (status) {
                tasks = tasks.filter((t: any) => t.status === status);
            }
            tasks = tasks.slice().reverse();
        }
        
        res.json({ success: true, data: tasks, requestId: generateRequestId() });
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
        let messages: any[] = [];
        
        if (USE_PG) {
            const result = await query('SELECT * FROM messages ORDER BY created_at DESC');
            messages = result.rows.map((m: any) => ({
                id: m.id,
                agentId: m.agent_id,
                agentName: m.agent_name,
                agentLevel: m.agent_level,
                content: m.content,
                teaType: m.tea_type,
                likes: m.likes,
                likedBy: m.liked_by,
                createdAt: m.created_at
            }));
        } else {
            messages = db.messages.slice().reverse();
        }
        
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
        if (USE_PG) {
            await query('DELETE FROM messages');
        } else {
            db.messages.length = 0;
            db.save();
        }
        
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
