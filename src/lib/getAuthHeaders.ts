// lib/getAuthHeaders.ts
export function getAuthHeaders(contentType = 'application/json'): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  return {
    'Content-Type': contentType,
    'x-clinica-host': typeof window !== 'undefined' ? window.location.hostname : '',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}