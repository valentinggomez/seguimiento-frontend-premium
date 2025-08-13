"use client"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog"
import { toast } from "sonner"
import { getAuthHeaders } from "@/lib/getAuthHeaders"

// ——— Helpers de validación/normalización ———
const isValidOffset = (n: unknown) =>
  typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= 720

const uniqSorted = (arr: number[]) =>
  Array.from(new Set(arr)).sort((a, b) => a - b)

// Elimina una sola ocurrencia por valor (no por índice, para evitar desincronización con sort)
const removeOnceByValue = (arr: number[], value: number) => {
  const idx = arr.indexOf(value)
  if (idx === -1) return arr
  return [...arr.slice(0, idx), ...arr.slice(idx + 1)]
}

// Normaliza slugs tipo "24h-control" → minúsculas y seguro
const normalizeSlug = (s: string) =>
  s.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9_-]/g, "")

// helpers visuales chiquitos
function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div className="text-sm font-semibold text-slate-700 mb-2">{children}</div>;
}

function Chip({
  children,
  onRemove,
}: {
  children: React.ReactNode;
  onRemove?: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs shadow-sm">
      {children}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="rounded-full border border-red-200 px-1 leading-none text-red-500 hover:bg-red-50"
          aria-label="Eliminar"
          title="Eliminar"
        >
          ✕
        </button>
      )}
    </span>
  );
}

type Formulario = {
  id?: string | number
  clinica_id?: string
  nombre: string
  slug: string
  activo: boolean
  prioridad: number
  version: number
  offsets_horas?: number[]
  campos: any                   // JSON
  reglas_alertas: any           // JSON
  meta: any                     // JSON
  publicado_en?: string | null
  hoja_destino?: string | null 
}

