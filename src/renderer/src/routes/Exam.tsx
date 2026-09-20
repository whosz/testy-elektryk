import { useEffect, useMemo, useRef, useState } from 'react'
import { Flag } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import QuestionCard from '@/components/QuestionCard'
import { useStore } from '@/store'
import { categoryName } from '@shared/categories'
import { drawExamQuestions, examPool, gradeExam, isCorrect } from '@shared/exam'
import type { ExamResult, Question } from '@shared/types'

type Phase = 'setup' | 'running' | 'result'

export default function ExamPage(): React.JSX.Element {
  const { questions, settings, addExam, answer } = useStore()
  const [phase, setPhase] = useState<Phase>('setup')
  const [drawn, setDrawn] = useState<Question[]>([])
  const [answers, setAnswers] = useState<Record<string, string[]>>({})
  const [marked, setMarked] = useState<string[]>([])
  const [index, setIndex] = useState(0)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [result, setResult] = useState<ExamResult | null>(null)
  const startedAt = useRef(0)

  const pool = useMemo(() => examPool(questions, settings), [questions, settings])
  const excluded = questions.length - pool.length

  const finish = (): void => {
    const durationSec = Math.round((Date.now() - startedAt.current) / 1000)
    const res = gradeExam(drawn, answers, durationSec, settings, [...new Set(drawn.map((q) => q.setId))])
    setResult(res)
    setPhase('result')
    void addExam(res)
    // Egzamin aktualizuje tylko statystyki i pulę błędów — bez przestawiania SM-2 (PLAN 7.2).
    for (const q of drawn) void answer(q.id, isCorrect(q, answers[q.id] ?? []), { schedule: false })
  }

  useEffect(() => {
    if (phase !== 'running') return
    const id = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(id)
          finish()
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [phase, drawn, answers])

  const start = (): void => {
    setDrawn(drawExamQuestions(pool, settings.exam.questionCount))
    setAnswers({})
    setMarked([])
    setIndex(0)
    setSecondsLeft(settings.exam.timeLimitMin * 60)
    startedAt.current = Date.now()
    setPhase('running')
  }

  if (phase === 'setup') {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Egzamin próbny</h1>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {settings.exam.questionCount} zadań · {settings.exam.timeLimitMin} minut · próg{' '}
              {settings.exam.passThresholdPct}%
            </CardTitle>
            <CardDescription>
              Bez informacji zwrotnej w trakcie. Pytania losowane proporcjonalnie do wielkości kategorii.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Dostępnych pytań: {pool.length}
              {excluded > 0 && ` (pominięto ${excluded} wymagających rysunku, bez dołączonego obrazka)`}
            </p>
            <Button disabled={pool.length === 0} onClick={start}>
              Zacznij egzamin
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (phase === 'result' && result) {
    const wrong = drawn.filter((q) => !isCorrect(q, answers[q.id] ?? []))
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardDescription>Wynik</CardDescription>
            <CardTitle className="text-3xl">
              {result.score}/{result.total}{' '}
              <span className={result.passed ? 'text-success' : 'text-destructive'}>
                {result.passed ? 'zdany' : 'niezdany'}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {Math.round((result.score / result.total) * 100)}% · czas{' '}
              {Math.floor(result.durationSec / 60)} min {result.durationSec % 60} s
            </p>
            <div className="space-y-2">
              {Object.entries(result.perCategory)
                .sort((a, b) => a[1].correct / a[1].total - b[1].correct / b[1].total)
                .map(([cat, c]) => (
                  <div key={cat} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{categoryName(cat)}</span>
                      <span className="text-muted-foreground">
                        {c.correct}/{c.total}
                      </span>
                    </div>
                    <Progress value={(c.correct / c.total) * 100} />
                  </div>
                ))}
            </div>
            <Button onClick={() => setPhase('setup')}>Wróć</Button>
          </CardContent>
        </Card>

        {wrong.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Błędne odpowiedzi ({wrong.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {wrong.map((q) => (
                <div key={q.id} className="space-y-1 border-b pb-3 text-sm last:border-0">
                  <p className="font-medium">{q.question.split('\n')[0]}</p>
                  <p className="text-success">Poprawnie: {q.answerText}</p>
                  <p className="text-destructive">
                    Twoja odpowiedź:{' '}
                    {(answers[q.id] ?? []).map((id) => q.options.find((o) => o.id === id)?.text).join(', ') ||
                      'brak'}
                  </p>
                  {q.explanation && <p className="text-muted-foreground">{q.explanation.text}</p>}
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  const current = drawn[index]
  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0')
  const ss = String(secondsLeft % 60).padStart(2, '0')

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Badge variant={secondsLeft < 300 ? 'destructive' : 'secondary'} className="text-sm tabular-nums">
          {mm}:{ss}
        </Badge>
        <span className="text-xs text-muted-foreground">
          Odpowiedzi: {Object.keys(answers).length}/{drawn.length}
          {marked.length > 0 && ` · oznaczone ${marked.length}`}
        </span>
        <Button size="sm" onClick={finish}>
          Zakończ
        </Button>
      </div>

      <div className="flex flex-wrap gap-1">
        {drawn.map((q, i) => (
          <button
            key={q.id}
            onClick={() => setIndex(i)}
            className={cn(
              'size-7 rounded border text-xs',
              i === index && 'ring-2 ring-ring',
              marked.includes(q.id)
                ? 'bg-warning/30'
                : answers[q.id]
                  ? 'bg-primary/15'
                  : 'bg-background'
            )}
          >
            {i + 1}
          </button>
        ))}
      </div>

      <QuestionCard
        key={current.id}
        question={current}
        index={index}
        total={drawn.length}
        mode="silent"
        shuffleOptions={settings.shuffleOptions}
        initialAnswer={answers[current.id]}
        onAnswer={(chosen) => setAnswers((a) => ({ ...a, [current.id]: chosen }))}
        onNext={() => (index + 1 < drawn.length ? setIndex(index + 1) : finish())}
        footer={
          <Button
            variant={marked.includes(current.id) ? 'default' : 'outline'}
            onClick={() =>
              setMarked((m) =>
                m.includes(current.id) ? m.filter((x) => x !== current.id) : [...m, current.id]
              )
            }
          >
            <Flag className="size-4" /> Wrócę później
          </Button>
        }
      />
    </div>
  )
}
