import type { ContentPdf } from './content'

/**
 * Dokumenty PDF — lista jest wbudowana, żeby pojawiła się od pierwszego uruchomienia,
 * ale same pliki (dziesiątki MB) nie wchodzą do instalatora ani APK. Aktualizacja
 * materiałów dosyła je dopiero na żądanie — link otwiera się w zewnętrznej przeglądarce,
 * tak samo jak "Otwórz na YouTube" dla nagrań.
 */
export const BUNDLED_PDFS: ContentPdf[] = [
  {
    id: 'praktyczny-start-elektryka',
    title: 'Praktyczny start elektryka',
    author: 'Elektrotechniczni.pl',
    url: 'pdfs/praktyczny-start-elektryka.pdf',
    sizeMB: 30,
    note: ''
  },
  {
    id: 'symbole-graficzne-pn-en-60617',
    title: 'Symbole graficzne elektryczne wg PN-EN 60617',
    author: '',
    url: 'pdfs/symbole-graficzne-pn-en-60617.pdf',
    sizeMB: 0.5,
    note: ''
  }
]
