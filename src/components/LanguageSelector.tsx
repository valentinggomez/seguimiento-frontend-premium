'use client'

import { useTranslation } from '@/i18n/useTranslation'

export default function LanguageSelector() {
  const { language, setLanguage } = useTranslation()

  return (
    <select
      value={language}
      onChange={(e) => {
        const value = e.target.value
        if (value === 'es' || value === 'en') {
          setLanguage(value as 'es' | 'en')
        }
      }}
      className="rounded-md border px-2 py-1 text-sm"
    >
      <option value="es">🇪🇸 Español</option>
      <option value="en">🇺🇸 English</option>
    </select>
  )
}