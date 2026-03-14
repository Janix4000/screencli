import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { ConfigError } from './errors.js';

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

export function loadConfig(): AppConfig {
  const file = loadFileConfig();
  const apiKey = process.env['ANTHROPIC_API_KEY'] ?? file.anthropicApiKey;
  if (!apiKey) {
    throw new ConfigError(
      'Missing ANTHROPIC_API_KEY. Run `screencli init` to configure, or set it as an environment variable.'
    );
  }

  return {
    anthropicApiKey: apiKey,
    defaultModel: file.defaultModel ?? 'claude-sonnet-4-20250514',
    defaultViewport: file.defaultViewport ?? { width: 1920, height: 1080 },
    actionDelayMs: file.actionDelayMs ?? 400,
  };
}
