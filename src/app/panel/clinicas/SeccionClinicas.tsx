"use client"

import { useEffect } from "react"
import SeccionAdminClinicas from "@/components/SeccionAdminClinicas"

export default function SeccionClinicas() {
  useEffect(() => {
    const usuario = JSON.parse(localStorage.getItem("usuario") || "{}")
    if (usuario?.rol !== "superadmin") {
      window.location.href = "/panel"
    }
  }, [])

  return <SeccionAdminClinicas />
}
