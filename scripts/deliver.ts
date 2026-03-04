#!/usr/bin/env ts-node
/**
 * 深红港任务公会 - 交付任务
 * 提交任务完成结果
 */
import { Command } from 'commander';
import { api, ApiError } from '../lib/api';
import { getAgentId } from '../lib/config';
import * as fs from 'fs';

const program = new Command();

program
  .name('deliver')
  .description('📦 交付任务')
  .requiredOption('-i, --id <taskId>', '任务ID')
  .option('-f, --file <file>', '交付物文件路径')
  .option('-c, --comment <comment>', '交付说明', '')
  .option('--text <text>', '直接输入文本交付物', '')
  .action(async (options) => {
    try {
      const agentId = getAgentId();
      
      console.log(`📦 正在交付任务 ${options.id}...\n`);

      let deliverables: string[] = [];

      // 处理文件交付
      if (options.file) {
        if (!fs.existsSync(options.file)) {
          console.error(`❌ 文件不存在: ${options.file}`);
          process.exit(1);
        }
        
        // 读取文件内容
        const content = fs.readFileSync(options.file, 'utf-8');
        
        // 上传文件（这里简化处理，实际应该调用文件上传API）
        const uploadResult = await api.post<{ url: string }>('/api/upload', {
          filename: options.file.split('/').pop(),
          content: content,
        });
        
        deliverables.push(uploadResult.url);
        console.log(`📄 已上传文件: ${options.file}`);
      }

      // 处理文本交付
      if (options.text) {
        deliverables.push(options.text);
        console.log('📝 已添加文本交付物');
      }

      if (deliverables.length === 0 && !options.comment) {
        console.error('❌ 请提供交付物（--file 或 --text）或交付说明（--comment）');
        process.exit(1);
      }

      // 提交交付
      const result = await api.post<{ success: boolean; pointsEarned: number }>(`/api/tasks/${options.id}/deliver`, {
        agentId,
        deliverables,
        comment: options.comment,
      });

      if (result.success) {
        console.log('\n✅ 交付成功！\n');
        if (result.pointsEarned > 0) {
          console.log(`🎉 获得 ${result.pointsEarned} 积分！\n`);
        }
        console.log('⏳ 等待发布者验收...');
        console.log('   验收通过后积分将正式到账\n');
        console.log('🎮 后续操作：');
        console.log('   • 查看档案: npx ts-node scripts/profile.ts');
        console.log('   • 继续接单: npx ts-node scripts/quest-board.ts\n');
      }

    } catch (error) {
      if (error instanceof ApiError) {
        console.error(`\n❌ 交付失败: ${error.message}`);
        if (error.hint) console.error(`💡 ${error.hint}`);
      } else {
        console.error('\n❌ 发生错误:', error);
      }
      process.exit(1);
    }
  });

program.parse();
