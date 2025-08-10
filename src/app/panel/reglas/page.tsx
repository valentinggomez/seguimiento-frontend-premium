'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import ReglasEditor from '@/components/ReglasEditor';

type Rol = 'superadmin' | 'admin' | 'medico' | 'enfermeria' | 'recepcion' | string;

export default function PageReglas() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [rol, setRol] = useState<Rol | null>(null);
  const [usuario, setUsuario] = useState<any>(null);

  useEffect(() => {
    try {
      const r = localStorage.getItem('rol');
      const u = localStorage.getItem('usuario');
      if (!r || !u) {
        router.replace('/login');
        return;
      }
      setRol(r as Rol);
      setUsuario(JSON.parse(u));
      setReady(true);
    } catch {
      router.replace('/login');
    }
  }, [router]);

  // quién puede editar reglas
  const canEdit = useMemo(() => rol === 'superadmin' || rol === 'admin', [rol]);

  if (!ready) {
    return (
      <div className="p-10 max-w-5xl mx-auto">
        <div className="h-7 w-56 bg-slate-100 rounded mb-2" />
        <div className="h-4 w-96 bg-slate-100 rounded mb-6" />
        <div className="h-40 w-full bg-slate-50 border rounded" />
      </div>
    );
  }

  if (!usuario) {
    return <div className="p-10 text-center text-gray-500">Cargando usuario...</div>;
  }

  if (!canEdit) {
    return (
      <div className="p-10 text-center">
        <h1 className="text-3xl font-bold text-red-600 mb-4">Acceso restringido 🚫</h1>
        <p className="text-gray-600">No tenés permisos para editar reglas clínicas.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Reglas clínicas</h1>
      <p className="text-gray-600 mb-6">
        Definí condiciones por campo para disparar niveles de alerta y sugerencias.
      </p>
      <ReglasEditor />
    </div>
  );
}