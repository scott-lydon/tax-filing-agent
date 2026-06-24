import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..');
const clientDist = join(repoRoot, 'client', 'dist');

/** Short git sha for /api/health. Prefers Render's injected commit, falls back to local git. */
function resolveVersion(): string {
  if (process.env.RENDER_GIT_COMMIT) {
    return process.env.RENDER_GIT_COMMIT.slice(0, 7);
  }
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

// Serve the built React bundle in production. In dev the Vite server proxies /api here instead.
if (existsSync(clientDist)) {
  await app.register(fastifyStatic, { root: clientDist });

  // SPA fallback: any non-API route returns index.html so client routing works.
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
