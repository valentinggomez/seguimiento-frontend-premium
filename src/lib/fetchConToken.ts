export async function fetchConToken(
  input: RequestInfo,
  init: RequestInit = {}
): Promise<Response> {
  const token = localStorage.getItem('token');
  const headers = {
    ...init.headers,
    Authorization: `Bearer ${token}`,
    'x-clinica-host': window.location.hostname,
    'Content-Type': 'application/json',
  };

  return fetch(input, { ...init, headers });
}