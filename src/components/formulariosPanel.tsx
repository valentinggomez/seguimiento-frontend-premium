"use client"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { toast } from "sonner"
import { getAuthHeaders } from "@/lib/getAuthHeaders"

// ——— Helpers de validación/normalización ———
const isValidOffset = (n: unknown) =>
  typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= 720

const uniqSorted = (arr: number[]) =>
  Array.from(new Set(arr)).sort((a, b) => a - b)

// Elimina una sola ocurrencia por valor
const removeOnceByValue = (arr: number[], value: number) => {
  const idx = arr.indexOf(value)
  if (idx === -1) return arr
  return [...arr.slice(0, idx), ...arr.slice(idx + 1)]
}

// Normaliza slugs tipo "24h-control"
const normalizeSlug = (s: string) =>
  s.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9_-]/g, "")

// helpers visuales
function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div className="text-sm font-semibold text-slate-700 mb-2">{children}</div>;
}

const DELAY_HINT = "Usá 6h, 90m, 2d o ISO-8601 (PT6H, PT90M)";

function isValidDelayString(s: string) {
  if (!s || typeof s !== "string") return false
  const v = s.trim()
  if (/^P/i.test(v)) {
    // ISO básica PnDTnHnMnS (aceptamos PT6H, PT90M, P1DT2H...)
    return /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.test(v.toUpperCase())
  }
  // atajos: 6h, 90m, 2d, 45s
  return /^(\d+)\s*(ms|s|m|h|d)$/i.test(v)
}

