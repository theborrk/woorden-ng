/** Build target, injected by vite.config.ts (`define`). Prefer the `#target` services where possible. */
declare const __APP_TARGET__: 'web' | 'android';
declare const __APP_VERSION__: string;
declare const __APP_COMMIT__: string;

interface Window {
  Capacitor?: { DEBUG?: boolean };
}
