"use client";

export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  console.error("Error en /panel/clinicas/[id]:", error);
  return (
    <div className="p-6">
      <h1 className="text-xl font-bold text-red-600">Falló esta vista</h1>
      <pre className="mt-2 p-3 bg-red-50 border text-xs overflow-auto">
        {String(error?.message || error)}
      </pre>
      <button className="mt-4 border px-3 py-1 rounded" onClick={() => reset()}>
        Reintentar
      </button>
    </div>
  );
}