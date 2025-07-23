// app/login/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    try {
      // 1. Login: obtener token
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Error al iniciar sesión')
      }

      // 2. Guardar token
      localStorage.setItem('token', data.token)

      // 3. Obtener info del usuario (rol, clinica_id, etc)
      const meRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/me`, {
        headers: {
          'Authorization': `Bearer ${data.token}`
        }
      })

      const usuario = await meRes.json()

      // 4. Guardar rol y datos del usuario
      localStorage.setItem('rol', usuario.rol)
      localStorage.setItem('usuario', JSON.stringify(usuario))

      // 5. Redireccionar al panel
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
        <h1 className="text-3xl font-bold text-center text-[#003466] mb-6">
          Iniciar sesión
        </h1>

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
      </form>
    </div>
  )
}