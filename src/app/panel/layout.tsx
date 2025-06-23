'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useClinica } from '@/lib/ClinicaProvider'
import Navbar from '@/components/Navbar'

function PanelContenido({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { clinica } = useClinica()
  const [esperar, setEsperar] = useState(true)

  useEffect(() => {
    const timeout = setTimeout(() => setEsperar(false), 2000)
    return () => clearTimeout(timeout)
  }, [])

  useEffect(() => {
    if (!esperar && !clinica?.id) {
      router.push('/responder/error')
    }
  }, [clinica, esperar])

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
