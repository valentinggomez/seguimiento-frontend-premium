export const fetchConToken = (endpoint: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('token');

  const headers: HeadersInit = {
    ...(options.headers || {}),
    Authorization: token ? `Bearer ${token}` : '',
    'x-clinica-host': window.location.hostname,
  };

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  return fetch(`${baseUrl}${cleanEndpoint}`, {
    ...options,
    headers,
  });
};