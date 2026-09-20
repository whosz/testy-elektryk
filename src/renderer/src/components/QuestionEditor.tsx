import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CATEGORIES } from '@shared/categories'
import QuestionImage from './QuestionImage'
import type { Question } from '@shared/types'

interface Props {
  question: Question
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (q: Question) => void
}

/** Ten sam edytor obsługuje przegląd po imporcie i ekran Zestawy (PLAN 6.7). */
export default function QuestionEditor({ question, open, onOpenChange, onSave }: Props): React.JSX.Element {
  const [draft, setDraft] = useState<Question>(question)

  const setOption = (id: string, text: string): void =>
    setDraft({ ...draft, options: draft.options.map((o) => (o.id === id ? { ...o, text } : o)) })

  const toggleCorrect = (id: string): void =>
    setDraft({
      ...draft,
      correctOptionIds: draft.type === 'multi_choice'
        ? draft.correctOptionIds.includes(id)
          ? draft.correctOptionIds.filter((x) => x !== id)
          : [...draft.correctOptionIds, id]
        : [id],
      answerText: draft.options.find((o) => o.id === id)?.text ?? draft.answerText
    })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edycja pytania</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Treść pytania</Label>
            <Textarea
              rows={4}
              value={draft.question}
              onChange={(e) => setDraft({ ...draft, question: e.target.value })}
            />
          </div>

          {draft.image && <QuestionImage name={draft.image} />}

          {draft.options.length > 0 && (
            <div className="space-y-2">
              <Label>Warianty — kliknij literę, aby oznaczyć poprawny</Label>
              {draft.options.map((o) => (
                <div key={o.id} className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={draft.correctOptionIds.includes(o.id) ? 'default' : 'outline'}
                    className="w-9 shrink-0"
                    onClick={() => toggleCorrect(o.id)}
                  >
                    {o.id.toUpperCase()}
                  </Button>
                  <Input value={o.text} onChange={(e) => setOption(o.id, e.target.value)} />
                  {o.source === 'ai' && <span className="shrink-0 text-xs text-muted-foreground">AI</span>}
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <Label>Poprawna odpowiedź słownie</Label>
            <Input
              value={draft.answerText}
              onChange={(e) => setDraft({ ...draft, answerText: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Wyjaśnienie</Label>
            <Textarea
              rows={3}
              value={draft.explanation?.text ?? ''}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  explanation: e.target.value
                    ? { text: e.target.value, source: draft.explanation?.source ?? 'ai', verified: draft.explanation?.verified ?? false }
                    : null
                })
              }
            />
            {draft.explanation && (
              <div className="flex items-center gap-2">
                <Switch
                  id="verified"
                  checked={draft.explanation.verified}
                  onCheckedChange={(v) =>
                    setDraft({ ...draft, explanation: { ...draft.explanation!, verified: v } })
                  }
                />
                <Label htmlFor="verified" className="font-normal">
                  Zweryfikowane — nie pokazuj etykiety AI
                </Label>
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Kategoria</Label>
              <Select value={draft.category} onValueChange={(v) => setDraft({ ...draft, category: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Trudność</Label>
              <Select
                value={String(draft.difficulty)}
                onValueChange={(v) => setDraft({ ...draft, difficulty: Number(v) as 1 | 2 | 3 })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 — łatwe</SelectItem>
                  <SelectItem value="2">2 — średnie</SelectItem>
                  <SelectItem value="3">3 — trudne</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {draft.flags.length > 0 && (
            <div className="space-y-2">
              <Label>Flagi</Label>
              <div className="flex flex-wrap gap-2">
                {draft.flags.map((f) => (
                  <Button
                    key={f}
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setDraft({ ...draft, flags: draft.flags.filter((x) => x !== f) })}
                  >
                    {f} ✕
                  </Button>
                ))}
              </div>
              {draft.reviewNote && <p className="text-xs text-muted-foreground">{draft.reviewNote}</p>}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Anuluj
          </Button>
          <Button
            onClick={() => {
              onSave(draft)
              onOpenChange(false)
            }}
          >
            Zapisz
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