function prettyProgramacion(p: ReglaProgramacion[] | undefined) {
  if (!Array.isArray(p) || p.length === 0) return "(sin programación)"
  return p.map(r => {
    const canal = r.canal ? `/${r.canal}` : ""
    const fs = r.form_slug ? ` → ${r.form_slug}` : ""
    return `${r.tipo}:${r.delay}${canal}${fs}`
  }).join(", ")
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

type ReglaProgramacion = {
  tipo: 'offset'
  delay: string          // '6h' | '90m' | 'PT6H' | '2d' ...
  canal?: 'whatsapp' | 'sms' | 'email' | string
  form_slug?: string     // si querés forzar que este offset use otro form
}

type Formulario = {
  id?: string | number
  clinica_id?: string
  nombre: string
  slug: string
  activo: boolean
  prioridad: number
  version: number
  programacion_envios?: ReglaProgramacion[]    // 👈 NUEVO (reemplaza offsets_horas)
  campos: any
  reglas_alertas: any
  meta: any
  publicado_en?: string | null
  hoja_destino?: string | null
}

const DEFAULT_REGLAS = { condiciones: [] as any[] }
const DEFAULT_CAMPOS = { preguntas: [] as any[] }

// 👇 Pegar arriba, con los otros helpers
const OPERADORES = new Set(['>','>=','<','<=','==','!=','in','contains','between']);
const NIVELES = new Set(['verde','amarillo','rojo']);

function lintReglas(input: any): { condiciones: any[] } {
  const out: any[] = [];
  const list = Array.isArray(input?.condiciones) ? input.condiciones : [];
  for (const raw of list) {
    if (!raw || typeof raw !== 'object') continue;

    const campo = String(raw.campo ?? '').trim();
    let operador = String(raw.operador ?? '').trim().toLowerCase();
    let nivel = String(raw.nivel ?? 'verde').trim().toLowerCase();
    const valor = raw.valor;

    if (!campo) continue;
    if (!OPERADORES.has(operador)) operador = '==';
    if (!NIVELES.has(nivel)) nivel = 'verde';

    const r: any = { campo, operador, nivel };

    // valor: permitimos string, número, array, boolean. Si viene vacío, skip.
    if (Array.isArray(valor)) r.valor = valor;
    else if (typeof valor === 'string' || typeof valor === 'number' || typeof valor === 'boolean') r.valor = valor;
    else if (valor != null) r.valor = valor;

    // color/sugerencia opcionales
    if (raw.color && typeof raw.color === 'string') r.color = raw.color.trim();
    if (raw.sugerencia && String(raw.sugerencia).trim()) r.sugerencia = String(raw.sugerencia).trim();

    // Aislamiento por formulario (opcional)
    if (raw._form_slug) r._form_slug = String(raw._form_slug).trim();
    if (raw._form_id != null) r._form_id = String(raw._form_id).trim();

    // Debe tener al menos campo + operador + valor definido
    if (!('valor' in r)) continue;

    out.push(r);
  }
  return { condiciones: out };
}

export default function FormulariosPanel({
  clinicaId,
  clinicaHost,
  sheetOptions,                 
}: { clinicaId: string; clinicaHost?: string; sheetOptions?: string[] }) {
  // 👇 centralizá headers
  const auth = getAuthHeaders()
  const hostHeader =
    (clinicaHost ??
     (typeof window !== "undefined" ? window.location.hostname : "")
    ).split(":")[0].toLowerCase().trim()

  const commonHeaders = { ...auth, "x-clinica-host": hostHeader }
  const [items, setItems] = useState<Formulario[]>([])
  const [open, setOpen] = useState(false)
  const [edit, setEdit] = useState<Formulario | null>(null)

  // Errores live de JSON para bloquear guardado
  const [camposErr, setCamposErr] = useState<string>("")
  const [reglasErr, setReglasErr] = useState<string>("")
  const [metaErr, setMetaErr] = useState<string>("")
  const [camposText, setCamposText] = useState<string>("")
  const [reglasText, setReglasText] = useState<string>("")
  const [metaText, setMetaText] = useState<string>("")

  const load = async () => {
    const url = `${process.env.NEXT_PUBLIC_API_URL}/api/formularios?clinica_id=${encodeURIComponent(clinicaId)}`
    try {
      const res = await fetch(url, { headers: commonHeaders, cache: "no-store" })
      if (!res.ok) { setItems([]); return }
      const text = await res.text()
      const data = JSON.parse(text)
      setItems(Array.isArray(data) ? data : data?.data || [])
    } catch (e) {
      console.error("[FormulariosPanel] Fetch error:", e)
      setItems([])
    }
  }

  useEffect(() => { if (clinicaId && hostHeader) load() }, [clinicaId, hostHeader])

  const startCreate = () => {
    const nuevo: Formulario = {
        nombre: "",
        slug: "",
        activo: true,
        prioridad: 10,
        version: 1,
        programacion_envios: [ { tipo: 'offset', delay: '6h', canal: 'whatsapp' } ], // 👈 por defecto
        campos: DEFAULT_CAMPOS,
        reglas_alertas: DEFAULT_REGLAS,
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

    // Versión mínima = 1
    const version = Math.max(1, Number(edit.version || 1));

    // Programación: al menos 1 regla válida
    const prog = Array.isArray(edit.programacion_envios) ? edit.programacion_envios : []
    const progValid = prog
    .map(r => ({
        tipo: 'offset' as const,
        delay: String(r?.delay || '').trim(),
        canal: r?.canal ? String(r.canal).trim() : undefined,
        form_slug: r?.form_slug ? String(r.form_slug).trim() : undefined,
    }))
    .filter(r => isValidDelayString(r.delay))

    // JSON errors vivos
    if (camposErr || reglasErr || metaErr) errs.push("Hay JSON inválido: corregí los errores marcados.")

    // Validación y normalización de reglas_alertas
    let reglasParsed: any = null;
    try {
    const parsed = JSON.parse(reglasText || "{}");
    if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.condiciones)) {
        errs.push("Las reglas deben tener formato { condiciones: [] }.");
    } else {
        reglasParsed = lintReglas(parsed); // 👈 normalización robusta
        if (reglasParsed.condiciones.length === 0) {
        toast.message("Aviso", { description: "No hay condiciones válidas en las reglas (se guardará vacío)." });
        }
    }
    } catch {
    errs.push("JSON de reglas inválido.");
    }

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
      version,
      clinica_id: clinicaId,
      hoja_destino: (edit as any).hoja_destino?.toString().trim() || null,
      reglas_alertas: reglasParsed || DEFAULT_REGLAS,
      programacion_envios: progValid,               
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
        { method: "POST", headers: commonHeaders }
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
                <> · programación: {prettyProgramacion(f.programacion_envios as ReglaProgramacion[])} </>
                {(f as any).hoja_destino ? <> · hoja: “{(f as any).hoja_destino}”</> : null}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setEdit(f)
                  // Precargar con fallbacks SEGUROS
                  setCamposText(JSON.stringify((f.campos ?? DEFAULT_CAMPOS), null, 2))
                  setReglasText(JSON.stringify((f.reglas_alertas ?? DEFAULT_REGLAS), null, 2))
                  setMetaText(JSON.stringify((f.meta ?? {}), null, 2))
                  setCamposErr("")
                  setReglasErr("")
                  setMetaErr("")
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
                list="hojas-clinica"
              />
              {sheetOptions?.length ? (
                <datalist id="hojas-clinica">
                  {sheetOptions.map(h => <option key={h} value={h} />)}
                </datalist>
              ) : null}

              {/* Programación por offset */}
                <div className="col-span-2 rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 shadow-sm">
                <SectionTitle>Programación de envíos</SectionTitle>
                <p className="text-xs text-slate-500 mb-3">
                    Definí reglas de envío. Para cada regla <b>offset</b>, usá un delay como <code>6h</code>, <code>90m</code>, <code>2d</code> o ISO <code>PT6H</code>. {DELAY_HINT}
                </p>

                <div className="space-y-2">
                    {(edit.programacion_envios || []).length === 0 && (
                    <div className="text-xs text-slate-400">No hay reglas aún.</div>
                    )}

                    {(edit.programacion_envios || []).map((r, i) => (
                    <div key={`rule-${i}`} className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center border rounded-lg p-2">
                        <div className="text-xs">
                        <div className="font-medium mb-1">Tipo</div>
                        <Input value="offset" readOnly className="bg-slate-50"/>
                        </div>

                        <div className="text-xs">
                        <div className="font-medium mb-1">Delay</div>
                        <Input
                            placeholder="p. ej., 6h o PT6H"
                            value={r.delay || ""}
                            onChange={(e) => {
                            const next = [...(edit.programacion_envios || [])]
                            next[i] = { ...r, delay: e.target.value }
                            upd("programacion_envios" as any, next)
                            }}
                        />
                        {r.delay && !isValidDelayString(r.delay) && (
                            <div className="text-[11px] text-red-600 mt-1">Formato inválido. {DELAY_HINT}</div>
                        )}
                        </div>

                        <div className="text-xs">
                        <div className="font-medium mb-1">Canal (opcional)</div>
                        <Input
                            placeholder="whatsapp / sms / email"
                            value={r.canal || ""}
                            onChange={(e) => {
                            const next = [...(edit.programacion_envios || [])]
                            const val = e.target.value.trim()
                            next[i] = { ...r, canal: val || undefined }
                            upd("programacion_envios" as any, next)
                            }}
                        />
                        </div>

                        <div className="text-xs">
                        <div className="font-medium mb-1">Form slug (opcional)</div>
                        <Input
                            placeholder="si querés forzar otro formulario"
                            value={r.form_slug || ""}
                            onChange={(e) => {
                            const next = [...(edit.programacion_envios || [])]
                            const val = e.target.value.trim()
                            next[i] = { ...r, form_slug: val || undefined }
                            upd("programacion_envios" as any, next)
                            }}
                        />
                        </div>

                        <div className="md:col-span-4 flex justify-end">
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                            const next = [...(edit.programacion_envios || [])]
                            next.splice(i, 1)
                            upd("programacion_envios" as any, next)
                            }}
                        >
                            Eliminar regla
                        </Button>
                        </div>
                    </div>
                    ))}
                </div>

                <div className="mt-3">
                    <Button
                    variant="outline"
                    onClick={() => {
                        const next = [...(edit.programacion_envios || []), { tipo: 'offset', delay: '6h', canal: 'whatsapp' } as ReglaProgramacion]
                        upd("programacion_envios" as any, next)
                    }}
                    >
                    ➕ Agregar regla offset
                    </Button>
                </div>
                </div>

              {/* Campos */}
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

              {/* Reglas */}
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
                      if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.condiciones)) {
                        setReglasErr("Debe ser { condiciones: [] }")
                      } else {
                        upd("reglas_alertas", { condiciones: parsed.condiciones })
                        setReglasErr("")
                      }
                    } catch {
                      setReglasErr("JSON inválido")
                    }
                  }}
                />
                {reglasErr && <div className="text-xs text-red-600 mt-1">{reglasErr}</div>}
              </div>

              {/* Meta */}
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