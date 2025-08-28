// src/lib/fetchConToken.ts
import { getAuthHeaders } from './getAuthHeaders';

const backendUrl = process.env.NEXT_PUBLIC_API_URL!;

type FetchConTokenOpts = RequestInit & {
  /** si false, NO redirige automáticamente en 401 */
  redirectOn401?: boolean;
  /** Forzar Content-Type (ej: 'application/json'). Si omitís, auto-detecta. */
  contentType?: string;
};

export const fetchConToken = async (
  url: string,
  options: FetchConTokenOpts = {}
) => {
  const {
    redirectOn401 = true,
    contentType,                // si querés forzar, pasalo acá
    headers: callerHeaders,
    body: callerBody,
    ...rest
  } = options;

  // Detectar tipos de body
  const isFormData =
    typeof FormData !== 'undefined' && callerBody instanceof FormData;

  const isJsonLike =
    !isFormData &&
    callerBody !== undefined &&
    (typeof callerBody === 'object' || typeof callerBody === 'string');

  // Construir headers base (respetando contentType forzado)
  const base = getAuthHeaders(
    contentType ?? (isJsonLike ? 'application/json' : undefined)
  );

  // Armar headers finales (caller puede sobreescribir puntuales)
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...base,
    ...(callerHeaders as any),
  };

  // No seteamos Content-Type si es FormData (que lo ponga el browser)
  if (isFormData) {
    delete headers['Content-Type'];
  }

  // Normalizamos x-clinica-host
  if (typeof window !== 'undefined') {
    headers['x-clinica-host'] = window.location.hostname.split(':')[0].toLowerCase();
  }

  // Normalizar body (stringify si es objeto y vamos con JSON)
  let body: BodyInit | undefined = callerBody as any;
  if (!isFormData && isJsonLike && typeof callerBody === 'object') {
    body = JSON.stringify(callerBody);
  }

  // URL absoluta
  const finalUrl = url.startsWith('http') ? url : `${backendUrl}${url}`;

  const res = await fetch(finalUrl, {
    cache: 'no-store',
    ...rest,
    headers,
    body,
  });

  // Manejo global de sesión expirada
  if (res.status === 401 && redirectOn401 && typeof window !== 'undefined') {
    try { localStorage.removeItem('token'); } catch {}
    const back = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = `/login?next=${back}`;
  }

  return res;
};