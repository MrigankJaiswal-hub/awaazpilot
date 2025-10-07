import { log } from './logger';

const API_BASE = (process.env.MURF_API_BASE ?? 'https://api.murf.ai').trim();
const RAW_KEY = process.env.MURF_API_KEY ?? '';
const API_KEY = RAW_KEY.trim();

function assertAscii(name: string, value: string) {
  for (const ch of value) {
    const cp = ch.codePointAt(0)!;
    if (cp > 127) {
      throw new Error(`${name} contains non-ASCII char U+${cp.toString(16).toUpperCase()} (e.g., smart quotes/ellipsis). Re-type it in .env.`);
    }
  }
}

if (!API_KEY) {
  throw new Error('Missing MURF_API_KEY in environment');
}
assertAscii('MURF_API_KEY', API_KEY);

let cached: { token: string; expiry: number } | null = null;

export async function getMurfBearerToken(): Promise<string> {
  const now = Date.now();
  if (cached && now < cached.expiry - 60_000) return cached.token;

  const url = `${API_BASE}/v1/auth/token`;
  log.info('Fetching Murf bearer token…');

  const res = await fetch(url, {
    method: 'GET',
    headers: { 'api-key': API_KEY } as Record<string, string>,
  });

  const bodyText = await res.text().catch(() => '');

  if (!res.ok) {
    let detail = '';
    try { const j = JSON.parse(bodyText); detail = `${j.errorMessage ?? ''} code=${j.errorCode ?? res.status}`; }
    catch { detail = bodyText?.slice(0, 200); }
    log.error('Token fetch failed', res.status, detail ?? '');
    throw new Error(`Token fetch failed: ${res.status}`);
  }

  let data: { token: string; expiryInEpochMillis: number };
  try { data = JSON.parse(bodyText); }
  catch { log.error('Unexpected token JSON:', bodyText.slice(0, 200)); throw new Error('Token parse failed'); }

  cached = { token: data.token, expiry: data.expiryInEpochMillis };
  log.info('Murf token cached; expires at', new Date(cached.expiry).toISOString());
  return data.token;
}
