/**
 * Wyciąga przykładowe zadania z informatorów CKE (database/info/*.pdf) do zestawu pytań.
 * Klucz odpowiedzi pochodzi wprost z informatora — żadnego AI, żadnego zgadywania.
 *
 * Wymaga `pdftotext` (poppler-utils). Uruchamiane raz; wynik leży w sample-data/.
 *   npm run seed
 */
import { execFileSync } from 'child_process'
import { mkdirSync, writeFileSync } from 'fs'
import { resolve } from 'path'
import { questionId } from '../src/shared/ids'
import { CATEGORIES } from '../src/shared/categories'
import type { Option, Question, QuestionSet } from '../src/shared/types'

const ROOT = resolve(__dirname, '..')

/** Jednostka efektów kształcenia → kategoria. Dopasowanie po słowach kluczowych w treści. */
const KEYWORDS: Array<[string, RegExp]> = [
  ['PP', /pierwsz\w+ pomoc|poszkodowan|reanimac|oparzen|krwotok|porażeni\w+ prądem.*(przytomn|nieprzytomn)/i],
  ['BHP', /bhp|środk\w+ ochrony (indywidualnej|zbiorowej)|uziemiacz|polecenie pisemne|strefa pracy|gaśnic|ochrony przeciwpożarow|ergonomi/i],
  ['POZ', /przeciwporażeniow|różnicowoprądow|pętli zwarcia|uziom|połączeni\w+ wyrównawcz|klas\w+ ochronności|samoczynne wyłączenie|rezystancj\w+ uziemienia/i],
  ['POM', /pomiar|miernik|mierzy|rezystancj\w+ izolacji|przyrząd\w* pomiarow|protokoł\w* z pomiar|megaomomierz|watomierz|oscyloskop/i],
  ['ZAB', /zabezpiecz|wyłącznik\w* nadprądow|bezpiecznik|charakterystyk\w* [BCD]\b|przeciwprzepięciow|ogranicznik przepięć|selektywn/i],
  ['MASZ', /silnik|transformator|prądnic|generator|maszyn\w+ (indukcyjn|synchroniczn|prądu stałego)|tabliczk\w+ znamionow|łożysk|uzwojeni|wirnik|stojan/i],
  ['URZ', /stycznik|przekaźnik|falownik|sterownik plc|gwiazda\W*trójkąt|kompensacj\w+ mocy biernej|wyłącznik silnikow|instalacj\w+ inteligentn/i],
  ['OSW', /oprawa oświetleniow|źródł\w+ światła|żarówk|świetlówk|natężeni\w+ oświetlenia|strumień świetlny|lampa/i],
  ['OSPRZ', /narzędzi|ściągani\w+ powłok|zaciskani\w+ końcówek|puszk|listw\w+ instalacyjn|stopień ochrony ip|gniazd\w+ wtyczkow|łącznik\w+ (jednobiegunow|schodow|świecznikow)/i],
  ['SCH', /symbol\w* graficzn|schemat\w* (ideow|montażow|blokow)|rysunk\w+ techniczn|dokumentacj\w+ techniczn/i],
  ['INST', /instalacj|przewód|przewod|kabl|układ\w* (tn|tt|it)\b|wlz|rozdzielnic|przekrój żyły|obciążalnoś|spadek napięcia/i],
  ['ELN', /diod|tranzystor|tyrystor|termistor|zener|przekształtnik|prostownik|układ scalon/i],
  ['EKSP', /eksploatacj|konserwacj|oględzin|przegląd\w* okresow|termin\w* badań|usuni\w+ usterk|naprawa|modernizacj/i],
  ['JOZ', /\b(the|is|are|which|circuit|switch|wire|voltage|der|die|das|ist|welche)\b/i],
  ['ORG', /zespoł|etyk\w+ zawodow|negocjac|podział ról|harmonogram|planowani\w+ pracy|odpowiedzialnoś/i],
  ['PE', /rezystancj|napięci|natężeni|moc (czynn|biern|pozorn)|prawo (ohma|kirchhoffa)|kondensator|cewk|impedancj|obwod|trójfazow|przekładnik/i]
]

const UNIT_FALLBACK: Record<string, string> = {
  '1': 'BHP',
  '2': 'PE',
  '3': 'INST',
  '4': 'MASZ',
  '5': 'JOZ',
  '6': 'ORG',
  '7': 'ORG'
}

function classify(text: string, unit: string): string {
  for (const [id, re] of KEYWORDS) if (re.test(text)) return id
  return UNIT_FALLBACK[unit.split('.')[2] ?? ''] ?? 'PE'
}

const NEEDS_IMAGE = /\b(na rysunku|rysunek|przedstawion\w+ na|schemacie|schemat\w* przedstawi|na filmie|w tabeli|na zdjęciu|na fotografii|przedstawionych|wykres)/i

