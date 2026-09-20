import { dialog, ipcMain, shell } from 'electron'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { basename, dirname } from 'path'
import { z } from 'zod'
import { LocalContentSchema } from '../shared/content'
import {
  DEFAULT_SETTINGS,
  ExamResultSchema,
  ExamsFileSchema,
  ProgressFileSchema,
  QuestionSetSchema,
  SettingsSchema,
  CardProgressSchema
} from '../shared/schema'
import type { CardProgress, ExamResult, QuestionSet, Settings } from '../shared/types'
import { extractText } from './import/extract'
import { clearCache, testApiKey } from './import/claude'
import { estimate, runImport } from './import/pipeline'
import { getApiKey, hasApiKey, setApiKey } from './secrets'
import { listFiles, pathIn, readJson, removeFile, writeJson } from './storage'

const setFile = (id: string): string => pathIn('sets', `${id}.json`)
const progressFile = (): string => pathIn('progress.json')
const examsFile = (): string => pathIn('exams.json')
const settingsFile = (): string => pathIn('settings.json')
const contentFile = (): string => pathIn('content.json')
const imageFile = (name: string): string => pathIn('images', name.replace(/[^a-zA-Z0-9._/-]/g, '_'))

const mimeOf = (name: string): string => {
  const ext = name.split('.').pop()?.toLowerCase()
  return ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'webp' ? 'image/webp' : 'image/png'
}

function loadSet(id: string): QuestionSet {
  const set = readJson(setFile(id), QuestionSetSchema, null as unknown as QuestionSet)
  if (!set) throw new Error(`Nie znaleziono zestawu ${id}`)
  return set
}

function loadSettings(): Settings {
  return readJson(settingsFile(), SettingsSchema, DEFAULT_SETTINGS)
}

/** Każdy handler waliduje argumenty przez zod (PLAN 8). */
function handle<T extends z.ZodTypeAny>(
  channel: string,
  schema: T,
  fn: (arg: z.infer<T>, event: Electron.IpcMainInvokeEvent) => unknown
): void {
  ipcMain.handle(channel, (event, raw) => fn(schema.parse(raw), event))
}

const Empty = z.undefined().or(z.null()).or(z.void())
const Id = z.object({ id: z.string().min(1) })

