'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useClinica } from '@/lib/ClinicaProvider'
import { fetchSinToken } from '@/lib/fetchSinToken'

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f9fbff] to-[#e6eef8] px-4 sm:px-6 lg:px-8 py-12">
      <form
        onSubmit={handleRegistro}
        className="bg-white/90 backdrop-blur-md shadow-xl hover:shadow-2xl transition-shadow rounded-2xl w-full max-w-md p-6 sm:p-8 animate-fade-in"
      >
        {clinica ? (
          <div className="text-center mb-6">
            <img
              src={clinica.logo_url}
              alt="Logo clínica"
              className="w-20 h-20 object-contain mx-auto mb-2 rounded-full shadow"
            />
            <h1 className="text-xl font-semibold text-center text-gray-700 leading-snug">
              Acceso exclusivo al sistema médico de{' '}
              <span style={{ color: clinica.color_primario }}>
                {clinica.nombre_clinica}
              </span>
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

        <input
          type="password"
          aria-label="Repetir contraseña"
          placeholder="Repetir contraseña"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          className="w-full px-4 py-2 mb-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
        />

        <input
          type="text"
          aria-label="Código de acceso de la clínica"
          placeholder="Código de acceso de la clínica"
          title="Solicitalo a tu administrador clínico"
          value={codigoRegistro}
          onChange={(e) => setCodigoRegistro(e.target.value)}
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
          Registrarme
        </button>

        <p className="text-sm text-center text-gray-500 mt-4">
          ¿Ya estás registrado?{' '}
          <a href="/login" className="text-blue-600 font-medium hover:underline">
            Iniciar sesión
          </a>
        </p>
      </form>
    </div>
  )
}