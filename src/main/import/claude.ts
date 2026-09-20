import Anthropic from '@anthropic-ai/sdk'
import { createHash } from 'crypto'
import { existsSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'fs'
import { ImportChunkSchema, type ImportChunkResult } from '../../shared/schema'
import { join } from 'path'
import { pathIn } from '../storage'
import { IMPORT_OUTPUT_SCHEMA, IMPORT_SYSTEM_PROMPT, buildUserMessage } from './prompt'

export class ChunkFailed extends Error {}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))

function cacheFile(key: string): string {
  return pathIn('import-cache', `${key}.json`)
}

export function clearCache(): void {
  const dir = pathIn('import-cache')
  if (!existsSync(dir)) return
  for (const f of readdirSync(dir)) unlinkSync(join(dir, f))
}

export interface RunChunkOptions {
  apiKey: string
  model: string
  generateDistractors: boolean
  categories: string[]
}

/** Jedna paczka → JSON. Cache po hashu, więc powtórny import nic nie kosztuje. */
export async function runChunk(chunk: string, opts: RunChunkOptions): Promise<ImportChunkResult> {
  const userMessage = buildUserMessage(chunk, opts.categories, opts)
  const key = createHash('sha256')
    .update(opts.model + IMPORT_SYSTEM_PROMPT + userMessage)
    .digest('hex')
  const cached = cacheFile(key)
  if (existsSync(cached)) {
    try {
      return ImportChunkSchema.parse(JSON.parse(readFileSync(cached, 'utf8')))
    } catch {
      /* uszkodzony cache — pytamy jeszcze raz */
    }
  }

  const client = new Anthropic({ apiKey: opts.apiKey })
  const delays = [2000, 8000, 30000]

  for (let attempt = 0; ; attempt++) {
    try {
      const res = await client.messages.create({
        model: opts.model,
        max_tokens: 16000,
        system: IMPORT_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMessage }],
        output_config: { format: { type: 'json_schema', schema: IMPORT_OUTPUT_SCHEMA } }
      })

      if (res.stop_reason === 'refusal') throw new ChunkFailed('Model odmówił przetworzenia paczki')
      if (res.stop_reason === 'max_tokens') {
        // Paczka za duża — tnij na pół i złóż wyniki (PLAN 6.5).
        const half = Math.floor(chunk.length / 2)
        const split = chunk.lastIndexOf('\n', half)
        if (split <= 0) throw new ChunkFailed('Paczka przekracza max_tokens i nie da się jej podzielić')
        const a = await runChunk(chunk.slice(0, split), opts)
        const b = await runChunk(chunk.slice(split), opts)
        return {
          questions: [...a.questions, ...b.questions],
          incomplete_tail: b.incomplete_tail,
          new_categories: [...new Set([...a.new_categories, ...b.new_categories])]
        }
      }

      const text = res.content.find((b) => b.type === 'text')?.text ?? ''
      const parsed = ImportChunkSchema.parse(JSON.parse(text))
      writeFileSync(cached, JSON.stringify(parsed))
      return parsed
    } catch (err) {
      if (err instanceof ChunkFailed) throw err
      const status = err instanceof Anthropic.APIError ? err.status : 0
      const retryable = status === 429 || (status >= 500 && status < 600) || status === 0
      if (!retryable || attempt >= delays.length) {
        throw new ChunkFailed(err instanceof Error ? err.message : String(err))
      }
      await sleep(delays[attempt])
    }
  }
}

export async function testApiKey(apiKey: string, model: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await new Anthropic({ apiKey }).messages.create({
      model,
      max_tokens: 4,
      messages: [{ role: 'user', content: 'ping' }]
    })
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}
