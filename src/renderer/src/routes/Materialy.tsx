import { useMemo, useState } from 'react'
import { ExternalLink, FileText, Play } from 'lucide-react'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useStore } from '@/store'
import { joinUrl } from '@/updates'
import { categoryName } from '@shared/categories'
import { VIDEO_GROUPS, youtubeEmbed, type ContentPdf, type ContentVideo } from '@shared/content'

export default function MaterialyPage(): React.JSX.Element {
  const videos = useStore((s) => s.videos)
  const pdfs = useStore((s) => s.pdfs)
  const contentUrl = useStore((s) => s.settings.contentUrl)

  const groups = useMemo(() => {
    const videoGroups = VIDEO_GROUPS.map((g) => ({
      id: g.id,
      label: g.label,
      count: videos.filter((v) => v.group === g.id).length,
      render: () => (
        <div className="space-y-4">
          {videos
            .filter((v) => v.group === g.id)
            .map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
        </div>
      )
    }))
    const pdfGroup = {
      id: 'pdf',
      label: 'Dokumenty PDF',
      count: pdfs.length,
      render: () => (
        <div className="space-y-4">
          {pdfs.map((pdf) => (
            <PdfCard key={pdf.id} pdf={pdf} baseUrl={contentUrl} />
          ))}
        </div>
      )
    }
    return [...videoGroups, pdfGroup].filter((g) => g.count > 0)
  }, [videos, pdfs, contentUrl])

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Materiały</h1>
        <p className="text-sm text-muted-foreground">
          Nagrania odtwarzają się z YouTube, dokumenty PDF otwierają się w przeglądarce — aplikacja
          trzyma tylko odnośniki, więc do otwarcia potrzebny jest internet. Lista aktualizuje się
          razem z materiałami (Ustawienia).
        </p>
      </div>

      {groups.length === 0 && <p className="text-sm text-muted-foreground">Brak materiałów na liście.</p>}

      {/* Pierwsza zakładka rozwinięta domyślnie, żeby coś było widać od razu; reszta na klik. */}
      <Accordion type="multiple" defaultValue={[groups[0]?.id ?? '']}>
        {groups.map((g) => (
          <AccordionItem key={g.id} value={g.id}>
            <AccordionTrigger className="text-base font-medium">
              {/* Jeden element, nie dwa — inaczej justify-between na triggerze rozsuwa
                  tytuł i licznik do przeciwnych krańców zamiast trzymać je razem. */}
              <span>
                {g.label} <span className="text-muted-foreground">({g.count})</span>
              </span>
            </AccordionTrigger>
            <AccordionContent className="pt-1">{g.render()}</AccordionContent>
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

function PdfCard({ pdf, baseUrl }: { pdf: ContentPdf; baseUrl: string }): React.JSX.Element {
  // pdf.url to ścieżka względem content-servera (jak rysunki), nie gotowy link jak w wideo
  const href = joinUrl(baseUrl, pdf.url)
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-base">{pdf.title}</CardTitle>
            <CardDescription>
              {pdf.author}
              {pdf.sizeMB > 0 && ` · ${pdf.sizeMB} MB`}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {pdf.note && <p className="text-sm text-muted-foreground">{pdf.note}</p>}
        <Button asChild>
          <a href={href} target="_blank" rel="noreferrer">
            <FileText className="size-4" /> Otwórz PDF
          </a>
        </Button>
      </CardContent>
    </Card>
  )
}
