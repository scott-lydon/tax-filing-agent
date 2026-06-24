# Acceptance tests (tax-filing-agent)

What correct behavior is, and the evidence for it. Tests are written in Given/When/Then form and grouped by the rubric pillars (judging weight high to low: harness quality, end-to-end correctness, conversation quality, defensibility of decisions).

## User stories (from the spec)

- As a W-2 earner around $40,000/year, I want to chat with a friendly assistant that fills my 2025 Form 1040, so that I can download a completed return without learning tax software.
- As a user, I want to supply my W-2 by pasting it or loading a sample, so that I can start quickly.
- As a user, I want the assistant to ask at most five short questions, so that the process is fast and low-stress.
- As a user, I want to change my filing status (single, married filing jointly, married filing separately, head of household, qualifying surviving spouse), so that my return matches my real situation.
- As a user, I want to correct an answer mid-conversation, so that a mistake does not force a restart.
- As a judge, I want to see the agent's decisions, tool calls, and guardrail blocks, so that I can verify the harness is real and not a happy-path mock.
- As a judge, I want a deployed public URL and a one-command local run, so that I can grade it end to end.

## Out of scope (deliberately not built)

- E-filing or transmission to the IRS. Reason: spec forbids it; prototype only.
- Real PII / SSN intake. Reason: fake data only; refused by guardrail.
- Tax advice or optimization. Reason: spec says not tax advice.
- Multi-year or state returns. Reason: spec fixes Form 1040, TY 2025, federal.
- Authentication / user accounts. Reason: prototype scope.

## Pillar 1: Harness quality

- **AT-H1 (chat loop with carried state).** Given a new session and three turns of conversation, When the server is restarted and a fourth turn is sent, Then the assistant can quote a fact stated in turn one. (Vitest, Slice 2.)
- **AT-H2 (tools take real actions).** Given a scripted conversation, When the agent runs the tool chain, Then `data/returns/<session>.pdf` exists and its AcroForm fields match the inputs. (Vitest integration, Slice 3.)
- **AT-H3 (guardrails enforced in code).** Given a tool call with a negative income or an out-of-enum filing status, When the dispatcher validates it, Then the tool never runs and a structured error is returned. (Vitest, Slice 4, Layer A.)
- **AT-H4 (refusal list).** Given a user message asking for real-PII intake or "should I lie on this", When the harness screens it, Then a friendly redirect is returned and a `guardrail_block` event is logged before Claude is called. (Vitest, Slice 4, Layer B.)
- **AT-H5 (question budget).** Given 20 randomized conversations, When each runs to completion, Then no run ever issues more than five distinct questions. (Vitest property test, Slice 4, Layer C.)
- **AT-H6 (observation trail).** Given a completed conversation, When `GET /api/session/:id/trace` is read, Then it lists `tool_call`, `tool_result`, `guardrail_block`, `question_counted`, and `finalize` events in the order they happened. (Playwright + API, Slice 5.)

## Pillar 2: Works end to end

- **AT-E1 (health).** Given the deployed service, When `GET /api/health` is called, Then it returns 200 with `{ ok: true, version: <git sha> }` matching the deployed commit. (Slice 1, Slice 9.)
- **AT-E2 (tax correctness).** Given a $40,000 single filer taking the standard deduction with the sample W-2's federal withholding, When `compute_return` runs, Then the refund or balance due is numerically correct, cross-checked against an IRS withholding reference. (Vitest, Slice 6.)
- **AT-E3 (filled downloadable PDF).** Given a completed happy-path conversation on the live URL, When the download button is clicked, Then a flattened 1040 PDF downloads with filled fields reflecting the W-2 and answers. (Playwright against live URL, Slice 9.)
- **AT-E4 (boundary math).** Given each filing status and each 2025 bracket transition, When the tax module computes, Then the output matches the verified bracket table. (Vitest, Slice 6.)

## Pillar 3: Conversation quality

- **AT-C1 (warm tone).** Given the happy path, When the assistant speaks, Then it uses contractions, short sentences, first-name basis if offered, and never says "as an AI". (Reviewed against the system prompt, Slice 8.)
- **AT-C2 (five turns to done).** Given the sample W-2, When the user answers five questions, Then the conversation completes and the PDF reflects the answers. (Playwright, Slice 8.)
- **AT-C3 (mid-conversation correction).** Given a user who says "actually, I'm married filing jointly" after first saying single, When the agent continues, Then the final return uses married filing jointly. (Playwright, Slice 8 / stretch.)
- **AT-C4 (graceful sample load).** Given the "Use sample W-2" button, When clicked, Then the agent acknowledges receipt within one turn. (Playwright, Slice 7.)

## Pillar 4: Defensibility of decisions

- **AT-D1 (decisions documented).** Given `ARCHITECTURE.md` and `DECISIONS.md`, When read, Then every major decision names the alternative considered and the reason. (Doc review, Slice 0, Slice 10.)
- **AT-D2 (sourced tax numbers).** Given `tax/SOURCES.md`, When read, Then the 2025 standard deduction, brackets, and line numbers each cite a source with a retrieval date. (Doc review, Slice 6.)
- **AT-D3 (auditable math).** Given a computed return, When the observation drawer is opened, Then the bracket math and deduction are visible, not a black box. (Playwright, Slice 5 / Slice 6.)

## 60-second demo script

1. Open the live URL (chat shell loads).
2. Click "Use sample W-2"; the agent acknowledges the $40,000 W-2.
3. Answer the five questions in warm, short replies.
4. Open the "Show what the agent did" drawer; point at the tool calls and the question counter.
5. Click download; open the PDF; show filled 1040 fields.
6. Note the refund or balance due matches the on-screen computation.
