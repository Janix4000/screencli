import { apiRequest } from './client.js';

export async function callAgentProxy(options: {
  messages: any[];
  model: string;
  system?: string;
  tools?: any[];
  max_tokens?: number;
  recording_id?: string;
  url?: string;
  prompt?: string;
}): Promise<any> {
  // Only send messages, recording_id, and metadata — server controls model, system, tools
  const res = await apiRequest('/api/agent/messages', {
    method: 'POST',
    body: JSON.stringify({
      messages: options.messages,
      recording_id: options.recording_id,
      url: options.url,
      prompt: options.prompt,
      stream: false,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' })) as Record<string, string>;
    if (err.code === 'NO_CREDITS') {
      throw new Error('No recording credits remaining. Upgrade to Pro at https://screencli.sh');
    }
    if (err.code === 'RATE_LIMIT') {
      throw new Error('Rate limit exceeded. Please wait a moment.');
    }
    const detail = err.details || err.error || 'Unknown';
    throw new Error(`Agent API error (${res.status}): ${typeof detail === 'string' ? detail.slice(0, 500) : JSON.stringify(detail).slice(0, 500)}`);
  }

  return await res.json();
}
