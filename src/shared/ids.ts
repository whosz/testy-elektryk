import { createHash } from 'crypto'

/** Małe litery, bez interpunkcji, zredukowane białe znaki. */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[.,;:!?'"()[\]{}…„”“–—-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Stabilne ID: ten sam tekst pytania → to samo ID, więc reimport nie kasuje postępów. */
export function questionId(question: string): string {
  return createHash('sha1').update(normalize(question)).digest('hex').slice(0, 12)
}
