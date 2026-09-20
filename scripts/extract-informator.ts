/**
 * Wyciąga przykładowe zadania z informatorów CKE (database/info/*.pdf) do zestawu pytań
 * razem z rysunkami. Klucz odpowiedzi pochodzi wprost z informatora — żadnego AI.
 *
 * Rysunek to wycinek strony między nagłówkiem „Przykładowe zadanie" a linią
 * „Odpowiedź prawidłowa", więc klucz nigdy nie wchodzi w kadr. Współrzędne z
 * `pdftotext -bbox-layout`, renderowanie przez `pdftoppm` z opcjami kadrowania.
 *
 * Wymaga poppler-utils (pdftotext, pdftoppm). Uruchamiane raz; wynik leży w repo.
 *   npm run seed
 */
import { execFileSync } from 'child_process'
import { mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'fs'
import { resolve } from 'path'
import { questionId } from '../src/shared/ids'
import { CATEGORIES } from '../src/shared/categories'
import type { Option, Question, QuestionFlag, QuestionSet } from '../src/shared/types'

const ROOT = resolve(__dirname, '..')
const IMAGE_DIR = resolve(ROOT, 'src/renderer/public/images/cke')
const DPI = 120
const SCALE = DPI / 72

const KEYWORDS: Array<[string, RegExp]> = [
  ['PP', /pierwsz\w+ pomoc|poszkodowan|reanimac|oparzen|krwotok|porażeni\w+ prądem.*(przytomn|nieprzytomn)/i],
  ['BHP', /bhp|środk\w+ ochrony (indywidualnej|zbiorowej)|uziemiacz|polecenie pisemne|strefa pracy|gaśnic|ochrony przeciwpożarow|ergonomi/i],
  ['POZ', /przeciwporażeniow|różnicowoprądow|pętli zwarcia|uziom|połączeni\w+ wyrównawcz|klas\w+ ochronności|samoczynne wyłączenie|rezystancj\w+ uziemienia/i],
  ['POM', /pomiar|miernik|mierzy|rezystancj\w+ izolacji|przyrząd\w* pomiarow|protokoł\w* z pomiar|megaomomierz|watomierz|oscyloskop|amperomierz|woltomierz/i],
  ['ZAB', /zabezpiecz|wyłącznik\w* nadprądow|bezpiecznik|charakterystyk\w* [BCD]\b|przeciwprzepięciow|ogranicznik przepięć|selektywn/i],
  ['MASZ', /silnik|transformator|prądnic|generator|maszyn\w+ (indukcyjn|synchroniczn|prądu stałego)|tabliczk\w+ znamionow|łożysk|uzwojeni|wirnik|stojan|komutator/i],
  ['URZ', /stycznik|przekaźnik|falownik|sterownik plc|gwiazda\W*trójkąt|kompensacj\w+ mocy biernej|wyłącznik silnikow|instalacj\w+ inteligentn/i],
  ['OSW', /oprawa oświetleniow|oprawę oświetleniow|opraw oświetleniow|źródł\w+ światła|żarówk|świetlówk|natężeni\w+ oświetlenia|strumień świetlny/i],
  ['OSPRZ', /narzędzi|ściągani\w+ powłok|zaciskani\w+ końcówek|puszk|listw\w+ instalacyjn|stopień ochrony ip|gniazd\w+ wtyczkow|łącznik\w+ (jednobiegunow|schodow|świecznikow)|szczypc|wkrętak/i],
  ['SCH', /symbol\w* graficzn|schemat\w* (ideow|montażow|blokow)|rysunk\w+ techniczn|dokumentacj\w+ techniczn/i],
  ['INST', /instalacj|przewód|przewod|kabl|układ\w* (tn|tt|it)\b|wlz|rozdzielnic|przekrój żyły|obciążalnoś|spadek napięcia/i],
  ['ELN', /diod|tranzystor|tyrystor|termistor|zener|przekształtnik|prostownik|układ scalon/i],
  ['EKSP', /eksploatacj|konserwacj|oględzin|przegląd\w* okresow|termin\w* badań|usuni\w+ usterk|naprawa|modernizacj/i],
  ['JOZ', /\b(the|is|are|which|what|circuit|switch|wire|voltage|cable|tool|der|die|das|ist|welche|eine)\b/i],
  ['ORG', /zespoł|etyk\w+ zawodow|negocjac|podział ról|harmonogram|planowani\w+ pracy|odpowiedzialnoś/i],
  ['PE', /rezystancj|napięci|natężeni|moc (czynn|biern|pozorn)|prawo (ohma|kirchhoffa)|kondensator|cewk|impedancj|obwod|trójfazow|przekładnik/i]
]

const UNIT_FALLBACK: Record<string, string> = {
  '1': 'BHP', '2': 'PE', '3': 'INST', '4': 'MASZ', '5': 'JOZ', '6': 'ORG', '7': 'ORG'
}

/**
 * Jednostka efektów kształcenia ze źródła jest pewniejsza niż zgadywanie po słowach:
 * .5 to zawsze język obcy zawodowy, .6 i .7 to zawsze organizacja pracy.
 * Słowa kluczowe rozstrzygają tylko wewnątrz jednostek, które mieszczą wiele kategorii.
 */
function classify(text: string, unit: string): string {
  const sub = unit.split('.')[2] ?? ''
  if (sub === '5') return 'JOZ'
  if (sub === '6' || sub === '7') return 'ORG'
  for (const [id, re] of KEYWORDS) if (re.test(text)) return id
  return UNIT_FALLBACK[sub] ?? 'PE'
}

const MENTIONS_FIGURE =
  /\b(na rysunku|rysunek|rysunkach|przedstawion\w+|schemacie|schemat\w*|na filmie|w tabeli|na zdjęciu|na fotografii|wykres|shown in the (picture|figure)|in the picture|dargestellt\w*|auf dem Bild|im Bild|abgebildet\w*)/i

/** Pozycja zadania na stronie: skąd dokąd ciąć rysunek. */
interface Anchor {
  page: number
  yTop: number
  yBottom: number
  pageHeight: number
  /** Prostokąty linii tekstu w obrębie zadania — rysunek to miejsce, którego nie zajmuje tekst. */
  lines: Array<{ xMin: number; yMin: number; xMax: number; yMax: number; text: string }>
}

interface Box {
  x: number
  y: number
  w: number
  h: number
}

const PAGE_LEFT = 38
const PAGE_RIGHT = 558

/**
 * Rysunek to największy prostokąt w obrębie zadania, którego nie zajmuje tekst:
 * pod tekstem, obok niego albo wciśnięty między wiersze. Dzięki temu karta nie
 * powtarza treści, którą i tak pokazuje tekstem.
 */
function figureBoxes(a: Anchor): Box[] {
  const full: Box = { x: PAGE_LEFT, y: a.yTop, w: PAGE_RIGHT - PAGE_LEFT, h: a.yBottom - a.yTop - 4 }
  // Podpisy wewnątrz rysunku (L1, PE, M, oznaczenia zacisków) są krótkie i bywają przy
  // lewym marginesie. Liczone jak tekst rozcinały schemat na pół, więc za tekst uznajemy
  // tylko wiersze szerokie albo zaczynające się od litery wariantu.
  const isProse = (l: { xMin: number; xMax: number; text: string }): boolean =>
    l.xMin < 160 && (l.xMax - l.xMin > 200 || /^[A-D]\.(\s|$)/.test(l.text))
  const lines = a.lines
    .filter((l) => l.yMin >= a.yTop - 2 && l.yMax <= a.yBottom + 2 && isProse(l))
    .sort((p, q) => p.yMin - q.yMin)
  if (lines.length === 0) return [full]

  const candidates: Box[] = []

  // poziome pasy wolne od tekstu, łącznie z przerwą między wierszami
  let cursor = a.yTop
  for (const line of lines) {
    if (line.yMin - cursor > 0) {
      candidates.push({ x: PAGE_LEFT, y: cursor + 2, w: PAGE_RIGHT - PAGE_LEFT, h: line.yMin - cursor - 4 })
    }
    cursor = Math.max(cursor, line.yMax)
  }
  candidates.push({ x: PAGE_LEFT, y: cursor + 2, w: PAGE_RIGHT - PAGE_LEFT, h: a.yBottom - cursor - 6 })

  // Pas z prawej strony wariantów. Granicę wyznacza koniec treści pytania, a nie ostatni
  // szeroki wiersz — wariant bywa dłuższy od pytania i wtedy kadr ucinał pół schematu.
  const inBand = a.lines.filter((l) => l.yMin >= a.yTop - 2 && l.yMax <= a.yBottom + 2)
  const firstOption = inBand
    .filter((l) => l.xMin < 160 && /^[A-D]\.(\s|$)/.test(l.text))
    .sort((p, q) => p.yMin - q.yMin)[0]
  const questionEnd = firstOption
    ? Math.max(a.yTop, ...inBand.filter((l) => l.yMin < firstOption.yMin).map((l) => l.yMax))
    : ([...lines].reverse().find((l) => l.xMax - l.xMin > 200)?.yMax ?? a.yTop)
  // tylko kolumna wariantów po lewej; podpisy wewnątrz rysunku stoją dalej w prawo
  const narrow = inBand.filter((l) => l.yMin >= questionEnd && l.xMin < 250)
  const belowProse = questionEnd
  const textRight = narrow.length ? Math.max(...narrow.map((l) => l.xMax)) : PAGE_LEFT
  candidates.push({
    x: textRight + 6,
    y: belowProse + 2,
    w: PAGE_RIGHT - textRight - 6,
    h: a.yBottom - belowProse - 6
  })

  const usable = (b: Box): number => (b.w >= 70 && b.h >= 45 ? b.w * b.h : 0)
  return candidates
    .filter((b) => usable(b) > 0)
    .sort((p, q) => usable(q) - usable(p))
    .slice(0, 3)
}

function readAnchors(pdf: string): Anchor[] {
  const xml = execFileSync('pdftotext', ['-bbox-layout', pdf, '-'], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024
  })

  const anchors: Anchor[] = []
  let page = 0
  let pageHeight = 842
  let pendingTop: { page: number; y: number; h: number } | null = null
  let lines: Anchor['lines'] = []
  const pageLines = new Map<number, Anchor['lines']>()

  // <line ...>…</line> niesie współrzędne całej linii, a to wystarcza do kadrowania.
  const token = /<page width="([\d.]+)" height="([\d.]+)"|<line xMin="[\d.]+" yMin="([\d.]+)" xMax="[\d.]+" yMax="([\d.]+)">([\s\S]*?)<\/line>/g
  let m: RegExpExecArray | null
  while ((m = token.exec(xml))) {
    if (m[2]) {
      page++
      pageHeight = Number(m[2])
      lines = []
      pageLines.set(page, lines)
      continue
    }
    const text = m[5].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    if (text) {
      lines.push({
        xMin: Number(/xMin="([\d.]+)"/.exec(m[0])![1]),
        yMin: Number(m[3]),
        xMax: Number(/xMax="([\d.]+)"/.exec(m[0])![1]),
        yMax: Number(m[4]),
        text
      })
    }
    if (/^Przykładowe zadanie/.test(text)) {
      if (pendingTop) {
        // poprzednie zadanie nie miało klucza na swojej stronie — tnij do dołu strony
        anchors.push({ page: pendingTop.page, yTop: pendingTop.y, yBottom: pendingTop.h - 40, pageHeight: pendingTop.h, lines: pageLines.get(pendingTop.page) ?? [] })
      }
      pendingTop = { page, y: Number(m[4]), h: pageHeight }
    } else if (/^Odpowiedź prawidłowa/.test(text) && pendingTop) {
      anchors.push({
        page: pendingTop.page,
        yTop: pendingTop.y,
        // klucz na następnej stronie → tnij do dołu strony, na której zaczęło się zadanie
        yBottom: page === pendingTop.page ? Number(m[3]) : pendingTop.h - 40,
        pageHeight: pendingTop.h,
        lines: pageLines.get(pendingTop.page) ?? []
      })
      pendingTop = null
    }
  }
  if (pendingTop) {
    anchors.push({ page: pendingTop.page, yTop: pendingTop.y, yBottom: pendingTop.h - 40, pageHeight: pendingTop.h, lines: pageLines.get(pendingTop.page) ?? [] })
  }
  return anchors
}

