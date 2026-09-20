import { describe, expect, it } from 'vitest'
import { questionId, normalize } from '@shared/ids'
import { sm2, maxInterval } from '@shared/sm2'
import { applyErrorPool, newCard } from '@shared/errorPool'
import { buildDailyQueue, interleaveByCategory, optionsAreFixed } from '@shared/session'
import { drawExamQuestions, gradeExam, isCorrect, examPool } from '@shared/exam'
import { byCategory, cardCounts } from '@shared/stats'
import { DEFAULT_SETTINGS } from '@shared/schema'
import type { CardProgress, Question } from '@shared/types'

const q = (id: string, category = 'PE', over: Partial<Question> = {}): Question => ({
  id,
  setId: 's',
  sourceNumber: '',
  type: 'single_choice',
  question: `pytanie ${id}`,
  options: [
    { id: 'a', text: 'a', source: 'original' },
    { id: 'b', text: 'b', source: 'original' }
  ],
  correctOptionIds: ['a'],
  answerText: 'a',
  explanation: null,
  category,
  unit: '',
  difficulty: 2,
  flags: [],
  reviewNote: '',
  image: null,
  createdAt: '2026-01-01T00:00:00Z',
  ...over
})

describe('ids', () => {
  it('to samo pytanie mimo interpunkcji i wielkości liter daje to samo ID', () => {
    expect(questionId('Jaka jest moc czynna?')).toBe(questionId('jaka   jest, moc czynna'))
  })
  it('różne pytania dają różne ID', () => {
    expect(questionId('moc czynna')).not.toBe(questionId('moc bierna'))
  })
  it('normalize redukuje białe znaki', () => {
    expect(normalize(' A  B\nC ')).toBe('a b c')
  })
})

describe('sm2', () => {
  const start = { repetitions: 0, easeFactor: 2.5, intervalDays: 0, dueDate: '2026-01-01' }

  it('sekwencja 1 → 6 → interwał × EF', () => {
    const a = sm2(start, 4, '2026-01-01')
    expect(a.intervalDays).toBe(1)
    const b = sm2(a, 4, '2026-01-02')
    expect(b.intervalDays).toBe(6)
    const c = sm2(b, 4, '2026-01-08')
    expect(c.intervalDays).toBe(Math.round(6 * b.easeFactor))
    expect(c.dueDate).toBe('2026-01-08'.slice(0, 8) + String(8 + c.intervalDays).padStart(2, '0'))
  })

  it('q < 3 resetuje powtórki i interwał do 1', () => {
    const learned = sm2(sm2(sm2(start, 5, '2026-01-01'), 5, '2026-01-02'), 5, '2026-01-08')
    const failed = sm2(learned, 1, '2026-02-01')
    expect(failed.repetitions).toBe(0)
    expect(failed.intervalDays).toBe(1)
    expect(failed.dueDate).toBe('2026-02-02')
  })

  it('easeFactor nie spada poniżej 1.3', () => {
    let s = start
    for (let i = 0; i < 20; i++) s = sm2(s, 0, '2026-01-01')
    expect(s.easeFactor).toBe(1.3)
  })

  it('maxIntervalDays przycina interwał', () => {
    let s = sm2(sm2(start, 5, '2026-01-01'), 5, '2026-01-02')
    s = sm2(s, 5, '2026-01-08', 3)
    expect(s.intervalDays).toBe(3)
  })

  it('data egzaminu skraca maksymalny interwał do 1/3 dni, co najmniej 1', () => {
    expect(maxInterval('2026-01-31', '2026-01-01')).toBe(10)
    expect(maxInterval('2026-01-02', '2026-01-01')).toBe(1)
    expect(maxInterval(null, '2026-01-01')).toBe(Number.POSITIVE_INFINITY)
  })
})

describe('errorPool', () => {
  it('błąd wrzuca do puli, trzy poprawne ją opuszczają', () => {
    let card = newCard('x', '2026-01-01')
    card = applyErrorPool(card, false, 3)
    expect(card.inErrorPool).toBe(true)
    card = applyErrorPool(card, true, 3)
    card = applyErrorPool(card, true, 3)
    expect(card.inErrorPool).toBe(true)
    card = applyErrorPool(card, true, 3)
    expect(card.inErrorPool).toBe(false)
    expect(card.correctStreak).toBe(3)
  })

  it('kolejny błąd zeruje serię', () => {
    let card = applyErrorPool(newCard('x', '2026-01-01'), false, 3)
    card = applyErrorPool(card, true, 3)
    card = applyErrorPool(card, false, 3)
    expect(card.correctStreak).toBe(0)
    expect(card.inErrorPool).toBe(true)
  })

  it('poprawna odpowiedź spoza puli nie nabija serii', () => {
    const card = applyErrorPool(newCard('x', '2026-01-01'), true, 3)
    expect(card.correctStreak).toBe(0)
    expect(card.inErrorPool).toBe(false)
  })
})

