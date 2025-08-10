'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  fetchReglas,
  saveReglas,
  previewReglas,
  type ReglasClinicas,
  type ReglaClinica,
  type NivelAlerta
} from '@/lib/reglasApi';

const SUGERIDOS = [
  'dolor_6h','dolor_24h','dolor_mayor_7','nausea','vomitos','somnolencia',
  'requiere_mas_medicacion','desperto_por_dolor','satisfaccion','horas_movio_extremidades'
];

const OPERADORES = ['>','>=','<','<=','==','!=','in','contains','between'] as const;

export default function ReglasEditor() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reglas, setReglas] = useState<ReglasClinicas>({ condiciones: [] });

  const [previewRes, setPreviewRes] = useState<{ nivel?: string; sugerencia?: string } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const r = await fetchReglas();
        setReglas({ condiciones: Array.isArray(r.condiciones) ? r.condiciones : [] });
      } catch (e: any) {
        setError(e?.message || 'Error al cargar reglas');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const addRule = () => {
    const nueva: ReglaClinica = {
      id: (globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)),
      campo: '',
      operador: '==',
      valor: '',
      nivel: 'verde',
      color: '#22c55e',
      sugerencia: ''
    };
    setReglas(prev => ({ condiciones: [...prev.condiciones, nueva] }));
  };

  const duplicateRule = (idx: number) => {
    setReglas(prev => {
      const base = prev.condiciones[idx];
      const copia: ReglaClinica = { ...base, id: (globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)) };
      const list = [...prev.condiciones];
      list.splice(idx + 1, 0, copia);
      return { condiciones: list };
    });
  };

  const removeRule = (idx: number) => {
    setReglas(prev => {
      const list = [...prev.condiciones];
      list.splice(idx, 1);
      return { condiciones: list };
    });
  };

  const updateRule = (idx: number, patch: Partial<ReglaClinica>) => {
    setReglas(prev => {
      const list = [...prev.condiciones];
      list[idx] = { ...list[idx], ...patch };
      return { condiciones: list };
    });
  };

  const [sample, setSample] = useState<Record<string, any>>({
    dolor_24h: 8, dolor_mayor_7: 'Sí', nausea: 'No', satisfaccion: 6
  });

  const valorPlaceholder = (op: string) => {
    switch (op) {
      case 'between': return 'min,max  (ej: 7,9)';
      case 'in': return 'val1,val2  (ej: Sí,No)';
      case 'contains': return 'subcadena  (ej: fiebre)';
      default: return 'valor (ej: 7 | Sí)';
    }
  };

  const validar = (r: ReglaClinica) => {
    if (!r.campo?.trim()) return 'Falta campo';
    if (!OPERADORES.includes(r.operador as any)) return 'Operador inválido';
    if (r.valor === undefined || r.valor === null || String(r.valor).trim() === '') return 'Falta valor';
    if (!['verde','amarillo','rojo'].includes(r.nivel)) return 'Nivel inválido';
    return null;
  };

  const canSave = useMemo(() => {
    if (!reglas.condiciones.length) return false;
    return reglas.condiciones.every(r => validar(r) === null);
  }, [reglas]);

  const onSave = async () => {
    try {
      setSaving(true);
      setError(null);
      const payload: ReglasClinicas = {
        condiciones: reglas.condiciones.map(({ id, ...rest }) => rest)
      };
      await saveReglas(payload);
      setPreviewRes(null);
    } catch (e: any) {
      setError(e?.message || 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  const onPreview = async () => {
    try {
      setError(null);
      const payload: ReglasClinicas = {
        condiciones: reglas.condiciones.map(({ id, ...rest }) => rest)
      };
      const resp = await previewReglas(payload, sample);
      setPreviewRes({
        nivel: resp?.resultado?.nivel,
        sugerencia: resp?.resultado?.sugerencia
      });
    } catch (e: any) {
      setError(e?.message || 'No se pudo previsualizar');
      setPreviewRes(null);
    }
  };

  if (loading) return <div className="p-6">Cargando reglas…</div>;

  return (
    <div className="space-y-4">
      {error && <div className="rounded-md bg-red-50 border border-red-200 p-3 text-red-700">{error}</div>}

      {/* Lista de reglas */}
      <div className="space-y-2">
        {reglas.condiciones.map((r, idx) => {
          const err = validar(r);
          return (
            <div key={r.id ?? idx} className={`grid grid-cols-7 gap-2 items-center border p-3 rounded-lg ${err ? 'border-red-300' : 'border-slate-200'}`}>
              <span className="text-xs text-slate-500 font-medium">#{idx + 1}</span>

              {/* Campo con datalist */}
              <div className="col-span-2">
                <input
                  list="campos-sugeridos"
                  className="w-full border rounded px-2 py-1"
                  placeholder="campo (ej: dolor_24h)"
                  value={r.campo}
                  onChange={e => updateRule(idx, { campo: e.target.value })}
                />
                <datalist id="campos-sugeridos">
                  {SUGERIDOS.map(c => <option key={c} value={c} />)}
                </datalist>
              </div>

              <select
                className="border rounded px-2 py-1"
                value={r.operador}
                onChange={e => updateRule(idx, { operador: e.target.value as any })}
              >
                {OPERADORES.map(op => <option key={op} value={op}>{op}</option>)}
              </select>

              <input
                className="border rounded px-2 py-1"
                placeholder={valorPlaceholder(r.operador)}
                value={String(r.valor ?? '')}
                onChange={e => updateRule(idx, { valor: e.target.value })}
              />

              <select
                className="border rounded px-2 py-1"
                value={r.nivel}
                onChange={e => updateRule(idx, { nivel: e.target.value as NivelAlerta })}
              >
                <option value="verde">verde</option>
                <option value="amarillo">amarillo</option>
                <option value="rojo">rojo</option>
              </select>

              {/* Color picker */}
              <input
                type="color"
                className="h-9 w-full border rounded"
                value={r.color || '#999999'}
                onChange={e => updateRule(idx, { color: e.target.value })}
                title="Color opcional"
              />

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => duplicateRule(idx)}
                  className="px-3 py-1 rounded bg-slate-100 hover:bg-slate-200"
                  title="Duplicar"
                >
                  Duplicar
                </button>
                <button
                  type="button"
                  onClick={() => removeRule(idx)}
                  className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200"
                >
                  Borrar
                </button>
              </div>

              {/* Sugerencia */}
              <input
                className="col-span-7 border rounded px-2 py-1"
                placeholder="Sugerencia (ej: Revisar en guardia)"
                value={r.sugerencia ?? ''}
                onChange={e => updateRule(idx, { sugerencia: e.target.value })}
              />

              {/* Error inline */}
              {err && <div className="col-span-7 text-xs text-red-600">{err}</div>}
            </div>
          );
        })}
      </div>

      {/* Sample de preview */}
      <div className="border rounded-lg p-3 space-y-2">
        <p className="font-semibold">Sample de previsualización</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {Object.entries(sample).map(([k, v]) => (
            <div key={k} className="flex gap-2 items-center">
              <input
                className="border rounded px-2 py-1 w-full"
                value={k}
                onChange={e => {
                  const nv = e.target.value;
                  setSample(s => {
                    const { [k]: _old, ...rest } = s;
                    return { ...rest, [nv]: v };
                  });
                }}
              />
              <input
                className="border rounded px-2 py-1 w-full"
                value={String(v)}
                onChange={e => setSample(s => ({ ...s, [k]: e.target.value }))}
              />
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setSample(s => ({ ...s, nuevo_campo: 'Sí' }))}
          className="text-sm px-3 py-1 rounded bg-gray-100 hover:bg-gray-200"
        >
          + Campo de sample
        </button>

        {/* resultado preview */}
        {previewRes && (
          <div className="mt-3 flex items-center gap-3">
            <span className={`px-2 py-1 rounded text-white text-sm ${previewRes.nivel === 'rojo' ? 'bg-red-500' : previewRes.nivel === 'amarillo' ? 'bg-amber-500' : 'bg-emerald-500'}`}>
              {previewRes.nivel?.toUpperCase() || 'N/A'}
            </span>
            <span className="text-slate-700 text-sm">{previewRes.sugerencia || 'Sin sugerencia'}</span>
          </div>
        )}
      </div>

      {/* Acciones */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={addRule}
          className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
        >
          + Agregar regla
        </button>
        <button
          type="button"
          onClick={onPreview}
          className="px-4 py-2 rounded bg-amber-500 text-white hover:bg-amber-600"
        >
          Previsualizar
        </button>
        <button
          type="button"
          disabled={saving || !canSave}
          onClick={onSave}
          className="px-4 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
          title={!canSave ? 'Corregí los campos marcados' : ''}
        >
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
      </div>

      <p className="text-sm text-gray-500">
        Tip: <code>between</code> acepta "min,max". <code>in</code> acepta "Sí,No".
      </p>
    </div>
  );
}