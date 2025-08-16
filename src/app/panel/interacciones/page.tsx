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
import { useSSE } from '@/hooks/useSSE'

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
const makeMsgId = (m: { paciente_id?: string; telefono?: string; mensaje?: string; fecha?: string }) =>
  `${m?.paciente_id || ''}|${m?.telefono || ''}|${(m?.mensaje || '').slice(0,120)}|${m?.fecha || ''}`;

const now = () => Date.now();


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
  const { reproducir, desbloquear } = useSonidoNotificacion()
  const { t } = useTranslation()
  // evita beeps duplicados y beeps por clicks del usuario
  const seenEventsRef = useRef<Set<string>>(new Set());
  const lastSoundAtRef = useRef<number>(0);
  const lastUserClickAtRef = useRef<number>(0);

  // 🔊 Desbloquear audio en primer click y marcar interacciones de usuario
  useEffect(() => {
    const onClick = () => {
      if (!lastUserClickAtRef.current) {
        // Primera interacción del usuario → desbloqueo audio
        desbloquear();
      }
      lastUserClickAtRef.current = now();
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [desbloquear]);

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
      setArchivadas(dataArchivadas)
      setPacientes(dataPacientes.pacientes)

      // 🧠 Firmas de mensajes conocidos (activas + archivadas) para evitar beeps/duplicados
      const firmas = new Set<string>()
      for (const m of dataActivas as Interaccion[]) firmas.add(makeMsgId(m))
      for (const m of dataArchivadas as Interaccion[]) firmas.add(makeMsgId(m))

      seenEventsRef.current = firmas               // usamos Set para lookups O(1)

      setForceUpdate((prev) => prev + 1) // 🧠 Forzar re-render visual
    } catch (err) {
      console.error('❌ Error al cargar interacciones:', err)
    }
  }

  useEffect(() => {
    fetchInteracciones();
  }, []);

  useSSE((data) => {
    // esperamos { tipo: 'nuevo_mensaje', ...payload }
    if (data?.tipo !== 'nuevo_mensaje') return;

    // id robusto (si el back manda data.id mejor)
    const eid = (data as any).id || makeMsgId({
      paciente_id: data.paciente_id,
      telefono: (data as any).telefono, 
      mensaje: (data as any).mensaje,
      fecha: data.fecha,
    });

    // ¿ya lo vimos?
    if (seenEventsRef.current.has(eid)) return;

    // marcar como visto ANTES de actualizar estado (evita doble beep por race)
    seenEventsRef.current.add(eid);

    // payload mínimo para insertar sin refetch:
    const tienePayloadMinimo =
      data?.paciente_id &&
      (data as any)?.telefono &&
      (data as any)?.mensaje &&
      data?.fecha &&
      (data as any)?.nivel_alerta &&
      (data as any)?.nombre;

    if (tienePayloadMinimo) {
      setActivas(prev => {
        const next = [
          {
            paciente_id: data.paciente_id!,
            nombre: (data as any).nombre,
            telefono: (data as any).telefono,
            mensaje: (data as any).mensaje,
            nivel_alerta: (data as any).nivel_alerta,
            alerta_manual: (data as any).alerta_manual ?? null,
            respuesta_enviada: (data as any).respuesta_enviada ?? '',
            fecha: data.fecha!,
            score_ia: (data as any).score_ia,
            nivel_alerta_ia: (data as any).nivel_alerta_ia,
            tags_detectados: (data as any).tags_detectados || [],
          },
          ...prev,
        ];
        // ordenar descendente por fecha
        return next.sort((a,b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
      });
    } else {
      // si no alcanza la data, refrescamos todo
      fetchInteracciones();
    }

    // ——— sonido con las mismas reglas que ya tenías ———
    const justClicked = now() - lastUserClickAtRef.current < 400; // 400ms
    const cooldownOk = now() - lastSoundAtRef.current > 2000;     // 2s
    const visible = typeof document !== 'undefined' ? !document.hidden : true;

    if (!justClicked && cooldownOk && visible) {
      reproducir();
      lastSoundAtRef.current = now();
    }
  }, {
    // si tu backend sirve SSE en el dominio API:
    url: () => `${process.env.NEXT_PUBLIC_API_URL}/api/sse`,
    // si lo proxéas desde Next, podrías usar simplemente '/api/sse'

    // pasan token/host por query (EventSource no usa headers)
    params: {
      token: (typeof window !== 'undefined' ? localStorage.getItem('token') : '') || '',
      host:  (typeof window !== 'undefined' ? window.location.hostname : '') || '',
    },

    reconnect: true,
    backoffMs: 1000,
    backoffMaxMs: 10000,
    pauseWhenHidden: true,          // opcional, ahorra recursos si la pestaña está oculta
    namedEvents: ['nuevo_mensaje'], // si tu server emite eventos con nombre
    onOpen: () => console.log('SSE abierta'),
    onError: (e) => console.warn('SSE error', e),
  });

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
          Object.entries(agruparPorTelefono(activas)).map(([telefono, mensajes], index) => {
            mensajes.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
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
                  await fetchInteracciones() // ← refresca ambas pestañas
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
                      toast.success(t('interacciones.alerta_escalada_ok').replace('{{color}}', color.toUpperCase()))
                      setActivas((prev) =>
                        prev.map((i) =>
                          i.paciente_id === mensajes[0].paciente_id
                            ? { ...i, alerta_manual: color }
                            : i
                        )
                      )
                    } else {
                      alert(t('interacciones.alerta_escalada_error'))
                    }
                  }}

                  onReenviarFormulario={async () => {
                    const toastId = toast.loading(t('interacciones.reenviando_formulario'))

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
            Object.entries(agruparPorTelefono(archivadas)).map(([telefono, mensajes], index) => {
              mensajes.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
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
