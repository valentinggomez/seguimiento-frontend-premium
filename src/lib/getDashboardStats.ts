// src/lib/getDashboardStats.ts
import { http } from '@/lib/http'

export async function getDashboardStats(clinicaId?: string) {
  const qp = new URLSearchParams({ ts: String(Date.now()) })
  if (clinicaId) qp.set('clinica_id', clinicaId)

  try {
    // Intento principal
    return await http.json(`/api/dashboard/stats?${qp.toString()}`)
  } catch (err: any) {
    // Fallback si esa ruta no existe (algunos backends antiguos)
    if (err?.status === 404 || err?.status === 410) {
      return await http.json(`/api/dashboard?${qp.toString()}`)
    }
    // Re-lanzamos para que el caller vea el error real
    throw err
  }
}