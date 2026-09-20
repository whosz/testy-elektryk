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

  for (const ref of manifest.sets) {
    onProgress?.({ label: `Pobieram ${ref.name}`, done: 0, total: ref.images.length + 1 })
    const set = QuestionSetSchema.parse(await fetchJson(joinUrl(base, ref.file)))
    const merged = await api.sets.merge(set)
    added += merged.added
    updated += merged.updated

    let done = 1
    for (const name of ref.images) {
      const key = `${ref.id}/${name}`
      const have = (await api.images.has(key)) || (await isBundled(ref.id, name))
      if (!have) {
        try {
          await api.images.put(key, await toBase64(joinUrl(base, `images/${ref.id}/${name}`)))
          images++
        } catch {
          // brak jednego rysunku nie może wywracać całej aktualizacji
        }
      }
      done++
      onProgress?.({ label: `Rysunki: ${ref.name}`, done, total: ref.images.length + 1 })
    }
  }

  await api.content.set({
    version: manifest.version,
    checkedAt: new Date().toISOString(),
    videos: manifest.videos
  })

  return { added, updated, images }
}
