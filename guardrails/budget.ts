import type { SessionState } from '../server/session.js';
import type { QuestionId } from '../tools/schemas.js';

/** Layer C guardrail: the agent may ask at most this many distinct questions. */
export const MAX_QUESTIONS = 5;

export interface BudgetDecision {
  allowed: boolean;
  /** Distinct questions asked after this decision is applied. */
  questionsAsked: number;
  /** Set when blocked, so the model is told to wrap up instead of asking again. */
  wrapUpInstruction?: string;
}

/**
 * Decide whether an ask_question call is within budget. Distinct question ids are counted;
 * re-asking the same question (for example after a vague answer) does not consume budget.
 * Enforced in code in the dispatcher, so a sixth distinct question can never reach the user.
 */
export function evaluateQuestion(state: SessionState, questionId: QuestionId): BudgetDecision {
  const alreadyAsked = state.questionIds.includes(questionId);
  if (alreadyAsked) {
    return { allowed: true, questionsAsked: state.questionsAsked };
  }
  if (state.questionIds.length >= MAX_QUESTIONS) {
    return {
      allowed: false,
      questionsAsked: state.questionsAsked,
      wrapUpInstruction: `Question budget reached (${MAX_QUESTIONS} of ${MAX_QUESTIONS} used). Do not ask another question. Use what you already know: record any remaining answers, then call compute_return and finalize_and_render, and warmly tell the user their 1040 is ready.`,
    };
  }
  return { allowed: true, questionsAsked: state.questionsAsked + 1 };
}
