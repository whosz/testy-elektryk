import { mkdtempSync, readFileSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'

vi.mock('electron', () => ({ app: { getPath: () => tmpdir() } }))

const { readJson, setDataDir, writeJson } = await import('@main/storage')

const Schema = z.object({ n: z.number() })
let dir = ''
let file = ''

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'eq-'))
  setDataDir(dir)
  file = join(dir, 'x.json')
})

describe('storage', () => {
  it('zapisuje i odczytuje przez zod', () => {
    writeJson(file, { n: 1 })
    expect(readJson(file, Schema, { n: 0 })).toEqual({ n: 1 })
  })

  it('robi kopię .bak przed nadpisaniem', () => {
    writeJson(file, { n: 1 })
    writeJson(file, { n: 2 })
    expect(JSON.parse(readFileSync(`${file}.bak`, 'utf8'))).toEqual({ n: 1 })
  })

  it('po uszkodzeniu pliku wraca do .bak', () => {
    writeJson(file, { n: 1 })
    writeJson(file, { n: 2 })
    writeFileSync(file, '{ to nie jest json')
    expect(readJson(file, Schema, { n: -1 })).toEqual({ n: 1 })
  })

  it('odrzuca dane niezgodne ze schematem i schodzi do fallbacku', () => {
    writeFileSync(file, JSON.stringify({ n: 'tekst' }))
    expect(readJson(file, Schema, { n: -1 })).toEqual({ n: -1 })
  })

  it('brak pliku daje fallback', () => {
    expect(readJson(join(dir, 'brak.json'), Schema, { n: 7 })).toEqual({ n: 7 })
  })
})