export function registerIpc(): void {
  handle('sets:list', Empty, () =>
    listFiles('sets').map((f) => {
      const set = loadSet(f.replace(/\.json$/, ''))
      return {
        id: set.id,
        name: set.name,
        createdAt: set.createdAt,
        count: set.questions.length,
        sourceFileName: set.sourceFileName
      }
    })
  )
  handle('sets:get', Id, ({ id }) => loadSet(id))
  handle('sets:save', QuestionSetSchema, (set) => {
    writeJson(setFile(set.id), set)
  })
  handle('sets:remove', Id, ({ id }) => {
    removeFile(setFile(id))
  })

  /** Reimport: nowe pytania dochodzą, istniejące zachowują ID (a więc i postępy). */
  handle('sets:merge', QuestionSetSchema, (incoming) => {
    const existing = readJson(setFile(incoming.id), QuestionSetSchema, null as unknown as QuestionSet)
    if (!existing) {
      writeJson(setFile(incoming.id), incoming)
      return { added: incoming.questions.length, updated: 0 }
    }
    const byId = new Map(existing.questions.map((q) => [q.id, q]))
    let added = 0
    let updated = 0
    for (const q of incoming.questions) {
      if (byId.has(q.id)) updated++
      else added++
      byId.set(q.id, q)
    }
    writeJson(setFile(incoming.id), { ...existing, questions: [...byId.values()] })
    return { added, updated }
  })

  handle('progress:getAll', Empty, () => readJson(progressFile(), ProgressFileSchema, { cards: {} }).cards)
  handle('progress:upsert', z.array(CardProgressSchema), (cards: CardProgress[]) => {
    const file = readJson(progressFile(), ProgressFileSchema, { cards: {} })
    for (const c of cards) file.cards[c.questionId] = c
    writeJson(progressFile(), file)
  })
  handle('progress:resetForSet', Id, ({ id }) => {
    const set = loadSet(id)
    const file = readJson(progressFile(), ProgressFileSchema, { cards: {} })
    for (const q of set.questions) delete file.cards[q.id]
    writeJson(progressFile(), file)
  })

  handle('exams:list', Empty, () => readJson(examsFile(), ExamsFileSchema, []))
  handle('exams:add', ExamResultSchema, (result: ExamResult) => {
    const all = readJson(examsFile(), ExamsFileSchema, [])
    all.push(result)
    writeJson(examsFile(), all)
  })

  handle('settings:get', Empty, loadSettings)
  handle('settings:set', SettingsSchema.partial(), (patch) => {
    const next = SettingsSchema.parse({ ...loadSettings(), ...patch })
    writeJson(settingsFile(), next)
    return next
  })
  handle('settings:hasApiKey', Empty, hasApiKey)
  handle('settings:setApiKey', z.object({ key: z.string().min(1) }), ({ key }) => {
    setApiKey(key)
  })
  handle('settings:testApiKey', Empty, () => {
    const key = getApiKey()
    if (!key) return { ok: false, error: 'Brak klucza API' }
    return testApiKey(key, loadSettings().model)
  })

  handle('importer:pickFile', Empty, async () => {
    const res = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Pytania', extensions: ['txt', 'md', 'csv', 'docx', 'json'] }]
    })
    if (res.canceled || !res.filePaths[0]) return null
    return { path: res.filePaths[0], name: basename(res.filePaths[0]) }
  })
  handle('importer:extract', z.object({ path: z.string() }), ({ path }) => extractText(path))
  handle('importer:estimate', z.object({ text: z.string() }), ({ text }) => estimate(text))
  handle(
    'importer:run',
    z.object({ text: z.string().min(1), setId: z.string().min(1), sourceFileName: z.string() }),
    async ({ text, setId, sourceFileName }, event) => {
      const apiKey = getApiKey()
      if (!apiKey) throw new Error('Brak klucza API — ustaw go w Ustawieniach')
      const settings = loadSettings()
      return runImport(text, {
        apiKey,
        model: settings.model,
        generateDistractors: settings.generateDistractors,
        categories: [],
        setId,
        sourceFileName,
        onProgress: (p) => event.sender.send('importer:progress', p)
      })
    }
  )
  handle('importer:clearCache', Empty, clearCache)

  /** Import gotowego JSON-a (np. sample-data/cke-informatory.json) — bez API. */
  handle('importer:loadJson', z.object({ path: z.string() }), ({ path }) =>
    QuestionSetSchema.parse(JSON.parse(readFileSync(path, 'utf8')))
  )

  handle('backup:export', Empty, async () => {
    const res = await dialog.showSaveDialog({
      defaultPath: `elektryk-quiz-kopia-${new Date().toISOString().slice(0, 10)}.json`,
      filters: [{ name: 'JSON', extensions: ['json'] }]
    })
    if (res.canceled || !res.filePath) return null
    // secrets.bin świadomie zostaje poza kopią (PLAN 8)
    writeJson(res.filePath, {
      sets: listFiles('sets').map((f) => loadSet(f.replace(/\.json$/, ''))),
      progress: readJson(progressFile(), ProgressFileSchema, { cards: {} }),
      exams: readJson(examsFile(), ExamsFileSchema, []),
      settings: loadSettings()
    })
    return res.filePath
  })

  handle('backup:import', Empty, async () => {
    const res = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'JSON', extensions: ['json'] }]
    })
    if (res.canceled || !res.filePaths[0]) return false
    const data = z
      .object({
        sets: z.array(QuestionSetSchema),
        progress: ProgressFileSchema,
        exams: ExamsFileSchema,
        settings: SettingsSchema
      })
      .parse(JSON.parse(readFileSync(res.filePaths[0], 'utf8')))
    for (const set of data.sets) writeJson(setFile(set.id), set)
    writeJson(progressFile(), data.progress)
    writeJson(examsFile(), data.exams)
    writeJson(settingsFile(), data.settings)
    return true
  })

  /** Rysunki dosypane wraz z materiałami; wbudowane w aplikację leżą w zasobach renderera. */
  handle('images:has', z.object({ name: z.string().min(1) }), ({ name }) => existsSync(imageFile(name)))
  handle('images:get', z.object({ name: z.string().min(1) }), ({ name }) => {
    const file = imageFile(name)
    if (!existsSync(file)) return null
    return `data:${mimeOf(name)};base64,${readFileSync(file).toString('base64')}`
  })
  handle(
    'images:put',
    z.object({ name: z.string().min(1), base64: z.string().min(1) }),
    ({ name, base64 }) => {
      const file = imageFile(name)
      mkdirSync(dirname(file), { recursive: true })
      writeFileSync(file, Buffer.from(base64, 'base64'))
    }
  )

  handle('content:get', Empty, () =>
    readJson(contentFile(), LocalContentSchema, LocalContentSchema.parse({}))
  )
  handle('content:set', LocalContentSchema, (value) => {
    writeJson(contentFile(), value)
  })

  handle('app:openDataDir', Empty, () => shell.openPath(pathIn('.')))
  handle('app:saveText', z.object({ name: z.string(), text: z.string() }), async ({ name, text }) => {
    const res = await dialog.showSaveDialog({ defaultPath: name })
    if (res.canceled || !res.filePath) return null
    writeFileSync(res.filePath, text, 'utf8')
    return res.filePath
  })
}
