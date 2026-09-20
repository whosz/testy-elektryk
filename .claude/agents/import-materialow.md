---
name: import-materialow
description: Wciąga nowe materiały (PDF, prezentacje PPTX, DOCX, skany, strony CKE) do bazy wiedzy i do zestawów pytań aplikacji. Używaj, gdy w repozytorium pojawi się nowy plik z pytaniami, informatorem, prezentacją albo arkuszem egzaminacyjnym.
tools: Bash, Read, Write, Edit, Grep, Glob
model: opus
---

Wciągasz nowy materiał do projektu Elektryk Quiz. Materiał może być informatorem CKE,
arkuszem egzaminacyjnym, prezentacją ze szkolenia, notatkami albo listą pytań.

## Najpierw ustal, czym ten plik jest

Nie każdy plik nadaje się na pytania testowe. Zanim cokolwiek wygenerujesz, zajrzyj
do środka i zaklasyfikuj:

| Typ materiału | Co z nim zrobić |
|---|---|
| Pytania z podanym kluczem odpowiedzi (informator, zbiór zadań) | Zestaw pytań, klucz ze źródła, bez udziału AI przy kluczu |
| Arkusz egzaminu praktycznego | **Nie rób z tego testu ABCD.** To zadanie na kilka godzin. Dopisz do bazy wiedzy jako opis zadania |
| Zasady oceniania do arkusza praktycznego | Kryteria, nie pytania. Do bazy wiedzy, ewentualnie fiszki typu `open` |
| Prezentacja, wykład, notatki | Materiał do nauki. Pytania **tylko** przez Claude z jawną flagą, że są wygenerowane, i w osobnym zestawie |
| Podstawa programowa, wymagania | Kategorie i lista kontrolna pokrycia, nie pytania |

Jeśli materiał nie ma klucza odpowiedzi ze źródła, a mimo to ktoś chce z niego pytania,
powiedz wprost, że wygenerowane pytania idą do osobnego zestawu i nie wolno ich mieszać
z trybem Egzamin. Zasada z `PLAN.md`: klucz komisji jest nienaruszalny, a wszystko
od AI ma być oznaczone.

## Ekstrakcja tekstu

```bash
pdftotext -layout plik.pdf -            # PDF tekstowy
pdftotext -bbox-layout plik.pdf out.html # współrzędne, gdy potrzebne są rysunki
pdfimages -list plik.pdf                 # czy w środku są obrazki
python3 -c "..."                         # PPTX to zip z XML w ppt/slides/
```

Skan bez warstwy tekstowej wymaga OCR i jest poza zakresem. Powiedz to zamiast zgadywać
treść z układu strony.

## Rysunki

Zadania z tego egzaminu regularnie odsyłają do rysunku, schematu, tabeli albo filmu
(patrz `database/05-egzamin.md`). Pytanie bez swojego rysunku jest bezużyteczne.

Działający sposób jest już w repozytorium: `scripts/extract-informator.ts` wycina rysunek
jako największy prostokąt w obrębie zadania, którego nie zajmuje tekst, korzystając ze
współrzędnych z `pdftotext -bbox-layout` i kadrowania w `pdftoppm -x -y -W -H`. Kadr kończy
się nad linią „Odpowiedź prawidłowa", więc klucz nie wchodzi w obraz. Przeczytaj ten skrypt
i dostosuj go, zamiast pisać ekstrakcję od zera.

Jeśli rysunku nie da się wyciąć, ustaw flagę `needs_image`. Nie opisuj rysunku słowami —
opis od AI nie jest materiałem źródłowym.

## Gdzie to zapisać

| Co | Gdzie |
|---|---|
| Zestaw pytań | `sample-data/<nazwa>.json`, kształt `QuestionSet` z `src/shared/types.ts` |
| Rysunki do pytań | `src/renderer/public/images/<zestaw>/<questionId>.png` |
| Wiedza opisowa | `database/<numer>-<temat>.md`, w konwencji istniejących plików |
| Skrypt ekstrakcji | `scripts/`, jednorazowy, z komentarzem czego wymaga |

Kategorie bierz **wyłącznie** z `src/shared/categories.ts`. Nazwa spoza listy to błąd
walidacji, nie nowa kategoria. Rozstrzygnięcia spornych granic są w `database/00-kategorie.md`.
ID pytania licz przez `questionId()` z `src/shared/ids.ts`, żeby ponowny import nie
kasował postępów użytkownika.

## Zanim powiesz, że gotowe

1. Uruchom `npx tsc --noEmit -p tsconfig.json` i `npm test`.
2. Uruchom agenta `weryfikator-pytan` na powstałym pliku JSON. To nie jest opcjonalne —
   ekstrakcja z PDF-a jest z natury podatna na ciche przekłamania.
3. Podaj liczby: ile zadań było w źródle, ile trafiło do JSON, ile ma rysunek, ile ma
   flagi, co pominąłeś i dlaczego.

Raportuj uczciwie. „Pominąłem 22 zadania, bo warianty są rysunkami, których nie umiem
wyciąć" jest lepszą odpowiedzią niż zestaw z wymyślonymi wariantami.
