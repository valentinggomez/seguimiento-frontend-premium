'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function RegistroPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [codigoRegistro, setCodigoRegistro] = useState('')
  const [error, setError] = useState('')
  const [clinica, setClinica] = useState<any>(null)

  useEffect(() => {
    const usuario = localStorage.getItem('usuario')
    if (usuario) {
      router.push('/panel')
    }
  }, [])

  const handleRegistro = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      return setError('Las contraseñas no coinciden')
    }

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/registro`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, codigoRegistro }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Error al registrarse')
      }

      // Guardar token y datos
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
        onSubmit={handleRegistro}
        className="bg-white shadow-lg rounded-xl p-8 w-full max-w-md"
      >
        <h1 className="text-3xl font-bold text-center text-[#003466] mb-6">
          Crear cuenta médica
        </h1>

        {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}

        <input
          type="email"
          placeholder="Correo institucional"
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
          className="w-full px-4 py-2 mb-4 border rounded-md"
        />

        <input
          type="password"
          placeholder="Repetir contraseña"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          className="w-full px-4 py-2 mb-4 border rounded-md"
        />

        <input
          type="text"
          placeholder="Código de acceso de la clínica"
          value={codigoRegistro}
          onChange={(e) => setCodigoRegistro(e.target.value)}
          required
          className="w-full px-4 py-2 mb-6 border rounded-md"
        />

        <button
          type="submit"
          className="w-full bg-[#003466] text-white py-2 rounded-md hover:bg-[#002c55]"
        >
          Registrarme
        </button>

        <p className="text-sm text-center text-gray-500 mt-4">
          ¿Ya tenés cuenta?{' '}
          <a href="/login" className="text-blue-600 hover:underline">
            Iniciar sesión
          </a>
        </p>
      </form>
    </div>
  )
}