'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { getAuthHeaders } from '@/lib/getAuthHeaders'

type Paciente = {
  id: string
  nombre: string
  edad: number
  dni: string
  telefono: string
  obra_social?: string
  cirugia?: string
  nombre_medico?: string
}

type Props = {
  open: boolean
  onClose: () => void
  paciente: Paciente
  onSave: () => void
}

export default function EditarPacienteModal({ open, onClose, paciente, onSave }: Props) {
  const [formData, setFormData] = useState<Paciente>(paciente)
  const [loading, setLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
        const headers = await getAuthHeaders()
        const res = await fetch(`/api/pacientes/${paciente.id}`, {
        method: 'PATCH',
        headers: await getAuthHeaders(),
        body: JSON.stringify(formData),
        })

        const data = await res.json()

        if (!res.ok) throw new Error(data.error || 'Error al guardar cambios')

        toast.success('✅ Paciente actualizado correctamente')
        onSave()
        onClose()
    } catch (err: any) {
        toast.error(`❌ ${err.message}`)
    } finally {
        setLoading(false)
    }
  }
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md rounded-2xl shadow-lg border border-gray-200 p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-center">✏️ Editar paciente</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 pt-2">
          <Input
            name="nombre"
            placeholder="Nombre completo"
            value={formData.nombre}
            onChange={handleChange}
          />
          <Input
            name="edad"
            placeholder="Edad"
            type="number"
            value={formData.edad}
            onChange={handleChange}
          />
          <Input
            name="dni"
            placeholder="DNI"
            value={formData.dni}
            onChange={handleChange}
          />
          <Input
            name="telefono"
            placeholder="Teléfono"
            value={formData.telefono}
            onChange={handleChange}
          />
          <Input
            name="obra_social"
            placeholder="Obra social"
            value={formData.obra_social || ''}
            onChange={handleChange}
          />
          <Input
            name="cirugia"
            placeholder="Tipo de cirugía"
            value={formData.cirugia || ''}
            onChange={handleChange}
          />
          <Input
            name="nombre_medico"
            placeholder="Nombre del médico"
            value={formData.nombre_medico || ''}
            onChange={handleChange}
          />
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}