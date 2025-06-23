'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useClinica } from '@/lib/ClinicaProvider'
import { useEffect, useState } from 'react'

export default function Navbar() {
  const pathname = usePathname()
  const { clinica } = useClinica()
  const [rol, setRol] = useState<string | null>(null)

  useEffect(() => {
    const rolGuardado = localStorage.getItem('rol')
    setRol(rolGuardado)
  }, [])

  const linkClasses = (path: string) =>
    `transition-all px-3 py-1.5 rounded-lg font-medium ${
      pathname?.startsWith(path)
        ? 'text-[#003466] bg-gray-100 shadow-sm'
        : 'text-gray-600 hover:text-[#003466] hover:bg-gray-50'
    }`

  return (
    <header className="w-full bg-white/90 backdrop-blur border-b border-gray-200 shadow-sm sticky top-0 z-30">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-8 py-3">

        {/* Logo + nombre de clínica */}
        <div className="flex items-center gap-3 min-w-0 max-w-[70%] truncate">
          {clinica?.logo_url && (
            <img
              src={clinica.logo_url}
              alt="Logo clínica"
              className="w-9 h-9 object-contain rounded-md shrink-0"
            />
          )}
          <span className="truncate text-[15px] sm:text-lg font-semibold text-[#003466] whitespace-nowrap">
            {clinica?.nombre_clinica || 'SEGUIR+IA™'}
          </span>
        </div>

        {/* Navegación */}
        <nav className="flex gap-1 sm:gap-3 text-sm sm:text-base">
          <Link href="/panel" className={linkClasses('/panel')}>Inicio</Link>
          <Link href="/panel/paciente" className={linkClasses('/panel/paciente')}>Registrar</Link>
          <Link href="/panel/respuestas" className={linkClasses('/panel/respuestas')}>Respuestas</Link>
          {rol === 'superadmin' && (
            <Link href="/panel/clinicas" className={linkClasses('/panel/clinicas')}>Clínicas</Link>
          )}
        </nav>
      </div>
    </header>
  )
}
