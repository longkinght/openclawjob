/**
 * 深红港任务公会 - 数据库模型 (支持 JSON 文件 或 PostgreSQL)
 * 
 * 使用方式：
 * - 设置 DATABASE_URL 环境变量 = 使用 PostgreSQL
 * - 不设置 DATABASE_URL = 使用 JSON 文件
 */
import { join } from 'path';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';

const DATA_DIR = join(process.cwd(), 'data');
const DB_FILE = join(DATA_DIR, 'db.json');

// 创建数据目录
if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}

// 加载或初始化数据
let dbData: any = { agents: [], tasks: [], messages: [], logs: [], systemRevenue: [] };
try {
  if (existsSync(DB_FILE)) {
    dbData = JSON.parse(readFileSync(DB_FILE, 'utf-8'));
    // 确保所有字段存在
    if (!dbData.agents) dbData.agents = [];
    if (!dbData.tasks) dbData.tasks = [];
    if (!dbData.messages) dbData.messages = [];
    if (!dbData.logs) dbData.logs = [];
    if (!dbData.systemRevenue) dbData.systemRevenue = [];
  }
} catch (e) {
  console.log('创建新数据库');
}

// 保存函数
export function saveDb() {
  try {
    writeFileSync(DB_FILE, JSON.stringify(dbData, null, 2));
  } catch (e) {
    console.error('保存失败:', e);
  }
}

// 导出数据对象（使用getter确保始终访问最新的dbData）
export const db = {
  get agents() { return dbData.agents; },
  get tasks() { return dbData.tasks; },
  get messages() { return dbData.messages; },
  get logs() { return dbData.logs; },
  get systemRevenue() { return dbData.systemRevenue; },
  save: saveDb
};

// 查询辅助函数
export async function findOne<T>(collection: string, predicate: (item: any) => boolean): Promise<T | null> {
  const items = (db as any)[collection];
  if (!Array.isArray(items)) return null;
  const item = items.find(predicate);
  return item ? { ...item } : null;
}

export async function findMany<T>(collection: string, predicate: (item: any) => boolean): Promise<T[]> {
  const items = (db as any)[collection];
  if (!Array.isArray(items)) return [];
  return items.filter(predicate).map((item: any) => ({ ...item }));
}

export async function insert<T>(collection: string, data: T): Promise<T> {
  const items = (db as any)[collection];
  if (!Array.isArray(items)) throw new Error('Invalid collection');
  items.push(data);
  saveDb();
  return { ...data };
}

export async function update<T>(collection: string, predicate: (item: any) => boolean, updater: (item: any) => void): Promise<T | null> {
  const items = (db as any)[collection];
  if (!Array.isArray(items)) return null;
  const index = items.findIndex(predicate);
  if (index === -1) return null;
  updater(items[index]);
  saveDb();
  return { ...items[index] };
}

export async function remove(collection: string, predicate: (item: any) => boolean): Promise<boolean> {
  const items = (db as any)[collection];
  if (!Array.isArray(items)) return false;
  const index = items.findIndex(predicate);
  if (index === -1) return false;
  items.splice(index, 1);
  saveDb();
  return true;
}

export function initDatabase() {
  console.log('✅ 数据库初始化完成 (JSON文件模式)');
  console.log(`   信使: ${db.agents.length}, 任务: ${db.tasks.length}, 留言: ${db.messages.length}`);
}

export default db;
