import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import SessionRunner from '@/components/SessionRunner'
import { useStore } from '@/store'
import { buildDailyQueue } from '@shared/session'
import { today } from '@shared/dates'

export default function ReviewPage(): React.JSX.Element {
  const { questions, progress, settings } = useStore()
  const [running, setRunning] = useState(false)

  const queue = useMemo(
    () => buildDailyQueue(questions, progress, { today: today(), newCardsPerDay: settings.newCardsPerDay }),
    [questions, progress, settings.newCardsPerDay]
  )

  if (running) return <SessionRunner questions={queue} onExit={() => setRunning(false)} />

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Powtórki na dziś</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{queue.length} pytań w kolejce</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Zaległe powtórki najpierw, potem nowe karty (limit {settings.newCardsPerDay} dziennie).
            Kategorie są przeplatane.
          </p>
          <Button disabled={queue.length === 0} onClick={() => setRunning(true)}>
            {queue.length === 0 ? 'Na dziś nic nie zostało' : 'Zacznij powtórki'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
