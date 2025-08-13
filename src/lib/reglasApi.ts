// lib/reglasApi.ts
const API = process.env.NEXT_PUBLIC_API_URL;

function hostHeader(host?: string) {
  const h = host ?? (typeof window !== 'undefined' ? window.location.hostname : '');
  return { 'x-clinica-host': h };
}

export type NivelAlerta = 'verde' | 'amarillo' | 'rojo';
export type Operador = '>'|'>='|'<'|'<='|'=='|'!='|'in'|'contains'|'between';

export interface ReglaClinica {
  id?: string;
  campo: string;
  operador: Operador;
  valor: any;           // 'between' => "min,max", 'in' => "a,b,c"
  nivel: NivelAlerta;
  color?: string;
  sugerencia?: string;
}
export interface ReglasClinicas { condiciones: ReglaClinica[] }

function normReglas(x: any): ReglasClinicas {
  if (x && Array.isArray(x.condiciones)) return x as ReglasClinicas;
  return { condiciones: [] };
}

/** Rutas candidatas — probamos en orden hasta encontrar una que responda 200 */
const PATHS = {
  GET: [
    '/api/clinicas/reglas',            // original
    '/api/reglas',                     // alternativa común
    // variantes por host en path:
    (host: string) => `/api/clinicas/${host}/reglas`,
    (host: string) => `/api/reglas/${host}`,
  ],
  PUT: [
    '/api/clinicas/reglas',
    '/api/reglas',
    (host: string) => `/api/clinicas/${host}/reglas`,
    (host: string) => `/api/reglas/${host}`,
  ],
  PREVIEW: [
    '/api/clinicas/reglas/preview',
    '/api/reglas/preview',
    (host: string) => `/api/clinicas/${host}/reglas/preview`,
    (host: string) => `/api/reglas/${host}/preview`,
  ],
};

/** Helper con timeout */
async function withTimeout<T>(factory: (signal: AbortSignal) => Promise<T>, ms = 12000): Promise<T> {
  const ac = new AbortController();
  const id = setTimeout(() => ac.abort(), ms);
  try {
    return await factory(ac.signal);
  } finally {
    clearTimeout(id);
  }
}

type PathEntry = string | ((host: string) => string);
function buildPaths(list: PathEntry[], host?: string) {
  const h = host ?? (typeof window !== 'undefined' ? window.location.hostname : '');
  return list.map(p => (typeof p === 'function' ? p(h) : p));
}

async function tryJson(url: string, init: RequestInit, signal: AbortSignal) {
  const res = await fetch(url, { ...init, signal });
  const body = await res.json().catch(() => ({}));
  return { res, body };
}

/** GET reglas con fallback de rutas */
export async function fetchReglas(host?: string): Promise<ReglasClinicas> {
  const headers = { ...hostHeader(host) };
  const candidates = buildPaths(PATHS.GET, host);

  return withTimeout(async (signal) => {
    let lastErr: any = null;

    for (const path of candidates) {
      const url = `${API}${path}`;
      try {
        const { res, body } = await tryJson(url, { headers, cache: 'no-store' }, signal);
        if (res.ok) {
          // backend puede devolver { reglas: {...} } o directamente {...}
          const reglas = body?.reglas ?? body;
          return normReglas(reglas);
        }
        if (res.status === 404) {
          // probamos la siguiente ruta
          continue;
        }
        // otro error (401/500/etc)
        throw new Error(body?.error || `Error ${res.status} en ${path}`);
      } catch (e) {
        lastErr = e;
      }
    }

    // si ninguna ruta respondió ok
    throw new Error(
      (lastErr?.message
        ? `No se pudieron obtener las reglas (${lastErr.message}).`
        : 'No se pudieron obtener las reglas (todas las rutas devolvieron 404).')
      + ' Verificá qué endpoint existe realmente en el backend.'
    );
  });
}

/** PUT reglas con fallback de rutas */
export async function saveReglas(reglas: ReglasClinicas, host?: string) {
  const headers = { 'Content-Type': 'application/json', ...hostHeader(host) };
  const body = JSON.stringify({
    host: host ?? (typeof window !== 'undefined' ? window.location.hostname : ''),
    reglas,
  });
  const candidates = buildPaths(PATHS.PUT, host);

  return withTimeout(async (signal) => {
    let last404 = true;
    let lastErr: any = null;

    for (const path of candidates) {
      const url = `${API}${path}`;
      try {
        const { res, body: payload } = await tryJson(url, { method: 'PUT', headers, body }, signal);
        if (res.ok) return payload;
        if (res.status === 404) { last404 = true; continue; }
        last404 = false;
        throw new Error(payload?.error || `Error ${res.status} en ${path}`);
      } catch (e) {
        lastErr = e;
      }
    }

    throw new Error(
      last404
        ? 'No se pudieron guardar las reglas: todas las rutas devolvieron 404.'
        : (lastErr?.message || 'No se pudieron guardar las reglas.')
    );
  });
}

/** POST preview con fallback de rutas */
export async function previewReglas(reglas: ReglasClinicas, sample: Record<string, any>, host?: string) {
  const headers = { 'Content-Type': 'application/json', ...hostHeader(host) };
  const body = JSON.stringify({ reglas, sample });
  const candidates = buildPaths(PATHS.PREVIEW, host);

  return withTimeout(async (signal) => {
    let last404 = true;
    let lastErr: any = null;

    for (const path of candidates) {
      const url = `${API}${path}`;
      try {
        const { res, body: payload } = await tryJson(url, { method: 'POST', headers, body }, signal);
        if (res.ok) return payload;
        if (res.status === 404) { last404 = true; continue; }
        last404 = false;
        throw new Error(payload?.error || `Error ${res.status} en ${path}`);
      } catch (e) {
        lastErr = e;
      }
    }

    throw new Error(
      last404
        ? 'No se pudo previsualizar: todas las rutas devolvieron 404.'
        : (lastErr?.message || 'No se pudo previsualizar.')
    );
  });
}