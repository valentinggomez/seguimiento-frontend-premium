'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useClinica } from '@/lib/ClinicaProvider'
import { fetchSinToken } from '@/lib/fetchSinToken'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const { clinica } = useClinica()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    try {
      const res = await fetchSinToken('/api/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Error al iniciar sesión')
      }

      localStorage.setItem('token', data.token)

      const meRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/me`, {
        headers: { Authorization: `Bearer ${data.token}` },
      })
      const usuario = await meRes.json()

      localStorage.setItem('rol', usuario.rol)
      localStorage.setItem('usuario', JSON.stringify(usuario))

      router.push('/panel')
    } catch (err: any) {
      setError(err.message)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f9fbff] to-[#e6eef8] px-4">
      <form
        onSubmit={handleLogin}
        className="bg-white/80 backdrop-blur-sm shadow-[0_4px_24px_rgba(0,0,0,0.06)] rounded-2xl p-8 w-full max-w-md transition-all duration-500 ease-in-out"
      >
        {clinica ? (
          <div className="text-center mb-6">
            <img
              src={clinica.logo_url}
              alt="Logo clínica"
              className="w-20 h-20 object-contain mx-auto mb-2"
            />
            <h1 className="text-xl font-semibold text-gray-700 leading-snug">
              Ingresá al sistema médico de{' '}
              <span style={{ color: clinica.color_primario }}>
                {clinica.nombre_clinica}
              </span>
            </h1>
          </div>
        ) : (
          <h1 className="text-3xl font-bold text-center text-[#003466] mb-6">
            Iniciar sesión
          </h1>
        )}

        {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}

        <input
          type="email"
          aria-label="Correo institucional"
          placeholder="Correo institucional"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full px-4 py-2 mb-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
        />

        <input
          type="password"
          aria-label="Contraseña"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full px-4 py-2 mb-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
        />

        <button
          type="submit"
          className="w-full text-white py-2 font-semibold rounded-md shadow-sm transition hover:shadow-md hover:scale-[1.01]"
          style={{
            backgroundColor: clinica?.color_primario || '#003466',
          }}
        >
          Iniciar sesión
        </button>

        <p className="text-sm text-center text-gray-500 mt-4">
          ¿Todavía no tenés cuenta?{' '}
          <a href="/registro" className="text-blue-600 font-medium hover:underline">
            Registrarme
          </a>
        </p>
      </form>
    </div>
  )
}