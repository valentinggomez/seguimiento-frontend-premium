// src/lib/fetchConToken.ts
import { getAuthHeaders } from './getAuthHeaders';

const backendUrl = process.env.NEXT_PUBLIC_API_URL!;

type FetchConTokenOpts = RequestInit & {
  /** si false, NO redirige automáticamente en 401 */
  redirectOn401?: boolean;
  /** Content-Type deseado; si omitís, no seteamos ninguno */
  contentType?: string;
};

export const fetchConToken = async (
  url: string,
  options: FetchConTokenOpts = {}
) => {
  const {
    redirectOn401 = true,
    contentType,              // ← si querés JSON, pasá 'application/json'
    headers: callerHeaders,
    ...rest
  } = options;

  // headers base con (opcional) contentType
  const base = getAuthHeaders(contentType);

  // el caller puede sobreescribir algo puntual
  const headers: Record<string, string> = {
    ...base,
    ...(callerHeaders as any),
  };

  // Normalizamos x-clinica-host (por si el caller lo pasó distinto)
  if (typeof window !== 'undefined') {
    headers['x-clinica-host'] = window.location.hostname.split(':')[0];
  }

  // URL absoluta si hace falta
  const finalUrl = url.startsWith('http') ? url : `${backendUrl}${url}`;

  const res = await fetch(finalUrl, {
    cache: 'no-store',
    ...rest,
    headers,
  });

  // manejo global de sesión expirada
  if (res.status === 401 && redirectOn401 && typeof window !== 'undefined') {
    try {
      localStorage.removeItem('token');
    } catch {}
    // opcional: recordar a dónde volver
    const back = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = `/login?next=${back}`;
    // devolvemos la Response igualmente por si el caller la quiere inspeccionar
  }

  return res;
};