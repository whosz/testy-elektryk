import type { CardProgress } from './types'

export function newCard(questionId: string, todayStr: string): CardProgress {
  return {
    questionId,
    repetitions: 0,
    easeFactor: 2.5,
    intervalDays: 0,
    dueDate: todayStr,
    inErrorPool: false,
    correctStreak: 0,
    timesSeen: 0,
    timesCorrect: 0,
    lastAnsweredAt: null,
    lastResult: null
  }
}

/** Błąd wrzuca do puli, seria poprawnych ją opuszcza (PLAN 7.3). */
export function applyErrorPool(card: CardProgress, correct: boolean, exitStreak: number): CardProgress {
  if (!correct) return { ...card, inErrorPool: true, correctStreak: 0 }
  if (!card.inErrorPool) return card
  const correctStreak = card.correctStreak + 1
  return { ...card, correctStreak, inErrorPool: correctStreak < exitStreak }
}

export function applyStats(card: CardProgress, correct: boolean, now: string): CardProgress {
  return {
    ...card,
    timesSeen: card.timesSeen + 1,
    timesCorrect: card.timesCorrect + (correct ? 1 : 0),
    lastAnsweredAt: now,
    lastResult: correct ? 'correct' : 'wrong'
  }
}
