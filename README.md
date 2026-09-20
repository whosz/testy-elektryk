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
- **Fiszki** — pytania otwarte z samooceną (cztery przyciski).
- **Statystyki** — skuteczność według kategorii, najsłabsze pytania, historia egzaminów.
- **Import przez Claude** — TXT/MD/CSV/DOCX lub wklejony tekst, szacunek kosztu przed startem,
  raport rozbieżności, ekran przeglądu z edytorem, cache po hashu.

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

Instalator nie jest podpisany cyfrowo, więc przy pierwszym uruchomieniu SmartScreen pokaże
ostrzeżenie: „Więcej informacji → Uruchom mimo to". Dane użytkownika leżą poza katalogiem
instalacji, więc aktualizacja aplikacji ich nie rusza.

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
