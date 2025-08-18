"use client";

export function KpiCard({ title, value, help }: { title: string; value: string; help?: string }) {
  return (
    <div className="rounded-2xl border p-4 shadow-sm bg-white">
      <div className="text-xs uppercase tracking-wide text-slate-500 flex items-center gap-2">
        {title}
        {help ? <span className="text-slate-400" title={help}>ⓘ</span> : null}
      </div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
    </div>
  );
}