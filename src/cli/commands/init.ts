import { Command } from 'commander';
import * as output from '../output.js';
import { isLoggedIn, loadCloudConfig } from '../../cloud/client.js';
import { loginFlow } from '../../cloud/auth.js';

/**
 * Run the interactive setup flow.
 * Signs the user in via GitHub/Google OAuth.
 */
export async function runInit(): Promise<boolean> {
  output.header('screencli setup');
  console.log('');

  if (isLoggedIn()) {
    const config = loadCloudConfig();
    output.success(`Already logged in as ${config.email || 'unknown'}`);
    console.log('');
    return true;
  }

  output.info('Sign in with GitHub or Google to get started.');
  console.log('');

  try {
    const result = await loginFlow();
    console.log('');
    output.success(`Logged in as ${result.email} (${result.plan} plan)`);
    output.success('Ready to record');
    console.log('');
    return true;
  } catch (err: any) {
    output.error(`Login failed: ${err.message}`);
    output.info('You can also set ANTHROPIC_API_KEY env var for local-only use.');
    return false;
  }
}

export const initCommand = new Command('init')
  .description('Set up screencli (sign in to start recording)')
  .action(async () => {
    const ok = await runInit();
    if (ok) {
      output.info('Run `screencli record <url> -p "..."` to start recording');
      console.log('');
    }
  });
