"use client"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog"
import { toast } from "sonner"
import { getAuthHeaders } from "@/lib/getAuthHeaders"

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
}

export default function FormulariosPanel({ clinicaId }: { clinicaId: string }) {
  const [items, setItems] = useState<Formulario[]>([])
  const [open, setOpen] = useState(false)
  const [edit, setEdit] = useState<Formulario | null>(null)

  const load = async () => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/formularios?clinica_id=${clinicaId}`, {
      headers: getAuthHeaders()
    })
    const data = await res.json()
    setItems(Array.isArray(data) ? data : data?.data || [])
  }

  useEffect(() => { if (clinicaId) load() }, [clinicaId])

  const startCreate = () => {
    setEdit({
      nombre: "",
      slug: "",
      activo: true,
      prioridad: 10,
      version: 1,
      offsets_horas: [6, 24, 48],
      campos: { preguntas: [] },
      reglas_alertas: { condiciones: [], sugerencias: [] },
      meta: {},
      publicado_en: new Date().toISOString()
    })
    setOpen(true)
  }

  const save = async () => {
    if (!edit) return;

    const errs: string[] = [];

    // Validaciones básicas
    if (!edit.nombre?.trim()) errs.push("El nombre es obligatorio.");
    if (!edit.slug?.trim()) errs.push("El slug es obligatorio.");

    // Validación offsets
    if (!Array.isArray(edit.offsets_horas) || edit.offsets_horas.length === 0) {
        errs.push("Agregá al menos un recordatorio en horas (+N).")
    } else {
        const invalid = edit.offsets_horas.some(
        (n) => typeof n !== "number" || !Number.isFinite(n) || n < 0 || n > 720
        )
        if (invalid) errs.push("Offsets inválidos. Usá números entre 0 y 720 horas.")
    }

    // slug único local
    const dup = items.find(i => i.slug === edit.slug && i.id !== edit.id);
    if (dup) errs.push("El slug ya existe en esta clínica.");

    if (errs.length) {
        errs.forEach(e => toast.error(e));
        return;
    }

    const method = edit.id ? "PUT" : "POST";
    const url = edit.id
        ? `${process.env.NEXT_PUBLIC_API_URL}/api/formularios/${edit.id}`
        : `${process.env.NEXT_PUBLIC_API_URL}/api/formularios`;

    const res = await fetch(url, {
        method,
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ ...edit, clinica_id: clinicaId }),
    });

    if (res.ok) {
        toast.success("Formulario guardado");
        setOpen(false);
        setEdit(null);
        load();
    } else {
        const e = await res.json().catch(() => ({}));
        toast.error(e?.error || "No se pudo guardar");
    }
    };

    const toggle = async (id: string | number) => {
    try {
        const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/formularios/${id}/toggle`,
        {
            method: "POST",
            headers: getAuthHeaders(),
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
      headers: getAuthHeaders()
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
                    ? <> · envíos: {f.offsets_horas.slice().sort((a,b)=>a-b).map(n => `+${n}h`).join(", ")}</>
                    : <> · (sin offsets configurados)</>}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setEdit(f); setOpen(true) }}>Editar</Button>
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
              
            {/* Offsets (horas después del registro) */}
            <div className="col-span-2 rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 shadow-sm">
            <SectionTitle>Recordatorios (horas después del registro)</SectionTitle>

            {/* Chips */}
            <div className="flex flex-wrap gap-2 mb-3">
                {(edit.offsets_horas || []).length > 0 ? (
                edit.offsets_horas!.slice().sort((a, b) => a - b).map((h, idx) => (
                    <Chip key={`${h}-${idx}`} onRemove={() => {
                    const next = (edit.offsets_horas || []).filter((_, i) => i !== idx)
                    upd("offsets_horas", next)
                    }}>
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
                onKeyDown={(e) => {
                    if (e.key === "Enter") {
                    const val = Number((e.target as HTMLInputElement).value)
                    if (Number.isFinite(val) && val >= 0 && val <= 720) {
                        const set = new Set([...(edit.offsets_horas || []), val])
                        upd("offsets_horas", Array.from(set))
                        ;(e.target as HTMLInputElement).value = ""
                    } else {
                        toast.error("Valor inválido. Usá 0–720.")
                    }
                    }
                }}
                />
                <Button
                type="button"
                onClick={() => {
                    const el = document.activeElement as HTMLInputElement
                    const val = Number(el?.value)
                    if (Number.isFinite(val) && val >= 0 && val <= 720) {
                    const set = new Set([...(edit.offsets_horas || []), val])
                    upd("offsets_horas", Array.from(set))
                    el.value = ""
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
                  className="w-full border rounded p-2 text-sm min-h-[120px]"
                  value={JSON.stringify(edit.campos, null, 2)}
                  onChange={e=>{
                    try { upd("campos", JSON.parse(e.target.value)) }
                    catch { /* ignorar mientras escribe */ }
                  }}
                />
              </div>

              <div className="col-span-2">
                <div className="text-sm font-medium">Reglas de alertas (JSON)</div>
                <textarea
                  className="w-full border rounded p-2 text-sm min-h-[120px]"
                  value={JSON.stringify(edit.reglas_alertas, null, 2)}
                  onChange={e=>{
                    try { upd("reglas_alertas", JSON.parse(e.target.value)) }
                    catch {}
                  }}
                />
              </div>

              <div className="col-span-2">
                <div className="text-sm font-medium">Meta (JSON)</div>
                <textarea
                  className="w-full border rounded p-2 text-sm min-h-[90px]"
                  value={JSON.stringify(edit.meta, null, 2)}
                  onChange={e=>{
                    try { upd("meta", JSON.parse(e.target.value)) }
                    catch {}
                  }}
                />
              </div>

              <div className="col-span-2 flex items-center justify-between mt-2">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={edit.activo} onCheckedChange={(on)=>upd("activo", !!on)} /> Activo
                </label>
                <Button onClick={save}>Guardar</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}