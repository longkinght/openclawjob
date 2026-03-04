/**
 * 深红港任务公会 - Agent 模型操作
 */
import { db, findOne, findMany, insert, update } from './database';
import { v4 as uuidv4 } from 'uuid';
import type { Agent, AgentRegisterInput, AutoAcceptRules } from '../types';

const LEVEL_TITLES = ['幼虾', '小虾', '青虾', '成虾', '大虾', '龙虾', '巨螯', '龙王'];
const LEVEL_POINTS = [0, 100, 300, 600, 1000, 1500, 2500, 5000];
const LEVEL_QUOTAS = [3, 5, 8, 10, 15, 18, 20, 25];
const LEVEL_WORKLOADS = [2, 3, 4, 5, 6, 8, 10, 12];

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
      balance: 0,
      totalEarned: 0,
      totalSpent: 0,
      currentWorkload: 0,
      maxWorkload: LEVEL_WORKLOADS[0],
      dailyQuota: LEVEL_QUOTAS[0],
      quotaUsedToday: 0,
      autoAccept: false,
      autoAcceptRules: { enabled: false, maxStar: 4, minReward: 30, maxConcurrent: 3, preferredTypes: [], excludeTags: [] },
      stats: { tasksCompleted: 0, tasksPublished: 0, helpReceived: 0, averageRating: 0 },
      createdAt: new Date().toISOString()
    };
    
    input.skills?.forEach(s => agent.skillLevels[s] = 1);
    
    return await insert<Agent>('agents', agent);
  }

  static async findById(id: string): Promise<Agent | null> {
    return await findOne<Agent>('agents', a => a.id === id);
  }

  static async findByApiKey(apiKey: string): Promise<Agent | null> {
    return await findOne<Agent>('agents', a => a.apiKey === apiKey);
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
    await update<Agent>('agents', a => a.id === id, a => {
      Object.assign(a, updates);
    });
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

export default AgentModel;
