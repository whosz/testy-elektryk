import { useEffect, useState } from 'react'
import { api } from '@/api'
import { cn } from '@/lib/utils'
import { useStore } from '@/store'
import { fetchImage } from '@/updates'

const mimeOf = (name: string): string => {
  const ext = name.split('.').pop()?.toLowerCase()
  return ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'webp' ? 'image/webp' : 'image/png'
}

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
  const contentUrl = useStore((s) => s.settings.contentUrl)
  const [src, setSrc] = useState(() => bundledPath(setId, name))
  const [zoom, setZoom] = useState(false)
  const [missing, setMissing] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setSrc(bundledPath(setId, name))
    setMissing(false)
  }, [setId, name])

  /**
   * Kolejno: rysunek wbudowany w aplikację, zapisany wcześniej na urządzeniu,
   * a na końcu pobrany z serwera materiałów i od razu zapamiętany — dzięki temu
   * duże zestawy nie muszą ciągnąć setek ilustracji przy aktualizacji.
   */
  const fallback = async (): Promise<void> => {
    const stored = await api.images.get(`${setId}/${name}`)
    if (stored) {
      setSrc(stored)
      return
    }
    setLoading(true)
    const b64 = await fetchImage(contentUrl, setId, name)
    setLoading(false)
    if (b64) setSrc(`data:${mimeOf(name)};base64,${b64}`)
    else setMissing(true)
  }

  if (missing) {
    return (
      <p className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
        Nie udało się pobrać rysunku. Sprawdź połączenie albo pobierz rysunki hurtem
        w Ustawieniach.
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
        className={cn('mx-auto h-auto', zoom ? 'w-full' : 'max-h-72 w-auto', loading && 'opacity-40')}
      />
    </button>
  )
}
