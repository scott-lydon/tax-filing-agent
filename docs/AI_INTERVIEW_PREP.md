# AI interview prep: tax-filing-agent

[AI video interview portal](https://portal.gauntletai.com/video-interview) · [mirror](https://gauntlet-portal.web.app/video-interview)

## 60-second elevator pitch

This is a chat assistant that prepares a 2025 federal Form 1040 for a W-2 earner. You paste a W-2 or load the sample, it asks at most five warm questions, and it hands back a filled IRS PDF with your refund or balance due. The approach is a small Anthropic tool loop: the model talks, and it calls real tools to record the W-2, compute the return, and fill the form. The key trade-off was enforcing the four pillars in code rather than in the prompt, so a reviewer can open the guardrails folder and see the five-question cap and the input validation actually run. The outcome is an app that works end to end, deployed on Render, with the tax math and the agent's reasoning both visible in an observation drawer.

## Always-asked meta questions

**Walk me through the data flow.** The user loads the sample W-2, which goes to the message endpoint as a normal user turn. The server screens it, then sends the history plus tool schemas to Claude. Claude calls record_w2, then asks the filing-status question through the ask_question tool. Each answer comes back, the model records it structurally, and after five questions it calls compute_return and finalize_and_render. That fills the real IRS PDF with pdf-lib, writes it to disk, and returns a download link. Throughout, every step is logged to a JSONL trace the UI streams.

**What would you do differently with more time?** I'd model the refundable Additional Child Tax Credit on Schedule 8812, which I capped at the nonrefundable line for the prototype. I'd add the W-2 image upload with extraction and graceful recovery from a missing box. And I'd move sessions off SQLite if it ever needed more than one instance.

**What did you find challenging?** Mapping the IRS form. It is an XFA form, so the field names are opaque after the form layer is stripped. I solved it by filling each field with a sentinel, rendering to an image, and reading it back to confirm the line, then froze the verified map behind a test that fails on drift.

## Four rubric-pillar questions

**Architecture.** The design is the smallest harness that still shows each pillar in code. The agent loop is the Anthropic Messages API with a server-side dispatcher; there is no framework to defend. The seam between the model and real actions is the tool dispatcher in tools/dispatch.ts, where Zod validates every argument. Pure tax logic lives in tax/compute2025.ts with no I/O. See ARCHITECTURE.md for the decisions table.

**Scalability.** It is a prototype, so I optimized for a clean free-tier deploy, not throughput. State is a SQLite file with an in-memory cache; a restart rehydrates an in-flight session. The honest scaling limit is a single instance, documented as a trade-off with the revisit trigger being a second web instance, at which point sessions move to Postgres.

**Security.** Guardrails are three enforced layers. Zod rejects out-of-domain tool inputs before they run. A refusal list in guardrails/refusals.ts screens user messages for evasion, advice, and injection. The data is fake by design, no real PII, no e-filing. Secrets live in Render env vars, never in the repo.

**Testing.** Thirty-two Vitest tests cover the math at every bracket boundary, the PDF field map, all three guardrail layers, and a property test running twenty randomized conversations that asserts no run exceeds five questions. One Playwright test drives the real end-to-end path against the running app, including the download and the trace.

## Anticipated follow-ups

- *Why not LangGraph?* It would add a framework to defend for no benefit at this size. The raw Messages API loop is fewer moving parts the judge can read.
- *How do you know the tax numbers are right?* They are the OBBBA-adjusted 2025 figures, sourced with retrieval dates in tax/SOURCES.md, and the forty-thousand single case asserts a refund of one thousand three hundred twenty-eight dollars.
- *Is the budget really enforced?* Yes. Each question is an ask_question tool call, and a distinct-question counter in guardrails/budget.ts refuses the sixth. The property test proves it over twenty runs.
- *What if the model hallucinates a field?* The dispatcher rejects unknown tools, Zod rejects bad args, and the PDF filler records any missing field name rather than dropping it silently.

## Backup bench

- *Cost?* A handful of Sonnet 4.6 turns per return dominate; hosting is free tier; PDF and math are local CPU.
- *Deployment?* render.yaml, autoDeploy on push to main, health check at /api/health returns the git SHA so I can confirm the deployed code.
- *Observability?* JSONL trace per session plus stdout, so Render's log viewer carries the same record.
- *Mid-conversation correction?* Answers are re-recorded structurally, so "actually, married filing jointly" updates the return.
- *Why Render?* The spec names it first and the free tier is enough.
- *Error handling?* Tool failures return a structured error with remediation so the model self-corrects, never a thrown stack trace.

## Escalation

If a rebuttal does not land, I quote the spec or the rejected alternative. For guardrails: the spec explicitly calls prompt-only the weaker answer, which is why enforcement is in code. For the model choice: tool calling and structured JSON are first class in Claude, which the dispatcher relies on.

## Moment of truth

The decisions the model makes for the user are auditable. The bracket math is in the trace, the field map is verified and tested, and the five-question budget is enforced in code. If challenged on any computed number, I can replay the session's JSONL trace and point at the exact tool call and result.

## Things to not say

- Do not say "the AI decided" without explaining the code path that constrained it.
- Do not say "I didn't really test it"; the e2e is real and green.
- Do not hedge on the tax numbers; they are sourced and tested.
- Do not call it production-ready; it is a prototype with fake data and no e-filing.
