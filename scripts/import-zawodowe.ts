/**
 * Import pytań z zawodowe.edu.pl — za zgodą właściciela serwisu.
 * Serwis jest podany jako źródło w aplikacji (ekran Zestawy i Ustawienia).
 *
 * Wszystko pochodzi ze źródła: treść pytania, poprawna odpowiedź, trzy błędne
 * warianty, wyjaśnienie i ilustracja. Claude niczego tu nie zgaduje; dane siedzą
 * w JSON-LD (schema.org/Question) na stronie każdego pytania.
 *
 *   npx tsx scripts/import-zawodowe.ts ELE.02
 *   npx tsx scripts/import-zawodowe.ts ELE.05
 *
 * Liczba stron wykrywana jest z paginacji; można ją nadpisać drugim argumentem.
 *
 * Pobrane strony lądują w cache, więc ponowne uruchomienie nic nie kosztuje
 * i nie obciąża serwisu.
 */
import { createHash } from 'crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'
import { questionId } from '../src/shared/ids'
import { CATEGORIES } from '../src/shared/categories'
import type { Option, Question, QuestionSet } from '../src/shared/types'

const ROOT = resolve(__dirname, '..')
const QUAL = (process.argv[2] ?? 'ELE.02').toUpperCase()
const SET_ID = `zawodowe-${QUAL.toLowerCase().replace('.', '')}`
// Zestaw jedzie do użytkownika przez aktualizację materiałów, nie w binarce —
// inaczej instalator i APK urosłyby o kilkanaście megabajtów.
const IMAGE_DIR = resolve(ROOT, `sample-data/images/${SET_ID}`)
const CACHE = resolve(ROOT, 'node_modules/.cache/zawodowe')
const BASE = 'https://zawodowe.edu.pl'
const LIST = `${BASE}/technik-elektryk/${QUAL}`
// naglowek HTTP przyjmuje tylko ASCII, wiec bez polskich znakow
const UA = 'Mozilla/5.0 (compatible; ElektrykQuiz/1.0; personal study use, with site owner permission)'
const PAUSE_MS = 800

/** Kategorie serwisu → taksonomia projektu z database/00-kategorie.md. */
const CATEGORY_MAP: Record<string, string> = {
  'instalacje elektryczne': 'INST',
  'pomiary elektryczne': 'POM',
  'ochrona przeciwporażeniowa': 'POZ',
  'maszyny i urządzenia elektryczne': 'MASZ',
  'materiały i osprzęt elektryczny': 'OSPRZ',
  'oświetlenie elektryczne': 'OSW',
  'bezpieczeństwo i higiena pracy': 'BHP',
  'pierwsza pomoc': 'PP',
  'podstawy elektrotechniki': 'PE',
  'elektronika': 'ELN',
  'dokumentacja techniczna': 'SCH',
  'rysunek techniczny': 'SCH',
  'zabezpieczenia elektryczne': 'ZAB',
  'eksploatacja': 'EKSP',
  'konserwacja': 'EKSP',
  'język obcy zawodowy': 'JOZ',
  'organizacja pracy': 'ORG',
  'sterowanie': 'URZ',
  'automatyka': 'URZ'
}

const KEYWORDS: Array<[string, RegExp]> = [
  ['PP', /pierwsz\w+ pomoc|poszkodowan|reanimac|oparzen|krwotok/i],
  ['BHP', /bhp|środk\w+ ochrony (indywidualnej|zbiorowej)|uziemiacz|polecenie pisemne|gaśnic/i],
  ['POZ', /przeciwporażeniow|różnicowoprądow|pętli zwarcia|uziom|połączeni\w+ wyrównawcz|klas\w+ ochronności/i],
  ['POM', /pomiar|miernik|mierzy|rezystancj\w+ izolacji|megaomomierz|watomierz|amperomierz|woltomierz/i],
  ['ZAB', /zabezpiecz|wyłącznik\w* nadprądow|bezpiecznik|charakterystyk\w* [BCD]\b|przepięciow/i],
  ['MASZ', /silnik|transformator|prądnic|maszyn\w+ (indukcyjn|synchroniczn)|tabliczk\w+ znamionow|uzwojeni|wirnik/i],
  ['URZ', /stycznik|przekaźnik|falownik|sterownik plc|gwiazda\W*trójkąt|kompensacj\w+ mocy biernej/i],
  ['OSW', /opraw\w+ oświetleniow|źródł\w+ światła|żarówk|świetlówk|natężeni\w+ oświetlenia/i],
  ['OSPRZ', /narzędzi|puszk|listw\w+ instalacyjn|stopień ochrony ip|gniazd\w+ wtyczkow|szczypc|wkrętak/i],
  ['SCH', /symbol\w* graficzn|schemat|rysunk\w+ techniczn|dokumentacj\w+ techniczn/i],
  ['INST', /instalacj|przewód|przewod|kabl|układ\w* (tn|tt|it)\b|rozdzielnic|przekrój żyły|spadek napięcia/i],
  ['ELN', /diod|tranzystor|tyrystor|termistor|prostownik/i],
  ['EKSP', /eksploatacj|konserwacj|oględzin|przegląd\w* okresow|usterk|naprawa/i],
  ['PE', /rezystancj|napięci|natężeni|moc (czynn|biern|pozorn)|prawo ohma|kondensator|impedancj|trójfazow/i]
]

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))

