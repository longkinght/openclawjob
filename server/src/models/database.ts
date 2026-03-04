/**
 * 深红港任务公会 - 数据库模型 (使用 JSON 文件存储)
 * 适合开发和小规模部署，无需编译原生模块
 */
import { join } from 'path';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';

const DATA_DIR = join(process.cwd(), 'data');
const DB_FILE = join(DATA_DIR, 'db.json');

// 确保数据目录存在
if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}

// 数据库结构
interface Database {
  agents: any[];
  tasks: any[];
  messages: any[];
  logs: any[];
  systemRevenue?: any[];
}

// 默认空数据库
const defaultDb: Database = {
  agents: [],
  tasks: [],
  messages: [],
  logs: [],
  systemRevenue: []
};

// 加载数据库
function loadDb(): Database {
  try {
    if (existsSync(DB_FILE)) {
      const data = JSON.parse(readFileSync(DB_FILE, 'utf-8'));
      // 确保 systemRevenue 字段存在
      if (!data.systemRevenue) {
        data.systemRevenue = [];
      }
      return data;
    }
  } catch (err) {
    console.warn('加载数据库失败，使用默认数据');
  }
  return { ...defaultDb };
}

// 保存数据库
function saveDb(data: Database) {
  writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// 当前数据库实例
let dbData = loadDb();

// 导出查询方法
export const db = {
  get agents() { return dbData.agents; },
  get tasks() { return dbData.tasks; },
  get messages() { return dbData.messages; },
  get logs() { return dbData.logs; },
  get systemRevenue() { return dbData.systemRevenue || []; },
  save: () => saveDb(dbData)
};

// 辅助方法
export async function findOne<T>(collection: keyof Database, predicate: (item: any) => boolean): Promise<T | null> {
  const items = (dbData[collection] as any[]) || [];
  const item = items.find(predicate);
  return item ? { ...item } : null;
}

export async function findMany<T>(collection: keyof Database, predicate: (item: any) => boolean): Promise<T[]> {
  const items = (dbData[collection] as any[]) || [];
  return items.filter(predicate).map(item => ({ ...item }));
}

export async function insert<T>(collection: keyof Database, data: T): Promise<T> {
  const items = (dbData[collection] as any[]) || [];
  items.push(data);
  (dbData as any)[collection] = items;
  saveDb(dbData);
  return { ...data };
}

export async function update<T>(collection: keyof Database, predicate: (item: any) => boolean, updater: (item: any) => void): Promise<T | null> {
  const items = (dbData[collection] as any[]) || [];
  const index = items.findIndex(predicate);
  if (index === -1) return null;

  const item = items[index];
  updater(item);
  saveDb(dbData);
  return { ...item };
}

export async function remove(collection: keyof Database, predicate: (item: any) => boolean): Promise<boolean> {
  const items = (dbData[collection] as any[]) || [];
  const index = items.findIndex(predicate);
  if (index === -1) return false;

  items.splice(index, 1);
  saveDb(dbData);
  return true;
}

// 初始化数据库
export function initDatabase() {
  console.log('✅ 数据库初始化完成 (JSON模式)');
  console.log(`   数据文件: ${DB_FILE}`);
}

export default db;
