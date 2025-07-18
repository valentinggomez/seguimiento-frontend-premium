export async function fetchConToken(
  input: string,
  init: RequestInit = {}
): Promise<Response> {
  const token = localStorage.getItem('token');
  const baseUrl = process.env.NEXT_PUBLIC_API_URL;

  const headers = {
    ...init.headers,
    Authorization: `Bearer ${token}`,
    'x-clinica-host': window.location.hostname,
    'Content-Type': 'application/json',
  };

  return fetch(`${baseUrl}${input}`, { ...init, headers });
}