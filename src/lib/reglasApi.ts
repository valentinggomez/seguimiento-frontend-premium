const API = process.env.NEXT_PUBLIC_API_URL;

function hostHeader() {
  return { 'x-clinica-host': typeof window !== 'undefined' ? window.location.hostname : '' };
}

export type NivelAlerta = 'verde' | 'amarillo' | 'rojo';
export type Operador = '>'|'>='|'<'|'<='|'=='|'!='|'in'|'contains'|'between';

export interface ReglaClinica {
  id?: string;
  campo: string;
  operador: Operador;
  valor: any;
  nivel: NivelAlerta;
  color?: string;
  sugerencia?: string;
}

export interface ReglasClinicas {
  condiciones: ReglaClinica[];
}

export async function fetchReglas(): Promise<ReglasClinicas> {
  const res = await fetch(`${API}/api/clinicas/reglas`, { headers: hostHeader(), cache: 'no-store' });
  if (!res.ok) throw new Error('No se pudieron obtener las reglas');
  const data = await res.json();
  return (data?.reglas ?? { condiciones: [] }) as ReglasClinicas;
}

export async function saveReglas(reglas: ReglasClinicas) {
  const body = JSON.stringify({ host: typeof window !== 'undefined' ? window.location.hostname : '', reglas });
  const res = await fetch(`${API}/api/clinicas/reglas`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...hostHeader() },
    body
  });
  if (!res.ok) throw new Error((await res.json().catch(()=>({})))?.error || 'No se pudieron guardar las reglas');
  return await res.json();
}

export async function previewReglas(reglas: ReglasClinicas, sample: Record<string, any>) {
  const res = await fetch(`${API}/api/clinicas/reglas/preview`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...hostHeader() },
    body: JSON.stringify({ reglas, sample })
  });
  if (!res.ok) throw new Error('No se pudo previsualizar');
  return await res.json();
}