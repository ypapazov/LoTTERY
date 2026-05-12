export type Locale = 'bg' | 'en';

const STORAGE_KEY = 'lottery-lang';

let currentLocale: Locale = 'bg';

const strings: Record<Locale, Record<string, string>> = {
  bg: {
    'app.title': 'LoTTERY — Публично проверима RNG церемония',
    'toolbar.replay': 'Повторение',
    'toolbar.live': 'На живо',
    'toolbar.presentation': 'Презентация',
    'toolbar.exit_presentation': '✕ Край на презентацията',
    'toolbar.export': 'Експорт на лог',
    'toolbar.import': 'Импорт на лог',
    'toolbar.download': 'Изтегляне на HTML',
    'toolbar.reset': 'Нулиране',

    'card.local.label': 'Локален CSRNG',
    'card.local.generate': 'Генерирай',
    'card.remote.label': 'random.org',
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
    'doc.commitment_title': 'Какво е заключване (commitment)?',
    'doc.commitment': 'Заключването (commitment) е криптографско „обещание" за дадена стойност, без тя да бъде разкрита. Използваме PBKDF2-HMAC-SHA-256 с 600 000 итерации и произволен salt. QR кодът съдържа резултата от PBKDF2, salt-а и броя итерации. Така всеки може по-късно да провери, че разкритият seed наистина съответства на даденото заключване — но преди разкриването е невъзможно да се отгатне seed-ът.',
    'doc.sources_title': 'Три източника на ентропия',
    'doc.sources': '<strong>Локален CSRNG:</strong> 32 байта от crypto.getRandomValues() — вграденият в браузъра хардуерен генератор.<br><strong>random.org:</strong> 32 байта от атмосферен шум чрез random.org API.<br><strong>Човешки вход:</strong> стойност, казана на глас от участник. Извлича се чрез PBKDF2 с детерминистичен salt (SHA-256 на "LoTTERY" + входа).<br><br>Суровите seeds на първите два източника и извлечената стойност от човешкия вход се комбинират чрез XOR. Резултатът е непредсказуем, дори ако два от трите са компрометирани — достатъчен е един честен източник.',
    'doc.xor_title': 'XOR комбиниране',
    'doc.xor': 'Суровите 32-байтови seeds (локален и отдалечен) се комбинират побитово чрез XOR с детерминистично извличане от човешкия вход: PBKDF2(вход, SHA-256("LoTTERY" || вход), 600 000 итерации).<br><br>Важно: входовете за XOR (суровите seeds) никога не са публични преди фазата на разкриване. QR кодовете показват само PBKDF2 <em>заключванията</em>, не самите входове. Ако поне един от трите източника е честен, резултатът е непредсказуем.',
    'doc.rejection_title': 'Извадка чрез отхвърляне (rejection sampling)',
    'doc.rejection': 'Когато трябва да преобразуваме случайно число от по-голямо пространство в по-малък диапазон, наивният подход (модулно деление) създава неравномерност.<br><br><strong>Пример:</strong> Имаме 3 бита (стойности 0–7) и искаме зар (1–6). С модулно деление: 0 и 6 дават зар 1, а 1 и 7 дават зар 2 — тези две страни получават двойно по-голям шанс (2/8) в сравнение с останалите (1/8).<br><br><em>Решението:</em> Ако стойността е ≥ 6, тя се отхвърля и се тегли нова. Така всяка от 6-те стойности (0–5) съответства на точно една страна на зара — равна вероятност 1/6.<br><br><em>Диаграмата по-долу показва: вляво — модулният подход с нечестна вероятност (червените колони имат 2 топки, зелените — 1). Вдясно — rejection sampling, където всяка колона има точно 1 топка, а стойности 6 и 7 се отхвърлят.</em>',
    'doc.csrng_title': 'Детерминистичен CSRNG (AES-256-CTR)',
    'doc.csrng': 'Комбинираният seed се използва като ключ за AES-256-CTR. Откритият текст и IV са нули — целият изход е детерминистичният AES keystream. Всеки, който знае комбинирания seed, може да възпроизведе точно същата последователност от числа.',
    'doc.log_title': 'Хеш-верижен лог',
    'doc.log': 'Всяко събитие в церемонията се записва в лог. Всеки запис включва SHA-256 хеш, изчислен от предходния хеш и текущия запис, формирайки неразривна верига. Промяна на който и да е запис разрушава веригата и се открива при проверка.',
    'doc.verify_title': 'Как да проверите',
    'doc.verify': '1. Сканирайте QR кодовете по време на церемонията — те съдържат данните за заключването.<br>2. Когато seed-овете бъдат разкрити, приложението ги проверява срещу заключванията.<br>3. Експортирайте лога и го импортирайте в друго копие на приложението за независимо повторение.<br>4. Проверете хеша на HTML файла срещу SHA256SUMS, подписан от организаторите.<br>5. Прегледайте изходния код — файлът не е минифициран умишлено, за да е четим.',
    'doc.qr_title': 'QR кодове',
    'doc.qr': 'QR кодовете съдържат JSON с полета: pbkdf2 (hex), salt (hex) и iter (число). Могат да бъдат сканирани с всеки QR четец и стойностите да бъдат проверени ръчно или чрез функцията за повторение.',
    'doc.project_link': 'Проект и материали за проверка →',
  },

  en: {
    'app.title': 'LoTTERY — Public Verifiable RNG Ceremony',
    'toolbar.replay': 'Replay',
    'toolbar.live': 'Live',
    'toolbar.presentation': 'Presentation',
    'toolbar.exit_presentation': '✕ Exit Presentation',
    'toolbar.export': 'Export Log',
    'toolbar.import': 'Import Log',
    'toolbar.download': 'Download HTML',
    'toolbar.reset': 'Reset',

    'card.local.label': 'Local CSRNG',
    'card.local.generate': 'Generate',
    'card.remote.label': 'random.org',
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
    'doc.commitment_title': 'What is a Commitment?',
    'doc.commitment': 'A commitment is a cryptographic "pledge" to a value without revealing it. We use PBKDF2-HMAC-SHA-256 with 600,000 iterations and a random salt. The QR code contains the PBKDF2 output, the salt, and the iteration count. Anyone can later verify that the revealed seed matches its commitment — but before the reveal, guessing the seed is computationally infeasible.',
    'doc.sources_title': 'Three Entropy Sources',
    'doc.sources': '<strong>Local CSRNG:</strong> 32 bytes from crypto.getRandomValues() — the browser\'s built-in hardware RNG.<br><strong>random.org:</strong> 32 bytes of atmospheric noise via the random.org API.<br><strong>Human Input:</strong> A value spoken aloud by a participant. Derived via PBKDF2 with a deterministic salt (SHA-256 of "LoTTERY" + input).<br><br>The raw seeds of the first two sources and the human input derivation are combined via XOR. The result is unpredictable even if two of the three are compromised — one honest source is sufficient.',
    'doc.xor_title': 'XOR Combination',
    'doc.xor': 'The raw 32-byte seeds (local and remote) are combined bitwise via XOR with a deterministic derivation of the human input: PBKDF2(input, SHA-256("LoTTERY" || input), 600,000 iterations).<br><br>Crucially: the XOR inputs (raw seeds) are never public before the reveal phase. The QR codes display only PBKDF2 <em>commitments</em>, not the XOR inputs themselves. If at least one of the three sources is honest, the combined seed is unpredictable.',
    'doc.rejection_title': 'Rejection Sampling',
    'doc.rejection': 'When we need to map a random value from a larger space into a smaller range, the naive approach (modular division) creates non-uniformity.<br><br><strong>Example:</strong> We have 3 bits (values 0\u20137) and want a die roll (1\u20136). With modulo: 0 and 6 both map to die face 1, and 1 and 7 both map to face 2 \u2014 those two faces get double the chance (2/8) compared to the rest (1/8).<br><br><em>The fix:</em> If the value is \u2265 6, discard it and draw again. Now each of the 6 values (0\u20135) maps to exactly one die face \u2014 equal probability 1/6.<br><br><em>The diagram below shows: left \u2014 the modulo approach with unfair probability (red columns have 2 balls, green have 1). Right \u2014 rejection sampling, where every column has exactly 1 ball, and values 6 and 7 are rejected.</em>',
    'doc.csrng_title': 'Deterministic CSRNG (AES-256-CTR)',
    'doc.csrng': 'The combined seed is used as the key for AES-256-CTR. Plaintext and IV are zeros — the entire output is the deterministic AES keystream. Anyone who knows the combined seed can reproduce exactly the same sequence of numbers.',
    'doc.log_title': 'Hash-Chained Log',
    'doc.log': 'Every event in the ceremony is recorded in a log. Each entry includes a SHA-256 hash computed from the previous hash and the current entry, forming an unbreakable chain. Modifying any entry breaks the chain and is detected during verification.',
    'doc.verify_title': 'How to Verify',
    'doc.verify': '1. Scan the QR codes during the ceremony — they contain commitment data.<br>2. When seeds are revealed, the application verifies them against the commitments.<br>3. Export the log and import it into another copy of the application for independent replay.<br>4. Check the HTML file hash against SHA256SUMS, signed by the organizers.<br>5. Review the source code — the file is intentionally unminified to be human-readable.',
    'doc.qr_title': 'QR Codes',
    'doc.qr': 'The QR codes contain JSON with fields: pbkdf2 (hex), salt (hex), and iter (number). They can be scanned with any QR reader and the values verified manually or via the replay function.',
    'doc.project_link': 'Project & verification materials →',
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
