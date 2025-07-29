export function formatFechaLocal(fechaISO: string | Date): string {
  const fecha = new Date(fechaISO)

  return fecha.toLocaleString(undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}