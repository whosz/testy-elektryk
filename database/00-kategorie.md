# Kategorie

Taksonomia do pola `category` w `Question`. Status **[W]** — podział mój, ale zbudowany z efektów kształcenia i przykładowych zadań z informatorów CKE, nie zgadywany.

Kategorie są drobniejsze niż jednostki efektów kształcenia, bo jednostka ELE.05.3 obejmuje wszystko od doboru przewodu po pomiar pętli zwarcia i statystyka z niej nic nie powie.

## Zestaw podstawowy — ELE.02 i ELE.05

Wszystkie poniższe kategorie mają przykładowe zadania w części pisemnej informatora, więc wszystkie trafiają do puli egzaminacyjnej.

| ID | Nazwa kategorii | Zakres | Jednostki |
|---|---|---|---|
| `BHP` | Bezpieczeństwo i higiena pracy | Zagrożenia przy pracach elektrycznych, środki ochrony indywidualnej i zbiorowej, organizacja stanowiska i ergonomia, polecenia pisemne i przygotowanie strefy pracy, uziemiacze przenośne, prace przy liniach wyłączonych spod napięcia, ochrona przeciwpożarowa | 02.1, 05.1 |
| `PP` | Pierwsza pomoc | Ocena stanu poszkodowanego, postępowanie po porażeniu prądem, pozycja bezpieczna, krwotoki i oparzenia | 02.1, 05.1 |
| `PE` | Podstawy elektrotechniki | Wielkości i prawa, rezystancja, pojemność i indukcyjność zastępcza, obwody jedno- i trójfazowe, moc czynna, bierna i pozorna, obliczenia w obwodach, przekładniki | 02.2, 05.2 |
| `ELN` | Elementy i układy elektroniki | Diody (w tym Zenera), tyrystory, termistory, tranzystory, sterowniki i przekształtniki, funkcje układów odczytywane ze schematu | 02.2, 05.2 |
| `SCH` | Dokumentacja i schematy | Symbole graficzne elementów, urządzeń i przyrządów pomiarowych, schematy ideowe, blokowe i montażowe, rysunek techniczny montażowy i wykonawczy, dokumentacja techniczna | 02.2, 02.3, 05.2 |
| `INST` | Instalacje elektryczne | Rodzaje instalacji, układy sieci TN‑C, TN‑S, TN‑C‑S, TT i IT, przewody i kable — rodzaje, oznaczenia i dobór przekroju wg obciążalności, spadku napięcia i warunków zwarciowych, rozdzielnice, WLZ, obwody odbiorcze, zestawienie materiałów | 02.3, 05.3 |
| `OSPRZ` | Sprzęt, osprzęt i narzędzia | Łączniki, gniazda, puszki, listwy i rury, stopnie ochrony IP, narzędzia montażowe (ściąganie powłok, zaciskanie końcówek), lokalizatory przewodów | 02.3, 05.3 |
| `OSW` | Źródła światła i oprawy | Rodzaje źródeł światła, oprawy wewnętrzne i zewnętrzne, dobór oprawy do warunków środowiskowych, obszary zastosowań | 02.3 |
| `POZ` | Ochrona przeciwporażeniowa | Ochrona podstawowa i przy uszkodzeniu, klasy ochronności, samoczynne wyłączenie zasilania, dopuszczalna impedancja pętli zwarcia, uziemienia i połączenia wyrównawcze, wyłączniki różnicowoprądowe, separacja, ocena skuteczności ochrony | 02.3, 05.3 |
| `ZAB` | Zabezpieczenia i aparatura | Dobór zabezpieczeń na podstawie obliczeń, charakterystyki wyłączników nadprądowych (B, C), zabezpieczenia silników, ochrona przeciwprzepięciowa, miejsca montażu zabezpieczeń, selektywność | 02.3, 02.4, 05.3, 05.4 |
| `POM` | Pomiary i badania | Dobór metody i przyrządu, rezystancja izolacji, rezystancja uziemienia, impedancja pętli zwarcia, ciągłość przewodów ochronnych, badanie RCD, pomiary parametrów maszyn, ocena wyników, tabele, wykresy i protokoły | 02.2, 02.3, 02.4, 05.2, 05.3, 05.4 |
| `MASZ` | Maszyny elektryczne | Transformatory, maszyny indukcyjne (klatkowe, pierścieniowe, jednofazowe), maszyny prądu stałego, synchroniczne, krokowe; budowa, podzespoły, łożyskowanie, tabliczka znamionowa, parametry, cykle pracy (S1–S8), rozruch | 02.4, 05.4 |
| `URZ` | Urządzenia, zasilanie i sterowanie | Urządzenia odbiorcze, styczniki, przekaźniki (w tym czasowe), wyłączniki silnikowe, falowniki i regulacja prędkości, układy lewo‑prawo i gwiazda‑trójkąt, sterowniki PLC, instalacje inteligentne, kompensacja mocy biernej, uruchamianie | 02.4, 05.4 |
| `EKSP` | Eksploatacja i konserwacja | Wymagania i przepisy eksploatacyjne, grupy urządzeń, prowadzenie ruchu, oględziny, przeglądy i próby, terminy, lokalizacja i przyczyny uszkodzeń, naprawa, modernizacja instalacji, dokumentacja z wykonanych prac | 02.3, 02.4, 05.3, 05.4 |
| `JOZ` | Język obcy zawodowy | Nazwy narzędzi, urządzeń i elementów po angielsku lub niemiecku, tablice i napisy ostrzegawcze, dokumentacja techniczna, karty katalogowe | 02.5, 05.5 |
| `ORG` | Organizacja pracy i kompetencje społeczne | Planowanie i czas realizacji zadań, podział ról w zespole, odpowiedzialność za podejmowane działania, etyka zawodowa, negocjacje, dobór osób do zadań | 02.6, 05.6, 05.7 |

