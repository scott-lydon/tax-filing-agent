const id = process.argv[2] ?? 'srv-d8u3f65aeets738hqsa0';
const H = { Authorization: `Bearer ${process.env.RENDER_API_KEY}` };
const URL_HEALTH = 'https://tax-filing-agent.onrender.com/api/health';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const TERMINAL = new Set(['live', 'deactivated', 'build_failed', 'update_failed', 'canceled', 'pre_deploy_failed']);

for (let i = 1; i <= 30; i++) {
  const d = await (await fetch(`https://api.render.com/v1/services/${id}/deploys?limit=1`, { headers: H })).json();
  const status = d[0]?.deploy?.status ?? 'unknown';
  const commit = d[0]?.deploy?.commit?.id?.slice(0, 7) ?? '?';
  console.log(`poll ${i}: ${status} (${commit})`);
  if (TERMINAL.has(status)) {
    console.log(`FINAL: ${status}`);
    if (status === 'live') {
      try {
        const h = await (await fetch(URL_HEALTH)).json();
        console.log('health:', JSON.stringify(h));
      } catch (e) {
        console.log('health check error:', e.message);
      }
    }
    break;
  }
  await sleep(20000);
}
