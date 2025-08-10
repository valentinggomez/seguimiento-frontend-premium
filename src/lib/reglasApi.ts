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

async function withTimeout<T>(p: Promise<T>, ms = 12000): Promise<T> {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), ms);
  try {
    // @ts-ignore
    return await p.then(r => r, { signal: ac.signal });
  } finally {
    clearTimeout(t);
  }
}

export async function fetchReglas(host?: string): Promise<ReglasClinicas> {
  const res = await withTimeout(
    fetch(`${API}/api/clinicas/reglas`, { headers: hostHeader(host), cache: 'no-store' })
  );
  if (!res.ok) throw new Error((await res.json().catch(()=>({})))?.error || 'No se pudieron obtener las reglas');
  const data = await res.json();
  return normReglas(data?.reglas);
}

export async function saveReglas(reglas: ReglasClinicas, host?: string) {
  const body = JSON.stringify({ host: host ?? (typeof window !== 'undefined' ? window.location.hostname : ''), reglas });
  const res = await withTimeout(
    fetch(`${API}/api/clinicas/reglas`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...hostHeader(host) },
      body
    })
  );
  if (!res.ok) throw new Error((await res.json().catch(()=>({})))?.error || 'No se pudieron guardar las reglas');
  return await res.json();
}

export async function previewReglas(reglas: ReglasClinicas, sample: Record<string, any>, host?: string) {
  const res = await withTimeout(
    fetch(`${API}/api/clinicas/reglas/preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...hostHeader(host) },
      body: JSON.stringify({ reglas, sample })
    })
  );
  if (!res.ok) throw new Error((await res.json().catch(()=>({})))?.error || 'No se pudo previsualizar');
  return await res.json();
}