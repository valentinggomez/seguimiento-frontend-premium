// src/app/panel/dashboard/page.tsx
'use client'

import { useEffect, useState } from 'react'
import GraficoDolorPorCirugia from './GraficoDolorPorCirugia'

export default function DashboardPage() {
  const [data, setData] = useState([])

  useEffect(() => {
    const hoy = new Date()
    const hasta = hoy.toISOString().split('T')[0]
    const desdeObj = new Date()
    desdeObj.setDate(desdeObj.getDate() - 30)
    const desde = desdeObj.toISOString().split('T')[0]

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
