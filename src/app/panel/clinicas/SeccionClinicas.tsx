"use client"

import { useEffect, useState } from "react"
import SeccionAdminClinicas from "@/components/SeccionAdminClinicas"

export default function SeccionClinicas() {
  const [autorizado, setAutorizado] = useState(false)

  useEffect(() => {
    const hostname = window.location.hostname
    const searchParams = new URLSearchParams(window.location.search)
    const adminCode = searchParams.get("admin")

    // Si viene ?admin=valen, lo guardamos como superadmin
    if (adminCode === "valen") {
      localStorage.setItem("rol", "superadmin")
      localStorage.setItem("usuario", JSON.stringify({ rol: "superadmin" }))
    }

    // Esperamos medio segundo para asegurar que localStorage se actualice
    setTimeout(() => {
      const usuario = JSON.parse(localStorage.getItem("usuario") || "{}")
      const rol = localStorage.getItem("rol")

      const esValen =
        hostname === "localhost" ||
        hostname.includes("valen") ||
        adminCode === "valen"

      if (usuario?.rol === "superadmin" || rol === "superadmin" || esValen) {
        setAutorizado(true)
      } else {
        window.location.href = "/panel"
      }
    }, 500)
  }, [])

  if (!autorizado) {
    return (
      <div className="text-center mt-20 text-gray-500">
        Verificando acceso a Modo Admin...
      </div>
    )
  }

  return <SeccionAdminClinicas />
}
