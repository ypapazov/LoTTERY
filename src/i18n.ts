export type Locale = 'bg' | 'en';

const STORAGE_KEY = 'lottery-lang';

let currentLocale: Locale = 'bg';

const strings: Record<Locale, Record<string, string>> = {
  bg: {
    'app.title': 'LoTTERY — Публично проверима RNG церемония',
    'toolbar.verify': 'Проверка',
    'toolbar.ceremony': 'Церемония',
    'toolbar.presentation': 'Презентация',
    'toolbar.exit_presentation': '✕ Край на презентацията',
    'toolbar.export': 'Експорт на лог',
    'toolbar.import': 'Импорт на лог',
    'toolbar.download': 'Изтегляне на HTML',
    'toolbar.reset': 'Нулиране',

    'card.local.label': 'Локален CSRNG',
    'card.local.generate': 'Генерирай',
    'card.remote.label': 'random.org',

    'tip.seed': 'Seed (начална стойност) — 32-байтово случайно число, входен материал за генератора',
    'tip.csrng': 'CSRNG — криптографски сигурен генератор на случайни числа (вграден в браузъра)',
    'tip.commitment': 'Commitment (заключване) — криптографско „обещание" за стойност, без да я разкрива',
    'tip.salt': 'Salt — случайно число, добавено към PBKDF2, за да се предотвратят предварително изчислени атаки',
    'tip.xor': 'XOR (ексклузивно или) — побитова операция; ако поне един вход е случаен, резултатът е случаен',
    'card.remote.fetch': 'Извлечи',
    'card.remote.manual': 'Ръчно',
    'card.remote.manual_placeholder': '64 hex символа (32 байта)',
    'card.remote.manual_ok': 'ОК',
    'card.human.label': 'Човешки вход',
    'card.human.placeholder': 'Казано число…',
    'card.human.submit': 'Изпрати',

    'range.min': 'Мин',
    'range.max': 'Макс',
    'range.unique': 'Без повторения',
    'range.lock_title': 'Заключване на диапазон',
    'range.draws': 'Тегления',

    'btn.reveal': 'Разкрий seed-овете',
    'btn.verify': 'Провери заключванията',
    'btn.generate': 'Генерирай',
    'btn.generated': 'Генерирано',
    'btn.draw_next': 'Следващо теглене',

    'log.up': 'Лог ▲',
    'log.down': 'Лог ▼',
    'log.chain': 'Верига:',

    'xor.local': 'Локален',
    'xor.remote': 'Отдалечен',
    'xor.human': 'Човешки',
    'xor.combined': 'Комбиниран seed',

    'replay.notice': 'Режим на повторение / Проверка',
    'replay.local_seed': 'Локален seed',
    'replay.remote_seed': 'Отдалечен seed',
    'replay.human_input': 'Човешки вход',
    'replay.seed_placeholder': 'Hex seed (64 символа)',
    'replay.salt_placeholder': 'Salt (64 hex)',
    'replay.human_placeholder': 'Оригинална казана стойност',
    'replay.run': 'Пусни повторение',

    'processing.commitment': 'Изчисляване на криптографско заключване — това преднамерено забавяне предпазва от brute-force атаки. Моля, изчакайте…',
    'processing.fetch': 'Извличане на ентропия от random.org…',
    'processing.verify': 'Проверка на заключванията…',
    'processing.replay': 'Повторение на церемонията…',

    'info.commitment': 'Това е криптографско заключване. То доказва, че този seed е бил избран преди другите входове да бъдат получени, без да разкрива самия seed.',
    'info.human_commitment': 'Казаният вход се обработва чрез PBKDF2, за да се получи това заключване.',
    'info.rejection': 'Тази стойност е отхвърлена, защото използването ѝ би дало леко предимство на някои числа. Тегли се нова стойност за гарантиране на еднаква вероятност.',

    'error.crypto_title': 'Web Crypto API е недостъпен',
    'error.crypto_body': 'Това приложение изисква <code>crypto.subtle</code>, налично само в сигурен контекст.',
    'error.crypto_help': 'Моля, отворете файла в браузър с поддръжка на Web Crypto API. Ако ползвате Tor Browser, уверете се, че имате актуална версия на Firefox ESR.',
    'error.enter_value': 'Моля, въведете стойност',
    'error.failed_prefix': 'Грешка:',
    'error.use_manual': 'Използвайте ръчно въвеждане.',

    'confirm.reset': 'Нулиране на церемонията? Всички текущи данни ще бъдат загубени.',

    'draw.discarded': 'Отхвърлено',
    'draw.duplicate': 'Дубликат — ново теглене',
    'draw.meta': 'Теглене #{n} — {time}',
    'replay.draw_result': 'Теглене #{n}: {value}',
    'replay.rejections': '({count} отхвърляния)',
    'replay.duplicate_rejections': '({count} дубликата)',

    'import.invalid_log': 'Невалиден лог: очаква се непразен масив от записи',
    'import.chain_failed': 'Проверката на хеш-веригата е неуспешна при запис #{idx}. Продължаване?',
    'import.failed': 'Неуспешен импорт на лог:',

    'toolbar.about': 'Какво е това?',
    'toolbar.help': 'Помощ',
    'doc.title': 'LoTTERY — Документация',
    'doc.overview_title': 'Какво е LoTTERY?',
    'doc.overview': 'LoTTERY (Low-Trust Technical Excellence Random Yield) е инструмент за публично проверима RNG церемония. Генерира случайни числа по начин, в който нито един участник не може да повлияе на резултата, и всеки наблюдател може да провери коректността.',
    'doc.ceremony_flow_title': 'Ход на церемонията',
    'doc.ceremony_flow': 'Церемонията следва строга последователност от стъпки:<br><br><strong>1. Генериране на локален seed</strong> — компютърът създава 32 случайни байта и веднага ги заключва чрез commitment.<br><strong>2. Получаване на отдалечен seed</strong> — от random.org или ръчно въведен. Също се заключва.<br><strong>3. Човешки вход</strong> — участник казва число на глас. Заключва се.<br><strong>4. Заключване на диапазон</strong> — определят се Мин, Макс и дали да се допускат повторения.<br><strong>5. Разкриване</strong> — суровите seeds и човешкият вход стават видими.<br><strong>6. Проверка</strong> — приложението верифицира, че разкритите стойности съответстват на заключванията. QR лентата получава зелена рамка при успех.<br><strong>7. Теглене</strong> — генерират се числа от комбинирания seed.<br><br>Редът е от значение: всеки вход се заключва <em>преди</em> останалите да бъдат разкрити. Така никой не може да подбере своя вход, за да повлияе на резултата.',
    'doc.modes_title': 'Режими: Церемония и Проверка',
    'doc.modes': 'Инструментът има два режима, достъпни чрез бутона в лентата:<br><br><strong>Церемония</strong> — за провеждане на ново теглене. След приключване, логът може да се експортира.<br><strong>Проверка</strong> — за потвърждаване на минало теглене. Може да се импортира лог (бутонът „Импорт на лог" зарежда JSON файл и попълва всички полета автоматично) или ръчно да се въведат seeds, salts и итерации. При стартиране на повторението, приложението пресъздава тегленето и показва QR кодове за визуално сравнение с оригиналните.',
    'doc.commitment_title': 'Какво е заключване (commitment)?',
    'doc.commitment': 'Заключването (commitment) е криптографско „обещание" за дадена стойност, без тя да бъде разкрита. Използваме PBKDF2-HMAC-SHA-256 с 600 000 итерации и произволен salt. QR кодът съдържа резултата от PBKDF2, salt-а и броя итерации. Така всеки може по-късно да провери, че разкритият seed наистина съответства на даденото заключване — но преди разкриването е невъзможно да се отгатне seed-ът.',
    'doc.sources_title': 'Три източника на ентропия',
    'doc.sources': '<strong>Локален CSRNG:</strong> 32 байта от crypto.getRandomValues() — вграденият в браузъра хардуерен генератор.<br><strong>random.org:</strong> 32 байта от атмосферен шум чрез random.org API.<br><strong>Човешки вход:</strong> стойност, казана на глас от участник. Извлича се чрез PBKDF2 с детерминистичен salt (SHA-256 на "LoTTERY" + входа).<br><br>Суровите seeds на първите два източника и извлечената стойност от човешкия вход се комбинират чрез XOR. Резултатът е непредсказуем, дори ако два от трите са компрометирани — достатъчен е един честен източник.',
    'doc.xor_title': 'XOR комбиниране',
    'doc.xor': 'Суровите 32-байтови seeds (локален и отдалечен) се комбинират побитово чрез XOR с детерминистично извличане от човешкия вход: PBKDF2(вход, SHA-256("LoTTERY" || вход), 600 000 итерации).<br><br>Важно: входовете за XOR (суровите seeds) никога не са публични преди фазата на разкриване. QR кодовете показват само PBKDF2 <em>заключванията</em>, не самите входове. Ако поне един от трите източника е честен, резултатът е непредсказуем.',
    'doc.rejection_title': 'Извадка чрез отхвърляне (rejection sampling)',
    'doc.rejection': 'Когато трябва да преобразуваме случайно число от по-голямо пространство в по-малък диапазон, наивният подход (модулно деление) създава неравномерност.<br><br><strong>Пример:</strong> Имаме 3 бита (стойности 0–7) и искаме зар (1–6). С модулно деление: 0 и 6 дават зар 1, а 1 и 7 дават зар 2 — тези две страни получават двойно по-голям шанс (2/8) в сравнение с останалите (1/8).<br><br><em>Решението:</em> Ако стойността е ≥ 6, тя се отхвърля и се тегли нова. Така всяка от 6-те стойности (0–5) съответства на точно една страна на зара — равна вероятност 1/6.<br><br><em>Диаграмата по-долу показва: вляво — модулният подход с нечестна вероятност (червените колони имат 2 топки, зелените — 1). Вдясно — rejection sampling, където всяка колона има точно 1 топка, а стойности 6 и 7 се отхвърлят.</em><br><br>В лога всяко отхвърляне се записва заедно с прага (threshold), размера на пространството (output_space) и размера на диапазона (range_size), за да може математиката да бъде проверена ръчно.',
    'doc.csrng_title': 'Детерминистичен CSRNG (AES-256-CTR)',
    'doc.csrng': 'Комбинираният seed се използва като ключ за AES-256-CTR. Откритият текст и IV са нули — целият изход е детерминистичният AES keystream. Всеки, който знае комбинирания seed, може да възпроизведе точно същата последователност от числа.',
    'doc.log_title': 'Хеш-верижен лог',
    'doc.log': 'Всяко събитие в церемонията се записва в лог с формат JSON. Всеки запис съдържа:<br><br>• <strong>sequence</strong> — пореден номер<br>• <strong>timestamp</strong> — дата и час<br>• <strong>event_type</strong> — тип на събитието (напр. LOCAL_SEED_COMMITTED, NUMBER_GENERATED, VALUE_REJECTED)<br>• <strong>payload</strong> — данни за събитието<br>• <strong>chain_hash</strong> — SHA-256 хеш, изчислен от предходния хеш и текущия запис<br><br>Тази верижна структура означава, че промяна на който и да е запис разрушава веригата и се открива при проверка. За отхвърлени стойности, логът включва и суровата стойност, прага и размера на пространството — всичко необходимо за ръчна верификация.',
    'doc.qr_title': 'QR кодове',
    'doc.qr': 'QR кодовете съдържат JSON с три полета:<br><br>• <strong>pbkdf2</strong> — hex стойност на PBKDF2 резултата<br>• <strong>salt</strong> — hex стойност на salt-а<br>• <strong>iter</strong> — брой PBKDF2 итерации (600 000)<br><br>Могат да бъдат сканирани с всеки QR четец. За ръчна проверка: изчислете PBKDF2-HMAC-SHA-256(seed, salt, iter) и сравнете с pbkdf2 стойността. Под всеки QR код се показват salt-ът и броят итерации.',
    'doc.verify_title': 'Как да проверите',
    'doc.verify': '1. Сканирайте QR кодовете по време на церемонията — те съдържат данните за заключването.<br>2. Когато seed-овете бъдат разкрити, приложението ги проверява срещу заключванията.<br>3. Експортирайте лога и го импортирайте в друго копие на приложението за независимо повторение.<br>4. Проверете хеша на HTML файла срещу SHA256SUMS, подписан от организаторите.<br>5. Прегледайте изходния код — файлът не е минифициран умишлено, за да е четим.',
    'doc.offline_title': 'Офлайн използване',
    'doc.offline': 'LoTTERY е самостоятелен HTML файл — не зависи от сървър. Може да бъде изтеглен и използван офлайн, включително от USB устройство или в TAILS среда.<br><br>Преди използване, проверете SHA-256 хеша на файла срещу публикувания SHA256SUMS. Бутонът „Изтегляне на HTML" записва копие на текущо заредения файл.',
    'doc.glossary_title': 'Речник',
    'doc.glossary': '<dl><dt><strong>Seed</strong> (начална стойност)</dt><dd>32-байтово случайно число, използвано като входен материал. Комбинацията от трите seeds определя цялата последователност от числа.</dd><dt><strong>Commitment</strong> (заключване)</dt><dd>Криптографско „обещание" — доказва, че дадена стойност е избрана, без да я разкрива. Реализирано чрез PBKDF2-HMAC-SHA-256.</dd><dt><strong>Salt</strong></dt><dd>Случайно число, добавено към входа на PBKDF2, за да се предотвратят предварително изчислени атаки.</dd><dt><strong>PBKDF2</strong> (Password-Based Key Derivation Function 2)</dt><dd>Бавна функция за извличане на ключ. 600 000 итерации правят обратното изчисление непрактично.</dd><dt><strong>XOR</strong> (ексклузивно или)</dt><dd>Побитова операция за комбиниране на seeds. Ако поне един вход е случаен, резултатът е случаен.</dd><dt><strong>CSRNG</strong> (Cryptographically Secure Random Number Generator)</dt><dd>Генератор на криптографски сигурни случайни числа. Тук: AES-256-CTR keystream, инициализиран с комбинирания seed.</dd><dt><strong>Rejection sampling</strong> (извадка чрез отхвърляне)</dt><dd>Метод за премахване на модулно отклонение: стойности извън прага се отхвърлят, за да се гарантира равна вероятност.</dd><dt><strong>SHA-256</strong></dt><dd>Криптографска хеш функция с 256-битов изход. Използва се за хеш-веригата на лога и за проверка на целостта на файловете.</dd><dt><strong>SRI</strong> (Subresource Integrity)</dt><dd>Механизъм, при който браузърът проверява хеша на заредения скрипт срещу очакван хеш. Предотвратява подмяна на кода.</dd><dt><strong>CSP</strong> (Content Security Policy)</dt><dd>Политика, ограничаваща какъв код може да изпълни браузърът. Само скриптове и стилове с изрично посочен SHA-256 хеш се допускат.</dd></dl>',
    'doc.project_link': 'Проект и материали за проверка →',
  },

  en: {
    'app.title': 'LoTTERY — Public Verifiable RNG Ceremony',
    'toolbar.verify': 'Verify',
    'toolbar.ceremony': 'Ceremony',
    'toolbar.presentation': 'Presentation',
    'toolbar.exit_presentation': '✕ Exit Presentation',
    'toolbar.export': 'Export Log',
    'toolbar.import': 'Import Log',
    'toolbar.download': 'Download HTML',
    'toolbar.reset': 'Reset',

    'card.local.label': 'Local CSRNG',
    'card.local.generate': 'Generate',
    'card.remote.label': 'random.org',

    'tip.seed': 'Seed \u2014 a 32-byte random number used as input material for the generator',
    'tip.csrng': 'CSRNG \u2014 Cryptographically Secure Random Number Generator (built into the browser)',
    'tip.commitment': 'Commitment \u2014 a cryptographic "pledge" to a value without revealing it',
    'tip.salt': 'Salt \u2014 a random number added to PBKDF2 to prevent precomputed attacks',
    'tip.xor': 'XOR (exclusive or) \u2014 bitwise operation; if at least one input is random, the result is random',
    'card.remote.fetch': 'Fetch',
    'card.remote.manual': 'Manual',
    'card.remote.manual_placeholder': '64 hex chars (32 bytes)',
    'card.remote.manual_ok': 'OK',
    'card.human.label': 'Human Input',
    'card.human.placeholder': 'Spoken number…',
    'card.human.submit': 'Submit',

    'range.min': 'Min',
    'range.max': 'Max',
    'range.unique': 'No repeats',
    'range.lock_title': 'Lock range',
    'range.draws': 'Draws',

    'btn.reveal': 'Reveal Seeds',
    'btn.verify': 'Verify Commitments',
    'btn.generate': 'Generate',
    'btn.generated': 'Generated',
    'btn.draw_next': 'Draw Next',

    'log.up': 'Log ▲',
    'log.down': 'Log ▼',
    'log.chain': 'Chain:',

    'xor.local': 'Local',
    'xor.remote': 'Remote',
    'xor.human': 'Human',
    'xor.combined': 'Combined Seed',

    'replay.notice': 'Replay / Verification Mode',
    'replay.local_seed': 'Local Seed',
    'replay.remote_seed': 'Remote Seed',
    'replay.human_input': 'Human Input',
    'replay.seed_placeholder': 'Hex seed (64 chars)',
    'replay.salt_placeholder': 'Salt (64 hex)',
    'replay.human_placeholder': 'Original spoken value',
    'replay.run': 'Run Replay',

    'processing.commitment': 'Computing cryptographic commitment \u2014 this deliberate delay prevents brute-force attacks. Please wait\u2026',
    'processing.fetch': 'Fetching entropy from random.org\u2026',
    'processing.verify': 'Verifying commitments\u2026',
    'processing.replay': 'Replaying ceremony\u2026',

    'info.commitment': 'This is a cryptographic lock. It proves this seed was chosen before other inputs were received, without revealing the seed itself.',
    'info.human_commitment': 'The spoken input is processed through PBKDF2 to produce this commitment.',
    'info.rejection': 'This value was discarded because using it would slightly favor some numbers over others. A new value is drawn to ensure every number in the range has exactly equal probability.',

    'error.crypto_title': 'Web Crypto API Unavailable',
    'error.crypto_body': 'This application requires <code>crypto.subtle</code>, which is only available in secure contexts.',
    'error.crypto_help': 'Please open this file in a browser that supports the Web Crypto API. If using Tor Browser, ensure you are running a recent version based on Firefox ESR.',
    'error.enter_value': 'Please enter a value',
    'error.failed_prefix': 'Failed:',
    'error.use_manual': 'Use manual entry.',
    'confirm.reset': 'Reset the ceremony? All current data will be lost.',

    'draw.discarded': 'Discarded',
    'draw.duplicate': 'Duplicate \u2014 re-drawing',
    'draw.meta': 'Draw #{n} \u2014 {time}',
    'replay.draw_result': 'Draw #{n}: {value}',
    'replay.rejections': '({count} rejections)',
    'replay.duplicate_rejections': '({count} duplicates)',

    'import.invalid_log': 'Invalid log: expected a non-empty array of entries',
    'import.chain_failed': 'Log chain verification failed at entry #{idx}. Continue anyway?',
    'import.failed': 'Failed to import log:',

    'toolbar.about': 'What is this?',
    'toolbar.help': 'Help',
    'doc.title': 'LoTTERY — Documentation',
    'doc.overview_title': 'What is LoTTERY?',
    'doc.overview': 'LoTTERY (Low-Trust Technical Excellence Random Yield) is a publicly verifiable RNG ceremony tool. It generates random numbers in a way where no single participant can influence the outcome, and any observer can verify correctness.',
    'doc.ceremony_flow_title': 'Ceremony Flow',
    'doc.ceremony_flow': 'The ceremony follows a strict sequence of steps:<br><br><strong>1. Generate local seed</strong> \u2014 the computer creates 32 random bytes and immediately locks them via a commitment.<br><strong>2. Receive remote seed</strong> \u2014 from random.org or entered manually. Also locked.<br><strong>3. Human input</strong> \u2014 a participant speaks a number aloud. Locked.<br><strong>4. Lock range</strong> \u2014 set Min, Max, and whether repeats are allowed.<br><strong>5. Reveal</strong> \u2014 raw seeds and human input become visible.<br><strong>6. Verify</strong> \u2014 the application checks that revealed values match commitments. The QR strip turns green on success.<br><strong>7. Draw</strong> \u2014 numbers are generated from the combined seed.<br><br>The order matters: each input is locked <em>before</em> the others are revealed. This prevents anyone from choosing their input to influence the result.',
    'doc.modes_title': 'Modes: Ceremony & Verify',
    'doc.modes': 'The tool has two modes, accessible via the toolbar button:<br><br><strong>Ceremony</strong> \u2014 for conducting a new draw. After completion, the log can be exported.<br><strong>Verify</strong> \u2014 for confirming a past draw. You can import a log (the \u201cImport Log\u201d button loads a JSON file and populates all fields automatically) or manually enter seeds, salts, and iterations. When replay is started, the application recreates the draw and displays QR codes for visual comparison with the originals.',
    'doc.commitment_title': 'What is a Commitment?',
    'doc.commitment': 'A commitment is a cryptographic "pledge" to a value without revealing it. We use PBKDF2-HMAC-SHA-256 with 600,000 iterations and a random salt. The QR code contains the PBKDF2 output, the salt, and the iteration count. Anyone can later verify that the revealed seed matches its commitment \u2014 but before the reveal, guessing the seed is computationally infeasible.',
    'doc.sources_title': 'Three Entropy Sources',
    'doc.sources': '<strong>Local CSRNG:</strong> 32 bytes from crypto.getRandomValues() \u2014 the browser\'s built-in hardware RNG.<br><strong>random.org:</strong> 32 bytes of atmospheric noise via the random.org API.<br><strong>Human Input:</strong> A value spoken aloud by a participant. Derived via PBKDF2 with a deterministic salt (SHA-256 of "LoTTERY" + input).<br><br>The raw seeds of the first two sources and the human input derivation are combined via XOR. The result is unpredictable even if two of the three are compromised \u2014 one honest source is sufficient.',
    'doc.xor_title': 'XOR Combination',
    'doc.xor': 'The raw 32-byte seeds (local and remote) are combined bitwise via XOR with a deterministic derivation of the human input: PBKDF2(input, SHA-256("LoTTERY" || input), 600,000 iterations).<br><br>Crucially: the XOR inputs (raw seeds) are never public before the reveal phase. The QR codes display only PBKDF2 <em>commitments</em>, not the XOR inputs themselves. If at least one of the three sources is honest, the combined seed is unpredictable.',
    'doc.rejection_title': 'Rejection Sampling',
    'doc.rejection': 'When we need to map a random value from a larger space into a smaller range, the naive approach (modular division) creates non-uniformity.<br><br><strong>Example:</strong> We have 3 bits (values 0\u20137) and want a die roll (1\u20136). With modulo: 0 and 6 both map to die face 1, and 1 and 7 both map to face 2 \u2014 those two faces get double the chance (2/8) compared to the rest (1/8).<br><br><em>The fix:</em> If the value is \u2265 6, discard it and draw again. Now each of the 6 values (0\u20135) maps to exactly one die face \u2014 equal probability 1/6.<br><br><em>The diagram below shows: left \u2014 the modulo approach with unfair probability (red columns have 2 balls, green have 1). Right \u2014 rejection sampling, where every column has exactly 1 ball, and values 6 and 7 are rejected.</em><br><br>In the log, every rejection is recorded along with the threshold, output space, and range size, so the math can be independently checked.',
    'doc.csrng_title': 'Deterministic CSRNG (AES-256-CTR)',
    'doc.csrng': 'The combined seed is used as the key for AES-256-CTR. Plaintext and IV are zeros \u2014 the entire output is the deterministic AES keystream. Anyone who knows the combined seed can reproduce exactly the same sequence of numbers.',
    'doc.log_title': 'Hash-Chained Log',
    'doc.log': 'Every ceremony event is recorded in a JSON log. Each entry contains:<br><br>\u2022 <strong>sequence</strong> \u2014 ordinal number<br>\u2022 <strong>timestamp</strong> \u2014 date and time<br>\u2022 <strong>event_type</strong> \u2014 e.g. LOCAL_SEED_COMMITTED, NUMBER_GENERATED, VALUE_REJECTED<br>\u2022 <strong>payload</strong> \u2014 event-specific data<br>\u2022 <strong>chain_hash</strong> \u2014 SHA-256 hash computed from the previous hash and the current entry<br><br>This chain structure means modifying any entry breaks the chain and is detected during verification. For rejected values, the log includes the raw value, threshold, and output space \u2014 everything needed for manual verification.',
    'doc.qr_title': 'QR Codes',
    'doc.qr': 'The QR codes contain JSON with three fields:<br><br>\u2022 <strong>pbkdf2</strong> \u2014 hex value of the PBKDF2 output<br>\u2022 <strong>salt</strong> \u2014 hex value of the salt<br>\u2022 <strong>iter</strong> \u2014 number of PBKDF2 iterations (600,000)<br><br>They can be scanned with any QR reader. To verify manually: compute PBKDF2-HMAC-SHA-256(seed, salt, iter) and compare with the pbkdf2 value. The salt and iteration count are also displayed below each QR code.',
    'doc.verify_title': 'How to Verify',
    'doc.verify': '1. Scan the QR codes during the ceremony \u2014 they contain commitment data.<br>2. When seeds are revealed, the application verifies them against the commitments.<br>3. Export the log and import it into another copy of the application for independent replay.<br>4. Check the HTML file hash against SHA256SUMS, signed by the organizers.<br>5. Review the source code \u2014 the file is intentionally unminified to be human-readable.',
    'doc.offline_title': 'Offline Use',
    'doc.offline': 'LoTTERY is a self-contained HTML file \u2014 it does not depend on a server. It can be downloaded and used offline, including from a USB drive or in a TAILS environment.<br><br>Before use, verify the SHA-256 hash of the file against the published SHA256SUMS. The \u201cDownload HTML\u201d button saves a copy of the currently loaded file.',
    'doc.glossary_title': 'Glossary',
    'doc.glossary': '<dl><dt><strong>Seed</strong> (initial value)</dt><dd>A 32-byte random number used as input material. The combination of all three seeds determines the entire sequence of drawn numbers.</dd><dt><strong>Commitment</strong></dt><dd>A cryptographic \u201cpledge\u201d \u2014 proves a value was chosen without revealing it. Implemented via PBKDF2-HMAC-SHA-256.</dd><dt><strong>Salt</strong></dt><dd>A random number added to the PBKDF2 input to prevent precomputed attacks.</dd><dt><strong>PBKDF2</strong> (Password-Based Key Derivation Function 2)</dt><dd>A deliberately slow key derivation function. 600,000 iterations make reverse computation impractical.</dd><dt><strong>XOR</strong> (exclusive or)</dt><dd>A bitwise operation for combining seeds. If at least one input is random, the result is random.</dd><dt><strong>CSRNG</strong> (Cryptographically Secure Random Number Generator)</dt><dd>A generator producing cryptographically secure random numbers. Here: AES-256-CTR keystream initialized with the combined seed.</dd><dt><strong>Rejection sampling</strong></dt><dd>A method to eliminate modulo bias: values above a threshold are discarded to guarantee equal probability.</dd><dt><strong>SHA-256</strong></dt><dd>A cryptographic hash function producing a 256-bit output. Used for the log hash chain and file integrity verification.</dd><dt><strong>SRI</strong> (Subresource Integrity)</dt><dd>A mechanism where the browser verifies a loaded script\u2019s hash against an expected hash. Prevents code tampering.</dd><dt><strong>CSP</strong> (Content Security Policy)</dt><dd>A policy restricting what code the browser may execute. Only scripts and styles with an explicitly listed SHA-256 hash are allowed.</dd></dl>',
    'doc.project_link': 'Project & verification materials \u2192',
  },
};

