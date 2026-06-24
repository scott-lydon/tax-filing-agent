# Architecture defense breakout script (~4:30)

## What the system is

This is a chat assistant that prepares a 2025 federal Form 1040 for a W-2 earner and hands back a filled PDF they can download. Someone pastes a W-2 or loads the sample. The assistant asks at most five friendly questions, fills the real IRS form, and shows the refund or balance due. It runs as a Node and TypeScript service with a React front end, it calls Claude Sonnet 4.6 for the conversation, and it is deployed on Render's free tier.

## The four pillars, and where each one lives in code

The chat loop carries state across turns. Sessions and messages persist to a SQLite file, with an in-memory cache in front. If the server restarts mid-conversation, the session rehydrates from disk, so the agent can still quote what you said in turn one.

The tools take real actions. The agent calls record_w2, record_answer, compute_return, and finalize_and_render. That last tool fills the official IRS PDF with pdf-lib and writes it to disk, and the download endpoint streams it back as an attachment.

The guardrails are enforced in code, not in the prompt. There are three layers. Every tool argument goes through a Zod schema, so a negative income or a filing status outside the five valid values is rejected before the tool runs. A refusal list screens each user message and redirects anything about hiding income or asking for legal advice. And a distinct-question counter caps the agent at five questions; the sixth distinct question is refused and the model is told to wrap up.

The observation trail is append-only. Every decision, tool call, result, guardrail block, question count, and finalize goes to a JSONL file per session and to stdout. A trace endpoint serves it, and the UI has a "Show what the agent did" drawer that streams it live.

## The tax math

The computation is a pure TypeScript function over a JSON table of 2025 brackets and standard deductions. Those numbers are the ones changed by the One Big Beautiful Bill Act for 2025: the single standard deduction is fifteen thousand seven hundred fifty, and the Child Tax Credit is twenty-two hundred per child. I verified them by web search and recorded the sources with retrieval dates. The function returns a per-bracket breakdown, so the math shows up in the trace instead of hiding in a black box. For the forty thousand dollar single filer in the sample, it produces a refund of one thousand three hundred twenty-eight dollars, and that exact number is asserted in a unit test.

## The PDF field map

The IRS form is an XFA form, so after the form layer is stripped the fields have opaque names like f1 underscore forty-seven. I mapped every field I fill by writing a sentinel value into each one, rendering the page to an image, and reading it back to confirm which line it lands on. That map is documented and guarded by a test that fails if any field name drifts.

## Trade-offs

SQLite instead of a managed database means one instance, which is the right call on a free tier and would only bite at multi-instance scale. The Child Tax Credit is modeled on line nineteen as a nonrefundable credit; the refundable additional credit on line twenty-eight would need Schedule 8812, which is noted in the code as out of scope for the prototype. The W-2 comes in by paste or sample button rather than image upload, which keeps the path deterministic.

## Testing

Thirty-two unit and integration tests cover the tax math, the field map, all three guardrail layers, the budget as a property over twenty randomized runs, the full tool chain, and session restart. One Playwright test drives the real end-to-end path against the running app: load the sample, answer five questions, download the PDF, and read the trace. It uses real model calls because the spec weights whether it actually works.

This is a prototype with fake data, it does not e-file, and it is not tax advice. It does fill a real 2025 form, end to end, with the math and the agent's reasoning both on display.
