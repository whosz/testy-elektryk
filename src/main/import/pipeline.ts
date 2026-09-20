import { CATEGORY_NAMES, categoryId } from '../../shared/categories'
import { questionId } from '../../shared/ids'
import type { ImportChunkResult } from '../../shared/schema'
import type { ImportDraft, ImportReport, Option, Question, QuestionFlag } from '../../shared/types'
import { chunkText, detectQuestionCount } from './chunk'
import { ChunkFailed, runChunk, type RunChunkOptions } from './claude'

const LETTERS = 'abcdefghij'.split('')

export type ChunkRunner = (chunk: string, opts: RunChunkOptions) => Promise<ImportChunkResult>

export interface PipelineOptions extends RunChunkOptions {
  setId: string
  sourceFileName: string
  onProgress?: (p: { done: number; total: number }) => void
  runner?: ChunkRunner
}

function toQuestion(
  raw: ImportChunkResult['questions'][number],
  setId: string,
  now: string
): { question: Question; invalid: boolean } {
  const generated = raw.distractors_generated
  const correct = new Set(raw.correct_indexes)
  const options: Option[] = raw.options.map((text, i) => ({
    id: LETTERS[i],
    text,
    // AI dopisuje tylko błędne warianty — poprawna odpowiedź zawsze zostaje ze źródła.
    source: generated && !correct.has(i) ? 'ai' : 'original'
  }))

  const invalid =
    raw.type !== 'open' &&
    (raw.correct_indexes.length === 0 ||
      raw.correct_indexes.some((i) => i < 0 || i >= raw.options.length))

  const flags: QuestionFlag[] = [...raw.flags]
  if (invalid && !flags.includes('incomplete_source')) flags.push('incomplete_source')

  const mapped = categoryId(raw.category)
  if (!mapped && !flags.includes('ambiguous')) flags.push('ambiguous')

  return {
    invalid,
    question: {
      id: questionId(raw.question),
      setId,
      sourceNumber: raw.source_number,
      type: raw.type,
      question: raw.question,
      options: raw.type === 'open' ? [] : options,
      correctOptionIds:
        raw.type === 'open' ? [] : raw.correct_indexes.filter((i) => i >= 0 && i < options.length).map((i) => LETTERS[i]),
      answerText: raw.answer_text,
      explanation: raw.explanation
        ? {
            text: raw.explanation,
            source: raw.explanation_from_source ? 'original' : 'ai',
            verified: raw.explanation_from_source
          }
        : null,
      category: mapped ?? 'PE',
      unit: '',
      difficulty: (raw.difficulty === 1 || raw.difficulty === 3 ? raw.difficulty : 2) as 1 | 2 | 3,
      flags,
      reviewNote: mapped
        ? raw.review_note
        : [raw.review_note, `Nieznana kategoria od modelu: "${raw.category}"`].filter(Boolean).join(' | '),
      image: null,
      createdAt: now
    }
  }
}

/** Luki w numeracji: jest 116 i 118, brak 117 (PLAN 6.6). */
function numberingGaps(numbers: string[]): string[] {
  const nums = numbers.map(Number).filter((n) => Number.isFinite(n) && n > 0).sort((a, b) => a - b)
  const gaps: string[] = []
  for (let i = 1; i < nums.length; i++) {
    for (let missing = nums[i - 1] + 1; missing < nums[i]; missing++) gaps.push(String(missing))
  }
  return gaps
}

export async function runImport(text: string, opts: PipelineOptions): Promise<ImportDraft> {
  const run = opts.runner ?? runChunk
  const chunks = chunkText(text)
  const now = new Date().toISOString()
  const categories = [...CATEGORY_NAMES]
  const questions: Question[] = []
  const seen = new Map<string, Question>()
  const duplicates: string[] = []
  const invalidCorrectIndexes: string[] = []
  const failedChunks: ImportReport['failedChunks'] = []
  let tail = ''

  for (let i = 0; i < chunks.length; i++) {
    // incomplete_tail z poprzedniej paczki dokleja się na początek następnej → paczki idą sekwencyjnie
    const chunk = tail ? `${tail}\n${chunks[i]}` : chunks[i]
    try {
      const result = await run(chunk, { ...opts, categories })
      tail = result.incomplete_tail
      for (const name of result.new_categories) {
        if (!categories.includes(name)) categories.push(name)
      }
      for (const raw of result.questions) {
        const { question, invalid } = toQuestion(raw, opts.setId, now)
        if (invalid) invalidCorrectIndexes.push(question.id)
        if (seen.has(question.id)) {
          duplicates.push(question.id)
          continue
        }
        seen.set(question.id, question)
        questions.push(question)
      }
    } catch (err) {
      failedChunks.push({
        index: i,
        text: chunk,
        error: err instanceof ChunkFailed ? err.message : String(err)
      })
      tail = ''
    }
    opts.onProgress?.({ done: i + 1, total: chunks.length })
  }

  const byFlag: Record<string, number> = {}
  for (const q of questions) for (const f of q.flags) byFlag[f] = (byFlag[f] ?? 0) + 1

  return {
    id: opts.setId,
    sourceFileName: opts.sourceFileName,
    categories,
    questions,
    report: {
      detectedQuestions: detectQuestionCount(text),
      returnedQuestions: questions.length,
      numberingGaps: numberingGaps(questions.map((q) => q.sourceNumber).filter(Boolean)),
      duplicates,
      invalidCorrectIndexes,
      byFlag,
      failedChunks
    }
  }
}

export function estimate(text: string): { chunks: number; chars: number; detectedQuestions: number } {
  return {
    chunks: chunkText(text).length,
    chars: text.length,
    detectedQuestions: detectQuestionCount(text)
  }
}
