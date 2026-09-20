import { useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import SessionRunner from '@/components/SessionRunner'
import { useStore } from '@/store'
import { categoryName } from '@shared/categories'
import { interleaveByCategory, shuffle } from '@shared/session'

export default function LearnPage(): React.JSX.Element {
  const { sets, questions } = useStore()
  const [running, setRunning] = useState(false)
  const [setIds, setSetIds] = useState<string[]>([])
  const [categories, setCategories] = useState<string[]>([])

  const pool = useMemo(
    () => questions.filter((q) => setIds.length === 0 || setIds.includes(q.setId)),
    [questions, setIds]
  )

  const available = useMemo(() => {
    const counts = new Map<string, number>()
    for (const q of pool) counts.set(q.category, (counts.get(q.category) ?? 0) + 1)
    return [...counts.entries()].sort((a, b) => categoryName(a[0]).localeCompare(categoryName(b[0]), 'pl'))
  }, [pool])

  const selected = useMemo(
    () => pool.filter((q) => categories.length === 0 || categories.includes(q.category)),
    [pool, categories]
  )

  if (running) {
    return (
      <SessionRunner
        questions={interleaveByCategory(shuffle(selected))}
        onExit={() => setRunning(false)}
      />
    )
  }

  const toggle = (list: string[], set: (v: string[]) => void, value: string): void =>
    set(list.includes(value) ? list.filter((x) => x !== value) : [...list, value])

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Nauka</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Zestawy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {sets.length === 0 && <p className="text-sm text-muted-foreground">Brak zestawów.</p>}
          {sets.map((s) => (
            <div key={s.id} className="flex items-center gap-2">
              <Checkbox
                id={`set-${s.id}`}
                checked={setIds.includes(s.id)}
                onCheckedChange={() => toggle(setIds, setSetIds, s.id)}
              />
              <Label htmlFor={`set-${s.id}`} className="font-normal">
                {s.name} <span className="text-muted-foreground">({s.count})</span>
              </Label>
            </div>
          ))}
          <p className="text-xs text-muted-foreground">Nic nie zaznaczone = wszystkie zestawy.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Kategorie</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid gap-2 sm:grid-cols-2">
            {available.map(([id, count]) => (
              <div key={id} className="flex items-center gap-2">
                <Checkbox
                  id={`cat-${id}`}
                  checked={categories.includes(id)}
                  onCheckedChange={() => toggle(categories, setCategories, id)}
                />
                <Label htmlFor={`cat-${id}`} className="font-normal">
                  {categoryName(id)} <span className="text-muted-foreground">({count})</span>
                </Label>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Nic nie zaznaczone = wszystkie kategorie.</p>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button disabled={selected.length === 0} onClick={() => setRunning(true)}>
          Zacznij naukę
        </Button>
        <Badge variant="secondary">{selected.length} pytań</Badge>
      </div>
    </div>
  )
}
