import './globals.css'
import { headers } from 'next/headers'
import { ClinicaProvider } from '@/lib/ClinicaProvider'

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const headersList = await headers()
  const host = headersList.get('host')?.split(':')[0] || 'localhost'

  const res = await fetch(`https://seguimiento-backend-premium-production.up.railway.app/api/clinicas/clinica?host=${host}`, {
    cache: 'no-store',
  })


  const datos = await res.json()
  console.log('🎯 Clínica obtenida en layout:', datos.clinica)
  const clinica = res.ok ? datos.clinica : null


  return (
    <html lang="es">
      <body>
        <ClinicaProvider clinicaInicial={clinica}>
          {children}
        </ClinicaProvider>
      </body>
    </html>
  )
}
