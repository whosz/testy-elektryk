import { useEffect, useState } from 'react'
import { api } from '@/api'
import { cn } from '@/lib/utils'

/** Rysunki wbudowane leżą w zasobach aplikacji, dosypane wraz z materiałami — w pamięci urządzenia. */
const bundledPath = (setId: string, name: string): string =>
  `./images/${setId === 'cke-informatory' ? 'cke' : setId}/${name}`

export default function QuestionImage({
  setId,
  name
}: {
  setId: string
  name: string
}): React.JSX.Element {
  const [src, setSrc] = useState(() => bundledPath(setId, name))
  const [zoom, setZoom] = useState(false)
  const [missing, setMissing] = useState(false)

  useEffect(() => {
    setSrc(bundledPath(setId, name))
    setMissing(false)
  }, [setId, name])

  const fallback = async (): Promise<void> => {
    const stored = await api.images.get(`${setId}/${name}`)
    if (stored) setSrc(stored)
    else setMissing(true)
  }

  if (missing) {
    return (
      <p className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
        Brak rysunku do tego zadania. Zaktualizuj materiały w Ustawieniach.
      </p>
    )
  }

  return (
    <button
      type="button"
      onClick={() => setZoom(!zoom)}
      className="block w-full overflow-hidden rounded-md border bg-white p-2"
      title={zoom ? 'Kliknij, aby zmniejszyć' : 'Kliknij, aby powiększyć'}
    >
      <img
        src={src}
        alt="Rysunek do zadania"
        onError={() => void fallback()}
        className={cn('mx-auto h-auto', zoom ? 'w-full' : 'max-h-72 w-auto')}
      />
    </button>
  )
}
