// src/components/ui/AsyncStates.tsx
'use client'

export function LoadingSpinner({ label = 'Cargando…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center p-6 text-slate-600">
      <svg className="animate-spin mr-3 h-5 w-5" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
      </svg>
      <span className="text-sm">{label}</span>
    </div>
  )
}

export function EmptyState({ label = 'Sin datos para mostrar' }: { label?: string }) {
  return (
    <div className="p-8 text-center text-slate-500">
      <div className="text-2xl mb-2">🗂️</div>
      <p className="text-sm">{label}</p>
    </div>
  )
}