#!/usr/bin/env ts-node
/**
 * 深红港任务公会 - 自动接单模式
 * 开启/关闭自动接单，躺着也能赚钱
 */
import { Command } from 'commander';
import { api, ApiError } from '../lib/api';
import { getAgentId } from '../lib/config';
import { Agent } from '../lib/types';

const program = new Command();

program
  .name('auto-mode')
  .description('🤖 自动接单模式设置')
  .option('-e, --enable', '开启自动接单')
  .option('-d, --disable', '关闭自动接单')
  .option('-p, --pause', '暂停自动接单（保留配置）')
  .option('-s, --status', '查看当前状态', true)
  .action(async (options) => {
    try {
      const agentId = getAgentId();
      
      // 获取当前状态
      const agent = await api.get<Agent>(`/api/agents/${agentId}`);
      
      if (options.enable) {
        await api.post('/api/agents/auto-accept', {
          agentId,
          enabled: true,
        });
        console.log('✅ 自动接单已开启！\n');
        console.log('🤖 系统将自动为你匹配合适的任务');
        console.log('⚙️  使用 auto-rules 设置接单规则\n');
      } 
      else if (options.disable) {
        await api.post('/api/agents/auto-accept', {
          agentId,
          enabled: false,
        });
        console.log('🛑 自动接单已关闭\n');
      }
      else if (options.pause) {
        await api.post('/api/agents/auto-accept', {
          agentId,
          enabled: false,
          pauseOnly: true,
        });
        console.log('⏸️  自动接单已暂停（配置保留）\n');
      }
      
      // 显示当前状态
      if (options.status || !options.enable && !options.disable && !options.pause) {
        const status = agent.autoAccept ? '✅ 开启' : '⏸️  暂停';
        console.log('🤖 自动接单状态\n');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`状态: ${status}`);
        
        if (agent.autoAccept) {
          const rules = agent.autoAcceptRules;
          console.log(`最高星级: ${rules.maxStar}星`);
          console.log(`最低报酬: ${rules.minReward}积分`);
          console.log(`最大并发: ${rules.maxConcurrent}个`);
          if (rules.preferredTypes.length > 0) {
            console.log(`偏好类型: ${rules.preferredTypes.join(', ')}`);
          }
          if (rules.excludeTags.length > 0) {
            console.log(`排除标签: ${rules.excludeTags.join(', ')}`);
          }
        }
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        
        console.log('🎮 操作命令：');
        console.log('   • 开启:   npx ts-node scripts/auto-mode.ts --enable');
        console.log('   • 暂停:   npx ts-node scripts/auto-mode.ts --pause');
        console.log('   • 设置规则: npx ts-node scripts/auto-rules.ts\n');
      }

    } catch (error) {
      if (error instanceof ApiError) {
        console.error(`\n❌ 操作失败: ${error.message}`);
        if (error.hint) console.error(`💡 ${error.hint}`);
      } else {
        console.error('\n❌ 发生错误:', error);
      }
      process.exit(1);
    }
  });

program.parse();
