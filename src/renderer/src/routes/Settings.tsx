import { useEffect, useState } from 'react'
import { Monitor, Moon, Sun } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { api, isDesktop } from '@/api'
import { useStore } from '@/store'
import { applyTheme, readTheme, type Theme } from '@/theme'
import { applyContent, fetchManifest, prefetchAllImages, type ApplyProgress } from '@/updates'
import { downloadAndInstall, isAndroid, type DownloadProgress } from '@/appUpdate'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { DEFAULT_CONTENT_BASE } from '@shared/content'

const MODELS = [
  { id: 'claude-sonnet-5', label: 'Claude Sonnet 5 — tańszy, wystarcza do importu' },
  { id: 'claude-opus-5', label: 'Claude Opus 5 — najdokładniejszy' },
  { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5 — najtańszy' }
]

export default function SettingsPage(): React.JSX.Element {
  const { settings, setSettings, refresh } = useStore()
  const [apiKey, setApiKey] = useState('')
  const [theme, setTheme] = useState<Theme>(readTheme)
  const [applying, setApplying] = useState<ApplyProgress | null>(null)
  const [prefetching, setPrefetching] = useState<ApplyProgress | null>(null)
  const [appUpdateProgress, setAppUpdateProgress] = useState<DownloadProgress | null>(null)
  const [appUpdateNeedsPermission, setAppUpdateNeedsPermission] = useState(false)
  const {
    contentVersion,
    update,
    checkContent,
    refresh: reloadAll,
    sets,
    videos,
    appUpdate,
    checkAppUpdate
  } = useStore()
  const channels = [...new Set(videos.map((v) => v.channel).filter(Boolean))]
  const [hasKey, setHasKey] = useState(false)
  const [testing, setTesting] = useState(false)

  useEffect(() => {
    void api.settings.hasApiKey().then(setHasKey)
  }, [])

  useEffect(() => {
    // „Systemowy" ma nadążać za zmianą motywu w Windows bez restartu aplikacji
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const sync = (): void => applyTheme(theme)
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [theme])

  const startAppUpdate = async (): Promise<void> => {
    if (!appUpdate) return
    setAppUpdateNeedsPermission(false)
    try {
      const result = await downloadAndInstall(appUpdate, setAppUpdateProgress)
      setAppUpdateProgress(null)
      // system otwiera ekran zgody; po powrocie użytkownik klika ponownie
      if (result === 'needs-permission') setAppUpdateNeedsPermission(true)
    } catch (err) {
      setAppUpdateProgress(null)
      toast.error(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Ustawienia</h1>

      {appUpdate && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Aktualizacja aplikacji</CardTitle>
            <CardDescription>
              Dostępna wersja {appUpdate.version}
              {isAndroid && ` (${Math.round(appUpdate.size / 1048576)} MB)`}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {appUpdateNeedsPermission && (
              <Alert>
                <AlertDescription>
                  Android wymaga zgody na instalację spoza Sklepu Play dla tej aplikacji.
                  Otworzyliśmy ustawienia — po włączeniu zgody wróć i kliknij jeszcze raz.
                </AlertDescription>
              </Alert>
            )}
            {isAndroid ? (
              <div className="flex flex-wrap items-center gap-2">
                <Button disabled={appUpdateProgress !== null} onClick={() => void startAppUpdate()}>
                  {appUpdateProgress
                    ? appUpdateProgress.status === 'downloading'
                      ? `Pobieram… ${appUpdateProgress.pct}%`
                      : 'Otwieram instalator…'
                    : `Pobierz i zainstaluj wersję ${appUpdate.version}`}
                </Button>
                {appUpdateProgress?.status === 'downloading' && <Progress value={appUpdateProgress.pct} />}
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Windows nie ma wbudowanej instalacji — pobierz i uruchom nowy instalator ręcznie
                  ze strony wydania.
                </p>
                <Button asChild>
                  <a href={appUpdate.pageUrl} target="_blank" rel="noreferrer">
                    Otwórz stronę pobierania
                  </a>
                </Button>
              </div>
            )}
            <Button variant="ghost" size="sm" onClick={() => void checkAppUpdate()}>
              Sprawdź ponownie
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Materiały do nauki</CardTitle>
          <CardDescription>
            Pytania, rysunki i lista nagrań pobierają się z serwera. Nowe materiały nie wymagają
            instalowania aplikacji od nowa.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Masz wersję materiałów <strong>{contentVersion}</strong>.
            {update.manifest
              ? ` Dostępna jest wersja ${update.manifest.version}.`
              : ' To najnowsza wersja.'}
          </p>

          {update.error && <p className="text-sm text-destructive">{update.error}</p>}

          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" disabled={update.checking} onClick={() => void checkContent()}>
              {update.checking ? 'Sprawdzam…' : 'Sprawdź aktualizacje'}
            </Button>
            {update.manifest && (
              <Button
                disabled={applying !== null}
                onClick={async () => {
                  const manifest = update.manifest!
                  setApplying({ label: 'Start', done: 0, total: 1 })
                  try {
                    const res = await applyContent(settings.contentUrl, manifest, setApplying)
                    await reloadAll()
                    await checkContent(true)
                    toast.success(
                      `Nowych pytań: ${res.added}, zaktualizowanych: ${res.updated}, rysunków: ${res.images}`
                    )
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : String(err))
                  } finally {
                    setApplying(null)
                  }
                }}
              >
                Pobierz i zainstaluj wersję {update.manifest.version}
              </Button>
            )}
          </div>

          {applying && (
            <div className="space-y-1">
              <Progress value={applying.total ? (applying.done / applying.total) * 100 : 0} />
              <p className="text-xs text-muted-foreground">{applying.label}</p>
            </div>
          )}

          <div className="space-y-2 border-t pt-4">
            <p className="text-sm font-medium">Rysunki do zadań</p>
            <p className="text-xs text-muted-foreground">
              Domyślnie rysunek pobiera się przy pierwszym wyświetleniu pytania i zostaje
              na urządzeniu. Przed nauką bez internetu możesz ściągnąć wszystkie naraz —
              to kilkadziesiąt megabajtów, więc lepiej po wi-fi.
            </p>
            <Button
              variant="secondary"
              disabled={prefetching !== null}
              onClick={async () => {
                setPrefetching({ label: 'Sprawdzam listę', done: 0, total: 1 })
                try {
                  const manifest = await fetchManifest(settings.contentUrl)
                  const res = await prefetchAllImages(settings.contentUrl, manifest, setPrefetching)
                  toast.success(
                    `Pobrano ${res.pobrane}, było już ${res.pominiete}` +
                      (res.bledy ? `, nie udało się ${res.bledy}` : '')
                  )
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : String(err))
                } finally {
                  setPrefetching(null)
                }
              }}
            >
              {prefetching ? 'Pobieram…' : 'Pobierz wszystkie rysunki'}
            </Button>
            {prefetching && (
              <div className="space-y-1">
                <Progress value={prefetching.total ? (prefetching.done / prefetching.total) * 100 : 0} />
                <p className="text-xs text-muted-foreground">{prefetching.label}</p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="contentUrl">Adres materiałów</Label>
            <Input
              id="contentUrl"
              value={settings.contentUrl}
              onChange={(e) => void setSettings({ contentUrl: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Domyślnie repozytorium projektu. Może wskazywać dowolny serwer, który wystawia po
              HTTPS plik <code>manifest.json</code> razem z katalogami <code>sets/</code> i{' '}
              <code>images/</code>.
              {settings.contentUrl !== DEFAULT_CONTENT_BASE && (
                <>
                  {' '}
                  <button
                    className="underline underline-offset-2"
                    onClick={() => void setSettings({ contentUrl: DEFAULT_CONTENT_BASE })}
                  >
                    Przywróć domyślny
                  </button>
                </>
              )}
            </p>
          </div>

          <Toggle
            id="autoContent"
            label="Sprawdzaj aktualizacje przy uruchomieniu"
            checked={settings.autoCheckContent}
            onChange={(v) => void setSettings({ autoCheckContent: v })}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Wygląd</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {([
            ['light', 'Jasny', Sun],
            ['dark', 'Ciemny', Moon],
            ['system', 'Jak w systemie', Monitor]
          ] as Array<[Theme, string, typeof Sun]>).map(([value, label, Icon]) => (
            <Button
              key={value}
              variant={theme === value ? 'default' : 'outline'}
              onClick={() => {
                setTheme(value)
                applyTheme(value)
              }}
            >
              <Icon className="size-4" />
              {label}
            </Button>
          ))}
        </CardContent>
      </Card>

      {isDesktop && (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Klucz API Anthropic</CardTitle>
          <CardDescription>
            Szyfrowany przez Windows DPAPI, trzymany poza plikiem ustawień i poza kopią zapasową.
            Renderer nigdy go nie widzi.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              type="password"
              placeholder={hasKey ? '•••••••• (zapisany)' : 'sk-ant-…'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
            <Button
              disabled={!apiKey.trim()}
              onClick={async () => {
                await api.settings.setApiKey(apiKey.trim())
                setApiKey('')
                setHasKey(true)
                toast.success('Klucz zapisany')
              }}
            >
              Zapisz
            </Button>
            <Button
              variant="secondary"
              disabled={testing}
              onClick={async () => {
                setTesting(true)
                const res = await api.settings.testApiKey()
                setTesting(false)
                res.ok ? toast.success('Klucz działa') : toast.error(res.error ?? 'Błąd')
              }}
            >
              {testing ? 'Testuję…' : 'Testuj'}
            </Button>
          </div>
        </CardContent>
      </Card>
      )}

      {isDesktop && (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Import</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Model</Label>
            <Select value={settings.model} onValueChange={(v) => void setSettings({ model: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MODELS.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Toggle
            id="distractors"
            label="Generuj błędne warianty, gdy źródło ma tylko pytanie i odpowiedź"
            checked={settings.generateDistractors}
            onChange={(v) => void setSettings({ generateDistractors: v })}
          />
          <Button
            variant="outline"
            onClick={async () => {
              await api.importer.clearCache()
              toast.success('Cache importu wyczyszczony')
            }}
          >
            Wyczyść cache importu
          </Button>
        </CardContent>
      </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Egzamin</CardTitle>
          <CardDescription>Domyślnie jak w informatorze CKE: 40 zadań, 60 minut.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <NumberField
            label="Liczba pytań"
            value={settings.exam.questionCount}
            onChange={(v) => void setSettings({ exam: { ...settings.exam, questionCount: v } })}
          />
          <NumberField
            label="Czas (min)"
            value={settings.exam.timeLimitMin}
            onChange={(v) => void setSettings({ exam: { ...settings.exam, timeLimitMin: v } })}
          />
          <NumberField
            label="Próg zdania (%)"
            value={settings.exam.passThresholdPct}
            onChange={(v) => void setSettings({ exam: { ...settings.exam, passThresholdPct: v } })}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Nauka</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="examDate">Data egzaminu</Label>
              <Input
                id="examDate"
                type="date"
                value={settings.examDate ?? ''}
                onChange={(e) => void setSettings({ examDate: e.target.value || null })}
              />
            </div>
            <NumberField
              label="Nowych kart dziennie"
              value={settings.newCardsPerDay}
              onChange={(v) => void setSettings({ newCardsPerDay: v })}
            />
            <NumberField
              label="Seria wyjścia z puli błędów"
              value={settings.errorPoolExitStreak}
              onChange={(v) => void setSettings({ errorPoolExitStreak: v })}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Data egzaminu skraca odstępy powtórek, żeby SM-2 nie odsunął pytań za termin.
          </p>
          <Toggle
            id="shuffle"
            label="Tasuj kolejność wariantów"
            checked={settings.shuffleOptions}
            onChange={(v) => void setSettings({ shuffleOptions: v })}
          />
          <Toggle
            id="needsImage"
            label="Pomijaj na egzaminie pytania wymagające rysunku, gdy brak obrazka"
            checked={settings.excludeNeedsImageFromExam}
            onChange={(v) => void setSettings({ excludeNeedsImageFromExam: v })}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Źródła materiałów</CardTitle>
          <CardDescription>Skąd pochodzą pytania i nagrania w aplikacji.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="space-y-2">
            {sets.map((s) => (
              <div key={s.id}>
                <p className="font-medium">{s.name}</p>
                <p className="text-xs text-muted-foreground">
                  {s.count} pytań ·{' '}
                  {s.sourceFileName.startsWith('http') ? (
                    <a
                      href={s.sourceFileName}
                      target="_blank"
                      rel="noreferrer"
                      className="underline underline-offset-2"
                    >
                      {s.sourceFileName}
                    </a>
                  ) : (
                    s.sourceFileName
                  )}
                </p>
              </div>
            ))}
            {sets.length === 0 && <p className="text-muted-foreground">Brak wczytanych zestawów.</p>}
          </div>

          <p className="text-xs text-muted-foreground">
            Pytania z serwisu{' '}
            <a
              href="https://zawodowe.edu.pl/"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2"
            >
              zawodowe.edu.pl
            </a>{' '}
            wykorzystane za zgodą właściciela serwisu. Zadania z informatorów CKE pochodzą
            z dokumentów urzędowych Centralnej Komisji Egzaminacyjnej.
            {channels.length > 0 && (
              <> Nagrania odtwarzane są z YouTube z kanałów: {channels.join(', ')}.</>
            )}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Kopia zapasowa</CardTitle>
          <CardDescription>Zestawy, postępy, egzaminy i ustawienia. Bez klucza API.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            onClick={async () => {
              const path = await api.backup.exportAll()
              if (path) toast.success(`Zapisano do ${path}`)
            }}
          >
            Eksportuj
          </Button>
          <Button
            variant="outline"
            onClick={async () => {
              if (!confirm('Import kopii nadpisze obecne dane. Kontynuować?')) return
              if (await api.backup.importAll()) {
                await refresh()
                toast.success('Kopia wczytana')
              }
            }}
          >
            Importuj
          </Button>
          {isDesktop && (
            <Button variant="ghost" onClick={() => void api.app.openDataDir()}>
              Otwórz katalog danych
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function NumberField({
  label,
  value,
  onChange
}: {
  label: string
  value: number
  onChange: (v: number) => void
}): React.JSX.Element {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input
        type="number"
        min={1}
        value={value}
        onChange={(e) => {
          const n = Number(e.target.value)
          if (Number.isFinite(n) && n > 0) onChange(n)
        }}
      />
    </div>
  )
}

function Toggle({
  id,
  label,
  checked,
  onChange
}: {
  id: string
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}): React.JSX.Element {
  return (
    <div className="flex items-center gap-2">
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
      <Label htmlFor={id} className="font-normal">
        {label}
      </Label>
    </div>
  )
}
