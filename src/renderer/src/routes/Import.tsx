import { useEffect, useState } from 'react'
import { Pencil, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
import FlagBadges from '@/components/FlagBadges'
import QuestionEditor from '@/components/QuestionEditor'
import { useStore } from '@/store'
import { categoryName } from '@shared/categories'
import type { ImportDraft, Question, QuestionSet } from '@shared/types'
import seedSet from '../../../../sample-data/cke-informatory.json'

type Filter = 'all' | 'flagged' | 'ai_options' | 'ai_explanation' | 'needs_image'

export default function ImportPage(): React.JSX.Element {
  const { saveSet, settings } = useStore()
  const [text, setText] = useState('')
  const [fileName, setFileName] = useState('')
  const [setName, setSetName] = useState('')
  const [estimate, setEstimate] = useState<{ chunks: number; chars: number; detectedQuestions: number } | null>(null)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [draft, setDraft] = useState<ImportDraft | null>(null)
  const [rejected, setRejected] = useState<string[]>([])
  const [editing, setEditing] = useState<Question | null>(null)
  const [filter, setFilter] = useState<Filter>('all')

  useEffect(() => window.api.importer.onProgress(setProgress), [])

  const pickFile = async (): Promise<void> => {
    const file = await window.api.importer.pickFile()
    if (!file) return
    if (file.name.endsWith('.json')) {
      const set = await window.api.importer.loadJson(file.path)
      await saveSet(set)
      toast.success(`Wczytano zestaw „${set.name}" (${set.questions.length} pytań)`)
      return
    }
    const content = await window.api.importer.extract(file.path)
    setText(content)
    setFileName(file.name)
    setSetName((n) => n || file.name.replace(/\.[^.]+$/, ''))
    setEstimate(await window.api.importer.estimate(content))
  }

  const run = async (): Promise<void> => {
    setBusy(true)
    setProgress(null)
    try {
      const id = setName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-') || `zestaw-${Date.now()}`
      const result = await window.api.importer.run(text, id, fileName || 'wklejony tekst')
      setDraft(result)
      setRejected([])
      toast.success(`Przetworzono ${result.questions.length} pytań`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  const save = async (): Promise<void> => {
    if (!draft) return
    const accepted = draft.questions.filter((q) => !rejected.includes(q.id))
    const set: QuestionSet = {
      id: draft.id,
      name: setName.trim() || draft.sourceFileName,
      createdAt: new Date().toISOString(),
      sourceFileName: draft.sourceFileName,
      categories: draft.categories,
      questions: accepted
    }
    const { added, updated } = await window.api.sets.merge(set)
    await useStore.getState().refresh()
    setDraft(null)
    setText('')
    toast.success(`Zapisano: ${added} nowych, ${updated} zaktualizowanych`)
  }

  if (draft) {
    const shown = draft.questions.filter((q) => {
      if (filter === 'flagged') return q.flags.length > 0
      if (filter === 'ai_options') return q.options.some((o) => o.source === 'ai')
      if (filter === 'ai_explanation') return q.explanation?.source === 'ai' && !q.explanation.verified
      if (filter === 'needs_image') return q.flags.includes('needs_image')
      return true
    })
    const r = draft.report

    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Przegląd przed zapisem</h1>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Raport</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              Wykryto w tekście: <strong>{r.detectedQuestions}</strong> · zwrócone przez Claude:{' '}
              <strong>{r.returnedQuestions}</strong>
            </p>
            {r.numberingGaps.length > 0 && (
              <p className="text-warning">Luki w numeracji: {r.numberingGaps.join(', ')}</p>
            )}
            {r.duplicates.length > 0 && <p>Duplikaty pominięte: {r.duplicates.length}</p>}
            {r.invalidCorrectIndexes.length > 0 && (
              <p className="text-destructive">
                Pytania bez poprawnej odpowiedzi: {r.invalidCorrectIndexes.length} — sprawdź je przed zapisem
              </p>
            )}
            {Object.entries(r.byFlag).map(([flag, n]) => (
              <p key={flag}>
                {flag}: {n}
              </p>
            ))}
            {r.failedChunks.length > 0 && (
              <Alert variant="destructive">
                <AlertDescription>
                  Nieudane paczki: {r.failedChunks.length}. {r.failedChunks[0].error}. Powtórz import —
                  gotowe paczki są w cache i nie kosztują ponownie.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-wrap gap-2">
          {(
            [
              ['all', `Wszystkie (${draft.questions.length})`],
              ['flagged', 'Z flagami'],
              ['ai_options', 'Warianty od AI'],
              ['ai_explanation', 'Wyjaśnienie od AI'],
              ['needs_image', 'Wymaga rysunku']
            ] as Array<[Filter, string]>
          ).map(([key, label]) => (
            <Button key={key} size="sm" variant={filter === key ? 'default' : 'outline'} onClick={() => setFilter(key)}>
              {label}
            </Button>
          ))}
        </div>

        <div className="space-y-2">
          {shown.map((q) => {
            const isRejected = rejected.includes(q.id)
            return (
              <Card key={q.id} className={isRejected ? 'opacity-50' : undefined}>
                <CardContent className="flex items-start gap-3 py-4">
                  <div className="flex-1 space-y-2">
                    <p className="text-sm font-medium">{q.question}</p>
                    <div className="space-y-1 text-sm">
                      {q.options.map((o) => (
                        <div key={o.id} className="flex items-center gap-2">
                          <span
                            className={
                              q.correctOptionIds.includes(o.id) ? 'font-medium text-success' : 'text-muted-foreground'
                            }
                          >
                            {o.id.toUpperCase()}. {o.text}
                          </span>
                          {o.source === 'ai' && <Sparkles className="size-3 text-muted-foreground" />}
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="outline">{categoryName(q.category)}</Badge>
                      <FlagBadges flags={q.flags} note={q.reviewNote} />
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col gap-1">
                    <Button size="sm" variant="ghost" onClick={() => setEditing(q)}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant={isRejected ? 'secondary' : 'ghost'}
                      onClick={() =>
                        setRejected((x) => (isRejected ? x.filter((id) => id !== q.id) : [...x, q.id]))
                      }
                    >
                      {isRejected ? 'Przywróć' : 'Odrzuć'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        <div className="flex gap-2">
          <Button onClick={save}>Zapisz zestaw ({draft.questions.length - rejected.length})</Button>
          <Button variant="outline" onClick={() => setDraft(null)}>
            Odrzuć wszystko
          </Button>
        </div>

        {editing && (
          <QuestionEditor
            question={editing}
            open
            onOpenChange={(o) => !o && setEditing(null)}
            onSave={(q) =>
              setDraft({ ...draft, questions: draft.questions.map((x) => (x.id === q.id ? q : x)) })
            }
          />
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Import</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Źródło</CardTitle>
          <CardDescription>
            Plik TXT, MD, CSV lub DOCX — albo wklej tekst. Gotowy zestaw .json wczytuje się bez API.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" onClick={pickFile}>
              Wybierz plik
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                await saveSet(seedSet as QuestionSet)
                toast.success(`Wczytano ${seedSet.questions.length} zadań z informatorów CKE`)
              }}
            >
              Wczytaj zadania z informatorów CKE
            </Button>
            {fileName && <Badge variant="outline">{fileName}</Badge>}
          </div>
          <Textarea
            rows={10}
            placeholder="…albo wklej tutaj listę pytań"
            value={text}
            onChange={async (e) => {
              setText(e.target.value)
              setEstimate(e.target.value ? await window.api.importer.estimate(e.target.value) : null)
            }}
          />
          <div className="space-y-2">
            <Label htmlFor="setName">Nazwa zestawu</Label>
            <Input id="setName" value={setName} onChange={(e) => setSetName(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {estimate && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Przed wysłaniem do Claude</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              {estimate.chars.toLocaleString('pl-PL')} znaków · {estimate.chunks} paczek · wykryto{' '}
              {estimate.detectedQuestions} pytań w numeracji
            </p>
            <p className="text-muted-foreground">
              Model: {settings.model} · generowanie błędnych wariantów:{' '}
              {settings.generateDistractors ? 'włączone' : 'wyłączone'}. Powtórzony import tego samego
              tekstu idzie z cache i nic nie kosztuje.
            </p>
            {busy && progress && (
              <div className="space-y-1">
                <Progress value={(progress.done / progress.total) * 100} />
                <p className="text-xs text-muted-foreground">
                  Paczka {progress.done} z {progress.total}
                </p>
              </div>
            )}
            <Button disabled={busy || !text.trim()} onClick={run}>
              {busy ? 'Przetwarzam…' : 'Uruchom import'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
