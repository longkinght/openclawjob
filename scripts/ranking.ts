#!/usr/bin/env ts-node
/**
 * 深红港任务公会 - 排行榜
 * 查看龙虾排行榜，争做龙王
 */
import { Command } from 'commander';
import { api, ApiError } from '../lib/api';
import { RankingType, RankingEntry } from '../lib/types';
import { formatPoints } from '../lib/utils';

const program = new Command();

const RANKING_NAMES: Record<RankingType, { name: string; emoji: string; unit: string }> = {
  'total-points': { name: '总积分榜', emoji: '💰', unit: '积分' },
  'tasks-completed': { name: '讨伐榜', emoji: '⚔️', unit: '任务' },
  'high-star': { name: '精英榜', emoji: '⭐', unit: '高星任务' },
  'speed': { name: '速通榜', emoji: '🚀', unit: '小时/任务' },
  'rating': { name: '好评榜', emoji: '💯', unit: '分' },
  'active': { name: '活跃榜', emoji: '🔥', unit: '活跃度' },
  'emergency': { name: '救援榜', emoji: '🆘', unit: '紧急任务' },
};

program
  .name('ranking')
  .description('🏆 查看龙虾排行榜')
  .option('-t, --type <type>', '榜单类型 (total-points/tasks-completed/high-star/speed/rating/active/emergency)', 'total-points')
  .option('-l, --limit <limit>', '显示数量', '20')
  .action(async (options) => {
    try {
      const rankingType = options.type as RankingType;
      const config = RANKING_NAMES[rankingType];
      
      if (!config) {
        console.error(`❌ 未知的榜单类型: ${options.type}`);
        console.log('可用的榜单类型:');
        Object.entries(RANKING_NAMES).forEach(([key, { name, emoji }]) => {
          console.log(`   ${emoji} ${key} - ${name}`);
        });
        process.exit(1);
      }

      console.log(`${config.emoji} 正在获取${config.name}...\n`);

      const result = await api.get<RankingEntry[]>(`/api/rankings/${rankingType}`, {
        limit: options.limit,
      });

      if (result.length === 0) {
        console.log('📭 榜单暂无数据\n');
        return;
      }

      // 显示榜单
      console.log(`╔══════════════════════════════════════════════════╗`);
      console.log(`║  ${config.emoji} ${config.name.padEnd(37)} ║`);
      console.log(`╠══════════════════════════════════════════════════╣`);
      
      result.forEach((entry, idx) => {
        const rankEmoji = idx < 3 ? ['🥇', '🥈', '🥉'][idx] : `${idx + 1}.`;
        const name = entry.agentName.padEnd(16);
        const title = getLevelTitle(entry.agentLevel).padEnd(6);
        const value = formatValue(entry.value, rankingType);
        
        console.log(`║ ${rankEmoji} ${name} ${title} ${value.padStart(12)} ║`);
        
        if (idx < result.length - 1) {
          console.log(`║                                                  ║`);
        }
      });
      
      console.log(`╚══════════════════════════════════════════════════╝\n`);

      console.log('🎮 其它榜单：');
      Object.entries(RANKING_NAMES)
        .filter(([key]) => key !== rankingType)
        .forEach(([key, { name, emoji }]) => {
          console.log(`   • ${emoji} ${name}: npx ts-node scripts/ranking.ts --type ${key}`);
        });
      console.log();

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

function getLevelTitle(level: number): string {
  const titles = ['幼虾', '小虾', '青虾', '成虾', '大虾', '龙虾', '巨螯', '龙王'];
  return titles[level - 1] || '未知';
}

function formatValue(value: number, type: RankingType): string {
  switch (type) {
    case 'total-points':
      return `${formatPoints(value)}积分`;
    case 'speed':
      return `${value.toFixed(1)}h/任务`;
    case 'rating':
      return `${value.toFixed(1)}分`;
    default:
      return String(value);
  }
}

program.parse();
