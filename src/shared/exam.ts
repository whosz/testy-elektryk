import type { ExamResult, Question, Settings } from './types'
import { shuffle } from './session'

/** Losowanie proporcjonalne do wielkości kategorii (PLAN 7.1). */
export function drawExamQuestions(pool: Question[], count: number, seed = Date.now()): Question[] {
  const eligible = pool.filter((q) => q.type !== 'open' && q.options.length > 0)
  if (eligible.length <= count) return shuffle(eligible, seed)

  const byCategory = new Map<string, Question[]>()
  for (const q of eligible) {
    const b = byCategory.get(q.category)
    if (b) b.push(q)
    else byCategory.set(q.category, [q])
  }

  const picked: Question[] = []
  for (const [, qs] of byCategory) {
    const share = Math.floor((qs.length / eligible.length) * count)
    picked.push(...shuffle(qs, seed).slice(0, share))
  }
  // reszta z niedoboru zaokrągleń
  const pickedIds = new Set(picked.map((q) => q.id))
  const rest = shuffle(
    eligible.filter((q) => !pickedIds.has(q.id)),
    seed + 1
  )
  picked.push(...rest.slice(0, count - picked.length))
  return shuffle(picked, seed + 2).slice(0, count)
}

export function examPool(questions: Question[], settings: Settings): Question[] {
  return settings.excludeNeedsImageFromExam
    ? questions.filter((q) => !(q.flags.includes('needs_image') && !q.image))
    : questions
}

export function isCorrect(q: Question, chosen: string[]): boolean {
  if (q.correctOptionIds.length === 0) return false
  const a = [...chosen].sort().join('|')
  const b = [...q.correctOptionIds].sort().join('|')
  return a === b
}

export function gradeExam(
  questions: Question[],
  answers: Record<string, string[]>,
  durationSec: number,
  settings: Settings,
  setIds: string[]
): ExamResult {
  const perCategory: ExamResult['perCategory'] = {}
  let score = 0
  for (const q of questions) {
    const ok = isCorrect(q, answers[q.id] ?? [])
    if (ok) score++
    const c = (perCategory[q.category] ??= { correct: 0, total: 0 })
    c.total++
    if (ok) c.correct++
  }
  const total = questions.length
  return {
    id: `${Date.now()}`,
    date: new Date().toISOString(),
    setIds,
    questionIds: questions.map((q) => q.id),
    answers,
    score,
    total,
    passed: total > 0 && (score / total) * 100 >= settings.exam.passThresholdPct,
    durationSec,
    perCategory
  }
}
