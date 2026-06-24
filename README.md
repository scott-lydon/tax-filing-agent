# tax-filing-agent

An agentic chat assistant that helps a W-2 earner (around $40,000/year) file a 2025 Form 1040 and download the filled return. Built for the Gauntlet tax-filing hackathon.

Four enforced pillars: a stateful chat loop, real tools the agent invokes, guardrails enforced in code, and an observation trail you can read.

- Live URL: pending (Slice 9).
- Demo recording: pending (Slice 9).

## One-command local run

```bash
npm ci && npm test && npm run build && npm start
```

Then open http://localhost:8787. The chat loop needs an Anthropic API key:

```bash
export ANTHROPIC_API_KEY=sk-ant-...
```

## Stack

Node + TypeScript, Fastify server, React + Vite UI, Anthropic Claude (Sonnet 4.6 loop, Haiku 4.5 classify), pdf-lib against the official IRS 2025 Form 1040, better-sqlite3 for sessions, deployed on Render.

## Docs

- `ARCHITECTURE.md` — topology, data flow, decisions, trade-offs.
- `acceptance-tests.md` — user stories and Given/When/Then tests by rubric pillar.
- `coding-practices.md` — how this project is built.
- `tasks.md` — the slice plan.
- `QA_ADVERSARY.md` — how the QA agent attacks this project.
- `DECISIONS.md` — half-page decision summary (Slice 10).

## Scope

Prototype. Fake data only. No e-filing. Not tax advice.
