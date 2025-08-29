// src/lib/http.ts
const BASE = process.env.NEXT_PUBLIC_API_URL || '';

type FetchOpts = RequestInit & {
  retries?: number;       // reintentos en 5xx/network
  timeoutMs?: number;     // timeout del request
};

function resolveUrl(url: string) {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  return `${BASE}${url.startsWith('/') ? url : `/${url}`}`;
}

async function withTimeout<T>(p: Promise<T>, ms = 15000): Promise<T> {
  if (!ms) return p;
  let t: any;
  const timeout = new Promise<never>((_, rej) => {
    t = setTimeout(() => rej(new Error('Request timeout')), ms);
  });
  try {
    return await Promise.race([p, timeout]);
  } finally {
    clearTimeout(t);
  }
}

async function _fetch(url: string, opts: FetchOpts = {}) {
  const { retries = 0, timeoutMs = 15000, ...rest } = opts;
  let attempt = 0;
  let lastErr: any;

  while (attempt <= retries) {
    try {
      const res = await withTimeout(fetch(resolveUrl(url), { cache: 'no-store', ...rest }), timeoutMs);
      if (!res.ok && res.status >= 500 && attempt < retries) {
        attempt++;
        await new Promise(r => setTimeout(r, 300 * attempt));
        continue;
      }
      return res;
    } catch (e) {
      lastErr = e;
      if (attempt < retries) {
        attempt++;
        await new Promise(r => setTimeout(r, 300 * attempt));
        continue;
      }
      throw lastErr;
    }
  }
  // inalcanzable
  throw lastErr || new Error('Fetch failed');
}

export async function httpJson<T = any>(url: string, init: FetchOpts = {}, parse = true): Promise<T> {
  const res = await _fetch(url, {
    headers: { 'Accept': 'application/json', ...(init.headers || {}) },
    ...init,
  });
  if (!parse) return (res as unknown) as T;
  // intenta parsear json; si no hay body, devuelve {} as any
  const txt = await res.text();
  const data = txt ? JSON.parse(txt) : {};
  return data as T;
}

export async function httpText(url: string, init: FetchOpts = {}): Promise<string> {
  const res = await _fetch(url, init);
  return res.text();
}

export async function httpBlob(url: string, init: FetchOpts = {}): Promise<Blob> {
  const res = await _fetch(url, init);
  return res.blob();
}

export const http = {
  json: httpJson,
  text: httpText,
  blob: httpBlob,
};