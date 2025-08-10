'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  fetchReglas,
  saveReglas,
  previewReglas,
  type ReglasClinicas,
  type ReglaClinica,
  type NivelAlerta,
} from '@/lib/reglasApi';
import {
  Plus,
  Save as SaveIcon,
  Eye,
  Copy,
  Trash2,
  RefreshCw,
  MoveVertical,
  Info,
} from 'lucide-react';

/** Paleta por nivel — usada para chips y fondos */
const NIVEL_STYLES: Record<NivelAlerta, { bg: string; ring: string; dot: string; text: string; hex: string }> = {
  verde:   { bg: 'bg-emerald-50', ring: 'ring-emerald-200', dot: 'bg-emerald-500', text: 'text-emerald-800', hex: '#10B981' },
  amarillo:{ bg: 'bg-amber-50',   ring: 'ring-amber-200',   dot: 'bg-amber-500',   text: 'text-amber-900',   hex: '#F59E0B' },
  rojo:    { bg: 'bg-rose-50',    ring: 'ring-rose-200',    dot: 'bg-rose-500',    text: 'text-rose-900',    hex: '#EF4444' },
};

const OPERADORES = ['>','>=','<','<=','==','!=','in','contains','between'] as const;

export default function ReglasEditor() {
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [okMsg, setOkMsg]       = useState<string | null>(null);
  const [preview, setPreview]   = useState<{ nivel?: NivelAlerta; sugerencia?: string } | null>(null);

  const [reglas, setReglas]     = useState<ReglasClinicas>({ condiciones: [] });

  const [sample, setSample] = useState<Record<string, any>>({
    dolor_24h: 8, dolor_mayor_7: 'Sí', nausea: 'No', satisfaccion: 6
  });

  // ====== LOAD ===============================================================
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

  // ====== MUTATORS ===========================================================
  const addRule = () => {
    const nueva: ReglaClinica = {
      id: (globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)),
      campo: '',
      operador: '==',
      valor: '',
      nivel: 'verde',
      color: NIVEL_STYLES.verde.hex,
      sugerencia: '',
    };
    setReglas(prev => ({ condiciones: [...prev.condiciones, nueva] }));
  };

  const duplicateRule = (idx: number) => {
    setReglas(prev => {
      const list = [...prev.condiciones];
      const base = list[idx];
      const copy: ReglaClinica = { ...base, id: (globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)) };
      list.splice(idx + 1, 0, copy);
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

  const moveRule = (idx: number, dir: -1 | 1) => {
    setReglas(prev => {
      const list = [...prev.condiciones];
      const next = idx + dir;
      if (next < 0 || next >= list.length) return prev;
      [list[idx], list[next]] = [list[next], list[idx]];
      return { condiciones: list };
    });
  };

  const updateRule = (idx: number, patch: Partial<ReglaClinica>) => {
    setReglas(prev => {
      const list = [...prev.condiciones];
      list[idx] = { ...list[idx], ...patch };
      // default color cuando cambie de nivel si no hay color custom
      if (patch.nivel && !patch.color) {
        list[idx].color = NIVEL_STYLES[patch.nivel].hex;
      }
      return { condiciones: list };
    });
  };

  // ====== ACTIONS ============================================================
  const onSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setOkMsg(null);
      // saneamos: sin id
      const payload: ReglasClinicas = {
        condiciones: reglas.condiciones.map(({ id, ...rest }) => rest)
      };
      await saveReglas(payload);
      setOkMsg('Reglas guardadas correctamente.');
    } catch (e: any) {
      setError(e?.message || 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  const onPreview = async () => {
    try {
      setError(null);
      setOkMsg(null);
      setPreview(null);
      const payload: ReglasClinicas = {
        condiciones: reglas.condiciones.map(({ id, ...rest }) => rest)
      };
      const resp = await previewReglas(payload, sample);
      const nivel = (resp?.resultado?.nivel ?? 'verde') as NivelAlerta;
      setPreview({ nivel, sugerencia: resp?.resultado?.sugerencia || '' });
    } catch (e: any) {
      setError(e?.message || 'No se pudo previsualizar');
    }
  };

  // ====== DERIVED ============================================================
  const total = reglas.condiciones.length;
  const headingNote = useMemo(() => {
    const fields = new Set(reglas.condiciones.map(r => r.campo).filter(Boolean));
    return `${total} regla${total === 1 ? '' : 's'} • ${fields.size} campo${fields.size === 1 ? '' : 's'}`;
  }, [reglas]);

  // ====== UI =================================================================
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-7 w-64 bg-slate-100 rounded" />
        <div className="h-4 w-80 bg-slate-100 rounded" />
        <div className="grid gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl border bg-white shadow-sm animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Reglas clínicas</h2>
          <p className="text-slate-500 text-sm">{headingNote}</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onPreview}
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2 border border-amber-200 text-amber-800 hover:bg-amber-50"
            title="Previsualizar con el sample"
          >
            <Eye className="w-4 h-4" /> Previsualizar
          </button>
          <button
            type="button"
            onClick={addRule}
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2 bg-slate-900 text-white hover:bg-black"
          >
            <Plus className="w-4 h-4" /> Agregar regla
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={onSave}
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            <SaveIcon className="w-4 h-4" /> {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-rose-800">
          {error}
        </div>
      )}
      {okMsg && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-800">
          {okMsg}
        </div>
      )}
      {preview?.nivel && (
        <div
          className={`flex items-center justify-between rounded-2xl border px-4 py-3 ${
            NIVEL_STYLES[preview.nivel].bg
          } ${NIVEL_STYLES[preview.nivel].ring} ring-1`}
        >
          <div className="flex items-center gap-3">
            <span className={`h-2.5 w-2.5 rounded-full ${NIVEL_STYLES[preview.nivel].dot}`} />
            <span className={`font-semibold ${NIVEL_STYLES[preview.nivel].text}`}>
              Resultado de preview: {preview.nivel.toUpperCase()}
            </span>
          </div>
          <div className="text-slate-700 text-sm">
            {preview.sugerencia ? <em>“{preview.sugerencia}”</em> : 'Sin sugerencia.'}
          </div>
        </div>
      )}

      {/* Reglas */}
      <div className="space-y-3">
        {reglas.condiciones.map((r, idx) => {
          const nivelUI = NIVEL_STYLES[(r.nivel || 'verde') as NivelAlerta];
          return (
            <div
              key={r.id ?? idx}
              className={`rounded-2xl border bg-white shadow-sm ring-1 ${nivelUI.ring}`}
            >
              {/* Top bar */}
              <div className="flex items-center justify-between px-4 py-2 border-b bg-slate-50/60 rounded-t-2xl">
                <div className="flex items-center gap-2 text-slate-500 text-xs">
                  <MoveVertical className="w-3.5 h-3.5" />
                  <span className="font-medium">#{idx + 1}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="px-2 py-1 text-slate-600 hover:bg-slate-100 rounded-lg"
                    title="Subir"
                    onClick={() => moveRule(idx, -1)}
                  >
                    ↑
                  </button>
                  <button
                    className="px-2 py-1 text-slate-600 hover:bg-slate-100 rounded-lg"
                    title="Bajar"
                    onClick={() => moveRule(idx, +1)}
                  >
                    ↓
                  </button>
                  <button
                    className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-slate-700 hover:bg-slate-100"
                    onClick={() => duplicateRule(idx)}
                    title="Duplicar"
                  >
                    <Copy className="w-4 h-4" /> Duplicar
                  </button>
                  <button
                    className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-rose-700 hover:bg-rose-50"
                    onClick={() => removeRule(idx)}
                    title="Borrar"
                  >
                    <Trash2 className="w-4 h-4" /> Borrar
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="p-4 grid grid-cols-12 gap-3">
                {/* Campo */}
                <div className="col-span-12 md:col-span-4">
                  <label className="text-xs text-slate-500 mb-1 block">Campo</label>
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400">🌼</span>
                    <input
                      className="w-full rounded-xl border px-8 py-2 focus:outline-none focus:ring-2 focus:ring-slate-300"
                      placeholder="Ej: dolor_24h"
                      value={r.campo}
                      onChange={e => updateRule(idx, { campo: e.target.value })}
                    />
                  </div>
                </div>

                {/* Operador */}
                <div className="col-span-6 md:col-span-2">
                  <label className="text-xs text-slate-500 mb-1 block">Operador</label>
                  <select
                    className="w-full rounded-xl border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-300"
                    value={r.operador}
                    onChange={e => updateRule(idx, { operador: e.target.value as any })}
                  >
                    {OPERADORES.map(op => (
                      <option key={op} value={op}>{op}</option>
                    ))}
                  </select>
                </div>

                {/* Valor */}
                <div className="col-span-6 md:col-span-2">
                  <label className="text-xs text-slate-500 mb-1 block">Valor</label>
                  <input
                    className="w-full rounded-xl border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-300"
                    placeholder='Ej: 7 | "Sí" | "7,9"'
                    value={String(r.valor ?? '')}
                    onChange={e => updateRule(idx, { valor: e.target.value })}
                  />
                </div>

                {/* Nivel */}
                <div className="col-span-6 md:col-span-2">
                  <label className="text-xs text-slate-500 mb-1 block">Nivel</label>
                  <div className={`flex items-center gap-2 rounded-xl border px-2 ${nivelUI.bg}`}>
                    <span className={`h-2.5 w-2.5 rounded-full ${nivelUI.dot}`} />
                    <select
                      className="flex-1 bg-transparent py-2 focus:outline-none"
                      value={r.nivel}
                      onChange={e => updateRule(idx, { nivel: e.target.value as NivelAlerta, color: NIVEL_STYLES[e.target.value as NivelAlerta].hex })}
                    >
                      <option value="verde">verde</option>
                      <option value="amarillo">amarillo</option>
                      <option value="rojo">rojo</option>
                    </select>
                  </div>
                </div>

                {/* Color */}
                <div className="col-span-6 md:col-span-2">
                  <label className="text-xs text-slate-500 mb-1 block">Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      className="h-9 w-12 rounded border"
                      value={r.color || nivelUI.hex}
                      onChange={e => updateRule(idx, { color: e.target.value })}
                    />
                    <input
                      className="flex-1 rounded-xl border px-3 py-2"
                      value={r.color || nivelUI.hex}
                      onChange={e => updateRule(idx, { color: e.target.value })}
                    />
                  </div>
                </div>

                {/* Sugerencia */}
                <div className="col-span-12">
                  <label className="text-xs text-slate-500 mb-1 block">Sugerencia</label>
                  <input
                    className="w-full rounded-xl border px-3 py-2"
                    placeholder="Ej: Revisar en guardia"
                    value={r.sugerencia ?? ''}
                    onChange={e => updateRule(idx, { sugerencia: e.target.value })}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Sample de preview */}
      <div className="rounded-2xl border bg-white shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-slate-500" />
            <p className="font-medium text-slate-800">Sample de previsualización</p>
          </div>
          <span className="text-xs text-slate-500 flex items-center gap-1">
            <Info className="w-3.5 h-3.5" />
            Tip: <code className="bg-slate-50 px-1 rounded">between</code> usa "min,max" &nbsp;/&nbsp; <code className="bg-slate-50 px-1 rounded">in</code> usa "Sí,No"
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
          {Object.entries(sample).map(([k, v]) => (
            <div key={k} className="flex gap-2">
              <input
                className="w-1/2 rounded-xl border px-3 py-2"
                value={k}
                onChange={e => {
                  const nv = e.target.value;
                  setSample(s => {
                    const { [k]: oldVal, ...rest } = s;
                    return { ...rest, [nv]: oldVal };
                  });
                }}
              />
              <input
                className="w-1/2 rounded-xl border px-3 py-2"
                value={String(v)}
                onChange={e => setSample(s => ({ ...s, [k]: e.target.value }))}
              />
            </div>
          ))}
        </div>

        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => setSample(s => ({ ...s, nuevo_campo: 'Sí' }))}
            className="rounded-xl px-3 py-2 border hover:bg-slate-50"
          >
            + Campo de sample
          </button>
          <button
            type="button"
            onClick={() => setSample({})}
            className="rounded-xl px-3 py-2 border text-slate-600 hover:bg-slate-50"
          >
            Limpiar
          </button>
        </div>
      </div>

      {/* Sticky actions on mobile */}
      <div className="md:hidden sticky bottom-3 flex gap-2">
        <button
          type="button"
          onClick={addRule}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 bg-slate-900 text-white"
        >
          <Plus className="w-4 h-4" /> Regla
        </button>
        <button
          type="button"
          onClick={onPreview}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 border border-amber-200 text-amber-800"
        >
          <Eye className="w-4 h-4" /> Preview
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={onSave}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 bg-emerald-600 text-white disabled:opacity-60"
        >
          <SaveIcon className="w-4 h-4" /> Guardar
        </button>
      </div>
    </div>
  );
}