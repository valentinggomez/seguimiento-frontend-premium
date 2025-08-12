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

export const FormularioSchema = z.object({
  id: z.number().optional(),
  clinica_id: z.number(),
  nombre: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  activo: z.boolean().default(true),

  // NUEVO: configuración de envíos por horas
  scheduling_config: SchedulingConfigSchema,

  // Builder de preguntas (reemplaza “Campos JSON”)
  preguntas: z.array(PreguntaSchema).default([]),

  // Reglas de alerta
  reglas_alertas: z.object({
    condiciones: z.array(ReglaAlertaSchema).default([]),
    sugerencias: z.array(z.string()).default([]),
  }),

  // Meta libre (key/value)
  meta: z.record(z.string(), z.any()).optional().default({}),
});
export type Formulario = z.infer<typeof FormularioSchema>;