import { useMemo, useState } from 'react'
import { ExternalLink, Play } from 'lucide-react'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useStore } from '@/store'
import { categoryName } from '@shared/categories'
import { VIDEO_GROUPS, youtubeEmbed, type ContentVideo } from '@shared/content'

export default function MaterialyPage(): React.JSX.Element {
  const videos = useStore((s) => s.videos)

  const groups = useMemo(
    () =>
      VIDEO_GROUPS.map((g) => ({ ...g, videos: videos.filter((v) => v.group === g.id) })).filter(
        (g) => g.videos.length > 0
      ),
    [videos]
  )

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Materiały wideo</h1>
        <p className="text-sm text-muted-foreground">
          Nagrania odtwarzają się z YouTube — aplikacja trzyma tylko odnośniki, więc do oglądania
          potrzebny jest internet. Lista aktualizuje się razem z materiałami (Ustawienia).
        </p>
      </div>

      {groups.length === 0 && <p className="text-sm text-muted-foreground">Brak nagrań na liście.</p>}

      {/* Pierwsza zakładka rozwinięta domyślnie, żeby coś było widać od razu; reszta na klik. */}
      <Accordion type="multiple" defaultValue={[groups[0]?.id ?? '']}>
        {groups.map((g) => (
          <AccordionItem key={g.id} value={g.id}>
            <AccordionTrigger className="text-base font-medium">
              {g.label} <span className="text-muted-foreground">({g.videos.length})</span>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-1">
              {g.videos.map((video) => (
                <VideoCard key={video.id} video={video} />
              ))}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
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
            <CardDescription>
              {video.channel}
              {video.durationMin > 0 && ` · ${video.durationMin} min`}
            </CardDescription>
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