interface Raw {
  unit: string
  unitName: string
  question: string
  options: string[]
  correct: number
  extras: string[]
}

function parse(text: string): Raw[] {
  const out: Raw[] = []
  for (const block of text.split(/Jednostka efektów kształcenia:/).slice(1)) {
    const unitMatch = block.match(/(ELE\.\d+\.\d+)\.\s*([^\n]+)/)
    const answerMatch = block.match(/Odpowiedź prawidłowa:\s*([A-D])/)
    const taskIdx = block.search(/Przykładowe zadanie/)
    if (!unitMatch || !answerMatch || taskIdx < 0) continue

    const body = block.slice(taskIdx).replace(/Przykładowe zadanie/, '')
    const lines = body.split('\n')
    const questionLines: string[] = []
    const options: string[] = []
    const extras: string[] = []
    let seenOption = false

    for (const line of lines) {
      if (/Odpowiedź prawidłowa:/.test(line)) break
      const opt = line.match(/^\s*([A-D])\.(?:\s|$)(.*)$/)
      if (opt) {
        seenOption = true
        // -layout wkleja sąsiednią kolumnę po dużym odstępie — pierwszy segment to treść wariantu
        const [first, ...rest] = opt[2].split(/\s{4,}/)
        options.push(first.trim())
        extras.push(...rest.map((s) => s.trim()).filter(Boolean))
        continue
      }
      const clean = line.replace(/\s{4,}/g, ' ').trim()
      if (!clean || /^\d+$/.test(clean)) continue
      if (seenOption) extras.push(clean)
      else questionLines.push(clean)
    }

    if (options.length !== 4 || options.some((o) => !o)) continue
    out.push({
      unit: unitMatch[1],
      unitName: unitMatch[2].trim(),
      question: questionLines.join(' ').replace(/\s+/g, ' ').trim(),
      options,
      correct: 'ABCD'.indexOf(answerMatch[1]),
      extras
    })
  }
  return out
}

function toQuestion(raw: Raw, setId: string, now: string): Question {
  const letters = ['a', 'b', 'c', 'd']
  const options: Option[] = raw.options.map((text, i) => ({ id: letters[i], text, source: 'original' }))
  const extra = raw.extras.filter((e) => e.length > 3).join(' ')
  const question = extra ? `${raw.question}\n\n${extra}` : raw.question
  const category = classify(`${raw.question} ${raw.options.join(' ')}`, raw.unit)
  return {
    id: questionId(raw.question),
    setId,
    sourceNumber: '',
    type: 'single_choice',
    question,
    options,
    correctOptionIds: [letters[raw.correct]],
    answerText: raw.options[raw.correct],
    explanation: null,
    category,
    unit: raw.unit,
    difficulty: 2,
    flags: NEEDS_IMAGE.test(raw.question) ? ['needs_image'] : [],
    reviewNote: NEEDS_IMAGE.test(raw.question)
      ? 'Zadanie z informatora odwołuje się do rysunku/filmu — dołącz obrazek albo ucz się w trybie Nauka.'
      : '',
    image: null,
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
  let skipped = 0

  for (const src of sources) {
    const text = execFileSync('pdftotext', ['-layout', resolve(ROOT, src.file), '-'], {
      encoding: 'utf8',
      maxBuffer: 32 * 1024 * 1024
    })
    const parsed = parse(text)
    skipped += (text.match(/Przykładowe zadanie/g)?.length ?? 0) - parsed.length
    for (const raw of parsed) {
      const q = toQuestion(raw, setId, now)
      if (seen.has(q.id)) continue
      seen.add(q.id)
      questions.push(q)
    }
    console.log(`${src.label}: ${parsed.length} zadań`)
  }

  const set: QuestionSet = {
    id: setId,
    name: 'Informatory CKE — przykładowe zadania',
    createdAt: now,
    sourceFileName: 'database/info/*.pdf',
    categories: CATEGORIES.map((c) => c.id),
    questions
  }

  mkdirSync(resolve(ROOT, 'sample-data'), { recursive: true })
  writeFileSync(resolve(ROOT, 'sample-data/cke-informatory.json'), JSON.stringify(set, null, 2))
  const flagged = questions.filter((q) => q.flags.length).length
  console.log(`\nZapisano ${questions.length} pytań (unikalnych), z tego ${flagged} z flagą needs_image.`)
  console.log(`Pominięto ${skipped} zadań opartych wyłącznie na obrazkach (warianty bez tekstu).`)
  const counts = new Map<string, number>()
  for (const q of questions) counts.set(q.category, (counts.get(q.category) ?? 0) + 1)
  console.log([...counts.entries()].sort((a, b) => b[1] - a[1]).map(([c, n]) => `${c}:${n}`).join('  '))
}

main()
