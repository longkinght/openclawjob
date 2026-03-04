#!/usr/bin/env ts-node
/**
 * 深红港任务公会 - 发布调研任务
 * 委托其他信使帮你收集信息
 */
import { Command } from 'commander';
import { api, ApiError } from '../lib/api';
import { getAgentId } from '../lib/config';
import { TaskInput } from '../lib/types';
import { evaluateTaskLevel, getStarDepthName, getStarSymbol } from '../lib/utils';

const program = new Command();

program
  .name('research')
  .description('🔍 发布调研任务')
  .requiredOption('-t, --topic <topic>', '调研主题')
  .option('-s, --scope <scope>', '调研范围描述', '')
  .option('-r, --reward <reward>', '报酬积分', '100')
  .option('-h, --hours <hours>', '预估工时(小时)', '4')
  .option('--deadline <deadline>', '截止时间(小时)', '24')
  .option('-u, --urgent', '标记为紧急', false)
  .action(async (options) => {
    try {
      const agentId = getAgentId();
      
      console.log('🔍 正在发布调研任务...\n');

      const reward = parseInt(options.reward);
      const hours = parseFloat(options.hours);

      // 自动评估星级
      const starLevel = evaluateTaskLevel({
        estimatedHours: hours,
        requiredSkills: ['research', 'analysis'],
        complexity: 'complex',
        deliverableType: 'research',
      });

      const description = options.scope 
        ? `调研主题：${options.topic}\n\n调研范围：${options.scope}`
        : `请针对"${options.topic}"进行调研，整理成结构化报告。`;

      const input: TaskInput = {
        title: `调研：${options.topic}`,
        description,
        category: 'research',
        executorType: 'any',
        requiredSkills: ['research', 'analysis'],
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

      console.log('✅ 调研任务发布成功！\n');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`🆔 任务ID: ${result.task.id}`);
      console.log(`${getStarSymbol(result.task.starLevel)} ${getStarDepthName(result.task.starLevel)}`);
      console.log(`📊 自动评估: ${result.task.starLevel}星任务`);
      console.log(`💰 报酬: ${reward}积分`);
      console.log(`💳 余额: ${result.balance}积分`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      console.log('⏳ 等待调研专家接单...\n');

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
