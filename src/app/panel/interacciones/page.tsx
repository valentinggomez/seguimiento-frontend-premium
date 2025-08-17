'use client'
import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { TarjetaInteraccionSupreme } from '@/components/TarjetaInteraccionSupreme'
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs'
import { toast } from 'sonner'
import { getAuthHeaders } from '@/lib/getAuthHeaders'
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

// --- Anti-duplicados / control de sonido ---
const makeMsgId = (m: { paciente_id?: string; mensaje?: string; fecha?: string }) =>
  `${m?.paciente_id || ''}|${(m?.mensaje || '').slice(0,120)}|${m?.fecha || ''}`;

function agruparPorPacienteId(data: Interaccion[]) {
  const agrupadas: Record<string, Interaccion[]> = {}
  data.forEach((item) => {
    const key = item.paciente_id
    if (!agrupadas[key]) agrupadas[key] = []
    agrupadas[key].push(item)
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
  const pacientesPorId = useMemo(
    () => Object.fromEntries(pacientes.map((p) => [p.id, p])),
    [pacientes]
  )
  const [query, setQuery] = useState('')
  const [resultados, setResultados] = useState<Interaccion[]>([])
  const [buscando, setBuscando] = useState(false)
  const [, setForceUpdate] = useState(0)
  const { t } = useTranslation()

  // evita duplicados por SSE
  const seenEventsRef = useRef<Set<string>>(new Set());

  const fetchInteracciones = useCallback(async () => {
    try {
      const headers = getAuthHeaders()
      const [resActivas, resArchivadas, resPacientes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/interacciones`, { headers }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/interacciones/archivados`, { headers }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/pacientes-activos`, { headers }),
      ])

      let dataActivas: Interaccion[] = []
      if (resActivas.ok) {
        const json = await resActivas.json()
        if (Array.isArray(json)) {
          dataActivas = json as Interaccion[]
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
      setArchivadas(dataArchivadas)
      setPacientes(dataPacientes.pacientes)

      // Firmas conocidas (activas + archivadas)
      const firmas = new Set<string>()
      for (const m of dataActivas) firmas.add(makeMsgId(m))
      for (const m of dataArchivadas as Interaccion[]) firmas.add(makeMsgId(m))
      seenEventsRef.current = firmas

      setForceUpdate((prev) => prev + 1)
    } catch (err) {
      console.error('❌ Error al cargar interacciones:', err)
    }
  }, [])

  useEffect(() => {
    fetchInteracciones()
  }, [fetchInteracciones])

  useEffect(() => {
    const handler = (ev: any) => {
      const data = ev.detail
      if (data?.tipo !== 'nuevo_mensaje') return

      const eid = makeMsgId({
        paciente_id: data.paciente_id,
        mensaje: data.mensaje,
        fecha: data.fecha,
      })

      if (seenEventsRef.current.has(eid)) return
      seenEventsRef.current.add(eid)

      const ok =
        data?.paciente_id && data?.mensaje &&
        data?.fecha && data?.nivel_alerta && data?.nombre

      if (ok) {
        setActivas(prev => {
          const next = [{
            paciente_id: data.paciente_id,
            nombre: data.nombre,
            telefono: data.telefono ?? '',
            mensaje: data.mensaje,
            nivel_alerta: data.nivel_alerta,
            alerta_manual: data.alerta_manual ?? null,
            respuesta_enviada: data.respuesta_enviada ?? '',
            fecha: data.fecha,
            score_ia: data.score_ia,
            nivel_alerta_ia: data.nivel_alerta_ia,
            tags_detectados: data.tags_detectados || [],
          }, ...prev]
          return next.sort((a,b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
        })
      } else {
        // evento incompleto → refrescá desde el backend
        fetchInteracciones()
      }
    }

    window.addEventListener('nuevo_mensaje', handler as EventListener)
    return () => window.removeEventListener('nuevo_mensaje', handler as EventListener)
  }, [fetchInteracciones])

  const buscarInteracciones = async (texto: string) => {
    setBuscando(true)
    setQuery(texto)

    if (!texto) {
      setResultados([])
      setBuscando(false)
      return
    }

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/interacciones/buscar?query=${encodeURIComponent(texto)}`,
        { headers: getAuthHeaders() }
      )
      const data = await res.json()
      setResultados(data)
    } catch (err) {
      console.error('❌ Error al buscar interacciones:', err)
    } finally {
      setBuscando(false)
    }
  }

  const pacientesConMensajes = new Set(activas.map(i => i.paciente_id))
  const pacientesSinMensajes = pacientes.filter((p: any) => !pacientesConMensajes.has(p.id))

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
          {Object.entries(agruparPorPacienteId(resultados)).map(([pacienteId, mensajes], index) => {
            mensajes.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
            const alertaGlobal = getAlertaGlobal(mensajes)
            const { nombre, fecha } = mensajes[mensajes.length - 1]
            const telefonoOficial = pacientesPorId[pacienteId]?.telefono ?? mensajes[mensajes.length - 1]?.telefono ?? ''
            return (
              <TarjetaInteraccionSupreme
                key={`res-${index}`}
                nombre={nombre}
                telefono={telefonoOficial}
                alerta={alertaGlobal}
                fecha={new Date(fecha).toLocaleString()}
                mensajes={mensajes}
                paciente_id={pacienteId}
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
            {t('interacciones.tab_activas')}
          </TabsTrigger>
          <TabsTrigger
            value="archivadas"
            className="data-[state=active]:bg-blue-100 data-[state=active]:text-blue-900
                      data-[state=active]:font-semibold text-sm text-gray-600 px-5 py-1.5 rounded-lg transition-all"
          >
            {t('interacciones.tab_archivadas')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="activas" className="space-y-4">
          {activas.length === 0 ? (
            <p className="text-muted-foreground">{t('interacciones.sin_mensajes_activos')}</p>
          ) : (
            Object.entries(agruparPorPacienteId(activas)).map(([pacienteId, mensajes], index) => {
              mensajes.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
              const alertaGlobal = getAlertaGlobal(mensajes)
              const { nombre, fecha } = mensajes[mensajes.length - 1]
              const telefonoOficial = pacientesPorId[pacienteId]?.telefono ?? mensajes[mensajes.length - 1]?.telefono ?? ''

              return (
                <TarjetaInteraccionSupreme
                  key={index}
                  nombre={nombre}
                  telefono={telefonoOficial}
                  alerta={alertaGlobal}
                  fecha={new Date(fecha).toLocaleString()}
                  mensajes={mensajes}
                  paciente_id={pacienteId}
                  onArchivar={async () => {
                    await fetch(
                      `${process.env.NEXT_PUBLIC_API_URL}/api/interacciones/paciente/${pacienteId}`,
                      {
                        method: 'PATCH',
                        headers: {
                          ...getAuthHeaders(),
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ archivado: true }),
                      }
                    )
                    await fetchInteracciones()
                  }}
                  onEscalarAlerta={async (color: 'rojo' | 'amarillo' | 'verde') => {
                    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/interacciones/alerta/${mensajes[0].paciente_id}`, {
                      method: 'PATCH',
                      headers: {
                        ...getAuthHeaders(),
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({ alerta_manual: color }),
                    })
                    const data = await res.json().catch(() => null)

                    if (res.ok) {
                      toast.success(t('interacciones.alerta_escalada_ok').replace('{{color}}', color.toUpperCase()))
                      setActivas((prev) =>
                        prev.map((i) =>
                          i.paciente_id === mensajes[0].paciente_id
                            ? { ...i, alerta_manual: color }
                            : i
                        )
                      )
                    } else {
                      console.log('📬 Respuesta del backend:', res.status, data)
                      toast.error(t('interacciones.alerta_escalada_error'))
                    }
                  }}
                  onReenviarFormulario={async () => {
                    const toastId = toast.loading(t('interacciones.reenviando_formulario'))
                    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/reenviar-formulario`, {
                      method: 'POST',
                      headers: {
                        ...getAuthHeaders(),
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        paciente_id: mensajes[0].paciente_id,
                        telefono: telefonoOficial,
                      }),
                    })
                    toast.dismiss(toastId)
                    if (res.ok) {
                      toast.success(t('interacciones.formulario_reenviado'))
                      await fetchInteracciones()
                    } else {
                      toast.error(t('interacciones.formulario_error'))
                    }
                  }}
                />
              )
            })
          )}
          {pacientesSinMensajes.map((paciente: any, index: number) => (
            <TarjetaInteraccionSupreme
              key={`sinmsg-${index}`}
              nombre={paciente.nombre}
              telefono={paciente.telefono}
              alerta="verde"
              fecha={new Date(paciente.fecha).toLocaleString()}
              mensajes={[]}
              paciente_id={paciente.id}
              onReenviarFormulario={async () => {
                const toastId = toast.loading(t('interacciones.reenviando_formulario'))
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/reenviar-formulario`, {
                  method: 'POST',
                  headers: {
                    ...getAuthHeaders(),
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    paciente_id: paciente.id,
                    telefono: paciente.telefono,
                  }),
                })
                toast.dismiss(toastId)
                if (res.ok) {
                  toast.success(t('interacciones.formulario_reenviado'))
                  await fetchInteracciones()
                } else {
                  toast.error(t('interacciones.formulario_error'))
                }
              }}
            />
          ))}
        </TabsContent>

        <TabsContent value="archivadas" className="space-y-4">
          {archivadas.length === 0 ? (
            <p className="text-muted-foreground">{t('interacciones.no_archivadas')}</p>
          ) : (
            Object.entries(agruparPorPacienteId(archivadas)).map(([pacienteId, mensajes], index) => {
              mensajes.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
              const alertaGlobal = getAlertaGlobal(mensajes)
              const { nombre, fecha } = mensajes[mensajes.length - 1]
              const telefonoOficial = pacientesPorId[pacienteId]?.telefono ?? mensajes[mensajes.length - 1]?.telefono ?? ''

              return (
                <TarjetaInteraccionSupreme
                  key={index}
                  nombre={nombre}
                  telefono={telefonoOficial}
                  alerta={alertaGlobal}
                  fecha={new Date(fecha).toLocaleString()}
                  mensajes={mensajes}
                  paciente_id={pacienteId}
                />
              )
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}