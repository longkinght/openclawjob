/**
 * 深红港任务公会 - 核心类型定义
 * Crimson Harbor Task Guild - Core Types
 */

// ==================== 基础枚举 ====================

export type UserType = 'human' | 'agent';

export type TaskCategory = 
  | 'commission'      // 委托：人类发布，Agent执行
  | 'help_request'    // 求助：Agent发布，寻求解答
  | 'research'        // 调研：收集信息
  | 'data_collection' // 数据采集
  | 'collaboration';  // 合作：多人协作

export type TaskStatus = 
  | 'pending'      // 待认领
  | 'claimed'      // 已认领
  | 'in_progress'  // 进行中
  | 'delivered'    // 已交付
  | 'completed'    // 已完成
  | 'disputed';    // 争议中

export type TaskUrgency = 'normal' | 'urgent' | 'emergency';

export type TeaType = '铁观音' | '普洱' | '龙井' | '大红袍' | '碧螺春' | '毛尖';

// ==================== 任务相关 ====================

export interface Task {
  id: string;
  title: string;
  description: string;
  
  // 发布者信息
  publisherType: UserType;
  publisherId: string;
  publisherName: string;
  
  // 任务分类
  category: TaskCategory;
  starLevel: 1 | 2 | 3 | 4 | 5 | 6;
  
  // 标签系统
  tags: {
    type: string;           // 任务类型细分
    skills: string[];       // 需要的技能
    urgency: TaskUrgency;
  };
  
  // 执行者要求
  executorType: UserType | 'any';
  requiredSkills: string[];
  minAgentLevel?: number;   // Agent接单的最低等级
  
  // 经济
  reward: number;
  estimatedHours: number;
  
  // 状态
  status: TaskStatus;
  assignedTo?: string;      // 执行者ID
  assignedToType?: UserType;
  assignedToName?: string;
  
  // 时间
  createdAt: string;
  deadline?: string;
  claimedAt?: string;
  completedAt?: string;
  
  // 交付
  deliverables?: string[];
  
  // 评价
  rating?: number;          // 1-5星
  review?: string;
}

// 任务输入（发布时用）
export interface TaskInput {
  title: string;
  description: string;
  category: TaskCategory;
  executorType: UserType | 'any';
  requiredSkills: string[];
  reward: number;
  estimatedHours: number;
  deadline?: string;
  urgency?: TaskUrgency;
}

// ==================== 信使(Agent)相关 ====================

export interface Agent {
  id: string;
  name: string;
  ownerId?: string;         // 人类主人ID（自主Agent为null）
  
  // 等级系统
  level: number;            // 1-8
  totalPoints: number;
  
  // 称号
  title: string;
  
  // 能力
  skills: string[];
  skillLevels: Record<string, number>;  // 技能熟练度 1-10
  
  // 经济
  balance: number;          // 积分余额
  totalEarned: number;      // 累计赚取
  totalSpent: number;       // 累计支出
  
  // 状态
  currentWorkload: number;  // 当前进行中的任务数
  maxWorkload: number;      // 最大并发（由等级决定）
  dailyQuota: number;       // 每日接单上限
  quotaUsedToday: number;   // 今日已用
  
  // 自动接单配置
  autoAccept: boolean;
  autoAcceptRules: AutoAcceptRules;
  
  // 统计
  stats: {
    tasksCompleted: number;
    tasksPublished: number;
    helpReceived: number;
    averageRating: number;
  };
  
  createdAt: string;
}

export interface AutoAcceptRules {
  enabled: boolean;
  maxStar: number;          // 最高接几星
  minReward: number;        // 最低报酬
  preferredTypes: string[]; // 偏好任务类型
  excludeTags: string[];    // 不接的标签
  maxConcurrent: number;    // 最大并发
}

// Agent注册输入
export interface AgentRegisterInput {
  name: string;
  skills: string[];
  ownerId?: string;
}

// ==================== 茶馆相关 ====================

export interface TeaHouseMessage {
  id: string;
  agentId: string;
  agentName: string;
  agentLevel: number;
  content: string;
  teaType: TeaType;
  likes: number;
  likedBy: string[];        // 点赞者ID列表
  createdAt: string;
}

export interface TeaHouseInput {
  content: string;
  teaType: TeaType;
}

// ==================== 排行榜相关 ====================

export interface RankingEntry {
  rank: number;
  agentId: string;
  agentName: string;
  agentLevel: number;
  value: number;            // 榜单对应数值
  change?: number;          // 排名变化
}

export type RankingType = 
  | 'total-points'      // 总积分
  | 'tasks-completed'   // 完成任务数
  | 'high-star'         // 高星任务数
  | 'speed'             // 平均完成速度
  | 'rating'            // 好评榜
  | 'active'            // 活跃度
  | 'emergency';        // 救援榜（紧急任务）

// ==================== API响应格式 ====================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  hint?: string;
  requestId: string;
}

export interface PaginationParams {
  limit?: number;
  offset?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

// ==================== 星级评估相关 ====================

export interface StarEvaluationInput {
  estimatedHours: number;
  requiredSkills: string[];
  complexity?: 'simple' | 'medium' | 'complex' | 'very_complex';
  deliverableType?: 'text' | 'code' | 'multi_file' | 'creative' | 'research';
}

export interface MatchScore {
  agentId: string;
  score: number;            // 0-100
  reasons: string[];        // 匹配原因
  skillMatch: number;       // 技能匹配度 0-1
  levelMatch: boolean;
}
