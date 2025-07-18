import { fetchConToken } from './fetchConToken';

export const getRespuestasAlertas = async () => {
  const res = await fetchConToken('/api/respuestas/alertas');

  if (!res.ok) {
    if (res.status === 401) {
      console.warn('Token expirado. Redirigiendo al login.');
      window.location.href = '/login';
    }
    throw new Error('Error al obtener alertas clínicas');
  }

  return res.json();
};