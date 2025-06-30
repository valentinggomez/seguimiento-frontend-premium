// src/app/panel/dashboard/page.tsx
'use client'

import { useEffect, useState } from 'react'
import GraficoDolorPorCirugia from './GraficoDolorPorCirugia'

export default function DashboardPage() {
  const [data, setData] = useState([])

  useEffect(() => {
    // Rango fijo de ejemplo por ahora
    const desde = '2025-06-01'
    const hasta = '2025-06-30'

    fetch(`/api/dashboard/promedios?desde=${desde}&hasta=${hasta}`)
      .then(res => res.json())
      .then(setData)
      .catch(err => console.error('Error al cargar promedios:', err))
  }, [])

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-semibold mb-4">📊 Estadisticas Clínicas</h1>
      <GraficoDolorPorCirugia data={data} />
    </div>
  )
}
