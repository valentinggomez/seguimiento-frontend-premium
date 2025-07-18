export async function getDashboardStats(clinica_id: string) {
  try {
    const token = localStorage.getItem('token');

    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/dashboard`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'x-clinica-host': window.location.hostname
      }
    });

    if (!res.ok) {
      console.error('❌ Error en fetch del dashboard:', res.status);
      return null;
    }

    const data = await res.json();
    return data;
  } catch (error) {
    console.error('❌ Error en getDashboardStats:', error);
    return null;
  }
}