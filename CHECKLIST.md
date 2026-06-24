# Per-assignment Claude checklist (tax-filing-agent)

Ticked with evidence. Re-checked before submission.

- [x] **Granular transparency.** The "Show what the agent did" drawer streams the JSONL trace: tool calls with args, results, guardrail blocks, the question counter, and finalize. `compute_return` returns a per-bracket `bracketBreakdown`, so the tax math is visible, not a black box. (`tax/compute2025.ts`, `client/src/TracePanel.tsx`)
- [x] **Debug route for manual testing.** `GET /api/admin/session/:id` returns full session state plus the trace, so an operator can inspect any session out of band. (`server/index.ts`)
- [x] **OS permission prompts do not overlap feature UI.** Not applicable: the app uses no microphone, camera, geolocation, or notification APIs. Documented here.
- [x] **No stale-cache hazard.** Vite emits content-hashed asset filenames (verified: the deployed `index.html` references `index-<hash>.js`). A new build produces a new URL the browser cannot have cached.
- [x] **Scroll overflow bounded on overlays.** The observation drawer caps height with `max-h-[min(50vh,calc(100vh-3rem))] overflow-y-auto overscroll-contain`. (`client/src/TracePanel.tsx`)
- [x] **Frontend build check.** Render runs `npm run build` (Vite) on deploy; the server serves `client/dist`. Verified the deployed bundle hash is served.
- [x] **Machine-load guard.** No more than one heavy build ran at a time on this machine; builds were kept in the foreground or tracked.
