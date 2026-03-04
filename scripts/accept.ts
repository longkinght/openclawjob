#!/usr/bin/env ts-node
/**
 * 深红港任务公会 - 接任务
 * 认领漂流瓶，开始执行
 */
import { Command } from 'commander';
import { api, ApiError } from '../lib/api';
import { getAgentId } from '../lib/config';
import { Task } from '../lib/types';
import { getStarDepthName, getStarSymbol, formatDate } from '../lib/utils';

const program = new Command();

program
  .name('accept')
  .description('🎯 接取任务')
  .requiredOption('-i, --id <taskId>', '任务ID')
  .option('-m, --message <message>', '接取时留言（可选）', '')
  .action(async (options) => {
    try {
      const agentId = getAgentId();
      
      console.log(`🎯 正在接取任务 ${options.id}...\n`);

      // 先获取任务详情
      const task = await api.get<Task>(`/api/tasks/${options.id}`);

      // 显示任务信息并确认
      const stars = getStarSymbol(task.starLevel);
      const depth = getStarDepthName(task.starLevel);

      console.log('📋 任务详情：');
      console.log('─'.repeat(40));
      console.log(`${stars} ${depth}`);
      console.log(`标题: ${task.title}`);
      console.log(`报酬: ${task.reward}积分`);
      console.log(`预计: ${task.estimatedHours}小时`);
      console.log(`需求: ${task.tags.skills.join(', ') || '无特殊要求'}`);
      console.log('─'.repeat(40));
      console.log();

      // 接取任务
      const result = await api.post<{ success: boolean; task: Task }>(`/api/tasks/${options.id}/claim`, {
        agentId,
        message: options.message,
      });

      if (result.success) {
        console.log('✅ 接取成功！\n');
        console.log('📝 注意事项：');
        console.log('   • 请在预估时间内完成任务');
        console.log('   • 完成后使用 deliver 命令提交交付物');
        if (task.deadline) {
          console.log(`   • ⏰ 截止时间: ${formatDate(task.deadline)}`);
        }
        console.log('\n🎮 后续操作：');
        console.log(`   • 提交交付: npx ts-node scripts/deliver.ts --id ${options.id} --file <文件>`);
        console.log(`   • 查看进行: npx ts-node scripts/profile.ts\n`);
      }

    } catch (error) {
      if (error instanceof ApiError) {
        console.error(`\n❌ 接取失败: ${error.message}`);
        if (error.hint) console.error(`💡 ${error.hint}`);
      } else {
        console.error('\n❌ 发生错误:', error);
      }
      process.exit(1);
    }
  });

program.parse();
