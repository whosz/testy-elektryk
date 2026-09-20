export type QuestionType = 'single_choice' | 'multi_choice' | 'true_false' | 'open'

export type QuestionFlag = 'answer_suspect' | 'ambiguous' | 'needs_image' | 'incomplete_source'

export interface Option {
  id: string
  text: string
  source: 'original' | 'ai'
}

export interface Explanation {
  text: string
  source: 'original' | 'ai'
  verified: boolean
}

export interface Question {
  id: string
  setId: string
  sourceNumber: string
  type: QuestionType
  question: string
  options: Option[]
  correctOptionIds: string[]
  answerText: string
  explanation: Explanation | null
  category: string
  unit: string
  difficulty: 1 | 2 | 3
  flags: QuestionFlag[]
  reviewNote: string
  image: string | null
  createdAt: string
}

export interface QuestionSet {
  id: string
  name: string
  createdAt: string
  sourceFileName: string
  categories: string[]
  questions: Question[]
}

export interface CardProgress {
  questionId: string
  repetitions: number
  easeFactor: number
  intervalDays: number
  dueDate: string
  inErrorPool: boolean
  correctStreak: number
  timesSeen: number
  timesCorrect: number
  lastAnsweredAt: string | null
  lastResult: 'correct' | 'wrong' | null
}

export interface ExamResult {
  id: string
  date: string
  setIds: string[]
  questionIds: string[]
  answers: Record<string, string[]>
  score: number
  total: number
  passed: boolean
  durationSec: number
  perCategory: Record<string, { correct: number; total: number }>
}

export interface Settings {
  model: string
  generateDistractors: boolean
  exam: { questionCount: number; timeLimitMin: number; passThresholdPct: number }
  examDate: string | null
  newCardsPerDay: number
  errorPoolExitStreak: number
  shuffleOptions: boolean
  excludeNeedsImageFromExam: boolean
  contentUrl: string
  autoCheckContent: boolean
}

export interface ImportReport {
  detectedQuestions: number
  returnedQuestions: number
  numberingGaps: string[]
  duplicates: string[]
  invalidCorrectIndexes: string[]
  byFlag: Record<string, number>
  failedChunks: { index: number; text: string; error: string }[]
}

export interface ImportDraft {
  id: string
  sourceFileName: string
  categories: string[]
  questions: Question[]
  report: ImportReport
}
