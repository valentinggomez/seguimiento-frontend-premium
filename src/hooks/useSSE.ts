// hooks/useSSE.ts
import { useEffect, useRef } from 'react';

type EventoSSE = Record<string, any>;

type Options = {
  url?: string | (() => string);
  params?: Record<string, string>;
  reconnect?: boolean;
  backoffMs?: number;
  backoffMaxMs?: number;
  pauseWhenHidden?: boolean;
  namedEvents?: string[];         // si tu server usa event: <nombre>
  onOpen?: () => void;
  onError?: (e: any) => void;
};

export function useSSE(onEvento: (data: EventoSSE) => void, opts: Options = {}) {
  const {
    url = '/api/sse',
    params,
    reconnect = true,
    backoffMs = 1000,
    backoffMaxMs = 10000,
    pauseWhenHidden = false,
    namedEvents,
    onOpen,
    onError,
  } = opts;

  const backoffRef = useRef(backoffMs);
  const esRef = useRef<EventSource | null>(null);

  // ✅ Mantener siempre la versión más reciente del callback
  const onEventoRef = useRef(onEvento);
  onEventoRef.current = onEvento;

  useEffect(() => {
    let stopped = false;

    const mkUrl = () => {
      const base = typeof url === 'function' ? url() : url;
      if (!params) return base;
      const q = new URLSearchParams(params).toString();
      return q ? `${base}?${q}` : base;
    };

    const cleanOpen = () => {
      // 🔒 Cerrar conexión previa antes de abrir otra
      try { esRef.current?.close(); } catch {}
      const src = new EventSource(mkUrl());
      esRef.current = src;

      src.onopen = () => {
        backoffRef.current = backoffMs; // reset del backoff al reconectar OK
        onOpen?.();
      };

      const handleMessage = (e: MessageEvent) => {
        // Ignorar keepalive/heartbeats vacíos
        if (!e.data || e.data === 'null' || e.data === 'undefined') return;
        try {
          const parsed = JSON.parse(e.data);
          onEventoRef.current(parsed);
        } catch {
          // No rompas si llega texto no JSON (algunos servidores envían pings)
        }
      };

      if (Array.isArray(namedEvents) && namedEvents.length) {
        namedEvents.forEach((name) => {
          src.addEventListener(name, (ev: MessageEvent) => handleMessage(ev));
        });
      } else {
        src.onmessage = handleMessage;
      }

      src.onerror = (e) => {
        onError?.(e);
        try { src.close(); } catch {}
        if (!reconnect || stopped) return;
        setTimeout(cleanOpen, backoffRef.current);
        backoffRef.current = Math.min(backoffRef.current * 2, backoffMaxMs);
      };
    };

    const visibilityHandler = () => {
      if (!pauseWhenHidden) return;
      if (document.hidden) {
        try { esRef.current?.close(); } catch {}
      } else {
        const readyState = (esRef.current as any)?.readyState;
        if (!esRef.current || readyState === 2 /* CLOSED */) {
          backoffRef.current = backoffMs;
          cleanOpen();
        }
      }
    };

    if (pauseWhenHidden && typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', visibilityHandler);
    }

    backoffRef.current = backoffMs;
    cleanOpen();

    return () => {
      stopped = true;
      if (pauseWhenHidden && typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', visibilityHandler);
      }
      try { esRef.current?.close(); } catch {}
      esRef.current = null;
    };
  // Dependencias: evita reconectar por cambios irrelevantes
  }, [
    reconnect,
    backoffMs,
    backoffMaxMs,
    pauseWhenHidden,
    // cambios “reales” que deben reabrir conexión:
    typeof url === 'function' ? 'fn' : url,
    JSON.stringify(params || {}),
    JSON.stringify(namedEvents || []),
    onOpen,
    onError,
  ]);
}