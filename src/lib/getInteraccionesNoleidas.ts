import { fetchConToken } from './fetchConToken';

export const getInteraccionesNoleidas = async () => {
  const res = await fetchConToken('/api/interacciones/noleidos');

  if (!res.ok) {
    if (res.status === 401) {
      console.warn('Token inválido. Redirigiendo al login.');
      window.location.href = '/login';
    }
    throw new Error('Error al obtener interacciones no leídas');
  }

  return res.json();
};