import { fetchConToken } from './fetchConToken';

export const getDashboardStats = async () => {
  const ts = Date.now();

  const res = await fetchConToken(`/api/dashboard/stats?ts=${ts}`, {
    method: 'GET',
    headers: { 'x-clinica-host': window.location.hostname },
    cache: 'no-store' as const,
  });

  if (!res.ok) {
    if (res.status === 404 || res.status === 410) {
      return fetchConToken(`/api/dashboard?ts=${Date.now()}`, {
        method: 'GET',
        headers: { 'x-clinica-host': window.location.hostname },
        cache: 'no-store' as const,
      }).then(r => r.json());
    }
    if (res.status === 401) {
      console.warn('Token inválido o expirado. Redirigiendo al login.');
      window.location.href = '/login';
    }
    throw new Error('Error al obtener estadísticas del dashboard');
  }

  return res.json();
};