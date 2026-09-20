/**
 * Kontrola zestawu z informatorów względem plików źródłowych PDF.
 * Sprawdza to, co przy ekstrakcji z PDF psuje się po cichu: klucz odpowiedzi,
 * obecność wariantów w źródle, kompletność i obrazki.
 *
 *   npx tsx scripts/verify-informator.ts
 *
 * Kod wyjścia 1, jeśli jest choć jeden błąd krytyczny.
 */
import { execFileSync } from 'child_process'
import { existsSync, readFileSync } from 'fs'
import { resolve } from 'path'
import { QuestionSetSchema } from '../src/shared/schema'

const ROOT = resolve(__dirname, '..')
const SOURCES = ['database/info/Elektryk.pdf', 'database/info/Technik_elektryk.pdf']

const norm = (s: string): string =>
  s.toLowerCase().replace(/\s+/g, ' ').replace(/[„”"'`]/g, '').trim()

/** Wariant bywa zawinięty do drugiego wiersza, więc porównujemy wspólny początek. */
function sameOption(a: string, b: string): boolean {
  const x = norm(a)
  const y = norm(b)
  const n = Math.min(x.length, y.length, 30)
  return n > 0 && x.slice(0, n) === y.slice(0, n)
}

interface Block {
  text: string
  options: string[]
  correctLetter: string
}

/** Blok = jedno „Przykładowe zadanie" wraz z jego kluczem. */
function blocks(raw: string): Block[] {
  const out: Block[] = []
  for (const part of raw.split(/Przykładowe zadanie/).slice(1)) {
    const key = part.match(/Odpowiedź prawidłowa:\s*([A-D])/)
    if (!key) continue
    const body = part.slice(0, part.indexOf('Odpowiedź prawidłowa'))
    const options: string[] = []
    for (const line of body.split('\n')) {
      const m = line.match(/^\s*([A-D])\.(?:\s|$)(.*)$/)
      // -layout dokleja sąsiednią kolumnę po dużym odstępie; wariantem jest pierwszy segment
      if (m) options.push(m[2].split(/\s{4,}/).map((x) => x.trim()).find(Boolean) ?? '')
    }
    out.push({ text: norm(body), options, correctLetter: key[1] })
  }
  return out
}

function main(): void {
  const set = QuestionSetSchema.parse(
    JSON.parse(readFileSync(resolve(ROOT, 'sample-data/cke-informatory.json'), 'utf8'))
  )

  const all: Block[] = []
  for (const src of SOURCES) {
    const raw = execFileSync('pdftotext', ['-layout', resolve(ROOT, src), '-'], {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024
    })
    all.push(...blocks(raw))
  }
  const sourceText = norm(
    SOURCES.map((s) =>
      execFileSync('pdftotext', ['-layout', resolve(ROOT, s), '-'], {
        encoding: 'utf8',
        maxBuffer: 64 * 1024 * 1024
      })
    ).join('\n')
  )

  const critical: string[] = []
  const minor: string[] = []

  // 1. kompletność
  const unique = new Set(all.map((b) => b.text)).size
  if (unique !== set.questions.length) {
    critical.push(`Kompletność: ${unique} unikalnych zadań w źródle, ${set.questions.length} w zestawie`)
  }

  for (const q of set.questions) {
    const label = `${q.id} „${q.question.slice(0, 50)}…"`
    const pictorial = q.options.every((o) => /^Wariant [A-D] \(patrz rysunek\)$/.test(o.text))

    // 2. treść pytania musi być w źródle
    const firstSentence = norm(q.question.split('\n')[0]).slice(0, 60)
    if (firstSentence.length > 20 && !sourceText.includes(firstSentence)) {
      critical.push(`${label}: treści pytania nie ma w źródle`)
    }

    // 3. warianty tekstowe muszą być w źródle (halucynacja = wariant spoza źródła)
    if (!pictorial) {
      for (const o of q.options) {
        const t = norm(o.text).slice(0, 55)
        if (t.length > 8 && !sourceText.includes(t)) {
          critical.push(`${label}: wariant ${o.id} spoza źródła: „${o.text.slice(0, 55)}…"`)
        }
      }
    }

    // 4. klucz: dopasuj blok źródłowy i porównaj TREŚĆ poprawnego wariantu, nie literę
    const block = all.find((b) => b.text.includes(firstSentence))
    if (!block) {
      minor.push(`${label}: nie dopasowano bloku źródłowego`)
    } else {
      const expected = block.options['ABCD'.indexOf(block.correctLetter)]
      const got = q.options.find((o) => q.correctOptionIds.includes(o.id))
      if (!got) {
        critical.push(`${label}: brak wskazanego wariantu poprawnego`)
      } else if (pictorial) {
        if (got.id !== block.correctLetter.toLowerCase()) {
          critical.push(`${label}: klucz ${got.id.toUpperCase()}, źródło ${block.correctLetter}`)
        }
      } else if (expected && !sameOption(got.text, expected)) {
        critical.push(
          `${label}: klucz wskazuje „${got.text.slice(0, 40)}…", źródło „${expected.slice(0, 40)}…"`
        )
      }
      if (got && norm(q.answerText) !== norm(got.text)) {
        minor.push(`${label}: answerText nie zgadza się z treścią poprawnego wariantu`)
      }
    }

    // 5. dokładnie cztery różne warianty
    if (q.options.length !== 4) critical.push(`${label}: ${q.options.length} wariantów zamiast 4`)
    if (new Set(q.options.map((o) => norm(o.text))).size !== q.options.length) {
      critical.push(`${label}: warianty się powtarzają`)
    }

    // 6. wariant rysunkowy bez pliku = pytanie nierozwiązywalne
    if (pictorial && !q.image) critical.push(`${label}: warianty na rysunku, ale brak obrazka`)
    if (q.image && !existsSync(resolve(ROOT, 'src/renderer/public/images/cke', q.image))) {
      critical.push(`${label}: brak pliku ${q.image}`)
    }

    // 7. nic dopisanego przez AI
    if (q.explanation) minor.push(`${label}: ma wyjaśnienie, choć zestaw jest czysto źródłowy`)
    if (q.options.some((o) => o.source === 'ai')) {
      critical.push(`${label}: wariant oznaczony jako wygenerowany przez AI`)
    }
  }

  console.log(`Sprawdzono ${set.questions.length} pytań wobec ${SOURCES.length} plików źródłowych.`)
  console.log(`Unikalnych zadań w źródle: ${unique}.`)
  console.log(`Z obrazkiem: ${set.questions.filter((q) => q.image).length}.`)
  if (critical.length) {
    console.log(`\nBŁĘDY KRYTYCZNE (${critical.length}):`)
    for (const c of critical) console.log('  ✗', c)
  }
  if (minor.length) {
    console.log(`\nDrobne (${minor.length}):`)
    for (const m of minor) console.log('  ·', m)
  }
  if (!critical.length) console.log('\nBez błędów krytycznych: klucze i warianty zgodne ze źródłem.')
  process.exit(critical.length ? 1 : 0)
}

main()
