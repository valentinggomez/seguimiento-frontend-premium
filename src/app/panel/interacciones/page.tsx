'use client'
import { useEffect, useState, useRef } from 'react'
import { TarjetaInteraccionSupreme } from '@/components/TarjetaInteraccionSupreme'
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs'
import { toast } from 'sonner'
import { getAuthHeaders } from '@/lib/getAuthHeaders'
import { useSonidoNotificacion } from '@/hooks/useSonidoNotificacion'
import { useTranslation } from '@/i18n/useTranslation'

type Interaccion = {
  paciente_id: string
  nombre: string
  telefono: string
  mensaje: string
  nivel_alerta: 'rojo' | 'amarillo' | 'verde'
  alerta_manual?: 'rojo' | 'amarillo' | 'verde' | null
  respuesta_enviada: string
  fecha: string
  score_ia?: number
  nivel_alerta_ia?: string
  tags_detectados?: string[]
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
  const [pacientes, setPacientes] = useState<any[]>([])
  const [query, setQuery] = useState('')
  const [resultados, setResultados] = useState<Interaccion[]>([])
  const [buscando, setBuscando] = useState(false)
  const [, setForceUpdate] = useState(0)
  const prevMensajesRef = useRef<string[]>([])
  const { reproducir, desbloquear } = useSonidoNotificacion()
  const { t } = useTranslation()
  
  // 🔊 Desbloquear audio en primer click (Chrome lo requiere)
  useEffect(() => {
    document.addEventListener('click', desbloquear)
    return () => {
      document.removeEventListener('click', desbloquear)
    }
  }, [desbloquear])

  const fetchInteracciones = async () => {
    try {
      const headers = getAuthHeaders()

      const [resActivas, resArchivadas, resPacientes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/interacciones`, { headers }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/interacciones/archivados`, { headers }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/pacientes-activos`, { headers }),
      ])

      let dataActivas = []

      if (resActivas.ok) {
        const json = await resActivas.json()

        if (Array.isArray(json)) {
          dataActivas = json
        } else {
          console.error('❌ Error: respuesta inesperada en interacciones:', json)
          toast.error('Error al obtener interacciones activas')
        }
      } else {
        console.warn('❗️ Falló resActivas:', resActivas.status)
      }


      const dataArchivadas = await resArchivadas.json()
      const dataPacientes = await resPacientes.json()

      setActivas(dataActivas)
      // 🧠 Guardar los mensajes actuales por ID o texto
      prevMensajesRef.current = dataActivas.map((m) => `${m.paciente_id}-${m.mensaje}`)
      setArchivadas(dataArchivadas)
      setPacientes(dataPacientes.pacientes)

      setForceUpdate((prev) => prev + 1) // 🧠 Forzar re-render visual
    } catch (err) {
      console.error('❌ Error al cargar interacciones:', err)
    }
  }

  useEffect(() => {
    fetchInteracciones()

    const eventSource = new EventSource(`${process.env.NEXT_PUBLIC_API_URL}/api/sse`)

    eventSource.onmessage = (e) => {
      const data = JSON.parse(e.data)

      if (data.tipo === 'nuevo_mensaje') {
        console.log('📥 Nuevo mensaje detectado por SSE:', data)

        const idMensajeNuevo = `${data.paciente_id}-${data.mensaje}`

        if (!prevMensajesRef.current.includes(idMensajeNuevo)) {
          // 🔊 Sonido sutil
          reproducir()

          // 🔁 Refrescar panel
          fetchInteracciones()
        }
      }
    }

    return () => {
      eventSource.close()
    }
  }, [])

  const buscarInteracciones = async (texto: string) => {
    setBuscando(true)
    setQuery(texto)

    if (!texto) {
      setResultados([])
      setBuscando(false)
      return
    }

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/interacciones/buscar?query=${encodeURIComponent(texto)}`, {
        headers: getAuthHeaders(),
      })

      const data = await res.json()
      setResultados(data)
    } catch (err) {
      console.error('❌ Error al buscar interacciones:', err)
    } finally {
      setBuscando(false)
    }
  }

  const telefonosConMensajes = new Set(activas.map(i => i.telefono))
  const pacientesSinMensajes = pacientes.filter(p => !telefonosConMensajes.has(p.telefono))
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">
        {t('interacciones.titulo')}
      </h1>

      <div className="mb-6 text-center">
        <button
          onClick={async () => {
            const toastId = toast.loading(t('interacciones.exportando'))

            try {
              const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/interacciones/exportar`, {
                method: 'POST',
                headers: getAuthHeaders(),
              })

              const data = await res.json()
              toast.dismiss(toastId)

              if (data?.status === 'ok') {
                toast.success(t('interacciones.exportado_ok'))
              } else if (data?.status === 'empty') {
                toast(t('interacciones.exportado_vacio'), { icon: '🟡' })
              } else {
                toast.error(t('interacciones.exportado_error'))
              }
            } catch (err) {
              toast.dismiss(toastId)
              toast.error(t('interacciones.error_conexion'))
              console.error('Error:', err)
            }
          }}
          className="px-4 py-2 rounded-xl bg-green-600 text-white font-medium hover:bg-green-700 shadow-sm transition-all"
        >
          {t('interacciones.exportar')}
        </button>
      </div>

      {/* 🔍 Buscador Supreme */}
      <div className="max-w-xl mx-auto mb-6">
        <input
          type="text"
          placeholder={t('interacciones.buscador_placeholder')}
          value={query}
          onChange={(e) => buscarInteracciones(e.target.value)}
          className="w-full border border-gray-300 rounded-xl px-4 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
      </div>
      {resultados.length > 0 && (
        <div className="mb-6 space-y-4">
          <h2 className="text-lg font-semibold">
            {t('interacciones.resultados')}
          </h2>
          {Object.entries(agruparPorTelefono(resultados)).map(([telefono, mensajes], index) => {
            mensajes.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
            const alertaGlobal = getAlertaGlobal(mensajes)
            const { nombre, fecha } = mensajes[mensajes.length - 1]
            return (
              <TarjetaInteraccionSupreme
                key={`res-${index}`}
                nombre={nombre}
                telefono={telefono}
                alerta={alertaGlobal}
                fecha={new Date(fecha).toLocaleString()}
                mensajes={mensajes}
                paciente_id={mensajes[0].paciente_id}
              />
            )
          })}
        </div>
      )}
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
                  paciente_id={mensajes[0].paciente_id}
                  onArchivar={async () => {
                    await fetch(
                      `${process.env.NEXT_PUBLIC_API_URL}/api/interacciones/telefono/${telefono}`,
                      {
                        method: 'PATCH',
                        headers: getAuthHeaders(),
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
                      headers: getAuthHeaders(),
                      body: JSON.stringify({ alerta_manual: color }),
                    })

                    const data = await res.json().catch(() => null)
                    console.log('📬 Respuesta del backend:', res.status, data)

                    if (res.ok) {
                      toast.success(`✅ Alerta escalada a ${color.toUpperCase()}`)
                      setActivas((prev) =>
                        prev.map((i) =>
                          i.paciente_id === mensajes[0].paciente_id
                            ? { ...i, alerta_manual: color }
                            : i
                        )
                      )
                    } else {
                      alert('❌ Error al escalar alerta')
                    }
                  }}
                  onReenviarFormulario={async () => {
                    const toastId = toast.loading('⏳ Reenviando formulario...')

                    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/reenviar-formulario`, {
                      method: 'POST',
                      headers: getAuthHeaders(),
                      body: JSON.stringify({
                        paciente_id: mensajes[0].paciente_id,
                        telefono: telefono,
                      }),
                    })

                    toast.dismiss(toastId)

                    if (res.ok) {
                      toast.success('📤 Formulario reenviado por WhatsApp')
                      await fetchInteracciones()
                    } else {
                      toast.error('❌ Error al reenviar el formulario')
                    }
                  }}
                />
              )
            })
          )}
          {pacientesSinMensajes.map((paciente, index) => (
            <TarjetaInteraccionSupreme
              key={`sinmsg-${index}`}
              nombre={paciente.nombre}
              telefono={paciente.telefono}
              alerta="verde"
              fecha={new Date(paciente.fecha).toLocaleString()}
              mensajes={[]}
              paciente_id={paciente.id} 
              onReenviarFormulario={async () => {
                const toastId = toast.loading('⏳ Reenviando formulario...')
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/reenviar-formulario`, {
                  method: 'POST',
                  headers: getAuthHeaders(),
                  body: JSON.stringify({
                    paciente_id: paciente.id,
                    telefono: paciente.telefono,
                  }),
                })

                toast.dismiss(toastId)

                if (res.ok) {
                  toast.success('📤 Formulario reenviado por WhatsApp')
                  await fetchInteracciones()
                } else {
                  toast.error('❌ Error al reenviar el formulario')
                }
              }}
            />
          ))}
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
                  paciente_id={mensajes[0].paciente_id}
                />
              )
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
