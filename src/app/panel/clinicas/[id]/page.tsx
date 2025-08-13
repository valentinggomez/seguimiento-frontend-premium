"use client"

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
  const [sheetOptions, setSheetOptions] = useState<string[]>([])

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
    const loadClinica = async (cid: string) => {
        setCargando(true)
        const api = process.env.NEXT_PUBLIC_API_URL!
        const headers = getAuthHeaders()

        // 1) Intento directo (por si luego agregás la ruta en el backend)
        const direct = await fetch(`${api}/api/clinicas/${cid}`, { headers, cache: "no-store" }).catch(() => null)
        if (direct && direct.ok) {
        const json = await direct.json().catch(() => null)
        setClinica(json?.data || json || null)
        setCargando(false)
        return
        }

        // 2) Fallback por query ?id=...
        const byQuery = await fetch(`${api}/api/clinicas?id=${cid}`, { headers, cache: "no-store" }).catch(() => null)
        if (byQuery && byQuery.ok) {
        const json = await byQuery.json().catch(() => null)
        // puede venir {data: Clinica} o {data: Clinica[]}
        const data = json?.data
        const found = Array.isArray(data) ? data.find((c: any) => String(c.id) === String(cid)) : data
        setClinica(found || null)
        setCargando(false)
        return
        }

        // 3) Último fallback: traigo todas y filtro
        const listRes = await fetch(`${api}/api/clinicas?rol=superadmin`, { headers: { ...headers, rol: "superadmin" }, cache: "no-store" }).catch(() => null)
        if (listRes && listRes.ok) {
        const json = await listRes.json().catch(() => null)
        const list = Array.isArray(json?.data) ? json.data : (json?.data ? [json.data] : [])
        const found = list.find((c: any) => String(c.id) === String(cid)) || null
        setClinica(found)
        } else {
        setClinica(null)
        }
        setCargando(false)
    }

    if (typeof id === "string" && id) loadClinica(id)
    else setCargando(false)
    }, [id])

    useEffect(() => {
        const loadHojas = async () => {
        const ssid = clinica?.spreadsheet_id?.trim()
        if (!ssid || !/^[\w-]{30,}$/.test(ssid)) {
            setSheetOptions(clinica?.nombre_hoja ? [clinica.nombre_hoja] : [])
            return
        }
        try {
            const res = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/api/hojas?spreadsheet_id=${ssid}`,
            { headers: getAuthHeaders(), cache: "no-store" }
            )
            const data = await res.json().catch(() => ({}))
            setSheetOptions(Array.isArray(data.hojas) ? data.hojas : (clinica?.nombre_hoja ? [clinica.nombre_hoja] : []))
        } catch {
            setSheetOptions(clinica?.nombre_hoja ? [clinica.nombre_hoja] : [])
        }
        }
        if (clinica) loadHojas()
    }, [clinica])

  // ⏳ Esperar a tener usuario/rol y terminar la carga
    if (usuario === null || rol === null || cargando) {
    return <div className="p-10 text-center text-gray-500">Cargando…</div>
    }

    // 👮 Después de que cargó todo, recién ahí chequeamos el rol
    if (rol !== "superadmin") {
    return (
        <div className="p-10 text-center">
        <h1 className="text-3xl font-bold text-red-600 mb-4">Acceso restringido 🚫</h1>
        <p className="text-gray-600">
            Solo el usuario <strong>superadmin</strong> puede acceder a esta sección.
        </p>
        </div>
    )
    }

  if (!clinica) {
    return (
      <div className="p-10 text-center">
        <p className="text-gray-600 mb-4">No se encontró la clínica.</p>
        <Button variant="outline" onClick={() => router.push("/panel/clinicas")}>← Volver</Button>
      </div>
    )
  }

  const hostForApi = (clinica?.dominio || '')
  .split(',')[0]
  .trim()
  .toLowerCase() || undefined

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
          <FormulariosPanel
            clinicaId={String(clinica.id)}
            clinicaHost={hostForApi}
            sheetOptions={sheetOptions}   
          />
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