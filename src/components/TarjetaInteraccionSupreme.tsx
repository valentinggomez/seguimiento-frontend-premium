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
}

const colorPorAlerta = {
  verde: 'bg-green-100 text-green-800',
  amarillo: 'bg-yellow-100 text-yellow-800',
  rojo: 'bg-red-100 text-red-800',
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
}: Props) => {
  const [abierto, setAbierto] = useState(false)
  const ultimoMensaje = mensajes[mensajes.length - 1]

  return (
    <div className="w-full bg-white border border-gray-200 rounded-2xl shadow-md hover:shadow-lg transition-all">
      {/* CABECERA */}
      <div
        onClick={() => setAbierto(!abierto)}
        className="flex justify-between items-center px-4 py-3 cursor-pointer"
      >
        <div className="flex flex-col">
          <p className="text-sm font-semibold">{nombre}</p>
          <div className="flex items-center text-xs text-muted-foreground gap-2">
            <Phone className="w-4 h-4" />
            {telefono}
            {clinica && <span className="italic ml-2">({clinica})</span>}
          </div>
          <p className="text-xs text-gray-500 mt-1 truncate max-w-[280px]">
            {ultimoMensaje?.mensaje}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <p className="text-xs text-muted-foreground">
            {new Date(fecha).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
          <Badge className={`flex items-center gap-1 ${colorPorAlerta[alerta]} text-xs`}>
            <AlertTriangle className="w-3 h-3" />
            {alerta}
          </Badge>
          {abierto ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
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
              {mensajes.map((m, i) => (
                <div key={i} className="bg-gray-50 p-3 rounded-lg shadow-sm border">
                  <div className="text-xs text-gray-500 mb-1 flex items-center gap-2">
                    <Clock className="w-3 h-3" />
                    {new Date(m.fecha).toLocaleString()}
                    <Badge
                      className={`${colorPorAlerta[m.nivel_alerta]} text-xs ml-auto`}
                    >
                      {m.nivel_alerta}
                    </Badge>
                  </div>

                  <p className="mb-2">
                    <span className="font-medium flex items-center gap-1 text-gray-700">
                      <MessageCircle className="w-4 h-4" /> Paciente:
                    </span>
                    {m.mensaje}
                  </p>

                  <p className="text-blue-800">
                    <span className="font-medium flex items-center gap-1">
                      <Bot className="w-4 h-4" /> Respuesta automática:
                    </span>
                    {m.respuesta_enviada}
                  </p>
                </div>
              ))}

              {/* ACCIONES RÁPIDAS */}
              <div className="flex gap-2 mt-4">
                {onArchivar && (
                  <button
                    onClick={onArchivar}
                    className="flex items-center gap-1 px-3 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded-full"
                  >
                    <Archive className="w-3 h-3" /> Archivar
                  </button>
                )}
                {onAlertar && (
                  <button
                    onClick={onAlertar}
                    className="flex items-center gap-1 px-3 py-1 text-xs bg-red-100 text-red-700 hover:bg-red-200 rounded-full"
                  >
                    <AlertTriangle className="w-3 h-3" /> Escalar alerta
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
