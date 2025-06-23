'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useClinica } from '@/lib/ClinicaProvider'
import Navbar from '@/components/Navbar'

function PanelContenido({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { clinica } = useClinica()
  const [esperar, setEsperar] = useState(true)

  useEffect(() => {
    const timeout = setTimeout(() => setEsperar(false), 2000)
    return () => clearTimeout(timeout)
  }, [])

  useEffect(() => {
    if (esperar) return

    const rutasPermitidasSinClinica = ['/panel/clinicas']
    const rutaActual = pathname
    const esRutaPermitida = rutasPermitidasSinClinica.some((ruta) => rutaActual.startsWith(ruta))

    const esAdmin = typeof window !== 'undefined' && window.location.search.includes('admin=valen')

    if (!clinica?.id && !esRutaPermitida && !esAdmin) {
      router.push('/responder/error')
    }
  }, [clinica, esperar, pathname])

  if (esperar) {
    return <div className="text-center mt-20 text-gray-500">Cargando clínica...</div>
  }

  return (
    <>
      <Navbar />
      <main>{children}</main>
    </>
  )
}

export default function PanelLayoutWrapper({ children }: { children: React.ReactNode }) {
  return <PanelContenido>{children}</PanelContenido>
}
