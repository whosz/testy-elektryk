import { z } from 'zod'

export const OptionSchema = z.object({
  id: z.string(),
  text: z.string(),
  source: z.enum(['original', 'ai'])
})

export const ExplanationSchema = z.object({
  text: z.string(),
  source: z.enum(['original', 'ai']),
  verified: z.boolean()
})

export const QuestionSchema = z.object({
  id: z.string(),
  setId: z.string(),
  sourceNumber: z.string(),
  type: z.enum(['single_choice', 'multi_choice', 'true_false', 'open']),
  question: z.string(),
  options: z.array(OptionSchema),
  correctOptionIds: z.array(z.string()),
  answerText: z.string(),
  explanation: ExplanationSchema.nullable(),
  category: z.string(),
  unit: z.string().default(''),
  difficulty: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  flags: z.array(z.enum(['answer_suspect', 'ambiguous', 'needs_image', 'incomplete_source'])),
  reviewNote: z.string(),
  image: z.string().nullable(),
  createdAt: z.string()
})

export const QuestionSetSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.string(),
  sourceFileName: z.string(),
  categories: z.array(z.string()),
  questions: z.array(QuestionSchema)
})

export const CardProgressSchema = z.object({
  questionId: z.string(),
  repetitions: z.number(),
  easeFactor: z.number(),
  intervalDays: z.number(),
  dueDate: z.string(),
  inErrorPool: z.boolean(),
  correctStreak: z.number(),
  timesSeen: z.number(),
  timesCorrect: z.number(),
  lastAnsweredAt: z.string().nullable(),
  lastResult: z.enum(['correct', 'wrong']).nullable()
})

export const ProgressFileSchema = z.object({ cards: z.record(CardProgressSchema) })

export const ExamResultSchema = z.object({
  id: z.string(),
  date: z.string(),
  setIds: z.array(z.string()),
  questionIds: z.array(z.string()),
  answers: z.record(z.array(z.string())),
  score: z.number(),
  total: z.number(),
  passed: z.boolean(),
  durationSec: z.number(),
  perCategory: z.record(z.object({ correct: z.number(), total: z.number() }))
})

export const ExamsFileSchema = z.array(ExamResultSchema)

export const SettingsSchema = z.object({
  model: z.string().default('claude-sonnet-5'),
  generateDistractors: z.boolean().default(true),
  exam: z
    .object({
      questionCount: z.number().int().positive().default(40),
      timeLimitMin: z.number().int().positive().default(60),
      passThresholdPct: z.number().int().min(1).max(100).default(50)
    })
    .default({ questionCount: 40, timeLimitMin: 60, passThresholdPct: 50 }),
  examDate: z.string().nullable().default(null),
  newCardsPerDay: z.number().int().positive().default(20),
  errorPoolExitStreak: z.number().int().positive().default(3),
  shuffleOptions: z.boolean().default(true),
  excludeNeedsImageFromExam: z.boolean().default(true),
  /** Skąd aplikacja bierze materiały. Może wskazywać dowolny serwer ze statycznymi plikami. */
  contentUrl: z
    .string()
    .default('https://raw.githubusercontent.com/whosz/testy-elektryk/main/content/'),
  autoCheckContent: z.boolean().default(true)
})

export const DEFAULT_SETTINGS = SettingsSchema.parse({})

/** Odpowiedź Claude dla jednej paczki (PLAN 6.3). */
export const ImportChunkSchema = z.object({
  questions: z.array(
    z.object({
      source_number: z.string(),
      type: z.enum(['single_choice', 'multi_choice', 'true_false', 'open']),
      question: z.string(),
      options: z.array(z.string()),
      correct_indexes: z.array(z.number().int()),
      answer_text: z.string(),
      distractors_generated: z.boolean(),
      explanation: z.string(),
      explanation_from_source: z.boolean(),
      category: z.string(),
      difficulty: z.number().int().min(1).max(3),
      flags: z.array(z.enum(['answer_suspect', 'ambiguous', 'needs_image', 'incomplete_source'])),
      review_note: z.string()
    })
  ),
  incomplete_tail: z.string(),
  new_categories: z.array(z.string())
})

export type ImportChunkResult = z.infer<typeof ImportChunkSchema>