interface Raw {
  unit: string
  question: string
  options: string[]
  /** Warianty to same rysunki — w tekście zostają puste. */
  pictorial: boolean
  correct: number
  extras: string[]
}

/** Jeden rekord na każde „Przykładowe zadanie", żeby kotwice i zadania szły parami. */
function parse(text: string): Raw[] {
  const out: Raw[] = []
  for (const block of text.split(/Jednostka efektów kształcenia:/).slice(1)) {
    const unitMatch = block.match(/(ELE\.\d+\.\d+)\.\s*([^\n]+)/)
    const answerMatch = block.match(/Odpowiedź prawidłowa:\s*([A-D])/)
    const taskIdx = block.search(/Przykładowe zadanie/)
    if (!unitMatch || !answerMatch || taskIdx < 0) continue

    const body = block.slice(taskIdx).replace(/Przykładowe zadanie/, '')
    const questionLines: string[] = []
    const options: string[] = []
    const extras: string[] = []
    let seenOption = false
    let pictorial = false
    let lastLetter = ''
    let cycleDone = false

    for (const line of body.split('\n')) {
      if (/Odpowiedź prawidłowa:/.test(line)) break

      // wiersz „A.      B.      C.      D." = warianty są rysunkami
      if (/^\s*A\.\s+B\.\s+C\.\s+D\.\s*$/.test(line.replace(/\s+/g, ' ').trim())) {
        pictorial = true
        seenOption = true
        continue
      }

      const opt = line.match(/^(\s*)([A-D])\.(?:\s|$)(.*)$/)
      if (opt) {
        seenOption = true
        // Zadania z języka zawodowego powtarzają warianty w drugim języku od nowa
        // („A. Time relay." … „A. Zeitrelais."). Bierzemy pierwszy cykl, reszta to kontekst.
        if (opt[2] <= lastLetter) cycleDone = true
        lastLetter = opt[2]

        // -layout wkleja sąsiednią kolumnę po dużym odstępie; pierwszy NIEPUSTY segment
        // to treść wariantu (liczby typu „A.    1 150 W" wypadały wcześniej jako puste)
        const segments = opt[3].split(/\s{4,}/).map((x) => x.trim())
        const first = segments.find(Boolean) ?? ''
        if (cycleDone) {
          if (first) extras.push(`${opt[2]}. ${segments.filter(Boolean).join(' ')}`)
          continue
        }
        if (/^[A-D]\.?$/.test(first)) {
          pictorial = true
          continue
        }
        options.push(first)
        extras.push(...segments.filter((x) => x && x !== first))
        continue
      }

      const clean = line.replace(/\s{4,}/g, ' ').trim()
      if (!clean || /^\d+$/.test(clean)) continue

      // Krótki, głęboko wcięty wiersz przed wariantami to licznik ułamka piętrowego
      // albo komórka tabeli. Płaski tekst takiego układu nie odda, więc zadanie
      // musi iść ścieżką obrazkową, inaczej warianty wyjdą poprzestawiane.
      if (!seenOption && clean.length < 20 && /^\s{8,}\S/.test(line)) {
        pictorial = true
        continue
      }

      // Wariant zawinięty do drugiego wiersza jest wcięty tylko trochę głębiej niż litera
      // wariantu. Głębsze wcięcie to osobna ramka stojąca obok wariantów (np. tabelka
      // z danymi) — tamta należy do kontekstu pytania, nie do wariantu.
      if (!cycleDone && options.length > 0 && /^\s{5,20}\S/.test(line) && !/^\s*[A-D]\.\s/.test(line)) {
        options[options.length - 1] = `${options[options.length - 1]} ${clean}`.replace(/\s+/g, ' ')
        continue
      }

      if (seenOption) extras.push(clean)
      else questionLines.push(clean)
    }

    // Wzory piętrowe i tabele wielokolumnowe gubią się w płaskim tekście — poznajemy to
    // po wariantach, które wyszły puste albo identyczne. Wtedy jedynym wiarygodnym
    // nośnikiem treści jest wycinek strony, więc zadanie idzie ścieżką obrazkową.
    const distinct = new Set(options.map((o) => o.toLowerCase()))
    if (!pictorial && (options.length !== 4 || options.some((o) => !o) || distinct.size !== 4)) {
      pictorial = true
    }

    out.push({
      unit: unitMatch[1],
      question: questionLines.join(' ').replace(/\s+/g, ' ').trim(),
      options: pictorial ? [] : options,
      pictorial,
      correct: 'ABCD'.indexOf(answerMatch[1]),
      extras
    })
  }
  return out
}

