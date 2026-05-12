# Какво е LoTTERY и защо ви засяга

## Какъв проблем решава това?

Когато се тегли жребий — например кои машини за гласуване да бъдат проверени, кои ученици да получат места в определено училище или кой печели от лотария — трябва да сте сигурни, че никой не е нагласил резултата.

Обикновено ви казват „вярвайте ни, това е случайно". Но вие нямате начин да проверите. Може да е честно. Може и да не е. Няма как да разберете.

LoTTERY решава този проблем. Това е инструмент, който провежда публични тегления така, че **всеки наблюдател може да провери** дали резултатът е честен — без да се налага да вярва на когото и да е.

## Как работи — на прост език

Представете си трима непознати, които не се доверяват един на друг. Всеки от тях избира тайно число и го запечатва в плик. Пликовете се показват публично (но все още запечатани). Едва тогава всеки разкрива числото си. Трите числа се смесват заедно, за да дадат крайния резултат.

Ако дори **един** от тримата е честен, резултатът е непредвидим.

В LoTTERY „тримата участници" са:

1. **Компютърът** — генерира случайно число на място.
2. **Интернет** — второ число идва от независим онлайн източник (random.org).
3. **Човекът** — присъстващо лице въвежда произволен текст (дума, фраза, каквото реши).

Последователността е важна:

- Първо компютърът „запечатва" своето число (публикува криптографски „отпечатък", без да разкрива самото число).
- После пристига интернет числото (също запечатано).
- Накрая човекът въвежда своя текст.
- Едва тогава всичко се разкрива и проверява.

Тази последователност означава, че никой не може да подбере своето число така, че да повлияе на крайния резултат — защото не знае какво ще дадат останалите.

Трите числа се комбинират математически. Крайният резултат зависи от всичките три. Ако поне едно е наистина случайно, крайният резултат също е случаен.

## Защо да му вярвате?

- **Не е нужно да вярвате на нито един човек или компютър.** Системата е проектирана така, че за да бъде манипулирана, **и трите** източника трябва да са в заговор. Ако дори един е честен, резултатът е честен.

- **QR кодовете са като касови бележки.** По време на церемонията се показват QR кодове. Всеки може да ги снима. Те съдържат „отпечатъците" на числата — доказателство какво е било заявено, преди резултатът да бъде известен.

- **Целият процес може да се повтори вкъщи.** Инструментът има режим „Replay" (повторение). Ако имате записаните данни от церемонията, можете да пуснете процеса отново и да проверите дали резултатите съвпадат.

- **Софтуерът е един четим файл, а не черна кутия.** Кодът е отворен, публично достъпен и достатъчно кратък, за да бъде прегледан от програмист за няколко часа.

## Как да проверите сами

1. **По време на церемонията** — снимайте QR кодовете, които се показват на екрана. Запишете и текста, въведен от човека.
2. **След церемонията** — изтеглете лог файла (записът от церемонията).
3. **Отворете копие на инструмента** и изберете режим „Replay".
4. **Въведете данните** от лога и стартирайте повторението.
5. **Сравнете резултатите.** Ако числата съвпадат с обявените — теглението е било честно. Ако не съвпадат — нещо не е наред и имате доказателство за това.

Не ви трябват специални познания. Процесът е като проверка на касова бележка — сравнявате какво е обещано с какво е доставено.

## Как би изглеждало измамата?

За да манипулира резултата, нападателят трябва **едновременно** да:

- Контролира компютъра, който генерира първото число
- Контролира интернет източника (random.org или друг)
- Контролира човека, който въвежда текста
- Направи всичко това **преди** пликовете да бъдат отворени

Ако **който и да е** от тримата участници действа честно, нападателят не може да предвиди или контролира крайния резултат.

Освен това, дори ако нападателят успее да подмени числата, той не може да скрие това от хората, които са снимали QR кодовете. Записаните „отпечатъци" няма да съвпаднат с подменените числа — и измамата ще бъде видима за всеки, който провери.

---

# What is LoTTERY and why it matters to you

## What problem does this solve?

When a draw happens — which voting machines to audit, which students get school placements, who wins a public lottery — you need to be sure nobody rigged the outcome.

Usually you're told "trust us, it's random." But you have no way to check. It might be fair. It might not. You can't tell.

LoTTERY solves this. It's a tool that runs public draws so that **any observer can verify** the result is fair — without trusting anyone.

## How it works — in plain language

Imagine three strangers who don't trust each other. Each one picks a secret number and seals it in an envelope. The sealed envelopes are shown publicly. Only then does everyone reveal their number. The three numbers are mixed together to produce the final result.

If even **one** of the three is honest, the outcome is unpredictable.

In LoTTERY, the "three participants" are:

1. **The computer** — generates a random number locally.
2. **The internet** — a second number comes from an independent online source (random.org).
3. **A human** — a person present at the ceremony types in any text they choose (a word, a phrase, anything).

The order matters:

- First, the computer "seals" its number (publishes a cryptographic "fingerprint" without revealing the number itself).
- Then the internet number arrives (also sealed).
- Finally, the human enters their text.
- Only then is everything revealed and checked.

This sequence means nobody can pick their number to influence the final result — because they don't know what the others will contribute.

The three numbers are combined mathematically. The final result depends on all three. If at least one is truly random, the final result is also random.

## Why should you trust it?

- **You don't need to trust any single person or computer.** The system is designed so that manipulation requires **all three** sources to conspire. If even one is honest, the result is honest.

- **The QR codes are like receipts.** During the ceremony, QR codes are displayed. Anyone can photograph them. They contain the "fingerprints" of the numbers — proof of what was claimed before the result was known.

- **The entire process can be re-run at home.** The tool has a "Replay" mode. If you have the recorded data from the ceremony, you can run the process again and check whether the results match.

- **The software is a single readable file, not a black box.** The code is open, publicly available, and short enough to be reviewed by a programmer in a few hours.

## How to verify yourself

1. **During the ceremony** — photograph the QR codes shown on screen. Note the text entered by the human participant.
2. **After the ceremony** — download the log file (the ceremony record).
3. **Open a copy of the tool** and select "Replay" mode.
4. **Enter the data** from the log and start the replay.
5. **Compare the results.** If the numbers match those announced — the draw was fair. If they don't — something is wrong, and you have evidence of it.

You don't need special expertise. The process is like checking a receipt — you compare what was promised with what was delivered.

## What would cheating look like?

To manipulate the result, an attacker must **simultaneously**:

- Control the computer generating the first number
- Control the internet source (random.org or another)
- Control the human entering the text
- Do all of this **before** the envelopes are opened

If **any one** of the three participants acts honestly, the attacker cannot predict or control the final result.

Furthermore, even if an attacker managed to substitute the numbers, they cannot hide this from people who photographed the QR codes. The recorded "fingerprints" won't match the substituted numbers — and the fraud will be visible to anyone who checks.
