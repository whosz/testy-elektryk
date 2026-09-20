import { Badge } from '@/components/ui/badge'
import type { QuestionFlag } from '@shared/types'

const LABELS: Record<QuestionFlag, string> = {
  answer_suspect: 'Odpowiedź do sprawdzenia',
  ambiguous: 'Niejednoznaczne',
  needs_image: 'Wymaga rysunku',
  incomplete_source: 'Niepełne źródło'
}

export default function FlagBadges({
  flags,
  note
}: {
  flags: QuestionFlag[]
  note?: string
}): React.JSX.Element | null {
  if (flags.length === 0) return null
  return (
    <>
      {flags.map((f) => (
        <Badge
          key={f}
          variant={f === 'answer_suspect' ? 'destructive' : 'outline'}
          title={note || undefined}
        >
          {LABELS[f]}
        </Badge>
      ))}
    </>
  )
}
