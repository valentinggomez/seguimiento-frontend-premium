'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function RegistroPacientePage() {
  const router = useRouter()
  const [clinica, setClinica] = useState<any>(null)
  const [camposAvanzados, setCamposAvanzados] = useState<string[]>([])
  const [form, setForm] = useState<any>({
    nombre: '',
    edad: '',
    sexo: '',
    telefono: '',
  })
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchClinica = async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/clinica-actual`)
      const data = await res.json()

      if (res.ok) {
        setClinica(data)
        setCamposAvanzados(data.campos_clinicos || [])
      } else {
        setError('No se pudo cargar la clínica actual')
      }
    }

    fetchClinica()
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMensaje('')
    setError('')

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/pacientes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(form),
      })

      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Error al guardar')

      setMensaje('✅ Paciente registrado correctamente')
      router.push(`/panel/paciente/${data.id}`) // Vista individual opcional
    } catch (err: any) {
      setError(err.message)
    }
  }

  return (
    <div className="max-w-xl mx-auto mt-10 bg-white p-8 rounded-xl shadow-xl border">
      <h1 className="text-2xl font-bold text-[#003466] mb-6">Registrar paciente</h1>

      {mensaje && <p className="text-green-600 mb-4">{mensaje}</p>}
      {error && <p className="text-red-600 mb-4">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          name="nombre"
          placeholder="Nombre del paciente"
          value={form.nombre}
          onChange={handleChange}
          required
          className="w-full border px-4 py-2 rounded"
        />
        <input
          name="edad"
          placeholder="Edad"
          value={form.edad}
          onChange={handleChange}
          required
          className="w-full border px-4 py-2 rounded"
        />
        <input
          name="sexo"
          placeholder="Sexo (M/F)"
          value={form.sexo}
          onChange={handleChange}
          required
          className="w-full border px-4 py-2 rounded"
        />
        <input
          name="telefono"
          placeholder="Teléfono"
          value={form.telefono}
          onChange={handleChange}
          required
          className="w-full border px-4 py-2 rounded"
        />

        {/* Campos clínicos avanzados dinámicos */}
        {camposAvanzados.map((campo) => (
          <input
            key={campo}
            name={campo}
            placeholder={campo}
            value={form[campo] || ''}
            onChange={handleChange}
            className="w-full border px-4 py-2 rounded"
          />
        ))}

        <button
          type="submit"
          className="w-full bg-[#003466] text-white font-semibold py-2 rounded hover:bg-[#002a55]"
        >
          Registrar paciente
        </button>
      </form>
    </div>
  )
}