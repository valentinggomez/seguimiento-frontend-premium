import { pgTable, text, uuid, integer, timestamp, date } from 'drizzle-orm/pg-core';
import { numeric } from 'drizzle-orm/pg-core'

const clinicas = pgTable('clinicas', {
  id: uuid('id').primaryKey().defaultRandom(),
  nombre_clinica: text('nombre_clinica').notNull(),
  dominio: text('dominio').notNull(),
  logo_url: text('logo_url'),
  color_primario: text('color_primario'),
});

const pacientes = pgTable('pacientes', {
  id: uuid('id').primaryKey().defaultRandom(),
  nombre: text('nombre').notNull(),
  edad: integer('edad'),
  sexo: text('sexo'),
  altura: numeric('altura'),
  peso: numeric('peso'),
  imc: text('imc'),
  telefono: text('telefono'),
  cirugia: text('cirugia'),
  fecha_cirugia: date('fecha_cirugia'),
  nombre_medico: text('nombre_medico'),
  clinica_id: uuid('clinica_id').notNull().references(() => clinicas.id),
  creado_en: timestamp('creado_en').defaultNow(),
});

const respuestas = pgTable('respuestas', {
  id: uuid('id').primaryKey().defaultRandom(),
  paciente_id: uuid('paciente_id').notNull().references(() => pacientes.id),
  dolor: integer('dolor'),
  nausea: text('nausea'),
  somnolencia: text('somnolencia'),
  observaciones: text('observaciones'),
  clinica_id: uuid('clinica_id').notNull().references(() => clinicas.id), // ✅ AGREGAR ESTA LÍNEA
  creado_en: timestamp('creado_en').defaultNow(),
});

export { clinicas, pacientes, respuestas };
