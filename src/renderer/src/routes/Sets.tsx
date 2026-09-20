import { useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import QuestionEditor from '@/components/QuestionEditor'
import FlagBadges from '@/components/FlagBadges'
import { useStore } from '@/store'
import { categoryName } from '@shared/categories'
import type { Question } from '@shared/types'

export default function SetsPage(): React.JSX.Element {
  const { sets, questions, removeSet, resetSet, refresh } = useStore()
  const [openSet, setOpenSet] = useState<string | null>(null)
  const [editing, setEditing] = useState<Question | null>(null)
  const [filter, setFilter] = useState('')

  const saveQuestion = async (q: Question): Promise<void> => {
    const set = await window.api.sets.get(q.setId)
    await window.api.sets.save({
      ...set,
      questions: set.questions.map((old) => (old.id === q.id ? q : old))
    })
    await refresh()
    toast.success('Pytanie zapisane')
  }

  const shown = questions.filter(
    (q) =>
      q.setId === openSet &&
      (filter === '' || q.question.toLowerCase().includes(filter.toLowerCase()))
  )

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Zestawy</h1>

      {sets.length === 0 && <p className="text-sm text-muted-foreground">Brak zestawów.</p>}

      {sets.map((s) => (
        <Card key={s.id}>
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <div>
                <CardTitle className="text-base">{s.name}</CardTitle>
                <CardDescription>
                  {s.count} pytań · dodany {new Date(s.createdAt).toLocaleDateString('pl-PL')}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => setOpenSet(openSet === s.id ? null : s.id)}>
                  {openSet === s.id ? 'Zwiń' : 'Pytania'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    await resetSet(s.id)
                    toast.success('Postępy wyzerowane')
                  }}
                >
                  Reset postępów
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={async () => {
                    if (!confirm(`Usunąć zestaw „${s.name}" i wszystkie jego pytania?`)) return
                    await removeSet(s.id)
                    toast.success('Zestaw usunięty')
                  }}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          </CardHeader>

          {openSet === s.id && (
            <CardContent className="space-y-3">
              <Input placeholder="Szukaj w pytaniach…" value={filter} onChange={(e) => setFilter(e.target.value)} />
              <div className="space-y-2">
                {shown.map((q) => (
                  <div key={q.id} className="flex items-start gap-2 border-b pb-2 text-sm last:border-0">
                    <div className="flex-1 space-y-1">
                      <p>{q.question.split('\n')[0]}</p>
                      <div className="flex flex-wrap gap-1">
                        <Badge variant="outline">{categoryName(q.category)}</Badge>
                        <FlagBadges flags={q.flags} note={q.reviewNote} />
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => setEditing(q)}>
                      <Pencil className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      ))}

      {editing && (
        <QuestionEditor
          question={editing}
          open
          onOpenChange={(o) => !o && setEditing(null)}
          onSave={(q) => void saveQuestion(q)}
        />
      )}
    </div>
  )
}
