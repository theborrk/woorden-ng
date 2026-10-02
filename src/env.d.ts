/** Build target, injected by vite.config.ts (`define`). Prefer the `#target` services where possible. */
declare const __APP_TARGET__: 'web' | 'android';

interface Window {
  Capacitor?: { DEBUG?: boolean };
}
