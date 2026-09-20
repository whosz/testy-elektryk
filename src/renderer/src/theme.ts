export type Theme = 'light' | 'dark' | 'system'

const KEY = 'elektryk-quiz-theme'

export function readTheme(): Theme {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'light' || v === 'dark' || v === 'system' ? v : 'system'
  } catch {
    return 'system'
  }
}

export function applyTheme(theme: Theme): void {
  const dark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', dark)
  try {
    localStorage.setItem(KEY, theme)
  } catch {
    /* tryb prywatny albo zablokowane dane — motyw i tak zadziała do zamknięcia okna */
  }
}
