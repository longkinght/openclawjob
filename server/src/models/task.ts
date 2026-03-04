/**
 * 深红港任务公会 - 任务模型操作
 */
import { db, findOne, findMany, insert, update } from './database';
import { v4 as uuidv4 } from 'uuid';
import AgentModel from './agent';
import type { Task, TaskInput } from '../types';

export class TaskModel {
  static evaluateStarLevel(input: { estimatedHours: number; requiredSkills: string[]; complexity?: string; deliverableType?: string }): 1 | 2 | 3 | 4 | 5 | 6 {
    let score = 0;
    const hours = input.estimatedHours;
    if (hours <= 0.5) score += 1;
    else if (hours <= 2) score += 2;
    else if (hours <= 4) score += 3;
    else if (hours <= 8) score += 4;
    else if (hours <= 24) score += 5;
    else score += 6;

    const skillCount = input.requiredSkills.length;
    if (skillCount <= 1) score += 1;
    else if (skillCount <= 3) score += 2;
    else score += 3;

    const complexityScores: Record<string, number> = { simple: 1, medium: 2, complex: 3, very_complex: 4 };
    score += complexityScores[input.complexity || 'medium'];

    const deliverableScores: Record<string, number> = { text: 1, code: 2, creative: 2, multi_file: 3, research: 2 };
    score += deliverableScores[input.deliverableType || 'text'];

    const average = score / 4;
    if (average <= 2) return 1;
    if (average <= 3) return 2;
    if (average <= 4) return 3;
    if (average <= 5) return 4;
    if (average <= 6) return 5;
    return 6;
  }

  static calculatePoints(starLevel: number, options: { earlyComplete?: boolean; goodReview?: boolean; emergency?: boolean } = {}): number {
    const basePoints: Record<number, number> = { 1: 10, 2: 25, 3: 50, 4: 100, 5: 200, 6: 500 };
    let points = basePoints[starLevel] || 10;
    if (options.earlyComplete) points = Math.floor(points * 1.2);
    if (options.goodReview) points += 10;
    if (options.emergency) points = Math.floor(points * 1.5);
    return points;
  }

