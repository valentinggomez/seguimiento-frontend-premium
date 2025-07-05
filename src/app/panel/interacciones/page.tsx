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
  alerta_manual?: 'rojo' | 'amarillo' | 'verde' | null
  respuesta_enviada: string
  fecha: string
}

function agruparPorTelefono(data: Interaccion[]) {
  const agrupadas: Record<string, Interaccion[]> = {}

  data.forEach((item) => {
    if (!agrupadas[item.telefono]) {
      agrupadas[item.telefono] = []
    }
    agrupadas[item.telefono].push(item)
  })

  return agrupadas
}

function getAlertaGlobal(mensajes: Interaccion[]): 'rojo' | 'amarillo' | 'verde' {
  const manual = mensajes.find((m) => m.alerta_manual)
  if (manual) return manual.alerta_manual as 'rojo' | 'amarillo' | 'verde'

  const niveles = mensajes.map((m) => m.nivel_alerta)
  if (niveles.includes('rojo')) return 'rojo'
  if (niveles.includes('amarillo')) return 'amarillo'
  return 'verde'
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
        <TabsList className="flex bg-white p-1 rounded-xl shadow-sm border w-fit mx-auto mb-6">
          <TabsTrigger
            value="activas"
            className="data-[state=active]:bg-blue-100 data-[state=active]:text-blue-900
                      data-[state=active]:font-semibold text-sm text-gray-600 px-5 py-1.5 rounded-lg transition-all"
          >
            🟢 Activas
          </TabsTrigger>
          <TabsTrigger
            value="archivadas"
            className="data-[state=active]:bg-blue-100 data-[state=active]:text-blue-900
                      data-[state=active]:font-semibold text-sm text-gray-600 px-5 py-1.5 rounded-lg transition-all"
          >
            🗃 Archivadas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="activas" className="space-y-4">
          {activas.length === 0 ? (
            <p className="text-muted-foreground">No hay mensajes activos.</p>
          ) : (
            Object.entries(agruparPorTelefono(activas)).map(([telefono, mensajes], index) => {
              const alertaGlobal = getAlertaGlobal(mensajes)
              const { nombre, fecha } = mensajes[mensajes.length - 1]

              return (
                <TarjetaInteraccionSupreme
                  key={index}
                  nombre={nombre}
                  telefono={telefono}
                  alerta={alertaGlobal}
                  fecha={new Date(fecha).toLocaleString()}
                  mensajes={mensajes}
                  onArchivar={async () => {
                    await fetch(
                      `${process.env.NEXT_PUBLIC_API_URL}/api/interacciones/telefono/${telefono}`,
                      {
                        method: 'PATCH',
                        headers: {
                          'Content-Type': 'application/json',
                          'x-clinica-host': window.location.hostname,
                        },
                        body: JSON.stringify({ archivado: true }),
                      }
                    )
                    setActivas((prev) =>
                      prev.filter((i) => i.telefono !== telefono)
                    )
                  }}
                  onEscalarAlerta={async (color: 'rojo' | 'amarillo' | 'verde') => {
                    console.log(`🟠 Intentando escalar alerta a: ${color}`)

                    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/interacciones/alerta/${mensajes[0].paciente_id}`, {
                      method: 'PATCH',
                      headers: {
                        'Content-Type': 'application/json',
                        'x-clinica-host': window.location.hostname,
                      },
                      body: JSON.stringify({ alerta_manual: color }),
                    })

                    const data = await res.json().catch(() => null)
                    console.log('📬 Respuesta del backend:', res.status, data)

                    if (res.ok) {
                      console.log('✅ Escalado correctamente')
                      window.location.reload()
                    } else {
                      alert('❌ Error al escalar alerta')
                    }
                  }}
                />
              )
            })
          )}
        </TabsContent>

        <TabsContent value="archivadas" className="space-y-4">
          {archivadas.length === 0 ? (
            <p className="text-muted-foreground">No hay interacciones archivadas.</p>
          ) : (
            Object.entries(agruparPorTelefono(archivadas)).map(([telefono, mensajes], index) => {
              const alertaGlobal = getAlertaGlobal(mensajes)
              const { nombre, fecha } = mensajes[mensajes.length - 1]

              return (
                <TarjetaInteraccionSupreme
                  key={index}
                  nombre={nombre}
                  telefono={telefono}
                  alerta={alertaGlobal}
                  fecha={new Date(fecha).toLocaleString()}
                  mensajes={mensajes}
                />
              )
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
