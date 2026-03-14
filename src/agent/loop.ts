import Anthropic from '@anthropic-ai/sdk';
import type { Page } from 'playwright';
import { tools } from './tools.js';
import { buildSystemPrompt } from './system-prompt.js';
import { ToolHandlers } from './tool-handlers.js';
import { EventLog } from '../recording/event-log.js';
import { logger } from '../utils/logger.js';
import { AgentError } from '../utils/errors.js';
import type { AgentStats } from '../recording/types.js';

export interface AgentLoopOptions {
  apiKey: string;
  model: string;
  url: string;
  prompt: string;
  page: Page;
  eventLog: EventLog;
  recordingDir: string;
  actionDelayMs: number;
  maxSteps: number;
  onAction?: (step: number, toolName: string, description: string) => void;
}

export interface AgentLoopResult {
  summary: string;
  stats: AgentStats;
}

export async function runAgentLoop(options: AgentLoopOptions): Promise<AgentLoopResult> {
  const client = new Anthropic({ apiKey: options.apiKey });
  const handlers = new ToolHandlers(
    options.page,
    options.eventLog,
    options.recordingDir,
    options.actionDelayMs
  );

  const systemPrompt = buildSystemPrompt(options.url, options.prompt);
  const messages: Anthropic.MessageParam[] = [];
  let totalActions = 0;
  let inputTokens = 0;
  let outputTokens = 0;

  // Initial observation: navigate to URL
  logger.info(`Navigating to ${options.url}`);
  await options.page.goto(options.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await options.page.waitForTimeout(1000);

  options.eventLog.append({
    type: 'navigate',
    description: `Navigate to ${options.url}`,
    viewport: options.page.viewportSize() ?? { width: 1920, height: 1080 },
    value: options.url,
    url: options.url,
  });

  // Take initial screenshot
  const initialScreenshot = await options.page.screenshot({ type: 'png' });
  messages.push({
    role: 'user',
    content: [
      {
        type: 'text',
        text: 'I have navigated to the starting URL. Here is the current page. Begin the task.',
      },
      {
        type: 'image',
        source: {
          type: 'base64',
          media_type: 'image/png',
          data: initialScreenshot.toString('base64'),
        },
      },
    ],
  });

  for (let step = 0; step < options.maxSteps; step++) {
    logger.debug(`Agent step ${step + 1}/${options.maxSteps}`);

    let response: Anthropic.Message;
    try {
      response = await client.messages.create({
        model: options.model,
        max_tokens: 4096,
        system: systemPrompt,
        tools,
        messages,
      });
    } catch (err) {
      throw new AgentError(`Claude API error: ${err}`);
    }

    inputTokens += response.usage.input_tokens;
    outputTokens += response.usage.output_tokens;

    // Add assistant response to conversation
    messages.push({ role: 'assistant', content: response.content });

    // Check if there are tool calls
    const toolUses = response.content.filter(
      (block): block is Anthropic.ContentBlockParam & { type: 'tool_use'; id: string; name: string; input: any } =>
        block.type === 'tool_use'
    );

    if (toolUses.length === 0) {
      // No tool calls — model is just talking. Check if stop reason indicates end.
      if (response.stop_reason === 'end_turn') {
        logger.info('Agent ended without calling done. Finishing.');
        return {
          summary: 'Agent completed without explicit done signal.',
          stats: { total_actions: totalActions, input_tokens: inputTokens, output_tokens: outputTokens },
        };
      }
      continue;
    }

    // Process each tool call
    const toolResults: Anthropic.ToolResultBlockParam[] = [];

    for (const toolUse of toolUses) {
      totalActions++;
      const description = (toolUse.input as Record<string, any>).description ??
        (toolUse.input as Record<string, any>).summary ??
        (toolUse.input as Record<string, any>).text ??
        toolUse.name;
      options.onAction?.(step + 1, toolUse.name, String(description));
      logger.info(`[${step + 1}] ${toolUse.name}: ${description}`);

      try {
        const result = await handlers.handle(toolUse.name, toolUse.input as Record<string, any>);

        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: result.content as any,
        });

        if (result.isDone) {
          return {
            summary: result.summary ?? 'Task completed.',
            stats: { total_actions: totalActions, input_tokens: inputTokens, output_tokens: outputTokens },
          };
        }
      } catch (err) {
        logger.warn(`Tool ${toolUse.name} failed: ${err}`);
        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: [{ type: 'text', text: `Error: ${err instanceof Error ? err.message : String(err)}` }] as any,
          is_error: true,
        });
      }
    }

    messages.push({ role: 'user', content: toolResults });
  }

  logger.warn('Agent reached max steps limit.');
  return {
    summary: 'Agent reached maximum steps without completing.',
    stats: { total_actions: totalActions, input_tokens: inputTokens, output_tokens: outputTokens },
  };
}
