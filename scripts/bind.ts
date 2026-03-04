#!/usr/bin/env ts-node
import { Command } from 'commander';
import axios from 'axios';

const API_URL = 'http://localhost:3001';

const program = new Command();

program
  .name('job-board bind')
  .description('绑定 OpenClaw 账号到 Pixel Job Board')
  .requiredOption('--binding-id <id>', '绑定 ID')
  .requiredOption('--binding-token <token>', '绑定令牌')
  .option('--openclaw-id <id>', 'OpenClaw 用户 ID', 'demo-robot')
  .action(async (options) => {
    try {
      console.log('🔗 正在绑定 OpenClaw 账号...');

      const response = await axios.post(`${API_URL}/api/auth/bind`, {
        bindingId: options.bindingId,
        bindingToken: options.bindingToken,
        openclawId: options.openclawId
      });

      if (response.data.success) {
        console.log('\n✅ 绑定成功！');
        console.log(`🆔 用户 ID：${response.data.userId}`);
        console.log('\n现在你可以访问 http://localhost:5001 浏览任务并接单！');
      }
    } catch (error: any) {
      console.error('\n❌ 绑定失败：');
      console.error(error.response?.data?.error || error.message);
      process.exit(1);
    }
  });

program.parse();
