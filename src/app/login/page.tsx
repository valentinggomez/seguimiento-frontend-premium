'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useClinica } from '@/lib/ClinicaProvider'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()
  const { clinica } = useClinica() // ✅ destructuring directo

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al iniciar sesión')

      localStorage.setItem('token', data.token)

      const meRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/me`, {
        headers: { Authorization: `Bearer ${data.token}` }
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <form
        onSubmit={handleLogin}
        className="bg-white shadow-lg rounded-xl p-8 w-full max-w-md"
      >
        {clinica ? (
          <div className="text-center mb-6">
            <img
              src={clinica.logo_url}
              alt="Logo clínica"
              className="w-20 h-20 object-contain mx-auto mb-2"
            />
            <h1
              className="text-2xl font-bold"
              style={{ color: clinica.color_primario }}
            >
              Iniciar sesión — {clinica.nombre_clinica}
            </h1>
          </div>
        ) : (
          <h1 className="text-2xl font-bold text-[#003466] mb-6 text-center">
            Iniciar sesión
          </h1>
        )}

        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

        <input
          type="email"
          placeholder="Correo electrónico"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full px-4 py-2 mb-4 border rounded-md"
        />

        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full px-4 py-2 mb-6 border rounded-md"
        />

        <button
          type="submit"
          className="w-full bg-[#003466] text-white py-2 rounded-md hover:bg-[#002c55]"
        >
          Ingresar
        </button>

        <div className="mt-4 text-center">
          <p className="text-sm text-gray-500">¿No tenés cuenta?</p>
          <button
            type="button"
            onClick={() => router.push('/registro')}
            className="text-sm font-semibold text-blue-600 hover:underline"
          >
            Crear cuenta
          </button>
        </div>
      </form>
    </div>
  )
}