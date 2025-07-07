import { useEffect } from 'react'

type EventoSSE = {
  tipo: string
  paciente_id: string
  clinica_id: string
  nombre?: string
  fecha?: string
}

export function useSSE(onEvento: (data: EventoSSE) => void) {
  useEffect(() => {
    const source = new EventSource('/api/sse')

    source.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        console.log('📡 Evento SSE recibido:', data)
        onEvento(data)
      } catch (err) {
        console.error('❌ Error al parsear SSE:', err)
      }
    }

    source.onerror = (err) => {
      console.error('❌ Error en conexión SSE:', err)
      source.close()
    }

    return () => {
      source.close()
    }
  }, [onEvento])
}
