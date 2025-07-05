// components/TarjetaInteraccion.tsx

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MessageCircle, Phone, AlertTriangle, Bot, Clock } from 'lucide-react'

interface Props {
  nombre: string
  telefono: string
  mensaje: string
  respuesta: string
  alerta: 'verde' | 'amarillo' | 'rojo'
  fecha: string
  clinica?: string
}

const colorPorAlerta = {
  verde: 'bg-green-100 text-green-800',
  amarillo: 'bg-yellow-100 text-yellow-800',
  rojo: 'bg-red-100 text-red-800',
}

export const TarjetaInteraccion = ({
  nombre,
  telefono,
  mensaje,
  respuesta,
  alerta,
  fecha,
  clinica,
}: Props) => {
  return (
    <Card className="w-full rounded-2xl shadow-md border border-gray-200 p-4 transition-all hover:shadow-lg bg-white">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-lg font-semibold">{nombre}</h2>
        <Badge className={`${colorPorAlerta[alerta]} capitalize`}>
          {alerta}
        </Badge>
      </div>

      <div className="text-sm text-gray-600 mb-2 flex items-center gap-2">
        <Phone className="w-4 h-4" />
        {telefono}
      </div>

      {clinica && (
        <div className="text-xs text-gray-500 mb-2 italic">
          Clínica: {clinica}
        </div>
      )}

      <div className="mb-2">
        <p className="text-sm font-medium flex items-center gap-1 text-gray-800">
          <MessageCircle className="w-4 h-4" /> Mensaje del paciente:
        </p>
        <p className="text-sm bg-gray-100 p-2 rounded-md mt-1">{mensaje}</p>
      </div>

      <div className="mb-2">
        <p className="text-sm font-medium flex items-center gap-1 text-gray-800">
          <Bot className="w-4 h-4" /> Respuesta automática:
        </p>
        <p className="text-sm bg-blue-50 p-2 rounded-md mt-1 text-blue-800">{respuesta}</p>
      </div>

      <div className="text-xs text-gray-500 flex items-center gap-1 mt-2">
        <Clock className="w-4 h-4" /> {fecha}
      </div>
    </Card>
  )
}
