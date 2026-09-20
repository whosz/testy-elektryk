import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'pl.whosz.elektrykquiz',
  appName: 'Elektryk Quiz',
  // ten sam zbudowany renderer co w Electronie — ścieżki są względne, więc działa bez zmian
  webDir: 'out/renderer',
  android: {
    backgroundColor: '#0f172a'
  }
}

export default config
