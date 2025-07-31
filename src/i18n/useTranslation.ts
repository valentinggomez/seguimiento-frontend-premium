// /src/i18n/useTranslation.ts
'use client'

import { useLanguage } from './LanguageProvider'

/**
 * Hook de traducción multilenguaje institucional
 * Provee acceso al idioma actual, traductor `t()` y función para cambiar idioma.
 */
export const useTranslation = () => {
  const { t, setLanguage, language } = useLanguage()

  return {
    t,
    setLanguage,
    language
  }
}