import { safeStorage } from 'electron'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { pathIn } from './storage'

/** Klucz API szyfrowany DPAPI; nigdy nie trafia do settings.json ani do renderera. */
const file = (): string => pathIn('secrets.bin')

export function setApiKey(key: string): void {
  writeFileSync(file(), safeStorage.encryptString(key))
}

export function getApiKey(): string | null {
  const f = file()
  if (!existsSync(f)) return process.env.ANTHROPIC_API_KEY ?? null
  try {
    return safeStorage.decryptString(readFileSync(f))
  } catch {
    return null
  }
}

export function hasApiKey(): boolean {
  return getApiKey() !== null
}
