import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import { GREETING } from './prompt.js';
import { logEvent, readTrace } from './logger.js';
import { RETURNS_DIR } from './db.js';
import { appendMessage, createSession, loadSession } from './session.js';
import { handleMessage } from './harness.js';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..');
const clientDist = join(repoRoot, 'client', 'dist');
const sampleW2Path = join(repoRoot, 'assets', 'sample-w2.json');

function resolveVersion(): string {
  if (process.env.RENDER_GIT_COMMIT) return process.env.RENDER_GIT_COMMIT.slice(0, 7);
  try {
    return execSync('git rev-parse --short HEAD', { cwd: repoRoot }).toString().trim();
  } catch {
    return 'dev';
  }
}

const VERSION = resolveVersion();
const PORT = Number(process.env.PORT ?? 8787);
const app = Fastify({ logger: true });

app.get('/api/health', async () => ({ ok: true, version: VERSION }));

app.get('/api/sample-w2', async (_req, reply) => {
  reply.type('application/json').send(readFileSync(sampleW2Path, 'utf8'));
});

// Create a session and return its id plus the warm greeting.
app.post('/api/session', async () => {
  const state = createSession();
  appendMessage(state.id, { role: 'assistant', content: GREETING });
  logEvent(state.id, 'session_start', { id: state.id });
  logEvent(state.id, 'assistant_message', { text: GREETING });
  return { id: state.id, greeting: GREETING };
});

// One conversational turn.
app.post<{ Params: { id: string }; Body: { message?: string } }>(
  '/api/session/:id/message',
  async (req, reply) => {
    const state = loadSession(req.params.id);
    if (!state) return reply.code(404).send({ ok: false, error: 'session not found' });
    const message = (req.body?.message ?? '').toString();
    if (!message.trim()) return reply.code(400).send({ ok: false, error: 'empty message' });
    try {
      const result = await handleMessage(state, message);
      return { ok: true, ...result };
    } catch (err) {
      req.log.error(err);
      const detail = err instanceof Error ? err.message : 'unknown error';
      return reply.code(503).send({ ok: false, error: 'assistant unavailable', detail });
    }
  },
);

// Observation trail (pillar 4).
app.get<{ Params: { id: string } }>('/api/session/:id/trace', async (req, reply) => {
  const state = loadSession(req.params.id);
  if (!state) return reply.code(404).send({ ok: false, error: 'session not found' });
  return { ok: true, events: readTrace(req.params.id) };
});

// Debug/admin surface: full session state plus trace, for manual testing.
app.get<{ Params: { id: string } }>('/api/admin/session/:id', async (req, reply) => {
  const state = loadSession(req.params.id);
  if (!state) return reply.code(404).send({ ok: false, error: 'session not found' });
  return { ok: true, state, events: readTrace(req.params.id) };
});

// Download the filled, flattened 1040.
app.get<{ Params: { id: string } }>('/api/return/:id/download', async (req, reply) => {
  const file = join(RETURNS_DIR, `${req.params.id}.pdf`);
  if (!existsSync(file)) return reply.code(404).send({ ok: false, error: 'return not ready' });
  reply
    .header('Content-Type', 'application/pdf')
    .header('Content-Disposition', `attachment; filename="form-1040-2025-${req.params.id.slice(0, 8)}.pdf"`)
    .send(readFileSync(file));
});

if (existsSync(clientDist)) {
  await app.register(fastifyStatic, { root: clientDist });
  app.setNotFoundHandler((req, reply) => {
    if (req.url.startsWith('/api')) {
      reply.code(404).send({ ok: false, error: 'not found' });
      return;
    }
    reply.sendFile('index.html');
  });
}

try {
  await app.listen({ port: PORT, host: '0.0.0.0' });
  app.log.info(`tax-filing-agent listening on :${PORT} (version ${VERSION})`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
