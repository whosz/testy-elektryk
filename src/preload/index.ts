import { contextBridge, ipcRenderer } from 'electron'
import type { LocalContent } from '../shared/content'
import type { CardProgress, ExamResult, ImportDraft, QuestionSet, Settings } from '../shared/types'

const invoke = <T>(channel: string, arg?: unknown): Promise<T> => ipcRenderer.invoke(channel, arg)

export const api = {
  sets: {
    list: () =>
      invoke<
        Array<{ id: string; name: string; createdAt: string; count: number; sourceFileName: string }>
      >('sets:list'),
    get: (id: string) => invoke<QuestionSet>('sets:get', { id }),
    save: (set: QuestionSet) => invoke<void>('sets:save', set),
    merge: (set: QuestionSet) => invoke<{ added: number; updated: number }>('sets:merge', set),
    remove: (id: string) => invoke<void>('sets:remove', { id })
  },
  progress: {
    getAll: () => invoke<Record<string, CardProgress>>('progress:getAll'),
    upsert: (cards: CardProgress[]) => invoke<void>('progress:upsert', cards),
    resetForSet: (id: string) => invoke<void>('progress:resetForSet', { id })
  },
  exams: {
    list: () => invoke<ExamResult[]>('exams:list'),
    add: (result: ExamResult) => invoke<void>('exams:add', result)
  },
  importer: {
    pickFile: () => invoke<{ path: string; name: string } | null>('importer:pickFile'),
    extract: (path: string) => invoke<string>('importer:extract', { path }),
    estimate: (text: string) =>
      invoke<{ chunks: number; chars: number; detectedQuestions: number }>('importer:estimate', { text }),
    run: (text: string, setId: string, sourceFileName: string) =>
      invoke<ImportDraft>('importer:run', { text, setId, sourceFileName }),
    loadJson: (path: string) => invoke<QuestionSet>('importer:loadJson', { path }),
    clearCache: () => invoke<void>('importer:clearCache'),
    onProgress: (cb: (p: { done: number; total: number }) => void) => {
      const listener = (_e: unknown, p: { done: number; total: number }): void => cb(p)
      ipcRenderer.on('importer:progress', listener)
      return () => {
        ipcRenderer.removeListener('importer:progress', listener)
      }
    }
  },
  settings: {
    get: () => invoke<Settings>('settings:get'),
    set: (patch: Partial<Settings>) => invoke<Settings>('settings:set', patch),
    hasApiKey: () => invoke<boolean>('settings:hasApiKey'),
    setApiKey: (key: string) => invoke<void>('settings:setApiKey', { key }),
    testApiKey: () => invoke<{ ok: boolean; error?: string }>('settings:testApiKey')
  },
  images: {
    has: (name: string) => invoke<boolean>('images:has', { name }),
    get: (name: string) => invoke<string | null>('images:get', { name }),
    put: (name: string, base64: string) => invoke<void>('images:put', { name, base64 })
  },
  content: {
    get: () => invoke<LocalContent>('content:get'),
    set: (value: LocalContent) => invoke<void>('content:set', value)
  },
  backup: {
    exportAll: () => invoke<string | null>('backup:export'),
    importAll: () => invoke<boolean>('backup:import')
  },
  app: {
    openDataDir: () => invoke<void>('app:openDataDir'),
    saveText: (name: string, text: string) => invoke<string | null>('app:saveText', { name, text })
  }
}

export type Api = typeof api

contextBridge.exposeInMainWorld('api', api)
