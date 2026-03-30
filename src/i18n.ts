export type Locale = 'bg' | 'en';

const STORAGE_KEY = 'lottery-lang';

let currentLocale: Locale = 'bg';

const strings: Record<Locale, Record<string, string>> = {
  bg: {
    'app.title': 'LoTTERY — Публична верифицируема RNG церемония',
    'toolbar.replay': 'Повторение',
    'toolbar.live': 'На живо',
    'toolbar.presentation': 'Презентация',
    'toolbar.exit_presentation': '✕ Край на презентация',
    'toolbar.export': 'Експорт на лог',
    'toolbar.import': 'Импорт на лог',
    'toolbar.download': 'Изтегляне на HTML',
    'toolbar.reset': 'Нулиране',

    'card.local.label': 'Локален CSRNG',
    'card.local.generate': 'Генерирай',
    'card.remote.label': 'random.org',
    'card.remote.fetch': 'Извличане',
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

    'btn.reveal': 'Разкриване на Seeds',
    'btn.verify': 'Проверка на Commitments',
    'btn.generate': 'Генерирай',
    'btn.generated': 'Генерирано',
    'btn.draw_next': 'Следващо теглене',

    'log.up': 'Лог ▲',
    'log.down': 'Лог ▼',
    'log.chain': 'Верига:',

    'xor.local': 'Локален',
    'xor.remote': 'Отдалечен',
    'xor.human': 'Човешки',
    'xor.combined': 'Комбиниран Seed',

    'replay.notice': 'Режим на повторение / Верификация',
    'replay.local_seed': 'Локален Seed',
    'replay.remote_seed': 'Отдалечен Seed',
    'replay.human_input': 'Човешки вход',
    'replay.seed_placeholder': 'Hex seed (64 символа)',
    'replay.salt_placeholder': 'Salt (64 hex)',
    'replay.human_placeholder': 'Оригинална казана стойност',
    'replay.run': 'Стартирай повторение',

    'processing.commitment': 'Изчисляване на криптографски commitment — това преднамерено забавяне предпазва от brute-force атаки. Моля, изчакайте…',
    'processing.fetch': 'Извличане на ентропия от random.org…',
    'processing.verify': 'Верификация на commitments…',
    'processing.replay': 'Повторение на церемония…',

    'info.commitment': 'Това е криптографско заключване. То доказва, че този seed е бил избран преди другите входове да бъдат получени, без да разкрива самия seed.',
    'info.human_commitment': 'Казаният вход се обработва чрез PBKDF2, за да се получи този commitment.',
    'info.rejection': 'Тази стойност е отхвърлена, защото използването ѝ би дало леко предимство на някои числа. Тегли се нова стойност за гарантиране на еднаква вероятност.',

    'error.crypto_title': 'Web Crypto API е недостъпен',
    'error.crypto_body': 'Това приложение изисква <code>crypto.subtle</code>, наличен само в сигурен контекст.',
    'error.crypto_help': 'Моля, отворете файла в браузър с поддръжка на Web Crypto API. Ако ползвате Tor Browser, уверете се в актуална версия на Firefox ESR.',
    'error.enter_value': 'Моля, въведете стойност',
    'error.failed_prefix': 'Грешка:',
    'error.use_manual': 'Използвайте ръчно въвеждане.',

    'confirm.reset': 'Нулиране на церемонията? Всички текущи данни ще бъдат загубени.',
    'download.downloading': 'Изтегляне…',
    'download.unavailable': 'Недостъпно (офлайн)',

    'draw.discarded': 'Отхвърлено',
    'draw.duplicate': 'Дубликат — ново теглене',
    'draw.meta': 'Теглене #{n} — {time}',
    'replay.draw_result': 'Теглене #{n}: {value}',
    'replay.rejections': '({count} отхвърляния)',
    'replay.duplicate_rejections': '({count} дубликата)',

    'import.invalid_log': 'Невалиден лог: очаква се непразен масив от записи',
    'import.chain_failed': 'Верификацията на log chain е неуспешна на запис #{idx}. Продължаване?',
    'import.failed': 'Неуспешен импорт на лог:',

    'toolbar.help': 'Помощ',
    'doc.title': 'LoTTERY — Документация',
    'doc.overview_title': 'Какво е LoTTERY?',
    'doc.overview': 'LoTTERY (Low-Trust Technical Excellence Random Yield) е инструмент за публично проверима RNG церемония. Генерира случайни числа по начин, в който нито един участник не може да повлияе на резултата, и всеки наблюдател може да провери коректността.',
    'doc.commitment_title': 'Какво е Commitment (заключване)?',
    'doc.commitment': 'Commitment (заключване) е криптографски "ангажимент" към дадена стойност, без тя да бъде разкрита. Ние използваме PBKDF2-HMAC-SHA-256 с 600 000 итерации и произволен salt. QR кодът съдържа резултата от PBKDF2, salt-а и броя итерации. Така всеки може по-късно да провери, че разкритият seed наистина съответства на дадения commitment — но преди разкриването е невъзможно да се отгатне seed-ът.',
    'doc.sources_title': 'Три източника на ентропия',
    'doc.sources': '<strong>Локален CSRNG:</strong> 32 байта от crypto.getRandomValues() — вграденият в браузъра хардуерен генератор.<br><strong>random.org:</strong> 32 байта от атмосферен шум чрез random.org API.<br><strong>Човешки вход:</strong> стойност, казана на глас от участник. Деривира се чрез PBKDF2 с детерминистичен salt (SHA-256 на "LoTTERY" + входа).<br><br>Суровите seeds на първите два източника и деривацията на човешкия вход се комбинират чрез XOR. Резултатът е непредсказуем, дори ако два от трите са компрометирани — достатъчен е един честен източник.',
    'doc.xor_title': 'XOR комбиниране',
    'doc.xor': 'Суровите 32-байтови seeds (локален и отдалечен) се комбинират побитово чрез XOR с детерминистична деривация на човешкия вход: PBKDF2(вход, SHA-256("LoTTERY" || вход), 600 000 итерации).<br><br>Ключово: XOR входовете (суровите seeds) никога не са публични преди фазата на разкриване. QR кодовете показват само PBKDF2 <em>ангажиментите</em>, не самите XOR входове. Ако поне един от трите източника е честен, резултатът е непредсказуем.',
    'doc.rejection_title': 'Rejection Sampling (отхвърляне)',
    'doc.rejection': 'Когато трябва да преобразуваме случайно число от по-голямо пространство в по-малък диапазон, наивният подход (модулно деление) създава неравномерност.<br><br><strong>Пример:</strong> Ако имаме 17 възможни стойности (0–16) и искаме диапазон [1–4], тогава: стойности 0–3 → резултат 1, стойности 4–7 → резултат 2, стойности 8–11 → резултат 3, стойности 12–15 → резултат 4. Стойност 16 → би дала резултат 1 (17 mod 4 = 1). Резултат 1 получава допълнителен шанс (5 срещу 4).<br><br><em>Диаграмата по-долу показва: зелените клетки са стойности, които се преобразуват равномерно. Розовата клетка е "излишъкът", който предизвиква предпочитание — тя се отхвърля.</em><br><br>Решението: ако генерираната стойност попадне в розовата зона (≥ threshold), тя се отхвърля и се тегли нова. Threshold = output_space − (output_space mod range_size). Отхвърлените стойности се показват в интерфейса за пълна прозрачност.',
    'doc.csrng_title': 'Детерминистичен CSRNG (AES-256-CTR)',
    'doc.csrng': 'Комбинираният seed се използва като ключ за AES-256-CTR. Plaintext и IV са нули — целият изход е детерминистичният AES keystream. Всеки, който знае комбинирания seed, може да възпроизведе точно същата последователност от числа.',
    'doc.log_title': 'Hash-верижен лог',
    'doc.log': 'Всяко събитие в церемонията се записва в лог. Всеки запис включва SHA-256 хеш, изчислен от предходния хеш и текущия запис, формирайки неразривна верига. Промяна на който и да е запис разрушава веригата и се установява при верификация.',
    'doc.verify_title': 'Как да проверите',
    'doc.verify': '1. Сканирайте QR кодовете по време на церемонията — те съдържат commitment данните.<br>2. Когато seed-овете бъдат разкрити, приложението ги проверява срещу commitment-ите.<br>3. Експортирайте лога и го импортирайте в друго копие на приложението за независим replay.<br>4. Проверете hash-а на HTML файла срещу SHA256SUMS, подписан от организаторите.<br>5. Прегледайте изходния код — файлът не е минифициран умишлено, за да е четим.',
    'doc.qr_title': 'QR кодове',
    'doc.qr': 'QR кодовете съдържат JSON с полета: pbkdf2 (hex), salt (hex) и iter (число). Могат да бъдат сканирани с всеки QR четец и стойностите да бъдат проверени ръчно или чрез replay функцията.',
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
    'download.downloading': 'Downloading\u2026',
    'download.unavailable': 'Unavailable (offline)',

    'draw.discarded': 'Discarded',
    'draw.duplicate': 'Duplicate \u2014 re-drawing',
    'draw.meta': 'Draw #{n} \u2014 {time}',
    'replay.draw_result': 'Draw #{n}: {value}',
    'replay.rejections': '({count} rejections)',
    'replay.duplicate_rejections': '({count} duplicates)',

    'import.invalid_log': 'Invalid log: expected a non-empty array of entries',
    'import.chain_failed': 'Log chain verification failed at entry #{idx}. Continue anyway?',
    'import.failed': 'Failed to import log:',

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
    'doc.rejection': 'When we need to map a random value from a larger space into a smaller range, the naive approach (modular division) creates non-uniformity.<br><br><strong>Example:</strong> If we have 17 possible values (0\u201316) and want range [1\u20134]: values 0\u20133 \u2192 result 1, values 4\u20137 \u2192 result 2, values 8\u201311 \u2192 result 3, values 12\u201315 \u2192 result 4. Value 16 \u2192 would give result 1 (17 mod 4 = 1). Result 1 gets an extra chance (5 vs 4).<br><br><em>The diagram below illustrates: green cells are values that map uniformly. The pink cell is the "excess" that causes bias \u2014 it is rejected.</em><br><br>The solution: if the generated value falls in the pink zone (\u2265 threshold), it is discarded and a new one is drawn. Threshold = output_space \u2212 (output_space mod range_size). Discarded values are displayed in the UI for full transparency.',
    'doc.csrng_title': 'Deterministic CSRNG (AES-256-CTR)',
    'doc.csrng': 'The combined seed is used as the key for AES-256-CTR. Plaintext and IV are zeros — the entire output is the deterministic AES keystream. Anyone who knows the combined seed can reproduce exactly the same sequence of numbers.',
    'doc.log_title': 'Hash-Chained Log',
    'doc.log': 'Every event in the ceremony is recorded in a log. Each entry includes a SHA-256 hash computed from the previous hash and the current entry, forming an unbreakable chain. Modifying any entry breaks the chain and is detected during verification.',
    'doc.verify_title': 'How to Verify',
    'doc.verify': '1. Scan the QR codes during the ceremony — they contain commitment data.<br>2. When seeds are revealed, the application verifies them against the commitments.<br>3. Export the log and import it into another copy of the application for independent replay.<br>4. Check the HTML file hash against SHA256SUMS, signed by the organizers.<br>5. Review the source code — the file is intentionally unminified to be human-readable.',
    'doc.qr_title': 'QR Codes',
    'doc.qr': 'The QR codes contain JSON with fields: pbkdf2 (hex), salt (hex), and iter (number). They can be scanned with any QR reader and the values verified manually or via the replay function.',
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
