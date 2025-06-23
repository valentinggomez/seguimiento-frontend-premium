'use client'

import { createContext, useContext, useState, useEffect } from 'react'

type Clinica = {
  id: string
  nombre_clinica: string
  logo_url?: string
  color_primario?: string
  columnas_exportables?: string[]
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
  const [clinica, setClinica] = useState<Clinica | null>(null)

  // Validar y normalizar columnas_exportables al iniciar
  useEffect(() => {
    if (clinicaInicial) {
      const normalizada = { ...clinicaInicial }

      if (!Array.isArray(normalizada.columnas_exportables)) {
        if (typeof normalizada.columnas_exportables === "string") {
          const str = normalizada.columnas_exportables as string
          normalizada.columnas_exportables = str.split(",").map((s: string) => s.trim())
        } else {
          normalizada.columnas_exportables = []
        }
      }

      setClinica(normalizada)
    }
  }, [clinicaInicial])

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
