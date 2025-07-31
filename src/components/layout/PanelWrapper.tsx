'use client'

import { useTranslation } from '@/i18n/useTranslation'
import { useEffect } from 'react'

interface PanelWrapperProps {
  children: React.ReactNode
  sectionKey?: string // opcional: para traducir títulos automáticos
}

export const PanelWrapper = ({ children, sectionKey }: PanelWrapperProps) => {
  const { t } = useTranslation()

  useEffect(() => {
    if (sectionKey) {
      document.title = t(`titulo.${sectionKey}`) // para cambiar <title> del tab
    }
  }, [sectionKey, t])

  return (
    <div className="px-4 sm:px-10 md:px-16 py-8">
      {/* Acá podrías agregar encabezados comunes, breadcrumb, etc */}
      {children}
    </div>
  )
}