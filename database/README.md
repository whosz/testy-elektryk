# Baza wiedzy — ELE.02 i ELE.05

Katalogi wiedzy do aplikacji z `PLAN.md`, zbudowane na **informatorach o egzaminie zawodowym Centralnej Komisji Egzaminacyjnej** (część szczegółowa, kształcenie wg podstawy programowej z 2019 r., aktualizacja 25 sierpnia 2022 r.).

Te pliki nie zawierają pytań z Twojej listy. Zawierają szkielet: wymagania egzaminacyjne, podział na kategorie, format egzaminu i linki do materiałów.

## Co się zmieniło względem pierwszej wersji

Pierwsza wersja opierała się na ZPE i miała dziury oznaczone **[?]** — ZPE cytuje efekty kształcenia wybiórczo. Informatory CKE to właściwe źródło: podają wprost, co jest sprawdzane na egzaminie. Dziury są zasypane, a przy okazji wyszły trzy błędy:

- **ELE.05.3 ma dziesięć efektów, nie dziewięć.** Lista z ZPE pomijała „charakteryzuje metody lokalizacji uszkodzeń w instalacjach elektrycznych" i przesuwała numerację. Poprawione w `03-ELE-05.md`.
- **Język obcy zawodowy i kompetencje społeczne są na egzaminie pisemnym.** Wcześniej wrzuciłem je do zestawu rozszerzonego. To błąd — informatory zawierają dla nich przykładowe zadania z części pisemnej, więc trafiają do zestawu podstawowego.
- **Brakowało kategorii na oświetlenie.** ELE.02.3.4 to osobny efekt kształcenia („rozpoznaje źródła światła i oprawy oświetleniowe"), a nie podpunkt instalacji.

## Pliki

| Plik | Zawartość |
|---|---|
| `00-kategorie.md` | Taksonomia kategorii do pola `category` w `Question` |
| `01-struktura-ELE.md` | Wszystkie 11 kwalifikacji ELE z jednostkami (kontekst) |
| `02-ELE-02.md` | Wymagania egzaminacyjne ELE.02 — efekty i kryteria weryfikacji |
| `03-ELE-05.md` | Wymagania egzaminacyjne ELE.05 — efekty i kryteria weryfikacji |
| `04-zrodla.md` | Informatory CKE, materiały ZPE, bibliografia |
| `05-egzamin.md` | Format egzaminu, zadania praktyczne, wnioski dla aplikacji |

## Jak to wpiąć w aplikację

1. **Kategorie** — tabela z `00-kategorie.md` zastępuje startową listę z rozdziału 6.4 `PLAN.md`.
2. **Jednostki** — dodaj do `Question` pole `unit` (np. `"ELE.05.3"`). Po imporcie zestaw je ze statystykami: jednostka bez ani jednego pytania to dziura w przygotowaniu.
3. **Kryteria weryfikacji** — najcenniejsza rzecz w tych plikach. Kryterium mówi dosłownie, czego egzamin wymaga („dobiera przewody na podstawie obliczeń i norm", „ocenia skuteczność działania ochrony przeciwporażeniowej"). Użyj listy kryteriów jako listy kontrolnej pokrycia, a w Etapie 6 jako podstawy do generowania pytań uzupełniających tam, gdzie Twoja lista milczy.
4. **Parametry egzaminu** — z `05-egzamin.md` do ustawień: 40 pytań, 60 minut, jedna poprawna odpowiedź z czterech.

## Status weryfikacji

- **[C]** — przepisane z informatora CKE. To jest źródło rozstrzygające.
- **[Z]** — ze stron ZPE.
- **[W]** — moja propozycja (podział na kategorie, mapowania, wnioski).

Listy efektów są **kompletne w zakresie, w jakim informator je cytuje**. Informator podaje tylko te efekty i kryteria, do których dołączył przykładowe zadanie albo które sprawdza przykładowe zadanie praktyczne — więc numeracja miejscami przeskakuje. Pełne listy są w rozporządzeniu MEN w sprawie podstaw programowych kształcenia w zawodach szkolnictwa branżowego. Brakujące numery zaznaczyłem, ale ich nie zgadywałem.

## O pozostałych wgranych plikach

Z ośmiu wgranych informatorów tylko dwa dotyczą Twoich kwalifikacji:

- `Elektryk.pdf` → **ELE.02** (elektryk 741103)
- `Technik_elektryk.pdf` → **ELE.02 + ELE.05** (technik elektryk 311303)

Pozostałe sześć to inne zawody i inne kwalifikacje: elektromechanik (ELE.01), elektromechanik pojazdów samochodowych (MOT.02), elektronik (ELM.02), technik elektronik, technik elektroenergetyk transportu szynowego, technik elektroniki i informatyki medycznej (MED.07). Tematycznie częściowo się pokrywają — BHP, pierwsza pomoc, podstawy elektrotechniki, rysunek techniczny — ale **klucze odpowiedzi są z innych egzaminów**. Nie mieszaj ich z Twoim zestawem w trybie Egzamin. Jeśli chcesz ich użyć, zrób osobny zestaw „ćwiczenia dodatkowe" i wyłącz go z losowania egzaminacyjnego.

## Prawa

Informatory CKE i podstawa programowa to dokumenty urzędowe. Materiały ZPE mają własne licencje podawane przy każdym zasobie (spotykane CC BY‑SA 3.0 i CC0 1.0). Do nauki własnej bez znaczenia; przy publikacji aplikacji sprawdź każdy zasób osobno.

## Uwaga merytoryczna

Informatory opisują stan na sierpień 2022 i podstawę programową z 2019 r. Przepisy i normy w elektryce się zmieniają, a CKE co roku publikuje komunikaty. Przed egzaminem sprawdź na cke.gov.pl, czy nie ma nowszej wersji informatora dla Twojej kwalifikacji.
