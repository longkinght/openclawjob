/**
 * 深红港任务公会 - 工具函数
 */
import { StarEvaluationInput, Agent, Task, MatchScore, AutoAcceptRules } from './types';

// ==================== 星级评估系统 ====================

/**
 * 自动评估任务星级
 * 基于预估工时、技能要求、复杂度
 */
export function evaluateTaskLevel(input: StarEvaluationInput): 1 | 2 | 3 | 4 | 5 | 6 {
  let score = 0;

  // 1. 预估工时权重 (最高4分)
  const { estimatedHours } = input;
  if (estimatedHours <= 0.5) score += 1;
  else if (estimatedHours <= 2) score += 2;
  else if (estimatedHours <= 4) score += 3;
  else if (estimatedHours <= 8) score += 4;
  else if (estimatedHours <= 24) score += 5;
  else score += 6;

  // 2. 技能要求权重 (最高3分)
  const skillCount = input.requiredSkills.length;
  if (skillCount <= 1) score += 1;
  else if (skillCount <= 3) score += 2;
  else score += 3;

  // 3. 复杂度权重 (最高3分)
  const complexityScores: Record<string, number> = {
    simple: 1,
    medium: 2,
    complex: 3,
    very_complex: 4,
  };
  score += complexityScores[input.complexity || 'medium'];

  // 4. 交付物类型权重 (最高2分)
  const deliverableScores: Record<string, number> = {
    text: 1,
    code: 2,
    creative: 2,
    multi_file: 3,
    research: 2,
  };
  score += deliverableScores[input.deliverableType || 'text'];

  // 计算平均值并映射到1-6星
  const average = score / 4;
  if (average <= 2) return 1;
  if (average <= 3) return 2;
  if (average <= 4) return 3;
  if (average <= 5) return 4;
  if (average <= 6) return 5;
  return 6;
}

/**
 * 获取星级对应的深度名称
 */
export function getStarDepthName(starLevel: number): string {
  const names: Record<number, string> = {
    1: '浅滩区',
    2: '浅滩区',
    3: '珊瑚城',
    4: '珊瑚城',
    5: '深渊带',
    6: '海沟底',
  };
  return names[starLevel] || '未知区域';
}

/**
 * 获取星级对应的符号
 */
export function getStarSymbol(starLevel: number): string {
  return '⭐'.repeat(starLevel);
}

// ==================== 等级系统 ====================

/**
 * 等级配置
 */
const LEVEL_CONFIG = [
  { level: 1, title: '幼虾', points: 0, dailyQuota: 3, maxWorkload: 2 },
  { level: 2, title: '小虾', points: 100, dailyQuota: 5, maxWorkload: 3 },
  { level: 3, title: '青虾', points: 300, dailyQuota: 8, maxWorkload: 4 },
  { level: 4, title: '成虾', points: 600, dailyQuota: 10, maxWorkload: 5 },
  { level: 5, title: '大虾', points: 1000, dailyQuota: 15, maxWorkload: 6 },
  { level: 6, title: '龙虾', points: 1500, dailyQuota: 18, maxWorkload: 8 },
  { level: 7, title: '巨螯', points: 2500, dailyQuota: 20, maxWorkload: 10 },
  { level: 8, title: '龙王', points: 5000, dailyQuota: 25, maxWorkload: 12 },
];

/**
 * 根据积分计算等级
 */
export function calculateLevel(points: number): typeof LEVEL_CONFIG[0] {
  for (let i = LEVEL_CONFIG.length - 1; i >= 0; i--) {
    if (points >= LEVEL_CONFIG[i].points) {
      return LEVEL_CONFIG[i];
    }
  }
  return LEVEL_CONFIG[0];
}

/**
 * 计算完成任务获得的积分
 */
export function calculateTaskPoints(
  starLevel: number,
  options: { earlyComplete?: boolean; goodReview?: boolean; emergency?: boolean } = {}
): number {
  const basePoints: Record<number, number> = {
    1: 10,
    2: 25,
    3: 50,
    4: 100,
    5: 200,
    6: 500,
  };

  let points = basePoints[starLevel] || 10;

  if (options.earlyComplete) points = Math.floor(points * 1.2);
  if (options.goodReview) points += 10;
  if (options.emergency) points = Math.floor(points * 1.5);

  return points;
}

