import { useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import SessionRunner from '@/components/SessionRunner'
import { useStore } from '@/store'
import { errorPoolQueue } from '@shared/session'
import { categoryName } from '@shared/categories'

export default function ErrorsPage(): React.JSX.Element {
  const { questions, progress, settings } = useStore()
  const [running, setRunning] = useState(false)
  const queue = useMemo(() => errorPoolQueue(questions, progress), [questions, progress])

  if (running) return <SessionRunner questions={queue} onExit={() => setRunning(false)} />

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Moje błędy</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{queue.length} pytań w puli</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Pytanie wypada z puli po {settings.errorPoolExitStreak} poprawnych odpowiedziach z rzędu.
            Najpierw te, które idą najgorzej.
          </p>
          <Button disabled={queue.length === 0} onClick={() => setRunning(true)}>
            {queue.length === 0 ? 'Pula jest pusta' : 'Pracuj nad błędami'}
          </Button>
        </CardContent>
      </Card>

      {queue.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lista</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {queue.map((q) => (
              <div key={q.id} className="space-y-1.5 border-b pb-3 text-sm last:border-0 last:pb-0">
                <p>{q.question.split('\n')[0]}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{categoryName(q.category)}</Badge>
                  <span className="text-xs text-muted-foreground">
                    seria {progress[q.id]?.correctStreak ?? 0}/{settings.errorPoolExitStreak}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