describe('session', () => {
  it('przeplata kategorie', () => {
    const items = [q('1', 'A'), q('2', 'A'), q('3', 'A'), q('4', 'B'), q('5', 'B')]
    const out = interleaveByCategory(items)
    expect(out).toHaveLength(5)
    expect(out.slice(0, 2).map((x) => x.category)).toEqual(['A', 'B'])
  })

  it('kolejka: zaległe najpierw, nowe do limitu', () => {
    const questions = [q('due', 'A'), q('new1', 'B'), q('new2', 'C'), q('future', 'D')]
    const progress: Record<string, CardProgress> = {
      due: { ...newCard('due', '2026-01-01'), timesSeen: 1, dueDate: '2025-12-30' },
      future: { ...newCard('future', '2026-01-01'), timesSeen: 1, dueDate: '2026-06-01' }
    }
    const out = buildDailyQueue(questions, progress, { today: '2026-01-01', newCardsPerDay: 1 })
    expect(out.map((x) => x.id)).toEqual(['due', 'new1'])
  })
})

describe('exam', () => {
  it('ocenia tylko dokładne dopasowanie zestawu odpowiedzi', () => {
    const multi = q('m', 'PE', { type: 'multi_choice', correctOptionIds: ['a', 'b'] })
    expect(isCorrect(multi, ['b', 'a'])).toBe(true)
    expect(isCorrect(multi, ['a'])).toBe(false)
    expect(isCorrect(q('1'), [])).toBe(false)
  })

  it('pomija pytania otwarte i zwraca żądaną liczbę', () => {
    const pool = [...Array(30)].map((_, i) => q(`q${i}`, i % 3 === 0 ? 'A' : 'B'))
    pool.push(q('open', 'A', { type: 'open', options: [], correctOptionIds: [] }))
    const drawn = drawExamQuestions(pool, 10, 42)
    expect(drawn).toHaveLength(10)
    expect(drawn.some((x) => x.type === 'open')).toBe(false)
    expect(new Set(drawn.map((x) => x.id)).size).toBe(10)
  })

  it('wyklucza needs_image bez obrazka, gdy ustawienie włączone', () => {
    const pool = [q('ok'), q('img', 'PE', { flags: ['needs_image'] })]
    expect(examPool(pool, DEFAULT_SETTINGS).map((x) => x.id)).toEqual(['ok'])
    expect(examPool(pool, { ...DEFAULT_SETTINGS, excludeNeedsImageFromExam: false })).toHaveLength(2)
  })

  it('liczy wynik, próg zdania i rozbicie na kategorie', () => {
    const questions = [q('1', 'A'), q('2', 'A'), q('3', 'B'), q('4', 'B')]
    const result = gradeExam(questions, { '1': ['a'], '2': ['a'], '3': ['a'], '4': ['b'] }, 120, DEFAULT_SETTINGS, ['s'])
    expect(result.score).toBe(3)
    expect(result.total).toBe(4)
    expect(result.passed).toBe(true) // 75% > próg 50%
    expect(result.perCategory).toEqual({ A: { correct: 2, total: 2 }, B: { correct: 1, total: 2 } })
  })
})

describe('stats', () => {
  it('liczy skuteczność i stany kart', () => {
    const questions = [q('1', 'A'), q('2', 'B'), q('3', 'B')]
    const progress: Record<string, CardProgress> = {
      '1': { ...newCard('1', '2026-01-01'), timesSeen: 4, timesCorrect: 1 },
      '2': { ...newCard('2', '2026-01-01'), timesSeen: 2, timesCorrect: 2, intervalDays: 30 }
    }
    expect(byCategory(questions, progress)[0]).toMatchObject({ category: 'A', pct: 25 })
    expect(cardCounts(questions, progress)).toEqual({ fresh: 1, learning: 1, mastered: 1, errorPool: 0 })
  })
})

describe('warianty odwołujące się do własnej litery', () => {
  const pictorial = q('p', 'PE', {
    image: 'p.png',
    options: [
      { id: 'a', text: 'Wariant A (patrz rysunek)', source: 'original' },
      { id: 'b', text: 'Wariant B (patrz rysunek)', source: 'original' },
      { id: 'c', text: 'Wariant C (patrz rysunek)', source: 'original' },
      { id: 'd', text: 'Wariant D (patrz rysunek)', source: 'original' }
    ],
    correctOptionIds: ['c']
  })

  it('nie wolno ich tasować — litera na ekranie musi zgadzać się z rysunkiem', () => {
    expect(optionsAreFixed(pictorial)).toBe(true)
  })

  it('prawda/fałsz też zostaje w kolejności', () => {
    expect(optionsAreFixed(q('t', 'PE', { type: 'true_false' }))).toBe(true)
  })

  it('zwykłe warianty tekstowe można tasować', () => {
    expect(optionsAreFixed(q('n'))).toBe(false)
  })
})
