'use client'
import { useClinica } from '@/lib/ClinicaProvider'

export default function ErrorResponderPage() {
  const { clinica } = useClinica()

  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center gap-4 p-6">
      {/* Logo e info clínica */}
      {clinica && (
        <>
          {clinica.logo_url && (
            <img
              src={clinica.logo_url}
              alt="Logo clínica"
              className="h-14 sm:h-16 object-contain"
            />
          )}
          <h1 className="text-xl sm:text-2xl font-semibold text-[#003466]">
            {clinica.nombre_clinica}
          </h1>
        </>
      )}

      {/* Mensaje de error */}
      <p className="text-red-600 text-lg sm:text-xl">
        ⚠️ El ID del paciente no es válido o no se encuentra. Verificá el link recibido.
      </p>
    </div>
  )
}
