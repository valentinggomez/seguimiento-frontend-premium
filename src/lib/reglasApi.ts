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
  valor: any;           // para 'between' => "min,max", para 'in' => "a,b,c"
  nivel: NivelAlerta;
  color?: string;
  sugerencia?: string;
}
export interface ReglasClinicas { condiciones: ReglaClinica[] }

function normReglas(x: any): ReglasClinicas {
  if (x && Array.isArray(x.condiciones)) return x as ReglasClinicas;
  return { condiciones: [] };
}

/**
 * withTimeout correcto: crea un AbortController y pasa el signal al fetch.
 * Se usa con un "factory" que recibe ese signal.
 */
async function withTimeout<T>(factory: (signal: AbortSignal) => Promise<T>, ms = 12000): Promise<T> {
  const ac = new AbortController();
  const id = setTimeout(() => ac.abort(), ms);
  try {
    return await factory(ac.signal);
  } finally {
    clearTimeout(id);
  }
}

export async function fetchReglas(host?: string): Promise<ReglasClinicas> {
  const res = await withTimeout(
    (signal) => fetch(`${API}/api/clinicas/reglas`, { headers: hostHeader(host), cache: 'no-store', signal })
  );

  // ⚠️ Parsear el body UNA sola vez
  const payload = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(payload?.error || 'No se pudieron obtener las reglas');
  }
  return normReglas(payload?.reglas);
}

export async function saveReglas(reglas: ReglasClinicas, host?: string) {
  const body = JSON.stringify({ host: host ?? (typeof window !== 'undefined' ? window.location.hostname : ''), reglas });
  const res = await withTimeout(
    (signal) => fetch(`${API}/api/clinicas/reglas`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...hostHeader(host) },
      body,
      signal,
    })
  );

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(payload?.error || 'No se pudieron guardar las reglas');
  return payload;
}

export async function previewReglas(reglas: ReglasClinicas, sample: Record<string, any>, host?: string) {
  const res = await withTimeout(
    (signal) => fetch(`${API}/api/clinicas/reglas/preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...hostHeader(host) },
      body: JSON.stringify({ reglas, sample }),
      signal,
    })
  );

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(payload?.error || 'No se pudo previsualizar');
  return payload;
}