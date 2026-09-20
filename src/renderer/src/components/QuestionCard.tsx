import { useEffect, useMemo, useState } from 'react'
import { Check, Sparkles, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { categoryName } from '@shared/categories'
import { isCorrect } from '@shared/exam'
import { shuffle } from '@shared/session'
import type { Grade } from '@shared/sm2'
import type { Question } from '@shared/types'
import FlagBadges from './FlagBadges'

interface Props {
  question: Question
  index: number
  total: number
  /** Egzamin: bez informacji zwrotnej, odpowiedź zapamiętywana i edytowalna. */
  mode: 'feedback' | 'silent'
  shuffleOptions: boolean
  initialAnswer?: string[]
  onAnswer: (chosen: string[], correct: boolean) => void
  onNext: () => void
  onGrade?: (grade: Grade) => void
  footer?: React.ReactNode
}

const FLASHCARD_GRADES: Array<{ label: string; grade: Grade; variant: 'destructive' | 'outline' | 'secondary' | 'default' }> = [
  { label: 'Nie wiedziałem', grade: 1, variant: 'destructive' },
  { label: 'Z trudem', grade: 3, variant: 'outline' },
  { label: 'Dobrze', grade: 4, variant: 'secondary' },
  { label: 'Łatwe', grade: 5, variant: 'default' }
]

export default function QuestionCard({
  question,
  index,
  total,
  mode,
  shuffleOptions,
  initialAnswer,
  onAnswer,
  onNext,
  onGrade,
  footer
}: Props): React.JSX.Element {
  const [chosen, setChosen] = useState<string[]>(initialAnswer ?? [])
  const [submitted, setSubmitted] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const multi = question.type === 'multi_choice'
  const open = question.type === 'open'

  // Tasowanie stałe dla danego pytania w sesji — inaczej warianty skakałyby przy każdym renderze.
  const options = useMemo(
    () =>
      shuffleOptions && question.type !== 'true_false'
        ? shuffle(question.options, hash(question.id + index))
        : question.options,
    [question, shuffleOptions, index]
  )

  useEffect(() => {
    setChosen(initialAnswer ?? [])
    setSubmitted(false)
    setRevealed(false)
  }, [question.id, initialAnswer])

  const submit = (): void => {
    if (submitted || chosen.length === 0) return
    if (mode === 'silent') return
    setSubmitted(true)
    onAnswer(chosen, isCorrect(question, chosen))
  }

  const toggle = (id: string): void => {
    if (submitted) return
    const next = multi ? (chosen.includes(id) ? chosen.filter((c) => c !== id) : [...chosen, id]) : [id]
    setChosen(next)
    if (mode === 'silent') onAnswer(next, isCorrect(question, next))
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (open) {
        if (e.key === ' ') {
          e.preventDefault()
          setRevealed(true)
        }
        return
      }
      const idx = keyToIndex(e.key)
      if (idx !== null && idx < options.length) {
        e.preventDefault()
        toggle(options[idx].id)
        return
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        submitted || mode === 'silent' ? onNext() : submit()
      }
      if (e.key === ' ' && (submitted || mode === 'silent')) {
        e.preventDefault()
        onNext()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const correct = submitted && isCorrect(question, chosen)

  return (
    <Card>
      <CardHeader className="gap-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">
            Pytanie {index + 1} z {total}
          </span>
          <div className="flex flex-wrap items-center justify-end gap-1">
            <Badge variant="outline">{categoryName(question.category)}</Badge>
            {question.unit && <Badge variant="outline">{question.unit}</Badge>}
            <FlagBadges flags={question.flags} note={question.reviewNote} />
          </div>
        </div>
        <p className="whitespace-pre-line text-base font-medium">{question.question}</p>
      </CardHeader>

      <CardContent className="space-y-4">
        {open ? (
          <div className="space-y-3">
            {revealed ? (
              <>
                <div className="rounded-md border bg-muted/40 p-3 text-sm">{question.answerText}</div>
                {onGrade && (
                  <div className="flex flex-wrap gap-2">
                    {FLASHCARD_GRADES.map((g) => (
                      <Button key={g.grade} variant={g.variant} size="sm" onClick={() => onGrade(g.grade)}>
                        {g.label}
                      </Button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <Button onClick={() => setRevealed(true)}>Pokaż odpowiedź (Spacja)</Button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {options.map((opt, i) => {
              const picked = chosen.includes(opt.id)
              const isKey = question.correctOptionIds.includes(opt.id)
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => toggle(opt.id)}
                  disabled={submitted}
                  className={cn(
                    'flex w-full items-start gap-3 rounded-md border p-3 text-left text-sm transition-colors',
                    !submitted && 'hover:bg-accent',
                    picked && !submitted && 'border-primary bg-primary/5',
                    submitted && isKey && 'border-success bg-success/10',
                    submitted && picked && !isKey && 'border-destructive bg-destructive/10'
                  )}
                >
                  <span className="flex size-6 shrink-0 items-center justify-center rounded border text-xs font-medium">
                    {'ABCD'[i] ?? i + 1}
                  </span>
                  <span className="flex-1 whitespace-pre-line">{opt.text}</span>
                  {opt.source === 'ai' && (
                    <Badge variant="secondary" className="shrink-0 gap-1" title="Wariant wygenerowany przez AI">
                      <Sparkles className="size-3" /> AI
                    </Badge>
                  )}
                  {submitted && isKey && <Check className="size-4 shrink-0 text-success" />}
                  {submitted && picked && !isKey && <X className="size-4 shrink-0 text-destructive" />}
                </button>
              )
            })}
          </div>
        )}

        {submitted && (
          <div className="space-y-2">
            <p className={cn('text-sm font-medium', correct ? 'text-success' : 'text-destructive')}>
              {correct ? 'Dobrze.' : `Źle. Poprawna odpowiedź: ${question.answerText}`}
            </p>
            {question.explanation && (
              <div className="rounded-md border bg-muted/40 p-3 text-sm">
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground">Wyjaśnienie</span>
                  {question.explanation.source === 'ai' && !question.explanation.verified && (
                    <Badge variant="secondary" className="gap-1">
                      <Sparkles className="size-3" /> AI — niezweryfikowane
                    </Badge>
                  )}
                </div>
                {question.explanation.text}
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between gap-2 pt-1">
          <span className="text-xs text-muted-foreground">
            {open ? 'Spacja — pokaż odpowiedź' : 'A–D lub 1–4 — wybór · Enter — zatwierdź · Spacja — dalej'}
          </span>
          <div className="flex gap-2">
            {footer}
            {mode === 'feedback' && !submitted && !open && (
              <Button onClick={submit} disabled={chosen.length === 0}>
                Zatwierdź
              </Button>
            )}
            {(submitted || mode === 'silent' || (open && revealed && !onGrade)) && (
              <Button onClick={onNext} variant={mode === 'silent' ? 'default' : 'secondary'}>
                Dalej
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function keyToIndex(key: string): number | null {
  const letter = 'abcd'.indexOf(key.toLowerCase())
  if (letter >= 0) return letter
  const digit = '1234'.indexOf(key)
  return digit >= 0 ? digit : null
}

function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}
