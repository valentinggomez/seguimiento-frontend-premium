"use client"
export const dynamic = "force-dynamic"
export const revalidate = 0

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import loadDynamic from "next/dynamic"
import { getAuthHeaders } from "@/lib/getAuthHeaders"

const FormulariosPanel = loadDynamic(
  () => import("@/components/formulariosPanel").then(m => m.default ?? m),
  {
    ssr: false,
    loading: () => <div className="p-4 text-sm text-gray-500">Cargando panel…</div>,
  }
)

export default function ClinicaDashboardPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [rol, setRol] = useState<string | null>(null)
  const [usuario, setUsuario] = useState<any>(null)
  const [clinica, setClinica] = useState<any>(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    const rolGuardado = localStorage.getItem("rol")
    const usuarioGuardado = localStorage.getItem("usuario")
    if (!rolGuardado || !usuarioGuardado) {
      router.replace("/login")
      return
    }
    setRol(rolGuardado)
    try { setUsuario(JSON.parse(usuarioGuardado)) }
    catch { router.replace("/login"); return }
  }, [router])

  useEffect(() => {
    if (!id) return;
    (async () => {
        try {
        const { getAuthHeaders } = await import("@/lib/getAuthHeaders");
        console.log("[ClinicaPage] API_URL =", process.env.NEXT_PUBLIC_API_URL, "id=", id);
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/clinicas/${id}`, {
            headers: getAuthHeaders(),
            cache: "no-store",
        });
        console.log("[ClinicaPage] fetch status", res.status);
        if (!res.ok) {
            const text = await res.text();
            console.error("[ClinicaPage] body:", text);
            // No hagas throw para no romper el render:
            setClinica(null);
            return;
        }
        const json = await res.json();
        setClinica(json?.data || json || null);
        } catch (e) {
        console.error("[ClinicaPage] fetch error", e);
        } finally {
        setCargando(false);
        }
    })();
    }, [id]);

  if (rol !== "superadmin") {
    return (
      <div className="p-10 text-center">
        <h1 className="text-3xl font-bold text-red-600 mb-4">Acceso restringido 🚫</h1>
        <p className="text-gray-600">Solo el usuario <strong>superadmin</strong> puede acceder a esta sección.</p>
      </div>
    )
  }

  if (!usuario || cargando) return <div className="p-10 text-center text-gray-500">Cargando…</div>

  if (!clinica) {
    return (
      <div className="p-10 text-center">
        <p className="text-gray-600 mb-4">No se encontró la clínica.</p>
        <Button variant="outline" onClick={() => router.push("/panel/clinicas")}>← Volver</Button>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-[#003366]">{clinica.nombre_clinica}</h1>
          <p className="text-sm text-gray-600">{clinica.dominio}</p>
        </div>
        <Button variant="outline" onClick={() => router.push("/panel/clinicas")}>← Volver</Button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="rounded-2xl border p-5 shadow-sm bg-white">
          <h2 className="text-lg font-semibold text-[#003366] mb-2">📄 Formularios</h2>
          <p className="text-sm text-gray-600 mb-4">
            Definí offsets de envío, reglas de alertas y metadatos.
          </p>
          <FormulariosPanel clinicaId={String(clinica.id)} />
        </div>

        <div className="rounded-2xl border p-5 shadow-sm bg-white">
          <h2 className="text-lg font-semibold text-[#003366] mb-2">⚙️ Configuración (resumen)</h2>
          <ul className="text-sm text-gray-700 space-y-1">
            <li><b>Spreadsheet ID:</b> <span className="font-mono">{clinica.spreadsheet_id || "—"}</span></li>
            <li><b>Hoja principal:</b> {clinica.nombre_hoja || "—"}</li>
            <li><b>Color primario:</b> <span className="font-mono">{clinica.color_primario || "—"}</span></li>
          </ul>
        </div>
      </div>
    </div>
  )
}