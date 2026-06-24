# tax-filing-agent

An agentic chat assistant that helps a W-2 earner (around $40,000/year) file a 2025 Form 1040 and download the filled return. Built for the Gauntlet tax-filing hackathon.

Four enforced pillars: a stateful chat loop, real tools the agent invokes, guardrails enforced in code, and an observation trail you can read.

- Live URL: https://tax-filing-agent.onrender.com
- Demo recording (68s, recorded against the live URL): [`docs/demo-live.webm`](docs/demo-live.webm)
- Architecture website: [`website/index.html`](website/index.html)

## One-command local run

```bash
npm ci && npm test && npm run build && npm start
```

Then open http://localhost:8787. The chat loop needs an Anthropic API key; put it in `.env` (auto-loaded) or export it:

```bash
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env
```

Run the end-to-end test against the live site:

```bash
E2E_BASE_URL=https://tax-filing-agent.onrender.com npx playwright test
```

## Stack

Node + TypeScript, Fastify server, React + Vite UI, Anthropic Claude Sonnet 4.6 for the conversation and tool loop, pdf-lib against the official IRS 2025 Form 1040, better-sqlite3 for sessions, deployed on Render. The five-question budget is enforced by a deterministic in-code counter (no second model needed).

## Docs

- `ARCHITECTURE.md` — topology, data flow, decisions, trade-offs.
- `acceptance-tests.md` — user stories and Given/When/Then tests by rubric pillar.
- `coding-practices.md` — how this project is built.
- `tasks.md` — the slice plan.
- `QA_ADVERSARY.md` — how the QA agent attacks this project.
- `DECISIONS.md` — half-page decision summary (Slice 10).

## Debug / observability

- `GET /api/health` returns `{ ok, version: <git sha> }`.
- `GET /api/session/:id/trace` returns the append-only event trail.
- `GET /api/admin/session/:id` returns full session state plus the trace, for manual inspection.
- In the UI, the "Show what the agent did" drawer streams the same trace live.

## Scope

Prototype. Fake data only. No e-filing. Not tax advice.
