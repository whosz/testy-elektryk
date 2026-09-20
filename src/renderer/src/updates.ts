import { ContentManifestSchema, type ContentManifest } from '@shared/content'
import { QuestionSetSchema } from '@shared/schema'
import { api } from './api'

const joinUrl = (base: string, path: string): string =>
  `${base.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return res.json()
}

export async function fetchManifest(base: string): Promise<ContentManifest> {
  return ContentManifestSchema.parse(await fetchJson(joinUrl(base, 'manifest.json')))
}

/** Rysunek wbudowany w aplikację nie musi być pobierany drugi raz. */
function isBundled(setId: string, name: string): Promise<boolean> {
  return new Promise((resolve) => {
    const probe = new Image()
    probe.onload = () => resolve(true)
    probe.onerror = () => resolve(false)
    probe.src = `./images/${setId === 'cke-informatory' ? 'cke' : setId}/${name}`
  })
}

async function toBase64(url: string): Promise<string> {
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  const buffer = await res.arrayBuffer()
  let binary = ''
  const bytes = new Uint8Array(buffer)
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

/** Pobiera rysunek z serwera materiałów i zapisuje go w pamięci urządzenia. */
export async function fetchImage(base: string, setId: string, name: string): Promise<string | null> {
  try {
    const b64 = await toBase64(joinUrl(base, `images/${setId}/${name}`))
    await api.images.put(`${setId}/${name}`, b64)
    return b64
  } catch {
    return null
  }
}

export interface ApplyProgress {
  label: string
  done: number
  total: number
}

export interface ApplyResult {
  added: number
  updated: number
  images: number
}

/**
 * Dosypuje materiały do lokalnej bazy. Pytania mają stabilne ID, więc ponowne
 * wgranie tego samego zestawu nie kasuje postępów — dochodzą tylko nowe pozycje.
 */
export async function applyContent(
  base: string,
  manifest: ContentManifest,
  onProgress?: (p: ApplyProgress) => void
): Promise<ApplyResult> {
  let added = 0
  let updated = 0
  let images = 0

  // Same pytania; rysunki dochodzą przy pierwszym wyświetleniu albo hurtem
  // z Ustawień. Przy zestawach liczących setki ilustracji ciągnięcie wszystkiego
  // przy aktualizacji zajmowałoby na telefonie kilkadziesiąt megabajtów.
  for (let i = 0; i < manifest.sets.length; i++) {
    const ref = manifest.sets[i]
    onProgress?.({ label: `Pobieram ${ref.name}`, done: i, total: manifest.sets.length })
    const set = QuestionSetSchema.parse(await fetchJson(joinUrl(base, ref.file)))
    const merged = await api.sets.merge(set)
    added += merged.added
    updated += merged.updated
    onProgress?.({ label: ref.name, done: i + 1, total: manifest.sets.length })
  }

  await api.content.set({
    version: manifest.version,
    checkedAt: new Date().toISOString(),
    videos: manifest.videos
  })

  return { added, updated, images }
}

export interface PrefetchResult {
  pobrane: number
  pominiete: number
  bledy: number
}

/**
 * Pobiera z góry wszystkie brakujące rysunki — na wypadek nauki bez internetu.
 * Wbudowane w aplikację i już zapisane pomija, więc powtórne uruchomienie jest tanie.
 */
export async function prefetchAllImages(
  base: string,
  manifest: ContentManifest,
  onProgress?: (p: ApplyProgress) => void
): Promise<PrefetchResult> {
  const total = manifest.sets.reduce((n, s) => n + s.images.length, 0)
  let done = 0
  let pobrane = 0
  let pominiete = 0
  let bledy = 0

  for (const ref of manifest.sets) {
    for (const name of ref.images) {
      const key = `${ref.id}/${name}`
      if ((await api.images.has(key)) || (await isBundled(ref.id, name))) {
        pominiete++
      } else if (await fetchImage(base, ref.id, name)) {
        pobrane++
      } else {
        bledy++
      }
      done++
      if (done % 5 === 0 || done === total) {
        onProgress?.({ label: `${ref.name}: ${done} z ${total}`, done, total })
      }
    }
  }
  return { pobrane, pominiete, bledy }
}
