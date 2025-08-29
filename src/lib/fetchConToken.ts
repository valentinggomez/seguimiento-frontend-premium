// src/lib/fetchConToken.ts
import { getAuthHeaders } from './getAuthHeaders'

const backendUrl = process.env.NEXT_PUBLIC_API_URL || ''

type FetchConTokenOpts = RequestInit & {
  /** si false, NO redirige automáticamente en 401 */
  redirectOn401?: boolean
  /** Forzar Content-Type (ej: 'application/json'). Si omitís, auto-detecta */
  contentType?: string
  /** Reintentos ante 5xx / network */
  retries?: number
  /** Timeout en ms */
  timeoutMs?: number
}

// Helper: arma URL absoluta
function abs(url: string) {
  if (!url) return ''
  if (/^https?:\/\//i.test(url)) return url
  return `${backendUrl}${url.startsWith('/') ? url : `/${url}`}`
}

// Helper: timeout
async function withTimeout<T>(p: Promise<T>, ms = 15000): Promise<T> {
  if (!ms) return p
  let t: any
  const timeout = new Promise<never>((_, rej) => {
    t = setTimeout(() => rej(new Error('Request timeout')), ms)
  })
  try {
    return await Promise.race([p, timeout])
  } finally {
    clearTimeout(t)
  }
}

export const fetchConToken = async (
  url: string,
  options: FetchConTokenOpts = {}
) => {
  const {
    redirectOn401 = true,
    contentType,
    headers: callerHeaders,
    body: callerBody,
    retries = 0,
    timeoutMs = 15000,
    ...rest
  } = options

  // ¿es FormData?
  const isFormData =
    typeof FormData !== 'undefined' && callerBody instanceof FormData

  // ¿JSON-like?
  const isJsonLike =
    !isFormData &&
    callerBody !== undefined &&
    (typeof callerBody === 'object' || typeof callerBody === 'string')

  // Headers base (auth + content-type si corresponde)
  const base = getAuthHeaders(
    contentType ?? (isJsonLike ? 'application/json' : undefined)
  )

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...base,
    ...(callerHeaders as any),
  }

  // Si es FormData que el browser ponga el boundary
  if (isFormData) {
    delete headers['Content-Type']
  }

  // x-clinica-host normalizado (multiclínica)
  if (typeof window !== 'undefined') {
    headers['x-clinica-host'] = window.location.hostname.split(':')[0].toLowerCase()
  }

  // Normalizar body
  let body: BodyInit | undefined = callerBody as any
  if (!isFormData && isJsonLike && typeof callerBody === 'object') {
    body = JSON.stringify(callerBody)
  }

  // Reintentos basados en 5xx / fallos de red
  const finalUrl = abs(url)
  let attempt = 0
  let lastErr: any

  while (attempt <= retries) {
    try {
      const res = await withTimeout(
        fetch(finalUrl, {
          cache: 'no-store',
          ...rest,
          headers,
          body,
        }),
        timeoutMs
      )

      if (res.status === 401 && redirectOn401 && typeof window !== 'undefined') {
        try { localStorage.removeItem('token') } catch {}
        const back = encodeURIComponent(window.location.pathname + window.location.search)
        window.location.href = `/login?next=${back}`
        return res
      }

      if (!res.ok && res.status >= 500 && attempt < retries) {
        attempt++
        await new Promise(r => setTimeout(r, 300 * attempt))
        continue
      }

      return res
    } catch (e) {
      lastErr = e
      if (attempt < retries) {
        attempt++
        await new Promise(r => setTimeout(r, 300 * attempt))
        continue
      }
      throw lastErr
    }
  }

  // Inalcanzable
  throw lastErr || new Error('Fetch failed')
}