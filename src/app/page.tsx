'use client'

import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center text-[#003366] px-6">
      <h1 className="text-2xl font-bold mb-4">Bienvenido a SEGUIR+IA™</h1>
      <p className="mb-8 text-lg">Ingresá desde el link del paciente o accedé al panel administrativo.</p>

      <Link
        href="/panel"
        className="bg-[#003366] hover:bg-[#002244] text-white font-medium py-2 px-5 rounded-xl transition-all"
      >
        Ir al panel
      </Link>
    </div>
  )
}
