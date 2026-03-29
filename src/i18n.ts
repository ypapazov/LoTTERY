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
    'draw.meta': 'Теглене #{n} — {time}',
    'replay.draw_result': 'Теглене #{n}: {value}',
    'replay.rejections': '({count} отхвърляния)',

    'import.invalid_log': 'Невалиден лог: очаква се непразен масив от записи',
    'import.chain_failed': 'Верификацията на log chain е неуспешна на запис #{idx}. Продължаване?',
    'import.failed': 'Неуспешен импорт на лог:',
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
    'draw.meta': 'Draw #{n} \u2014 {time}',
    'replay.draw_result': 'Draw #{n}: {value}',
    'replay.rejections': '({count} rejections)',

    'import.invalid_log': 'Invalid log: expected a non-empty array of entries',
    'import.chain_failed': 'Log chain verification failed at entry #{idx}. Continue anyway?',
    'import.failed': 'Failed to import log:',
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
