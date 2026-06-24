import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import { computeReturn } from '../tax/compute2025.js';
import { AnswersSchema, FILING_STATUS_LABELS } from '../tax/schemas.js';
import { fillReturn } from '../server/pdf.js';
import { RETURNS_DIR } from '../server/db.js';
import { logEvent } from '../server/logger.js';
import type { SessionState } from '../server/session.js';
import { evaluateQuestion } from '../guardrails/budget.js';
import { TOOL_INPUT_SCHEMAS, type ToolName } from './schemas.js';

export type ToolResult =
  | { ok: true; result: unknown }
  | { ok: false; error: string; remediation: string };

/**
 * Dispatch one tool call: validate args with Zod (Layer A guardrail), run the tool, update
 * session state, and log tool_call/tool_result to the trace. Validation or precondition
 * failures return a structured error the model can recover from, never a thrown stack trace.
 */
export async function dispatchTool(
  state: SessionState,
  name: string,
  rawArgs: unknown,
): Promise<ToolResult> {
  logEvent(state.id, 'tool_call', { name, args: rawArgs });

  const schema = TOOL_INPUT_SCHEMAS[name as ToolName];
  if (!schema) {
    return finish(state, name, { ok: false, error: `Unknown tool "${name}".`, remediation: 'Use one of the provided tools.' });
  }

  const parsed = schema.safeParse(rawArgs ?? {});
  if (!parsed.success) {
    return finish(state, name, {
      ok: false,
      error: `Invalid arguments for ${name}: ${z.prettifyError(parsed.error)}`,
      remediation: 'Fix the arguments to match the tool schema and call again. For example, income and withholding must be non-negative numbers and filing status must be one of single, mfj, mfs, hoh, qss.',
    });
  }
  const args = parsed.data as Record<string, unknown>;

  switch (name as ToolName) {
    case 'record_w2': {
      state.w2 = (args as { w2: SessionState['w2'] }).w2;
      return finish(state, name, { ok: true, result: { recorded: true, wages: state.w2!.box1Wages } });
    }

    case 'ask_question': {
      const { questionId, text } = args as { questionId: string; text: string };
      const decision = evaluateQuestion(state, questionId as never);
      if (!decision.allowed) {
        return finish(state, name, {
          ok: false,
          error: 'Question budget exhausted.',
          remediation: decision.wrapUpInstruction!,
        });
      }
      if (!state.questionIds.includes(questionId as never)) {
        state.questionIds.push(questionId as never);
        state.questionsAsked = decision.questionsAsked;
      }
      logEvent(state.id, 'question_counted', {
        questionId,
        questionsAsked: state.questionsAsked,
        remaining: 5 - state.questionsAsked,
      });
      return finish(state, name, {
        ok: true,
        result: { question: text, questionsAsked: state.questionsAsked, remaining: 5 - state.questionsAsked },
      });
    }

    case 'record_answer': {
      state.answers = { ...state.answers, ...args };
      return finish(state, name, { ok: true, result: { recorded: Object.keys(args) } });
    }

    case 'compute_return': {
      if (!state.w2) {
        return finish(state, name, { ok: false, error: 'No W-2 recorded yet.', remediation: 'Call record_w2 with the W-2 numbers first.' });
      }
      const answers = AnswersSchema.safeParse(state.answers);
      if (!answers.success || !state.answers.filingStatus) {
        return finish(state, name, {
          ok: false,
          error: 'Filing status is required before computing.',
          remediation: 'Ask the filing status question, then record_answer with filingStatus, then compute_return.',
        });
      }
      state.return1040 = computeReturn(state.w2, answers.data);
      return finish(state, name, { ok: true, result: state.return1040 });
    }

    case 'finalize_and_render': {
      if (!state.return1040 || !state.w2) {
        return finish(state, name, { ok: false, error: 'Nothing computed yet.', remediation: 'Call compute_return successfully before finalize_and_render.' });
      }
      const answers = AnswersSchema.parse(state.answers);
      const { bytes, fieldsFilled, missing } = await fillReturn(state.return1040, state.w2, answers);
      writeFileSync(join(RETURNS_DIR, `${state.id}.pdf`), bytes);
      state.downloadReady = true;
      state.status = 'complete';
      const result = {
        download_url: `/api/return/${state.id}/download`,
        fields_filled: fieldsFilled,
        status_label: FILING_STATUS_LABELS[state.return1040.filingStatus],
        refund_or_owe: state.return1040.refundOrOwe,
      };
      logEvent(state.id, 'finalize', { ...result, missingFields: missing });
      return finish(state, name, { ok: true, result });
    }

    default:
      return finish(state, name, { ok: false, error: 'Unhandled tool.', remediation: 'Use a provided tool.' });
  }
}

function finish(state: SessionState, name: string, result: ToolResult): ToolResult {
  logEvent(state.id, 'tool_result', { name, ok: result.ok, summary: result.ok ? result.result : result.error });
  return result;
}
