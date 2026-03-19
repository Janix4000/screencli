import { Command } from 'commander';
import { apiRequest, isLoggedIn } from '../../cloud/client.js';
import * as output from '../output.js';

export const renderCommand = new Command('render')
  .description('Cloud re-render a recording with different background/preset')
  .argument('<id>', 'Recording ID')
  .option('--background <name>', 'Background style', 'aurora')
  .option('--preset <name>', 'Platform preset (youtube, twitter, etc.)')
  .action(async (id: string, opts: Record<string, any>) => {
    if (!isLoggedIn()) {
      output.error('Not logged in. Run: npx screencli login');
      process.exit(1);
    }

    console.log('');
    output.header('screencli render');

    const options: Record<string, any> = {};
    if (opts.background) options.background = opts.background;
    if (opts.preset) options.preset = opts.preset;

    const spinner = output.createSpinner(
      `Rendering (${opts.background || 'default'}${opts.preset ? `, ${opts.preset}` : ''})...`
    );
    spinner.start();

    try {
      const res = await apiRequest(`/api/recordings/${id}/render`, {
        method: 'POST',
        body: JSON.stringify({ options }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' })) as Record<string, string>;
        throw new Error(err.error || `Render failed (${res.status})`);
      }

      const result = await res.json() as Record<string, string>;

      if (result.status === 'done') {
        spinner.succeed(`Rendered: ${result.url || `https://screencli.sh/v/${id}`}`);
      } else {
        // Poll for completion
        spinner.text = 'Rendering in progress...';
        let attempts = 0;
        while (attempts < 60) {
          await new Promise(r => setTimeout(r, 2000));
          const pollRes = await apiRequest(`/api/render-jobs/${result.job_id}`);
          if (!pollRes.ok) break;
          const job = await pollRes.json() as Record<string, string>;
          if (job.status === 'done') {
            spinner.succeed(`Rendered: https://screencli.sh/v/${id}`);
            break;
          }
          if (job.status === 'failed') {
            throw new Error(job.error || 'Render failed');
          }
          attempts++;
        }
      }
    } catch (err: any) {
      spinner.fail(`Render failed: ${err.message}`);
      process.exit(1);
    }

    console.log('');
  });
