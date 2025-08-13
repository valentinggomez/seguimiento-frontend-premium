import { getAuthHeaders } from './getAuthHeaders';

const backendUrl = process.env.NEXT_PUBLIC_API_URL!;

export const fetchConToken = async (
  url: string,
  options: RequestInit = {},
  contentType?: string
) => {
  const headers = {
    ...getAuthHeaders(contentType || 'application/json'),
    ...(options.headers || {}),
  };

  // 🧠 Si ya es URL completa (http o https), no le agregamos backendUrl
  const finalUrl = url.startsWith('http') ? url : `${backendUrl}${url}`;

  return fetch(finalUrl, {
    ...options,
    headers,
  });
};