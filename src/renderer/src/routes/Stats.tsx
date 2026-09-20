import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useStore } from '@/store'
import { categoryName } from '@shared/categories'
import { byCategory, cardCounts, examHistory, weakestQuestions } from '@shared/stats'

export default function StatsPage(): React.JSX.Element {
  const { questions, progress, exams } = useStore()
  const cats = byCategory(questions, progress)
  const counts = cardCounts(questions, progress)
  const weakest = weakestQuestions(questions, progress)
  const history = examHistory(exams)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Statystyki</h1>

      <div className="grid gap-4 sm:grid-cols-4">
        {[
          ['Nowe', counts.fresh],
          ['W nauce', counts.learning],
          ['Opanowane', counts.mastered],
          ['W puli błędów', counts.errorPool]
        ].map(([label, value]) => (
          <Card key={label as string}>
            <CardHeader className="pb-2">
              <CardDescription>{label}</CardDescription>
              <CardTitle className="text-2xl">{value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Skuteczność według kategorii</CardTitle>
          <CardDescription>Najsłabsze na górze</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {cats.length === 0 && <p className="text-sm text-muted-foreground">Brak odpowiedzi.</p>}
          {cats.map((c) => (
            <div key={c.category} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>{categoryName(c.category)}</span>
                <span className="text-muted-foreground">
                  {c.pct}% ({c.correct}/{c.total})
                </span>
              </div>
              <Progress value={c.pct} />
            </div>
          ))}
        </CardContent>
      </Card>

      {weakest.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Najsłabsze pytania</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {weakest.map((q) => {
              const c = progress[q.id]
              return (
                <div key={q.id} className="flex gap-3 border-b pb-2 text-sm last:border-0">
                  <span className="flex-1">{q.question.split('\n')[0]}</span>
                  <span className="shrink-0 text-muted-foreground">
                    {c.timesCorrect}/{c.timesSeen}
                  </span>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Historia egzaminów</CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">Brak egzaminów.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Wynik</TableHead>
                  <TableHead>%</TableHead>
                  <TableHead>Czas</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>{new Date(e.date).toLocaleDateString('pl-PL')}</TableCell>
                    <TableCell>
                      {e.score}/{e.total}
                    </TableCell>
                    <TableCell>{Math.round((e.score / e.total) * 100)}%</TableCell>
                    <TableCell>{Math.round(e.durationSec / 60)} min</TableCell>
                    <TableCell className={e.passed ? 'text-success' : 'text-destructive'}>
                      {e.passed ? 'zdany' : 'niezdany'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
