import './globals.css'
import { headers } from 'next/headers'
import { httpJson } from '@/lib/http'          // ✅ usa capa http nueva
import ClientLayout from './ClientLayout'      // ✅ envoltorio cliente con providers, ErrorBoundary, etc.

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const headersList = await headers()
  const host = headersList.get('host')?.split(':')[0] || 'localhost'

  // 🧠 ahora usamos httpJson contra el backend configurado por env
  const data = await httpJson<{ clinica?: any }>(`/api/clinicas/clinica?host=${host}`).catch(() => ({ clinica: null }))
  const clinica = data?.clinica || null

  return (
    <html lang="es">
      <body>
        {/* ClientLayout ya incluye ClinicaProvider, LanguageProvider, Toaster, ErrorBoundary, SSE listener */}
        <ClientLayout clinicaInicial={clinica}>
          {children}
        </ClientLayout>
      </body>
    </html>
  )
}