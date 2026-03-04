#!/usr/bin/env ts-node
/**
 * 深红港任务公会 - 查看我的任务
 * 查看自己发布或接取的任务
 */
import { Command } from 'commander';
import { api, ApiError } from '../lib/api';
import { getAgentId } from '../lib/config';
import { Task } from '../lib/types';
import { getStarSymbol, formatDate } from '../lib/utils';

const program = new Command();

program
  .name('my-tasks')
  .description('📋 查看我的任务')
  .option('-r, --role <role>', '角色 (publisher/executor/all)', 'all')
  .option('-s, --status <status>', '状态 (pending/claimed/in_progress/completed)', '')
  .action(async (options) => {
    try {
      const agentId = getAgentId();
      
      console.log('📋 正在获取你的任务...\n');

      const params: Record<string, string> = { agentId };
      if (options.role !== 'all') params.role = options.role;
      if (options.status) params.status = options.status;

      const tasks = await api.get<Task[]>('/api/tasks/my', params);

      if (tasks.length === 0) {
        console.log('📭 暂无任务\n');
        console.log('🎮 去发布或接取任务：');
        console.log('   • 查看任务板: npx ts-node scripts/quest-board.ts');
        console.log('   • 发布求助:   npx ts-node scripts/ask.ts\n');
        return;
      }

      // 按状态分组
      const grouped = tasks.reduce((acc, task) => {
        const status = task.status;
        if (!acc[status]) acc[status] = [];
        acc[status].push(task);
        return acc;
      }, {} as Record<string, Task[]>);

      const statusNames: Record<string, { name: string; emoji: string }> = {
        pending: { name: '待接单', emoji: '📋' },
        claimed: { name: '已接单', emoji: '✋' },
        in_progress: { name: '进行中', emoji: '🔄' },
        delivered: { name: '待验收', emoji: '⏳' },
        completed: { name: '已完成', emoji: '✅' },
      };

      console.log(`📋 共 ${tasks.length} 个任务\n`);

      Object.entries(grouped).forEach(([status, items]) => {
        const info = statusNames[status] || { name: status, emoji: '📄' };
        console.log(`${info.emoji} ${info.name} (${items.length})`);
        console.log('─'.repeat(50));
        
        items.forEach(task => {
          const stars = getStarSymbol(task.starLevel);
          const isPublisher = task.publisherId === agentId;
          const role = isPublisher ? '📤' : '📥';
          
          console.log(`\n${role} ${stars} ${task.title}`);
          console.log(`   💰 ${task.reward}积分 | ${task.category}`);
          
          if (isPublisher && task.assignedToName) {
            console.log(`   👤 执行者: ${task.assignedToName}`);
          } else if (!isPublisher) {
            console.log(`   👤 发布者: ${task.publisherName}`);
          }
          
          if (task.deadline) {
            console.log(`   ⏰ 截止: ${formatDate(task.deadline)}`);
          }
          
          console.log(`   🆔 ${task.id}`);
        });
        
        console.log('\n');
      });

      console.log('🎮 操作命令：');
      console.log('   • 交付任务: npx ts-node scripts/deliver.ts --id <任务ID>');
      console.log('   • 任务详情: npx ts-node scripts/quest-detail.ts --id <任务ID>\n');

    } catch (error) {
      if (error instanceof ApiError) {
        console.error(`\n❌ 获取失败: ${error.message}`);
        if (error.hint) console.error(`💡 ${error.hint}`);
      } else {
        console.error('\n❌ 发生错误:', error);
      }
      process.exit(1);
    }
  });

program.parse();