export async function fetchCached(url: string, binary = false): Promise<Buffer> {
  mkdirSync(CACHE, { recursive: true })
  const file = resolve(CACHE, createHash('sha1').update(url).digest('hex') + (binary ? '.bin' : '.html'))
  if (existsSync(file)) return readFileSync(file)

  await sleep(PAUSE_MS)
  const res = await fetch(url, { headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${url}`)
  const buf = Buffer.from(await res.arrayBuffer())
  writeFileSync(file, buf)
  return buf
}

interface Parsed {
  question: string
  correct: string
  wrong: string[]
  explanation: string
  categories: string[]
  image: string | null
}

function jsonLd(html: string): Record<string, unknown> | null {
  const m = html.match(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/)
  if (!m) return null
  try {
    return JSON.parse(m[1]) as Record<string, unknown>
  } catch {
    return null
  }
}

export function parseQuestion(html: string): Parsed | null {
  const ld = jsonLd(html)
  const graph = (ld?.['@graph'] as Array<Record<string, any>> | undefined) ?? []
  const page = graph.find((n) => n['@type'] === 'QAPage')
  const q = page?.mainEntity
  if (!q?.name || !q?.acceptedAnswer?.text) return null

  const wrong = ((q.suggestedAnswer ?? []) as Array<{ text: string }>)
    .map((a) => a.text)
    .filter(Boolean)
  if (wrong.length !== 3) return null

  // kategorie serwisu stoją w bloku „Kategorie:" jako etykiety z podpowiedzią
  const catBlock = html.slice(html.indexOf('Kategorie'), html.indexOf('Kategorie') + 1200)
  const categories = [...catBlock.matchAll(/>([A-ZŁŚŻŹĆĄĘÓŃ][^<>{}]{4,60}?)</g)]
    .map((m) => m[1].trim())
    .filter((c) => CATEGORY_MAP[c.toLowerCase()])

  // ilustracja pytania: /images/<numer>.png, obok logo i grafik serwisu
  const img = html.match(/https:\/\/zawodowe\.edu\.pl\/images\/\d+\.(?:png|jpg|jpeg|webp)/)

  return {
    question: String(q.name).replace(/\s+/g, ' ').trim(),
    correct: String(q.acceptedAnswer.text).trim(),
    wrong: wrong.map((w) => w.trim()),
    explanation: String(q.acceptedAnswer.answerExplanation?.text ?? '').trim(),
    categories,
    image: img ? img[0] : null
  }
}

/**
 * Serwis przypina pytaniu kilka szerokich kategorii naraz i pierwsza z nich to prawie
 * zawsze „Instalacje elektryczne" — branie jej wprost wrzucało 3/4 zestawu do jednego
 * worka. Rozstrzygają więc słowa kluczowe dopasowane do taksonomii z database/,
 * a kategorie serwisu służą tylko jako zapasowe wskazanie.
 */
export function classify(p: Parsed): string {
  const text = `${p.question} ${p.correct} ${p.wrong.join(' ')}`
  for (const [id, re] of KEYWORDS) if (re.test(text)) return id
  for (const c of p.categories) {
    const mapped = CATEGORY_MAP[c.toLowerCase()]
    if (mapped) return mapped
  }
  return 'PE'
}

/** Poprawna odpowiedź nie może zawsze stać pod A — pozycja zależy od treści pytania. */
export function arrange(p: Parsed, id: string): { options: Option[]; correctId: string } {
  const letters = ['a', 'b', 'c', 'd']
  const slot = parseInt(id.slice(0, 2), 16) % 4
  const texts = [...p.wrong]
  texts.splice(slot, 0, p.correct)
  return {
    options: texts.map((text, i) => ({ id: letters[i], text, source: 'original' })),
    correctId: letters[slot]
  }
}

const questionRe = (): RegExp =>
  new RegExp(`https://zawodowe\\.edu\\.pl/technik-elektryk/${QUAL.replace('.', '\\.')}/[a-z0-9\\-]+/`, 'g')

/** Liczbę stron bierzemy z paginacji, żeby nie zgadywać i nie urwać zestawu w połowie. */
async function detectPages(): Promise<number> {
  const html = (await fetchCached(`${LIST}/`)).toString('utf8')
  const pages = [...html.matchAll(new RegExp(`/technik-elektryk/${QUAL.replace('.', '\\.')}/page/(\\d+)/`, 'g'))]
    .map((m) => Number(m[1]))
  return pages.length ? Math.max(...pages) : 1
}

export async function collectUrls(pages: number): Promise<string[]> {
  const urls = new Set<string>()
  for (let page = 1; page <= pages; page++) {
    const url = page === 1 ? `${LIST}/` : `${LIST}/page/${page}/`
    let html: string
    try {
      html = (await fetchCached(url)).toString('utf8')
    } catch {
      break
    }
    const before = urls.size
    for (const m of html.matchAll(questionRe())) urls.add(m[0])
    process.stdout.write(`\rStrona ${page}/${pages} — zebranych adresów: ${urls.size}   `)
    // pusta strona oznacza koniec listy, nawet jeśli paginacja sugerowała więcej
    if (page > 1 && urls.size === before) break
  }
  process.stdout.write('\n')
  return [...urls]
}

async function main(): Promise<void> {
  const pages = Number(process.argv[3] ?? 0) || (await detectPages())
  console.log(`Kwalifikacja ${QUAL}, stron do przejścia: ${pages}`)
  mkdirSync(IMAGE_DIR, { recursive: true })

  const urls = await collectUrls(pages)
  const now = new Date().toISOString()
  const seen = new Set<string>()
  const questions: Question[] = []
  let withImage = 0
  let failed = 0

  for (let i = 0; i < urls.length; i++) {
    let parsed: Parsed | null = null
    try {
      parsed = parseQuestion((await fetchCached(urls[i])).toString('utf8'))
    } catch {
      parsed = null
    }
    if (!parsed) {
      failed++
      continue
    }

    const id = questionId(parsed.question)
    if (seen.has(id)) continue
    seen.add(id)

    const { options, correctId } = arrange(parsed, id)
    let image: string | null = null
    if (parsed.image) {
      try {
        const ext = parsed.image.split('.').pop()!.toLowerCase()
        const name = `${id}.${ext}`
        writeFileSync(resolve(IMAGE_DIR, name), await fetchCached(parsed.image, true))
        image = name
        withImage++
      } catch {
        // brak ilustracji nie unieważnia pytania, ale trzeba to oznaczyć
      }
    }

    questions.push({
      id,
      setId: SET_ID,
      sourceNumber: '',
      type: 'single_choice',
      question: parsed.question,
      options,
      correctOptionIds: [correctId],
      answerText: parsed.correct,
      explanation: parsed.explanation
        ? { text: parsed.explanation, source: 'original', verified: false }
        : null,
      category: classify(parsed),
      unit: '',
      difficulty: 2,
      flags: !image && /ilustracj|rysunk|schemacie|na rysunku|przedstawiono na/i.test(parsed.question)
        ? ['needs_image']
        : [],
      reviewNote: '',
      image,
      createdAt: now
    })

    if ((i + 1) % 25 === 0 || i === urls.length - 1) {
      process.stdout.write(`\rPytania ${i + 1}/${urls.length} — zapisanych ${questions.length}, z rysunkiem ${withImage}   `)
    }
  }
  process.stdout.write('\n')

  const set: QuestionSet = {
    id: SET_ID,
    name: `zawodowe.edu.pl — ${QUAL}`,
    createdAt: now,
    sourceFileName: `https://zawodowe.edu.pl/technik-elektryk/${QUAL}/`,
    categories: CATEGORIES.map((c) => c.id),
    questions
  }
  writeFileSync(resolve(ROOT, `sample-data/${SET_ID}.json`), JSON.stringify(set, null, 2))

  const counts = new Map<string, number>()
  for (const q of questions) counts.set(q.category, (counts.get(q.category) ?? 0) + 1)
  console.log(`\nZapisano ${questions.length} pytań, ${withImage} z ilustracją.`)
  console.log(`Z wyjaśnieniem ze źródła: ${questions.filter((q) => q.explanation).length}`)
  console.log(`Oflagowanych needs_image: ${questions.filter((q) => q.flags.length).length}`)
  if (failed) console.log(`Nieprzetworzonych stron: ${failed}`)
  console.log([...counts.entries()].sort((a, b) => b[1] - a[1]).map(([c, n]) => `${c}:${n}`).join('  '))
}

if (require.main === module) void main()
