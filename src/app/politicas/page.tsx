"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function PoliticasPage() {
  const qs = useSearchParams();
  const clinica_id = qs.get("clinica_id") || process.env.NEXT_PUBLIC_CLINICA_ID || "";
  const [html, setHtml] = useState("");
  const [version, setVersion] = useState("");

  useEffect(() => {
    if (!clinica_id) return;
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/politicas?clinica_id=${encodeURIComponent(clinica_id)}`)
      .then(r => r.json())
      .then(d => {
        setHtml(d?.html || "");
        setVersion(d?.version || "");
      })
      .catch(() => {});
  }, [clinica_id]);

  return (
    <main className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-semibold">
        Políticas de privacidad {version && <span className="text-slate-500">({version})</span>}
      </h1>
      <div className="prose mt-4" dangerouslySetInnerHTML={{ __html: html }} />
    </main>
  );
}