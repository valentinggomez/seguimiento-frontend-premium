'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TarjetaInteraccionSupreme } from '@/components/TarjetaInteraccionSupreme'

type Interaccion = {
  paciente_id: string
  nombre: string
  telefono: string
  mensaje: string
  nivel_alerta: 'rojo' | 'amarillo' | 'verde'
  respuesta_enviada: string
  fecha: string
}

export default function InteraccionesPage() {
  const [interacciones, setInteracciones] = useState<Interaccion[]>([])

  useEffect(() => {
    const fetchInteracciones = async () => {
      try {
        const res = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/api/interacciones`,
          {
              headers: {
              'x-clinica-host': window.location.hostname,
            },
          }
        )
        const data = await res.json()
        setInteracciones(data)
      } catch (err) {
        console.error('Error al cargar interacciones:', err)
      }
    }

    fetchInteracciones()
  }, [])

  const getColor = (nivel: string) => {
    if (nivel === 'rojo') return 'bg-red-600'
    if (nivel === 'amarillo') return 'bg-yellow-500'
    return 'bg-green-600'
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">📱 Interacciones por WhatsApp</h1>

      {interacciones.length === 0 ? (
        <p className="text-muted-foreground">No hay mensajes registrados.</p>
      ) : (
        <div className="space-y-4">
          {interacciones.map((item, index) => (
            <TarjetaInteraccionSupreme
              key={index}
              nombre={item.nombre}
              telefono={item.telefono}
              mensaje={item.mensaje}
              respuesta={item.respuesta_enviada}
              alerta={item.nivel_alerta}
              fecha={new Date(item.fecha).toLocaleString()}
            />
          ))}
        </div>
      )}
    </div>
  )
}
