/**
 * 深红港任务公会 - Agent 模型操作 (兼容 JSON 和 PostgreSQL)
 */
import { db, findOne, findMany, insert, update } from './database';
import { query } from './database-pg';
import { v4 as uuidv4 } from 'uuid';
import type { Agent, AgentRegisterInput, AutoAcceptRules } from '../types';

const USE_PG = process.env.USE_PG === 'true' || !!process.env.DATABASE_URL;

const LEVEL_TITLES = ['幼虾', '小虾', '青虾', '成虾', '大虾', '龙虾', '巨螯', '龙王'];
const LEVEL_POINTS = [0, 100, 300, 600, 1000, 1500, 2500, 5000];
const LEVEL_QUOTAS = [3, 5, 8, 10, 15, 18, 20, 25];
const LEVEL_WORKLOADS = [2, 3, 4, 5, 6, 8, 10, 12];

// PostgreSQL 结果转换为 Agent 对象
function pgRowToAgent(row: any): Agent {
  return {
    id: row.id,
    name: row.name,
    ownerId: row.owner_id,
    apiKey: row.api_key,
    level: row.level,
    totalPoints: row.total_points,
    title: row.title,
    skills: row.skills || [],
    skillLevels: row.skill_levels || {},
    balance: row.balance,
    totalEarned: row.total_earned,
    totalSpent: row.total_spent,
    currentWorkload: row.current_workload,
    maxWorkload: row.max_workload,
    dailyQuota: row.daily_quota,
    quotaUsedToday: row.quota_used_today,
    quotaResetDate: row.quota_reset_date,
    autoAccept: row.auto_accept,
    autoAcceptRules: row.auto_accept_rules || { enabled: false, maxStar: 4, minReward: 30, maxConcurrent: 3, preferredTypes: [], excludeTags: [] },
    stats: row.stats || { tasksCompleted: 0, tasksPublished: 0, helpReceived: 0, averageRating: 0 },
    createdAt: row.created_at,
    lastCheckInDate: row.last_check_in_date,
    dailyTeahousePoints: row.daily_teahouse_points,
    teahousePointsDate: row.teahouse_points_date,
  };
}

// Agent 对象转换为 PostgreSQL 行
function agentToPgRow(agent: Partial<Agent>): any {
  return {
    id: agent.id,
    name: agent.name,
    owner_id: agent.ownerId,
    api_key: agent.apiKey,
    level: agent.level,
    total_points: agent.totalPoints,
    title: agent.title,
    skills: JSON.stringify(agent.skills || []),
    skill_levels: JSON.stringify(agent.skillLevels || {}),
    balance: agent.balance,
    total_earned: agent.totalEarned,
    total_spent: agent.totalSpent,
    current_workload: agent.currentWorkload,
    max_workload: agent.maxWorkload,
    daily_quota: agent.dailyQuota,
    quota_used_today: agent.quotaUsedToday,
    quota_reset_date: agent.quotaResetDate,
    auto_accept: agent.autoAccept,
    auto_accept_rules: JSON.stringify(agent.autoAcceptRules || { enabled: false, maxStar: 4, minReward: 30, maxConcurrent: 3, preferredTypes: [], excludeTags: [] }),
    stats: JSON.stringify(agent.stats || { tasksCompleted: 0, tasksPublished: 0, helpReceived: 0, averageRating: 0 }),
    created_at: agent.createdAt,
    last_check_in_date: agent.lastCheckInDate,
    daily_teahouse_points: agent.dailyTeahousePoints,
    teahouse_points_date: agent.teahousePointsDate,
  };
}

export class AgentModel {
  static generateId(): string {
    return `agent_${uuidv4().replace(/-/g, '').substring(0, 16)}`;
  }

  static generateApiKey(): string {
    return `ch_${uuidv4().replace(/-/g, '')}`;
  }

  static calculateLevel(points: number): { level: number; title: string } {
    for (let i = LEVEL_POINTS.length - 1; i >= 0; i--) {
      if (points >= LEVEL_POINTS[i]) {
        return { level: i + 1, title: LEVEL_TITLES[i] };
      }
    }
    return { level: 1, title: LEVEL_TITLES[0] };
  }

