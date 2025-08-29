// src/lib/fetchSinToken.tsx
// Nota: mantiene la misma firma y devuelve Response para no romper usos existentes.

const BASE = process.env.NEXT_PUBLIC_API_URL || ''

type FetchOpts = RequestInit & {
  retries?: number
  timeoutMs?: number
}

function abs(url: string) {
  if (!url) return ''
  if (/^https?:\/\//i.test(url)) return url
  return `${BASE}${url.startsWith('/') ? url : `/${url}`}`
}

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

export async function fetchSinToken(endpoint: string, options: FetchOpts = {}) {
  const { headers: callerHeaders, body: callerBody, retries = 0, timeoutMs = 15000, ...rest } = options

  const isFormData =
    typeof FormData !== 'undefined' && callerBody instanceof FormData

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(callerHeaders as any),
  }

  // Content-Type solo si NO es FormData
  if (!isFormData) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json'
  }

  // x-clinica-host (si hay window)
  if (typeof window !== 'undefined') {
    headers['x-clinica-host'] = window.location.hostname.split(':')[0].toLowerCase()
  }

  // Normalizar body si es objeto y Content-Type es JSON
  let body: BodyInit | undefined = callerBody as any
  if (!isFormData && callerBody && typeof callerBody === 'object') {
    try {
      body = JSON.stringify(callerBody)
    } catch {}
  }

  const url = abs(endpoint)
  let attempt = 0
  let lastErr: any

  while (attempt <= retries) {
    try {
      const res = await withTimeout(
        fetch(url, {
          cache: 'no-store',
          ...rest,
          headers,
          body,
        }),
        timeoutMs
      )

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

  throw lastErr || new Error('Fetch failed')
}