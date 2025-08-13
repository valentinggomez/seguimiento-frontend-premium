'use client'
import { useEffect, useMemo, useState } from 'react'
import { useClinica } from '@/lib/ClinicaProvider'

export function useClinicaId() {
  const ctx = useClinica?.()
  const [lsId, setLsId] = useState<string | null>(null)

  useEffect(() => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem('usuario') : null
      if (raw) {
        const u = JSON.parse(raw)
        setLsId(u?.clinica_id ?? null)
      }
    } catch {
      setLsId(null)
    }
  }, [])

  // prioridad: contexto > localStorage
  const id = useMemo(() => ctx?.clinica?.id ?? lsId ?? null, [ctx?.clinica?.id, lsId])

  return id
}