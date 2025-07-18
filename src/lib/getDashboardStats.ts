import { fetchConToken } from './fetchConToken';

export const getDashboardStats = async () => {
  const res = await fetchConToken('/api/dashboard');

  if (!res.ok) {
    if (res.status === 401) {
      console.warn('Token inválido o expirado. Redirigiendo al login.');
      window.location.href = '/login';
    }
    throw new Error('Error al obtener estadísticas del dashboard');
  }

  return res.json();
};