// src/components/formularios/FormularioEditor.tsx
"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  FormularioSchema,
  type Formulario,
  type Pregunta,
  type ReglaAlerta,
  SchedulingConfigSchema,
  type ProgramacionEnvio,  
} from "@/types/formularios";
import { nextSendTimes } from "@/lib/scheduling";

type Props = {
  // ⛏️  FIX: los IDs de clínica son UUID → string
  clinicaId: string;
  initial?: Partial<Formulario>;
  onSave: (payload: Formulario) => Promise<void>;
};

export default function FormularioEditor({ clinicaId, initial, onSave }: Props) {
  // ------- estado -------
  const [nombre, setNombre] = useState(initial?.nombre || "");
  const [slug, setSlug] = useState(initial?.slug || "");
  const [activo, setActivo] = useState<boolean>(initial?.activo ?? true);

  const [scheduling, setScheduling] = useState(() =>
    SchedulingConfigSchema.parse(
      initial?.scheduling_config || {
        anchor: "cirugia",
        first_after_hours: 6,
        cadence_hours: 24,
        end_after_hours: 72,
        quiet_hours_start: "21:00",
        quiet_hours_end: "09:00",
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      }
    )
  );

  const [preguntas, setPreguntas] = useState<Pregunta[]>(
    Array.isArray(initial?.preguntas) ? initial!.preguntas : []
  );
  const [reglas, setReglas] = useState<ReglaAlerta[]>(
    initial?.reglas_alertas?.condiciones || []
  );
  const [sugerencias, setSugerencias] = useState<string[]>(
    initial?.reglas_alertas?.sugerencias || []
  );
  const [meta, setMeta] = useState<Record<string, any>>(initial?.meta || {});

  // ------- simulador -------
  const [anchorEjemplo, setAnchorEjemplo] = useState<string>(
    new Date().toISOString().slice(0, 16) // "YYYY-MM-DDTHH:mm"
  );

  // ⏱️ Reglas de envío por offset (persisten en backend)
  const [programacionEnvios, setProgramacionEnvios] = useState<ProgramacionEnvio[]>(
    Array.isArray(initial?.programacion_envios) ? (initial!.programacion_envios as ProgramacionEnvio[]) : []
  );

  // helpers de offset
  const addOffsetRule = () =>
    setProgramacionEnvios((r) => [...r, { tipo: "offset", delay: "6h" }]);

  const updateOffsetRule = (idx: number, patch: Partial<ProgramacionEnvio>) =>
    setProgramacionEnvios((r) => r.map((x, i) => (i === idx ? { ...x, ...patch } : x)));

  const removeOffsetRule = (idx: number) =>
    setProgramacionEnvios((r) => r.filter((_, i) => i !== idx));
  const previewTimes = useMemo(() => {
    try {
      return nextSendTimes(
        scheduling,
        new Date(anchorEjemplo.replace("T", " ") + ":00")
      );
    } catch {
      return [];
    }
  }, [scheduling, anchorEjemplo]);

  // ------- helpers -------
  const addPregunta = () =>
    setPreguntas((p) => [
        ...p,
        {
        id: `campo_${p.length + 1}`,
        etiqueta: "",
        tipo: "text",
        opciones: [],       // si el tipo las pide
        requerido: false,   // si el tipo las pide
        },
    ]);

  const updatePregunta = (idx: number, patch: Partial<Pregunta>) =>
    setPreguntas((p) => p.map((x, i) => (i === idx ? { ...x, ...patch } : x)));

  const removePregunta = (idx: number) =>
    setPreguntas((p) => p.filter((_, i) => i !== idx));

  const addRegla = () =>
    setReglas((r) => [
      ...r,
      { campo: "", operador: ">", valor: 0, nivel: "amarillo" },
    ]);

  const updateRegla = (idx: number, patch: Partial<ReglaAlerta>) =>
    setReglas((r) => r.map((x, i) => (i === idx ? { ...x, ...patch } : x)));

  const removeRegla = (idx: number) =>
    setReglas((r) => r.filter((_, i) => i !== idx));

  // ------- guardar -------
  async function handleSave() {
    // normalizar slug (evita espacios y mayúsculas que luego impiden resolver el formulario por /form/[slug])
    const slugNorm = slug
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9\-]/g, "");

    if (!slugNorm) {
      toast.error("El slug es obligatorio.");
      return;
    }

    // validar delays de programacion_envios
    const delayRegex = /^(\d+)\s*(ms|s|m|h|d)$/i;
    const looksISO = /^P/i;
    for (const r of programacionEnvios) {
      if (!r.delay || (!delayRegex.test(r.delay) && !looksISO.test(r.delay))) {
        toast.error(`Delay inválido: "${r.delay}". Usá 6h, 90m, 2d o PT6H.`);
        return;
      }
    }

    const base: Formulario = {
      // ⛏️  FIX crítico: enviar clinica_id como string correcto
      clinica_id: clinicaId,
      nombre: nombre.trim(),
      slug: slugNorm,
      activo: !!activo,
      scheduling_config: scheduling,
      preguntas,
      reglas_alertas: { condiciones: reglas, sugerencias },
      meta,
      programacion_envios: programacionEnvios,
    } as Formulario;

    const parse = FormularioSchema.safeParse(base);
    if (!parse.success) {
      console.error(parse.error.flatten());
      toast.error("Revisá los campos. Hay errores de validación.");
      return;
    }

    await onSave(parse.data);
    toast.success("Formulario guardado ✔️");
  }


  // ------- UI -------
  return (
    <div className="space-y-6">
      {/* Datos básicos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Input placeholder="Nombre" value={nombre} onChange={e => setNombre(e.target.value)} />
        <Input placeholder="Slug (ej: control-24h)" value={slug}
               onChange={e => setSlug(e.target.value)} />
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={activo} onCheckedChange={(v) => setActivo(!!v)} />
          Activo
        </label>
      </div>

      {/* Scheduling */}
      <div className="rounded-xl border p-4 bg-white space-y-3">
        <h4 className="font-semibold text-[#003366]">⏱️ Envíos programados</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-gray-500">Anclar a</label>
            <select
              className="border rounded px-3 py-2 w-full"
              value={scheduling.anchor}
              onChange={(e) => setScheduling({ ...scheduling, anchor: e.target.value as any })}
            >
              <option value="cirugia">Fecha de cirugía</option>
              <option value="alta">Fecha de alta</option>
              <option value="registro">Fecha de registro</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500">Primer envío (horas)</label>
            <Input type="number" min={0}
              value={scheduling.first_after_hours}
              onChange={(e) => setScheduling({ ...scheduling, first_after_hours: Number(e.target.value) })} />
          </div>
          <div>
            <label className="text-xs text-gray-500">Repetir cada (horas, opcional)</label>
            <Input type="number" min={1}
              value={scheduling.cadence_hours ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                setScheduling({ ...scheduling, cadence_hours: v === "" ? undefined : Number(v) });
              }} />
          </div>
          <div>
            <label className="text-xs text-gray-500">Cortar a las (horas desde ancla, opcional)</label>
            <Input type="number" min={1}
              value={scheduling.end_after_hours ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                setScheduling({ ...scheduling, end_after_hours: v === "" ? undefined : Number(v) });
              }} />
          </div>
          <div>
            <label className="text-xs text-gray-500">Silencio desde</label>
            <Input placeholder="21:00" value={scheduling.quiet_hours_start ?? ""}
              onChange={(e) => setScheduling({ ...scheduling, quiet_hours_start: e.target.value || undefined })} />
          </div>
          <div>
            <label className="text-xs text-gray-500">Silencio hasta</label>
            <Input placeholder="09:00" value={scheduling.quiet_hours_end ?? ""}
              onChange={(e) => setScheduling({ ...scheduling, quiet_hours_end: e.target.value || undefined })} />
          </div>
        </div>

        {/* Simulador */}
        <div className="mt-3 rounded-lg bg-slate-50 p-3">
          <div className="flex items-center gap-3">
            <label className="text-sm">Ancla de ejemplo</label>
            <Input type="datetime-local" className="max-w-xs"
              value={anchorEjemplo}
              onChange={(e) => setAnchorEjemplo(e.target.value)} />
          </div>
          <div className="mt-2 text-sm">
            <div className="text-gray-500 mb-1">Próximos envíos:</div>
            <ul className="list-disc pl-5">
              {previewTimes.map((d, i) => (
                <li key={i}>{d.toLocaleString()}</li>
              ))}
              {previewTimes.length === 0 && <li>No hay envíos programados</li>}
            </ul>
          </div>
        </div>
      </div>

      {/* Reglas de envío por offset */}
      <div className="rounded-xl border p-4 bg-white space-y-3">
        <h4 className="font-semibold text-[#003366]">⏲️ Reglas de envío por offset</h4>

        <p className="text-sm text-gray-600">
          Cada regla crea un envío automático a partir del evento de anclaje (ver arriba).
          Usá <code>6h</code>, <code>90m</code>, <code>2d</code> o ISO 8601 (<code>PT6H</code>).
        </p>

        {programacionEnvios.length === 0 && (
          <div className="text-sm text-gray-500">No hay reglas. Agregá al menos una si querés enviar algo automáticamente.</div>
        )}

        <div className="space-y-2">
          {programacionEnvios.map((r, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-3">
                <label className="text-xs text-gray-500">Tipo</label>
                <Input value="offset" disabled />
              </div>
              <div className="col-span-3">
                <label className="text-xs text-gray-500">Delay</label>
                <Input
                  placeholder="ej: 6h, 90m o PT6H"
                  value={r.delay}
                  onChange={(e) => updateOffsetRule(i, { delay: e.target.value })}
                />
              </div>
              <div className="col-span-3">
                <label className="text-xs text-gray-500">Canal (opcional)</label>
                <Input
                  placeholder="whatsapp"
                  value={r.canal ?? ""}
                  onChange={(e) => updateOffsetRule(i, { canal: e.target.value || undefined })}
                />
              </div>
              <div className="col-span-3">
                <label className="text-xs text-gray-500">Form slug destino (opcional)</label>
                <Input
                  placeholder="control-48h"
                  value={r.form_slug ?? ""}
                  onChange={(e) => updateOffsetRule(i, { form_slug: e.target.value || undefined })}
                />
              </div>
              <div className="col-span-12 flex justify-end">
                <Button variant="outline" onClick={() => removeOffsetRule(i)}>Eliminar</Button>
              </div>
            </div>
          ))}
        </div>

        <Button variant="outline" onClick={addOffsetRule}>+ Agregar regla de offset</Button>
      </div>

      {/* Preguntas */}
      <div className="rounded-xl border p-4 bg-white space-y-3">
        <h4 className="font-semibold text-[#003366]">🧾 Preguntas</h4>
        {preguntas.map((p, i) => (
          <div key={i} className="grid grid-cols-12 gap-2 items-center">
            <Input className="col-span-3" placeholder="id" value={p.id}
                   onChange={(e) => updatePregunta(i, { id: e.target.value })} />
            <Input className="col-span-5" placeholder="Etiqueta" value={p.etiqueta}
                   onChange={(e) => updatePregunta(i, { etiqueta: e.target.value })} />
            <select className="col-span-2 border rounded px-3 py-2"
                    value={p.tipo}
                    onChange={(e) => updatePregunta(i, { tipo: e.target.value as any })}>
              <option value="text">text</option>
              <option value="number">number</option>
              <option value="select">select</option>
              <option value="textarea">textarea</option>
            </select>
            <Button variant="outline" className="col-span-2"
                    onClick={() => removePregunta(i)}>Eliminar</Button>
            {p.tipo === "select" && (
              <div className="col-span-12">
                <Textarea
                  placeholder="Opciones (una por línea)"
                  value={(p.opciones || []).join("\n")}
                  onChange={(e) =>
                    updatePregunta(i, {
                      opciones: e.target.value
                        .split("\n")
                        .map(s => s.trim())
                        .filter(Boolean),
                    })
                  }
                />
              </div>
            )}
          </div>
        ))}
        <Button variant="outline" onClick={addPregunta}>+ Agregar pregunta</Button>
      </div>

      {/* Reglas de alerta */}
      <div className="rounded-xl border p-4 bg-white space-y-3">
        <h4 className="font-semibold text-[#003366]">🚨 Reglas de alerta</h4>
        {reglas.map((r, i) => (
          <div key={i} className="grid grid-cols-12 gap-2">
            <Input className="col-span-4" placeholder="campo" value={r.campo}
                   onChange={(e) => updateRegla(i, { campo: e.target.value })} />
            <select className="col-span-2 border rounded px-3 py-2" value={r.operador}
                    onChange={(e) => updateRegla(i, { operador: e.target.value as any })}>
              <option>{">"}</option><option>{">="}</option>
              <option>{"<"}</option><option>{"<="}</option>
              <option>{"=="}</option><option>{"!="}</option>
              <option>includes</option><option>excludes</option>
            </select>
            <Input className="col-span-3" placeholder="valor"
                   onChange={(e) => {
                     const raw = e.target.value;
                     const num = Number(raw);
                     updateRegla(i, { valor: isNaN(num) ? raw : num });
                   }}
                   value={String(r.valor)} />
            <select className="col-span-2 border rounded px-3 py-2" value={r.nivel}
                    onChange={(e) => updateRegla(i, { nivel: e.target.value as any })}>
              <option value="verde">verde</option>
              <option value="amarillo">amarillo</option>
              <option value="rojo">rojo</option>
            </select>
            <Button variant="outline" onClick={() => removeRegla(i)}>Eliminar</Button>
          </div>
        ))}
        <Button variant="outline" onClick={addRegla}>+ Agregar regla</Button>

        <div className="mt-3">
          <label className="text-xs text-gray-500">Sugerencias (una por línea)</label>
          <Textarea
            value={sugerencias.join("\n")}
            onChange={(e) => setSugerencias(
              e.target.value.split("\n").map(s => s.trim()).filter(Boolean)
            )}
          />
        </div>
      </div>

      {/* Meta */}
      <div className="rounded-xl border p-4 bg-white">
        <h4 className="font-semibold text-[#003366]">🧩 Meta (opcional)</h4>
        <Textarea
          placeholder='JSON (opcional) — ej: {"canal":"whatsapp"}'
          value={JSON.stringify(meta, null, 2)}
          onChange={(e) => {
            try {
              const obj = JSON.parse(e.target.value || "{}");
              setMeta(obj);
            } catch {
              /* no romper la UI; validamos al guardar */
            }
          }}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button onClick={handleSave}>Guardar</Button>
      </div>
    </div>
  );
}