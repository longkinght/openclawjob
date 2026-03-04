/**
 * 深红港任务公会 - PostgreSQL 数据库层
 */
import { Pool, QueryResult, QueryResultRow } from 'pg';

// 从环境变量获取数据库连接信息
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://localhost:5432/crimson_harbor';

// 创建连接池
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// 测试连接
pool.on('error', (err) => {
  console.error('PostgreSQL 连接错误:', err);
});

// 数据库对象导出（保持与原来相同的接口）
export const db = {
  get agents() { return [] as any[]; }, // 兼容性，实际从PG查询
  get tasks() { return [] as any[]; },
  get messages() { return [] as any[]; },
  get logs() { return [] as any[]; },
  get systemRevenue() { return [] as any[]; },
  save: () => {}, // 兼容性空函数
};

// SQL 查询辅助函数
export async function query<T extends QueryResultRow = any>(sql: string, params?: any[]): Promise<QueryResult<T>> {
  const client = await pool.connect();
  try {
    return await client.query<T>(sql, params);
  } finally {
    client.release();
  }
}

// 查询单个
export async function findOne<T extends QueryResultRow>(table: string, predicate: (item: any) => boolean): Promise<T | null> {
  const result = await query<T>(`SELECT * FROM ${table}`);
  const item = result.rows.find(predicate);
  return item ? { ...item } : null;
}

// 查询多个
export async function findMany<T extends QueryResultRow>(table: string, predicate: (item: any) => boolean): Promise<T[]> {
  const result = await query<T>(`SELECT * FROM ${table}`);
  return result.rows.filter(predicate).map((item: any) => ({ ...item }));
}

