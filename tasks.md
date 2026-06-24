# Tasks (tax-filing-agent)

Slices, smallest shippable units. Status as of the live deploy of commit f085282+.

## Done

### Slice 0: Repo, CATA docs, dual push, render.yaml — DONE
- [x] GitHub repo + clone; dual push (GitHub + GitLab), hashes match.
- [x] Five populated CATA docs; placeholder grep clean.
- [x] render.yaml. First commit clean to both remotes.

### Slice 1: Skeleton server + chat UI + health — DONE
- [x] npm workspace, Fastify serves client/dist, `GET /api/health` returns `{ ok, version: git sha }`.
- [x] React + Vite + Tailwind chat shell. `npm run build && npm start`.
- [x] Render deploy live; `/api/health` returns ok. (AT-E1)

### Slice 2: Chat loop with persisted state — DONE
- [x] SQLite `sessions` + `messages`; `POST /api/session`; `POST /api/session/:id/message` runs the Anthropic loop.
- [x] Restart rehydrates an in-flight session. (AT-H1 mechanism, persistence test; live happy path verified.)

### Slice 3: Tools incl. 1040 fill — DONE
- [x] Zod tool schemas (record_w2, ask_question, record_answer, compute_return, finalize_and_render) + JSON Schema export.
- [x] Dispatcher validates, returns structured errors. finalize writes flattened PDF; `GET /api/return/:id/download` streams attachment. (AT-H2)

### Slice 4: Guardrails in code — DONE
- [x] Layer A Zod validation, Layer B refusal list, Layer C distinct-question budget. (AT-H3/H4/H5, incl. property test)

### Slice 5: Observation surface — DONE
- [x] JSONL trace per session + stdout; `GET /api/session/:id/trace`; UI drawer (bounded max-h + overflow). (AT-H6, AT-D3)

### Slice 6: Tax computation, real 2025 numbers — DONE
- [x] WebSearch-verified OBBBA 2025 brackets/std deduction/CTC in `tax/SOURCES.md`; pure `tax/compute2025.ts`; boundary tests. (AT-E2/E4/D2)

### Slice 7: Sample W-2 + button — DONE
- [x] `assets/sample-w2.json` ($40k); "Use sample W-2" button loads it; agent acknowledges in one turn. (AT-C4)

### Slice 8: Conversation design — DONE
- [x] Warm Tilly persona, sealed scope; each question is an ask_question tool call; live happy path completes in 5 answers. (AT-C1/C2)

## In progress

### Slice 9: End-to-end deployment proof
- [x] Pushed to main; Render built; `/api/health` SHA matches the deployed commit.
- [x] Playwright e2e green locally; re-run against the live URL.
- [x] Screen recording of the live happy path (Playwright video, see docs/).
- [x] Deploy-verify-or-die evidence in the commit/response.

### Slice 10: DECISIONS + submission
- [x] `DECISIONS.md` (all ten decisions).
- [x] `README.md` with live URL + one-command run.
- [x] Final dual push, both remotes match.
- [ ] Save the submission URL to a notes doc on submit.

## Backlog (stretch)
- [ ] Second filing status with a dependent (CTC) — partially supported; ACTC not modeled.
- [x] Mid-conversation correction (answers re-recorded structurally).
- [ ] W-2 PDF upload with extraction + malformed recovery.
