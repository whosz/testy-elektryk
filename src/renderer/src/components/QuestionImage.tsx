import { useState } from 'react'
import { cn } from '@/lib/utils'

/** Wycinek oryginalnego zadania z informatora CKE; klik powiększa. */
export default function QuestionImage({ name }: { name: string }): React.JSX.Element {
  const [zoom, setZoom] = useState(false)
  return (
    <button
      type="button"
      onClick={() => setZoom(!zoom)}
      className="block w-full overflow-hidden rounded-md border bg-white p-2"
      title={zoom ? 'Kliknij, aby zmniejszyć' : 'Kliknij, aby powiększyć'}
    >
      <img
        src={`./images/cke/${name}`}
        alt="Rysunek do zadania z informatora CKE"
        className={cn('mx-auto h-auto', zoom ? 'w-full' : 'max-h-72 w-auto')}
      />
    </button>
  )
}
