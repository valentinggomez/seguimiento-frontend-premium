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

interface Interaccion {
  mensaje: string
  respuesta_enviada: string
  nivel_alerta: 'rojo' | 'amarillo' | 'verde'
  fecha: string
}

interface Props {
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
}: Props) => {
  const [abierto, setAbierto] = useState(false)
  const ultimoMensaje = mensajes[mensajes.length - 1]
  const sinMensajes = mensajes.length === 0

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
                {new Date(fecha).toLocaleTimeString([], {
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
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                      <Clock className="w-3 h-3" />
                      {new Date(m.fecha).toLocaleString()}
                    </div>
                  </div>
                ))
              )}
              {/* ACCIONES RÁPIDAS */}
              <div className={`flex gap-2 mt-4 ${sinMensajes ? 'justify-center' : ''}`}>
                {onArchivar && !sinMensajes &&(
                  <button
                    onClick={onArchivar}
                    className="flex items-center gap-1 px-3 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded-full"
                  >
                    <Archive className="w-3 h-3" /> Archivar
                  </button>
                )}
                {onEscalarAlerta && !sinMensajes &&(
                  <div className="flex gap-2">
                    <button
                      onClick={() => onEscalarAlerta('verde')}
                      className="px-3 py-1 text-xs rounded-full bg-green-100 text-green-700 hover:bg-green-200"
                    >
                      Escalar a Verde
                    </button>
                    <button
                      onClick={() => onEscalarAlerta('amarillo')}
                      className="px-3 py-1 text-xs rounded-full bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                    >
                      Escalar a Amarillo
                    </button>
                    <button
                      onClick={() => onEscalarAlerta('rojo')}
                      className="px-3 py-1 text-xs rounded-full bg-red-100 text-red-700 hover:bg-red-200"
                    >
                      Escalar a Rojo
                    </button>
                  </div>
                )}
                {onAlertar && (
                  <button
                    onClick={onAlertar}
                    className="flex items-center gap-1 px-3 py-1 text-xs bg-red-100 text-red-700 hover:bg-red-200 rounded-full"
                  >
                    <AlertTriangle className="w-3 h-3" /> Escalar alerta
                  </button>
                )}
                {onReenviarFormulario && (
                  <button
                    onClick={onReenviarFormulario}
                    className="flex items-center gap-1 px-3 py-1 text-xs bg-blue-100 text-blue-800 hover:bg-blue-200 rounded-full"
                  >
                    🔁 Reenviar formulario
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
