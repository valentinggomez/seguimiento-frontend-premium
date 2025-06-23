export async function getDashboardStats(clinica_id: string) {
  try {
    const res = await fetch('http://localhost:3001/api/dashboard', {
      headers: {
        'x-clinica-host': window.location.hostname
      }
    })

    if (!res.ok) {
      console.error('❌ Error en fetch del dashboard:', res.status)
      return null
    }

    const data = await res.json()
    return data
  } catch (error) {
    console.error('❌ Error en getDashboardStats:', error)
    return null
  }
}
