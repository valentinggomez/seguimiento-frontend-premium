export async function fetchSinToken(endpoint: string, options: RequestInit = {}) {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || ''

  const headers = {
    'Content-Type': 'application/json',
    'X-Clinica-Host': window.location.hostname, // 👈 clave para multiclínica
    ...(options.headers || {}),
  }

  return fetch(`${baseUrl}${endpoint}`, {
    ...options,
    headers,
  })
}