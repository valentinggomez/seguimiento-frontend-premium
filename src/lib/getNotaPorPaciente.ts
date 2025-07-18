import { fetchConToken } from './fetchConToken';

const backendUrl = process.env.NEXT_PUBLIC_API_URL!;

export const getNotaPorPaciente = async (pacienteId: string) => {
  const res = await fetchConToken(`${backendUrl}/api/notas/${pacienteId}`);
  if (!res.ok) {
    if (res.status === 401) window.location.href = '/login';
    throw new Error('Error al obtener nota');
  }
  return res.json();
};