/** Taksonomia z database/00-kategorie.md — zestaw podstawowy ELE.02 + ELE.05. */
export const CATEGORIES = [
  { id: 'BHP', name: 'Bezpieczeństwo i higiena pracy' },
  { id: 'PP', name: 'Pierwsza pomoc' },
  { id: 'PE', name: 'Podstawy elektrotechniki' },
  { id: 'ELN', name: 'Elementy i układy elektroniki' },
  { id: 'SCH', name: 'Dokumentacja i schematy' },
  { id: 'INST', name: 'Instalacje elektryczne' },
  { id: 'OSPRZ', name: 'Sprzęt, osprzęt i narzędzia' },
  { id: 'OSW', name: 'Źródła światła i oprawy' },
  { id: 'POZ', name: 'Ochrona przeciwporażeniowa' },
  { id: 'ZAB', name: 'Zabezpieczenia i aparatura' },
  { id: 'POM', name: 'Pomiary i badania' },
  { id: 'MASZ', name: 'Maszyny elektryczne' },
  { id: 'URZ', name: 'Urządzenia, zasilanie i sterowanie' },
  { id: 'EKSP', name: 'Eksploatacja i konserwacja' },
  { id: 'JOZ', name: 'Język obcy zawodowy' },
  { id: 'ORG', name: 'Organizacja pracy i kompetencje społeczne' }
] as const

export const CATEGORY_NAMES = CATEGORIES.map((c) => c.name)

/** Claude zwraca nazwę; nietrafiona nazwa = błąd walidacji, nie nowa kategoria (00-kategorie.md). */
export function categoryId(name: string): string | null {
  const n = name.trim().toLowerCase()
  return CATEGORIES.find((c) => c.name.toLowerCase() === n || c.id.toLowerCase() === n)?.id ?? null
}

export function categoryName(id: string): string {
  return CATEGORIES.find((c) => c.id === id)?.name ?? id
}
