'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import translations from './translations.json'

type AvailableLanguages = keyof typeof translations // 'es' | 'en'
type Language = AvailableLanguages

interface LanguageContextProps {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string) => string
}

const LanguageContext = createContext<LanguageContextProps>({
  language: 'es',
  setLanguage: () => {},
  t: (key: string) => key
})

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const [language, setLanguage] = useState<Language>('es')

  useEffect(() => {
    const stored = localStorage.getItem('lang') as Language | null
    const detected = navigator.language.slice(0, 2)
    const lang: Language = ['es', 'en', 'pt'].includes(detected) ? (detected as Language) : 'es'
    setLanguage(stored ?? lang)
  }, [])

  const changeLanguage = (lang: Language) => {
    setLanguage(lang)
    localStorage.setItem('lang', lang)
  }

  const t = (key: string): string => {
    const parts = key.split('.')
    const root = translations[language] ?? translations['es'] // fallback seguro
    let value: any = root

    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part]
      } else {
        return key
      }
    }

    return typeof value === 'string' ? value : key
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage: changeLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export const useLanguage = () => useContext(LanguageContext)