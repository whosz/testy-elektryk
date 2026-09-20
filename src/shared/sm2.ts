import { addDays, daysBetween } from './dates'

export interface Sm2State {
  repetitions: number
  easeFactor: number
  intervalDays: number
  dueDate: string
}

export type Grade = 0 | 1 | 2 | 3 | 4 | 5

export function sm2(
  s: Sm2State,
  q: Grade,
  todayStr: string,
  maxIntervalDays = Number.POSITIVE_INFINITY
): Sm2State {
  let { repetitions, easeFactor, intervalDays } = s

  if (q < 3) {
    repetitions = 0
    intervalDays = 1
  } else {
    intervalDays =
      repetitions === 0 ? 1 : repetitions === 1 ? 6 : Math.round(intervalDays * easeFactor)
    repetitions += 1
  }

  easeFactor = Math.max(1.3, easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)))
  intervalDays = Math.min(intervalDays, maxIntervalDays)

  return { repetitions, easeFactor, intervalDays, dueDate: addDays(todayStr, intervalDays) }
}

/** Bez limitu SM-2 odsunąłby dobrze znane pytania za termin egzaminu (PLAN 7.2). */
export function maxInterval(examDate: string | null, todayStr: string): number {
  if (!examDate) return Number.POSITIVE_INFINITY
  return Math.max(1, Math.floor(daysBetween(todayStr, examDate) / 3))
}

export function gradeFromChoice(correct: boolean): Grade {
  return correct ? 4 : 1
}
