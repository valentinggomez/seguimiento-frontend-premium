"use client"

import React from "react"
import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import loadDynamic from "next/dynamic"
import { getAuthHeaders } from "@/lib/getAuthHeaders"

// 🔎 ErrorBoundary simple para capturar errores en render del panel
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError:boolean, err?:any}> {
  constructor(props:any){ super(props); this.state={hasError:false} }
  static getDerivedStateFromError(error:any){ return {hasError:true, err:error} }
  componentDidCatch(error:any, info:any){
    // eslint-disable-next-line no-console
    console.error("[ErrorBoundary] Render error:", error, info)
  }
  render(){
    if(this.state.hasError) {
      return <div className="p-4 text-red-600 text-sm">Ocurrió un error cargando el panel. Revisá la consola del navegador y logs de Vercel.</div>
    }
    return this.props.children
  }
}

// 👇 Import dinámico (mismo path en minúsculas que tu archivo real)
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

  // 🔊 capturar errores globales de runtime
  useEffect(() => {
    const onErr = (e:any) => console.error("[window.error]", e?.error || e)
    const onRej = (e:any) => console.error("[unhandledrejection]", e?.reason || e)
    window.addEventListener("error", onErr)
    window.addEventListener("unhandledrejection", onRej)
    return () => {
      window.removeEventListener("error", onErr)
      window.removeEventListener("unhandledrejection", onRej)
    }
  }, [])

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
    if (!id) return
    ;(async () => {
      const api = process.env.NEXT_PUBLIC_API_URL
      const url = `${api}/api/clinicas/${id}`
      // eslint-disable-next-line no-console
      console.log("[ClinicaPage] NEXT_PUBLIC_API_URL:", api)
      console.log("[ClinicaPage] Fetching clínica:", url)
      try {
        const headers = getAuthHeaders()
        console.log("[ClinicaPage] Headers:", headers)
        const res = await fetch(url, { headers, cache: "no-store" })
        console.log("[ClinicaPage] Status:", res.status)
        if (!res.ok) {
          const text = await res.text().catch(() => "(sin body)")
          console.error("[ClinicaPage] Fetch clínica FAIL:", res.status, text)
          setClinica(null)
        } else {
          const json = await res.json()
          console.log("[ClinicaPage] OK payload:", json)
          setClinica(json?.data || json || null)
        }
      } catch (e) {
        console.error("[ClinicaPage] Fetch error:", e)
      } finally {
        setCargando(false)
      }
    })()
  }, [id])

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
          <ErrorBoundary>
            <FormulariosPanel clinicaId={String(clinica.id)} />
          </ErrorBoundary>
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