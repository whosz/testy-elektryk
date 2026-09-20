# Elektryk Quiz

Aplikacja desktopowa do nauki do egzaminu zawodowego **ELE.02** i **ELE.05** (część pisemna).
Działa offline na Windows. Pytania wczytujesz z gotowego zestawu albo importujesz własną listę,
którą Claude zamienia na ustrukturyzowaną bazę.

Specyfikacja: [PLAN.md](PLAN.md). Baza wiedzy i informatory CKE: [database/](database/).

## Co potrafi

- **Powtórki na dziś** — SM-2 z limitem nowych kart i przeplataniem kategorii.
  Po ustawieniu daty egzaminu odstępy skracają się, żeby nic nie wypadło za termin.
- **Nauka** — wybrane zestawy i kategorie, informacja zwrotna od razu, błędne pytania
  wracają na końcu sesji.
- **Egzamin** — 40 zadań / 60 minut / próg 50%, jak w informatorze CKE. Losowanie
  proporcjonalne do wielkości kategorii, licznik czasu, „wrócę później", wynik według kategorii.
- **Moje błędy** — pula błędów; pytanie wypada po trzech poprawnych odpowiedziach z rzędu.
- **Fiszki** — przełącznik w sesji chowa warianty A–D: czytasz pytanie, przypominasz sobie
  odpowiedź, odsłaniasz ją i oceniasz się czterema przyciskami. Działa dla każdego pytania,
  nie tylko otwartego, i liczy się do powtórek i puli błędów. Trudniejsze niż test wyboru,
  bo nie ma z czego zgadywać.
- **Statystyki** — skuteczność według kategorii, najsłabsze pytania, historia egzaminów.
- **Import przez Claude** — TXT/MD/CSV/DOCX lub wklejony tekst, szacunek kosztu przed startem,
  raport rozbieżności, ekran przeglądu z edytorem, cache po hashu.
- **Materiały wideo** — lista nagrań z YouTube, odtwarzanie oficjalnym odtwarzaczem.
  Aplikacja trzyma wyłącznie odnośniki, nie kopiuje cudzych nagrań.
- **Aktualizacje materiałów** — nowe pytania, rysunki i nagrania dochodzą bez instalowania
  aplikacji od nowa.

## Zasada nadrzędna

Poprawna odpowiedź ze źródła jest nienaruszalna. Claude nigdy jej nie zmienia — jeśli uważa,
że klucz jest błędny, zostawia go i dodaje flagę `answer_suspect` z uzasadnieniem.
Wszystko, co dopisała AI (błędne warianty, wyjaśnienia), jest oznaczone etykietą **AI**
i widoczne jako takie w trakcie nauki.

## Start

```bash
npm install
npm run dev
```

Na ekranie **Import** kliknij „Wczytaj zadania z informatorów CKE" — 52 zadania z kluczem
odpowiedzi prosto z informatorów, bez udziału AI i bez klucza API. 35 z nich ma dołączony
rysunek, schemat albo zdjęcie wycięte z oryginalnego PDF-a.

Import własnej listy wymaga klucza API Anthropic (Ustawienia → Klucz API). Klucz jest szyfrowany
przez Windows DPAPI (`safeStorage`), nie trafia do pliku ustawień, logów ani kopii zapasowej,
a renderer nigdy go nie widzi.

## Instalator Windows

Na Windows:

```bash
npm run build:win     # release/Elektryk Quiz Setup x.y.z.exe
```

Z Linuksa albo macOS budowanie instalatora wymaga wine. Prościej wziąć go z CI: każdy push na
`main` uruchamia workflow **Build**, który składa instalator na `windows-latest` i wrzuca go jako
artefakt. Tag `vX.Y.Z` dokłada instalator do wydania na GitHubie.

Powstają dwa pliki:

| Plik | Co robi |
|---|---|
| `Elektryk Quiz Setup x.y.z.exe` | Instalator NSIS. Dane w `%APPDATA%/elektryk-quiz`, więc aktualizacja aplikacji ich nie rusza |
| `Elektryk-Quiz-portable-x.y.z.exe` | Jeden plik, bez instalacji. Dane w katalogu `elektryk-quiz-dane` **obok pliku .exe** — całość działa z pendrive'a |
| `Elektryk-Quiz-x.y.z.apk` | Android, patrz niżej |

Żaden z nich nie jest podpisany cyfrowo, więc przy pierwszym uruchomieniu SmartScreen pokaże
ostrzeżenie: „Więcej informacji → Uruchom mimo to".

**Uwaga do wersji portable:** zestawy, postępy, wyniki egzaminów i ustawienia jadą razem
z plikiem. Klucz API nie — jest szyfrowany mechanizmem DPAPI powiązanym z kontem Windows,
więc po przeniesieniu na inny komputer trzeba go wpisać jeszcze raz. Nauka offline działa
bez klucza, potrzebuje go dopiero import własnych list przez Claude.

## Aktualizacje materiałów

