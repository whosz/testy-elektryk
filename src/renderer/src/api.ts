import { Filesystem, Directory, Encoding } from '@capacitor/filesystem'
import { LocalContentSchema } from '@shared/content'
import {
  DEFAULT_SETTINGS,
  ExamsFileSchema,
  ProgressFileSchema,
  QuestionSetSchema,
  SettingsSchema
} from '@shared/schema'
import type { CardProgress, ExamResult, ImportDraft, QuestionSet, Settings } from '@shared/types'
import type { Api } from '../../preload'

/** Na Androidzie nie ma procesu głównego, więc te funkcje po prostu nie istnieją. */
export const isDesktop = typeof window !== 'undefined' && 'api' in window

const BRAK_IMPORTU =
  'Import przez Claude działa tylko w wersji na Windows. Na Androidzie wczytasz gotowy zestaw albo kopię zapasową.'

/**
 * Wersja mobilna trzyma dane w plikach o tych samych nazwach co wersja desktopowa,
 * dzięki czemu kopia zapasowa z komputera wczytuje się na telefonie i odwrotnie.
 */
const DIR = Directory.Data
const base = 'elektryk-quiz'

/** Nazwa rysunku wchodzi do ścieżki pliku, więc zostaje tylko to, co bezpieczne. */
const safe = (name: string): string => name.replace(/[^a-zA-Z0-9._-]/g, '_')

const mimeOf = (name: string): string => {
  const ext = name.split('.').pop()?.toLowerCase()
  return ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'webp' ? 'image/webp' : 'image/png'
}

async function readFile<T>(name: string, fallback: T): Promise<T> {
  try {
    const { data } = await Filesystem.readFile({
      path: `${base}/${name}`,
      directory: DIR,
      encoding: Encoding.UTF8
    })
    return JSON.parse(typeof data === 'string' ? data : '') as T
  } catch {
    return fallback
  }
}

async function writeFile(name: string, value: unknown): Promise<void> {
  await Filesystem.mkdir({ path: base, directory: DIR, recursive: true }).catch(() => undefined)
  await Filesystem.mkdir({ path: `${base}/sets`, directory: DIR, recursive: true }).catch(() => undefined)
  await Filesystem.writeFile({
    path: `${base}/${name}`,
    directory: DIR,
    encoding: Encoding.UTF8,
    data: JSON.stringify(value)
  })
}

async function listSetFiles(): Promise<string[]> {
  try {
    const { files } = await Filesystem.readdir({ path: `${base}/sets`, directory: DIR })
    return files.map((f) => (typeof f === 'string' ? f : f.name)).filter((n) => n.endsWith('.json'))
  } catch {
    return []
  }
}

async function loadSet(id: string): Promise<QuestionSet> {
  const raw = await readFile<unknown>(`sets/${id}.json`, null)
  if (!raw) throw new Error(`Nie znaleziono zestawu ${id}`)
  return QuestionSetSchema.parse(raw)
}

async function loadSettings(): Promise<Settings> {
  return SettingsSchema.parse(await readFile('settings.json', DEFAULT_SETTINGS))
}

/** Wybór pliku na Androidzie idzie zwykłym <input type="file"> — WebView to obsługuje. */
function pickJson(): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json,.json'
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) return resolve(null)
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => resolve(null)
      reader.readAsText(file)
    }
    input.click()
  })
}