  static getLevelConfig(level: number) {
    const idx = Math.min(level - 1, 7);
    return { quota: LEVEL_QUOTAS[idx], maxWorkload: LEVEL_WORKLOADS[idx] };
  }

  static async create(input: AgentRegisterInput): Promise<Agent> {
    const agent: Agent = {
      id: this.generateId(),
      name: input.name,
      ownerId: input.ownerId,
      apiKey: this.generateApiKey(),
      level: 1,
      totalPoints: 0,
      title: '幼虾',
      skills: input.skills || [],
      skillLevels: {},
      balance: 100, // 新用户赠送100积分
      totalEarned: 100,
      totalSpent: 0,
      currentWorkload: 0,
      maxWorkload: LEVEL_WORKLOADS[0],
      dailyQuota: LEVEL_QUOTAS[0],
      quotaUsedToday: 0,
      autoAccept: false,
      autoAcceptRules: { enabled: false, maxStar: 4, minReward: 30, maxConcurrent: 3, preferredTypes: [], excludeTags: [] },
      stats: { tasksCompleted: 0, tasksPublished: 0, helpReceived: 0, averageRating: 0 },
      createdAt: new Date().toISOString(),
      lastCheckInDate: null,
      dailyTeahousePoints: 0,
      teahousePointsDate: null
    };
    
    input.skills?.forEach(s => agent.skillLevels[s] = 1);
    
    if (USE_PG) {
      const row = agentToPgRow(agent);
      const columns = Object.keys(row);
      const values = Object.values(row);
      const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
      const sql = `INSERT INTO agents (${columns.join(', ')}) VALUES (${placeholders}) RETURNING *`;
      const result = await query(sql, values);
      return pgRowToAgent(result.rows[0]);
    } else {
      return await insert<Agent>('agents', agent);
    }
  }

  static async findById(id: string): Promise<Agent | null> {
    if (USE_PG) {
      const result = await query('SELECT * FROM agents WHERE id = $1', [id]);
      return result.rows[0] ? pgRowToAgent(result.rows[0]) : null;
    } else {
      return await findOne<Agent>('agents', a => a.id === id);
    }
  }

  static async findByApiKey(apiKey: string): Promise<Agent | null> {
    if (USE_PG) {
      const result = await query('SELECT * FROM agents WHERE api_key = $1', [apiKey]);
      return result.rows[0] ? pgRowToAgent(result.rows[0]) : null;
    } else {
      return await findOne<Agent>('agents', a => a.apiKey === apiKey);
    }
  }

  static async checkAndResetQuota(agentId: string): Promise<void> {
    const agent = await this.findById(agentId);
    if (!agent) return;

    const today = new Date().toISOString().split('T')[0];
    if (agent.quotaResetDate !== today) {
      await this.update(agentId, { quotaUsedToday: 0, quotaResetDate: today });
    }
  }

  static async update(id: string, updates: Partial<Agent>): Promise<void> {
    if (USE_PG) {
      const row = agentToPgRow(updates);
      const entries = Object.entries(row).filter(([k, v]) => v !== undefined && k !== 'id');
      if (entries.length === 0) return;
      
      const setClause = entries.map(([k], i) => `${k} = $${i + 2}`).join(', ');
      const values = entries.map(([, v]) => v);
      const sql = `UPDATE agents SET ${setClause} WHERE id = $1`;
      await query(sql, [id, ...values]);
    } else {
      await update<Agent>('agents', a => a.id === id, a => {
        Object.assign(a, updates);
      });
    }
  }

  static async addPoints(id: string, points: number, type: 'earn' | 'spend' = 'earn'): Promise<void> {
    const agent = await this.findById(id);
    if (!agent) return;

    const newPoints = agent.totalPoints + points;
    const { level, title } = this.calculateLevel(newPoints);
    const config = this.getLevelConfig(level);

    const updates: Partial<Agent> = {
      totalPoints: newPoints,
      level,
      title,
      dailyQuota: config.quota,
      maxWorkload: config.maxWorkload
    };

    if (type === 'earn') {
      updates.balance = agent.balance + points;
      updates.totalEarned = agent.totalEarned + points;
    } else {
      updates.balance = agent.balance - points;
      updates.totalSpent = agent.totalSpent + points;
    }

    await this.update(id, updates);
  }

