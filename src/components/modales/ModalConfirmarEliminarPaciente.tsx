// components/modales/ModalConfirmarEliminarPaciente.tsx
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useState } from "react"

interface ModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
  nombrePaciente: string
}

export const ModalConfirmarEliminarPaciente = ({ open, onClose, onConfirm, nombrePaciente }: ModalProps) => {
  const [loading, setLoading] = useState(false)

  const handleConfirm = async () => {
    setLoading(true)
    await onConfirm()
    setLoading(false)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-red-700">
            ¿Eliminar paciente "{nombrePaciente}"?
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-gray-600">
          Esta acción marcará al paciente como eliminado en la base de datos.
        </p>
        <DialogFooter className="gap-2 pt-4">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="default" onClick={handleConfirm} disabled={loading}>
            {loading ? "Eliminando..." : "Sí, eliminar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}