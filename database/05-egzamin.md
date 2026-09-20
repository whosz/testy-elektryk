# Format egzaminu i zadania praktyczne

Status **[C]** — z informatorów CKE.

## Część pisemna

Ta sama dla ELE.02 i ELE.05, i zresztą dla wszystkich kwalifikacji w formule 2019:

| Parametr | Wartość |
|---|---|
| Czas | 60 minut |
| Liczba zadań | 40, wszystkie zamknięte |
| Odpowiedzi | 4 warianty, dokładnie jedna poprawna |
| Punktacja | 1 pkt za zadanie, maksymalnie 40 pkt |
| Forma | test na sali egzaminacyjnej, w elektronicznym systemie przeprowadzania egzaminu |

**Ustawienia w aplikacji** (rozdział 2 i 5.1 `PLAN.md`):

```
exam: { questionCount: 40, timeLimitMin: 60, passThresholdPct: 50 }
```

Próg 50% wynika z ogólnych zasad egzaminu zawodowego, a nie z części szczegółowej informatora — zweryfikuj go w części ogólnej informatora na cke.gov.pl, zanim go zaklepiesz.

To rozstrzyga też pytanie z rozdziału 2 planu: **egzamin jest pisemny, w formie testu jednokrotnego wyboru z czterema wariantami**. Typ `single_choice` jest więc typem domyślnym przy imporcie, a `open` i `multi_choice` to wyjątki, które warto oznaczyć jako `ambiguous` do przejrzenia.

## Elektroniczny system egzaminu — co z tego wynika dla treningu

Test jest rozwiązywany na komputerze, a część zadań opiera się na materiale, którego nie da się wydrukować:

- **filmy** — w ELE.02 badanie wyłącznika różnicowoprądowego miernikiem MPI‑530, w ELE.05 rozpoznanie czynności kontrolnej instalacji,
- **zdjęcia i rysunki** — narzędzia, łożyska, oprawy, kable, aparaty w rozdzielnicy, uszkodzona puszka instalacyjna,
- **schematy i tabele** — układy pomiarowe, tabliczki zaciskowe, tabele obciążalności, wyniki pomiarów.

Konsekwencja dla aplikacji: flaga `needs_image` z rozdziału 5.1 `PLAN.md` nie jest przypadkiem brzegowym, tylko regularnym elementem tego egzaminu. Każde pytanie odwołujące się do „rysunku", „schematu", „tabeli" czy „filmu" bez dołączonej ilustracji jest bezużyteczne w trybie nauki i mylące w trybie egzaminu. Trzy rzeczy do zrobienia w Etapie 4:

1. Prompt importujący ma nakładać `needs_image` na każde pytanie z takim odwołaniem — reguła 9 to już przewiduje.
2. Ekran przeglądu ma mieć filtr „wymaga obrazka" i licznik, żebyś widział skalę problemu od razu po imporcie.
3. Pytania z `needs_image` bez dołączonego pliku warto domyślnie wyłączyć z trybu Egzamin i pokazywać tylko w Nauce, z widocznym ostrzeżeniem. Inaczej wynik testu będzie zaniżony z powodów technicznych, nie merytorycznych.

## Część praktyczna

| Kwalifikacja | Model | Czas | Liczba ocenianych rezultatów |
|---|---|---|---|
| ELE.02 | w | 180 minut | 6 |
| ELE.05 | — | — | patrz niżej |

### ELE.02 — przykładowe zadanie

Montaż instalacji elektrycznej w listwach na ścianie montażowej oraz układu zasilania i sterowania silnikiem indukcyjnym jednofazowym na płycie montażowej. Elementy: wyłącznik nadprądowy S301 B6, wyłącznik silnikowy, stycznik, przycisk rozwierny S0, przycisk zwierny S1, złączka szynowa, silnik jednofazowy. Przewody wskazane co do typu i przekroju: YDYżo 3×2,5, LgY 2,5 i 1,5, DY 1,5 i 2,5, OWYżo 3×2,5. Do tego: uzupełnienie schematu montażowego z oznaczeniem kolorów izolacji, zaciskanie końcówek tulejkowych, nastawa prądu zadziałania wyłącznika silnikowego i wypełnienie karty oceny.

