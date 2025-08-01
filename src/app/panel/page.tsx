'use client'
import { useEffect, useState } from 'react'
import { CheckCircle, AlertTriangle, ClipboardList, Calendar } from 'lucide-react'
import Link from 'next/link'
import { useClinica } from '@/lib/ClinicaProvider'
import { getDashboardStats } from '@/lib/getDashboardStats';
import { getRespuestasAlertas } from '@/lib/getRespuestasAlertas';
import { getInteraccionesNoleidas } from '@/lib/getInteraccionesNoleidas';
import { useTranslation } from '@/i18n/useTranslation'

export default function Inicio() {
  const clinicaContext = useClinica()
  const clinica = clinicaContext?.clinica
  const { t } = useTranslation()

  const [stats, setStats] = useState({
    registradosHoy: 0,
    conAlertas: 0,
    encuestasCompletadas: 0,
    ultimaCirugia: null
  })

  const [alertas, setAlertas] = useState({
    rojo: 0,
    amarillo: 0,
    verde: 0,
  })

  const [errorStats, setErrorStats] = useState(false)

  useEffect(() => {
    if (!clinica?.id) return;

    const cargarAlertas = async () => {
      try {
        const data = await getRespuestasAlertas();
        setAlertas(data);
      } catch (err) {
        console.error('Error al cargar alertas:', err);
        setErrorStats(true);
      }
    };

    cargarAlertas();
  }, [clinica?.id]);
 
  useEffect(() => {
    if (!clinica?.id) return;

    const cargarDashboard = async () => {
      try {
        const data = await getDashboardStats();
        setStats(data);
      } catch (err) {
        console.error('Error al cargar estadísticas:', err);
        setErrorStats(true);
      }
    };

    cargarDashboard();
  }, [clinica?.id]);

  useEffect(() => {
    if (!clinica?.id) return;

    const cargarNoleidas = async () => {
      try {
        const interacciones = await getInteraccionesNoleidas();
        // setNoleidas(interacciones); // si lo necesitás
      } catch (err) {
        console.error('Error al obtener interacciones no leídas:', err);
      }
    };

    cargarNoleidas();
  }, [clinica?.id]);

  // 🔄 Traducción de estado de carga institucional
  if (!clinica) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500 text-sm">
        {t('inicio.cargando_institucional')}
      </div>
    )
  }

  // 🔴 Traducción del error de carga
  if (errorStats) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-red-700 text-center space-y-4">
        <p className="text-lg font-semibold">{t('inicio.error_carga_stats')}</p>
        <p className="text-sm">{t('inicio.reintentar')}</p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-10">
      <div className="text-center space-y-2">
        <h1 className="text-3xl sm:text-4xl font-bold text-[#003466] tracking-tight">
          {t('inicio.bienvenida', { nombre_clinica: clinica.nombre_clinica })}
        </h1>
        {clinica.logo_url && (
          <img
            src={clinica.logo_url}
            alt={`Logo de ${clinica.nombre_clinica}`}
            className="mx-auto h-16 sm:h-20 mb-2"
          />
        )}

        <div className="text-sm text-gray-600">
          <span className="font-medium">Dominio:</span> {clinica.dominio} — 
          <span className="ml-2 font-medium">Licencia:</span> {clinica.licencia_activa ? 'Activa ✅' : 'Vencida ❌'}
        </div>
        <p className="text-gray-600 text-sm sm:text-base">
          Sistema premium de seguimiento postoperatorio – SEGUIR+IA™
        </p>
      <div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-6 py-4 text-sm text-red-800 shadow-sm">
        <p className="font-semibold mb-1">{t('inicio.alertas_activas')}</p>
        <div className="flex gap-6 text-sm sm:text-base">
          <span>🔴 <strong>{alertas.rojo}</strong> {t('inicio.alertas_criticas')}</span>
          <span>🟡 <strong>{alertas.amarillo}</strong> {t('inicio.alertas_moderadas')}</span>
          <span>🟢 <strong>{alertas.verde}</strong> {t('inicio.alertas_leves')}</span>
        </div>
      </div>
      </div>

      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <ResumenCard
          icon={<CheckCircle className="text-green-600 w-6 h-6" />}
          titulo={t('inicio.registrados_hoy')}
          valor={stats.registradosHoy.toString()}
        />
        <ResumenCard
          icon={<AlertTriangle className="text-yellow-500 w-6 h-6" />}
          titulo={t('inicio.con_alertas')}
          valor={stats.conAlertas.toString()}
        />
        <ResumenCard
          icon={<ClipboardList className="text-blue-500 w-6 h-6" />}
          titulo={t('inicio.encuestas')}
          valor={stats.encuestasCompletadas.toString()}
        />
        <ResumenCard
          icon={<Calendar className="text-gray-500 w-6 h-6" />}
          titulo={t('inicio.ultima_cirugia')}
          valor={stats?.ultimaCirugia
            ? new Date(new Date(stats.ultimaCirugia).getTime() + 3 * 60 * 60 * 1000).toLocaleDateString('es-AR')
            : '—'}

        />
      </div>

      {/* Accesos rápidos */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link href="/panel/paciente" className="bg-[#003466] text-white rounded-lg px-5 py-4 text-center font-medium hover:bg-[#002244] transition">
          {t('inicio.registrar')}
        </Link>
        <Link href="/panel/respuestas" className="bg-gray-100 text-gray-800 rounded-lg px-5 py-4 text-center font-medium hover:bg-gray-200 transition">
          {t('inicio.ver_respuestas')}
        </Link>
      </div>

      {/* Mensaje institucional */}
      <div className="mt-12 bg-blue-50 border border-blue-200 p-5 rounded-lg text-sm text-blue-900 shadow-sm">
        <p>{t('inicio.mensaje_institucional')}</p>
      </div>
    </div>
  )
}

function ResumenCard({ icon, titulo, valor }: { icon: any, titulo: string, valor: string }) {
  return (
    <div className="bg-white border rounded-lg shadow-sm p-4 flex items-center gap-4">
      <div>{icon}</div>
      <div>
        <p className="text-sm text-gray-500">{titulo}</p>
        <p className="text-xl font-bold text-[#003466]">{valor}</p>
      </div>
    </div>
  )
}
