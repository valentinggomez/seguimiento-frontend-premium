// src/components/ui/ErrorBoundary.tsx
'use client'
import React from 'react'

type Props = {
  children: React.ReactNode
  fallbackMessage?: string
}

type State = { hasError: boolean; error?: any }

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error }
  }

  componentDidCatch(error: any, info: any) {
    // podés loguear a un servicio externo acá
    console.error('ErrorBoundary atrapó un error:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 m-4 border border-red-200 bg-red-50 rounded-2xl text-red-700">
          <h2 className="font-semibold mb-1">Ups, algo salió mal</h2>
          <p className="text-sm">{this.props.fallbackMessage || 'Intenta recargar la página.'}</p>
        </div>
      )
    }
    return this.props.children
  }
}