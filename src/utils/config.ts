import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { ConfigError } from './errors.js';
import { isLoggedIn } from '../cloud/client.js';

export interface AppConfig {
  anthropicApiKey: string;
  defaultModel: string;
  defaultViewport: { width: number; height: number };
  actionDelayMs: number;
}

const CONFIG_DIR = join(homedir(), '.screencli');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

function loadFileConfig(): Partial<AppConfig> {
  if (!existsSync(CONFIG_FILE)) return {};
  try {
    return JSON.parse(readFileSync(CONFIG_FILE, 'utf-8'));
  } catch {
    return {};
  }
}

/** Returns true when a valid API key is available OR user is logged in to cloud. */
export function isConfigured(): boolean {
  if (process.env['ANTHROPIC_API_KEY']) return true;
  if (isLoggedIn()) return true;
  const file = loadFileConfig();
  return !!file.anthropicApiKey;
}

export function loadConfig(): AppConfig {
  const file = loadFileConfig();
  const apiKey = process.env['ANTHROPIC_API_KEY'] ?? file.anthropicApiKey;

  // If logged in to cloud, the API key is provided by the proxy — use a placeholder
  if (!apiKey && isLoggedIn()) {
    return {
      anthropicApiKey: 'cloud-proxy',
      defaultModel: file.defaultModel ?? 'claude-sonnet-4-20250514',
      defaultViewport: file.defaultViewport ?? { width: 1920, height: 1080 },
      actionDelayMs: file.actionDelayMs ?? 150,
    };
  }

  if (!apiKey) {
    throw new ConfigError(
      'Not logged in and no ANTHROPIC_API_KEY set. Run `screencli init` to sign in, or set ANTHROPIC_API_KEY for local-only use.'
    );
  }

  return {
    anthropicApiKey: apiKey,
    defaultModel: file.defaultModel ?? 'claude-sonnet-4-20250514',
    defaultViewport: file.defaultViewport ?? { width: 1920, height: 1080 },
    actionDelayMs: file.actionDelayMs ?? 150,
  };
}
