// src/lib/fetchConToken.ts
import { getAuthHeaders } from './getAuthHeaders';

const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';

let _redirectingToLogin = false;
function redirectToLoginOnce() {
  if (_redirectingToLogin) return;
  _redirectingToLogin = true;

  try { localStorage.removeItem('token'); } catch {}
  const current =
    typeof window !== 'undefined'
      ? window.location.pathname + window.location.search
      : '/';
  const next = encodeURIComponent(current || '/');
  // usa replace para evitar volver con back()
  window.location.replace(`/login?next=${next}`);
}

/**
 * fetchConToken
 * - Adjunta Authorization y x-clinica-host
 * - No fija Content-Type si el body es FormData
 * - Redirige al login en 401/419 (sesión expirada)
 */
export const fetchConToken = async (
  url: string,
  options: RequestInit = {},
  contentType?: string
) => {
  const isBrowser = typeof window !== 'undefined';
  const clinicHost = isBrowser ? window.location.hostname.split(':')[0] : undefined;

  // Auto Content-Type: si viene FormData, no setearlo
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const desiredContentType = isFormData ? undefined : (contentType || 'application/json');

  const baseHeaders = getAuthHeaders(desiredContentType);
  const merged = new Headers({
    ...(clinicHost ? { 'x-clinica-host': clinicHost } : {}),
    ...baseHeaders,
    ...(options.headers as Record<string, string> | undefined),
  });

  // Seguridad: si es FormData, eliminar Content-Type para que el navegador ponga el boundary correcto
  if (isFormData) merged.delete('Content-Type');

  const finalUrl = url.startsWith('http')
    ? url
    : (baseUrl ? `${baseUrl}${url}` : url);

  let res: Response;
  try {
    res = await fetch(finalUrl, {
      cache: 'no-store',
      credentials: 'include',
      ...options,
      headers: merged,
    });
  } catch (err) {
    // Error de red (offline, CORS, DNS). Propágalos para que el caller pueda decidir.
    throw err;
  }

  // Manejo global de sesión expirada / inválida
  if (res.status === 401 || res.status === 419) {
    console.warn('[auth] sesión expirada/invalidada -> login');
    redirectToLoginOnce();
  }

  return res;
};