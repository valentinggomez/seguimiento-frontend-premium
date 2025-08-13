// lib/reglasApi.ts
const API = process.env.NEXT_PUBLIC_API_URL;

/* -------------------- helpers -------------------- */
function getHost(host?: string) {
  return host ?? (typeof window !== 'undefined' ? window.location.hostname : '');
}

function getToken() {
  if (typeof window === 'undefined') return '';
  return (
    localStorage.getItem('token') ||
    localStorage.getItem('jwt') ||
    localStorage.getItem('authToken') ||
    ''
  );
}

function getClinicaId() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('clinica_id') || localStorage.getItem('clinicaId') || '';
}

/** Headers comunes que piden los endpoints */
function commonHeaders(host?: string) {
  const h: Record<string, string> = {};
  const cid = getClinicaId();
  if (cid) h['x-clinica-id'] = cid;

  const tk = getToken();
  if (tk) h['Authorization'] = `Bearer ${tk}`;

  // igual mandamos el header por si querés usarlo del lado server
  const resolved = getHost(host);
  if (resolved) h['x-clinica-host'] = resolved;

  return h;
}

/* -------------------- tipos -------------------- */
export type NivelAlerta = 'verde' | 'amarillo' | 'rojo';
export type Operador = '>'|'>='|'<'|'<='|'=='|'!='|'in'|'contains'|'between';

export interface ReglaClinica {
  id?: string;
  campo: string;
  operador: Operador;
  valor: any;   // 'between' => "min,max", 'in' => "a,b,c"
  nivel: NivelAlerta;
  color?: string;
  sugerencia?: string;
}
export interface ReglasClinicas { condiciones: ReglaClinica[] }

function normReglas(x: any): ReglasClinicas {
  if (x && Array.isArray(x.condiciones)) return x as ReglasClinicas;
  return { condiciones: [] };
}

/* -------------------- rutas (prioriza ?host=) -------------------- */
type PathEntry = string | ((host: string) => string);

const PATHS = {
  GET: [
    // ✅ PRIORIDAD: con query
    (host: string) => `/api/clinicas/reglas?host=${encodeURIComponent(host)}`,
    // fallback: sin query (usa header)
    '/api/clinicas/reglas',
  ] as PathEntry[],
  PUT: [
    // ✅ PRIORIDAD: con host en body, pero también con query por claridad
    (host: string) => `/api/clinicas/reglas?host=${encodeURIComponent(host)}`,
    '/api/clinicas/reglas',
  ] as PathEntry[],
  PREVIEW: [
    (host: string) => `/api/clinicas/reglas/preview?host=${encodeURIComponent(host)}`,
    '/api/clinicas/reglas/preview',
  ] as PathEntry[],
};

function buildPaths(list: PathEntry[], host?: string) {
  const h = getHost(host);
  return list.map(p => (typeof p === 'function' ? p(h) : p));
}

/* -------------------- fetch con timeout -------------------- */
async function withTimeout<T>(factory: (signal: AbortSignal) => Promise<T>, ms = 12000): Promise<T> {
  const ac = new AbortController();
  const id = setTimeout(() => ac.abort(), ms);
  try {
    return await factory(ac.signal);
  } finally {
    clearTimeout(id);
  }
}

async function tryJson(url: string, init: RequestInit, signal: AbortSignal) {
  const res = await fetch(url, { ...init, signal });
  const body = await res.json().catch(() => ({}));
  return { res, body };
}

/* -------------------- API -------------------- */
export async function fetchReglas(host?: string): Promise<ReglasClinicas> {
  const candidates = buildPaths(PATHS.GET, host);
  const headers = { ...commonHeaders(host) };

  return withTimeout(async (signal) => {
    let lastErr: any = null;
    for (const path of candidates) {
      const url = `${API}${path}`;
      try {
        const { res, body } = await tryJson(url, { headers, cache: 'no-store' }, signal);
        if (res.ok) {
          const reglas = body?.reglas ?? body;
          return normReglas(reglas);
        }
        if (res.status === 404) {
          // esto puede ser endpoint inexistente o "Clínica no encontrada"
          // seguimos probando el siguiente candidate
          lastErr = new Error(body?.error || `404 en ${path}`);
          continue;
        }
        // 400/401/403/500:
        throw new Error(body?.error || `Error ${res.status} en ${path}`);
      } catch (e) {
        lastErr = e;
      }
    }
    throw new Error(
      lastErr?.message
        ? `No se pudieron obtener las reglas (${lastErr.message}).`
        : 'No se pudieron obtener las reglas (todas las rutas devolvieron 404).'
    );
  });
}

export async function saveReglas(reglas: ReglasClinicas, host?: string) {
  const candidates = buildPaths(PATHS.PUT, host);
  const headers = { 'Content-Type': 'application/json', ...commonHeaders(host) };
  const body = JSON.stringify({ host: getHost(host), reglas });

  return withTimeout(async (signal) => {
    let lastErr: any = null;
    for (const path of candidates) {
      const url = `${API}${path}`;
      try {
        const { res, body: payload } = await tryJson(url, { method: 'PUT', headers, body }, signal);
        if (res.ok) return payload;
        if (res.status === 404) { lastErr = new Error(payload?.error || `404 en ${path}`); continue; }
        throw new Error(payload?.error || `Error ${res.status} en ${path}`);
      } catch (e) {
        lastErr = e;
      }
    }
    throw new Error(lastErr?.message || 'No se pudieron guardar las reglas.');
  });
}

export async function previewReglas(reglas: ReglasClinicas, sample: Record<string, any>, host?: string) {
  const candidates = buildPaths(PATHS.PREVIEW, host);
  const headers = { 'Content-Type': 'application/json', ...commonHeaders(host) };
  const body = JSON.stringify({ reglas, sample });

  return withTimeout(async (signal) => {
    let lastErr: any = null;
    for (const path of candidates) {
      const url = `${API}${path}`;
      try {
        const { res, body: payload } = await tryJson(url, { method: 'POST', headers, body }, signal);
        if (res.ok) return payload;
        if (res.status === 404) { lastErr = new Error(payload?.error || `404 en ${path}`); continue; }
        throw new Error(payload?.error || `Error ${res.status} en ${path}`);
      } catch (e) {
        lastErr = e;
      }
    }
    throw new Error(lastErr?.message || 'No se pudo previsualizar.');
  });
}