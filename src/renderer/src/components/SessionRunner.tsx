import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { useStore } from '@/store'
import type { Grade } from '@shared/sm2'
import type { Question } from '@shared/types'
import QuestionCard from './QuestionCard'

interface Props {
  questions: Question[]
  /** Egzamin nie przestawia harmonogramu SM-2 (PLAN 7.2). */
  schedule?: boolean
  onExit: () => void
}

/** Wspólny silnik dla Nauki, Powtórek i Moich błędów: błędne pytania wracają raz na końcu. */
export default function SessionRunner({ questions, schedule = true, onExit }: Props): React.JSX.Element {
  const answer = useStore((s) => s.answer)
  const shuffleOptions = useStore((s) => s.settings.shuffleOptions)
  const [queue, setQueue] = useState<Question[]>(questions)
  const [index, setIndex] = useState(0)
  const [retries, setRetries] = useState<Question[]>([])
  const [stats, setStats] = useState({ correct: 0, wrong: 0 })
  const [done, setDone] = useState(false)

  const current = queue[index]

  const next = (): void => {
    if (index + 1 < queue.length) {
      setIndex(index + 1)
      return
    }
    if (retries.length > 0) {
      setQueue(retries)
      setRetries([])
      setIndex(0)
      return
    }
    setDone(true)
  }

  const handleAnswer = (_chosen: string[], correct: boolean): void => {
    void answer(current.id, correct, { schedule })
    setStats((s) => ({ correct: s.correct + (correct ? 1 : 0), wrong: s.wrong + (correct ? 0 : 1) }))
    if (!correct) setRetries((r) => (r.some((q) => q.id === current.id) ? r : [...r, current]))
  }

  const handleGrade = (grade: Grade): void => {
    const correct = grade >= 3
    void answer(current.id, correct, { grade, schedule })
    setStats((s) => ({ correct: s.correct + (correct ? 1 : 0), wrong: s.wrong + (correct ? 0 : 1) }))
    if (!correct) setRetries((r) => (r.some((q) => q.id === current.id) ? r : [...r, current]))
    next()
  }

  if (done || !current) {
    const total = stats.correct + stats.wrong
    return (
      <Card>
        <CardHeader>
          <CardTitle>Koniec sesji</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {total > 0
              ? `Poprawnie ${stats.correct} z ${total} odpowiedzi (${Math.round((stats.correct / total) * 100)}%).`
              : 'Brak pytań do nauki.'}
          </p>
          <Button onClick={onExit}>Wróć</Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Progress value={((index + 1) / queue.length) * 100} />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>
            Dobrze {stats.correct} · Źle {stats.wrong}
            {retries.length > 0 && ` · do powtórzenia ${retries.length}`}
          </span>
          <button className="underline-offset-2 hover:underline" onClick={onExit}>
            Przerwij
          </button>
        </div>
      </div>
      <QuestionCard
        key={current.id}
        question={current}
        index={index}
        total={queue.length}
        mode="feedback"
        shuffleOptions={shuffleOptions}
        onAnswer={handleAnswer}
        onNext={next}
        onGrade={handleGrade}
      />
    </div>
  )
}
