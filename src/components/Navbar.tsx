'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useClinica } from '@/lib/ClinicaProvider'
import { useEffect, useRef, useState } from 'react'
import { eventBus } from '@/lib/eventBus'
import { toast } from 'sonner'
import { getAuthHeaders } from '@/lib/getAuthHeaders'
import { useTranslation } from '@/i18n/useTranslation'

/* ------------------ UserMenu ------------------ */
function parseJwtEmail(): string | null {
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    if (!token) return null
    const [, payload] = token.split('.')
    if (!payload) return null
    const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
    const email = json?.email || json?.sub || null
    return typeof email === 'string' ? email : null
  } catch {
    return null
  }
}

function UserMenu() {
  const [open, setOpen] = useState(false)
  const [initial, setInitial] = useState<string>('?')
  const [email, setEmail] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const savedEmail = typeof window !== 'undefined' ? localStorage.getItem('email') : null
    const mail = savedEmail || parseJwtEmail()
    setEmail(mail)
    setInitial(mail?.[0]?.toUpperCase() || 'U')
  }, [])

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!open) return
      const target = e.target as Node
      if (menuRef.current && !menuRef.current.contains(target)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const logout = () => {
    try {
      localStorage.removeItem('token')
      localStorage.removeItem('email')
      localStorage.removeItem('rol')
    } catch {}
    window.location.href = '/login'
  }

  return (
    <div className="relative z-50" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="w-9 h-9 rounded-full bg-slate-800 text-white flex items-center justify-center font-semibold shadow-sm ring-1 ring-slate-900/10 hover:opacity-90"
        title={email || 'Usuario'}
      >
        {initial}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 mt-2 w-48 rounded-2xl border border-slate-200 bg-white shadow-lg p-1"
        >
          {email && (
            <div className="px-3 py-2 text-xs text-slate-600 border-b mb-1 truncate">
              {email}
            </div>
          )}

          <button
            role="menuitem"
            onClick={logout}
            className="w-full text-left px-3 py-2 text-sm rounded-lg text-red-600 hover:bg-red-50"
          >
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  )
}

/* ------------------ Navbar ------------------ */
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
        setTieneMensajesNoLeidos((data?.cantidad || 0) > 0)
      } catch (error) {
        console.error('Error al verificar mensajes no leídos', error)
      }
    }
    verificarMensajesNoLeidos()
    const intervalo = setInterval(verificarMensajesNoLeidos, 10000)
    return () => clearInterval(intervalo)
  }, [])
  
  useEffect(() => {
    const preload = new Audio('/sounds/notificacion.wav')
    preload.load()
  }, [])
  
  useEffect(() => {
    const rolGuardado = typeof window !== 'undefined' ? localStorage.getItem('rol') : null
    setRol(rolGuardado)

    const reproducirSonido = () => {
      const audio = new Audio('/sounds/notificacion.wav')
      audio.play().catch(() => {})
    }

    const handler = (mensaje: any) => {
      if (mensaje?.tipo === 'nuevo_mensaje') {
        setTieneMensajesNoLeidos(true)
        toast.info(`📩 Nuevo mensaje de ${mensaje.nombre}`, {
          description: 'Haz clic en Interacciones para verlo.',
          duration: 4000,
        })
        reproducirSonido()
      }
    }

    eventBus.on('nuevo_mensaje', handler)
    return () => { eventBus.off('nuevo_mensaje', handler) }
  }, [])

  useEffect(() => {
    const eventSource = new EventSource(`${process.env.NEXT_PUBLIC_API_URL}/api/sse`)
    eventSource.onmessage = (e) => {
      const data = JSON.parse(e.data)
      if (data.tipo === 'nuevo_mensaje') {
        setTieneMensajesNoLeidos(true)
        eventBus.emit('nuevo_mensaje', data)
      }
    }
    return () => { eventSource.close() }
  }, [])

  const linkClasses = (path: string) =>
    `transition-all px-3 py-1.5 rounded-lg font-medium ${
      pathname === path
        ? 'text-[#003466] bg-gray-100 shadow-sm'
        : 'text-gray-600 hover:text-[#003466] hover:bg-gray-50'
    }`

  return (
    <header className="w-full bg-white/90 backdrop-blur border-b border-gray-200 shadow-sm sticky top-0 z-30 overflow-visible">
      <div className="w-full max-w-7xl mx-auto flex items-center justify-between gap-3 px-4 sm:px-8 py-3 overflow-visible">

        {/* Avatar + logo */}
        <div className="flex items-center gap-3 min-w-0 max-w-[40%] truncate">
          <UserMenu />
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
        <nav className="flex items-center gap-2 sm:gap-3 text-sm sm:text-base overflow-x-auto whitespace-nowrap scrollbar-hide max-w-full pl-2 pr-1 flex-1 justify-end">
          <Link href="/panel" className={linkClasses('/panel')}>{t('navbar.inicio')}</Link>
          <Link href="/panel/paciente" className={linkClasses('/panel/paciente')}>{t('navbar.registrar')}</Link>
          <Link href="/panel/respuestas" className={linkClasses('/panel/respuestas')}>{t('navbar.respuestas')}</Link>
          <Link href="/panel/analytics" className={linkClasses('/panel/analytics')}>{t('navbar.analytics')}</Link>
          <Link href="/panel/pacientes" className={linkClasses('/panel/pacientes')}>{t('navbar.pacientes')}</Link>

          <Link href="/panel/interacciones" className={`${linkClasses('/panel/interacciones')} relative`}>
            {t('navbar.interacciones')}
            {tieneMensajesNoLeidos && (
              <span className="absolute -top-1 -right-1 block h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse shadow-sm" />
            )}
          </Link>

          {(rol === 'superadmin' || rol === 'admin') && (
            <Link href="/panel/logs" className={linkClasses('/panel/logs')}>{t('navbar.logs')}</Link>
          )}

          {rol === 'superadmin' && (
            <Link href="/panel/clinicas" className={linkClasses('/panel/clinicas')}>{t('navbar.clinicas')}</Link>
          )}

          {/* Idioma */}
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as 'es' | 'en')}
            className="ml-1 sm:ml-2 px-3 py-1 rounded-xl shadow-sm border border-slate-300 text-sm bg-white hover:cursor-pointer"
            aria-label="Cambiar idioma"
          >
            <option value="es">🇦🇷 Español</option>
            <option value="en">🇺🇸 English</option>
          </select>
        </nav>
      </div>
    </header>
  )
}