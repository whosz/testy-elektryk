import { describe, expect, it } from 'vitest'
import { chunkText, detectQuestionCount } from '@main/import/chunk'
import { runImport } from '@main/import/pipeline'
import type { ImportChunkResult } from '@shared/schema'

const numbered = (from: number, to: number): string =>
  Array.from({ length: to - from + 1 }, (_, i) => `${from + i}. Pytanie numer ${from + i}?\nOdp: tak`).join('\n\n')

describe('chunk', () => {
  it('wykrywa numerację', () => {
    expect(detectQuestionCount(numbered(1, 30))).toBe(30)
    expect(detectQuestionCount('Tekst bez numeracji.\n\nDrugi akapit.')).toBe(0)
  })

  it('tnie co 25 pytań przy numeracji', () => {
    const chunks = chunkText(numbered(1, 60))
    expect(chunks).toHaveLength(3)
    expect(chunks[0]).toContain('1. Pytanie numer 1?')
    expect(chunks[0]).toContain('25. Pytanie numer 25?')
    expect(chunks[0]).not.toContain('26. Pytanie')
    expect(chunks[1]).toContain('26. Pytanie numer 26?')
  })

  it('bez numeracji tnie na pustej linii, nie w środku akapitu', () => {
    const para = 'x'.repeat(3000)
    const chunks = chunkText([para, para, para, para].join('\n\n'))
    expect(chunks.length).toBeGreaterThan(1)
    for (const c of chunks) expect(c.length % 3000 === 0 || c.includes('\n\n')).toBe(true)
  })

  it('bardzo długie pojedyncze pytanie zostaje w jednej paczce', () => {
    const chunks = chunkText('y'.repeat(20000))
    expect(chunks).toHaveLength(1)
  })
})

const emptyResult = (over: Partial<ImportChunkResult> = {}): ImportChunkResult => ({
  questions: [],
  incomplete_tail: '',
  new_categories: [],
  ...over
})

const rawQuestion = (over: Partial<ImportChunkResult['questions'][number]> = {}): ImportChunkResult['questions'][number] => ({
  source_number: '1',
  type: 'single_choice',
  question: 'Jaka jest moc czynna odbiornika?',
  options: ['100 W', '200 W', '300 W', '400 W'],
  correct_indexes: [0],
  answer_text: '100 W',
  distractors_generated: false,
  explanation: '',
  explanation_from_source: false,
  category: 'Podstawy elektrotechniki',
  difficulty: 2,
  flags: [],
  review_note: '',
  ...over
})

const opts = {
  apiKey: 'test',
  model: 'test',
  generateDistractors: true,
  categories: [],
  setId: 'zestaw',
  sourceFileName: 'probka.txt'
}

describe('pipeline', () => {
  it('przenosi incomplete_tail na początek następnej paczki', async () => {
    const seen: string[] = []
    const draft = await runImport(numbered(1, 30), {
      ...opts,
      runner: async (chunk) => {
        seen.push(chunk)
        return emptyResult({ incomplete_tail: seen.length === 1 ? 'URWANY OGON' : '' })
      }
    })
    expect(seen).toHaveLength(2)
    expect(seen[1].startsWith('URWANY OGON')).toBe(true)
    expect(draft.report.detectedQuestions).toBe(30)
  })

  it('deduplikuje po stabilnym ID', async () => {
    const draft = await runImport('1. a', {
      ...opts,
      runner: async () =>
        emptyResult({ questions: [rawQuestion(), rawQuestion({ source_number: '2' })] })
    })
    expect(draft.questions).toHaveLength(1)
    expect(draft.report.duplicates).toHaveLength(1)
  })

  it('zgłasza correct_indexes poza zakresem i flaguje pytanie', async () => {
    const draft = await runImport('1. a', {
      ...opts,
      runner: async () => emptyResult({ questions: [rawQuestion({ correct_indexes: [7] })] })
    })
    expect(draft.report.invalidCorrectIndexes).toHaveLength(1)
    expect(draft.questions[0].flags).toContain('incomplete_source')
    expect(draft.questions[0].correctOptionIds).toEqual([])
  })

  it('raportuje luki w numeracji źródłowej', async () => {
    const draft = await runImport('1. a', {
      ...opts,
      runner: async () =>
        emptyResult({
          questions: [
            rawQuestion({ source_number: '116', question: 'Pytanie sto szesnaste?' }),
            rawQuestion({ source_number: '118', question: 'Pytanie sto osiemnaste?' })
          ]
        })
    })
    expect(draft.report.numberingGaps).toEqual(['117'])
  })

  it('warianty od AI są oznaczone, a poprawna odpowiedź zostaje ze źródła', async () => {
    const draft = await runImport('1. a', {
      ...opts,
      runner: async () => emptyResult({ questions: [rawQuestion({ distractors_generated: true })] })
    })
    const [q] = draft.questions
    expect(q.options[0].source).toBe('original')
    expect(q.options.slice(1).every((o) => o.source === 'ai')).toBe(true)
    expect(q.answerText).toBe('100 W')
  })

  it('wyjaśnienie spoza źródła nie jest zweryfikowane', async () => {
    const draft = await runImport('1. a', {
      ...opts,
      runner: async () =>
        emptyResult({ questions: [rawQuestion({ explanation: 'Bo P = U·I.', explanation_from_source: false })] })
    })
    expect(draft.questions[0].explanation).toEqual({ text: 'Bo P = U·I.', source: 'ai', verified: false })
  })

  it('nieznana kategoria to błąd walidacji, nie nowa kategoria', async () => {
    const draft = await runImport('1. a', {
      ...opts,
      runner: async () => emptyResult({ questions: [rawQuestion({ category: 'Kosmonautyka' })] })
    })
    expect(draft.questions[0].flags).toContain('ambiguous')
    expect(draft.questions[0].reviewNote).toContain('Kosmonautyka')
  })

  it('nieudana paczka nie przerywa importu', async () => {
    let call = 0
    const draft = await runImport(numbered(1, 50), {
      ...opts,
      runner: async () => {
        call++
        if (call === 1) throw new Error('429 boom')
        return emptyResult({ questions: [rawQuestion()] })
      }
    })
    expect(draft.report.failedChunks).toHaveLength(1)
    expect(draft.questions).toHaveLength(1)
  })
})
