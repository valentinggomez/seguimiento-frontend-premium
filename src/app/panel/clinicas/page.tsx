// app/clinicas/page.tsx
"use client"

import SeccionAdminClinicas from "@/components/SeccionAdminClinicas"
import { useEffect, useState } from "react"

export default function PageClinicas() {
  const [rol, setRol] = useState<string | null>(null)
  const [usuario, setUsuario] = useState<any>(null)

  useEffect(() => {
    const rolGuardado = localStorage.getItem("rol")
    const usuarioGuardado = localStorage.getItem("usuario")
    if (!rolGuardado || !usuarioGuardado) {
      window.location.href = "/login"
      return
    }
    setRol(rolGuardado)
    try {
      setUsuario(JSON.parse(usuarioGuardado))
    } catch (e) {
      console.error("Error al parsear usuario:", e)
      window.location.href = "/login"
    }
  }, [])

  // ⏳ Esperar a tener usuario y rol antes de decidir acceso
  if (usuario === null || rol === null) {
    return <div className="p-10 text-center text-gray-500">Cargando…</div>
  }

  if (rol !== "superadmin") {
    return (
      <div className="p-10 text-center">
        <h1 className="text-3xl font-bold text-red-600 mb-4">Acceso restringido 🚫</h1>
        <p className="text-gray-600">
          Solo el usuario <strong>superadmin</strong> puede acceder a la gestión de clínicas.
        </p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-bold text-[#003366]">Administración de Clínicas</h1>
        {/* futuro: botón “Nueva clínica” */}
      </div>
      <SeccionAdminClinicas />
    </div>
  )
}