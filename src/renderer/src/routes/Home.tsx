import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Download, HelpCircle, Image as ImageIcon, Menu, Zap, Video as VideoIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { useStore } from '@/store'
import { applyContent, fetchManifest, type ApplyProgress } from '@/updates'
import { cardCounts, dueToday, examHistory } from '@shared/stats'
import { daysBetween, today } from '@shared/dates'

function HamburgerMenu({ items }: { items: Array<{ to: string; label: string }> }): React.JSX.Element {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="shrink-0 md:hidden" aria-label="Więcej">
          <Menu className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {items.map((item) => (
          <DropdownMenuItem key={item.to} asChild>
            <Link to={item.to}>{item.label}</Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default function HomePage(): React.JSX.Element {
  const { questions, progress, exams, settings, loading, update, appUpdate, refresh } = useStore()
  const day = today()
  const due = dueToday(questions, progress, day)
  const counts = cardCounts(questions, progress)
  const last = examHistory(exams)[0]
  const daysLeft = settings.examDate ? daysBetween(day, settings.examDate) : null
  const [downloading, setDownloading] = useState<ApplyProgress | null>(null)

  if (loading) return <p className="text-sm text-muted-foreground">Wczytywanie…</p>

  // Jeden przycisk, bez przechodzenia przez Ustawienia: jeśli cichy check przy
  // starcie jeszcze nie zdążył ustawić update.manifest, dociąga go tutaj sam.
  const downloadNow = async (): Promise<void> => {
    setDownloading({ label: 'Sprawdzam materiały', done: 0, total: 1 })
    try {
      const manifest = update.manifest ?? (await fetchManifest(settings.contentUrl))
      const res = await applyContent(settings.contentUrl, manifest, setDownloading)
      await refresh()
      toast.success(`Pobrano ${res.added} pytań`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    } finally {
      setDownloading(null)
    }
  }

  const appUpdateBanner = appUpdate ? (
    <Alert>
      <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
        <span>Dostępna jest nowa wersja aplikacji ({appUpdate.version}).</span>
        <Button asChild size="sm">
          <Link to="/settings">Zobacz</Link>
        </Button>
      </AlertDescription>
    </Alert>
  ) : null

  // Baner musi być też na pustej bazie — wtedy aktualizacja materiałów jest
  // jedynym sposobem, żeby w aplikacji w ogóle pojawiły się pytania.
  const updateBanner = update.manifest ? (
    <Alert>
      <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
        <span>
          Są nowe materiały do nauki (wersja {update.manifest.version}). Pobranie nie kasuje
          postępów.
        </span>
        <Button asChild size="sm">
          <Link to="/settings">Zobacz</Link>
        </Button>
      </AlertDescription>
    </Alert>
  ) : null

  if (questions.length === 0) {
    // Ani baner o materiałach, ani o wersji aplikacji nie ma tu sensu: pierwsze
    // uruchomienie to i tak jedna wielka aktualizacja, przycisk niżej załatwia wszystko.
    const pct = downloading && downloading.total > 1 ? Math.round((downloading.done / downloading.total) * 100) : 0
    return (
      <div className="flex min-h-[80vh] flex-col">
        <div className="flex items-start justify-end gap-2 md:hidden">
          <HamburgerMenu items={[{ to: '/settings', label: 'Ustawienia' }]} />
        </div>

        <div className="flex flex-1 flex-col items-center justify-center px-4 py-10 text-center">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10">
            <Zap className="size-8 text-primary" />
          </div>

          <h1 className="mt-6 text-3xl font-bold">Elektryk Quiz</h1>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            Nauka do egzaminu zawodowego ELE.02 i ELE.05. Zanim zaczniesz, pobierz materiały —
            zajmie to chwilę i zejdzie z tego ekranu tylko raz.
          </p>

          <Card className="mt-8 w-full max-w-sm text-left">
            <CardContent className="space-y-4 pt-6">
              <FeatureRow icon={HelpCircle} text="Blisko 2000 pytań z kluczem odpowiedzi ze źródła" />
              <FeatureRow icon={ImageIcon} text="Rysunki i schematy do zadań, które ich wymagają" />
              <FeatureRow icon={VideoIcon} text="Nagrania wideo z wykładami i przykładami montażu" />
            </CardContent>
          </Card>

          <Button
            size="lg"
            className="mt-8 w-full max-w-sm"
            disabled={downloading !== null}
            onClick={() => void downloadNow()}
          >
            {downloading ? (
              downloading.total > 1 ? (
                `Pobieram… ${pct}%`
              ) : (
                downloading.label
              )
            ) : (
              <>
                <Download className="size-4" /> Pobierz materiały
              </>
            )}
          </Button>
          {downloading && downloading.total > 1 && <Progress value={pct} className="mt-3 w-full max-w-sm" />}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {appUpdateBanner}
      {updateBanner}

      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Start</h1>
          <p className="text-sm text-muted-foreground">
            {questions.length} pytań w bazie
            {daysLeft !== null && ` · do egzaminu ${daysLeft} dni`}
          </p>
        </div>
        {/* Na telefonie dolny pasek mieści pięć zakładek — reszta ekranów wchodzi stąd. */}
        <HamburgerMenu
          items={[
            { to: '/stats', label: 'Statystyki' },
            { to: '/sets', label: 'Zestawy' },
            { to: '/import', label: 'Import' },
            { to: '/settings', label: 'Ustawienia' }
          ]}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat title="Powtórki na dziś" value={due} to="/review" cta="Powtarzaj" />
        <Stat title="Pula błędów" value={counts.errorPool} to="/errors" cta="Pracuj nad błędami" />
        <Stat title="Nowe pytania" value={counts.fresh} to="/learn" cta="Ucz się" />
        <Stat title="Opanowane" value={counts.mastered} to="/stats" cta="Statystyki" />
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

function FeatureRow({
  icon: Icon,
  text
}: {
  icon: typeof Zap
  text: string
}): React.JSX.Element {
  return (
    <div className="flex items-start gap-3">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
        <Icon className="size-4 text-primary" />
      </div>
      <p className="text-sm">{text}</p>
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
