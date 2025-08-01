'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import QRCode from 'react-qr-code'
import { useClinica } from '@/lib/ClinicaProvider'
import { getAuthHeaders } from '@/lib/getAuthHeaders'
import { useTranslation } from '@/i18n/useTranslation'

export default function RegistroPaciente() {
  const [form, setForm] = useState<any>({})
  const [enviado, setEnviado] = useState(false)
  const { t } = useTranslation()
  const [link, setLink] = useState('')
  const [copiado, setCopiado] = useState(false)
  const [errores, setErrores] = useState<{ fecha_cirugia?: string; edad?: string }>({})
  const [mensajeError, setMensajeError] = useState('')
  const { clinica } = useClinica()
  const camposPersonalizados = clinica?.campos_avanzados?.split(',') || []
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validación básica
    const campos = Object.entries(form)
    console.log("🧾 Datos form frontend antes de enviar:", form)
    const vacios = campos.filter(([_, val]) => val === '')
    if (vacios.length > 0) {
      setMensajeError(t('pacientes.errores.error_generico', { mensaje: t('pacientes.errores.faltan_campos') }))
      return
    }

    const [d, m, y] = (form.fecha_cirugia || '').split('/')
    const dia = parseInt(d, 10)
    const mes = parseInt(m, 10)
    const anio = parseInt(y, 10)
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    const fechaIngresada = new Date(`${anio}-${mes}-${dia}`)

    if (
      isNaN(dia) || isNaN(mes) || isNaN(anio) ||
      dia < 1 || dia > 31 ||
      mes < 1 || mes > 12 ||
      fechaIngresada > hoy
    ) {
      setErrores((prev) => ({
        ...prev,
        fecha_cirugia: t('pacientes.errores.error_fecha')
      }))
      return
    } else {
      setErrores((prev) => ({ ...prev, fecha_cirugia: '' }))
    }

    if (parseInt(form.edad) < 0 || parseInt(form.edad) > 120) {
      setErrores({ ...errores, edad: t('pacientes.errores.edad_maxima') })
      setMensajeError(t('pacientes.errores.error_generico', { mensaje: t('pacientes.errores.edad_maxima') }))
      return
    }

    if (!clinica?.id) {
      setMensajeError(t('pacientes.errores.error_generico', { mensaje: t('pacientes.errores.no_clinica') }))
      return
    }

    const paciente = {
      ...form,
      fecha_cirugia: `${y}-${m}-${d}`,
      clinica_id: clinica.id
    }
    console.log("📦 Objeto final paciente:", paciente)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/pacientes`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(paciente)
      })

      const resultado = await res.json()

      if (!res.ok) {
        setMensajeError(t('pacientes.errores.error_guardado'))
        console.error(resultado.error)
        return
      }

      const nuevoId = resultado.data?.id || ''
      setLink(`${window.location.origin}/responder/${nuevoId}`)
      setEnviado(true)
    } catch (err) {
      console.error(err)
      setMensajeError(t('pacientes.errores.error_inesperado'))
    }
  }

  return (
    <main className="min-h-screen bg-[#f9fafb] px-4 py-14 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-2xl bg-white/90 border border-gray-200 backdrop-blur-md shadow-xl rounded-3xl p-10"
      >
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-[#003466] tracking-tight">
            {t('pacientes.registro.titulo')}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {t('pacientes.registro.subtitulo')}
          </p>
        </div>

        {!enviado ? (
          <form onSubmit={handleSubmit} className="space-y-7">
          {mensajeError && (
            <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="bg-red-50 border border-red-300 text-red-800 px-4 py-3 rounded-xl shadow-sm text-sm"
            >
                {t('pacientes.errores.error_generico', { mensaje: mensajeError })}
            </motion.div>
            )}

          <div className="space-y-6">
            {/* NOMBRE COMPLETO */}
            <div className="relative">
              <input
                type="text"
                name="nombre"
                value={form.nombre || ''}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                placeholder=" "
                autoComplete="off"
                className="peer w-full px-3 pt-6 pb-2 border border-gray-300 rounded-xl bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#004080] transition-all"
              />
              <label className="absolute left-3 top-2.5 text-sm text-gray-500 peer-focus:top-1 peer-focus:text-xs peer-focus:text-[#004080] peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 transition-all">
                {t('pacientes.nombre')}
              </label>
            </div>

            {/* EDAD */}
            <div className="relative">
              <input
                type="number"
                name="edad"
                value={form.edad || ''}
                onChange={(e) => {
                  const edad = parseInt(e.target.value)
                  setForm({ ...form, edad: e.target.value })
                  setErrores((prev) => ({
                    ...prev,
                    edad: edad > 130 ? t('pacientes.errores.edad_maxima') : ''
                  }))
                }}
                placeholder=" "
                autoComplete="off"
                className={`peer w-full px-3 pt-6 pb-2 border rounded-xl bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#004080] transition-all ${
                  errores.edad ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errores.edad && (
                <p className="text-red-600 text-sm mt-1">{errores.edad}</p>
              )}
              <label className="absolute left-3 top-2.5 text-sm text-gray-500 peer-focus:top-1 peer-focus:text-xs peer-focus:text-[#004080] peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 transition-all">
                {t('pacientes.edad')}
              </label>
            </div>

            {/* DNI */}
            <div className="relative">
              <input
                type="text"
                name="dni"
                value={form.dni || ''}
                onChange={(e) => setForm({ ...form, dni: e.target.value })}
                placeholder=" "
                autoComplete="off"
                className="peer w-full px-3 pt-6 pb-2 border border-gray-300 rounded-xl bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#004080] transition-all"
              />
              <label className="absolute left-3 top-2.5 text-sm text-gray-500 peer-focus:top-1 peer-focus:text-xs peer-focus:text-[#004080] peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 transition-all">
                {t('pacientes.dni')}
              </label>
            </div>

            {/* Obra Social */}
            <div className="relative">
              <input
                type="text"
                name="obra_social"
                value={form.obra_social || ''}
                onChange={(e) => setForm({ ...form, obra_social: e.target.value })}
                placeholder=" "
                autoComplete="off"
                className="peer w-full px-3 pt-6 pb-2 border border-gray-300 rounded-xl bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#004080] transition-all"
              />
              <label className="absolute left-3 top-2.5 text-sm text-gray-500 peer-focus:top-1 peer-focus:text-xs peer-focus:text-[#004080] peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 transition-all">
                {t('pacientes.obra_social')}
              </label>
            </div>

            {/* SEXO */}
            <div className="relative">
              <select
                name="sexo"
                value={form.sexo || ''}
                onChange={(e) => setForm({ ...form, sexo: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#004080] transition"
              >
                <option value="" disabled hidden>{t('pacientes.seleccionar_sexo')}</option>
                <option value="Masculino">{t('pacientes.masculino')}</option>
                <option value="Femenino">{t('pacientes.femenino')}</option>
                <option value="Otro">{t('pacientes.otro')}</option>
              </select>
            </div>

            {/* PESO */}
            <div className="relative">
              <input
                type="number"
                step="any"
                name="peso"
                value={form.peso || ''}
                onChange={(e) => {
                  const peso = e.target.value
                  const altura = form.altura?.replace(',', '.')
                  const imcCalc =
                    peso && altura
                      ? (
                          parseFloat(peso.replace(',', '.')) /
                          Math.pow(parseFloat(altura), 2)
                        ).toFixed(2)
                      : ''
                  setForm({ ...form, peso, imc: imcCalc })
                }}
                placeholder=" "
                autoComplete="off"
                className="peer w-full px-3 pt-6 pb-2 border border-gray-300 rounded-xl bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#004080] transition-all"
              />
              <label className="absolute left-3 top-2.5 text-sm text-gray-500 peer-focus:top-1 peer-focus:text-xs peer-focus:text-[#004080] peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 transition-all">
                {t('pacientes.peso')} (kg)
              </label>
            </div>

            {/* ALTURA */}
            <div className="relative">
              <input
                type="number"
                step="any"
                name="altura"
                value={form.altura || ''}
                onChange={(e) => {
                  const altura = e.target.value
                  const peso = form.peso?.replace(',', '.')
                  const imcCalc =
                    peso && altura
                      ? (
                          parseFloat(peso) /
                          Math.pow(parseFloat(altura.replace(',', '.')), 2)
                        ).toFixed(2)
                      : ''
                  setForm({ ...form, altura, imc: imcCalc })
                }}
                placeholder=" "
                autoComplete="off"
                className="peer w-full px-3 pt-6 pb-2 border border-gray-300 rounded-xl bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#004080] transition-all"
              />
              <label className="absolute left-3 top-2.5 text-sm text-gray-500 peer-focus:top-1 peer-focus:text-xs peer-focus:text-[#004080] peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 transition-all">
                {t('pacientes.altura')} (m)
              </label>
            </div>

            {/* IMC - Solo lectura */}
            <div className="relative">
              <input
                type="text"
                name="imc"
                readOnly
                value={form.imc || ''}
                placeholder=" "
                className="w-full px-3 pt-6 pb-2 border border-gray-300 rounded-xl bg-gray-100 text-gray-600 cursor-not-allowed"
              />
              <label className="absolute left-3 top-2.5 text-sm text-gray-500 peer-focus:text-[#004080]">
                {t('pacientes.imc')} ({t('pacientes.calculado')})
              </label>
            </div>
            {/* 
              🧩 Teléfono del paciente
              Campo simple para ingresar el número de contacto. 
              Se puede adaptar luego a validación por país si se desea internacionalizar.
            */}
            <div className="relative">
              <input
                type="tel"
                name="telefono"
                value={form.telefono || ''}
                onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                placeholder=" "
                autoComplete="off"
                className="peer w-full px-3 pt-6 pb-2 border border-gray-300 rounded-xl bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#004080] transition-all"
              />
              <label className="absolute left-3 top-2.5 text-sm text-gray-500 peer-focus:top-1 peer-focus:text-xs peer-focus:text-[#004080] peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 transition-all">
                {t('pacientes.telefono')}
              </label>
            </div>

            {/* 
              ⚕️ Tipo de cirugía
              Campo libre para que el médico ingrese manualmente qué tipo de procedimiento se realizó.
            */}
            <div className="relative">
              <input
                type="text"
                name="cirugia"
                value={form.cirugia || ''}
                onChange={(e) => setForm({ ...form, cirugia: e.target.value })}
                placeholder=" "
                autoComplete="off"
                className="peer w-full px-3 pt-6 pb-2 border border-gray-300 rounded-xl bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#004080] transition-all"
              />
              <label className="absolute left-3 top-2.5 text-sm text-gray-500 peer-focus:top-1 peer-focus:text-xs peer-focus:text-[#004080] peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 transition-all">
                {t('pacientes.cirugia')}
              </label>
            </div>

            {/* 
              📅 Fecha de cirugía con formato dd/mm/aaaa
              Se puede mejorar más adelante con validación progresiva y formato automático.
            */}
            <div className="relative">
              <input
                type="text"
                name="fecha_cirugia"
                value={form.fecha_cirugia || ''}
                maxLength={10}
                placeholder=""
                onChange={(e) => {
                  let val = e.target.value.replace(/\D/g, '')
                  if (val.length >= 3 && val.length <= 4)
                    val = val.replace(/(\d{2})(\d+)/, '$1/$2')
                  else if (val.length >= 5)
                    val = val.replace(/(\d{2})(\d{2})(\d+)/, '$1/$2/$3')

                  const fecha = val.slice(0, 10)
                  setForm({ ...form, fecha_cirugia: fecha })

                  const [d, m, y] = fecha.split('/')
                  const dia = parseInt(d, 10)
                  const mes = parseInt(m, 10)
                  const anio = parseInt(y, 10)
                  const hoy = new Date()
                  hoy.setHours(0, 0, 0, 0)
                  const fechaIngresada = new Date(`${anio}-${mes}-${dia}`)

                  let esInvalida = false
                  if (fecha.length >= 2 && (dia < 1 || dia > 31)) esInvalida = true
                  if (fecha.length >= 5 && (mes < 1 || mes > 12)) esInvalida = true
                  if (fecha.length === 10 && fechaIngresada > hoy) esInvalida = true

                  setErrores((prev) => ({
                    ...prev,
                    fecha_cirugia: esInvalida ? t('pacientes.error_fecha') : ''
                  }))
                }}
                autoComplete="off"
                className={`peer w-full px-3 pt-6 pb-2 border rounded-xl bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#004080] transition-all ${
                  errores.fecha_cirugia ? 'border-red-500' : 'border-gray-300'
                }`}
              />

              {errores.fecha_cirugia && (
                <p className="text-red-600 text-sm mt-1">{errores.fecha_cirugia}</p>
              )}

              <label className="absolute left-3 top-2.5 text-sm text-gray-500 peer-focus:top-1 peer-focus:text-xs peer-focus:text-[#004080] peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 transition-all">
                {t('pacientes.fecha')}
              </label>
            </div>
            {/* 
            🧪 Zona de datos clínicos avanzados (editable por clínica)
            Este bloque se deja visualmente preparado, pero sin campos por defecto.
            Cada institución puede definir qué mediciones quiere registrar (bloqueo, dosis, fármacos, escalas, etc.)
            */}
            <div className="border border-gray-200 rounded-xl px-4 py-6 shadow-sm bg-blue-50 mt-8">
              <h3 className="text-[#004080] font-semibold mb-3 text-sm">
                {t('pacientes.avanzado_titulo')}
              </h3>

              {camposPersonalizados.length > 0 ? (
                camposPersonalizados.map((campo: string, index: number) => {
                  const campoKey = campo.trim()

                  return (
                    <div key={index} className="relative mb-5">
                      <input
                        type="text"
                        name={campoKey}
                        value={form[campoKey] || ''}
                        onChange={(e) => setForm({ ...form, [campoKey]: e.target.value })}
                        placeholder=" "
                        autoComplete="off"
                        className="peer w-full px-3 pt-6 pb-2 border border-gray-300 rounded-xl bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#004080] transition-all"
                      />
                      <label className="absolute left-3 top-2.5 text-sm text-gray-500 peer-focus:top-1 peer-focus:text-xs peer-focus:text-[#004080] peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 transition-all">
                        {campoKey}
                      </label>
                    </div>
                  )
                })
              ) : (
                <div className="text-gray-500 text-sm italic">
                  {t('pacientes.avanzado_vacio')}
                </div>
              )}
            </div>
            {/* 
            👨‍⚕️ Datos del médico responsable
            Este campo identifica al profesional que cargó el formulario.
            Puede usarse para trazabilidad legal, firma o historial.
            */}
            <div className="border border-gray-200 rounded-xl p-4 shadow-sm bg-blue-50 mt-8">
              <h3 className="text-[#004080] font-semibold mb-3 text-sm">
                {t('pacientes.medico_titulo')}
              </h3>

              <div className="relative mb-3">
                <input
                  type="text"
                  name="nombre_medico"
                  value={form.nombre_medico || ''}
                  onChange={(e) => setForm({ ...form, nombre_medico: e.target.value })}
                  placeholder=" "
                  autoComplete="off"
                  className="peer w-full px-3 pt-6 pb-2 border border-gray-300 rounded-xl bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#004080] transition-all"
                />
                <label
                  htmlFor="nombre_medico"
                  className="absolute left-3 top-2.5 text-sm text-gray-500 peer-focus:top-1 peer-focus:text-xs peer-focus:text-[#004080] peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 transition-all"
                >
                  {t('pacientes.medico_nombre')}
                </label>
              </div>
            </div>

            {/* 
            ✅ Botón de guardado
            Envía todos los datos al backend Express (/api/pacientes)
            Luego mostrará el link de seguimiento generado.
            */}
            <button
              type="submit"
              className="w-full mt-6 bg-[#004080] text-white py-3 rounded-lg hover:bg-[#003466] transition font-semibold shadow"
            >
              {t('pacientes.registro.guardar_y_generar')}
            </button>
          </div>
        </form>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="space-y-8 text-center"
          >
            <div className="border border-green-300 bg-green-50 rounded-2xl shadow-md px-6 py-8">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 10 }}
                className="text-4xl"
              >
                ✅
              </motion.div>

              <h2 className="text-2xl font-bold tracking-tight text-green-700 mb-2">
                {t('pacientes.registro.titulo_exito')}
              </h2>

              <p className="text-gray-700 mb-4 text-sm max-w-md mx-auto">
                {t('pacientes.registro.instruccion_link')}
              </p>

              <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-sm text-gray-800 font-mono overflow-x-auto shadow-sm">
                <span className="text-[#004080] text-base">🔗</span>
                <span className="select-all">{link}</span>
              </div>

              <div className="mt-5 border border-gray-300 p-3 inline-block rounded-xl shadow-sm bg-white">
                <QRCode value={link} size={120} fgColor="#003466" bgColor="#ffffff" />
              </div>

              {copiado && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-green-600 font-medium text-sm mt-2"
                >
                  {t('pacientes.registro.link_copiado')}
                </motion.div>
              )}

              <motion.button
                onClick={() => {
                  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
                    navigator.clipboard.writeText(link)
                      .then(() => {
                        setCopiado(true)
                        setTimeout(() => setCopiado(false), 2000)
                      })
                      .catch(() => {
                        alert(t('pacientes.registro.error_copiar'))
                      })
                  } else {
                    alert(t('pacientes.registro.no_compatible'))
                  }
                }}
                animate={copiado ? { scale: [1, 1.05, 1], backgroundColor: "#16a34a" } : {}}
                transition={{ duration: 0.3 }}
                className={`w-full mt-5 px-6 py-2.5 rounded-lg text-white font-semibold transition-all shadow-md inline-flex items-center justify-center gap-2 ${
                  copiado ? 'bg-green-600 hover:bg-green-700' : 'bg-[#004080] hover:bg-[#003466]'
                }`}
              >
                {copiado ? '✅ ' + t('pacientes.registro.link_copiado_boton') : '📋 ' + t('pacientes.registro.boton_copiar')}
              </motion.button>

              <button
                onClick={() => {
                  setForm({})
                  setLink('')
                  setEnviado(false)
                  setCopiado(false)
                }}
                className="w-full mt-4 px-5 py-2 rounded-lg bg-white border border-gray-300 text-[#004080] hover:bg-gray-50 hover:shadow transition font-medium"
              >
                {t('pacientes.registro.boton_nuevo')}
              </button>

              <button
                type="button"
                onClick={() => alert(t('pacientes.registro.alerta_ver_paciente'))}
                className="w-full mt-3 px-5 py-2 rounded-lg bg-[#f0f4f8] border border-gray-300 text-[#004080] hover:bg-gray-100 hover:shadow transition font-medium"
              >
                🔍 {t('pacientes.registro.boton_ver')}
              </button>
            </div>
          </motion.div>
        )}
      </motion.div>
    </main>
  )
}