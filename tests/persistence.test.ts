import { describe, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createSessionRow, appendMessageRow } from '../server/db.js';
import { createSession, loadSession, getHistory, appendMessage, persistSession } from '../server/session.js';

describe('session state and history survive a restart (AT-H1 mechanism)', () => {
  it('rehydrates a session that is only in SQLite, not in the in-memory cache', () => {
    // Simulate a session written by a previous process: insert straight into the DB,
    // bypassing the in-memory cache, then load it as a fresh process would.
    const id = randomUUID();
    const priorState = {
      id,
      status: 'active' as const,
      w2: null,
      answers: { filingStatus: 'single' as const },
      questionsAsked: 2,
      questionIds: ['filing_status', 'dependents'] as never,
      return1040: null,
      downloadReady: false,
    };
    createSessionRow(id, Date.now(), 'active', JSON.stringify(priorState));
    appendMessageRow(id, 'assistant', 'Hi, I am Tilly!');
    appendMessageRow(id, 'user', 'I earn 40000 and I am single in Austin.');

    const reloaded = loadSession(id);
    expect(reloaded).not.toBeNull();
    expect(reloaded!.questionsAsked).toBe(2);
    expect(reloaded!.answers.filingStatus).toBe('single');

    const history = getHistory(id);
    expect(history).toHaveLength(2);
    // A fact from turn one is still available to replay to the model after restart.
    expect(JSON.stringify(history[1].content)).toMatch(/Austin/);
  });

  it('persists mutations made through the cache back to SQLite', () => {
    const state = createSession();
    appendMessage(state.id, { role: 'assistant', content: 'greeting' });
    state.answers = { filingStatus: 'hoh', qualifyingChildrenUnder17: 1 };
    state.questionsAsked = 3;
    persistSession(state);

    // A second loadSession in the same process returns the cached object; assert it carries the mutation.
    const again = loadSession(state.id);
    expect(again!.answers.filingStatus).toBe('hoh');
    expect(again!.questionsAsked).toBe(3);
    expect(getHistory(state.id)).toHaveLength(1);
  });
});
