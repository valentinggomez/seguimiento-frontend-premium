// src/hooks/useAuth.ts
'use client'

import { useEffect, useMemo, useState } from 'react'

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

export function useAuth() {
  const [email, setEmail] = useState<string | null>(null)
  const [role, setRole] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const savedEmail = localStorage.getItem('email') || parseJwtEmail()
    const savedRole = localStorage.getItem('rol')
    setEmail(savedEmail)
    setRole(savedRole)
  }, [])

  const initial = useMemo(() => (email?.[0]?.toUpperCase() || 'U'), [email])

  const logout = () => {
    try {
      localStorage.removeItem('token')
      localStorage.removeItem('email')
      localStorage.removeItem('rol')
    } catch {}
    if (typeof window !== 'undefined') window.location.href = '/login'
  }

  return { email, role, initial, logout }
}