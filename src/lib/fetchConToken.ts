export const fetchConToken = (endpoint: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('token');

  const headers: HeadersInit = {
    ...(options.headers || {}),
    Authorization: token ? `Bearer ${token}` : '',
    'x-clinica-host': window.location.hostname,
  };

  return fetch(`${process.env.NEXT_PUBLIC_API_URL}${endpoint}`, {
    ...options,
    headers,
  });
};