export function t(key: string, params?: Record<string, string | number>): string {
  let str = strings[currentLocale][key] ?? strings.en[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      str = str.replace(`{${k}}`, String(v));
    }
  }
  return str;
}

export function getLocale(): Locale {
  return currentLocale;
}

export function setLocale(locale: Locale): void {
  currentLocale = locale;
  document.documentElement.lang = locale;
  try { localStorage.setItem(STORAGE_KEY, locale); } catch { /* noop */ }
  applyDOMTranslations();
}

export function initI18n(): void {
  let stored: string | null = null;
  try { stored = localStorage.getItem(STORAGE_KEY); } catch { /* noop */ }
  if (stored === 'en' || stored === 'bg') {
    currentLocale = stored;
  }
  document.documentElement.lang = currentLocale;
  document.title = t('app.title');
  applyDOMTranslations();
}

function applyDOMTranslations(): void {
  document.title = t('app.title');

  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n')!;
    el.textContent = t(key);
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder')!;
    (el as HTMLInputElement).placeholder = t(key);
  });

  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.getAttribute('data-i18n-title')!;
    (el as HTMLElement).title = t(key);
  });

  document.querySelectorAll('[data-i18n-html]').forEach(el => {
    const key = el.getAttribute('data-i18n-html')!;
    el.innerHTML = t(key);
  });
}
