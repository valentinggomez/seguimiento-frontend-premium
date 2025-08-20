declare module 'event-source-polyfill' {
  export default class EventSourcePolyfill {
    constructor(
      url: string,
      init?: { withCredentials?: boolean; headers?: Record<string, string> }
    );
    onopen: ((this: EventSourcePolyfill, ev: Event) => any) | null;
    onmessage: ((this: EventSourcePolyfill, ev: MessageEvent) => any) | null;
    onerror: ((this: EventSourcePolyfill, ev: Event) => any) | null;
    close(): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject): void;
    removeEventListener(type: string, listener: EventListenerOrEventListenerObject): void;
  }
}