export async function fetchSinToken(endpoint: string, options: RequestInit = {}) {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || ''

  const headers = {
    'Content-Type': 'application/json',
    'x-clinica-host': window.location.hostname, // 👈 clave para multiclínica
    ...(options.headers || {}),
  }

  return fetch(`${baseUrl}${endpoint}`, {
    ...options,
    headers,
  })
}