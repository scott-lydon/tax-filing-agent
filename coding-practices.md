# Coding practices (tax-filing-agent)

How this project is built, so every agent and contributor builds in one unified style. This is a snapshot extracted from the three CLAUDE.md files (`~/.claude/CLAUDE.md`, `~/Documents/Claude/Projects/Gauntlet/CLAUDE.md`, this repo's conventions) plus the Google TypeScript Style Guide and the CUPID properties (cupid.dev). It says HOW to build, never WHAT may be built.

## Language and style

- **TypeScript everywhere.** Server and client share one language. `strict: true` in `tsconfig.json`. No implicit `any`. Prefer `unknown` over `any` at boundaries, then narrow with Zod.
- **Google TypeScript style** as the base: 2-space indent, semicolons, single quotes, named exports preferred over default exports, `camelCase` for variables and functions, `PascalCase` for types and components, `UPPER_SNAKE` only for true module-level constants.
- **Formatting is automated**, not argued. Prettier + ESLint (`@typescript-eslint`). The build fails on lint errors.
- **No barrel-file indirection** for single-use modules. Import from the file that owns the symbol.

## CUPID properties (the design north star)

- **Composable**: small modules with one reason to exist. `tax/compute2025.ts` is a pure function; it does not read the database or call the network.
- **Unix philosophy**: each tool does one thing. `record_w2`, `compute_return`, `finalize_and_render` are separate tools, not one mega-tool.
- **Predictable**: same inputs, same outputs. The tax computation is deterministic and unit-tested at bracket boundaries.
- **Idiomatic**: match the surrounding code. New code reads like the code next to it.
- **Domain-based**: names come from the tax domain (`filingStatus`, `standardDeduction`, `withholding`, `Return1040`), not from framework jargon.

## DRY / YAGNI / KISS / SPOT / SOI

- **DRY**: the Zod tool schemas are the single source of truth. They emit both the JSON Schema sent to Anthropic and the TypeScript types used by the dispatcher. Never hand-write a second copy of a shape.
- **YAGNI**: build only what the spec asks. No multi-year support, no e-filing, no auth system. Prototype scope.
- **KISS**: in-process state + one SQLite file beats Redis + Postgres for a single-binary free-tier deploy.
- **SPOT (single point of truth)**: the 2025 bracket and standard-deduction numbers live in exactly one file, `tax/brackets-2025.json`, with sourced citations in `tax/SOURCES.md`.
- **SOI (separation of interface)**: the tool dispatcher is the only seam between the LLM and the server's real actions.

## Error handling and logging

- **No catch-log-continue.** A caught error is either handled (recovered, with a structured result the model can act on) or rethrown. Never swallowed.
- **Tool failures are structured, not thrown to the model as stack traces.** A failed Zod validation returns `{ ok: false, error, remediation }` so the model can self-correct on the next turn.
- **Append-only event log** is the audit trail (`data/sessions/<id>.jsonl`). Logging is observation, a first-class feature, not a debug afterthought. The same records go to stdout in production so Render's log viewer carries them.
- **Errors are typed.** Domain errors carry a discriminant, not just a message string.

## No mock / stub / fake / reused data (HARD RULE)

- The ONLY fake data permitted is the explicitly-labeled sample W-2 (`assets/sample-w2.json`), because the spec asks for a realistic fake W-2. Everything else (tax math, PDF fields, session state, traces) is real and current.
- Never present reconstructed, replayed, or cached output as a fresh result. If a real result is unavailable (missing API key, service down), STOP and say so.

## Tax-specific correctness rules

- The 2025 numbers (standard deduction by filing status, marginal brackets, line numbers) are verified by WebSearch against IRS sources before they enter `tax/brackets-2025.json`, with retrieval dates recorded in `tax/SOURCES.md`.
- The tax computation is pure and unit-tested at every bracket boundary and every filing status.
- The filled PDF targets the real IRS AcroForm field names. The downloaded copy is flattened.

## Testing

- **Vitest** for unit and integration tests. **Playwright** for one end-to-end happy path.
- Boundary cases are mandatory for the tax module: each filing status, each bracket transition, refund vs balance due.
- A property test runs 20 randomized conversations and asserts no run ever exceeds the 5-question budget.
- A test that does not actually exercise the real code path (a test that asserts against a mock of the thing under test) does not count.

## Surgical changes

- Touch only what the task requires. Do not refactor adjacent code that is not broken. Match existing style even when you would do it differently.
- Remove imports and variables that your own change orphaned. Do not delete pre-existing dead code; mention it instead.

## Outward-facing text

- No em dashes, en dashes, or spaced-hyphen-as-dash in any user-facing string, commit message, PR body, or doc prose. Use commas, periods, colons, parentheses, or split the sentence. Hyphens inside compound words, code, paths, and flags are fine.

## Frontend and deploy hygiene

- Vite emits content-hashed asset filenames; verify the deployed `index.html` references the new hash after each deploy (no stale-cache hazard).
- Every overlay (the observation drawer especially) bounds its height with `max-h-[min(90vh,calc(100vh-3rem))] overflow-y-auto overscroll-contain` and keeps its dismiss affordance reachable.
- Code edited is not code shipped: a change is only "done" after build + deploy + behavior observed in the running app.
