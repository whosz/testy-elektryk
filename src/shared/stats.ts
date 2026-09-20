import type { CardProgress, ExamResult, Question } from './types'

export interface CategoryStat {
  category: string
  correct: number
  total: number
  pct: number
}

export function byCategory(
  questions: Question[],
  progress: Record<string, CardProgress>
): CategoryStat[] {
  const acc = new Map<string, { correct: number; total: number }>()
  for (const q of questions) {
    const card = progress[q.id]
    if (!card || card.timesSeen === 0) continue
    const c = acc.get(q.category) ?? { correct: 0, total: 0 }
    c.correct += card.timesCorrect
    c.total += card.timesSeen
    acc.set(q.category, c)
  }
  return [...acc.entries()]
    .map(([category, c]) => ({ category, ...c, pct: Math.round((c.correct / c.total) * 100) }))
    .sort((a, b) => a.pct - b.pct)
}

export function weakestQuestions(
  questions: Question[],
  progress: Record<string, CardProgress>,
  limit = 10
): Question[] {
  return questions
    .filter((q) => (progress[q.id]?.timesSeen ?? 0) >= 2)
    .sort((a, b) => rate(progress[a.id]) - rate(progress[b.id]))
    .slice(0, limit)
}

const rate = (c: CardProgress): number => c.timesCorrect / c.timesSeen

/** Opanowane = interwał >= 21 dni (PLAN 7.5). */
export function cardCounts(
  questions: Question[],
  progress: Record<string, CardProgress>
): { fresh: number; learning: number; mastered: number; errorPool: number } {
  let fresh = 0
  let learning = 0
  let mastered = 0
  let errorPool = 0
  for (const q of questions) {
    const c = progress[q.id]
    if (!c || c.timesSeen === 0) fresh++
    else if (c.intervalDays >= 21) mastered++
    else learning++
    if (c?.inErrorPool) errorPool++
  }
  return { fresh, learning, mastered, errorPool }
}

export function dueToday(
  questions: Question[],
  progress: Record<string, CardProgress>,
  today: string
): number {
  return questions.filter((q) => {
    const c = progress[q.id]
    return c && c.timesSeen > 0 && c.dueDate <= today
  }).length
}

export function examHistory(exams: ExamResult[]): ExamResult[] {
  return [...exams].sort((a, b) => (a.date < b.date ? 1 : -1))
}
