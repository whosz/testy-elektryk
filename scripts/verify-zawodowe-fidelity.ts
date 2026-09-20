/**
 * Kontrola wierności: odtwarza DOKŁADNIE tę samą pętlę co import-zawodowe.ts
 * (te same funkcje parseQuestion/classify/arrange, ten sam porządek URL-i,
 * ta sama deduplikacja "pierwszy wygrywa") z zapisanego cache'u stron —
 * bez sieci, bez zapisu plików — i porównuje wynik z sample-data/zawodowe-eleXX.json.
 *
 * Różnice we flagach/reviewNote dla pytań poprawionych po audycie merytorycznym
 * są oczekiwane i pomijane — liczy się wierność treści, klucza, wariantów,
 * wyjaśnienia i obrazka względem źródła, nie to, co dopisał audyt.
 *
 *   npx tsx scripts/verify-zawodowe-fidelity.ts
 *
 * WAŻNE: ten skrypt tylko czyta. Nigdy nie wywołuje main() z import-zawodowe.ts
 * (ten plik ma teraz strażnika `if (require.main === module)`) i nigdy nie
 * zapisuje do sample-data ani do katalogu obrazków.
 */
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { questionId } from '../src/shared/ids'
import { QuestionSetSchema } from '../src/shared/schema'
import { arrange, classify, fetchCached, parseQuestion } from './import-zawodowe'
import type { Question } from '../src/shared/types'

const ROOT = resolve(__dirname, '..')
const BASE = 'https://zawodowe.edu.pl'

const AUDIT_PATCHED_IDS = new Set([
  '9480e54fe34a', '03b536b3771d', 'b9d7f2c1904f', '6d6f93e6b56e',
  'ac79e06e1f61', '9116d76f0a31', '5314635bbba0'
])

/** Ta sama logika co collectUrls() w import-zawodowe.ts, tylko sparametryzowana kwalifikacją. */
async function collectUrls(qual: string, pages: number): Promise<string[]> {
  const list = `${BASE}/technik-elektryk/${qual}`
  const re = new RegExp(`https://zawodowe\\.edu\\.pl/technik-elektryk/${qual.replace('.', '\\.')}/[a-z0-9\\-]+/`, 'g')
  const urls = new Set<string>()
  for (let page = 1; page <= pages; page++) {
    const url = page === 1 ? `${list}/` : `${list}/page/${page}/`
    let html: string
    try {
      html = (await fetchCached(url)).toString('utf8')
    } catch {
      break
    }
    const before = urls.size
    for (const m of html.matchAll(re)) urls.add(m[0])
    if (page > 1 && urls.size === before) break
  }
  return [...urls]
}

function norm(s: string): string {
  return s.toLowerCase().replace(/\s+/g, ' ').trim()
}

/** Odtwarza dokładnie to, co main() w import-zawodowe.ts trzyma w pamięci przed zapisem pliku. */
async function reproduce(qual: string, pages: number): Promise<Map<string, Question>> {
  const urls = await collectUrls(qual, pages)
  const seen = new Set<string>()
  const out = new Map<string, Question>()
  const now = new Date().toISOString()

  for (const url of urls) {
    let parsed
    try {
      parsed = parseQuestion((await fetchCached(url)).toString('utf8'))
    } catch {
      parsed = null
    }
    if (!parsed) continue
    const id = questionId(parsed.question)
    if (seen.has(id)) continue // ten sam "pierwszy wygrywa" co w main()
    seen.add(id)

    const { options, correctId } = arrange(parsed, id)
    out.set(id, {
      id,
      setId: `zawodowe-${qual.toLowerCase().replace('.', '')}`,
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
      flags: [],
      reviewNote: '',
      image: parsed.image ? `${id}.${parsed.image.split('.').pop()}` : null,
      createdAt: now
    })
  }
  return out
}

async function verify(qual: string, pages: number, setFile: string): Promise<void> {
  const set = QuestionSetSchema.parse(JSON.parse(readFileSync(resolve(ROOT, setFile), 'utf8')))
  const appById = new Map(set.questions.map((q) => [q.id, q]))
  const truth = await reproduce(qual, pages)

  const mismatches: string[] = []
  let checked = 0

  for (const [id, ref] of truth) {
    const app = appById.get(id)
    if (!app) {
      mismatches.push(`${id} „${ref.question.slice(0, 50)}…": brak w aplikacji (obecne w źródle)`)
      continue
    }
    checked++
    const label = `${id} „${ref.question.slice(0, 50)}…"`

    if (norm(app.question) !== norm(ref.question)) mismatches.push(`${label}: treść pytania różni się`)

    const appTexts = new Set(app.options.map((o) => norm(o.text)))
    for (const o of ref.options) {
      if (!appTexts.has(norm(o.text))) mismatches.push(`${label}: brak wariantu „${o.text.slice(0, 40)}"`)
    }
    const appCorrect = app.options.find((o) => app.correctOptionIds.includes(o.id))
    const refCorrect = ref.options.find((o) => ref.correctOptionIds.includes(o.id))
    if (!appCorrect || !refCorrect || norm(appCorrect.text) !== norm(refCorrect.text)) {
      mismatches.push(`${label}: klucz nie wskazuje tego samego wariantu co źródło`)
    }
    if (norm(app.answerText) !== norm(ref.answerText)) mismatches.push(`${label}: answerText różni się`)
    if ((ref.explanation?.text ?? '') && norm(app.explanation?.text ?? '') !== norm(ref.explanation!.text)) {
      mismatches.push(`${label}: wyjaśnienie różni się`)
    }
    if (ref.image && app.image !== ref.image) {
      mismatches.push(`${label}: obrazek (${app.image}) != oczekiwany (${ref.image})`)
    }
    if (!AUDIT_PATCHED_IDS.has(id) && app.category !== ref.category) {
      mismatches.push(`${label}: kategoria ${app.category} != ${ref.category}`)
    }
  }

  const extraInApp = [...appById.keys()].filter((id) => !truth.has(id))

  console.log(`\n${setFile} (${qual})`)
  console.log(`  Pytań odtworzonych ze źródła: ${truth.size}`)
  console.log(`  Sprawdzonych (dopasowanych po ID): ${checked}`)
  console.log(`  W aplikacji, których nie odtworzono ze źródła: ${extraInApp.length}`)
  if (mismatches.length) {
    console.log(`  NIEZGODNOŚCI (${mismatches.length}):`)
    for (const m of mismatches.slice(0, 40)) console.log('   ✗', m)
    if (mismatches.length > 40) console.log(`   … i ${mismatches.length - 40} więcej`)
  } else {
    console.log('  Bez niezgodności — treść, klucz, warianty, wyjaśnienie, obrazek i kategoria zgodne ze źródłem.')
  }
}

async function main(): Promise<void> {
  await verify('ELE.02', 24, 'sample-data/zawodowe-ele02.json')
  await verify('ELE.05', 21, 'sample-data/zawodowe-ele05.json')
}

void main()
