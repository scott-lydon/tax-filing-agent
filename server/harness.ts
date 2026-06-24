import Anthropic from '@anthropic-ai/sdk';
import { SYSTEM_PROMPT } from './prompt.js';
import { ANTHROPIC_TOOLS } from '../tools/schemas.js';
import { dispatchTool } from '../tools/dispatch.js';
import { checkRefusals } from '../guardrails/refusals.js';
import { logEvent } from './logger.js';
import { appendMessage, getHistory, persistSession, type SessionState } from './session.js';

const MODEL = process.env.TFA_MODEL ?? 'claude-sonnet-4-6';
const MAX_TOOL_TURNS = 10;

let client: Anthropic | null = null;
function anthropic(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not set. The chat loop needs a real key; refusing to fabricate responses.');
  }
  if (!client) client = new Anthropic();
  return client;
}

export interface TurnResult {
  assistant: string;
  downloadReady: boolean;
  blocked?: boolean;
}

/**
 * Run one user turn: screen it (Layer B), then drive the Anthropic tool loop until the model
 * stops asking for tools, persisting every message and logging every step to the trace.
 */
export async function handleMessage(state: SessionState, userText: string): Promise<TurnResult> {
  const refusal = checkRefusals(userText);
  if (refusal.blocked) {
    logEvent(state.id, 'user_message', { text: userText, blocked: true });
    logEvent(state.id, 'guardrail_block', { ruleId: refusal.ruleId, redirect: refusal.redirect });
    appendMessage(state.id, { role: 'user', content: userText });
    appendMessage(state.id, { role: 'assistant', content: refusal.redirect! });
    logEvent(state.id, 'assistant_message', { text: refusal.redirect });
    persistSession(state);
    return { assistant: refusal.redirect!, downloadReady: state.downloadReady, blocked: true };
  }

  logEvent(state.id, 'user_message', { text: userText });
  appendMessage(state.id, { role: 'user', content: userText });

  // Everything the user should see this turn, in order: the model's prose plus the text of any
  // question it asked (an ask_question tool call carries the user-facing question text).
  const parts: string[] = [];
  const pushUnique = (s: string) => {
    const t = s.trim();
    if (t && parts[parts.length - 1] !== t) parts.push(t);
  };

  for (let turn = 0; turn < MAX_TOOL_TURNS; turn++) {
    const messages = getHistory(state.id).map((m) => ({
      role: m.role,
      content: m.content as Anthropic.MessageParam['content'],
    })) as Anthropic.MessageParam[];

    const resp = await anthropic().messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools: ANTHROPIC_TOOLS,
      messages,
    });

    appendMessage(state.id, { role: 'assistant', content: resp.content });

    for (const b of resp.content) {
      if (b.type === 'text') pushUnique(b.text);
    }

    if (resp.stop_reason === 'tool_use') {
      const toolUses = resp.content.filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use');
      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const tu of toolUses) {
        const r = await dispatchTool(state, tu.name, tu.input);
        if (tu.name === 'ask_question' && r.ok) {
          pushUnique(String((tu.input as { text?: string }).text ?? ''));
        }
        toolResults.push({
          type: 'tool_result',
          tool_use_id: tu.id,
          content: JSON.stringify(r),
          is_error: !r.ok,
        });
      }
      appendMessage(state.id, { role: 'user', content: toolResults });
      persistSession(state);
      continue;
    }
    break;
  }

  const assistantText = parts.join('\n\n');
  logEvent(state.id, 'assistant_message', { text: assistantText });
  persistSession(state);
  return { assistant: assistantText, downloadReady: state.downloadReady };
}
