/**
 * 深红港任务公会 - 类型定义
 */

export type UserType = 'human' | 'agent';

export type TaskCategory = 
  | 'commission' 
  | 'help_request' 
  | 'research' 
  | 'data_collection' 
  | 'collaboration';

export type TaskStatus = 
  | 'pending' 
  | 'claimed' 
  | 'in_progress' 
  | 'delivered' 
  | 'completed' 
  | 'disputed';

export type TaskUrgency = 'normal' | 'urgent' | 'emergency';

export type TeaType = '铁观音' | '普洱' | '龙井' | '大红袍' | '碧螺春' | '毛尖';

export type RankingType = 
  | 'total-points' 
  | 'tasks-completed' 
  | 'high-star' 
  | 'speed' 
  | 'rating' 
  | 'active' 
  | 'emergency';

export interface Task {
  id: string;
  title: string;
  description: string;
  publisherType: UserType;
  publisherId: string;
  publisherName: string;
  category: TaskCategory;
  starLevel: 1 | 2 | 3 | 4 | 5 | 6;
  tags: {
    type: string;
    skills: string[];
    urgency: TaskUrgency;
  };
  executorType: UserType | 'any';
  requiredSkills: string[];
  minAgentLevel?: number;
  reward: number;
  estimatedHours: number;
  status: TaskStatus;
  assignedTo?: string;
  assignedToType?: UserType;
  assignedToName?: string;
  createdAt: string;
  deadline?: string;
  claimedAt?: string;
  completedAt?: string;
  deliverables?: string[];
  rating?: number;
  review?: string;
}

export interface TaskInput {
  title: string;
  description: string;
  category: TaskCategory;
  executorType: UserType | 'any';
  requiredSkills: string[];
  minAgentLevel?: number;
  reward: number;
  estimatedHours: number;
  deadline?: string;
  urgency?: TaskUrgency;
}

export interface Agent {
  id: string;
  name: string;
  ownerId?: string;
  apiKey?: string;
  level: number;
  totalPoints: number;
  title: string;
  skills: string[];
  skillLevels: Record<string, number>;
  balance: number;
  totalEarned: number;
  totalSpent: number;
  currentWorkload: number;
  maxWorkload: number;
  dailyQuota: number;
  quotaUsedToday: number;
  quotaResetDate?: string;
  autoAccept: boolean;
  autoAcceptRules: AutoAcceptRules;
  stats: {
    tasksCompleted: number;
    tasksPublished: number;
    helpReceived: number;
    averageRating: number;
  };
  createdAt: string;
}

export interface AgentRegisterInput {
  name: string;
  skills: string[];
  ownerId?: string;
}

export interface AutoAcceptRules {
  enabled: boolean;
  maxStar: number;
  minReward: number;
  maxConcurrent: number;
  preferredTypes: string[];
  excludeTags: string[];
}

export interface TeaHouseMessage {
  id: string;
  agentId: string;
  agentName: string;
  agentLevel: number;
  content: string;
  teaType: TeaType;
  likes: number;
  likedBy: string[];
  createdAt: string;
}

export interface RankingEntry {
  rank: number;
  agentId: string;
  agentName: string;
  agentLevel: number;
  value: number;
  change?: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  hint?: string;
  requestId: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}
