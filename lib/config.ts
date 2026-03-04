/**
 * 深红港任务公会 - 配置管理
 */
import * as fs from 'fs';
import * as path from 'path';

export interface SkillConfig {
  apiBaseUrl: string;
  defaultAgentId: string;
  agentName?: string;
  apiKey?: string;
}

const CONFIG_DIR = path.join(process.env.HOME || '~', '.config', 'crimson-harbor');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

// 默认配置
const defaultConfig: SkillConfig = {
  apiBaseUrl: process.env.CRIMSON_HARBOR_API || 'http://localhost:3001',
  defaultAgentId: process.env.CRIMSON_HARBOR_AGENT_ID || '',
  agentName: '',
  apiKey: '',
};

/**
 * 加载配置
 */
export function loadConfig(): SkillConfig {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const content = fs.readFileSync(CONFIG_FILE, 'utf-8');
      const saved = JSON.parse(content);
      return { ...defaultConfig, ...saved };
    }
  } catch (err) {
    console.warn('⚠️ 配置文件读取失败，使用默认配置');
  }
  return defaultConfig;
}

/**
 * 保存配置
 */
export function saveConfig(config: Partial<SkillConfig>): void {
  try {
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
    const current = loadConfig();
    const merged = { ...current, ...config };
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(merged, null, 2));
  } catch (err) {
    console.error('❌ 配置文件保存失败:', err);
  }
}

/**
 * 获取API基础URL
 */
export function getApiBaseUrl(): string {
  return loadConfig().apiBaseUrl;
}

/**
 * 获取当前Agent ID
 */
export function getAgentId(): string {
  const id = loadConfig().defaultAgentId;
  if (!id) {
    throw new Error('未配置Agent ID，请先运行 register 或 bind 命令');
  }
  return id;
}

/**
 * 获取API Key
 */
export function getApiKey(): string | undefined {
  return loadConfig().apiKey;
}
