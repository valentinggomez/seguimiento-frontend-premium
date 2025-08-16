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

  useEffect(() => {
    let stopped = false;

    const mkUrl = () => {
      const base = typeof url === 'function' ? url() : url;
      if (!params) return base;
      const q = new URLSearchParams(params).toString();
      return q ? `${base}?${q}` : base;
    };

    const open = () => {
      if (stopped) return;
      const src = new EventSource(mkUrl());
      esRef.current = src;

      src.onopen = () => {
        backoffRef.current = backoffMs; // 🔁 reset del backoff al reconectar OK
        onOpen?.();
      };

      const handleMessage = (e: MessageEvent) => {
        try { onEvento(JSON.parse(e.data)); } catch {}
      };

      if (Array.isArray(namedEvents) && namedEvents.length) {
        namedEvents.forEach((name) => {
          src.addEventListener(name, (ev: MessageEvent) => {
            handleMessage(ev);
          });
        });
      } else {
        src.onmessage = handleMessage;
      }

      src.onerror = (e) => {
        onError?.(e);
        src.close();
        if (!reconnect || stopped) return;
        setTimeout(open, backoffRef.current);
        backoffRef.current = Math.min(backoffRef.current * 2, backoffMaxMs);
      };
    };

    const visibilityHandler = () => {
      if (!pauseWhenHidden) return;
      if (document.hidden) {
        esRef.current?.close();
      } else {
        if (!esRef.current || (esRef.current && (esRef.current as any).readyState === 2)) {
          backoffRef.current = backoffMs;
          open();
        }
      }
    };

    if (pauseWhenHidden && typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', visibilityHandler);
    }

    backoffRef.current = backoffMs;
    open();

    return () => {
      stopped = true;
      document.removeEventListener('visibilitychange', visibilityHandler);
      esRef.current?.close();
    };
  }, [
    onEvento,
    JSON.stringify(params),
    typeof url === 'function' ? undefined : url,
    reconnect,
    backoffMs,
    backoffMaxMs,
    pauseWhenHidden,
    JSON.stringify(namedEvents || []),
  ]);
}