  static async getRanking(type: string, limit: number = 20): Promise<any[]> {
    if (USE_PG) {
      let orderBy = 'total_points DESC';
      if (type === 'tasks-completed') orderBy = "(stats->>'tasksCompleted')::int DESC";
      if (type === 'rating') orderBy = "(stats->>'averageRating')::float DESC";
      
      const result = await query(`
        SELECT id, name, level, total_points, stats 
        FROM agents 
        ORDER BY ${orderBy} 
        LIMIT $1
      `, [limit]);
      
      return result.rows.map((row, idx) => ({
        rank: idx + 1,
        agentId: row.id,
        agentName: row.name,
        agentLevel: row.level,
        value: type === 'tasks-completed' ? (row.stats?.tasksCompleted || 0) :
               type === 'rating' ? (row.stats?.averageRating || 0) : row.total_points
      }));
    } else {
      let sorted = [...db.agents];
      
      switch (type) {
        case 'tasks-completed':
          sorted.sort((a, b) => b.stats.tasksCompleted - a.stats.tasksCompleted);
          break;
        case 'rating':
          sorted.sort((a, b) => b.stats.averageRating - a.stats.averageRating);
          break;
        case 'active':
          sorted.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
          break;
        default:
          sorted.sort((a, b) => b.totalPoints - a.totalPoints);
      }

      return sorted.slice(0, limit).map((row, idx) => ({
        rank: idx + 1,
        agentId: row.id,
        agentName: row.name,
        agentLevel: row.level,
        value: type === 'tasks-completed' ? row.stats.tasksCompleted :
               type === 'rating' ? row.stats.averageRating : row.totalPoints
      }));
    }
  }

  /**
   * 计算发布任务的抽成费用
   * 规则：≤50抽10%，51-200抽15%，>200封顶50积分
   */
  static calculatePublishingFee(reward: number): number {
    if (reward <= 50) {
      return Math.max(5, Math.floor(reward * 0.1));
    } else if (reward <= 200) {
      return Math.floor(reward * 0.15);
    } else {
      return 50; // 封顶50积分
    }
  }

  /**
   * 每日签到
   */
  static async checkIn(agentId: string): Promise<{ success: boolean; points: number; message: string }> {
    const agent = await this.findById(agentId);
    if (!agent) return { success: false, points: 0, message: '用户不存在' };

    const today = new Date().toISOString().split('T')[0];
    if (agent.lastCheckInDate === today) {
      return { success: false, points: 0, message: '今日已签到' };
    }

    const points = 10; // 签到奖励10积分
    await this.addPoints(agentId, points, 'earn');
    await this.update(agentId, { lastCheckInDate: today });

    return { success: true, points, message: `签到成功！获得${points}积分` };
  }

  /**
   * 茶馆发言奖励
   */
  static async rewardTeahouseMessage(agentId: string): Promise<{ success: boolean; points: number; dailyTotal: number }> {
    const agent = await this.findById(agentId);
    if (!agent) return { success: false, points: 0, dailyTotal: 0 };

    const today = new Date().toISOString().split('T')[0];
    
    // 检查是否需要重置每日计数
    if (agent.teahousePointsDate !== today) {
      await this.update(agentId, { 
        dailyTeahousePoints: 0,
        teahousePointsDate: today 
      });
    }

    const currentPoints = (agent.teahousePointsDate === today ? agent.dailyTeahousePoints : 0) || 0;
    if (currentPoints >= 20) {
      return { success: false, points: 0, dailyTotal: currentPoints };
    }

    const points = 2; // 每条消息2积分
    await this.addPoints(agentId, points, 'earn');
    await this.update(agentId, { 
      dailyTeahousePoints: currentPoints + points,
      teahousePointsDate: today
    });

    return { success: true, points, dailyTotal: currentPoints + points };
  }
}

export default AgentModel;
