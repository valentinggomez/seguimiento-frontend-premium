"use client";

export function KpiCard({
  title,
  value,
  help,
  accent = "#003466",
  loading = false,
  spark,
}: {
  title: string
  value: string | number
  help?: string
  accent?: string
  loading?: boolean
  spark?: React.ReactNode
}) {
  return (
    <div
      className="relative rounded-2xl border bg-white p-4 shadow-sm min-h-[104px]
                 overflow-hidden transition-shadow duration-200 hover:shadow-md"
    >
      {/* barra superior de acento (queda adentro del borde redondeado) */}
      <div
        className="absolute inset-x-0 top-0 h-1 pointer-events-none select-none"
        style={{ background: accent }}
        aria-hidden="true"
      />

      <div className="text-xs uppercase tracking-wide text-slate-500 flex items-center gap-2">
        {title}
        {help ? (
          <span className="text-slate-400 cursor-help" title={help}>
            ⓘ
          </span>
        ) : null}
      </div>

      <div className="flex items-end justify-between gap-3 mt-1">
        <div className="text-2xl font-semibold">
          {loading ? (
            <div className="animate-pulse bg-slate-200 h-6 w-16 rounded" />
          ) : (
            (value ?? "—") as any
          )}
        </div>
        {spark ? <div className="w-24">{spark}</div> : null}
      </div>

      {help && (
        <div className="mt-1 text-[11px] text-slate-500">{help}</div>
      )}
    </div>
  );
}