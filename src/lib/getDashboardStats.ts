// getDashboardStats.ts
import { fetchConToken } from './fetchConToken';

export const getDashboardStats = async (clinicaId?: string) => {
  const ts = Date.now();
  const headers: Record<string, string> = { 'x-clinica-host': window.location.hostname }
  if (clinicaId) headers['x-clinica-id'] = clinicaId

  let res = await fetchConToken(`/api/dashboard/stats?ts=${ts}`, {
    method: 'GET',
    headers,
    cache: 'no-store',
  })

  if (res.status === 404 || res.status === 410) {
    res = await fetchConToken(`/api/dashboard?ts=${Date.now()}`, { method:'GET', headers, cache:'no-store' })
  }

  if (!res.ok) {
    if (res.status === 401) window.location.href = '/login'
    throw new Error('Error al obtener estadísticas del dashboard')
  }
  return res.json()
}