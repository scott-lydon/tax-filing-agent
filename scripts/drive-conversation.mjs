// Drives a full happy-path conversation against a running server. Real LLM calls, no mocks.
const BASE = process.env.BASE ?? 'http://localhost:8788';
const w2 = (await import('node:fs')).readFileSync(new URL('../assets/sample-w2.json', import.meta.url), 'utf8');

async function post(path, body) {
  const r = await fetch(BASE + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  });
  return r.json();
}

const session = await post('/api/session');
console.log('SID', session.id);

const turns = [
  `Here's my W-2: ${w2}`,
  "I'm single.",
  'No dependents.',
  'No, just the W-2, no other income.',
  'No estimated payments.',
  "Nope, nothing unusual. I'm good!",
];

for (const t of turns) {
  const res = await post(`/api/session/${session.id}/message`, { message: t });
  console.log('\n>>> USER:', t.slice(0, 60));
  console.log('<<< TILLY:', (res.assistant || '(no text)').slice(0, 400));
  console.log('    downloadReady:', res.downloadReady, 'ok:', res.ok, res.detail ? 'detail:' + res.detail : '');
}

// Try the download.
const dl = await fetch(`${BASE}/api/return/${session.id}/download`);
console.log('\nDOWNLOAD status', dl.status, 'content-type', dl.headers.get('content-type'), 'disposition', dl.headers.get('content-disposition'));
const buf = Buffer.from(await dl.arrayBuffer());
console.log('PDF bytes', buf.length, 'starts with %PDF:', buf.slice(0, 4).toString() === '%PDF');
(await import('node:fs')).writeFileSync('/tmp/tfa-e2e-return.pdf', buf);
console.log('SID_OUT=' + session.id);
