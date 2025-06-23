'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

export default function Home() {
  const [esAdmin, setEsAdmin] = useState(false)

  useEffect(() => {
    const host = window.location.host
    const params = new URLSearchParams(window.location.search)
    const adminCode = params.get('admin')

    // Solo activa el modo admin si el dominio es el principal y el código es correcto
    if (host.includes('seguimiento-frontend-premium.vercel.app') && adminCode === 'valen') {
      setEsAdmin(true)
    }

    // También podés habilitarlo en local si querés testear:
    if (host.includes('localhost') && adminCode === 'valen') {
      setEsAdmin(true)
    }
  }, [])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center text-[#003366] px-6">
      <h1 className="text-2xl font-bold mb-4">Bienvenido a SEGUIR+IA™</h1>
      <p className="mb-8 text-lg">Ingresá desde el link del paciente o accedé al panel administrativo.</p>

      <div className="flex gap-4">
        <Link
          href="/panel"
          className="bg-[#003366] hover:bg-[#002244] text-white font-medium py-2 px-5 rounded-xl transition-all"
        >
          Ir al panel
        </Link>

        {esAdmin && (
          <Link
            href="/panel/clinicas"
            className="bg-green-700 hover:bg-green-800 text-white font-medium py-2 px-5 rounded-xl transition-all"
          >
            🛠️ Modo Admin
          </Link>
        )}
      </div>
    </div>
  )
}
