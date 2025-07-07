'use client'

import React, { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageCircle,
  Phone,
  Bot,
  Clock,
  Archive,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useEffect } from 'react'

const NotasClinicas = ({ pacienteId }: { pacienteId: string }) => {
  const [nota, setNota] = useState('');
  const [fecha, setFecha] = useState<string | null>(null);
  const [editando, setEditando] = useState(false);
  const [cargando, setCargando] = useState(true);
  const backendUrl = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    fetch(`${backendUrl}/api/notas/${pacienteId}`, {
      headers: { 'x-clinica-host': window.location.hostname },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setNota(data?.nota || '');
        setFecha(data?.fecha || null);
      })
      .catch((err) => {
        console.error('❌ Error al obtener nota:', err);
      })
      .finally(() => setCargando(false));
  }, [pacienteId]);

  const guardarNota = async () => {
    const res = await fetch(`${backendUrl}/api/notas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-clinica-host': window.location.hostname,
      },
      body: JSON.stringify({ paciente_id: pacienteId, nota }),
    });

    if (res.ok) {
      toast.success('📝 Nota guardada correctamente');
      setEditando(false);
      const now = new Date();
      setFecha(now.toISOString());
    } else {
      toast.error('❌ Error al guardar la nota');
    }
  };

  if (cargando)
    return <p className="text-sm text-gray-400">Cargando nota clínica...</p>;

  return (
    <div className="mt-6 bg-gray-50 p-4 rounded-xl border text-sm">
      <label className="block font-medium mb-2 text-gray-700">📝 Nota interna del médico</label>

      {!editando ? (
        <>
          <div className="whitespace-pre-line text-gray-800 mb-2">
            {nota || <span className="italic text-gray-500">Sin nota registrada.</span>}
          </div>
          {fecha && (
            <p className="text-xs text-gray-500 italic mb-2">
              🕓 Última actualización: {new Date(fecha).toLocaleString('es-AR')}
            </p>
          )}
          <button
            onClick={() => setEditando(true)}
            className="text-xs px-3 py-1 bg-blue-100 text-blue-800 hover:bg-blue-200 rounded-full"
          >
            ✏️ Editar nota
          </button>
        </>
      ) : (
        <>
          <textarea
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            className="w-full p-2 border rounded-md text-sm"
            placeholder="Anotar evolución, decisiones clínicas, seguimiento..."
            rows={4}
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={guardarNota}
              className="bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-1 rounded-md"
            >
              💾 Guardar cambios
            </button>
            <button
              onClick={() => setEditando(false)}
              className="bg-gray-200 hover:bg-gray-300 text-sm px-4 py-1 rounded-md"
            >
              ❌ Cancelar
            </button>
          </div>
        </>
      )}
    </div>
  );
};


interface Interaccion {
  mensaje: string
  respuesta_enviada: string
  nivel_alerta: 'rojo' | 'amarillo' | 'verde'
  fecha: string
  score_ia?: number
  nivel_alerta_ia?: string
  tags_detectados?: string[]
}

interface Props {
  paciente_id: string 
  nombre: string
  telefono: string
  alerta: 'verde' | 'amarillo' | 'rojo'
  fecha: string
  mensajes: Interaccion[]
  clinica?: string
  onArchivar?: () => void
  onAlertar?: () => void
  onEscalarAlerta?: (color: 'rojo' | 'amarillo' | 'verde') => void
  onReenviarFormulario?: () => void
}

const colorPorAlerta = {
  verde: 'bg-green-200 text-green-900 font-semibold',
  amarillo: 'bg-yellow-200 text-yellow-800 font-semibold',
  rojo: 'bg-red-200 text-red-800 font-semibold',
}

export const TarjetaInteraccionSupreme = ({
  nombre,
  telefono,
  alerta,
  fecha,
  mensajes,
  clinica,
  onArchivar,
  onAlertar,
  onEscalarAlerta,
  onReenviarFormulario,
  paciente_id,
}: Props) => {
  const [abierto, setAbierto] = useState(false)
  useEffect(() => {
    if (abierto && paciente_id) {
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/interacciones/marcarLeido`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-clinica-host': window.location.hostname,
        },
        body: JSON.stringify({ paciente_id }),
      }).catch((err) => {
        console.error('❌ Error al marcar como leído:', err)
      })
    }
  }, [abierto, paciente_id])

  const [analisisVisible, setAnalisisVisible] = useState<number | null>(null)
  const ultimoMensaje = mensajes[0]
  const sinMensajes = mensajes.length === 0

  const enviarFeedback = async (
    paciente_id: string,
    mensaje: string,
    nivel_alerta_ia: string,
    evaluacion_manual: 'bueno' | 'malo'
  ) => {
    console.log('📤 Enviando feedback IA:', {
      paciente_id,
      mensaje_original: mensaje,
      nivel_alerta_ia,
      evaluacion_manual
    })
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/ia/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-clinica-host': window.location.hostname, // ✅ CLAVE
        },
        body: JSON.stringify({
          paciente_id,
          mensaje_original: mensaje,
          nivel_alerta_ia,
          evaluacion_manual
        })
      })

      if (res.ok) {
        toast.success('✅ Feedback guardado correctamente')
      } else if (res.status === 409) {
        toast('⚠️ Este mensaje ya fue marcado anteriormente', { icon: '⚠️' })
      } else {
        toast.error('❌ Ocurrió un error al enviar el feedback')
      }
    } catch (err) {
      console.error('Error al enviar feedback:', err)
      toast.error('❌ Error al conectar con el servidor')
    }
  }

  return (
    <div className={`w-full border rounded-2xl shadow-md transition-all ${sinMensajes ? 'bg-gray-50 border-gray-100' : 'bg-white border-gray-200 hover:shadow-lg'}`}>
      {/* CABECERA */}
      <div
        onClick={() => setAbierto(!abierto)}
        className="grid grid-cols-[1fr_auto] gap-2 px-4 py-4 cursor-pointer hover:bg-gray-50 transition-all items-center"
      >
        {/* Columna izquierda: Info paciente */}
        <div>
          <p className="text-sm font-semibold">{nombre}</p>
          <div className="flex items-center text-xs text-muted-foreground gap-2">
            <Phone className="w-4 h-4" />
            {telefono}
            {clinica && <span className="italic ml-2">({clinica})</span>}
          </div>
          <p className="text-xs text-gray-500 mt-1 line-clamp-1 max-w-[250px]">
            {sinMensajes ? '🕓 Aún sin respuesta del paciente' : ultimoMensaje?.mensaje}
          </p>
        </div>

        {/* Columna derecha: hora + alerta + toggle */}
        <div className="flex flex-col items-end gap-1">
          <div className="flex flex-col items-end text-xs text-muted-foreground">
            <div className="flex items-center gap-1 mb-1">
              <Clock className="w-3 h-3" />
              <span>
                {new Date(ultimoMensaje?.fecha || fecha).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
            <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${colorPorAlerta[alerta]}`}>
              <AlertTriangle className="w-3 h-3" />
              {alerta}
            </span>
          </div>
          {abierto ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground mt-1" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground mt-1" />
          )}
        </div>
      </div>

      {/* CONTENIDO DESPLEGABLE */}
      <AnimatePresence>
        {abierto && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-4 pb-4"
          >
            <div className="mt-2 space-y-4 text-sm">
              {sinMensajes ? (
                <div className="p-4 bg-gray-100 rounded-xl text-sm text-gray-600 text-center">
                  Este paciente aún no respondió por WhatsApp.
                </div>
              ) : (
                mensajes.map((m, i) => (
                  <div
                    key={i}
                    className="bg-gray-50 p-3 rounded-lg shadow-sm border text-sm text-gray-800 space-y-1"
                  >
                    <div className="flex items-start gap-2">
                      <MessageCircle className="w-4 h-4 mt-0.5 text-gray-500" />
                      <div>
                        <span className="font-medium">Paciente:</span> <br />
                        {m.mensaje}
                      </div>
                    </div>

                    {m.respuesta_enviada && (
                      <div className="flex items-start gap-2 mt-2">
                        <Bot className="w-4 h-4 mt-0.5 text-blue-500" />
                        <div>
                          <span className="font-medium">Respuesta automática:</span> <br />
                          <span className="text-blue-700">{m.respuesta_enviada}</span>
                          {/* Botones de feedback IA */}
                          <div className="flex gap-2 mt-2 ml-6">
                            <button
                              onClick={() => enviarFeedback(
                                paciente_id,
                                m.mensaje,
                                m.nivel_alerta,
                                'bueno'
                              )}
                              className="text-xs px-2 py-1 rounded-full bg-green-100 hover:bg-green-200 text-green-700"
                            >
                              👍 Ejemplo bueno
                            </button>
                            <button
                              onClick={() => enviarFeedback(
                                paciente_id,
                                m.mensaje,
                                m.nivel_alerta,
                                'malo'
                              )}
                              className="text-xs px-2 py-1 rounded-full bg-red-100 hover:bg-red-200 text-red-700"
                            >
                              👎 Ejemplo malo
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                    {/* Botón para ver análisis IA */}
                      <button
                        onClick={() => setAnalisisVisible(analisisVisible === i ? null : i)}
                        className="mt-3 ml-6 flex items-center gap-2 text-sm font-medium text-blue-900 hover:text-blue-700 transition-all"
                      >
                        <div className="flex items-center justify-center bg-blue-100 text-blue-900 rounded-full w-6 h-6 text-xs shadow-sm">
                          🔍
                        </div>
                        <span className="underline underline-offset-2">
                          Ver análisis clínico IA
                        </span>
                        {analisisVisible === i ? (
                          <ChevronUp className="w-4 h-4 text-blue-800" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-blue-800" />
                        )}
                      </button>
                      {/* Bloque de análisis IA */}
                      {analisisVisible === i && (
                        <div className="mt-2 ml-6 bg-neutral-100 rounded-xl p-3 text-xs text-gray-700 border">
                          {m.score_ia || m.nivel_alerta_ia || (m.tags_detectados && m.tags_detectados.length > 0) ? (
                            <div className="space-y-2 text-sm">
                              <div className="flex items-center gap-2">
                                <span className="text-blue-900 font-semibold bg-blue-100 px-2 py-0.5 rounded-md">
                                  🔢 Score IA:
                                </span>
                                <span className="text-blue-800">{m.score_ia}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-red-900 font-semibold bg-red-100 px-2 py-0.5 rounded-md">
                                  🚦 Nivel evaluado:
                                </span>
                                <span className="capitalize">{m.nivel_alerta_ia}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-gray-700 font-semibold bg-yellow-100 px-2 py-0.5 rounded-md">
                                  🏷️ Tags detectados:
                                </span>
                                <span>{m.tags_detectados?.join(', ')}</span>
                              </div>
                            </div>
                          ) : (
                            <p className="italic text-gray-500">Sin datos de IA para este mensaje.</p>
                          )}
                        </div>
                      )}
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                      <Clock className="w-3 h-3" />
                      {new Date(m.fecha).toLocaleString()}
                    </div>
                  </div>
                ))
              )}
              <NotasClinicas pacienteId={paciente_id} />
              
              {/* ACCIONES RÁPIDAS */}
              <div className="w-full overflow-x-auto">
                <div className="flex flex-nowrap sm:flex-wrap gap-2 mt-4 px-2">
                  {onArchivar && !sinMensajes && (
                    <button
                      onClick={onArchivar}
                      className="flex-shrink-0 flex items-center gap-1 px-3 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded-full whitespace-nowrap"
                    >
                      <Archive className="w-3 h-3" /> Archivar
                    </button>
                  )}
                  {onEscalarAlerta && !sinMensajes && (
                    <>
                      <button
                        onClick={() => onEscalarAlerta('verde')}
                        className="flex-shrink-0 px-3 py-1 text-xs rounded-full bg-green-100 text-green-700 hover:bg-green-200 whitespace-nowrap"
                      >
                        Escalar a Verde
                      </button>
                      <button
                        onClick={() => onEscalarAlerta('amarillo')}
                        className="flex-shrink-0 px-3 py-1 text-xs rounded-full bg-yellow-100 text-yellow-700 hover:bg-yellow-200 whitespace-nowrap"
                      >
                        Escalar a Amarillo
                      </button>
                      <button
                        onClick={() => onEscalarAlerta('rojo')}
                        className="flex-shrink-0 px-3 py-1 text-xs rounded-full bg-red-100 text-red-700 hover:bg-red-200 whitespace-nowrap"
                      >
                        Escalar a Rojo
                      </button>
                    </>
                  )}
                  {onAlertar && (
                    <button
                      onClick={onAlertar}
                      className="flex-shrink-0 flex items-center gap-1 px-3 py-1 text-xs bg-red-100 text-red-700 hover:bg-red-200 rounded-full whitespace-nowrap"
                    >
                      <AlertTriangle className="w-3 h-3" /> Escalar alerta
                    </button>
                  )}
                  {onReenviarFormulario && (
                    <button
                      onClick={onReenviarFormulario}
                      className="flex-shrink-0 flex items-center gap-1 px-3 py-1 text-xs bg-blue-100 text-blue-800 hover:bg-blue-200 rounded-full whitespace-nowrap"
                    >
                      🔁 Reenviar formulario
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
