// src/app/panel/respuestas/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { fetchConToken } from '@/lib/fetchConToken'
import { getAuthHeaders } from '@/lib/getAuthHeaders'
import { useTranslation } from '@/i18n/useTranslation'

const toYesNo = (v: any) => {
  const s = String(v ?? '').trim().toLowerCase()
  if (['si','sí','yes','true','1'].includes(s)) return 'Sí'
  if (['no','false','0'].includes(s)) return 'No'
  return v ?? '—'
}

type NivelAlerta = 'verde' | 'amarillo' | 'rojo';
type Operador = '>'|'>='|'<'|'<='|'=='|'!='|'in'|'contains'|'between';

interface ReglaClinica {
  id?: string;
  campo: string;
  operador: Operador;
  valor: any;
  nivel: NivelAlerta;
  color?: string;
  sugerencia?: string;
  _form_slug?: string | null;
  _form_id?: string | null;  
}
interface ReglasClinicas { condiciones: ReglaClinica[] }

interface Respuesta {
  id: string;
  paciente_nombre: string
  edad: number
  sexo: string
  peso: number
  altura: number
  imc: number
  tipo_cirugia: string
  creado_en: string
  dolor_6h: number
  dolor_24h: number
  dolor_mayor_7: string
  nausea: string
  vomitos: string
  somnolencia: string
  requiere_mas_medicacion: string
  desperto_por_dolor: string
  satisfaccion: number
  observacion: string
  alerta: boolean
  nivel_alerta: string
  score_ia?: number
  sugerencia_ia?: string
  respuestas_formulario?: Record<string, string | number | null>
  campos_personalizados?: Record<string, any> | string | null
  transcripcion?: string;
  sintomas_ia?: string[];
  [key: string]: any;
}
function ModalConfirmacion({
  mostrar,
  cantidad,
  onConfirmar,
  onCancelar,
  t, // ✅ Pasar la función de traducción como prop
}: {
  mostrar: boolean
  cantidad: number
  onConfirmar: () => void
  onCancelar: () => void
  t: (clave: string, variables?: any) => string
}) {
  if (!mostrar) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 shadow-xl max-w-md w-full space-y-4 animate-fadeIn">
        <h3 className="text-lg font-semibold text-red-700">
          {t('respuestas.confirmar_eliminacion_titulo')}
        </h3>
        <p className="text-sm text-gray-700">
          {t('respuestas.confirmar_eliminacion_descripcion', { cantidad })}
        </p>
        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={onCancelar}
            className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
          >
            {t('respuestas.cancelar')}
          </button>
          <button
            onClick={onConfirmar}
            className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
          >
            {t('respuestas.eliminar')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function PanelRespuestas() {
  const [respuestas, setRespuestas] = useState<Respuesta[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [modoEdicion, setModoEdicion] = useState(false)
  const [seleccionadas, setSeleccionadas] = useState<string[]>([])
  const [mostrarModal, setMostrarModal] = useState(false)
  const { t } = useTranslation()
  const [reglasClinicas, setReglasClinicas] = useState<ReglasClinicas>({ condiciones: [] })
  const [labelMap, setLabelMap] = useState<Record<string,string>>({});

  useEffect(() => {
    const fetchRespuestas = async () => {
      try {
        const res = await fetchConToken('/api/respuestas')
        const data = await res.json()
        console.log('📦 Respuestas desde backend:', data)
        if (Array.isArray(data)) {
          setRespuestas(data)
        } else if (data && Array.isArray(data.data)) {
          setRespuestas(data.data)
        } else {
          console.warn('❌ Respuesta inesperada del backend:', data)
          setRespuestas([])
        }
      } catch (e) {
        console.error('Error al cargar respuestas:', e)
      }
    }
    fetchRespuestas()
  }, [])

  useEffect(() => {
    (async () => {
      try {
        const host =
          typeof window !== 'undefined'
            ? window.location.hostname.split(':')[0].toLowerCase().trim()
            : '';

        // 1) clínica + reglas
        const res = await fetchConToken(`/api/clinicas/clinica?host=${encodeURIComponent(host)}`);
        const data = await res.json();

        const reglasClinica = data?.clinica?.reglas_alertas ?? { condiciones: [] };
        const condClinica = Array.isArray(reglasClinica?.condiciones) ? reglasClinica.condiciones : [];

        // 2) etiquetas y reglas por-formulario
        const clinicaId = data?.clinica?.id;
        let labelMapLocal: Record<string, string> = {};
        let condForms: any[] = [];

        if (clinicaId) {
          const rf = await fetchConToken(`/api/formularios?clinica_id=${encodeURIComponent(clinicaId)}`);
          const raw = await rf.json().catch(() => []);
          const forms = Array.isArray(raw) ? raw : (raw?.data || []);

          for (const f of forms) {
            // labels
            const preguntas = f?.campos?.preguntas;
            if (Array.isArray(preguntas)) {
              for (const p of preguntas) {
                const name = String(p?.name || '').trim();
                const label = String(p?.label || '').trim();
                if (name && label) labelMapLocal[name] = label;
              }
            }
            // reglas del formulario
            const rgs = f?.reglas_alertas?.condiciones;
            if (Array.isArray(rgs) && rgs.length) {
              condForms.push(...rgs.map((rg:any) => ({ ...rg, _form_slug: f?.slug ?? null, _form_id: f?.id ?? null })));
              // Si querés aislar por formulario:
              // condForms.push(...rgs.map((rg:any)=>({ ...rg, _form_slug: f.slug })));
            }
          }
        }

        // 3) merge final (clínica + formularios)
        setReglasClinicas({ condiciones: [...condClinica, ...condForms] });
        setLabelMap(labelMapLocal);
      } catch (e) {
        console.warn('No se pudieron cargar reglas o etiquetas', e);
        setReglasClinicas({ condiciones: [] });
        setLabelMap({});
      }
    })();
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id))
  }

  const getCamposPersonalizados = (r: Respuesta): Record<string, any> => {
    try {
      let obj: any = r.campos_personalizados;
      if (typeof obj === 'string') obj = JSON.parse(obj);
      if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return {};

      // ✅ Des-anidar SOLO si es un wrapper puro (sin otras claves útiles)
      if (
        obj.campos_personalizados &&
        typeof obj.campos_personalizados === 'object' &&
        !Array.isArray(obj.campos_personalizados)
      ) {
        const otras = Object.keys(obj).filter(k => k !== 'campos_personalizados');
        if (otras.length === 0) {
          obj = obj.campos_personalizados;
        }
        // si hay otras claves (tu caso), NO lo pisamos
      }

      // 🧹 Limpiar claves internas
      const ocultos = new Set([
        'clinica_id',
        'campos_personalizados',
        'respuestas_formulario',
        'id','creado_en','paciente_nombre',
        'nivel_alerta','alerta','score_ia','sugerencia_ia',
        '_color_alerta', 
      ]);

      const limpio: Record<string, any> = {};
      for (const k of Object.keys(obj)) {
        if (k.startsWith('_')) continue; 
        if (!ocultos.has(k)) limpio[k] = obj[k];
      }

      // 🔧 Normalizar sintomas_ia (soporta string JSON, CSV, objeto, camelCase)
      let s = limpio.sintomas_ia ?? (limpio as any).sintomasIA ?? null;

      if (typeof s === 'string') {
        try { s = JSON.parse(s); } catch {
          s = s.split(/[,\|;]+/).map((x: string) => x.trim()).filter(Boolean);
        }
      }
      if (s && typeof s === 'object' && !Array.isArray(s)) {
        s = Object.values(s).map(String);
      }
      if (Array.isArray(s)) {
        limpio.sintomas_ia = s.map(String).filter(Boolean);
      } else {
        delete limpio.sintomas_ia;
      }

      // 🧹 remover duplicados de respuestas si vinieran adentro de campos_personalizados
      delete (limpio as any).respuestas;
      delete (limpio as any).respuestas_formulario;
      delete (limpio as any).formulario;
      delete (limpio as any).camposExtra;
      delete (limpio as any).campos_extra;

      return limpio;
    } catch (err) {
      console.warn(`❌ Error parseando campos_personalizados para respuesta ${r.id}`, err);
      return {};
    }
  };

  // === Helpers de color (usa _color_alerta del backend si existe) ===
  const nivelToHex: Record<'verde'|'amarillo'|'rojo', string> = {
    verde: '#10B981',
    amarillo: '#F59E0B',
    rojo: '#EF4444',
  }

  function hexToRgba(hex: string, alpha = 0.12) {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    if (!m) return `rgba(16,185,129,${alpha})` // fallback verde
    const r = parseInt(m[1], 16)
    const g = parseInt(m[2], 16)
    const b = parseInt(m[3], 16)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }

  function getColorHex(r: Respuesta) {
    // 1) si hay reglas cargadas en el panel, SIEMPRE usar la evaluación del front
    if (Array.isArray(reglasClinicas?.condiciones) && reglasClinicas.condiciones.length > 0) {
      const { color } = evaluarRespuesta(r, reglasClinicas); // usa color de la regla más severa o default
      return color;
    }

    // 2) si no hay reglas en el front, respetar color enviado por backend (si existe)
    let raw: any = r.campos_personalizados;
    if (typeof raw === 'string') {
      try { raw = JSON.parse(raw) } catch { raw = null }
    }
    const colorBackend: string | undefined =
      raw && typeof raw === 'object' ? (raw as any)._color_alerta : undefined;
    if (colorBackend) return colorBackend;

    // 3) último recurso: nivel_alerta del backend
    const baseNivel = (r.nivel_alerta || 'verde').toLowerCase().trim() as 'verde'|'amarillo'|'rojo';
    return NIVEL_COLOR_DEF[baseNivel] || NIVEL_COLOR_DEF.verde;
  }

  const getRespuestasFormulario = (r: Respuesta): Record<string, any> => {
    try {
      // 0) nombres habituales
      let obj: any =
        (r as any).respuestas_formulario ??
        (r as any).respuestas ??
        (r as any).formulario ??
        null;

      // 1) alternativos que vi en back
      if (!obj) obj = (r as any).camposExtra ?? (r as any).campos_extra ?? null;
      if (!obj) obj = (r as any).respuestas_json ?? (r as any).answers ?? (r as any).form ?? null;

      // 2) envueltos en campos_personalizados
      let cpRaw: any = (r as any).campos_personalizados ?? null;
      if (typeof cpRaw === 'string') { try { cpRaw = JSON.parse(cpRaw) } catch { cpRaw = null } }
      if (!obj && cpRaw && isPlainObject(cpRaw)) {
        obj =
          cpRaw.respuestas_formulario ??
          cpRaw.respuestas ??
          cpRaw.formulario ??
          cpRaw.camposExtra ??
          cpRaw.campos_extra ??
          cpRaw.respuestas_json ??
          null;
      }

      // 3) des-stringificar si hace falta
      if (typeof obj === 'string') { try { obj = JSON.parse(obj) } catch {} }

      // 4) si ya tenemos objeto plano, normalizar/limpiar y devolver
      const cleanup = (input: any) => {
        if (!input || typeof input !== 'object') return {};
        if (Array.isArray(input)) {
          const out: Record<string, any> = {};
          for (const item of input) {
            if (Array.isArray(item) && item.length >= 2) {
              out[String(item[0])] = item[1];
            } else if (item && typeof item === 'object') {
              if ('clave' in item && 'valor' in item) out[String((item as any).clave)] = (item as any).valor;
              else Object.assign(out, item);
            }
          }
          return out;
        }
        const ocultos = new Set(['clinica_id', 'campos_personalizados']);
        const limpio: Record<string, any> = {};
        for (const k of Object.keys(input)) if (!ocultos.has(k)) limpio[k] = (input as any)[k];
        return limpio;
      };

      if (obj && typeof obj === 'object') return cleanup(obj);

      // 5) ——— Fallback: búsqueda profunda por nombres de campos del/los formularios ———
      // usamos los names que ya cargaste en labelMap
      const candidateNames = new Set(Object.keys(labelMap)); // <- ya lo tenés en estado
      if (candidateNames.size >= 2) {
        const deep = deepFindRespuestas({ ...r, _cp: cpRaw }, candidateNames);
        if (deep) return cleanup(deep);
      }

      // si no hay nada, devolvemos objeto vacío
      return {};
    } catch {
      return {};
    }
  };

  const extraerTranscripcion = (r: Respuesta, campos: Record<string, any>) =>
    (typeof campos.transcripcion === 'string' && campos.transcripcion.trim()) ||
    (typeof (r as any).transcripcion_voz === 'string' && (r as any).transcripcion_voz.trim()) ||
    '';

  const extraerSintomas = (r: Respuesta, campos: Record<string, any>) => {
    let s: any = campos.sintomas_ia ?? (r as any).sintomas_ia ?? (campos as any).sintomasIA ?? (r as any).sintomasIA;
    if (!s) return [];
    if (Array.isArray(s)) return s.map(String).filter(Boolean);
    if (typeof s === 'string') {
      try { const p = JSON.parse(s); if (Array.isArray(p)) return p.map(String).filter(Boolean); } catch {}
      return s.split(/[,\|;]+/).map(x => x.trim()).filter(Boolean);
    }
    if (typeof s === 'object') return Object.values(s).map(String).filter(Boolean);
    return [];
  };

  // ——— Helpers para búsqueda profunda de las respuestas ———
  const isPlainObject = (v: any) => v && typeof v === 'object' && !Array.isArray(v);

  /**
   * Busca recursivamente un objeto que contenga al menos 2 claves
   * presentes en candidateNames (nombres de campos de formularios).
   */
  function deepFindRespuestas(source: any, candidateNames: Set<string>) {
    let winner: Record<string, any> | null = null;

    const walk = (node: any) => {
      if (!node || typeof node !== 'object') return;
      if (Array.isArray(node)) { node.forEach(walk); return; }

      const keys = Object.keys(node);
      const matchCount = keys.filter(k => candidateNames.has(String(k))).length;
      if (matchCount >= 2) {
        winner = node as Record<string, any>;
        return; // primer match nos alcanza
      }
      for (const k of keys) walk((node as any)[k]);
    };

    walk(source);
    return winner;
  }

  // === Identificación de formulario origen en la respuesta ===
  function getFormRefFromRespuesta(r: Respuesta) {
    let cp: any = r.campos_personalizados;
    if (typeof cp === 'string') { try { cp = JSON.parse(cp) } catch { cp = null } }

    const slug =
      (r as any).formulario_slug ?? (r as any).form_slug ??
      cp?.['🧾 Formulario Slug'] ?? cp?.form_slug ?? null;

    const id =
      (r as any).formulario_id ?? (r as any).form_id ??
      cp?.['🧾 Formulario ID'] ?? cp?.form_id ?? null;

    return {
      slug: slug ? String(slug) : null,
      id: id ? String(id) : null,
    };
  }

  const parseBetween = (s: string) => {
    const [a, b] = (s || '').split(',').map(v => v.trim().replace(',', '.'))
    const n1 = Number(a), n2 = Number(b)
    return [Math.min(n1, n2), Math.max(n1, n2)]
  }

  const toNum = (x: any) => {
    const s = String(x ?? '').trim().replace(',', '.')
    const n = Number(s)
    return Number.isFinite(n) ? n : NaN
  }

  const cumple = (valorCampo: any, operador: Operador, valorRegla: any) => {
    const vNum = toNum(valorCampo)
    const rNum = toNum(valorRegla)
    const vStr = String(valorCampo ?? '').trim().toLowerCase()
    const rStr = String(valorRegla ?? '').trim().toLowerCase()

    switch (operador) {
      case '>':  return Number.isFinite(vNum) && Number.isFinite(rNum) && vNum >  rNum
      case '>=': return Number.isFinite(vNum) && Number.isFinite(rNum) && vNum >= rNum
      case '<':  return Number.isFinite(vNum) && Number.isFinite(rNum) && vNum <  rNum
      case '<=': return Number.isFinite(vNum) && Number.isFinite(rNum) && vNum <= rNum
      case '==': {
        if (Number.isFinite(vNum) && Number.isFinite(rNum)) return vNum === rNum
        return vStr === rStr
      }
      case '!=': {
        if (Number.isFinite(vNum) && Number.isFinite(rNum)) return vNum !== rNum
        return vStr !== rStr
      }
      case 'contains':
        return vStr.includes(rStr)
      case 'in': {
        const opciones = String(valorRegla ?? '')
          .split(/[,\|;]+/)
          .map(x => x.trim().toLowerCase())
          .filter(Boolean)
        return opciones.includes(vStr)
      }
      case 'between': {
        const [min, max] = parseBetween(String(valorRegla ?? ''))
        return Number.isFinite(vNum) && Number.isFinite(min) && Number.isFinite(max) && vNum >= min && vNum <= max
      }
      default:
        return false
    }
  }

  const ordenarPorPrioridad = (a: string, b: string) => {
    const p = (x: string) => (x === 'rojo' ? 2 : x === 'amarillo' ? 1 : 0)
    return p(b) - p(a) // descendente
  }

  // === Severidad y colores por defecto ===
  const NIVEL_COLOR_DEF: Record<'verde'|'amarillo'|'rojo', string> = {
    verde: '#10B981',
    amarillo: '#F59E0B',
    rojo: '#EF4444',
  }
  const rank = (n: 'verde'|'amarillo'|'rojo') => (n === 'rojo' ? 2 : n === 'amarillo' ? 1 : 0)

  /**
   * Evalúa reglas sobre una respuesta y devuelve:
   * { nivel, sugerencias, color, hitRules }
   * - nivel: peor nivel (verde/amarillo/rojo)
   * - sugerencias: lista deduplicada y ordenada por severidad
   * - color: color para pintar la tarjeta (prioriza color de la regla más severa)
   * - hitRules: reglas que se cumplieron (para debug si querés)
   */
  const evaluarRespuesta = (r: Respuesta, reglas: ReglasClinicas) => {
    // dataset: respuestas de formulario + campos personalizados
    const campos = getCamposPersonalizados(r)
    const form   = getRespuestasFormulario(r)
    const dataset: Record<string, any> = { ...form, ...campos }

    // ⛳ Fallbacks: si el campo no vino en form/campos, tomar del top-level
    const fallbacks: Record<string, any> = {
      dolor_6h: r.dolor_6h,
      dolor_24h: r.dolor_24h,
      nauseas: r.nausea ?? r.nauseas, // por si hay variantes
      vomitos: r.vomitos,
      somnolencia: r.somnolencia,
      requiere_mas_medicacion: r.requiere_mas_medicacion ?? (r as any).mas_medicacion,
      desperto_por_dolor: r.desperto_por_dolor ?? (r as any).desperto_dolor,
      satisfaccion: r.satisfaccion,
    }

    for (const [k, v] of Object.entries(fallbacks)) {
      if (dataset[k] === undefined || dataset[k] === null || dataset[k] === '') {
        dataset[k] = v
      }
    }

    // (opcional) clamp para métricas 0–10 si querés evitar basura como -49:
    const clamp01 = (x: any) => {
      const n = Number(String(x).replace(',', '.'))
      return Number.isFinite(n) ? Math.min(10, Math.max(0, n)) : x
    }
    if (dataset.dolor_6h != null)   dataset.dolor_6h   = clamp01(dataset.dolor_6h)
    if (dataset.dolor_24h != null)  dataset.dolor_24h  = clamp01(dataset.dolor_24h)
    if (dataset.satisfaccion != null) dataset.satisfaccion = clamp01(dataset.satisfaccion)

    let nivelMax: 'verde'|'amarillo'|'rojo' = 'verde'
    let colorByRule: string | null = null
    const sugerenciasTmp: Array<{ texto: string; nivel: 'verde'|'amarillo'|'rojo' }> = []
    const hitRules: ReglaClinica[] = []

    // Identificar formulario de la respuesta (si existe)
    const { slug: respSlug, id: respId } = getFormRefFromRespuesta(r);

    for (const regla of (reglas?.condiciones || [])) {
      if (!regla?.campo) continue;

      // ⛳ Aislar reglas al formulario origen si la regla viene marcada
      if (regla._form_slug && respSlug && String(regla._form_slug) !== String(respSlug)) continue;
      if (regla._form_id   && respId   && String(regla._form_id)   !== String(respId))   continue;

      const valorCampo = dataset[regla.campo];
      if (valorCampo === undefined || valorCampo === null || valorCampo === '') continue
      if (cumple(valorCampo, regla.operador as Operador, regla.valor)) {
        const lv = (regla.nivel as any) || 'verde'
        hitRules.push(regla)

        // actualizar severidad máxima
        if (rank(lv) > rank(nivelMax)) {
          nivelMax = lv
          if (regla.color) colorByRule = regla.color
        } else if (!colorByRule && regla.color && rank(lv) === rank(nivelMax)) {
          // empate de severidad: si aún no hay color, usar este
          colorByRule = regla.color
        }

        if (regla.sugerencia) {
          sugerenciasTmp.push({ texto: String(regla.sugerencia), nivel: lv })
        }
      }
    }

    // dedupe por texto + ordenar por severidad
    const sugerencias = Array.from(
      new Map(sugerenciasTmp.map(s => [s.texto.trim(), s])).values()
    ).sort((a, b) => rank(b.nivel) - rank(a.nivel))

    const color = colorByRule || NIVEL_COLOR_DEF[nivelMax] || NIVEL_COLOR_DEF.verde

    return { nivel: nivelMax, sugerencias, color, hitRules }
  }

  /** Evalúa reglas y devuelve {nivel, sugerencias} (re-usa evaluarRespuesta) */
  const calcularSugerencias = (r: Respuesta) => {
    const { nivel, sugerencias } = evaluarRespuesta(r, reglasClinicas)
    return { nivel, sugerencias }
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6 text-[#003366]">
        {t('respuestas.titulo')}
      </h1>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-[#003366]">
          {t('respuestas.titulo')}
        </h2>
        <button
          onClick={() => {
            setModoEdicion(!modoEdicion)
            setSeleccionadas([])
          }}
          className="text-sm text-white bg-[#003366] px-4 py-2 rounded hover:bg-[#002244] transition"
        >
          {modoEdicion ? t('respuestas.cancelar_edicion') : `🗑️ ${t('respuestas.editar_respuestas')}`}
        </button>
      </div>

      <div className="flex flex-col gap-4">
        {Array.isArray(respuestas) && respuestas.map((r) => (
        (() => {
          const cardColor = getColorHex(r);
          return (
          
          <motion.div
            key={String(r.id)}
            layout
            className={`rounded-xl border p-4 shadow-sm ${modoEdicion ? '' : 'cursor-pointer'}`}
            style={{
              borderColor: cardColor,
              backgroundColor: hexToRgba(cardColor, 0.10),
            }}
            onClick={() => {
              if (!modoEdicion) toggleExpand(String(r.id))
            }}
          >
            <div className="flex justify-between items-center">
              <div>
                {modoEdicion && (
                  <input
                    type="checkbox"
                    onClick={(e) => e.stopPropagation()}
                    className="mr-3 accent-[#003366]"
                    checked={seleccionadas.includes(String(r.id))}
                    onChange={() => {
                      const rid = String(r.id)
                      setSeleccionadas(prev =>
                        prev.includes(rid)
                          ? prev.filter(id => id !== rid)
                          : [...prev, rid]
                      )
                    }}
                  />
                )}
                
                <h2 className="font-semibold text-[#663300] flex items-center gap-2">
                  📄 {t('respuestas.seguimiento_de')} {r.paciente_nombre}
                 </h2> 
                  

                  <p className="text-sm text-gray-700">
                    {r.tipo_cirugia} • {r.edad} {t('respuestas.años')}<br />
                    {t('respuestas.sexo')}: {r.sexo} • {t('respuestas.peso')}: {r.peso}kg • {t('respuestas.altura')}: {r.altura}m • <span className="text-green-600 font-semibold">{t('respuestas.imc')}: {r.imc}</span>
                  </p>

                  <div className="text-sm text-gray-500">
                    {new Date(r.creado_en).toLocaleString('es-AR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
              </div>
            </div>

            {expandedId === String(r.id) && (
              <>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4">
                  {(() => {
                    const campos = getCamposPersonalizados(r)
                    const form   = getRespuestasFormulario(r)

                    const HIDDEN = new Set([
                      'clinica_id',
                      'campos_personalizados',
                      'respuestas_formulario',
                      'respuestas',
                      'formulario',
                      'camposExtra',
                      'campos_extra',
                      'transcripcion',
                      'sintomas_ia',
                      'respuesta_por_voz',
                      '_color_alerta',
                      'form_slug','form_id','🧾 Formulario ID','🧾 Formulario Slug'
                    ]);

                    // primero lo del formulario (mantiene labels con emojis), luego “custom”
                    const paresForm   = Object.entries(form).filter(([k]) => !HIDDEN.has(k))
                    const paresCustom = Object.entries(campos).filter(([k]) => !HIDDEN.has(k))
                    const filas = [...paresForm, ...paresCustom]

                    const transcripcion = extraerTranscripcion(r, campos)
                    const sintomasIA    = extraerSintomas(r, campos)

                    if (filas.length === 0 && !transcripcion && sintomasIA.length === 0) {
                      return <div className="text-gray-500 italic">{t('respuestas.sin_campos')}</div>
                    }

                    // ⛳ DEBUG (remover al cerrar el issue):
                    if (Array.isArray(reglasClinicas?.condiciones) && reglasClinicas.condiciones.length > 0) {
                      const debugEval = evaluarRespuesta(r, reglasClinicas)
                      console.log('[DEBUG front regla]', String(r.id), {
                        nivel: debugEval.nivel,
                        color: debugEval.color,
                        hit: debugEval.hitRules?.map(h => `${h.campo}:${h.operador}:${h.valor}`),
                        keys: Object.keys({
                          ...getRespuestasFormulario(r),
                          ...getCamposPersonalizados(r),
                          dolor_6h: r.dolor_6h,
                          dolor_24h: r.dolor_24h,
                        })
                      })
                    }

                    return (
                      <>
                        {/* 🧾 Dos columnas prolijas */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-2">
                          {filas.map(([label, valor]) => (
                            <div key={String(label)} className="text-[15px] leading-6">
                              <span className="font-semibold text-slate-800">
                                {labelMap[String(label)] ?? String(label).trim()}
                                {(labelMap[String(label)] ?? String(label).trim()).endsWith('?') ? '' : ':'}
                              </span>{' '}
                              <span className="text-slate-900">
                                {typeof valor === 'object' && valor !== null
                                  ? <code className="text-xs">{JSON.stringify(valor)}</code>
                                  : toYesNo(valor)} 
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* 🗣 Transcripción por voz (si hay) */}
                        {transcripcion && (
                          <div className="bg-white rounded-2xl border border-blue-200 p-5 mt-5 shadow-sm">
                            <div className="flex items-center gap-2 text-blue-900 mb-2">
                              <span className="text-xl">🗣️</span>
                              <h3 className="font-semibold">{t('respuestas.transcripcion_voz')}</h3>
                            </div>
                            <blockquote className="text-slate-800 italic border-l-4 border-blue-400 pl-4 whitespace-pre-wrap">
                              {transcripcion}
                            </blockquote>
                          </div>
                        )}

                        {/* 🧬 Síntomas IA (chips) */}
                        {sintomasIA.length > 0 && (
                          <div className="bg-white rounded-2xl border border-slate-200 p-5 mt-5 shadow-sm">
                            <div className="flex items-center gap-2 text-slate-900 mb-2">
                              <span className="text-xl">🧬</span>
                              <h3 className="font-semibold">{t('respuestas.sintomas_detectados_ia')}</h3>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {sintomasIA.map((tag, i) => (
                                <span key={i} className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-800 text-xs">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )
                  })()}
                </motion.div>

                {/* 🧠 BLOQUE DE RESPUESTA POR VOZ Y SÍNTOMAS IA (usando campos parseados) */}
                {(() => {
                  const campos = getCamposPersonalizados(r)
                  const transcripcion = extraerTranscripcion(r, campos)
                  const sintomasIA    = extraerSintomas(r, campos)

                  return (
                    <>
                      {transcripcion && (
                        <div className="bg-gradient-to-br from-blue-50 to-white border border-blue-200 rounded-2xl p-6 mt-4 shadow-sm">
                          <div className="flex items-center gap-2 mb-2 text-blue-900">
                            <span className="text-xl">{'🗣️'}</span>
                            <h3 className="font-semibold text-base tracking-wide">{t('respuestas.transcripcion_voz')}</h3>
                          </div>
                          <blockquote className="text-base text-slate-800 italic leading-relaxed border-l-4 border-blue-400 pl-4 whitespace-pre-wrap">
                            {transcripcion}
                          </blockquote>
                        </div>
                      )}

                      {sintomasIA.length > 0 && (
                        <div className="bg-gradient-to-br from-slate-50 to-white border border-slate-200 rounded-2xl p-6 mt-4 shadow-sm">
                          <div className="flex items-center gap-2 mb-2 text-slate-800">
                            <span className="text-xl">{'🧬'}</span>
                            <h3 className="font-semibold text-base tracking-wide">{t('respuestas.sintomas_detectados_ia')}</h3>
                          </div>
                          <ul className="list-disc list-inside text-base text-slate-700 leading-relaxed ml-2">
                            {sintomasIA.map((tag: string, i: number) => <li key={i}>{tag}</li>)}
                          </ul>
                        </div>
                      )}
                    </>
                  )
                })()}
                {(() => {
                  // 1) sugerencias front (por reglas del panel)
                  const front = reglasClinicas?.condiciones?.length ? calcularSugerencias(r).sugerencias : []

                  // 2) sugerencias backend: leer _sugerencias del JSON crudo (porque getCamposPersonalizados filtra _*)
                  let raw: any = (r as any).campos_personalizados
                  if (typeof raw === 'string') { try { raw = JSON.parse(raw) } catch { raw = null } }
                  const be: Array<{ texto: string; nivel?: 'verde'|'amarillo'|'rojo'; color?: string }> =
                    raw && Array.isArray(raw._sugerencias) ? raw._sugerencias : []

                  // si no hay ninguna, no mostrar bloque
                  if ((!front || front.length === 0) && (!be || be.length === 0)) return null

                  // 3) merge + dedupe por texto (prioriza backend)
                  const todos = [
                    ...be.map(s => ({ ...s, fuente: 'backend' as const })),
                    ...front.map(s => ({ ...s, fuente: 'front' as const })),
                  ]
                  const unicos = Array.from(new Map(todos.map(s => [String(s.texto).trim(), s])).values())

                  return (
                    <div className="bg-white border border-slate-200 rounded-2xl p-4 mt-4 shadow-sm">
                      <div className="flex items-center gap-2 mb-2 text-slate-800">
                        <span className="text-xl">💡</span>
                        <h3 className="font-semibold text-base tracking-wide">Sugerencias</h3>
                      </div>
                      <ul className="mt-1 grid gap-2">
                        {unicos.map((sug, i) => {
                          const dot =
                            (sug as any).color ? (sug as any).color :
                            (sug.nivel === 'rojo' ? '#EF4444' :
                            sug.nivel === 'amarillo' ? '#F59E0B' : '#10B981')
                          return (
                            <li key={i} className="flex items-start gap-2">
                              <span
                                className="mt-1 inline-block h-2.5 w-2.5 rounded-full"
                                style={{ backgroundColor: dot }}
                              />
                              <span className="text-slate-700">
                                {sug.texto}
                                {sug.fuente === 'backend' && (
                                  <span className="ml-2 text-xs text-slate-500">(reglas clínica)</span>
                                )}
                              </span>
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  )
                })()}
              </>
            )}
          </motion.div>
          );
        })()
      ))}
      </div>
      {modoEdicion && seleccionadas.length > 0 && (
        <div className="mt-6 bg-red-50 border border-red-200 rounded-xl p-4 text-center space-y-3">
          <p className="text-sm text-red-700">
            {t('respuestas.seleccionadas')}: {seleccionadas.length}
          </p>
          <button
            onClick={() => setMostrarModal(true)}
            className="bg-red-600 text-white font-semibold px-6 py-2 rounded-xl hover:bg-red-700 transition"
          >
            {t('respuestas.eliminar_respuestas_seleccionadas')}
          </button>
          <ModalConfirmacion
            mostrar={mostrarModal}
            cantidad={seleccionadas.length}
            onCancelar={() => setMostrarModal(false)}
            t={t}
            onConfirmar={async () => {
              try {
                const ids = seleccionadas.map(String); // 👈 mantener como string (UUID)
                const res = await fetchConToken('/api/respuestas', {
                  method: 'DELETE',
                  headers: getAuthHeaders(),
                  body: JSON.stringify({ ids }),
                })
                if (res.ok) {
                  setRespuestas(prev => prev.filter(r => !ids.includes(String(r.id))))
                  setSeleccionadas([])
                  setModoEdicion(false)
                  setMostrarModal(false)
                } else {
                  alert('❌ ' + t('respuestas.error_eliminar'))
                }
              } catch (e) {
                alert('❌ ' + t('respuestas.error_servidor'))
              }
            }}
          />
        </div>
      )}
    </div> 
  )
}
