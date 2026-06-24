// Deploys tax-filing-agent to Render via the API. Reads RENDER_API_KEY and ANTHROPIC_API_KEY
// from the environment (run with: node --env-file=.env scripts/render-deploy.mjs <cmd>).
// Never prints secret values.

const KEY = process.env.RENDER_API_KEY;
if (!KEY) {
  console.error('RENDER_API_KEY not set');
  process.exit(1);
}
const H = { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', Accept: 'application/json' };
const API = 'https://api.render.com/v1';

async function get(path) {
  const r = await fetch(API + path, { headers: H });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}
async function post(path, body) {
  const r = await fetch(API + path, { method: 'POST', headers: H, body: JSON.stringify(body) });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}

const cmd = process.argv[2] ?? 'info';

if (cmd === 'info') {
  const owners = await get('/owners?limit=20');
  console.log('owners status', owners.status);
  for (const o of owners.body) console.log('  owner:', o.owner?.id, o.owner?.name, o.owner?.type);
  const svcs = await get('/services?limit=50');
  console.log('services status', svcs.status);
  for (const s of svcs.body) console.log('  svc:', s.service?.id, s.service?.name, s.service?.type, s.service?.serviceDetails?.url ?? '');
}

if (cmd === 'create') {
  const owners = await get('/owners?limit=5');
  const ownerId = owners.body[0]?.owner?.id;
  if (!ownerId) {
    console.error('no owner found', JSON.stringify(owners.body));
    process.exit(1);
  }
  const payload = {
    type: 'web_service',
    name: 'tax-filing-agent',
    ownerId,
    repo: 'https://github.com/scott-lydon/tax-filing-agent',
    branch: 'main',
    autoDeploy: 'yes',
    serviceDetails: {
      runtime: 'node',
      plan: 'free',
      region: 'oregon',
      envSpecificDetails: {
        buildCommand: 'npm ci && npm run build',
        startCommand: 'npm start',
      },
    },
    envVars: [
      { key: 'ANTHROPIC_API_KEY', value: process.env.ANTHROPIC_API_KEY },
      { key: 'NODE_VERSION', value: '20' },
    ],
  };
  const res = await post('/services', payload);
  console.log('create status', res.status);
  const svc = res.body?.service ?? res.body;
  console.log('service id:', svc?.id, 'name:', svc?.name);
  console.log('url:', svc?.serviceDetails?.url);
  if (res.status >= 400) console.log('error body:', JSON.stringify(res.body).slice(0, 800));
}

if (cmd === 'status') {
  const id = process.argv[3];
  const s = await get(`/services/${id}`);
  console.log('service', s.body?.name, 'url', s.body?.serviceDetails?.url, 'suspended', s.body?.suspended);
  const deploys = await get(`/services/${id}/deploys?limit=3`);
  for (const d of deploys.body) console.log('  deploy', d.deploy?.id, d.deploy?.status, d.deploy?.commit?.id?.slice(0, 7), d.deploy?.finishedAt ?? '');
}
