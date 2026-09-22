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
    note: '',
    group: 'wyklady',
    durationMin: 0
  },
  {
    id: 'edskCSCBXHM',
    title: 'WE.2. Wprowadzenie do elektrotechniki, część 2.',
    channel: 'Krzysztof Gnyra',
    url: 'https://www.youtube.com/watch?v=edskCSCBXHM',
    category: 'PE',
    note: '',
    group: 'wyklady',
    durationMin: 0
  },
  {
    id: 'zz2j6MayglM',
    title: 'cz.1 Instalacje elektryczne - kurs elektryk - Złączki instalacyjne, montaż wyłącznika RCD',
    channel: 'technik elektryk',
    url: 'https://www.youtube.com/watch?v=zz2j6MayglM',
    // wolne tagowanie tekstem, nie z taksonomii CATEGORIES — categoryName()
    // zwraca nieznany id bez zmian, więc badge pokaże dokładnie ten tekst
    category: 'Montaż instalacji',
    note: '',
    group: 'montaz',
    durationMin: 0
  },

  // Akademia Sukcesu Zawodowego — kompetencje miękkie, poza taksonomią elektryczną,
  // dlatego bez kategorii i w osobnej grupie „Dodatkowe".
  {
    id: 'BLXrpHIQmec',
    title: 'ASZ.1. Postawa proaktywna',
    channel: 'Krzysztof Gnyra',
    url: 'https://youtu.be/BLXrpHIQmec',
    category: '',
    note: '',
    group: 'dodatkowe',
    durationMin: 43
  },
  {
    id: 'Em4R4FD8SCM',
    title: 'ASZ.2. Dwie składowe sukcesu',
    channel: 'Krzysztof Gnyra',
    url: 'https://youtu.be/Em4R4FD8SCM',
    category: '',
    note: '',
    group: 'dodatkowe',
    durationMin: 40
  },
  {
    id: '_c-NiCs0I5w',
    title: 'ASZ.3. Potęga motywacji',
    channel: 'Krzysztof Gnyra',
    url: 'https://youtu.be/_c-NiCs0I5w',
    category: '',
    note: '',
    group: 'dodatkowe',
    durationMin: 44
  },
  {
    id: '-sP9PN9Pc_Y',
    title: 'ASZ.4. Efektywne wytyczanie celów',
    channel: 'Krzysztof Gnyra',
    url: 'https://youtu.be/-sP9PN9Pc_Y',
    category: '',
    note: '',
    group: 'dodatkowe',
    durationMin: 60
  },
  {
    id: 'n7BHYkA0VnE',
    title: 'ASZ.5. Organizacja czasu pracy',
    channel: 'Krzysztof Gnyra',
    url: 'https://youtu.be/n7BHYkA0VnE',
    category: '',
    note: '',
    group: 'dodatkowe',
    durationMin: 46
  },
  {
    id: 'Gw7UP5sgoz8',
    title: 'ASZ.6. Zarządzanie priorytetami',
    channel: 'Krzysztof Gnyra',
    url: 'https://youtu.be/Gw7UP5sgoz8',
    category: '',
    note: '',
    group: 'dodatkowe',
    durationMin: 40
  },
  {
    id: 'osDxitZW8Ys',
    title: 'ASZ.7. Zarządzanie emocjami',
    channel: 'Krzysztof Gnyra',
    url: 'https://youtu.be/osDxitZW8Ys',
    category: '',
    note: '',
    group: 'dodatkowe',
    durationMin: 40
  },
  {
    id: 'aw8LTazB9lU',
    title: 'ASZ.8. Potencjał osobowości',
    channel: 'Krzysztof Gnyra',
    url: 'https://youtu.be/aw8LTazB9lU',
    category: '',
    note: '',
    group: 'dodatkowe',
    durationMin: 30
  },
  {
    id: '4m8ccND4vf8',
    title: 'ASZ.9. Osobowość, a sukces',
    channel: 'Krzysztof Gnyra',
    url: 'https://youtu.be/4m8ccND4vf8',
    category: '',
    note: '',
    group: 'dodatkowe',
    durationMin: 39
  },
  {
    id: '-OmioQoBY0I',
    title: 'ASZ.10. Indywidualny potencjał',
    channel: 'Krzysztof Gnyra',
    url: 'https://youtu.be/-OmioQoBY0I',
    category: '',
    note: '',
    group: 'dodatkowe',
    durationMin: 43
  }
]
