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
  const h: Record<string, string> = {
    'x-clinica-host': getHost(host),
  };
  const cid = getClinicaId();
  if (cid) h['x-clinica-id'] = cid;

  const tk = getToken();
  if (tk) h['Authorization'] = `Bearer ${tk}`;

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

/* -------------------- building de candidates -------------------- */
function buildCandidates(base: 'GET'|'PUT'|'PREVIEW', host?: string) {
  const h = getHost(host);
  const cid = getClinicaId();

  // rutas específicas primero, genéricas después
  const core = {
    reglas: [
      cid && `/api/clinicas/${cid}/reglas`,
      cid && `/api/clinicas/reglas?clinica_id=${encodeURIComponent(cid)}`,
      h   && `/api/clinicas/${h}/reglas`,
      `/api/clinicas/reglas`,
      `/api/reglas`,
      cid && `/api/reglas/${cid}`,
      h   && `/api/reglas/${h}`,
    ].filter(Boolean) as string[],

    preview: [
      cid && `/api/clinicas/${cid}/reglas/preview`,
      cid && `/api/clinicas/reglas/preview?clinica_id=${encodeURIComponent(cid)}`,
      h   && `/api/clinicas/${h}/reglas/preview`,
      `/api/clinicas/reglas/preview`,
      `/api/reglas/preview`,
      cid && `/api/reglas/${cid}/preview`,
      h   && `/api/reglas/${h}/preview`,
    ].filter(Boolean) as string[],
  };

  if (base === 'GET' || base === 'PUT') return core.reglas;
  return core.preview;
}

/* -------------------- API -------------------- */
export async function fetchReglas(host?: string): Promise<ReglasClinicas> {
  const headers = { ...commonHeaders(host) };
  const candidates = buildCandidates('GET', host);

  // ayudas de diagnóstico
  if (!getToken()) {
    console.warn('[reglasApi] Falta token en localStorage (token/jwt/authToken).');
  }
  if (!getClinicaId()) {
    console.warn('[reglasApi] Falta clinica_id en localStorage (clinica_id/clinicaId).');
  }

  return withTimeout(async (signal) => {
    let lastErr: any = null;
    let saw404 = false;

    for (const path of candidates) {
      const url = `${API}${path}`;
      try {
        const { res, body } = await tryJson(url, { headers, cache: 'no-store' }, signal);
        if (res.ok) {
          const reglas = body?.reglas ?? body;
          return normReglas(reglas);
        }
        if (res.status === 404) { saw404 = true; continue; }
        // 401/403/500
        throw new Error(body?.error || `Error ${res.status} en ${path}`);
      } catch (e) {
        lastErr = e;
      }
    }

    if (saw404) {
      throw new Error('No se pudieron obtener las reglas (todas las rutas probaron y devolvieron 404). Verificá qué endpoint expone el backend (ej: /api/clinicas/:clinicaId/reglas).');
    }
    throw new Error(lastErr?.message || 'No se pudieron obtener las reglas.');
  });
}

export async function saveReglas(reglas: ReglasClinicas, host?: string) {
  const headers = { 'Content-Type': 'application/json', ...commonHeaders(host) };
  const body = JSON.stringify({ host: getHost(host), reglas });
  const candidates = buildCandidates('PUT', host);

  return withTimeout(async (signal) => {
    let lastErr: any = null;
    let saw404 = false;

    for (const path of candidates) {
      const url = `${API}${path}`;
      try {
        const { res, body: payload } = await tryJson(url, { method: 'PUT', headers, body }, signal);
        if (res.ok) return payload;
        if (res.status === 404) { saw404 = true; continue; }
        throw new Error(payload?.error || `Error ${res.status} en ${path}`);
      } catch (e) {
        lastErr = e;
      }
    }

    if (saw404) {
      throw new Error('No se pudieron guardar las reglas: todas las rutas devolvieron 404. Confirmá la ruta /api/clinicas/:clinicaId/reglas (PUT).');
    }
    throw new Error(lastErr?.message || 'No se pudieron guardar las reglas.');
  });
}

export async function previewReglas(reglas: ReglasClinicas, sample: Record<string, any>, host?: string) {
  const headers = { 'Content-Type': 'application/json', ...commonHeaders(host) };
  const body = JSON.stringify({ reglas, sample });
  const candidates = buildCandidates('PREVIEW', host);

  return withTimeout(async (signal) => {
    let lastErr: any = null;
    let saw404 = false;

    for (const path of candidates) {
      const url = `${API}${path}`;
      try {
        const { res, body: payload } = await tryJson(url, { method: 'POST', headers, body }, signal);
        if (res.ok) return payload;
        if (res.status === 404) { saw404 = true; continue; }
        throw new Error(payload?.error || `Error ${res.status} en ${path}`);
      } catch (e) {
        lastErr = e;
      }
    }

    if (saw404) {
      throw new Error('No se pudo previsualizar: todas las rutas devolvieron 404. Confirmá la ruta /api/clinicas/:clinicaId/reglas/preview (POST).');
    }
    throw new Error(lastErr?.message || 'No se pudo previsualizar.');
  });
}