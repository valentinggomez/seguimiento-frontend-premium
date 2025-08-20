// src/types/formularios.ts
import { z } from "zod";

export const ReglaAlertaSchema = z.object({
  campo: z.string().min(1),
  operador: z.enum([">", ">=", "<", "<=", "==", "!=", "includes", "excludes"]),
  valor: z.union([z.number(), z.string(), z.boolean()]),
  nivel: z.enum(["verde", "amarillo", "rojo"]),
});
export type ReglaAlerta = z.infer<typeof ReglaAlertaSchema>;

export const PreguntaSchema = z.object({
  id: z.string().min(1),              // ej: "dolor_24h"
  etiqueta: z.string().min(1),        // label que ve el paciente
  tipo: z.enum(["text", "number", "select", "textarea"]),
  opciones: z.array(z.string()).optional(), // solo para select
  requerido: z.boolean().optional().default(false),
});
export type Pregunta = z.infer<typeof PreguntaSchema>;

export const SchedulingConfigSchema = z.object({
  anchor: z.enum(["cirugia", "alta", "registro"]), // punto de anclaje
  first_after_hours: z.number().int().min(0),      // primer envío
  cadence_hours: z.number().int().min(1).optional(), // repetición opcional
  end_after_hours: z.number().int().min(1).optional(), // cuándo cortar
  quiet_hours_start: z.string().regex(/^\d{2}:\d{2}$/).optional(), // "21:00"
  quiet_hours_end: z.string().regex(/^\d{2}:\d{2}$/).optional(),   // "09:00"
  timezone: z.string().optional(), // ej: "America/Argentina/Buenos_Aires"
});
export type SchedulingConfig = z.infer<typeof SchedulingConfigSchema>;

// NUEVO: regla de programación por offset
export const ProgramacionEnvioSchema = z.object({
  tipo: z.literal("offset"),
  /** Acepta "6h", "90m", "2d" o ISO 8601 tipo "PT6H" */
  delay: z.string().min(1),
  canal: z.string().optional(),      // ej: "whatsapp"
  form_slug: z.string().optional(),  // ej: "control-48h"
});
export type ProgramacionEnvio = z.infer<typeof ProgramacionEnvioSchema>;

export const FormularioSchema = z.object({
  // Si tus IDs son UUID string, usá string. Si hoy usás números en el front, podés dejar number.
  id: z.union([z.string(), z.number()]).optional(),
  clinica_id: z.union([z.string(), z.number()]),

  nombre: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  activo: z.boolean().default(true),

  // ⚠️ Si no usás este bloque en el front, hacelo optional para no exigirlo
  scheduling_config: SchedulingConfigSchema.optional(),

  // Builder de preguntas (lo dejamos como lo tenías)
  preguntas: z.array(PreguntaSchema).default([]),

  // Reglas de alerta (como lo tenías)
  reglas_alertas: z.object({
    condiciones: z.array(ReglaAlertaSchema).default([]),
    sugerencias: z.array(z.string()).default([]),
  }),

  // Meta libre (como lo tenías)
  meta: z.record(z.string(), z.any()).optional().default({}),

  // ✅ NUEVO: la fuente de verdad para offsets/“cooldown” de envío
  programacion_envios: z.array(ProgramacionEnvioSchema).default([]),

  // (Opcional) compat legacy si en algún lado seguís leyendo esto
  // offsets_horas: z.array(z.number()).optional().default([]),
});
export type Formulario = z.infer<typeof FormularioSchema>;