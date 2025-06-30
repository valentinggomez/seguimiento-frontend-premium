// src/app/panel/dashboard/GraficoDolorPorCirugia.tsx
'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { useClinica } from '@/lib/ClinicaProvider'

export default function GraficoDolorPorCirugia({ data }: { data: any[] }) {
  const { clinica } = useClinica()

  const usa6h = clinica?.columnas_exportables?.includes('🤕 Nivel de dolor a las 6h')
  const usa24h = clinica?.columnas_exportables?.includes('🔥 Nivel de dolor a las 24h')

  if (!usa6h && !usa24h) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-xl p-4 shadow">
        ⚠️ Esta clínica no tiene configurado el seguimiento de dolor a las 6h o 24h.
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl p-4 shadow">
      <h3 className="text-xl font-semibold mb-4">🩺 Dolor promedio por tipo de cirugía</h3>
      <ResponsiveContainer width="100%" height={350}>
        <BarChart layout="vertical" data={data}>
          <XAxis type="number" domain={[0, 10]} />
          <YAxis type="category" dataKey="tipo_cirugia" width={150} />
          <Tooltip />
          <Legend />
          {usa6h && <Bar dataKey="promedio_dolor_6h" fill="#8884d8" name="Dolor 6h" />}
          {usa24h && <Bar dataKey="promedio_dolor_24h" fill="#82ca9d" name="Dolor 24h" />}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
