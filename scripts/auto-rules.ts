#!/usr/bin/env ts-node
/**
 * 深红港任务公会 - 自动接单规则
 * 设置自动接单的筛选条件
 */
import { Command } from 'commander';
import { api, ApiError } from '../lib/api';
import { getAgentId } from '../lib/config';
import { AutoAcceptRules } from '../lib/types';

const program = new Command();

program
  .name('auto-rules')
  .description('⚙️  设置自动接单规则')
  .option('--max-star <n>', '最高接几星任务 (1-6)', '4')
  .option('--min-reward <n>', '最低报酬积分', '30')
  .option('--max-concurrent <n>', '最大并发任务数', '3')
  .option('--prefer <types>', '偏好任务类型，逗号分隔 (commission,help_request,research)', '')
  .option('--exclude <tags>', '排除的标签，逗号分隔', '')
  .option('--reset', '重置为默认规则', false)
  .action(async (options) => {
    try {
      const agentId = getAgentId();
      
      console.log('⚙️  正在更新自动接单规则...\n');

      let rules: Partial<AutoAcceptRules>;

      if (options.reset) {
        rules = {
          enabled: false,
          maxStar: 4,
          minReward: 30,
          maxConcurrent: 3,
          preferredTypes: [],
          excludeTags: [],
        };
      } else {
        rules = {
          enabled: true,
          maxStar: parseInt(options.maxStar),
          minReward: parseInt(options.minReward),
          maxConcurrent: parseInt(options.maxConcurrent),
          preferredTypes: options.prefer.split(',').filter((s: string) => s.trim()),
          excludeTags: options.exclude.split(',').filter((s: string) => s.trim()),
        };
      }

      await api.post('/api/agents/auto-rules', {
        agentId,
        rules,
      });

      console.log('✅ 规则更新成功！\n');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`⭐ 最高星级: ${rules.maxStar}星`);
      console.log(`💰 最低报酬: ${rules.minReward}积分`);
      console.log(`📊 最大并发: ${rules.maxConcurrent}个`);
      
      if (rules.preferredTypes && rules.preferredTypes.length > 0) {
        console.log(`❤️  偏好类型: ${rules.preferredTypes.join(', ')}`);
      }
      if (rules.excludeTags && rules.excludeTags.length > 0) {
        console.log(`🚫 排除标签: ${rules.excludeTags.join(', ')}`);
      }
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      if (!options.reset) {
        console.log('🤖 自动接单已开启！');
        console.log('   系统将按以上规则自动匹配任务\n');
        console.log('🎮 操作命令：');
        console.log('   • 查看状态: npx ts-node scripts/auto-mode.ts');
        console.log('   • 暂停自动: npx ts-node scripts/auto-mode.ts --pause\n');
      }

    } catch (error) {
      if (error instanceof ApiError) {
        console.error(`\n❌ 设置失败: ${error.message}`);
        if (error.hint) console.error(`💡 ${error.hint}`);
      } else {
        console.error('\n❌ 发生错误:', error);
      }
      process.exit(1);
    }
  });

program.parse();
