import { readFileSync } from 'fs'
import { extname } from 'path'

/** Plik → surowy tekst. PDF dopiero w Etapie 6 (skany wymagają OCR). */
export async function extractText(path: string): Promise<string> {
  switch (extname(path).toLowerCase()) {
    case '.docx': {
      const mammoth = await import('mammoth')
      const { value } = await mammoth.extractRawText({ path })
      return value
    }
    case '.csv': {
      const Papa = (await import('papaparse')).default
      const parsed = Papa.parse<string[]>(readFileSync(path, 'utf8').trim(), { skipEmptyLines: true })
      return parsed.data.map((row) => row.join(' | ')).join('\n')
    }
    default:
      return readFileSync(path, 'utf8')
  }
}
