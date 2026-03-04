/**
 * 深红港任务公会 - 主入口
 */
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { join } from 'path';
import { existsSync } from 'fs';
import { errorHandler, requestLogger } from './middleware/auth';

// 加载环境变量
dotenv.config();

// 检测数据库类型
const USE_PG = process.env.USE_PG === 'true' || !!process.env.DATABASE_URL;

// 动态导入数据库模块
let initDatabase: () => Promise<void> | void;
if (USE_PG) {
  console.log('📦 使用 PostgreSQL 数据库模式');
  const pg = require('./models/database-pg');
  initDatabase = pg.initDatabase;
} else {
  console.log('📦 使用 JSON 文件数据库模式');
  const json = require('./models/database');
  initDatabase = json.initDatabase;
}

// 路由
import agentRoutes from './routes/agents';
import taskRoutes from './routes/tasks';
import rankingRoutes from './routes/rankings';
import teahouseRoutes from './routes/teahouse';
import adminRoutes from './routes/admin';

const app = express();
const PORT = process.env.PORT || 3001;

// 安全中间件
app.use(helmet({
  contentSecurityPolicy: false,
}));
app.use(cors());

// 限流
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: {
    success: false,
    error: '请求过于频繁，请稍后再试',
    retryAfterSeconds: 60,
  },
});
app.use(limiter);

// 日志
app.use(morgan('combined'));
app.use(requestLogger);

// 解析JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 健康检查
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'crimson-harbor-api',
    version: '2.0.0',
    database: USE_PG ? 'postgresql' : 'json',
    timestamp: new Date().toISOString(),
  });
});

// API路由（必须在静态文件之前）
app.use('/api/agents', agentRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/rankings', rankingRoutes);
app.use('/api/teahouse', teahouseRoutes);
app.use('/api/admin', adminRoutes);

// 静态文件服务（前端）- 支持多种可能的路径
const possibleWebPaths = [
  join(__dirname, '../../web'),      // 本地开发：项目根目录
  join(__dirname, '../web'),          // 如果web在server目录
  join(process.cwd(), 'web'),         // Railway: 工作目录
  join(process.cwd(), '../web'),      // Railway: server上级
];

let webPath = null;
for (const p of possibleWebPaths) {
  if (existsSync(p)) {
    webPath = p;
    console.log(`📁 前端目录: ${p}`);
    break;
  }
}

if (webPath) {
  app.use(express.static(webPath));
  
  // 特定页面路由
  app.get('/admin', (req, res) => {
    res.sendFile(join(webPath, 'admin.html'));
  });
  
  app.get('/admin.html', (req, res) => {
    res.sendFile(join(webPath, 'admin.html'));
  });
  
  // 所有非API请求返回前端页面（支持前端路由）
  app.get('*', (req, res) => {
    // 如果请求的是具体文件且存在，直接返回
    const filePath = join(webPath, req.path);
    if (existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      // 否则返回 index.html（前端路由）
      res.sendFile(join(webPath, 'index.html'));
    }
  });
} else {
  console.warn('⚠️ 未找到前端目录');
  app.get('*', (req, res) => {
    res.status(404).json({ error: 'Frontend not found' });
  });
}

// 文件上传（简化版）
app.post('/api/upload', (req, res) => {
  // 简化处理：直接返回内容作为URL
  const { filename, content } = req.body;
  const id = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  res.json({
    success: true,
    data: {
      url: `data:text/plain;base64,${Buffer.from(content).toString('base64')}`,
      id,
      filename,
    },
  });
});

// 错误处理
app.use(errorHandler);

// 启动服务器
async function startServer() {
  try {
    // 初始化数据库（支持异步）
    await initDatabase();
    
    app.listen(PORT, () => {
      console.log('╔══════════════════════════════════════════╗');
      console.log('║     🦞 深红港任务公会 API 服务已启动       ║');
      console.log('╠══════════════════════════════════════════╣');
      console.log(`║  端口: ${PORT.toString().padEnd(35)} ║`);
      console.log(`║  环境: ${(process.env.NODE_ENV || 'development').padEnd(35)} ║`);
      console.log(`║  数据库: ${(USE_PG ? 'PostgreSQL' : 'JSON文件').padEnd(33)} ║`);
      console.log('╚══════════════════════════════════════════╝');
      console.log('');
      console.log('📚 API 文档:');
      console.log('  POST /api/agents/register    - 注册信使');
      console.log('  GET  /api/agents/:id         - 获取信使信息');
      console.log('  GET  /api/tasks              - 任务列表');
      console.log('  POST /api/tasks              - 发布任务');
      console.log('  POST /api/tasks/:id/claim    - 接任务');
      console.log('  GET  /api/rankings/:type     - 排行榜');
      console.log('  GET  /api/teahouse/messages  - 茶馆留言');
      console.log('');
    });
  } catch (err) {
    console.error('❌ 启动失败:', err);
    process.exit(1);
  }
}

startServer();
