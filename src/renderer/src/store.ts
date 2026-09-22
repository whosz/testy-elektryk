import { create } from 'zustand'
import { api } from './api'
import { fetchManifest } from './updates'
import { checkForUpdate, type AvailableUpdate } from './appUpdate'
import { BUNDLED_CONTENT_VERSION, type ContentManifest, type ContentVideo } from '@shared/content'
import { BUNDLED_VIDEOS } from '@shared/videos'
import { DEFAULT_SETTINGS } from '@shared/schema'
import { applyErrorPool, applyStats, newCard } from '@shared/errorPool'
import { sm2, maxInterval, type Grade } from '@shared/sm2'
import { today } from '@shared/dates'
import type { CardProgress, ExamResult, Question, QuestionSet, Settings } from '@shared/types'

interface State {
  sets: Array<{ id: string; name: string; createdAt: string; count: number; sourceFileName: string }>
  questions: Question[]
  progress: Record<string, CardProgress>
  exams: ExamResult[]
  settings: Settings
  loading: boolean
  /** Materiały pobrane z serwera; przed pierwszą aktualizacją to wersja wbudowana. */
  contentVersion: number
  videos: ContentVideo[]
  update: { manifest: ContentManifest | null; checking: boolean; error: string | null }
  /** Nowe wydanie aplikacji (nie materiałów) — instalator/APK, wymaga nowego pliku. */
  appUpdate: AvailableUpdate | null
  checkContent: (quiet?: boolean) => Promise<void>
  checkAppUpdate: () => Promise<void>
  refresh: () => Promise<void>
  saveSet: (set: QuestionSet) => Promise<void>
  removeSet: (id: string) => Promise<void>
  resetSet: (id: string) => Promise<void>
  setSettings: (patch: Partial<Settings>) => Promise<void>
  addExam: (result: ExamResult) => Promise<void>
  /** Jedna odpowiedź: statystyki + pula błędów zawsze, SM-2 tylko poza egzaminem. */
  answer: (questionId: string, correct: boolean, opts?: { grade?: Grade; schedule?: boolean }) => Promise<void>
}

export const useStore = create<State>((set, get) => ({
  sets: [],
  questions: [],
  progress: {},
  exams: [],
  settings: DEFAULT_SETTINGS,
  loading: true,
  contentVersion: BUNDLED_CONTENT_VERSION,
  videos: BUNDLED_VIDEOS,
  update: { manifest: null, checking: false, error: null },
  appUpdate: null,

  checkAppUpdate: async () => {
    set({ appUpdate: await checkForUpdate() })
  },

  refresh: async () => {
    const [sets, progress, exams, settings, content] = await Promise.all([
      api.sets.list(),
      api.progress.getAll(),
      api.exams.list(),
      api.settings.get(),
      api.content.get()
    ])
    const full = await Promise.all(sets.map((s) => api.sets.get(s.id)))
    set({
      sets,
      progress,
      exams,
      settings,
      questions: full.flatMap((s) => s.questions),
      loading: false,
      contentVersion: Math.max(content.version, BUNDLED_CONTENT_VERSION),
      videos: content.videos.length ? content.videos : BUNDLED_VIDEOS
    })
  },

  checkContent: async (quiet = false) => {
    const { settings, contentVersion } = get()
    set({ update: { manifest: null, checking: true, error: null } })
    try {
      const manifest = await fetchManifest(settings.contentUrl)
      const newer = manifest.version > contentVersion
      set({ update: { manifest: newer ? manifest : null, checking: false, error: null } })
      if (!newer) {
        await api.content.set({
          version: contentVersion,
          checkedAt: new Date().toISOString(),
          videos: get().videos
        })
      }
    } catch (err) {
      // przy cichym sprawdzaniu brak sieci nie jest błędem, o którym trzeba krzyczeć
      set({
        update: {
          manifest: null,
          checking: false,
          error: quiet ? null : err instanceof Error ? err.message : String(err)
        }
      })
    }
  },

  saveSet: async (s) => {
    await api.sets.merge(s)
    await get().refresh()
  },
  removeSet: async (id) => {
    await api.sets.remove(id)
    await get().refresh()
  },
  resetSet: async (id) => {
    await api.progress.resetForSet(id)
    await get().refresh()
  },
  setSettings: async (patch) => set({ settings: await api.settings.set(patch) }),
  addExam: async (result) => {
    await api.exams.add(result)
    set({ exams: [...get().exams, result] })
  },

  answer: async (questionId, correct, opts = {}) => {
    const { progress, settings } = get()
    const day = today()
    const base = progress[questionId] ?? newCard(questionId, day)
    let card = applyStats(base, correct, new Date().toISOString())
    card = applyErrorPool(card, correct, settings.errorPoolExitStreak)

    if (opts.schedule !== false) {
      const grade: Grade = opts.grade ?? (correct ? 4 : 1)
      const next = sm2(card, grade, day, maxInterval(settings.examDate, day))
      card = { ...card, ...next }
    }

    set({ progress: { ...progress, [questionId]: card } })
    await api.progress.upsert([card])
  }
}))
