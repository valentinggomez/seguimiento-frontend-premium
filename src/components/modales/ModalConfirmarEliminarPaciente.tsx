'use client'

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline"
import { motion, AnimatePresence } from "framer-motion"
import { useState } from "react"
import { useTranslation } from "@/i18n/useTranslation"

interface ModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
  nombrePaciente: string
}

export const ModalConfirmarEliminarPaciente = ({
  open,
  onClose,
  onConfirm,
  nombrePaciente,
}: ModalProps) => {
  const [loading, setLoading] = useState(false)
  const { t } = useTranslation()

  const handleConfirm = async () => {
    setLoading(true)
    await onConfirm()
    setLoading(false)
    onClose()
  }

  return (
    <AnimatePresence>
      {open && (
        <Dialog open={open} onOpenChange={onClose}>
          <DialogContent className="max-w-md p-6 rounded-xl shadow-xl bg-white border">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <DialogHeader className="flex flex-col items-center text-center">
                <ExclamationTriangleIcon className="w-8 h-8 text-red-600 mb-2" />
                <DialogTitle className="text-xl font-semibold text-red-700">
                  {t("eliminar_paciente.titulo", {
                    nombre: nombrePaciente,
                  })}
                </DialogTitle>
              </DialogHeader>

              <p className="text-sm text-gray-600 mt-2 text-center">
                {t("eliminar_paciente.descripcion")}
              </p>

              <p className="text-xs text-gray-400 text-center mt-1">
                {t("eliminar_paciente.trazabilidad")}
              </p>

              <DialogFooter className="mt-6 flex justify-center gap-4">
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="border-gray-300 text-gray-700 hover:bg-gray-100"
                >
                  {t("eliminar_paciente.cancelar")}
                </Button>
                <Button
                  onClick={handleConfirm}
                  disabled={loading}
                  className="bg-red-600 text-white shadow-md hover:brightness-110 transition"
                >
                  {loading
                    ? t("eliminar_paciente.eliminando")
                    : t("eliminar_paciente.confirmar")}
                </Button>
              </DialogFooter>
            </motion.div>
          </DialogContent>
        </Dialog>
      )}
    </AnimatePresence>
  )
}