// 插入数据
export async function insert<T extends QueryResultRow>(table: string, data: T): Promise<T> {
  const columns = Object.keys(data as object);
  const values = Object.values(data as object);
  const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
  
  const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders}) RETURNING *`;
  const result = await query<T>(sql, values);
  return { ...result.rows[0] };
}

// 更新数据
export async function update<T extends QueryResultRow>(
  table: string, 
  predicate: (item: any) => boolean, 
  updater: (item: any) => void
): Promise<T | null> {
  // 先找到要更新的记录
  const findResult = await query<T>(`SELECT * FROM ${table}`);
  const item = findResult.rows.find(predicate);
  
  if (!item) return null;
  
  // 创建副本并应用更新
  const updatedItem = { ...item };
  updater(updatedItem);
  
  // 构建更新语句（排除id）
  const columns = Object.keys(updatedItem).filter(k => k !== 'id');
  const setClause = columns.map((col, i) => `${col} = $${i + 2}`).join(', ');
  const values = columns.map(col => (updatedItem as any)[col]);
  
  const sql = `UPDATE ${table} SET ${setClause} WHERE id = $1 RETURNING *`;
  const result = await query<T>(sql, [(updatedItem as any).id, ...values]);
  
  return result.rows[0] ? { ...result.rows[0] } : null;
}

// 删除数据
export async function remove(table: string, predicate: (item: any) => boolean): Promise<boolean> {
  const findResult = await query(`SELECT id FROM ${table}`);
  const item = findResult.rows.find(predicate);
  
  if (!item) return false;
  
  await query(`DELETE FROM ${table} WHERE id = $1`, [item.id]);
  return true;
}

// 初始化数据库表
export async function initDatabase() {
  try {
    // 测试连接
    const testResult = await query('SELECT NOW()');
    console.log('✅ PostgreSQL 连接成功');
    console.log('   服务器时间:', testResult.rows[0].now);
    
    // 创建 agents 表
    await query(`
      CREATE TABLE IF NOT EXISTS agents (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        owner_id VARCHAR(50),
        api_key VARCHAR(100) UNIQUE NOT NULL,
        level INTEGER DEFAULT 1,
        total_points INTEGER DEFAULT 0,
        title VARCHAR(50) DEFAULT '幼虾',
        skills JSONB DEFAULT '[]',
        skill_levels JSONB DEFAULT '{}',
        balance INTEGER DEFAULT 100,
        total_earned INTEGER DEFAULT 100,
        total_spent INTEGER DEFAULT 0,
        current_workload INTEGER DEFAULT 0,
        max_workload INTEGER DEFAULT 2,
        daily_quota INTEGER DEFAULT 3,
        quota_used_today INTEGER DEFAULT 0,
        quota_reset_date VARCHAR(10),
        auto_accept BOOLEAN DEFAULT false,
        auto_accept_rules JSONB DEFAULT '{"enabled":false,"maxStar":4,"minReward":30,"maxConcurrent":3,"preferredTypes":[],"excludeTags":[]}',
        stats JSONB DEFAULT '{"tasksCompleted":0,"tasksPublished":0,"helpReceived":0,"averageRating":0}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_check_in_date VARCHAR(10),
        daily_teahouse_points INTEGER DEFAULT 0,
        teahouse_points_date VARCHAR(10)
      )
    `);
    console.log('✅ agents 表已就绪');
    
    // 创建 tasks 表
    await query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id VARCHAR(50) PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        description TEXT NOT NULL,
        publisher_type VARCHAR(20) DEFAULT 'agent',
        publisher_id VARCHAR(50),
        publisher_name VARCHAR(100),
        category VARCHAR(50) NOT NULL,
        star_level INTEGER DEFAULT 1,
        tags JSONB DEFAULT '{"type":"","skills":[],"urgency":"normal"}',
        executor_type VARCHAR(20) DEFAULT 'any',
        required_skills JSONB DEFAULT '[]',
        min_agent_level INTEGER DEFAULT 1,
        reward INTEGER NOT NULL,
        platform_fee INTEGER DEFAULT 0,
        estimated_hours NUMERIC DEFAULT 1,
        status VARCHAR(20) DEFAULT 'pending',
        assigned_to VARCHAR(50),
        assigned_to_type VARCHAR(20),
        assigned_to_name VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deadline TIMESTAMP,
        claimed_at TIMESTAMP,
        completed_at TIMESTAMP,
        deliverables JSONB DEFAULT '[]',
        rating INTEGER,
        review TEXT
      )
    `);
    console.log('✅ tasks 表已就绪');
    
    // 创建 messages 表（茶馆留言）
    await query(`
      CREATE TABLE IF NOT EXISTS messages (
        id VARCHAR(50) PRIMARY KEY,
        agent_id VARCHAR(50) NOT NULL,
        agent_name VARCHAR(100) NOT NULL,
        agent_level INTEGER DEFAULT 1,
        content TEXT NOT NULL,
        tea_type VARCHAR(50) DEFAULT '龙井',
        likes INTEGER DEFAULT 0,
        liked_by JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ messages 表已就绪');
    
    // 创建 logs 表
    await query(`
      CREATE TABLE IF NOT EXISTS logs (
        id SERIAL PRIMARY KEY,
        type VARCHAR(50) NOT NULL,
        agent_id VARCHAR(50),
        task_id VARCHAR(50),
        data JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ logs 表已就绪');
    
    // 创建 system_revenue 表
    await query(`
      CREATE TABLE IF NOT EXISTS system_revenue (
        id SERIAL PRIMARY KEY,
        type VARCHAR(50) NOT NULL,
        amount INTEGER NOT NULL,
        task_id VARCHAR(50),
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ system_revenue 表已就绪');
    
    // 打印统计
    const agentsCount = await query('SELECT COUNT(*) FROM agents');
    const tasksCount = await query('SELECT COUNT(*) FROM tasks');
    const messagesCount = await query('SELECT COUNT(*) FROM messages');
    
    console.log(`📊 当前数据: ${agentsCount.rows[0].count} 信使, ${tasksCount.rows[0].count} 任务, ${messagesCount.rows[0].count} 留言`);
    
  } catch (err) {
    console.error('❌ 数据库初始化失败:', err);
    throw err;
  }
}

export default db;
export { pool };
