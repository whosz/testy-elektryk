/**
 * Import z linii komend — sprawdzenie jakości przetwarzania bez uruchamiania UI.
 *   ANTHROPIC_API_KEY=sk-... npx tsx scripts/import-cli.ts sample-data/probka.txt [nazwa-zestawu]
 * Wynik: out/<nazwa>.json + raport w konsoli.
 */
import { mkdirSync, writeFileSync } from 'fs'
import { basename, resolve } from 'path'
import { extractText } from '../src/main/import/extract'
import { estimate, runImport } from '../src/main/import/pipeline'
import { CATEGORIES } from '../src/shared/categories'
import type { QuestionSet } from '../src/shared/types'

async function main(): Promise<void> {
  const [file, nameArg] = process.argv.slice(2)
  if (!file) {
    console.error('Użycie: tsx scripts/import-cli.ts <plik> [nazwa-zestawu]')
    process.exit(1)
  }
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    console.error('Brak ANTHROPIC_API_KEY w środowisku.')
    process.exit(1)
  }

  const path = resolve(file)
  const text = await extractText(path)
  const est = estimate(text)
  console.log(`${est.chars} znaków · ${est.chunks} paczek · wykryto ${est.detectedQuestions} pytań`)

  const name = nameArg ?? basename(file).replace(/\.[^.]+$/, '')
  const setId = name.toLowerCase().replace(/[^a-z0-9]+/g, '-')

  const draft = await runImport(text, {
    apiKey,
    model: process.env.MODEL ?? 'claude-sonnet-5',
    generateDistractors: process.env.DISTRACTORS !== '0',
    categories: [],
    setId,
    sourceFileName: basename(file),
    onProgress: ({ done, total }) => console.log(`  paczka ${done}/${total}`)
  })

  const set: QuestionSet = {
    id: setId,
    name,
    createdAt: new Date().toISOString(),
    sourceFileName: basename(file),
    categories: CATEGORIES.map((c) => c.id),
    questions: draft.questions
  }

  mkdirSync(resolve('out'), { recursive: true })
  const outPath = resolve('out', `${setId}.json`)
  writeFileSync(outPath, JSON.stringify(set, null, 2))

  const r = draft.report
  console.log(`\n--- Raport ---`)
  console.log(`Wykryto w tekście: ${r.detectedQuestions}, zwrócone: ${r.returnedQuestions}`)
  if (r.numberingGaps.length) console.log(`Luki w numeracji: ${r.numberingGaps.join(', ')}`)
  if (r.duplicates.length) console.log(`Duplikaty: ${r.duplicates.length}`)
  if (r.invalidCorrectIndexes.length)
    console.log(`Bez poprawnej odpowiedzi: ${r.invalidCorrectIndexes.length}`)
  for (const [flag, n] of Object.entries(r.byFlag)) console.log(`${flag}: ${n}`)
  for (const f of r.failedChunks) console.log(`Paczka ${f.index} nieudana: ${f.error}`)
  console.log(`\nZapisano ${outPath}`)
}

void main()
