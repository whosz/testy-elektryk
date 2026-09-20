/**
 * Kontrola spójności zestawu pytań, niezależna od źródła.
 * Sprawdza to, co psuje się po cichu przy imporcie i czego nie widać w liczbie pytań.
 *
 *   npx tsx scripts/verify-set.ts sample-data/zawodowe-ele02.json [katalog-obrazków]
 *
 * Kod wyjścia 1, jeśli jest błąd krytyczny.
 */
import { existsSync, readFileSync } from 'fs'
import { resolve } from 'path'
import { QuestionSetSchema } from '../src/shared/schema'
import { questionId } from '../src/shared/ids'
import { CATEGORIES } from '../src/shared/categories'

const ROOT = resolve(__dirname, '..')

function main(): void {
  const [file, imageDir] = process.argv.slice(2)
  if (!file) {
    console.error('Użycie: tsx scripts/verify-set.ts <plik.json> [katalog-obrazków]')
    process.exit(1)
  }
  const set = QuestionSetSchema.parse(JSON.parse(readFileSync(resolve(ROOT, file), 'utf8')))
  const known = new Set<string>(CATEGORIES.map((c) => c.id))
  const critical: string[] = []
  const minor: string[] = []
  const ids = new Set<string>()

  for (const q of set.questions) {
    const label = `${q.id} „${q.question.slice(0, 45)}…"`

    if (ids.has(q.id)) critical.push(`${label}: zduplikowane ID`)
    ids.add(q.id)

    // ID musi wynikać z treści, inaczej reimport zgubi postępy
    if (q.id !== questionId(q.question)) critical.push(`${label}: ID nie zgadza się z treścią pytania`)

    if (q.type !== 'open') {
      if (q.options.length !== 4) critical.push(`${label}: ${q.options.length} wariantów zamiast 4`)
      if (new Set(q.options.map((o) => o.text.trim().toLowerCase())).size !== q.options.length) {
        critical.push(`${label}: warianty się powtarzają`)
      }
      if (q.correctOptionIds.length !== 1) {
        critical.push(`${label}: ${q.correctOptionIds.length} poprawnych odpowiedzi`)
      }
      const correct = q.options.find((o) => q.correctOptionIds.includes(o.id))
      if (!correct) critical.push(`${label}: klucz wskazuje nieistniejący wariant`)
      else if (correct.text.trim() !== q.answerText.trim()) {
        critical.push(`${label}: answerText nie zgadza się z treścią poprawnego wariantu`)
      }
      if (q.options.some((o) => !o.text.trim())) critical.push(`${label}: pusty wariant`)
    }

    if (!q.question.trim()) critical.push(`${label}: pusta treść pytania`)
    if (!known.has(q.category)) minor.push(`${label}: nieznana kategoria „${q.category}"`)

    if (q.image && imageDir && !existsSync(resolve(ROOT, imageDir, q.image))) {
      critical.push(`${label}: brak pliku ${q.image}`)
    }
    if (!q.image && q.flags.includes('needs_image') === false && /na ilustracji|na rysunku|na schemacie/i.test(q.question)) {
      minor.push(`${label}: odsyła do ilustracji, ale nie ma obrazka ani flagi`)
    }
  }

  // klucz zawsze pod tą samą literą oznaczałby, że coś poszło nie tak przy układaniu wariantów
  const byLetter: Record<string, number> = {}
  for (const q of set.questions) {
    const l = q.correctOptionIds[0]
    if (l) byLetter[l] = (byLetter[l] ?? 0) + 1
  }
  const max = Math.max(...Object.values(byLetter), 0)
  if (set.questions.length > 20 && max > set.questions.length * 0.5) {
    minor.push(`ponad połowa kluczy pod jedną literą: ${JSON.stringify(byLetter)}`)
  }

  console.log(`Zestaw: ${set.name}`)
  console.log(`Pytań: ${set.questions.length}`)
  console.log(`Z ilustracją: ${set.questions.filter((q) => q.image).length}`)
  console.log(`Z wyjaśnieniem: ${set.questions.filter((q) => q.explanation).length}`)
  console.log(`Rozkład kluczy: ${JSON.stringify(byLetter)}`)
  const counts = new Map<string, number>()
  for (const q of set.questions) counts.set(q.category, (counts.get(q.category) ?? 0) + 1)
  console.log(`Kategorie: ${[...counts.entries()].sort((a, b) => b[1] - a[1]).map(([c, n]) => `${c}:${n}`).join('  ')}`)

  if (critical.length) {
    console.log(`\nBŁĘDY KRYTYCZNE (${critical.length}):`)
    for (const c of critical.slice(0, 25)) console.log('  ✗', c)
    if (critical.length > 25) console.log(`  … i ${critical.length - 25} więcej`)
  }
  if (minor.length) {
    console.log(`\nDrobne (${minor.length}):`)
    for (const m of minor.slice(0, 15)) console.log('  ·', m)
    if (minor.length > 15) console.log(`  … i ${minor.length - 15} więcej`)
  }
  if (!critical.length) console.log('\nBez błędów krytycznych.')
  process.exit(critical.length ? 1 : 0)
}

main()