Szesnaście kategorii. Jeśli okaże się ich za dużo na Twoją listę pytań, najpierw scal `ELN` z `PE`, a `OSW` z `OSPRZ` — to najmniejsze pule.

## Zestaw rozszerzony

Tylko jeśli Twoja lista wykracza poza ELE.02 i ELE.05.

| ID | Nazwa kategorii | Kwalifikacje |
|---|---|---|
| `SIECI` | Sieci i systemy elektroenergetyczne | ELE.06 |
| `WYTW` | Wytwarzanie energii elektrycznej i cieplnej | ELE.07 |
| `OZE` | Energetyka odnawialna | ELE.10, ELE.11 |
| `DZWIG` | Urządzenia dźwigowe | ELE.08, ELE.09 |
| `CHLOD` | Chłodnictwo, klimatyzacja, pompy ciepła | ELE.03, ELE.04 |
| `MECH` | Montaż mechaniczny i obróbka | ELE.01 |

## Do wklejenia w prompt importujący

Zestaw podstawowy, gotowy do sekcji `<kategorie>` z rozdziału 6.4 `PLAN.md`:

```
Bezpieczeństwo i higiena pracy; Pierwsza pomoc; Podstawy elektrotechniki;
Elementy i układy elektroniki; Dokumentacja i schematy; Instalacje elektryczne;
Sprzęt, osprzęt i narzędzia; Źródła światła i oprawy; Ochrona przeciwporażeniowa;
Zabezpieczenia i aparatura; Pomiary i badania; Maszyny elektryczne;
Urządzenia, zasilanie i sterowanie; Eksploatacja i konserwacja;
Język obcy zawodowy; Organizacja pracy i kompetencje społeczne
```

Claude zwraca nazwę, nie identyfikator. Mapowanie nazwy na ID rób w `pipeline.ts`, a nietrafioną nazwę traktuj jako błąd walidacji, nie jako nową kategorię.

## Granice, które najczęściej się rozmywają

Tutaj import będzie się mylił najczęściej. Warto dopisać te rozstrzygnięcia do promptu, gdy zobaczysz bałagan w raporcie.

- **`POZ` kontra `ZAB`.** Przed czym chroni dane rozwiązanie: porażenie człowieka → `POZ`, przeciążenie i zwarcie w obwodzie → `ZAB`. Wyłącznik różnicowoprądowy do `POZ`, nadprądowy do `ZAB`. Impedancja pętli zwarcia liczona po to, by sprawdzić skuteczność samoczynnego wyłączenia → `POZ`, mimo że dotyczy wyłącznika nadprądowego.
- **`POM` kontra `EKSP`.** Jak zmierzyć i jakim przyrządem → `POM`. Co ile lat, kto może i co wpisać do protokołu → `EKSP`. Pytania o oględziny (czynności bez przyrządów, przed próbami) → `EKSP`.
- **`INST` kontra `OSPRZ`.** Instalacja jako całość, jej układ i sposób wykonania → `INST`. Pojedynczy element, jego budowa i narzędzie do jego montażu → `OSPRZ`.
- **`MASZ` kontra `URZ`.** Sama maszyna — silnik, prądnica, transformator → `MASZ`. To, co ją zasila, zabezpiecza i steruje nią: stycznik, falownik, wyłącznik silnikowy, PLC → `URZ`. Dobór zabezpieczenia silnika → `ZAB`.
- **`PE` kontra `ELN`.** Prawa obwodów, moc, wartości wielkości elektrycznych → `PE`. Rozpoznanie elementu półprzewodnikowego lub funkcji układu ze schematu → `ELN`.
- **`BHP` kontra `EKSP`.** Bezpieczeństwo osoby wykonującej pracę (polecenie pisemne, strefa pracy, sprzęt ochronny) → `BHP`. Zasady utrzymania urządzenia w ruchu → `EKSP`.
