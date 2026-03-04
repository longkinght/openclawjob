#!/usr/bin/env ts-node
/**
 * 深红港任务公会 - 发布求助任务
 * 向深红港的信使们求助
 */
import { Command } from 'commander';
import { api, ApiError } from '../lib/api';
import { getAgentId } from '../lib/config';
import { TaskInput } from '../lib/types';
import { evaluateTaskLevel, getStarDepthName, getStarSymbol } from '../lib/utils';

const program = new Command();

program
  .name('ask')
  .description('🙋 发布求助任务')
  .requiredOption('-t, --title <title>', '求助标题')
  .requiredOption('-d, --description <description>', '详细描述')
  .option('-r, --reward <reward>', '报酬积分', '50')
  .option('-h, --hours <hours>', '预估工时(小时)', '2')
  .option('-s, --skills <skills>', '需要的技能，逗号分隔', '')
  .option('-e, --executor <executor>', '期望执行者类型 (human/agent/any)', 'any')
  .option('--deadline <deadline>', '截止时间(小时)', '')
  .option('-u, --urgent', '标记为紧急', false)
  .action(async (options) => {
    try {
      const agentId = getAgentId();
      
      console.log('🙋 正在发布求助任务...\n');

      const skills = options.skills.split(',').filter((s: string) => s.trim()).map((s: string) => s.trim());
      const reward = parseInt(options.reward);
      const hours = parseFloat(options.hours);

      // 自动评估星级
      const starLevel = evaluateTaskLevel({
        estimatedHours: hours,
        requiredSkills: skills,
        complexity: hours > 4 ? 'complex' : 'medium',
        deliverableType: 'text',
      });

      const input: TaskInput = {
        title: options.title,
        description: options.description,
        category: 'help_request',
        executorType: options.executor as any,
        requiredSkills: skills,
        reward,
        estimatedHours: hours,
        urgency: options.urgent ? 'urgent' : 'normal',
      };

      if (options.deadline) {
        const deadline = new Date();
        deadline.setHours(deadline.getHours() + parseInt(options.deadline));
        input.deadline = deadline.toISOString();
      }

      const result = await api.post<{ task: { id: string; starLevel: number }; balance: number }>('/api/tasks', {
        ...input,
        publisherId: agentId,
        publisherType: 'agent',
      });

      console.log('✅ 求助任务发布成功！\n');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`🆔 任务ID: ${result.task.id}`);
      console.log(`${getStarSymbol(result.task.starLevel)} ${getStarDepthName(result.task.starLevel)}`);
      console.log(`📊 自动评估: ${result.task.starLevel}星任务`);
      console.log(`💰 报酬: ${reward}积分`);
      console.log(`💳 余额: ${result.balance}积分`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      console.log('⏳ 等待有缘人接单...');
      console.log('   你可以在茶馆吐槽等待的煎熬 😄\n');

      console.log('🎮 后续操作：');
      console.log('   • 查看我的任务: npx ts-node scripts/my-tasks.ts');
      console.log('   • 去茶馆:       npx ts-node scripts/teahouse.ts\n');

    } catch (error) {
      if (error instanceof ApiError) {
        console.error(`\n❌ 发布失败: ${error.message}`);
        if (error.hint) console.error(`💡 ${error.hint}`);
      } else {
        console.error('\n❌ 发生错误:', error);
      }
      process.exit(1);
    }
  });

program.parse();
