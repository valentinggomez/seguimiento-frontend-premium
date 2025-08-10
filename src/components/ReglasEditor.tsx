'use client';

import { useEffect, useMemo, useState } from 'react';
import { fetchReglas, saveReglas, previewReglas, type ReglasClinicas, type ReglaClinica, type NivelAlerta } from '@/lib/reglasApi';

export default function ReglasEditor() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reglas, setReglas] = useState<ReglasClinicas>({ condiciones: [] });

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
      nivel: 'verde' as NivelAlerta,
      color: '',
      sugerencia: ''
    };
    setReglas(prev => ({ condiciones: [...prev.condiciones, nueva] }));
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

  const onSave = async () => {
    try {
      setSaving(true);
      setError(null);
      const payload: ReglasClinicas = {
        condiciones: reglas.condiciones.map(({ id, ...rest }) => rest)
      };
      await saveReglas(payload);
      alert('Reglas guardadas ✔️');
    } catch (e: any) {
      setError(e?.message || 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  const [sample, setSample] = useState<Record<string, any>>({
    dolor_24h: 8, dolor_mayor_7: 'Sí', nausea: 'No', satisfaccion: 6
  });

  const onPreview = async () => {
    try {
      setError(null);
      const payload: ReglasClinicas = {
        condiciones: reglas.condiciones.map(({ id, ...rest }) => rest)
      };
      const resp = await previewReglas(payload, sample);
      alert(`Preview\nNivel: ${resp?.resultado?.nivel || 'n/a'}\nSugerencia: ${resp?.resultado?.sugerencia || '-'}`);
    } catch (e: any) {
      setError(e?.message || 'No se pudo previsualizar');
    }
  };

  const operadores = ['>','>=','<','<=','==','!=','in','contains','between'];

  if (loading) return <div className="p-6">Cargando reglas…</div>;

  return (
    <div className="space-y-4">
      {error && <div className="rounded-md bg-red-50 border border-red-200 p-3 text-red-700">{error}</div>}

      {/* tabla/ lista simple de reglas */}
      <div className="space-y-2">
        {reglas.condiciones.map((r, idx) => (
          <div key={r.id ?? idx} className="grid grid-cols-6 gap-2 items-center border p-3 rounded-lg">
            <input
              className="border rounded px-2 py-1"
              placeholder="campo (ej: dolor_24h)"
              value={r.campo}
              onChange={e => updateRule(idx, { campo: e.target.value })}
            />
            <select
              className="border rounded px-2 py-1"
              value={r.operador}
              onChange={e => updateRule(idx, { operador: e.target.value as any })}
            >
              {operadores.map(op => <option key={op} value={op}>{op}</option>)}
            </select>
            <input
              className="border rounded px-2 py-1"
              placeholder='valor (7 | "Sí" | "7,9" | "Sí,No")'
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
            <input
              className="border rounded px-2 py-1"
              placeholder="#EF4444"
              value={r.color ?? ''}
              onChange={e => updateRule(idx, { color: e.target.value })}
            />
            <button
              type="button"
              onClick={() => removeRule(idx)}
              className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200"
            >
              Borrar
            </button>
            <input
              className="col-span-6 border rounded px-2 py-1"
              placeholder="Sugerencia (ej: Revisar en guardia)"
              value={r.sugerencia ?? ''}
              onChange={e => updateRule(idx, { sugerencia: e.target.value })}
            />
          </div>
        ))}
      </div>

      {/* sample de preview editable */}
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
      </div>

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
          disabled={saving}
          onClick={onSave}
          className="px-4 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
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