export default function FormulariosPanel({
  clinicaId,
  clinicaHost,
  sheetOptions,                 
}: { clinicaId: string; clinicaHost?: string; sheetOptions?: string[] }) {
  // 👇 centralizá headers
  const auth = getAuthHeaders()
  const hostHeader =
    clinicaHost ?? (typeof window !== "undefined" ? window.location.hostname : "")
  const commonHeaders = { ...auth, "x-clinica-host": hostHeader }
  const [items, setItems] = useState<Formulario[]>([])
  const [open, setOpen] = useState(false)
  const [edit, setEdit] = useState<Formulario | null>(null)
  const [newOffset, setNewOffset] = useState<string>("")

  // Errores live de JSON para bloquear el guardado si hay formato inválido
  const [camposErr, setCamposErr] = useState<string>("")
  const [reglasErr, setReglasErr] = useState<string>("")
  const [metaErr, setMetaErr] = useState<string>("")
  const [camposText, setCamposText] = useState<string>("")
  const [reglasText, setReglasText] = useState<string>("")
  const [metaText, setMetaText] = useState<string>("")

  const load = async () => {
    const url = `${process.env.NEXT_PUBLIC_API_URL}/api/formularios?clinica_id=${encodeURIComponent(clinicaId)}`
    console.log("[FormulariosPanel] url:", url)
    console.log("[FormulariosPanel] x-clinica-host:", hostHeader) // 👈 debería ser tu dominio front
    try {
        const res = await fetch(url, { headers: commonHeaders, cache: "no-store" })
        console.log("[FormulariosPanel] status:", res.status)
        const text = await res.text()
        console.log("[FormulariosPanel] body:", text)
        if (!res.ok) { setItems([]); return }
        const data = JSON.parse(text)
        setItems(Array.isArray(data) ? data : data?.data || [])
    } catch (e) {
        console.error("[FormulariosPanel] Fetch error:", e)
        setItems([])
    }
    }

  useEffect(() => { if (clinicaId && hostHeader) load() }, [clinicaId, hostHeader])

  const startCreate = () => {
    const nuevo = {
        nombre: "",
        slug: "",
        activo: true,
        prioridad: 10,
        version: 1,
        offsets_horas: [6, 24, 48],
        campos: { preguntas: [] },
        reglas_alertas: { condiciones: [], sugerencias: [] },
        meta: {},
        publicado_en: new Date().toISOString(),
        hoja_destino: ""
    }
    setEdit(nuevo)
    setOpen(true)

    setCamposText(JSON.stringify(nuevo.campos, null, 2))
    setReglasText(JSON.stringify(nuevo.reglas_alertas, null, 2))
    setMetaText(JSON.stringify(nuevo.meta, null, 2))
    setCamposErr("")
    setReglasErr("")
    setMetaErr("")
    }

  const save = async () => {
    if (!edit) return

    const errs: string[] = []

    // Básicos
    const nombre = edit.nombre?.trim()
    const slug = normalizeSlug(edit.slug || "")
    if (!nombre) errs.push("El nombre es obligatorio.")
    if (!slug) errs.push("El slug es obligatorio.")

    // Offsets
    const offsets = uniqSorted((edit.offsets_horas || []).filter(isValidOffset)) as number[]
    if (offsets.length === 0) errs.push("Agregá al menos un recordatorio en horas (+N).")

    // JSON errors vivos
    if (camposErr || reglasErr || metaErr) errs.push("Hay JSON inválido: corregí los errores marcados.")

    // Slug único local
    const dup = items.find((i) => i.slug === slug && i.id !== edit.id)
    if (dup) errs.push("El slug ya existe en esta clínica.")

    if (errs.length) {
        errs.forEach((e) => toast.error(e))
        return
    }

    const payload: Formulario = {
        ...edit,
        nombre,
        slug,
        offsets_horas: offsets,
        clinica_id: clinicaId,
        hoja_destino: (edit as any).hoja_destino?.toString().trim() || null,
    }

    const method = edit.id ? "PUT" : "POST"
    const url = edit.id
        ? `${process.env.NEXT_PUBLIC_API_URL}/api/formularios/${edit.id}`
        : `${process.env.NEXT_PUBLIC_API_URL}/api/formularios`

    const res = await fetch(url, {
      method,
      headers: { ...commonHeaders, "Content-Type": "application/json" }, 
      body: JSON.stringify(payload),
    })

    if (res.ok) {
        toast.success("Formulario guardado")
        setOpen(false)
        setEdit(null)
        setNewOffset("")
        await load()
    } else {
        const e = await res.json().catch(() => ({}))
        toast.error(e?.error || "No se pudo guardar")
    }
    }

    const toggle = async (id: string | number) => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/formularios/${id}/toggle`,
        {
          method: "POST",
          headers: commonHeaders,                                        
        }
      )
        if (res.ok) {
        await load()
        toast.success("Estado actualizado")
        } else {
        const e = await res.json().catch(() => ({}))
        toast.error(e?.error || "No se pudo cambiar el estado")
        }
    } catch (err) {
        console.error(err)
        toast.error("Error de red al cambiar el estado")
    }
    }

  const del = async (id: string) => {
    if (!confirm("¿Eliminar formulario?")) return
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/formularios/${id}`, {
      method: "DELETE",
      headers: commonHeaders,                                            
    })
    if (res.ok) { toast.success("Eliminado"); load() }
    else toast.error("No se pudo eliminar")
  }

  const upd = (k: keyof Formulario, v: any) => setEdit(prev => ({ ...prev!, [k]: v }))

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-semibold">📝 Formularios</h4>
        <Button onClick={startCreate}>➕ Nuevo</Button>
      </div>

      {/* Lista */}
      <div className="space-y-2">
        {items.map(f => (
          <div key={f.id} className="border rounded-lg p-3 flex items-center justify-between">
            <div>
              <div className="font-medium">{f.nombre} <span className="text-xs text-gray-500">({f.slug})</span></div>
              <div className="text-xs text-gray-500">
                v{f.version} · prioridad {f.prioridad}
                {f.offsets_horas?.length
                    ? <> · envíos: {uniqSorted(f.offsets_horas).map(n => `+${n}h`).join(", ")}</>
                    : <> · (sin offsets configurados)</>}
                {(f as any).hoja_destino ? <> · hoja: “{(f as any).hoja_destino}”</> : null}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                    // abrir el editor con el formulario seleccionado
                    setEdit(f)
                    // precargar los JSON en los textareas
                    setCamposText(JSON.stringify((f.campos ?? {}), null, 2))
                    setReglasText(JSON.stringify((f.reglas_alertas ?? {}), null, 2))
                    setMetaText(JSON.stringify((f.meta ?? {}), null, 2))
                    // limpiar errores
                    setCamposErr("")
                    setReglasErr("")
                    setMetaErr("")
                    // abrir modal
                    setOpen(true)
                }}
                >
                Editar
                </Button>

                <Button
                variant="outline"
                disabled={!f.id}
                onClick={() => f.id && toggle(String(f.id))}
                >
                {f.activo ? "Desactivar" : "Activar"}
                </Button>

                <Button
                variant="destructive"
                disabled={!f.id}
                onClick={() => f.id && del(String(f.id))}
                >
                Eliminar
              </Button>
            </div>
          </div>
        ))}
        {items.length === 0 && <div className="text-sm text-gray-500">No hay formularios aún.</div>}
      </div>

      {/* Modal Crear/Editar */}
      <Dialog open={open} onOpenChange={(o)=>{ setOpen(o); if(!o) setEdit(null) }}>
        <DialogContent className="max-w-3xl rounded-2xl border border-slate-200 shadow-2xl">
          <DialogTitle>{edit?.id ? "Editar formulario" : "Nuevo formulario"}</DialogTitle>
          <DialogDescription>Definí reglas de envío y campos del form.</DialogDescription>

          {edit && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input placeholder="Nombre" value={edit.nombre} onChange={e=>upd("nombre", e.target.value)} />
              <Input placeholder="Slug" value={edit.slug} onChange={e=>upd("slug", e.target.value)} />
              <Input placeholder="Versión" type="number" value={edit.version} onChange={e=>upd("version", Number(e.target.value||0))} />
              <Input placeholder="Prioridad" type="number" value={edit.prioridad} onChange={e=>upd("prioridad", Number(e.target.value||0))} />
              <Input
                placeholder="Hoja destino (p. ej., Respuestas 24h)"
                value={(edit as any).hoja_destino ?? ""}
                onChange={e => upd("hoja_destino" as any, e.target.value)}
                list="hojas-clinica"          // 👈 sugiere opciones si existen
              />
              {sheetOptions?.length ? (
                <datalist id="hojas-clinica">
                    {sheetOptions.map(h => <option key={h} value={h} />)}
                </datalist>
              ) : null}
            {/* Offsets (horas después del registro) */}
            <div className="col-span-2 rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 shadow-sm">
            <SectionTitle>Recordatorios (horas después del registro)</SectionTitle>

            {/* Chips */}
            <div className="flex flex-wrap gap-2 mb-3">
                {(edit.offsets_horas || []).length > 0 ? (
                    uniqSorted(edit.offsets_horas!).map((h) => (
                    <Chip
                        key={`off-${h}`}
                        onRemove={() => upd("offsets_horas", removeOnceByValue(edit.offsets_horas || [], h))}
                    >
                        +{h}h
                    </Chip>
                    ))
                ) : (
                    <span className="text-xs text-slate-400">Agregá valores como 6, 12, 24…</span>
                )}
            </div>

            {/* Agregar nuevo offset */}
            <div className="flex items-center gap-2">
            <Input
                placeholder="p. ej., 6"
                className="max-w-[120px]"
                type="number"
                min={0}
                max={720}
                value={newOffset}
                onChange={(e) => setNewOffset(e.target.value)}
                onKeyDown={(e) => {
                if (e.key !== "Enter") return
                const val = Number(newOffset)
                if (isValidOffset(val)) {
                    const next = uniqSorted([...(edit.offsets_horas || []), val])
                    upd("offsets_horas", next)
                    setNewOffset("")
                } else {
                    toast.error("Valor inválido. Usá 0–720.")
                }
                }}
            />
            <Button
                type="button"
                onClick={() => {
                const val = Number(newOffset)
                if (isValidOffset(val)) {
                    const next = uniqSorted([...(edit.offsets_horas || []), val])
                    upd("offsets_horas", next)
                    setNewOffset("")
                } else {
                    toast.error("Valor inválido. Usá 0–720.")
                }
                }}
            >
                Agregar
            </Button>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-slate-500">
            Estos recordatorios se envían automáticamente a las <b>+N horas</b> desde el registro del paciente, sin importar día u hora.
            </p>
            </div>

              <div className="col-span-2">
                <div className="text-sm font-medium">Campos (JSON)</div>
                <textarea
                className={`w-full border rounded p-2 text-sm min-h-[120px] font-mono ${camposErr ? "border-red-500" : ""}`}
                value={camposText}
                onChange={(e) => {
                    const val = e.target.value
                    setCamposText(val)
                    try {
                    const parsed = JSON.parse(val)
                    upd("campos", parsed)
                    setCamposErr("")
                    } catch {
                    setCamposErr("JSON inválido")
                    }
                }}
                />
                {camposErr && <div className="text-xs text-red-600 mt-1">{camposErr}</div>}
                </div>

              <div className="col-span-2">
                <div className="text-sm font-medium">Reglas de alertas (JSON)</div>
                <textarea
                className={`w-full border rounded p-2 text-sm min-h-[120px] font-mono ${reglasErr ? "border-red-500" : ""}`}
                value={reglasText}
                onChange={(e) => {
                    const val = e.target.value
                    setReglasText(val)
                    try {
                    const parsed = JSON.parse(val)
                    upd("reglas_alertas", parsed)
                    setReglasErr("")
                    } catch {
                    setReglasErr("JSON inválido")
                    }
                }}
                />
                {reglasErr && <div className="text-xs text-red-600 mt-1">{reglasErr}</div>}
                </div>

              <div className="col-span-2">
                <div className="text-sm font-medium">Meta (JSON)</div>
                <textarea
                className={`w-full border rounded p-2 text-sm min-h-[90px] font-mono ${metaErr ? "border-red-500" : ""}`}
                value={metaText}
                onChange={(e) => {
                    const val = e.target.value
                    setMetaText(val)
                    try {
                    const parsed = JSON.parse(val)
                    upd("meta", parsed)
                    setMetaErr("")
                    } catch {
                    setMetaErr("JSON inválido")
                    }
                }}
                />
                {metaErr && <div className="text-xs text-red-600 mt-1">{metaErr}</div>}
                </div>

              <div className="col-span-2 flex items-center justify-between mt-2">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={edit.activo} onCheckedChange={(on)=>upd("activo", !!on)} /> Activo
                </label>
                <Button onClick={save} disabled={Boolean(camposErr || reglasErr || metaErr)}>
                  Guardar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}