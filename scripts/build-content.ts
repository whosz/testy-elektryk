/**
 * Składa paczkę materiałów wystawianą po HTTPS: pytania, rysunki i listę nagrań.
 * Aplikacja pobiera ją i dosypuje do lokalnej bazy, więc nowe treści nie wymagają
 * wydawania nowego .exe ani .apk.
 *
 *   npm run content
 *
 * Wersja rośnie tylko wtedy, gdy zawartość faktycznie się zmieniła — inaczej
 * użytkownicy dostawaliby powiadomienie o aktualizacji bez powodu.
 */
import { createHash } from 'crypto'
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'fs'
import { resolve } from 'path'
import { ContentManifestSchema, type ContentManifest } from '../src/shared/content'
import { BUNDLED_VIDEOS } from '../src/shared/videos'
import { BUNDLED_PDFS } from '../src/shared/pdfs'
import { QuestionSetSchema } from '../src/shared/schema'

const ROOT = resolve(__dirname, '..')
const OUT = resolve(ROOT, 'content')
const SETS = [
  // wbudowany w aplikację: rysunki leżą w zasobach renderera
  { id: 'cke-informatory', source: 'sample-data/cke-informatory.json', images: 'src/renderer/public/images/cke' },
  // dostarczane wyłącznie aktualizacją materiałów
  { id: 'zawodowe-ele02', source: 'sample-data/zawodowe-ele02.json', images: 'sample-data/images/zawodowe-ele02' },
  { id: 'zawodowe-ele05', source: 'sample-data/zawodowe-ele05.json', images: 'sample-data/images/zawodowe-ele05' }
]

// Surowe pliki leżą lokalnie w database/materialy/ (poza gitem — za duże, żeby
// trzymać je w dwóch miejscach) i stąd trafiają do content/pdfs/ pod krótkim ID.
const PDFS = [
  {
    id: 'praktyczny-start-elektryka',
    source: 'database/materialy/Ebook- Praktyczny start elektryka - Elektrotechniczni.pl.pdf'
  },
  {
    id: 'symbole-graficzne-pn-en-60617',
    source: 'database/materialy/RT4_Zalacznik_ELEKTRYKA_Symbole_graficzne-_wg_PN-EN-60617.pdf'
  }
]

function main(): void {
  const previous: ContentManifest | null = existsSync(resolve(OUT, 'manifest.json'))
    ? ContentManifestSchema.parse(JSON.parse(readFileSync(resolve(OUT, 'manifest.json'), 'utf8')))
    : null

  rmSync(resolve(OUT, 'sets'), { recursive: true, force: true })
  rmSync(resolve(OUT, 'images'), { recursive: true, force: true })
  rmSync(resolve(OUT, 'pdfs'), { recursive: true, force: true })
  mkdirSync(resolve(OUT, 'sets'), { recursive: true })

  const hash = createHash('sha256')
  const sets: ContentManifest['sets'] = []

  for (const entry of SETS) {
    const raw = readFileSync(resolve(ROOT, entry.source), 'utf8')
    const set = QuestionSetSchema.parse(JSON.parse(raw))
    writeFileSync(resolve(OUT, 'sets', `${entry.id}.json`), raw)
    hash.update(raw)

    const imageDir = resolve(ROOT, entry.images)
    if (!existsSync(resolve(ROOT, entry.source))) {
      console.log(`  pomijam ${entry.id}: brak ${entry.source}`)
      continue
    }
    // serwis podaje rysunki w kilku formatach; filtr na samo .png gubił po cichu pliki webp
    const IMAGE_EXT = /\.(png|jpe?g|webp)$/i
    const images = existsSync(imageDir) ? readdirSync(imageDir).filter((f) => IMAGE_EXT.test(f)) : []
    if (images.length) {
      mkdirSync(resolve(OUT, 'images', entry.id), { recursive: true })
      for (const img of images.sort()) {
        const from = resolve(imageDir, img)
        copyFileSync(from, resolve(OUT, 'images', entry.id, img))
        hash.update(img)
        hash.update(readFileSync(from))
      }
    }

    sets.push({
      id: set.id,
      name: set.name,
      file: `sets/${entry.id}.json`,
      questions: set.questions.length,
      images
    })
  }

  const pdfs: ContentManifest['pdfs'] = []
  for (const entry of PDFS) {
    const from = resolve(ROOT, entry.source)
    if (!existsSync(from)) {
      console.log(`  pomijam PDF ${entry.id}: brak pliku ${entry.source}`)
      continue
    }
    mkdirSync(resolve(OUT, 'pdfs'), { recursive: true })
    const to = resolve(OUT, 'pdfs', `${entry.id}.pdf`)
    copyFileSync(from, to)
    hash.update(readFileSync(from))

    const meta = BUNDLED_PDFS.find((p) => p.id === entry.id)
    pdfs.push({
      id: entry.id,
      title: meta?.title ?? entry.id,
      author: meta?.author ?? '',
      url: `pdfs/${entry.id}.pdf`,
      // rzeczywisty rozmiar pliku, nie ręcznie wpisana liczba w pdfs.ts
      sizeMB: Math.round((statSync(to).size / 1048576) * 10) / 10,
      note: meta?.note ?? ''
    })
  }

  hash.update(JSON.stringify(BUNDLED_VIDEOS))
  const fingerprint = hash.digest('hex').slice(0, 16)

  // odcisk trzymamy poza manifestem porównywanym przez aplikację
  const stampFile = resolve(OUT, '.fingerprint')
  const previousStamp = existsSync(stampFile) ? readFileSync(stampFile, 'utf8').trim() : ''
  const changed = previousStamp !== fingerprint
  const version = previous ? (changed ? previous.version + 1 : previous.version) : 1

  const manifest: ContentManifest = {
    version,
    updatedAt: changed || !previous ? new Date().toISOString() : previous.updatedAt,
    sets,
    videos: BUNDLED_VIDEOS,
    pdfs
  }

  writeFileSync(resolve(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2))
  writeFileSync(stampFile, fingerprint)

  console.log(`Materiały wersja ${version}${changed ? ' (zawartość się zmieniła)' : ' (bez zmian)'}`)
  for (const s of sets) console.log(`  ${s.id}: ${s.questions} pytań, ${s.images.length} rysunków`)
  console.log(`  nagrania: ${manifest.videos.length}`)
  console.log(`  pdf: ${manifest.pdfs.length}`)
}

main()
