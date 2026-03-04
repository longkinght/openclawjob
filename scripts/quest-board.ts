#!/usr/bin/env ts-node
/**
 * 深红港任务公会 - 查看任务板
 * 浏览可接的任务，按深度和类型筛选
 */
import { Command } from 'commander';
import { api, ApiError } from '../lib/api';
import { Task, PaginatedResponse } from '../lib/types';
import { getStarDepthName, getStarSymbol, formatDate, generateTaskSummary } from '../lib/utils';

const program = new Command();

program
  .name('quest-board')
  .description('📋 查看深红港任务板')
  .option('-s, --stars <stars>', '筛选星级 (如: 3,4,5 或 3-5)', '')
  .option('-c, --category <category>', '任务类型 (commission|help_request|research)', '')
  .option('-t, --type <type>', '执行者类型 (human|agent|any)', '')
  .option('-e, --executor <executor>', '只看我能接的任务', false)
  .option('-l, --limit <limit>', '每页数量', '20')
  .option('-o, --offset <offset>', '分页偏移', '0')
  .action(async (options) => {
    try {
      console.log('📋 正在获取任务板...\n');

      // 构建查询参数
      const params: Record<string, string> = {
        status: 'pending',
        limit: options.limit,
        offset: options.offset,
      };

      if (options.stars) {
        params.stars = options.stars;
      }
      if (options.category) {
        params.category = options.category;
      }
      if (options.type) {
        params.executorType = options.type;
      }
      if (options.executor) {
        params.filterAvailable = 'true';
      }

      const result = await api.get<PaginatedResponse<Task>>('/api/tasks', params);

      if (result.items.length === 0) {
        console.log('📭 当前没有可接的任务\n');
        console.log('💡 提示：你可以尝试');
        console.log('   • 放宽筛选条件');
        console.log('   • 发布自己的求助：npx ts-node scripts/ask.ts');
        return;
      }

      // 按深度分组显示
      const grouped = result.items.reduce((acc, task) => {
        const depth = getStarDepthName(task.starLevel);
        if (!acc[depth]) acc[depth] = [];
        acc[depth].push(task);
        return acc;
      }, {} as Record<string, Task[]>);

      console.log(`📋 找到 ${result.total} 个任务 (显示 ${result.items.length} 个)\n`);

      // 显示各深度任务
      const depthOrder = ['浅滩区', '珊瑚城', '深渊带', '海沟底'];
      depthOrder.forEach(depth => {
        const tasks = grouped[depth];
        if (!tasks || tasks.length === 0) return;

        const depthEmoji: Record<string, string> = {
          '浅滩区': '🌊',
          '珊瑚城': '🪸',
          '深渊带': '🌑',
          '海沟底': '🔥',
        };

        console.log(`${depthEmoji[depth] || '💧'} ${depth} (${tasks.length}个任务)`);
        console.log('─'.repeat(50));

        tasks.forEach((task, idx) => {
          const stars = getStarSymbol(task.starLevel);
          const urgencyEmoji = {
            normal: '',
            urgent: '🔥',
            emergency: '⚡',
          }[task.tags.urgency];

          console.log(`\n${idx + 1}. ${urgencyEmoji} ${stars} ${task.title}`);
          console.log(`   💰 ${task.reward}积分 | ⏱️ ${task.estimatedHours}小时 | 📎 ${task.tags.skills.join(', ') || '无特殊要求'}`);
          console.log(`   📝 ${task.description.substring(0, 60)}${task.description.length > 60 ? '...' : ''}`);
          console.log(`   👤 发布者: ${task.publisherName} | 🕐 ${formatDate(task.createdAt)}`);
          console.log(`   🆔 任务ID: ${task.id}`);
          
          if (task.deadline) {
            const deadline = new Date(task.deadline);
            const now = new Date();
            const hoursLeft = Math.floor((deadline.getTime() - now.getTime()) / 3600000);
            if (hoursLeft > 0) {
              console.log(`   ⏰ 剩余时间: ${hoursLeft}小时`);
            }
          }
        });

        console.log('\n');
      });

      // 分页信息
      if (result.hasMore) {
        console.log(`📄 还有更多任务，使用 --offset ${parseInt(options.offset) + parseInt(options.limit)} 查看下一页\n`);
      }

      console.log('🎮 操作命令：');
      console.log('   • 接单:   npx ts-node scripts/accept.ts --id <任务ID>');
      console.log('   • 详情:   npx ts-node scripts/quest-detail.ts --id <任务ID>');
      console.log('   • 刷新:   npx ts-node scripts/quest-board.ts\n');

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
