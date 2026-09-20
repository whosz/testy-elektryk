import { z } from 'zod'

/**
 * Paczka materiałów pobierana z repozytorium. Pozwala dosypać pytania, rysunki
 * i nagrania bez wydawania nowego .exe ani .apk — pytania mają stabilne ID,
 * więc dołożenie ich nie kasuje postępów.
 */
export const ContentVideoSchema = z.object({
  id: z.string(),
  title: z.string(),
  channel: z.string(),
  url: z.string(),
  category: z.string(),
  note: z.string().default('')
})

export const ContentSetRefSchema = z.object({
  id: z.string(),
  name: z.string(),
  file: z.string(),
  questions: z.number().int().nonnegative(),
  images: z.array(z.string()).default([])
})

export const ContentManifestSchema = z.object({
  version: z.number().int().positive(),
  updatedAt: z.string(),
  sets: z.array(ContentSetRefSchema).default([]),
  videos: z.array(ContentVideoSchema).default([])
})

export const LocalContentSchema = z.object({
  version: z.number().int().nonnegative().default(0),
  checkedAt: z.string().nullable().default(null),
  videos: z.array(ContentVideoSchema).default([])
})

export type ContentVideo = z.infer<typeof ContentVideoSchema>
export type ContentSetRef = z.infer<typeof ContentSetRefSchema>
export type ContentManifest = z.infer<typeof ContentManifestSchema>
export type LocalContent = z.infer<typeof LocalContentSchema>

/**
 * Domyślne źródło materiałów: gałąź main repozytorium. W Ustawieniach można je
 * podmienić na dowolny serwer, który wystawia te same pliki po HTTPS.
 */
export const DEFAULT_CONTENT_BASE =
  'https://raw.githubusercontent.com/whosz/testy-elektryk/main/content/'

/** Wersja materiałów wbudowanych w aplikację przy wydaniu. */
export const BUNDLED_CONTENT_VERSION = 1

export function youtubeEmbed(id: string): string {
  return `https://www.youtube-nocookie.com/embed/${id}?rel=0`
}
