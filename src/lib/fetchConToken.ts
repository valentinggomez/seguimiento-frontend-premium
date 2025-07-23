const backendUrl = process.env.NEXT_PUBLIC_API_URL!;

export const fetchConToken = async (url: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'x-clinica-host': window.location.hostname,
    ...(options.headers || {}),
  };

  // 🧠 Si ya es URL completa (http o https), no le agregamos backendUrl
  const finalUrl = url.startsWith('http') ? url : `${backendUrl}${url}`;

  return fetch(finalUrl, {
    ...options,
    headers,
  });
};