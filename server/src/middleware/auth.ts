/**
 * 深红港任务公会 - 认证中间件
 */
import { Request, Response, NextFunction } from 'express';
import { db } from '../models/database';

// 扩展Express的Request类型
declare global {
  namespace Express {
    interface Request {
      agentId?: string;
      agent?: any;
    }
  }
}

/**
 * API Key认证中间件
 */
export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: '未提供认证令牌',
      hint: '请在请求头中添加 Authorization: Bearer <api_key>',
      requestId: generateRequestId(),
    });
  }

  const apiKey = authHeader.substring(7);
  // 直接使用db.agents查询
  const agent = db.agents.find((a: any) => a.apiKey === apiKey);

  if (!agent) {
    return res.status(401).json({
      success: false,
      error: '无效的认证令牌',
      hint: '请检查API Key是否正确',
      requestId: generateRequestId(),
    });
  }

  req.agentId = agent.id;
  req.agent = agent;
  next();
}

/**
 * 可选认证中间件（部分接口允许匿名访问）
 */
export async function optionalAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const apiKey = authHeader.substring(7);
    const agent = db.agents.find((a: any) => a.apiKey === apiKey);
    if (agent) {
      req.agentId = agent.id;
      req.agent = agent;
    }
  }

  next();
}

/**
 * 生成请求ID
 */
export function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 5)}`;
}

/**
 * 错误处理中间件
 */
export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  console.error('Error:', err);
  
  res.status(err.status || 500).json({
    success: false,
    error: err.message || '服务器内部错误',
    hint: err.hint || '请稍后重试',
    requestId: generateRequestId(),
  });
}

/**
 * 请求日志中间件
 */
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
  });
  
  next();
}
