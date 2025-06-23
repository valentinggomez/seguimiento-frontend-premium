"use client"

import { useEffect } from "react"
import SeccionAdminClinicas from "@/components/SeccionAdminClinicas"

export default function SeccionClinicas() {
  useEffect(() => {
    const hostname = window.location.hostname
    const searchParams = new URLSearchParams(window.location.search)
    const adminCode = searchParams.get('admin')

    // Si viene ?admin=valen, forzamos rol en localStorage
    if (adminCode === 'valen') {
      localStorage.setItem('usuario', JSON.stringify({ rol: 'superadmin' }))
      localStorage.setItem('rol', 'superadmin')
    }

    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}')
    const rol = localStorage.getItem('rol')

    const esValen =
      hostname === 'localhost' ||
      hostname.includes('valen') ||
      adminCode === 'valen'

    if ((usuario?.rol !== 'superadmin' && rol !== 'superadmin') && !esValen) {
      window.location.href = '/panel'
    }
  }, [])

  return <SeccionAdminClinicas />
}
