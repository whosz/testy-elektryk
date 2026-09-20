import { useState } from 'react'
import { ExternalLink, Play } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useStore } from '@/store'
import { categoryName } from '@shared/categories'
import { youtubeEmbed, type ContentVideo } from '@shared/content'

export default function MaterialyPage(): React.JSX.Element {
  const videos = useStore((s) => s.videos)

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Materiały wideo</h1>
        <p className="text-sm text-muted-foreground">
          Nagrania odtwarzają się z YouTube — aplikacja trzyma tylko odnośniki, więc do oglądania
          potrzebny jest internet. Lista aktualizuje się razem z materiałami (Ustawienia).
        </p>
      </div>

      {videos.length === 0 && (
        <p className="text-sm text-muted-foreground">Brak nagrań na liście.</p>
      )}

      <div className="space-y-4">
        {videos.map((video) => (
          <VideoCard key={video.id} video={video} />
        ))}
      </div>
    </div>
  )
}

function VideoCard({ video }: { video: ContentVideo }): React.JSX.Element {
  // odtwarzacz wczytuje się dopiero po kliknięciu, więc samo wejście na ekran nic nie pobiera
  const [playing, setPlaying] = useState(false)

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-base">{video.title}</CardTitle>
            <CardDescription>{video.channel}</CardDescription>
          </div>
          {video.category && <Badge variant="outline">{categoryName(video.category)}</Badge>}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {video.note && <p className="text-sm text-muted-foreground">{video.note}</p>}

        {playing ? (
          <div className="aspect-video w-full overflow-hidden rounded-md border">
            <iframe
              src={youtubeEmbed(video.id)}
              title={video.title}
              className="h-full w-full"
              allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setPlaying(true)}>
              <Play className="size-4" /> Odtwórz tutaj
            </Button>
            <Button asChild variant="outline">
              <a href={video.url} target="_blank" rel="noreferrer">
                <ExternalLink className="size-4" /> Otwórz na YouTube
              </a>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
