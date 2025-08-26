'use client'

import { ClinicaProvider } from '@/lib/ClinicaProvider'

export default function ClientLayout({
  children,
  clinicaInicial,
}: {
  children: React.ReactNode
  clinicaInicial: any
}) {
  return (
    <ClinicaProvider clinicaInicial={clinicaInicial}>
      {children}
    </ClinicaProvider>
  )
}
