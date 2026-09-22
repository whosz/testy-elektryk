import { Capacitor, registerPlugin } from '@capacitor/core'

/** Most do natywnego pluginu android/.../AppUpdatePlugin.java — na Windows nie istnieje. */
interface AppUpdateApi {
  getAppInfo(): Promise<{ versionName: string; versionCode: number }>
  checkInstallPermission(): Promise<{ granted: boolean }>
  requestInstallPermission(): Promise<void>
  startDownload(options: { url: string }): Promise<{ downloadId: number }>
  getDownloadStatus(options: {
    downloadId: number
  }): Promise<{ status: string; bytesDownloaded: number; bytesTotal: number; reason?: number }>
  installApk(options: { downloadId: number }): Promise<void>
}

const AppUpdate = registerPlugin<AppUpdateApi>('AppUpdate')

export const isAndroid = Capacitor.getPlatform() === 'android'

const REPO = 'whosz/testy-elektryk'

export interface AvailableUpdate {
  version: string
  /** Strona wydania na GitHubie — zawsze, do "zobacz co nowego" i do ręcznego pobrania na Windows. */
  pageUrl: string
  /** Bezpośredni plik do pobrania przez wbudowany instalator. Tylko Android — Windows nie ma autoinstalacji. */
  downloadUrl: string | null
  size: number
}

/** Porównanie wersji w stylu semver, wystarczające dla "1.0.1" > "1.0.0". */
function isNewer(remote: string, local: string): boolean {
  const r = remote.replace(/^v/, '').split('.').map(Number)
  const l = local.replace(/^v/, '').split('.').map(Number)
  for (let i = 0; i < Math.max(r.length, l.length); i++) {
    const a = r[i] ?? 0
    const b = l[i] ?? 0
    if (a !== b) return a > b
  }
  return false
}

/**
 * Sprawdza najnowsze wydanie na GitHubie, niezależnie od platformy. Na Androidzie
 * zwraca też bezpośredni link do APK (do wbudowanego pobierania); na Windows tylko
 * stronę wydania — tam instalator trzeba pobrać i uruchomić ręcznie.
 * Brak sieci albo brak pasującego pliku w wydaniu nie jest błędem wartym pokazywania.
 */
export async function checkForUpdate(): Promise<AvailableUpdate | null> {
  try {
    const localVersion = isAndroid ? (await AppUpdate.getAppInfo()).versionName : __APP_VERSION__
    const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, { cache: 'no-store' })
    if (!res.ok) return null
    const release = (await res.json()) as {
      tag_name: string
      html_url: string
      assets: Array<{ name: string; browser_download_url: string; size: number }>
    }
    if (!isNewer(release.tag_name, localVersion)) return null

    if (isAndroid) {
      const apk = release.assets.find((a) => a.name.endsWith('.apk'))
      if (!apk) return null
      return { version: release.tag_name, pageUrl: release.html_url, downloadUrl: apk.browser_download_url, size: apk.size }
    }
    return { version: release.tag_name, pageUrl: release.html_url, downloadUrl: null, size: 0 }
  } catch {
    return null
  }
}

export interface DownloadProgress {
  status: 'permission' | 'downloading' | 'installing'
  pct: number
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))

/**
 * Pobiera APK przez systemowy DownloadManager i od razu otwiera instalator.
 * Zgoda na „instalację z nieznanych źródeł" jest osobnym ekranem systemowym —
 * jeśli nie jest udzielona, funkcja się zatrzymuje i wywołujący musi spróbować
 * ponownie po powrocie z ustawień.
 */
export async function downloadAndInstall(
  update: AvailableUpdate,
  onProgress: (p: DownloadProgress) => void
): Promise<'installing' | 'needs-permission'> {
  if (!update.downloadUrl) throw new Error('Brak pliku do pobrania dla tej platformy')
  const { granted } = await AppUpdate.checkInstallPermission()
  if (!granted) {
    onProgress({ status: 'permission', pct: 0 })
    await AppUpdate.requestInstallPermission()
    return 'needs-permission'
  }

  const { downloadId } = await AppUpdate.startDownload({ url: update.downloadUrl })
  for (;;) {
    const s = await AppUpdate.getDownloadStatus({ downloadId })
    if (s.status === 'complete') break
    if (s.status === 'failed') throw new Error(`Pobieranie nie powiodło się (kod ${s.reason ?? '?'})`)
    const pct = s.bytesTotal > 0 ? Math.round((s.bytesDownloaded / s.bytesTotal) * 100) : 0
    onProgress({ status: 'downloading', pct })
    await sleep(600)
  }
  onProgress({ status: 'installing', pct: 100 })
  await AppUpdate.installApk({ downloadId })
  return 'installing'
}
