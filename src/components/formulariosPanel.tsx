"use client"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog"
import { toast } from "sonner"
import { getAuthHeaders } from "@/lib/getAuthHeaders"

type Formulario = {
  id?: string
  clinica_id?: string
  nombre: string
  slug: string
  activo: boolean
  prioridad: number
  version: number
  dias_semana: number[]         // [0..6]
  hora_inicio: string           // "HH:mm"
  hora_fin: string              // "HH:mm"
  campos: any                   // JSON
  reglas_alertas: any           // JSON
  meta: any                     // JSON
  publicado_en?: string | null
}

export default function FormulariosPanel({ clinicaId }: { clinicaId: string }) {
  const [items, setItems] = useState<Formulario[]>([])
  const [open, setOpen] = useState(false)
  const [edit, setEdit] = useState<Formulario | null>(null)
  const DIAS = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"]

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
      dias_semana: [1,2,3,4,5],
      hora_inicio: "09:00",
      hora_fin: "21:00",
      campos: { preguntas: [] },
      reglas_alertas: { condiciones: [], sugerencias: [] },
      meta: {},
      publicado_en: new Date().toISOString()
    })
    setOpen(true)
  }

  const save = async () => {
    if (!edit) return
    const method = edit.id ? "PUT" : "POST"
    const url = edit.id
      ? `${process.env.NEXT_PUBLIC_API_URL}/api/formularios/${edit.id}`
      : `${process.env.NEXT_PUBLIC_API_URL}/api/formularios`
    const res = await fetch(url, {
      method,
      headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ ...edit, clinica_id: clinicaId })
    })
    if (res.ok) {
      toast.success("Formulario guardado")
      setOpen(false); setEdit(null); load()
    } else {
      const e = await res.json().catch(()=>({}))
      toast.error(e?.error || "No se pudo guardar")
    }
  }

  const toggle = async (id: string) => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/formularios/${id}/toggle`, {
      method: "POST",
      headers: getAuthHeaders()
    })
    if (res.ok) load()
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
                v{f.version} · prioridad {f.prioridad} · {f.hora_inicio}-{f.hora_fin} · días: {f.dias_semana?.join(",")}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setEdit(f); setOpen(true) }}>Editar</Button>
              <Button variant="outline" onClick={() => toggle(f.id!)}>{f.activo ? "Desactivar" : "Activar"}</Button>
              <Button variant="destructive" onClick={() => del(f.id!)}>Eliminar</Button>
            </div>
          </div>
        ))}
        {items.length === 0 && <div className="text-sm text-gray-500">No hay formularios aún.</div>}
      </div>

      {/* Modal Crear/Editar */}
      <Dialog open={open} onOpenChange={(o)=>{ setOpen(o); if(!o) setEdit(null) }}>
        <DialogContent className="max-w-3xl">
          <DialogTitle>{edit?.id ? "Editar formulario" : "Nuevo formulario"}</DialogTitle>
          <DialogDescription>Definí reglas de envío y campos del form.</DialogDescription>

          {edit && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input placeholder="Nombre" value={edit.nombre} onChange={e=>upd("nombre", e.target.value)} />
              <Input placeholder="Slug" value={edit.slug} onChange={e=>upd("slug", e.target.value)} />
              <Input placeholder="Versión" type="number" value={edit.version} onChange={e=>upd("version", Number(e.target.value||0))} />
              <Input placeholder="Prioridad" type="number" value={edit.prioridad} onChange={e=>upd("prioridad", Number(e.target.value||0))} />
              <Input placeholder="Hora inicio (HH:mm)" value={edit.hora_inicio} onChange={e=>upd("hora_inicio", e.target.value)} />
              <Input placeholder="Hora fin (HH:mm)" value={edit.hora_fin} onChange={e=>upd("hora_fin", e.target.value)} />

              <div className="col-span-2">
                <div className="text-sm font-medium mb-1">Días de envío</div>
                <div className="flex flex-wrap gap-3">
                  {DIAS.map((d, i)=>(
                    <label key={i} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={edit.dias_semana.includes(i)}
                        onCheckedChange={(on)=> {
                          const set = new Set(edit.dias_semana)
                          on ? set.add(i) : set.delete(i)
                          upd("dias_semana", Array.from(set).sort())
                        }}
                      /> {d}
                    </label>
                  ))}
                </div>
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