Pytania, rysunki i lista nagrań są pobierane z serwera jako zwykłe pliki statyczne.
Aplikacja sprawdza przy starcie, czy jest nowsza wersja, i pokazuje powiadomienie
z przyciskiem do pobrania. Nauka działa dalej offline — pobrane materiały lądują lokalnie.

Nowe pytania **dochodzą**, a nie nadpisują: ID liczone jest z treści pytania, więc ponowne
wgranie tego samego zestawu nie kasuje postępów ani puli błędów.

Struktura po stronie serwera (`content/` w tym repozytorium):

```
manifest.json          # wersja, lista zestawów i nagrań
sets/<id>.json         # QuestionSet
images/<id>/*.png      # rysunki do pytań
```

```bash
npm run content        # składa paczkę; wersja rośnie tylko gdy zawartość się zmieniła
```

Domyślnie aplikacja czyta z gałęzi `main` tego repozytorium. W Ustawieniach można wskazać
**dowolny inny serwer** — wystarczy, że wystawia te trzy rzeczy po HTTPS z nagłówkiem CORS.
Żadnego kodu po stronie serwera nie trzeba: to pliki statyczne.

Postępy, wyniki egzaminów i ustawienia zostają na urządzeniu. Przeniesienie ich na serwer
wymagałoby kont i synchronizacji, a tego plan świadomie nie przewiduje.

## Android

```bash
npm run build:android    # wymaga Android SDK; w CI robi to job „android"
```

Ta sama aplikacja w WebView przez [Capacitor](https://capacitorjs.com/). Renderer jest ten sam
co w Electronie — logika nauki, SM-2, egzamin, statystyki i zestaw CKE razem z rysunkami
działają bez zmian, offline. Różni się warstwa pod spodem i układ ekranu:

- dane w `Filesystem` telefonu, w plikach o tych samych nazwach co na komputerze, więc
  kopia zapasowa przenosi się w obie strony (Ustawienia → Kopia zapasowa),
- menu boczne schodzi na dolny pasek z pięcioma zakładkami, reszta ekranów wchodzi ze Startu,
- **import własnej listy przez Claude jest wyłączony** — wymaga klucza API i dostępu do
  plików. Na telefonie wczytasz gotowy zestaw CKE albo kopię z komputera.

APK jest podpisany kluczem debugowym, więc Android poprosi o zgodę na instalację
z nieznanego źródła. Do własnego użytku wystarczy; do sklepu trzeba własnego keystore'a.

## Pozostałe polecenia

```bash
npm test              # vitest — logika nauki, import, storage
npm run seed          # ponowne wyciągnięcie zadań i rysunków z database/info/*.pdf
npm run seed:verify   # kontrola zestawu wobec PDF-ów: klucze, warianty, kompletność
npm run import -- sample-data/probka.txt    # import z linii komend, ANTHROPIC_API_KEY w środowisku
```

`seed` i `seed:verify` wymagają `poppler-utils` (`pdftotext`, `pdftoppm`).

## Rysunki z PDF-ów

Zadania na tym egzaminie regularnie odsyłają do rysunku, schematu albo tabeli, więc
`scripts/extract-informator.ts` wycina je z informatora. Rysunek to największy prostokąt
w obrębie zadania, którego nie zajmuje tekst; kandydaci są renderowani i wygrywa ten
z największą zawartością. Kadr kończy się nad linią „Odpowiedź prawidłowa", więc klucz
nigdy nie wchodzi w obraz. Tam, gdzie warianty są rysunkami, wzorami piętrowymi albo
wierszami tabeli, wycinany jest cały blok zadania razem z podpisami A–D.

## Agenci

`.claude/agents/` zawiera dwóch agentów do pracy z materiałami:

- **`weryfikator-pytan`** — sprawdza wyekstrahowane pytania wobec pliku źródłowego:
  klucz odpowiedzi porównywany po treści wariantu, halucynacje, zgubione zadania.
  Uruchamiaj po każdym imporcie, zanim zestaw trafi do nauki.
- **`import-materialow`** — wciąga nowy PDF, prezentację albo arkusz do bazy wiedzy.
  Najpierw klasyfikuje materiał, bo arkusz egzaminu praktycznego nie jest testem ABCD
  i nie wolno robić z niego pytań.

## Dane

`%APPDATA%/elektryk-quiz/data/` — zestawy, postępy, egzaminy, ustawienia, cache importu.
Zapis jest atomowy (`.tmp` → `rename`), przed nadpisaniem zostaje kopia `.bak`, a każdy odczyt
przechodzi przez zod; przy uszkodzonym pliku aplikacja wraca do `.bak`.
Kopia zapasowa: Ustawienia → Eksportuj.

## Stos

Electron + electron-vite · React + TypeScript · Tailwind v4 + [shadcn/ui](https://ui.shadcn.com/docs/installation)
· zustand · zod · vitest · `@anthropic-ai/sdk` (tylko w procesie głównym, structured outputs)
