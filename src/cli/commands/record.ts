import { Command } from 'commander';
import { v4 as uuidv4 } from 'uuid';
import { resolve } from 'node:path';
import {
  promptOption,
  outputOption,
  viewportOption,
  modelOption,
  headlessOption,
  slowMoOption,
  maxStepsOption,
  loginOption,
  authOption,
  gradientOption,
  paddingOption,
  cornerRadiusOption,
  noShadowOption,
  parseViewport,
} from '../options.js';
import * as output from '../output.js';
import { loadConfig } from '../../utils/config.js';
import { recordingDir, eventsPath, metadataPath } from '../../utils/paths.js';
import { launchSession } from '../../browser/session.js';
import { runLoginFlow, loadAuthState, saveAuthState, hasAuthState } from '../../browser/auth.js';
import { EventLog } from '../../recording/event-log.js';
import { writeMetadata } from '../../recording/metadata.js';
import { deriveChapters } from '../../recording/chapters.js';
import { runAgentLoop } from '../../agent/loop.js';
import { composeVideo } from '../../video/compose.js';
import type { BackgroundOptions } from '../../video/background.js';
import { logger, setLogLevel } from '../../utils/logger.js';

export const recordCommand = new Command('record')
  .description('Record an AI-driven browser demo')
  .argument('<url>', 'Starting URL')
  .addOption(promptOption)
  .addOption(outputOption)
  .addOption(viewportOption)
  .addOption(modelOption)
  .addOption(headlessOption)
  .addOption(slowMoOption)
  .addOption(maxStepsOption)
  .addOption(loginOption)
  .addOption(authOption)
  .addOption(gradientOption)
  .addOption(paddingOption)
  .addOption(cornerRadiusOption)
  .addOption(noShadowOption)
  .option('-v, --verbose', 'Verbose logging')
  .action(async (url: string, opts: Record<string, any>) => {
    if (opts.verbose) setLogLevel('debug');

    const config = loadConfig();
    const viewport = parseViewport(opts.viewport);
    const id = uuidv4();
    const recDir = recordingDir(resolve(opts.output), id);

    output.header('screencli record');
    output.info(`Recording ID: ${id}`);
    output.info(`URL: ${url}`);
    output.info(`Prompt: ${opts.prompt}`);
    output.info(`Viewport: ${viewport.width}x${viewport.height}`);
    output.info(`Model: ${opts.model}`);
    output.info(`Output: ${recDir}`);
    console.log('');

    // ── Auth: login handoff or saved state ──
    let storageState: object | undefined;

    const needsLogin = opts.login || (opts.auth && !hasAuthState(opts.auth));
    if (needsLogin) {
      output.info('Opening browser for manual login...');
      output.info('Log in, then press Enter here to hand off to the AI agent.');
      console.log('');
      storageState = await runLoginFlow(url, viewport) as object;
      if (opts.auth) {
        saveAuthState(opts.auth, storageState);
        output.success(`Auth state saved as "${opts.auth}"`);
      }
      output.success('Login complete — starting recording.');
      console.log('');
    } else if (opts.auth) {
      const loaded = loadAuthState(opts.auth);
      if (loaded) {
        storageState = loaded;
        output.success(`Loaded saved auth: "${opts.auth}"`);
      }
    }

    // Launch browser (recording starts here — login is excluded)
    const spinner = output.createSpinner('Launching browser...');
    spinner.start();
    const session = await launchSession({
      viewport,
      headless: opts.headless !== false,
      slowMo: parseInt(opts.slowMo, 10),
      recordDir: recDir,
      storageState,
    });
    spinner.succeed('Browser launched');

    // Run agent loop
    const eventLog = new EventLog(eventsPath(recDir));

    console.log('');
    output.header('Agent Actions');

    let result;
    try {
      result = await runAgentLoop({
        apiKey: config.anthropicApiKey,
        model: opts.model,
        url,
        prompt: opts.prompt,
        page: session.page,
        eventLog,
        recordingDir: recDir,
        actionDelayMs: config.actionDelayMs,
        maxSteps: parseInt(opts.maxSteps, 10),
        onAction: (step, toolName, description) => {
          output.actionLog(step, toolName, description);
        },
      });
    } catch (err) {
      output.error(`Agent error: ${err}`);
      eventLog.flush();
      await session.close();
      process.exit(1);
    }

    // Close browser to finalize video
    console.log('');
    const closeSpinner = output.createSpinner('Finalizing video...');
    closeSpinner.start();
    const rawVideoPath = await session.close();
    closeSpinner.succeed('Video finalized');

    // Flush event log
    eventLog.flush();

    // Write metadata
    const events = eventLog.getEvents();
    const chapters = deriveChapters(events);
    writeMetadata(metadataPath(recDir), {
      id,
      created_at: new Date().toISOString(),
      url,
      prompt: opts.prompt,
      model: opts.model,
      viewport,
      duration_ms: eventLog.getDurationMs(),
      raw_video_path: rawVideoPath ?? '',
      event_log_path: eventsPath(recDir),
      chapters,
      agent_stats: result.stats,
    });

    // Post-process video
    if (rawVideoPath) {
      console.log('');
      const composeSpinner = output.createSpinner('Composing video with effects...');
      composeSpinner.start();
      try {
        const background: BackgroundOptions | undefined = opts.gradient
          ? {
              gradient: opts.gradient,
              padding: parseInt(opts.padding, 10),
              cornerRadius: parseInt(opts.cornerRadius, 10),
              shadow: opts.shadow !== false,
            }
          : undefined;

        await composeVideo({
          rawVideoPath,
          events,
          outputPath: resolve(recDir, 'composed.mp4'),
          viewport,
          zoom: true,
          highlight: true,
          cursor: true,
          background,
        });
        composeSpinner.succeed('Video composed');
      } catch (err) {
        composeSpinner.warn(`Video composition skipped: ${err instanceof Error ? err.message : err}`);
      }
    }

    // Summary
    console.log('');
    output.header('Recording Complete');
    output.stats('Summary', result.summary);
    output.stats('Actions', result.stats.total_actions);
    output.stats('Tokens (in/out)', `${result.stats.input_tokens} / ${result.stats.output_tokens}`);
    output.stats('Duration', `${(eventLog.getDurationMs() / 1000).toFixed(1)}s`);
    output.stats('Chapters', chapters.length);
    output.stats('Output', recDir);
    console.log('');
  });