function renderCrop(pdf: string, anchor: Anchor, box: Box, outBase: string): string | null {
  const x = Math.round(box.x * SCALE)
  const y = Math.round(box.y * SCALE)
  const w = Math.round(box.w * SCALE)
  const h = Math.round(box.h * SCALE)
  if (h < 40 || w < 60) return null
  execFileSync('pdftoppm', [
    '-png', '-r', String(DPI),
    '-f', String(anchor.page), '-l', String(anchor.page),
    '-x', String(x), '-y', String(y), '-W', String(w), '-H', String(h),
    pdf, outBase
  ])
  const dir = resolve(outBase, '..')
  const base = outBase.split('/').pop()!
  const made = readdirSync(dir).find((f) => f.startsWith(base) && f.endsWith('.png'))
  return made ? `${dir}/${made}` : null
}

function toQuestion(raw: Raw, setId: string, now: string, image: string | null): Question {
  const letters = ['a', 'b', 'c', 'd']
  const options: Option[] = raw.pictorial
    ? letters.map((id) => ({ id, text: `Wariant ${id.toUpperCase()} (patrz rysunek)`, source: 'original' as const }))
    : raw.options.map((text, i) => ({ id: letters[i], text, source: 'original' as const }))

  const extra = raw.extras.filter((e) => e.length > 3).join(' ')
  const question = extra ? `${raw.question}\n\n${extra}` : raw.question
  const category = classify(`${raw.question} ${raw.options.join(' ')}`, raw.unit)

  // Flaga zostaje tylko wtedy, gdy zadanie odsyła do materiału, którego nie udało się wyciąć.
  const flags: QuestionFlag[] = !image && (raw.pictorial || MENTIONS_FIGURE.test(raw.question)) ? ['needs_image'] : []

  return {
    id: questionId(raw.question),
    setId,
    sourceNumber: '',
    type: 'single_choice',
    question,
    options,
    correctOptionIds: [letters[raw.correct]],
    answerText: raw.pictorial ? `Wariant ${'ABCD'[raw.correct]} (patrz rysunek)` : raw.options[raw.correct],
    explanation: null,
    category,
    unit: raw.unit,
    difficulty: 2,
    flags,
    reviewNote: flags.length ? 'Zadanie odsyła do materiału, którego nie ma w pliku źródłowym.' : '',
    image,
    createdAt: now
  }
}

