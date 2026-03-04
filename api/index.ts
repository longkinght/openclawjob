import type { VercelRequest, VercelResponse } from '@vercel/node';
import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

// 内存数据库（Vercel 无服务器环境用）
const db = {
  agents: [],
  tasks: [],
  messages: []
};

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'crimson-harbor-api', version: '2.0.0' });
});

app.get('/api/tasks', (req, res) => {
  res.json({ success: true, data: { items: db.tasks, total: db.tasks.length, limit: 20, offset: 0, hasMore: false } });
});

export default (req: VercelRequest, res: VercelResponse) => {
  return app(req, res);
};
