// src/lib/fetchConToken.ts
import { getAuthHeaders } from './getAuthHeaders';

const backendUrl = process.env.NEXT_PUBLIC_API_URL!;

export const fetchConToken = async (
  url: string,
  options: RequestInit = {},
  contentType?: string
) => {
  const base = getAuthHeaders(contentType || 'application/json');

  // host del dominio actual (Vercel) para withClinica
  const clinicHost =
    typeof window !== 'undefined' ? window.location.hostname : undefined;

  const headers = {
    ...(clinicHost ? { 'x-clinica-host': clinicHost } : {}),
    ...base,
    ...(options.headers || {}),
  };

  const finalUrl = url.startsWith('http') ? url : `${backendUrl}${url}`;

  return fetch(finalUrl, {
    cache: 'no-store',      // evita respuestas cacheadas viejas
    ...options,
    headers,
  });
};