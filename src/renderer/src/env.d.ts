/// <reference types="vite/client" />
import type { Api } from '../../preload'

declare global {
  interface Window {
    api: Api
  }
  /** Wpisywana przy buildzie z package.json (electron.vite.config.ts) — brak na Androidzie. */
  const __APP_VERSION__: string
}