function main(): void {
  const sources = [
    { file: 'database/info/Elektryk.pdf', label: 'Elektryk (ELE.02)' },
    { file: 'database/info/Technik_elektryk.pdf', label: 'Technik elektryk (ELE.02 + ELE.05)' }
  ]
  const now = new Date().toISOString()
  const setId = 'cke-informatory'
  const seen = new Set<string>()
  const questions: Question[] = []
  const tmp = resolve(ROOT, 'node_modules/.cache/cke')

  rmSync(IMAGE_DIR, { recursive: true, force: true })
  mkdirSync(IMAGE_DIR, { recursive: true })
  rmSync(tmp, { recursive: true, force: true })
  mkdirSync(tmp, { recursive: true })

  for (const src of sources) {
    const pdf = resolve(ROOT, src.file)
    const text = execFileSync('pdftotext', ['-layout', pdf, '-'], {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024
    })
    const parsed = parse(text)
    const anchors = readAnchors(pdf)
    if (parsed.length !== anchors.length) {
      throw new Error(`${src.label}: ${parsed.length} zadań, ale ${anchors.length} kotwic — parowanie by się rozjechało`)
    }

    let added = 0
    for (let i = 0; i < parsed.length; i++) {
      const raw = parsed[i]
      const id = questionId(raw.question)
      if (seen.has(id)) continue
      seen.add(id)

      // Wycinek tylko tam, gdzie zadanie bez niego nie działa — inaczej obrazek
      // powtarzałby treść, którą karta i tak pokazuje tekstem.
      let image: string | null = null
      if (raw.pictorial || MENTIONS_FIGURE.test(raw.question)) {
        const a = anchors[i]
        // warianty na rysunkach muszą zachować podpisy A-D, więc tam tniemy całe zadanie
        const boxes: Box[] = raw.pictorial
          ? [{ x: PAGE_LEFT, y: a.yTop, w: PAGE_RIGHT - PAGE_LEFT, h: a.yBottom - a.yTop - 4 }]
          : figureBoxes(a)

        // Który prostokąt jest naprawdę rysunkiem, poznajemy po zawartości: renderujemy
        // kandydatów i bierzemy ten z największym plikiem. Pusty margines kompresuje się
        // niemal do zera, schemat czy zdjęcie nie.
        let bestFile = ''
        let bestSize = 0
        for (let b = 0; b < boxes.length; b++) {
          const rendered = renderCrop(pdf, a, boxes[b], `${tmp}/q${i}_${b}`)
          if (!rendered) continue
          const size = statSync(rendered).size
          if (size > bestSize) {
            bestSize = size
            bestFile = rendered
          }
        }
        // próg odsiewa kadry, w których jest sam biały margines
        if (bestFile && bestSize > 3000) {
          image = `${id}.png`
          writeFileSync(resolve(IMAGE_DIR, image), readFileSync(bestFile))
        }
      }
      questions.push(toQuestion(raw, setId, now, image))
      added++
    }
    console.log(`${src.label}: ${parsed.length} zadań w pliku, ${added} nowych`)
  }

  rmSync(tmp, { recursive: true, force: true })

  const set: QuestionSet = {
    id: setId,
    name: 'Informatory CKE — przykładowe zadania',
    createdAt: now,
    sourceFileName: 'database/info/*.pdf',
    categories: CATEGORIES.map((c) => c.id),
    questions
  }
  writeFileSync(resolve(ROOT, 'sample-data/cke-informatory.json'), JSON.stringify(set, null, 2))

  const withImage = questions.filter((q) => q.image).length
  const flagged = questions.filter((q) => q.flags.length).length
  const pictorial = questions.filter((q) => q.options[0]?.text.startsWith('Wariant')).length
  console.log(`\nZapisano ${questions.length} pytań, ${withImage} z rysunkiem, ${pictorial} z wariantami na rysunku.`)
  console.log(`Bez materiału źródłowego (flaga needs_image): ${flagged}.`)
  const counts = new Map<string, number>()
  for (const q of questions) counts.set(q.category, (counts.get(q.category) ?? 0) + 1)
  console.log([...counts.entries()].sort((a, b) => b[1] - a[1]).map(([c, n]) => `${c}:${n}`).join('  '))
}

main()