const mobileApi: Api = {
  sets: {
    list: async () => {
      const out: Array<{
        id: string
        name: string
        createdAt: string
        count: number
        sourceFileName: string
      }> = []
      for (const file of await listSetFiles()) {
        const set = await loadSet(file.replace(/\.json$/, ''))
        out.push({
          id: set.id,
          name: set.name,
          createdAt: set.createdAt,
          count: set.questions.length,
          sourceFileName: set.sourceFileName
        })
      }
      return out
    },
    get: loadSet,
    save: async (set) => writeFile(`sets/${set.id}.json`, set),
    merge: async (incoming) => {
      const existing = await readFile<unknown>(`sets/${incoming.id}.json`, null)
      if (!existing) {
        await writeFile(`sets/${incoming.id}.json`, incoming)
        return { added: incoming.questions.length, updated: 0 }
      }
      const current = QuestionSetSchema.parse(existing)
      const byId = new Map(current.questions.map((q) => [q.id, q]))
      let added = 0
      let updated = 0
      for (const q of incoming.questions) {
        if (byId.has(q.id)) updated++
        else added++
        byId.set(q.id, q)
      }
      await writeFile(`sets/${incoming.id}.json`, { ...current, questions: [...byId.values()] })
      return { added, updated }
    },
    remove: async (id) => {
      await Filesystem.deleteFile({ path: `${base}/sets/${id}.json`, directory: DIR }).catch(() => undefined)
    }
  },

  progress: {
    getAll: async () => ProgressFileSchema.parse(await readFile('progress.json', { cards: {} })).cards,
    upsert: async (cards: CardProgress[]) => {
      const file = ProgressFileSchema.parse(await readFile('progress.json', { cards: {} }))
      for (const c of cards) file.cards[c.questionId] = c
      await writeFile('progress.json', file)
    },
    resetForSet: async (id) => {
      const set = await loadSet(id)
      const file = ProgressFileSchema.parse(await readFile('progress.json', { cards: {} }))
      for (const q of set.questions) delete file.cards[q.id]
      await writeFile('progress.json', file)
    }
  },

  exams: {
    list: async () => ExamsFileSchema.parse(await readFile('exams.json', [])),
    add: async (result: ExamResult) => {
      const all = ExamsFileSchema.parse(await readFile('exams.json', []))
      all.push(result)
      await writeFile('exams.json', all)
    }
  },

  settings: {
    get: loadSettings,
    set: async (patch) => {
      const next = SettingsSchema.parse({ ...(await loadSettings()), ...patch })
      await writeFile('settings.json', next)
      return next
    },
    hasApiKey: async () => false,
    setApiKey: async () => {
      throw new Error(BRAK_IMPORTU)
    },
    testApiKey: async () => ({ ok: false, error: BRAK_IMPORTU })
  },

  importer: {
    pickFile: async () => null,
    extract: async () => {
      throw new Error(BRAK_IMPORTU)
    },
    estimate: async () => ({ chunks: 0, chars: 0, detectedQuestions: 0 }),
    run: async () => {
      throw new Error(BRAK_IMPORTU)
    },
    loadJson: async () => {
      throw new Error(BRAK_IMPORTU)
    },
    clearCache: async () => undefined,
    onProgress: () => () => undefined
  },

  images: {
    has: async (name) => {
      try {
        await Filesystem.stat({ path: `${base}/images/${safe(name)}`, directory: DIR })
        return true
      } catch {
        return false
      }
    },
    get: async (name) => {
      try {
        const { data } = await Filesystem.readFile({
          path: `${base}/images/${safe(name)}`,
          directory: DIR
        })
        return `data:${mimeOf(name)};base64,${typeof data === 'string' ? data : ''}`
      } catch {
        return null
      }
    },
    put: async (name, base64) => {
      await Filesystem.mkdir({ path: `${base}/images`, directory: DIR, recursive: true }).catch(
        () => undefined
      )
      await Filesystem.writeFile({
        path: `${base}/images/${safe(name)}`,
        directory: DIR,
        data: base64
      })
    }
  },

  content: {
    get: async () => LocalContentSchema.parse(await readFile('content.json', {})),
    set: async (value) => writeFile('content.json', value)
  },

  backup: {
    exportAll: async () => {
      const sets: QuestionSet[] = []
      for (const file of await listSetFiles()) sets.push(await loadSet(file.replace(/\.json$/, '')))
      const name = `elektryk-quiz-kopia-${new Date().toISOString().slice(0, 10)}.json`
      const data = JSON.stringify(
        {
          sets,
          progress: await readFile('progress.json', { cards: {} }),
          exams: await readFile('exams.json', []),
          settings: await loadSettings()
        },
        null,
        2
      )
      await Filesystem.writeFile({
        path: name,
        directory: Directory.Documents,
        encoding: Encoding.UTF8,
        data
      })
      return `Dokumenty/${name}`
    },
    importAll: async () => {
      const text = await pickJson()
      if (!text) return false
      const parsed = JSON.parse(text) as {
        sets: unknown[]
        progress: unknown
        exams: unknown
        settings: unknown
      }
      for (const raw of parsed.sets) {
        const set = QuestionSetSchema.parse(raw)
        await writeFile(`sets/${set.id}.json`, set)
      }
      await writeFile('progress.json', ProgressFileSchema.parse(parsed.progress))
      await writeFile('exams.json', ExamsFileSchema.parse(parsed.exams))
      await writeFile('settings.json', SettingsSchema.parse(parsed.settings))
      return true
    }
  },

  app: {
    openDataDir: async () => undefined,
    saveText: async () => null
  }
}

export const api: Api = isDesktop ? window.api : mobileApi
export type { ImportDraft }
