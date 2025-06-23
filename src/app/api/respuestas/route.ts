import { NextResponse } from 'next/server'
import { db } from '@/db'
import { respuestas, pacientes } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function GET() {
  try {
    const data = await db
      .select({
        id: respuestas.id,
        creado_en: respuestas.creado_en,
        clinica_id: respuestas.clinica_id,
        dolor: respuestas.dolor,
        nausea: respuestas.nausea,
        somnolencia: respuestas.somnolencia,
        observacion: respuestas.observaciones,
        paciente_id: pacientes.id,
        paciente_nombre: pacientes.nombre,
        edad: pacientes.edad,
        sexo: pacientes.sexo,
        peso: pacientes.peso,
        altura: pacientes.altura,
        imc: pacientes.imc,
        tipo_cirugia: pacientes.cirugia
      })
      .from(respuestas)
      .leftJoin(pacientes, eq(respuestas.paciente_id, pacientes.id))

    console.log('📦 Respuestas con JOIN:', data)

    return NextResponse.json(data)
  } catch (error) {
    console.error('❌ Error en GET /api/respuestas:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
