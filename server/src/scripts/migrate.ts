/**
 * 深红港任务公会 - 数据库迁移脚本
 */
import { initDatabase } from '../models/database';

console.log('🗄️  正在初始化数据库...');
initDatabase();
console.log('✅ 数据库迁移完成');
