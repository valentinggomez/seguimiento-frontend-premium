'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useClinica } from '@/lib/ClinicaProvider'
import { useEffect, useState } from 'react'
import { eventBus } from '@/lib/eventBus'
import { toast } from 'sonner'
import { getAuthHeaders } from '@/lib/getAuthHeaders'
import { useTranslation } from '@/i18n/useTranslation'

export default function Navbar() {
  const pathname = usePathname()
  const { clinica } = useClinica()
  const { language, t, setLanguage } = useTranslation()
  const [rol, setRol] = useState<string | null>(null)
  const [tieneMensajesNoLeidos, setTieneMensajesNoLeidos] = useState(false)

  useEffect(() => {
    const verificarMensajesNoLeidos = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/interacciones/noleidos`, {
          headers: getAuthHeaders()
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
    const preload = new Audio('/sounds/notificacion.wav')
    preload.load()
  }, [])
  
  useEffect(() => {
    const rolGuardado = localStorage.getItem('rol')
    setRol(rolGuardado)

    const reproducirSonido = () => {
      const audio = new Audio('/sounds/notificacion.wav')
      audio.play().catch(() => {
        console.warn('🔇 Sonido bloqueado por navegador hasta interacción del usuario')
      })
    }

    const handler = (mensaje: any) => {
      if (mensaje?.tipo === 'nuevo_mensaje') {
        setTieneMensajesNoLeidos(true)

        // ✅ Solo ejecutamos esto una vez acá
        toast.info(`📩 Nuevo mensaje de ${mensaje.nombre}`, {
          description: 'Haz clic en Interacciones para verlo.',
          duration: 4000,
        })

        reproducirSonido()
      }
    }

    eventBus.on('nuevo_mensaje', handler)
    return () => {
      eventBus.off('nuevo_mensaje', handler)
    }
  }, [])

  useEffect(() => {
    const eventSource = new EventSource(`${process.env.NEXT_PUBLIC_API_URL}/api/sse`)

    eventSource.onmessage = (e) => {
      const data = JSON.parse(e.data)

      if (data.tipo === 'nuevo_mensaje') {
        console.log('📥 Nuevo mensaje detectado por SSE:', data)

        // 🔴 Mostrar punto rojo visual
        setTieneMensajesNoLeidos(true)

        // 📡 Emitir evento global (el resto se maneja desde el eventBus)
        eventBus.emit('nuevo_mensaje', data)
      }
    }
    return () => {
      eventSource.close()
    }
  }, [])

  const linkClasses = (path: string) =>
    `transition-all px-3 py-1.5 rounded-lg font-medium ${
      pathname === path
        ? 'text-[#003466] bg-gray-100 shadow-sm'
        : 'text-gray-600 hover:text-[#003466] hover:bg-gray-50'
    }`

  return (
    <header className="w-full bg-white/90 backdrop-blur border-b border-gray-200 shadow-sm sticky top-0 z-30">
      <div className="w-full max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-8 py-3 overflow-x-auto">

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
        <nav className="flex gap-1 sm:gap-3 text-sm sm:text-base overflow-x-auto whitespace-nowrap scrollbar-hide max-w-full pl-2 pr-1">
          <Link href="/panel" className={linkClasses('/panel')}>
            {t('navbar.inicio')}
          </Link>

          <Link href="/panel/paciente" className={linkClasses('/panel/paciente')}>
            {t('navbar.registrar')}
          </Link>

          <Link href="/panel/respuestas" className={linkClasses('/panel/respuestas')}>
            {t('navbar.respuestas')}
          </Link>

          <Link href="/panel/pacientes" className={linkClasses('/panel/pacientes')}>
            {t('navbar.pacientes')}
          </Link>

          <Link href="/panel/interacciones" className={`${linkClasses('/panel/interacciones')} relative`}>
            {t('navbar.interacciones')}
            {tieneMensajesNoLeidos && (
              <span className="absolute -top-1 -right-1 block h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse shadow-sm"></span>
            )}
          </Link>

          {(rol === 'superadmin' || rol === 'admin') && (
            <Link href="/panel/logs" className={linkClasses('/panel/logs')}>
              {t('navbar.logs')}
            </Link>
          )}

          {rol === 'superadmin' && (
            <Link href="/panel/clinicas" className={linkClasses('/panel/clinicas')}>
              {t('navbar.clinicas')}
            </Link>
          )}
        </nav>
      </div>
      <select
        value={language}
        onChange={(e) => setLanguage(e.target.value as 'es' | 'en')}
        className="ml-4 px-2 py-1 border rounded"
      >
        <option value="es">🇦🇷 Español</option>
        <option value="en">🇺🇸 English</option>
      </select>
    </header>
  )
}
