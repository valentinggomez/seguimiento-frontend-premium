'use client'

import { useEffect, useState } from 'react'
import { TarjetaInteraccionSupreme } from '@/components/TarjetaInteraccionSupreme'
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs'

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
  const [activas, setActivas] = useState<Interaccion[]>([])
  const [archivadas, setArchivadas] = useState<Interaccion[]>([])

  useEffect(() => {
    const fetchAmbas = async () => {
      try {
        const headers = { 'x-clinica-host': window.location.hostname }

        const [resActivas, resArchivadas] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/interacciones`, { headers }),
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/interacciones/archivados`, { headers }),
        ])

        const dataActivas = await resActivas.json()
        const dataArchivadas = await resArchivadas.json()

        setActivas(dataActivas)
        setArchivadas(dataArchivadas)
      } catch (err) {
        console.error('Error al cargar interacciones:', err)
      }
    }

    fetchAmbas()
  }, [])

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">📱 Interacciones por WhatsApp</h1>

      <Tabs defaultValue="activas" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="activas">Activas</TabsTrigger>
          <TabsTrigger value="archivadas">Archivadas</TabsTrigger>
        </TabsList>

        <TabsContent value="activas" className="space-y-4">
          {activas.length === 0 ? (
            <p className="text-muted-foreground">No hay mensajes activos.</p>
          ) : (
            activas.map((item, index) => (
              <TarjetaInteraccionSupreme
                key={index}
                nombre={item.nombre}
                telefono={item.telefono}
                mensaje={item.mensaje}
                respuesta={item.respuesta_enviada}
                alerta={item.nivel_alerta}
                fecha={new Date(item.fecha).toLocaleString()}
                onArchivar={async () => {
                  await fetch(
                    `${process.env.NEXT_PUBLIC_API_URL}/api/interacciones/${item.paciente_id}`,
                    {
                      method: 'PATCH',
                      headers: {
                        'Content-Type': 'application/json',
                        'x-clinica-host': window.location.hostname,
                      },
                      body: JSON.stringify({ archivado: true }),
                    }
                  )

                  setActivas(prev =>
                    prev.filter(i => i.paciente_id !== item.paciente_id)
                  )
                }}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="archivadas" className="space-y-4">
          {archivadas.length === 0 ? (
            <p className="text-muted-foreground">No hay interacciones archivadas.</p>
          ) : (
            archivadas.map((item, index) => (
              <TarjetaInteraccionSupreme
                key={index}
                nombre={item.nombre}
                telefono={item.telefono}
                mensaje={item.mensaje}
                respuesta={item.respuesta_enviada}
                alerta={item.nivel_alerta}
                fecha={new Date(item.fecha).toLocaleString()}
              />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
