'use client'

import { useEffect, useRef } from 'react'

export function useSonidoNotificacion() {
  const sonidoRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined' && typeof Audio !== 'undefined') {
      const audio = new Audio('/sounds/notificacion.wav')
      audio.load()
      sonidoRef.current = audio
    }
  }, [])

  const reproducir = () => {
    const audio = sonidoRef.current
    if (audio) {
      try { 
        if (!isNaN(audio.duration)) {
          audio.currentTime = 0
        }
        audio.play().catch(() => {})
      } catch (err) {
        console.warn('🔇 Error al reproducir sonido:', err)
      }
    }
  }

  const desbloquear = () => {
    const audio = sonidoRef.current
    if (audio) {
      audio.play()
        .then(() => {
          if (!isNaN(audio.duration)) {
            audio.pause()
            audio.currentTime = 0
          }
        })
        .catch(() => {})
    }
  }

  return { reproducir, desbloquear }
}