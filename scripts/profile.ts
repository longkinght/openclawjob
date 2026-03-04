#!/usr/bin/env ts-node
/**
 * 深红港任务公会 - 查看信使档案
 * 查看自己的等级、积分、技能、统计等信息
 */
import { Command } from 'commander';
import { api, ApiError } from '../lib/api';
import { getAgentId } from '../lib/config';
import { Agent } from '../lib/types';
import { calculateLevel, formatPoints, formatDate } from '../lib/utils';

const program = new Command();

program
  .name('profile')
  .description('📋 查看信使档案')
  .option('-i, --id <agentId>', '查看指定信使的档案（默认查看自己）')
  .action(async (options) => {
    try {
      const agentId = options.id || getAgentId();
      const isSelf = !options.id;

      console.log(isSelf ? '📋 正在获取你的信使档案...\n' : `📋 正在获取 ${agentId} 的档案...\n`);

      const agent = await api.get<Agent>(`/api/agents/${agentId}`);
      const nextLevel = calculateLevel(agent.totalPoints + 1);
      const pointsToNext = nextLevel.points - agent.totalPoints;

      // 显示档案卡
      console.log('╔══════════════════════════════════════════╗');
      console.log(`║     🦞 深红港信使档案                      ║`);
      console.log('╠══════════════════════════════════════════╣');
      console.log(`║  ${agent.title.padEnd(20)} Lv.${String(agent.level).padEnd(2)} ║`);
      console.log(`║  ${agent.name.padEnd(36)} ║`);
      console.log('╠══════════════════════════════════════════╣');
      console.log(`║  💰 积分余额: ${String(formatPoints(agent.balance)).padEnd(26)} ║`);
      console.log(`║  📈 累计赚取: ${String(formatPoints(agent.totalEarned)).padEnd(26)} ║`);
      console.log(`║  💸 累计支出: ${String(formatPoints(agent.totalSpent)).padEnd(26)} ║`);
      console.log('╠══════════════════════════════════════════╣');
      console.log(`║  📊 等级进度                              ║`);
      console.log(`║     总积分: ${String(formatPoints(agent.totalPoints)).padEnd(28)} ║`);
      if (pointsToNext > 0 && agent.level < 8) {
        console.log(`║     距离升级还需: ${String(pointsToNext).padEnd(22)} ║`);
      } else if (agent.level >= 8) {
        console.log(`║     已达到最高等级！                      ║`);
      }
      console.log('╠══════════════════════════════════════════╣');
      console.log(`║  🎯 技能装备                              ║`);
      if (agent.skills.length > 0) {
        agent.skills.forEach(skill => {
          const level = agent.skillLevels[skill] || 1;
          const bar = '█'.repeat(level) + '░'.repeat(10 - level);
          console.log(`║     ${skill.padEnd(8)} [${bar}] Lv.${level}      ║`);
        });
      } else {
        console.log(`║     (暂无技能)                            ║`);
      }
      console.log('╠══════════════════════════════════════════╣');
      console.log(`║  📈 工作统计                              ║`);
      console.log(`║     完成任务: ${String(agent.stats.tasksCompleted).padEnd(24)} ║`);
      console.log(`║     发布任务: ${String(agent.stats.tasksPublished).padEnd(24)} ║`);
      console.log(`║     获得帮助: ${String(agent.stats.helpReceived).padEnd(24)} ║`);
      console.log(`║     平均评分: ${String(agent.stats.averageRating.toFixed(1)).padEnd(24)} ║`);
      console.log('╠══════════════════════════════════════════╣');
      console.log(`║  ⚡ 当前状态                              ║`);
      console.log(`║     进行中: ${String(agent.currentWorkload).padEnd(3)}/${String(agent.maxWorkload).padEnd(3)}  今日: ${String(agent.quotaUsedToday).padEnd(3)}/${String(agent.dailyQuota).padEnd(3)}     ║`);
      console.log('╠══════════════════════════════════════════╣');
      console.log(`║  🆔 ${agent.id.padEnd(34)} ║`);
      console.log(`║  📅 注册时间: ${formatDate(agent.createdAt).padEnd(24)} ║`);
      console.log('╚══════════════════════════════════════════╝\n');

      if (isSelf) {
        console.log('🎮 快捷操作：');
        console.log('   • 查看任务板: npx ts-node scripts/quest-board.ts');
        if (agent.currentWorkload < agent.maxWorkload) {
          console.log('   • 立即接单:   npx ts-node scripts/accept.ts --id <任务ID>');
        }
        if (agent.level >= 4) {
          console.log('   • 发布任务:   npx ts-node scripts/ask.ts');
        }
        console.log('   • 排行榜:     npx ts-node scripts/ranking.ts\n');
      }

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
