'use client'

import { ClinicaProvider } from '@/lib/ClinicaProvider'
import { LanguageProvider } from '@/i18n/LanguageProvider'
import GlobalSSEListener from '@/components/GlobalSSEListener'
import ErrorBoundary from '@/components/ui/ErrorBoundary'     // ✅
import { Toaster } from 'sonner'

export default function ClientLayout({
  children,
  clinicaInicial,
}: {
  children: React.ReactNode
  clinicaInicial: any
}) {
  return (
    <ClinicaProvider clinicaInicial={clinicaInicial}>
      <LanguageProvider>
        <ErrorBoundary>
          <GlobalSSEListener />
          {children}
        </ErrorBoundary>
      </LanguageProvider>
      <Toaster position="top-center" richColors />
    </ClinicaProvider>
  )
}