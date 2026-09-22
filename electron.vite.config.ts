import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import pkg from './package.json'

export default defineConfig({
  main: { plugins: [externalizeDepsPlugin()] },
  preload: { plugins: [externalizeDepsPlugin()] },
  renderer: {
    resolve: {
      alias: {
        '@': resolve('src/renderer/src'),
        '@shared': resolve('src/shared')
      }
    },
    // wersja Windows nie ma natywnego dostępu do PackageInfo jak Android,
    // więc wpisujemy ją na sztywno przy buildzie z package.json
    define: { __APP_VERSION__: JSON.stringify(pkg.version) },
    plugins: [react(), tailwindcss()]
  }
})
