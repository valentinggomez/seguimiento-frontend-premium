// src/lib/getDashboardStats.ts
import { fetchConToken } from './fetchConToken';

export const getDashboardStats = async (clinicaId?: string) => {
  const ts = Date.now();
  // Enviamos el host para que withClinica matchee por dominio
  const headers = { 'x-clinica-host': window.location.hostname };
  const qp = new URLSearchParams({ ts: String(ts) });
  if (clinicaId) qp.set('clinica_id', clinicaId); // opcional, por si querés forzar

  // Intento principal (/stats)
  let res = await fetchConToken(`/api/dashboard/stats?${qp.toString()}`, {
    method: 'GET',
    cache: 'no-store',
    headers,
  });

  // Fallback a raíz (/)
  if (res.status === 404 || res.status === 410) {
    res = await fetchConToken(`/api/dashboard?${qp.toString()}`, {
      method: 'GET',
      cache: 'no-store',
      headers,
    });
  }

  if (!res.ok) {
    if (res.status === 401) {
      console.warn('Token inválido o expirado. Redirigiendo al login.');
      window.location.href = '/login';
      return;
    }
    throw new Error('Error al obtener estadísticas del dashboard');
  }

  return res.json();
};