import { Command } from 'commander';
import { createInterface } from 'node:readline';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import * as output from '../output.js';

const CONFIG_DIR = join(homedir(), '.screencli');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

function prompt(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

export const initCommand = new Command('init')
  .description('Set up screencli (configure API key and settings)')
  .action(async () => {
    output.header('screencli setup');

    // Load existing config if any
    let existing: Record<string, any> = {};
    if (existsSync(CONFIG_FILE)) {
      try {
        existing = JSON.parse(readFileSync(CONFIG_FILE, 'utf-8'));
      } catch { /* ignore */ }
    }

    const masked = existing.anthropicApiKey
      ? `${existing.anthropicApiKey.slice(0, 10)}...${existing.anthropicApiKey.slice(-4)}`
      : undefined;

    // Prompt for API key
    const keyPrompt = masked
      ? `  Anthropic API key [${masked}]: `
      : '  Anthropic API key: ';

    const apiKey = await prompt(keyPrompt);

    if (apiKey) {
      existing.anthropicApiKey = apiKey;
    } else if (!existing.anthropicApiKey) {
      output.warn('No API key provided. You can set ANTHROPIC_API_KEY env var instead.');
    }

    // Write config
    mkdirSync(CONFIG_DIR, { recursive: true });
    writeFileSync(CONFIG_FILE, JSON.stringify(existing, null, 2) + '\n');

    console.log('');
    output.success(`Config saved to ${CONFIG_FILE}`);
    if (existing.anthropicApiKey) {
      output.success('API key configured');
    }
    output.info('Run `screencli record <url> -p "..."` to start recording');
    console.log('');
  });
