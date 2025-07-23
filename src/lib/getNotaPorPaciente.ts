import { fetchConToken } from './fetchConToken';

export const getNotaPorPaciente = async (pacienteId: string) => {
  const res = await fetchConToken(`/api/notas/${pacienteId}`);
  if (!res.ok) {
    if (res.status === 401) window.location.href = '/login';
    throw new Error('Error al obtener nota');
  }
  return res.json();
};