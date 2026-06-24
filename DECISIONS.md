# DECISIONS

Why this tax-filing agent is built the way it is. One paragraph per decision; the reasoning is in the paragraph.

**Language and framework.** Node plus TypeScript, Fastify on the server, React with Vite on the client, one npm workspace. Render's free Node service has a low cold start, the agent tooling (Anthropic SDK) is first class in TypeScript, and a single language gives a typed contract across the wire. Swift is my usual default, but the target is a web chat on Render, so a JS stack wins.

**Model choice.** Anthropic Claude Sonnet 4.6 runs the conversation and the tool loop. Tool calling and structured JSON via tool schemas are native, and the key plumbing was already in this environment. I did not need a second cheap model: the five-question budget is enforced in code, so the Haiku classifier the plan floated was dropped as unnecessary moving parts.

**1040 fill.** I fill the official IRS 2025 Form 1040 fillable PDF with pdf-lib, then flatten it for download. The form is an XFA form with opaque field names, so I mapped every field I touch by filling each with a sentinel, rendering to PNG, and reading the rendered page back. That verified map lives in `tax/PDF_FIELDS.md` and is guarded by a test that fails if any field name drifts. pdf-lib is pure JavaScript and needs no system packages on the free tier.

**W-2 source.** The default is paste-in; a "Use sample W-2" button loads a realistic fake $40,000 W-2 so a reviewer can run the whole flow in seconds. Paste-in is deterministic and proves the path end to end. OCR or PDF upload would add fragility for no core benefit, so they stayed out of scope.

**Tax computation.** A pure TypeScript function, `tax/compute2025.ts`, computes the return from the W-2 and answers using a JSON table of 2025 brackets and standard deductions. The numbers are the OBBBA-adjusted 2025 figures (standard deduction $15,750 single, Child Tax Credit $2,200), verified by web search with sources and retrieval dates in `tax/SOURCES.md`. Pure code is auditable and unit tested at every bracket boundary and filing status. The function also returns a per-bracket breakdown so the math is visible, not a black box.

**Guardrails.** Three layers, all in code a reviewer can open. Layer A: every tool call is validated by a Zod schema, so a negative income or an out-of-enum filing status is rejected before the tool runs and the model gets a structured error to recover from. Layer B: a hard-coded refusal list screens each user message before it reaches the model and returns a friendly redirect, logged as a guardrail block. Layer C: a distinct-question counter caps the agent at five questions; a sixth distinct `ask_question` call is refused and the model is told to wrap up. Prompt-only guardrails were rejected because the spec calls them the weaker answer.

**Conversation.** The persona, Tilly, is warm and brief, uses contractions and first names, mentions "not tax advice" once, and never says "as an AI". Each of the five questions is an `ask_question` tool call, so the budget is enforced rather than hoped for. Mid-conversation corrections work because answers are re-recorded structurally.

**State.** Sessions and messages persist to a single SQLite file via better-sqlite3, with an in-memory cache in front. A Render free restart does not wipe an in-flight session because the full history rehydrates from disk. Redis or Postgres would add a cold-start dependency for no benefit at this scale.

**Observation.** Every decision, tool call, tool result, guardrail block, question count, and finalize is appended to a per-session JSONL trail and echoed to stdout for Render's logs. A trace endpoint and an in-UI "Show what the agent did" drawer make the agent's work visible, which is pillar four.

**Hosting.** Render Web Service from the GitHub repo, free plan, `render.yaml` checked in, autoDeploy on push to main. The spec names Render first and the free tier is enough.

**Testing.** Vitest covers the tax math, the PDF field map, all three guardrail layers, the budget as a property over twenty randomized runs, the tool chain, and session restart. Playwright drives one real end-to-end happy path: load the sample, answer five questions, download the filled PDF, and read the trace. The spec weights "does it actually work" heavily, so the end-to-end test uses real model calls, not mocks.
