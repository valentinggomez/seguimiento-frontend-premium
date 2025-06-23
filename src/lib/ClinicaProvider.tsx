'use client'

import { createContext, useContext, useState, useEffect } from 'react'

type Clinica = {
  id: string
  nombre_clinica: string
  logo_url?: string
  color_primario?: string
  [key: string]: any
}

type ClinicaContextType = {
  clinica: Clinica | null
}

const ClinicaContext = createContext<ClinicaContextType | null>(null)

export const ClinicaProvider = ({
  children,
  clinicaInicial = null,
}: {
  children: React.ReactNode
  clinicaInicial?: Clinica | null
}) => {
  const [clinica, setClinica] = useState<Clinica | null>(clinicaInicial)
  console.log('📦 clinicaInicial recibida en Provider:', clinicaInicial)


  // fallback opcional si clinicaInicial no llegó
  useEffect(() => {
    if (!clinica && typeof window !== 'undefined') {
      console.warn('⚠️ No se recibió clínica inicial. Activar fallback si es necesario.')
    }
  }, [clinica])

  return (
    <ClinicaContext.Provider value={{ clinica }}>
      {children}
    </ClinicaContext.Provider>
  )
}

export const useClinica = () => {
  const context = useContext(ClinicaContext)
  if (!context) {
    console.warn('useClinica debe usarse dentro de <ClinicaProvider>')
    return { clinica: null }
  }
  return context
}
