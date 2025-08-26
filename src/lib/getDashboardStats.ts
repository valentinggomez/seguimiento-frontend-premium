// getDashboardStats.ts
import { fetchConToken } from './fetchConToken';

export const getDashboardStats = async () => {
  const ts = Date.now();
  const commonOpts = {
    method: 'GET',
    // si fetchConToken mergea headers internos, esto se suma; si no, igual no rompe
    headers: { 'x-clinica-host': window.location.hostname },
    // evita que el navegador use una respuesta vieja (el 410 que ves)
    cache: 'no-store' as const,
  };

  // 1) ruta estable sin caché
  let res = await fetchConToken(`/api/dashboard/stats?ts=${ts}`, commonOpts);

  // 2) fallback por si tu front viejo aún pide /api/dashboard y hay un proxy cacheado
  if (res.status === 404 || res.status === 410) {
    res = await fetchConToken(`/api/dashboard?ts=${Date.now()}`, commonOpts);
  }

  if (!res.ok) {
    if (res.status === 401) {
      console.warn('Token inválido o expirado. Redirigiendo al login.');
      window.location.href = '/login';
    }
    throw new Error('Error al obtener estadísticas del dashboard');
  }

  return res.json();
};