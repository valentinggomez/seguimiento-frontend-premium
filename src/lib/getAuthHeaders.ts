// lib/getAuthHeaders.ts
export function getAuthHeaders(contentType = 'application/json'): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  return {
    'Content-Type': contentType,
    'x-clinica-host': typeof window !== 'undefined' ? window.location.hostname : '',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}