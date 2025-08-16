'use client'

import { useEffect, useRef, useCallback, useState } from 'react'

type Options = {
  src?: string
  volume?: number         // 0..1
  cooldownMs?: number     // anti-ráfaga
  allowWhenHidden?: boolean // reproducir aunque document.hidden = true
}

export function useSonidoNotificacion(opts: Options = {}) {
  const {
    src: initialSrc = '/sounds/notificacion.wav',
    volume: initialVolume = 1,
    cooldownMs = 2000,
    allowWhenHidden = false,
  } = opts

  const [src, setSrc] = useState(initialSrc)
  const [volume, setVolume] = useState(initialVolume)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const lastPlayAtRef = useRef<number>(0)
  const unlockedRef = useRef<boolean>(false)

  useEffect(() => {
    if (typeof window === 'undefined' || typeof Audio === 'undefined') return
    const audio = new Audio(src)
    audio.preload = 'auto'
    audio.crossOrigin = 'anonymous'
    audio.volume = Math.max(0, Math.min(1, volume))
    audio.addEventListener('ended', () => {
      try { audio.currentTime = 0 } catch {}
    })
    audioRef.current = audio

    // si cambia src/volume, volvemos a requerir desbloqueo
    unlockedRef.current = false
    lastPlayAtRef.current = 0

    return () => {
      try {
        audio.pause()
        // @ts-ignore
        audio.src = ''
      } catch {}
      audioRef.current = null
    }
  }, [src, volume])

  const reproducir = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    if (!allowWhenHidden && typeof document !== 'undefined' && document.hidden) return

    const now = Date.now()
    if (now - lastPlayAtRef.current < cooldownMs) return

    try {
      if (!Number.isNaN(audio.duration)) audio.currentTime = 0
      const p = audio.play()
      if (p && typeof p.catch === 'function') p.catch(() => {})
      lastPlayAtRef.current = now
    } catch {}
  }, [cooldownMs, allowWhenHidden])

  // Desbloquea el audio en el primer gesto del usuario sin sonido
  const desbloquear = useCallback(() => {
    if (unlockedRef.current) return
    const audio = audioRef.current
    if (!audio) return
    try {
      const prevMuted = audio.muted
      audio.muted = true
      const p = audio.play()
      if (p && typeof p.then === 'function') {
        p.then(() => {
          try {
            if (!Number.isNaN(audio.duration)) {
              audio.pause()
              audio.currentTime = 0
            }
          } catch {}
          audio.muted = prevMuted
          unlockedRef.current = true
        }).catch(() => {
          audio.muted = prevMuted
        })
      } else {
        audio.pause()
        audio.currentTime = 0
        audio.muted = prevMuted
        unlockedRef.current = true
      }
    } catch {}
  }, [])

  return { reproducir, desbloquear, setSrc, setVolume }
}