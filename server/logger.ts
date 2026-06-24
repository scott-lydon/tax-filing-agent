import { appendFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { SESSIONS_DIR } from './db.js';

export type EventType =
  | 'session_start'
  | 'user_message'
  | 'assistant_message'
  | 'tool_call'
  | 'tool_result'
  | 'guardrail_block'
  | 'question_counted'
  | 'finalize';

export interface TraceEvent {
  ts: number;
  type: EventType;
  data: unknown;
}

function tracePath(sessionId: string): string {
  return join(SESSIONS_DIR, `${sessionId}.jsonl`);
}

/**
 * Append one event to the session's JSONL trail and echo it to stdout so Render's log
 * viewer carries the same record (pillar 4, observation). Append-only, never rewritten.
 */
export function logEvent(sessionId: string, type: EventType, data: unknown): TraceEvent {
  const event: TraceEvent = { ts: Date.now(), type, data };
  appendFileSync(tracePath(sessionId), JSON.stringify(event) + '\n');
  // Structured stdout line for production log aggregation.
  console.log(JSON.stringify({ sessionId, ...event }));
  return event;
}

/** Read the full append-only trace for a session, oldest first. */
export function readTrace(sessionId: string): TraceEvent[] {
  const path = tracePath(sessionId);
  if (!existsSync(path)) return [];
  return readFileSync(path, 'utf8')
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as TraceEvent);
}
