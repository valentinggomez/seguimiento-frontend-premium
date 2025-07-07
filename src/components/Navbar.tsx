'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useClinica } from '@/lib/ClinicaProvider'
import { useEffect, useState } from 'react'

export default function Navbar() {
  const pathname = usePathname()
  const { clinica } = useClinica()
  const [rol, setRol] = useState<string | null>(null)
  const [tieneMensajesNoLeidos, setTieneMensajesNoLeidos] = useState(false)

  useEffect(() => {
    const verificarMensajesNoLeidos = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/interacciones/noleidos`, {
          headers: {
            'x-clinica-host': window.location.hostname
          }
        })
        const data = await res.json()
        setTieneMensajesNoLeidos(data.cantidad > 0)
      } catch (error) {
        console.error('Error al verificar mensajes no leídos', error)
      }
    }

    verificarMensajesNoLeidos()
    const intervalo = setInterval(verificarMensajesNoLeidos, 10000) // cada 10s

    return () => clearInterval(intervalo)
  }, [])

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
          <Link href="/panel/interacciones" className={`${linkClasses('/panel/interacciones')} relative`}>
            Interacciones
            {tieneMensajesNoLeidos && (
              <span className="absolute -top-1 -right-1 block h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse shadow-sm"></span>
            )}
          </Link>
          {rol === 'superadmin' && (
            <Link href="/panel/clinicas" className={linkClasses('/panel/clinicas')}>Clínicas</Link>
          )}
        </nav>
      </div>
    </header>
  )
}
