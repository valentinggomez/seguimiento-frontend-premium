'use client';

import { useEffect, useState } from 'react';
import ReglasEditor from '@/components/ReglasEditor';

export default function PageReglas() {
  const [rol, setRol] = useState<string | null>(null);
  const [usuario, setUsuario] = useState<any>(null);

  useEffect(() => {
    const rolGuardado = localStorage.getItem('rol');
    const usuarioGuardado = localStorage.getItem('usuario');
    if (!rolGuardado || !usuarioGuardado) {
      window.location.href = '/login';
    } else {
      setRol(rolGuardado);
      try { setUsuario(JSON.parse(usuarioGuardado)); }
      catch { window.location.href = '/login'; }
    }
  }, []);

  // quién puede editar reglas: superadmin y/o admin de clínica
  const allowed = rol === 'superadmin' || rol === 'admin';

  if (!usuario) return <div className="p-10 text-center text-gray-500">Cargando usuario...</div>;
  if (!allowed) {
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
      <p className="text-gray-600 mb-6">Definí condiciones por campo para disparar niveles de alerta y sugerencias.</p>
      <ReglasEditor />
    </div>
  );
}