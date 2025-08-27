// src/lib/getAuthHeaders.ts
export function getAuthHeaders(contentType?: string): Record<string, string> {
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  // host sin puerto, ej: "miapp.com"
  const host =
    typeof window !== 'undefined'
      ? window.location.hostname.split(':')[0]
      : '';

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'x-clinica-host': host,
  };

  // Solo seteamos Content-Type si el caller lo pide explícitamente.
  // (Para FormData conviene NO setearlo y dejar que el browser ponga el boundary)
  if (contentType) {
    headers['Content-Type'] = contentType;
  }

  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}