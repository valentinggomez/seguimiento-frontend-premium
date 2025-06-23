"use client"

import { useEffect } from "react"
import SeccionAdminClinicas from "@/components/SeccionAdminClinicas"

export default function SeccionClinicas() {
  useEffect(() => {
    const usuario = JSON.parse(localStorage.getItem("usuario") || "{}")
    const hostname = window.location.hostname
    const searchParams = new URLSearchParams(window.location.search)
    const adminCode = searchParams.get('admin')

    const esValen =
      hostname === "localhost" ||
      hostname.includes("valen") ||
      adminCode === "valen"

    if (usuario?.rol !== "superadmin" && !esValen) {
      window.location.href = "/panel"
    }
  }, [])


  return <SeccionAdminClinicas />
}
