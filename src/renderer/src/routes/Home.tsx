import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useStore } from '@/store'
import { cardCounts, dueToday, examHistory } from '@shared/stats'
import { daysBetween, today } from '@shared/dates'

export default function HomePage(): React.JSX.Element {
  const { questions, progress, exams, settings, loading } = useStore()
  const day = today()
  const due = dueToday(questions, progress, day)
  const counts = cardCounts(questions, progress)
  const last = examHistory(exams)[0]
  const daysLeft = settings.examDate ? daysBetween(day, settings.examDate) : null

  if (loading) return <p className="text-sm text-muted-foreground">Wczytywanie…</p>

  if (questions.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Elektryk Quiz</h1>
        <Alert>
          <AlertDescription>
            Nie masz jeszcze żadnych pytań. Na ekranie <strong>Import</strong> wczytaj jednym
            kliknięciem 38 zadań z informatorów CKE (klucz odpowiedzi prosto ze źródła) albo
            zaimportuj własną listę pytań przez Claude.
          </AlertDescription>
        </Alert>
        <Button asChild>
          <Link to="/import">Przejdź do importu</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Start</h1>
        <p className="text-sm text-muted-foreground">
          {questions.length} pytań w bazie
          {daysLeft !== null && ` · do egzaminu ${daysLeft} dni`}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat title="Powtórki na dziś" value={due} to="/review" cta="Powtarzaj" />
        <Stat title="Pula błędów" value={counts.errorPool} to="/errors" cta="Pracuj nad błędami" />
        <Stat title="Nowe pytania" value={counts.fresh} to="/learn" cta="Ucz się" />
        <Stat title="Opanowane" value={counts.mastered} to="/stats" cta="Statystyki" />
      </div>

      {/* na telefonie dolny pasek mieści pięć zakładek, reszta wchodzi stąd */}
      <div className="flex flex-wrap gap-2 md:hidden">
        {[
          ['/stats', 'Statystyki'],
          ['/sets', 'Zestawy'],
          ['/import', 'Import'],
          ['/settings', 'Ustawienia']
        ].map(([to, label]) => (
          <Button key={to} asChild variant="outline" size="sm">
            <Link to={to}>{label}</Link>
          </Button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ostatni egzamin</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {last ? (
              <>
                <p className="text-2xl font-semibold">
                  {last.score}/{last.total}{' '}
                  <span className={last.passed ? 'text-success' : 'text-destructive'}>
                    {last.passed ? 'zdany' : 'niezdany'}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(last.date).toLocaleString('pl-PL')} · {Math.round(last.durationSec / 60)} min
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Jeszcze nie zdawałeś próbnego egzaminu.</p>
            )}
            <Button asChild variant="secondary">
              <Link to="/exam">Zacznij egzamin próbny</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Format egzaminu</CardTitle>
            <CardDescription>Część pisemna ELE.02 / ELE.05</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {settings.exam.questionCount} zadań · {settings.exam.timeLimitMin} minut · próg{' '}
            {settings.exam.passThresholdPct}% · jedna poprawna odpowiedź z czterech
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function Stat({
  title,
  value,
  to,
  cta
}: {
  title: string
  value: number
  to: string
  cta: string
}): React.JSX.Element {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-3xl">{value}</CardTitle>
      </CardHeader>
      <CardContent>
        <Button asChild variant="ghost" size="sm" className="px-0">
          <Link to={to}>{cta} →</Link>
        </Button>
      </CardContent>
    </Card>
  )
}