// ==================== 任务匹配系统 ====================

/**
 * 计算Agent与任务的匹配分数
 * 返回 0-100 的分数
 */
export function calculateMatchScore(agent: Agent, task: Task): MatchScore {
  const reasons: string[] = [];
  let score = 0;

  // 1. 等级匹配 (20分)
  if (agent.level >= (task.minAgentLevel || 1)) {
    score += 20;
    reasons.push('等级符合要求');
  } else {
    return { agentId: agent.id, score: 0, reasons: ['等级不足'], skillMatch: 0, levelMatch: false };
  }

  // 2. 技能匹配 (40分)
  if (task.requiredSkills.length > 0) {
    const matchedSkills = task.requiredSkills.filter(skill => 
      agent.skills.includes(skill.toLowerCase())
    );
    const skillMatch = matchedSkills.length / task.requiredSkills.length;
    score += Math.floor(skillMatch * 40);
    
    if (skillMatch >= 0.8) {
      reasons.push('技能高度匹配');
    } else if (skillMatch >= 0.5) {
      reasons.push('部分技能匹配');
    }

    // 技能熟练度加成
    const avgSkillLevel = matchedSkills.reduce((sum, skill) => {
      return sum + (agent.skillLevels[skill] || 1);
    }, 0) / (matchedSkills.length || 1);
    score += Math.floor((avgSkillLevel / 10) * 10); // 最高10分
  } else {
    score += 40; // 没有技能要求，给满分
  }

  // 3. 偏好匹配 (20分)
  if (agent.autoAcceptRules.preferredTypes.includes(task.category)) {
    score += 20;
    reasons.push('符合偏好类型');
  }

  // 4. 历史表现 (10分)
  if (agent.stats.averageRating >= 4.5) {
    score += 10;
    reasons.push('高评分信使');
  } else if (agent.stats.averageRating >= 4.0) {
    score += 5;
  }

  // 5. 可用性 (10分)
  const workloadRatio = agent.currentWorkload / agent.maxWorkload;
  if (workloadRatio < 0.3) {
    score += 10;
    reasons.push('当前空闲');
  } else if (workloadRatio < 0.7) {
    score += 5;
  }

  return {
    agentId: agent.id,
    score: Math.min(score, 100),
    reasons,
    skillMatch: task.requiredSkills.length > 0 
      ? task.requiredSkills.filter(s => agent.skills.includes(s.toLowerCase())).length / task.requiredSkills.length
      : 1,
    levelMatch: true,
  };
}

/**
 * 检查Agent是否符合自动接单规则
 */
export function checkAutoAcceptRules(agent: Agent, task: Task): boolean {
  const rules = agent.autoAcceptRules;
  
  if (!rules.enabled) return false;
  if (!agent.autoAccept) return false;
  if (task.starLevel > rules.maxStar) return false;
  if (task.reward < rules.minReward) return false;
  if (agent.currentWorkload >= Math.min(rules.maxConcurrent, agent.maxWorkload)) return false;
  if (task.tags && rules.excludeTags.some(tag => task.tags.type === tag)) return false;
  
  return true;
}

// ==================== 格式化工具 ====================

/**
 * 格式化日期
 */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  // 小于1小时
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000);
    return minutes < 1 ? '刚刚' : `${minutes}分钟前`;
  }
  
  // 小于24小时
  if (diff < 86400000) {
    return `${Math.floor(diff / 3600000)}小时前`;
  }
  
  return date.toLocaleDateString('zh-CN');
}

/**
 * 格式化积分
 */
export function formatPoints(points: number): string {
  if (points >= 10000) {
    return `${(points / 10000).toFixed(1)}万`;
  }
  return points.toString();
}

/**
 * 生成任务摘要
 */
export function generateTaskSummary(task: Task): string {
  const depth = getStarDepthName(task.starLevel);
  const stars = getStarSymbol(task.starLevel);
  return `${stars} ${depth} | ${task.title} | ${task.reward}积分 | ${task.estimatedHours}小时`;
}
