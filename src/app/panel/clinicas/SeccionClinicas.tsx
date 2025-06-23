"use client"

import { useEffect } from "react"
import SeccionAdminClinicas from "@/components/SeccionAdminClinicas"

export default function SeccionClinicas() {
  useEffect(() => {
    const usuario = JSON.parse(localStorage.getItem("usuario") || "{}")
    const esValen = window.location.hostname === "localhost" || window.location.hostname.includes("valen")

    if (usuario?.rol !== "superadmin" && !esValen) {
      window.location.href = "/panel"
    }
  }, [])


  return <SeccionAdminClinicas />
}
