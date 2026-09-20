import type { CardProgress, Question } from './types'

/** Deterministyczne tasowanie (seed) — ta sama sesja wygląda tak samo po odświeżeniu. */
export function shuffle<T>(items: T[], seed = Date.now()): T[] {
  const out = [...items]
  let s = seed >>> 0 || 1
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) >>> 0
    const j = s % (i + 1)
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/** Żeby nie było 15 pytań z jednego tematu pod rząd (PLAN 7.4.3). */
export function interleaveByCategory(questions: Question[]): Question[] {
  const buckets = new Map<string, Question[]>()
  for (const q of questions) {
    const b = buckets.get(q.category)
    if (b) b.push(q)
    else buckets.set(q.category, [q])
  }
  const out: Question[] = []
  while (out.length < questions.length) {
    for (const bucket of buckets.values()) {
      const q = bucket.shift()
      if (q) out.push(q)
    }
  }
  return out
}

export interface QueueOptions {
  today: string
  newCardsPerDay: number
}

/** Kolejka dzienna: zaległe najpierw, potem limit nowych kart, całość przeplatana. */
export function buildDailyQueue(
  questions: Question[],
  progress: Record<string, CardProgress>,
  { today, newCardsPerDay }: QueueOptions
): Question[] {
  const due: Question[] = []
  const fresh: Question[] = []
  for (const q of questions) {
    const card = progress[q.id]
    if (!card || card.timesSeen === 0) fresh.push(q)
    else if (card.dueDate <= today) due.push(q)
  }
  due.sort((a, b) => (progress[a.id].dueDate < progress[b.id].dueDate ? -1 : 1))
  return [...interleaveByCategory(due), ...interleaveByCategory(fresh.slice(0, newCardsPerDay))]
}

export function errorPoolQueue(
  questions: Question[],
  progress: Record<string, CardProgress>
): Question[] {
  return questions
    .filter((q) => progress[q.id]?.inErrorPool)
    .sort((a, b) => progress[a.id].correctStreak - progress[b.id].correctStreak)
}
