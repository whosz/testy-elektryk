import { app } from 'electron'
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync, copyFileSync, unlinkSync, readdirSync } from 'fs'
import { join } from 'path'
import type { ZodTypeAny, infer as ZodInfer } from 'zod'

let root = ''

export function dataDir(): string {
  if (!root) root = join(app.getPath('userData'), 'data')
  mkdirSync(root, { recursive: true })
  return root
}

/** Tylko do testów — podmienia katalog danych bez Electrona. */
export function setDataDir(dir: string): void {
  root = dir
  mkdirSync(dir, { recursive: true })
}

export function pathIn(...parts: string[]): string {
  const p = join(dataDir(), ...parts)
  mkdirSync(join(p, '..'), { recursive: true })
  return p
}

/** Zapis atomowy: .tmp → rename, poprzednia wersja ląduje w .bak. */
export function writeJson(file: string, value: unknown): void {
  const tmp = `${file}.tmp`
  writeFileSync(tmp, JSON.stringify(value, null, 2), 'utf8')
  if (existsSync(file)) copyFileSync(file, `${file}.bak`)
  renameSync(tmp, file)
}

/** Uszkodzony plik → próba z .bak. Gdy i to padnie, zwraca fallback. */
export function readJson<S extends ZodTypeAny>(file: string, schema: S, fallback: ZodInfer<S>): ZodInfer<S> {
  for (const candidate of [file, `${file}.bak`]) {
    if (!existsSync(candidate)) continue
    try {
      return schema.parse(JSON.parse(readFileSync(candidate, 'utf8')))
    } catch {
      continue
    }
  }
  return fallback
}

export function removeFile(file: string): void {
  if (existsSync(file)) unlinkSync(file)
  if (existsSync(`${file}.bak`)) unlinkSync(`${file}.bak`)
}

export function listFiles(dir: string, ext = '.json'): string[] {
  const full = pathIn(dir)
  if (!existsSync(full)) return []
  return readdirSync(full).filter((f) => f.endsWith(ext))
}