Karta oceny sprawdza między innymi zadziałanie przycisku TEST wyłącznika różnicowoprądowego, świecenie lampek kontrolnych obwodów po załączeniu zabezpieczeń, działanie łącznika oprawy, ciągłość przewodu ochronnego na trzech odcinkach (listwa PE – gniazdo, listwa PE – oprawa, PE wtyczki – PE silnika) oraz kierunek obrotów wału.

**Inne zadania praktyczne ELE.02 mogą dotyczyć:** wykonania instalacji z elementami instalacji inteligentnej; pomiaru parametrów instalacji, maszyn i urządzeń; sprawdzania zabezpieczeń i działania środków ochrony przeciwporażeniowej; sporządzenia schematu montażowego z ideowego i wykonania fragmentu instalacji; wykrycia rodzaju i miejsca uszkodzenia, wymiany elementów i sprawdzenia po montażu; naprawy silników, prądnic i transformatorów; montażu układów sterowania i zabezpieczania maszyn; uruchomienia maszyn po montażu.

### ELE.05 — czego dotyczy

Zadanie praktyczne obejmuje pomiary oraz naprawę i modyfikację instalacji elektrycznej, wraz z wykazem urządzeń, materiałów, narzędzi i przyrządów niezbędnych do ich wykonania.

**Inne zadania praktyczne ELE.05 mogą dotyczyć:** naprawy i dopuszczenia do eksploatacji silników trójfazowych klatkowych i pierścieniowych, jednofazowych z kondensatorem roboczym oraz komutatorowych prądu stałego; naprawy i dopuszczenia generatorów; naprawy i dopuszczenia transformatorów; analizy protokołów i opisu działania instalacji różnych typów; lokalizacji i usunięcia usterki w instalacji oraz w maszynach i urządzeniach; uruchomienia i eksploatacji układów zasilania i sterowania silnikami (lewo‑prawo, gwiazda‑trójkąt); badania instalacji i skuteczności ochrony przeciwporażeniowej — rezystancja izolacji, rezystancja uziemień, ciągłość przewodów ochronnych, impedancja pętli zwarcia, wyłączniki różnicowoprądowe, sprawdzanie samoczynnego wyłączania napięcia; doboru kondensatorów do kompensacji mocy biernej dla zadanych warunków pracy silników indukcyjnych; modyfikacji stycznikowo‑przekaźnikowego układu sterowania silnika przez wprowadzenie sterownika PLC (np. lewo‑prawo, gwiazda‑trójkąt); modyfikacji instalacji przez zastosowanie elementów instalacji inteligentnej; bezpieczeństwa i higieny pracy.

### Co z tego wynika dla aplikacji

Te listy to gotowy zestaw tematów, które **na pewno** pojawią się na egzaminie, choćby w części pisemnej jako pytania o narzędzia, kolejność czynności i wartości graniczne. Trzy zastosowania:

- **Kontrola pokrycia.** Zestaw listy z kategoriami. Jeśli Twoja lista pytań nie dotyka kompensacji mocy biernej ani sterowników PLC, a zdajesz ELE.05, to jest luka.
- **Generowanie pytań uzupełniających** w Etapie 6. Zamiast prosić Claude o „pytania z elektryki", podaj mu kryterium weryfikacji i temat z tej listy. Trzymaj je w osobnym zestawie, oznaczonym jako wygenerowane, i nie mieszaj z Twoim kluczem egzaminacyjnym.
- **Tryb fiszek dla procedur.** Kolejności czynności (uziemianie, dopuszczenie do pracy, oględziny przed próbami, montaż stycznika) słabo działają jako pytania ABCD, a dobrze jako pytania otwarte z samooceną. Przy imporcie warto je oznaczyć typem `open`.

## Terminy i formalności

Ze strony ZPE o egzaminie zawodowym: terminy ogłasza Dyrektor Centralnej Komisji Egzaminacyjnej w komunikacie publikowanym co roku w sierpniu. Deklarację składa się do 15 września, gdy termin główny wypada między 2 listopada a 28 lutego, albo do 7 lutego, gdy wypada między 1 kwietnia a 31 sierpnia.

Datę egzaminu wpisz w ustawieniach aplikacji (`examDate`) — od niej liczy się skracanie odstępów powtórek opisane w rozdziale 7.2 `PLAN.md`.
