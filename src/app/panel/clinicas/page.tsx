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
    } else {
      setRol(rolGuardado)
      try {
        setUsuario(JSON.parse(usuarioGuardado))
      } catch (e) {
        console.error("Error al parsear usuario:", e)
        window.location.href = "/login"
      }
    }
  }, [])

  if (rol !== "superadmin") {
    return (
      <div className="p-10 text-center">
        <h1 className="text-3xl font-bold text-red-600 mb-4">Acceso restringido 🚫</h1>
        <p className="text-gray-600">Solo el usuario <strong>superadmin</strong> puede acceder a la gestión de clínicas.</p>
      </div>
    )
  }

  if (!usuario) {
    return <div className="p-10 text-center text-gray-500">Cargando usuario...</div>
  }

  return <SeccionAdminClinicas />
}
