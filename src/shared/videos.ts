import type { ContentVideo } from './content'

/**
 * Nagrania wbudowane w aplikację, żeby lista była dostępna od pierwszego uruchomienia.
 * Aktualizacja materiałów podmienia ją na wersję z repozytorium.
 * Filmy zostają na YouTube i są odtwarzane oficjalnym odtwarzaczem — niczego nie kopiujemy.
 */
export const BUNDLED_VIDEOS: ContentVideo[] = [
  {
    id: 'StUFl7Ktkik',
    title: 'WE.1. Wprowadzenie do elektrotechniki, część 1.',
    channel: 'Krzysztof Gnyra',
    url: 'https://www.youtube.com/watch?v=StUFl7Ktkik',
    category: 'PE',
    note: ''
  },
  {
    id: 'edskCSCBXHM',
    title: 'WE.2. Wprowadzenie do elektrotechniki, część 2.',
    channel: 'Krzysztof Gnyra',
    url: 'https://www.youtube.com/watch?v=edskCSCBXHM',
    category: 'PE',
    note: ''
  },
  {
    id: 'zz2j6MayglM',
    title: 'cz.1 Instalacje elektryczne - kurs elektryk - Złączki instalacyjne, montaż wyłącznika RCD',
    channel: 'technik elektryk',
    url: 'https://www.youtube.com/watch?v=zz2j6MayglM',
    // wolne tagowanie tekstem, nie z taksonomii CATEGORIES — categoryName()
    // zwraca nieznany id bez zmian, więc badge pokaże dokładnie ten tekst
    category: 'Montaż instalacji',
    note: ''
  }
]
