'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useClinica } from '@/lib/ClinicaProvider'
import { fetchSinToken } from '@/lib/fetchSinTocken'

export default function RegistroPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [codigoRegistro, setCodigoRegistro] = useState('')
  const [error, setError] = useState('')
  const { clinica } = useClinica()

  const handleRegistro = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      return setError('Las contraseñas no coinciden')
    }

    try {
      console.log('🔍 URL a usar:', process.env.NEXT_PUBLIC_API_URL)
      const res = await fetchSinToken('/api/registro', {
        method: 'POST',
        body: JSON.stringify({ email, password, codigoRegistro }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Error al registrarse')
      }

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
              Crear cuenta médica — {clinica.nombre_clinica}
            </h1>
          </div>
        ) : (
          <h1 className="text-3xl font-bold text-center text-[#003466] mb-6">
            Crear cuenta médica
          </h1>
        )}

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