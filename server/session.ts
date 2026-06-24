import { randomUUID } from 'node:crypto';
import type { Answers, Return1040, W2 } from '../tax/schemas.js';
import type { QuestionId } from '../tools/schemas.js';
import {
  appendMessageRow,
  createSessionRow,
  getMessageRows,
  getSessionRow,
  updateSessionRow,
} from './db.js';

/** An Anthropic-style message stored in history. content is the raw blocks array or a string. */
export interface StoredMessage {
  role: 'user' | 'assistant';
  content: unknown;
}

export interface SessionState {
  id: string;
  status: 'active' | 'complete';
  w2: W2 | null;
  answers: Partial<Answers>;
  questionsAsked: number;
  questionIds: QuestionId[];
  return1040: Return1040 | null;
  downloadReady: boolean;
}

const cache = new Map<string, SessionState>();

function blankState(id: string): SessionState {
  return {
    id,
    status: 'active',
    w2: null,
    answers: {},
    questionsAsked: 0,
    questionIds: [],
    return1040: null,
    downloadReady: false,
  };
}

export function createSession(): SessionState {
  const id = randomUUID();
  const state = blankState(id);
  cache.set(id, state);
  createSessionRow(id, Date.now(), state.status, JSON.stringify(state));
  return state;
}

/** Load a session from cache or rehydrate it from SQLite (survives a server restart). */
export function loadSession(id: string): SessionState | null {
  if (cache.has(id)) return cache.get(id)!;
  const row = getSessionRow(id);
  if (!row) return null;
  const state = JSON.parse(row.state) as SessionState;
  cache.set(id, state);
  return state;
}

export function persistSession(state: SessionState): void {
  updateSessionRow(state.id, state.status, JSON.stringify(state));
}

export function appendMessage(sessionId: string, message: StoredMessage): void {
  appendMessageRow(sessionId, message.role, message.content);
}

export function getHistory(sessionId: string): StoredMessage[] {
  return getMessageRows(sessionId) as StoredMessage[];
}
