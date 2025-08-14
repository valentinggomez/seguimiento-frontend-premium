// lib/getAuthHeaders.ts
export function getAuthHeaders(contentType = 'application/json'): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  if (process.env.NODE_ENV === 'development') {
    console.log('[getAuthHeaders]', { token, host: typeof window !== 'undefined' ? window.location.hostname : '' });
  }
  return {
    'Content-Type': contentType,
    'x-clinica-host': typeof window !== 'undefined' ? window.location.hostname : '',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  
}