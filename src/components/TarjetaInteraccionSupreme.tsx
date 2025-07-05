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

interface Props {
  nombre: string
  telefono: string
  mensaje: string
  respuesta: string
  alerta: 'verde' | 'amarillo' | 'rojo'
  fecha: string
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
  mensaje,
  respuesta,
  alerta,
  fecha,
  clinica,
  onArchivar,
  onAlertar,
}: Props) => {
  const [abierto, setAbierto] = useState(false)

  return (
    <div className="w-full border border-gray-200 rounded-2xl shadow-sm overflow-hidden bg-white">
      {/* CABECERA */}
      <div
        onClick={() => setAbierto(!abierto)}
        className="flex justify-between items-center px-4 py-3 cursor-pointer hover:bg-gray-50 transition-all"
      >
        <div>
          <p className="text-sm font-semibold">{nombre}</p>
          <div className="flex items-center text-xs text-muted-foreground gap-2">
            <Phone className="w-4 h-4" />
            {telefono}
            {clinica && <span className="italic ml-2">({clinica})</span>}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Badge className={`${colorPorAlerta[alerta]} capitalize text-xs`}>
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
            <div className="mt-2 space-y-3 text-sm">
              <div>
                <p className="font-medium flex items-center gap-1">
                  <MessageCircle className="w-4 h-4" /> Mensaje del paciente:
                </p>
                <p className="bg-gray-100 p-2 rounded-md mt-1">{mensaje}</p>
              </div>

              <div>
                <p className="font-medium flex items-center gap-1 text-blue-800">
                  <Bot className="w-4 h-4" /> Respuesta automática:
                </p>
                <p className="bg-blue-50 p-2 rounded-md mt-1 text-blue-800">{respuesta}</p>
              </div>

              <div className="text-xs text-gray-500 flex items-center gap-1">
                <Clock className="w-4 h-4" /> {fecha}
              </div>

              {/* ACCIONES RÁPIDAS */}
              <div className="flex gap-2 mt-2">
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