  static async create(input: TaskInput & { publisherId: string; publisherType: 'human' | 'agent'; publisherName: string }): Promise<Task> {
    // 计算抽成费用
    const platformFee = AgentModel.calculatePublishingFee(input.reward);
    const totalCost = input.reward + platformFee;

    const task: Task = {
      id: `task_${uuidv4().replace(/-/g, '').substring(0, 16)}`,
      title: input.title,
      description: input.description,
      publisherType: input.publisherType as 'human' | 'agent',
      publisherId: input.publisherId,
      publisherName: input.publisherName,
      category: input.category,
      starLevel: this.evaluateStarLevel({ estimatedHours: input.estimatedHours, requiredSkills: input.requiredSkills }),
      tags: { type: input.category, skills: input.requiredSkills, urgency: input.urgency || 'normal' },
      executorType: input.executorType,
      requiredSkills: input.requiredSkills,
      minAgentLevel: input.minAgentLevel || 1,
      reward: input.reward,
      platformFee: platformFee,
      estimatedHours: input.estimatedHours,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    if (input.deadline) task.deadline = input.deadline;

    await insert<Task>('tasks', task);

    if (input.publisherType === 'agent') {
      const agent = await AgentModel.findById(input.publisherId);
      if (agent) {
        // 扣除悬赏金额 + 平台抽成
        await AgentModel.addPoints(input.publisherId, totalCost, 'spend');
        agent.stats.tasksPublished++;
        await AgentModel.update(input.publisherId, { stats: agent.stats });
      }
    }

    return task;
  }

  static async findById(id: string): Promise<Task | null> {
    return await findOne<Task>('tasks', t => t.id === id);
  }

  static async findMany(options: { status?: string; publisherId?: string; assignedTo?: string; starLevel?: number; category?: string; executorType?: string; limit?: number; offset?: number } = {}): Promise<{ items: Task[]; total: number }> {
    let tasks = [...db.tasks];

    if (options.status) tasks = tasks.filter(t => t.status === options.status);
    if (options.publisherId) tasks = tasks.filter(t => t.publisherId === options.publisherId);
    if (options.assignedTo) tasks = tasks.filter(t => t.assignedTo === options.assignedTo);
    if (options.starLevel) tasks = tasks.filter(t => t.starLevel === options.starLevel);
    if (options.category) tasks = tasks.filter(t => t.category === options.category);
    if (options.executorType) tasks = tasks.filter(t => t.executorType === options.executorType);

    const total = tasks.length;
    const limit = options.limit || 20;
    const offset = options.offset || 0;

    tasks = tasks.slice(offset, offset + limit);
    tasks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return { items: tasks, total };
  }

  static async claim(taskId: string, agentId: string, agentName: string): Promise<Task | null> {
    const task = await this.findById(taskId);
    if (!task || task.status !== 'pending') return null;

    const agent = await AgentModel.findById(agentId);
    if (!agent) return null;
    if (task.minAgentLevel && agent.level < task.minAgentLevel) return null;
    if (agent.currentWorkload >= agent.maxWorkload) return null;

    await AgentModel.checkAndResetQuota(agentId);
    const freshAgent = await AgentModel.findById(agentId);
    if (!freshAgent || freshAgent.quotaUsedToday >= freshAgent.dailyQuota) return null;

    await update<Task>('tasks', t => t.id === taskId, t => {
      t.status = 'claimed';
      t.assignedTo = agentId;
      t.assignedToType = 'agent';
      t.assignedToName = agentName;
      t.claimedAt = new Date().toISOString();
    });

    await AgentModel.update(agentId, {
      currentWorkload: agent.currentWorkload + 1,
      quotaUsedToday: agent.quotaUsedToday + 1
    });

    return this.findById(taskId);
  }

  static async deliver(taskId: string, agentId: string, deliverables: string[], comment?: string): Promise<{ task: Task; pointsEarned: number } | null> {
    const task = await this.findById(taskId);
    if (!task || task.status !== 'claimed' || task.assignedTo !== agentId) return null;

    await update<Task>('tasks', t => t.id === taskId, t => {
      t.status = 'delivered';
      t.deliverables = deliverables;
    });

    const points = this.calculatePoints(task.starLevel, { emergency: task.tags?.urgency === 'emergency' });
    return { task: (await this.findById(taskId))!, pointsEarned: points };
  }

  static async complete(taskId: string, rating?: number, review?: string): Promise<Task | null> {
    const task = await this.findById(taskId);
    if (!task || task.status !== 'delivered') return null;

    await update<Task>('tasks', t => t.id === taskId, t => {
      t.status = 'completed';
      t.rating = rating;
      t.review = review;
      t.completedAt = new Date().toISOString();
    });

    if (task.assignedTo) {
      // 执行者获得：完整悬赏金额 + 星级奖励（抽成已单独收取，不归执行者）
      const bonusPoints = this.calculatePoints(task.starLevel, { goodReview: (rating || 0) >= 4, emergency: task.tags?.urgency === 'emergency' });
      const totalReward = task.reward + bonusPoints;
      
      await AgentModel.addPoints(task.assignedTo, totalReward, 'earn');

      const agent = await AgentModel.findById(task.assignedTo);
      if (agent) {
        if (rating) {
          const newAvg = (agent.stats.averageRating * agent.stats.tasksCompleted + rating) / (agent.stats.tasksCompleted + 1);
          agent.stats.averageRating = newAvg;
        }
        agent.stats.tasksCompleted++;
        await AgentModel.update(task.assignedTo, {
          currentWorkload: Math.max(0, agent.currentWorkload - 1),
          stats: agent.stats
        });
      }
      
      // 记录系统收入（抽成）
      await this.recordSystemRevenue(task.platformFee || 0, 'task_fee', task.id);
    }

    return this.findById(taskId);
  }

  static async findByAgent(agentId: string, role: 'publisher' | 'executor' | 'all' = 'all'): Promise<Task[]> {
    if (role === 'publisher') return db.tasks.filter((t: any) => t.publisherId === agentId);
    if (role === 'executor') return db.tasks.filter((t: any) => t.assignedTo === agentId);
    return db.tasks.filter((t: any) => t.publisherId === agentId || t.assignedTo === agentId);
  }

  /**
   * 记录系统收入
   */
  static async recordSystemRevenue(amount: number, type: string, sourceId: string): Promise<void> {
    if (amount <= 0) return;
    
    const revenue = {
      id: `rev_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      amount,
      type,
      sourceId,
      createdAt: new Date().toISOString()
    };
    
    if (!db.systemRevenue) {
      (db as any).systemRevenue = [];
    }
    (db as any).systemRevenue.push(revenue);
    db.save();
  }

  /**
   * 获取系统收入统计
   */
  static async getSystemRevenueStats(): Promise<{ total: number; today: number; byType: Record<string, number> }> {
    const revenues = (db as any).systemRevenue || [];
    const today = new Date().toISOString().split('T')[0];
    
    const total = revenues.reduce((sum: number, r: any) => sum + r.amount, 0);
    const todayRevenues = revenues.filter((r: any) => r.createdAt.startsWith(today));
    const todayTotal = todayRevenues.reduce((sum: number, r: any) => sum + r.amount, 0);
    
    const byType: Record<string, number> = {};
    revenues.forEach((r: any) => {
      byType[r.type] = (byType[r.type] || 0) + r.amount;
    });
    
    return { total, today: todayTotal, byType };
  }
}

export default TaskModel;
