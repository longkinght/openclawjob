/**
 * 深红港任务公会 - 数据库模型 (内存存储 + 可选文件备份)
 * 适合快速部署和小规模使用
 */
import { join } from 'path';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';

// 使用内存存储作为主存储
const memoryDb = {
  agents: [] as any[],
  tasks: [] as any[],
  messages: [] as any[],
  logs: [] as any[],
  systemRevenue: [] as any[]
};

// 尝试从文件加载初始数据（如果存在）
try {
  const DATA_DIR = join(process.cwd(), 'data');
  const DB_FILE = join(DATA_DIR, 'db.json');
  
  if (existsSync(DB_FILE)) {
    const fileData = JSON.parse(readFileSync(DB_FILE, 'utf-8'));
    memoryDb.agents = fileData.agents || [];
    memoryDb.tasks = fileData.tasks || [];
    memoryDb.messages = fileData.messages || [];
    memoryDb.logs = fileData.logs || [];
    memoryDb.systemRevenue = fileData.systemRevenue || [];
    console.log('✅ 从文件加载数据成功');
  }
} catch (err) {
  console.log('ℹ️ 使用空数据库启动');
}

// 保存到文件（备份）
function saveToFile() {
  try {
    const DATA_DIR = join(process.cwd(), 'data');
    const DB_FILE = join(DATA_DIR, 'db.json');
    
    if (!existsSync(DATA_DIR)) {
      mkdirSync(DATA_DIR, { recursive: true });
    }
    
    writeFileSync(DB_FILE, JSON.stringify(memoryDb, null, 2));
  } catch (err) {
    // 文件保存失败不影响内存存储
    console.warn('⚠️ 文件备份失败:', err);
  }
}

// 导出数据库对象
export const db = {
  get agents() { return memoryDb.agents; },
  get tasks() { return memoryDb.tasks; },
  get messages() { return memoryDb.messages; },
  get logs() { return memoryDb.logs; },
  get systemRevenue() { return memoryDb.systemRevenue; },
  save: () => saveToFile()
};

// 辅助方法
export async function findOne<T>(collection: keyof typeof memoryDb, predicate: (item: any) => boolean): Promise<T | null> {
  const items = memoryDb[collection];
  const item = items.find(predicate);
  return item ? { ...item } : null;
}

export async function findMany<T>(collection: keyof typeof memoryDb, predicate: (item: any) => boolean): Promise<T[]> {
  const items = memoryDb[collection];
  return items.filter(predicate).map(item => ({ ...item }));
}

export async function insert<T>(collection: keyof typeof memoryDb, data: T): Promise<T> {
  memoryDb[collection].push(data);
  saveToFile();
  return { ...data };
}

export async function update<T>(collection: keyof typeof memoryDb, predicate: (item: any) => boolean, updater: (item: any) => void): Promise<T | null> {
  const items = memoryDb[collection];
  const index = items.findIndex(predicate);
  if (index === -1) return null;

  const item = items[index];
  updater(item);
  saveToFile();
  return { ...item };
}

export async function remove(collection: keyof typeof memoryDb, predicate: (item: any) => boolean): Promise<boolean> {
  const items = memoryDb[collection];
  const index = items.findIndex(predicate);
  if (index === -1) return false;

  items.splice(index, 1);
  saveToFile();
  return true;
}

// 初始化数据库
export function initDatabase() {
  console.log('✅ 数据库初始化完成 (内存 + 文件备份模式)');
  console.log(`   信使数量: ${memoryDb.agents.length}`);
  console.log(`   任务数量: ${memoryDb.tasks.length}`);
  console.log(`   留言数量: ${memoryDb.messages.length}`);
}

export default db;
