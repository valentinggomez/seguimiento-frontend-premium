// src/lib/scheduling.ts
import type { SchedulingConfig } from "@/types/formularios";

function parseHHMM(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return { h, m };
}

function isWithinQuietHours(d: Date, quietStart?: string, quietEnd?: string) {
  if (!quietStart || !quietEnd) return false;
  const { h: sH, m: sM } = parseHHMM(quietStart);
  const { h: eH, m: eM } = parseHHMM(quietEnd);

  const minutes = d.getHours() * 60 + d.getMinutes();
  const startMin = sH * 60 + sM;
  const endMin = eH * 60 + eM;

  // rango que puede cruzar medianoche
  if (startMin <= endMin) {
    return minutes >= startMin && minutes < endMin;
  } else {
    return minutes >= startMin || minutes < endMin;
  }
}

function pushOutsideQuietHours(d: Date, quietStart?: string, quietEnd?: string) {
  if (!quietStart || !quietEnd) return d;
  if (!isWithinQuietHours(d, quietStart, quietEnd)) return d;

  const { h: eH, m: eM } = parseHHMM(quietEnd);
  const out = new Date(d);
  out.setHours(eH, eM, 0, 0);
  // si ya pasó la salida de silencio para ese día, empujamos al siguiente
  if (out < d) {
    out.setDate(out.getDate() + 1);
  }
  return out;
}

/**
 * Calcula los próximos "count" envíos a partir de un anchorDate.
 */
export function nextSendTimes(cfg: SchedulingConfig | undefined, anchorDate: Date, count = 5): Date[] {
  if (!cfg) return [];
  const tzAnchor = new Date(anchorDate);
  const list: Date[] = [];
  const max = Math.max(1, Math.min(count ?? 5, 20)); // evita valores raros

  const first = new Date(tzAnchor.getTime() + cfg.first_after_hours * 3600_000);
  list.push(pushOutsideQuietHours(first, cfg.quiet_hours_start, cfg.quiet_hours_end));

  if (cfg.cadence_hours && cfg.cadence_hours > 0) {
    let t = new Date(list[0]);
    const endAt = cfg.end_after_hours
      ? new Date(tzAnchor.getTime() + cfg.end_after_hours * 3600_000)
      : null;

    while (list.length < max) {
      t = new Date(t.getTime() + cfg.cadence_hours * 3600_000);
      if (endAt && t > endAt) break;
      list.push(pushOutsideQuietHours(t, cfg.quiet_hours_start, cfg.quiet_hours_end));
      if (!cfg.cadence_hours) break;
    }
  }

  return list.slice(0, max);
}