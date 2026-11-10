/* Безопасное хранилище: в предпросмотре (iframe-песочница) или в приватном режиме
   localStorage может быть недоступен — тогда раньше отметки «Эссе готово» и статусы
   терялись при каждой перерисовке. Теперь всегда дублируем в память. */
const __memStore = {};
function lsGet(k) { try { const v = window.localStorage.getItem(k); if (v !== null) return v; } catch (e) { } return Object.prototype.hasOwnProperty.call(__memStore, k) ? __memStore[k] : null; }
function lsSet(k, v) { __memStore[k] = String(v); try { window.localStorage.setItem(k, v); } catch (e) { } }
function lsRemove(k) { delete __memStore[k]; try { window.localStorage.removeItem(k); } catch (e) { } }
/* ============================================================
   THEME (светлая / тёмная) — применяем ДО первого рендера, чтобы
   не было "мигания" не той темой при перезагрузке страницы.
   ============================================================ */
const THEME_KEY = 'unimatch_theme_v1';

/* ---- Иконка (favicon): настоящий PNG-знак Admitly. В светлой теме —
   assets/favicon-48.png (светлая плашка + тёмный знак), в тёмной —
   assets/favicon-48-dark.png (тёмная плашка + светлый знак), чтобы
   значок вкладки совпадал с темой страницы. Плюс обновляем meta
   theme-color под тему. */
function updateFavicon() {
  try {
    const dark = document.documentElement.getAttribute('data-theme') === 'dark';
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', dark ? '#15181D' : '#F4F5F9');
    const link = document.getElementById('favicon');
    if (link) link.setAttribute('href', dark ? 'assets/favicon-48-dark.png' : 'assets/favicon-48.png');
  } catch (e) { }
}

(function initThemeEarly() {
  let saved = null;
  try { saved = lsGet(THEME_KEY); } catch (e) { /* приватный режим — просто без сохранения */ }
  if (saved === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
  updateFavicon();
})();
function toggleTheme() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const next = isDark ? 'light' : 'dark';
  if (next === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
  else document.documentElement.removeAttribute('data-theme');
  try { lsSet(THEME_KEY, next); } catch (e) { }
  // Перерисовываем переключатели темы там, где они уже на странице (иконка солнце/луна).
  document.querySelectorAll('.theme-toggle').forEach(btn => {
    btn.innerHTML = (next === 'dark') ? ICONS.sun : ICONS.moon;
  });
  updateFavicon();
}
function themeSwitcher(extraClass) {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  return `<button class="theme-toggle ${extraClass || ''}" onclick="toggleTheme()" title="${state && state.lang === 'en' ? 'Toggle theme' : 'Переключить тему'}" aria-label="${state && state.lang === 'en' ? 'Toggle theme' : 'Переключить тему'}">${isDark ? ICONS.sun : ICONS.moon}</button>`;
}

/* ============================================================
   DATA
   ============================================================ */
const ICONS = {
  undo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/></svg>',
  /* Логотип — НАСТОЯЩИЙ PNG-знак Admitly (assets/admitly-mark.png):
     фирменный знак «A + орбита + звезда» с синим градиентом свуша.
     Вставляется как span.brand-mark-img с фоновым изображением; CSS
     (правила .brand-mark-img в styles.css) подгоняет размер под контейнер.
     В светлой теме знак тёмный на прозрачном фоне, в тёмной теме
     контейнер .mark становится белой плашкой — тот же тёмный знак,
     ровно как в favicon. */
  logo: '<span class="brand-mark-img" aria-hidden="true"></span>',
  discover: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="4" y="7" width="13" height="14" rx="2.5"/><path d="M8 4h10.5A2.5 2.5 0 0 1 21 6.5V17"/></svg>',
  matches: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 1 0-7.8 7.8l1 1L12 21l7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.8Z"/></svg>',
  list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>',
  dna: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 19 7 19 17 12 22 5 17 5 7"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8.2" r="3.6"/><path d="M5 20c1.1-4.1 3.9-6.2 7-6.2s5.9 2.1 7 6.2"/></svg>',
  heart: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 1 0-7.8 7.8l1 1L12 21l7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.8Z"/></svg>',
  info: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
  chevronDown: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>',
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M15 18l-6-6 6-6"/></svg>',
  save: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>',
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v9a1 1 0 0 0 1 1H9.5v-6h5v6H17.5a1 1 0 0 0 1-1v-9"/></svg>',
  share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 3.9M15.4 6.6L8.6 10.5"/></svg>',
  compass: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>',
  laptop: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="11" rx="1.5"/><path d="M2 19h20"/></svg>',
  gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3.2"/><path d="M12 3v2.4M12 18.6V21M21 12h-2.4M5.4 12H3M18 6l-1.7 1.7M7.7 16.3 6 18M18 18l-1.7-1.7M7.7 7.7 6 6"/></svg>',
  sigma: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 4H6l6 8-6 8h12"/></svg>',
  barChart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V10M12 20V4M20 20v-7"/></svg>',
  heartPulse: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 11h3l1.6-3.2L11 14l1.7-4.6L14 11h6.5"/><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 1 0-7.8 7.8l1 1L12 21l7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.8Z" opacity=".4"/></svg>',
  book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5.5C4 4.7 4.7 4 5.5 4H12v16H5.5c-.8 0-1.5-.7-1.5-1.5Z"/><path d="M20 5.5c0-.8-.7-1.5-1.5-1.5H12v16h6.5c.8 0 1.5-.7 1.5-1.5Z"/></svg>',
  scale: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18M7 21h10M5 7h5M14 7h5M5 7 2.5 12a2.5 2.5 0 0 0 5 0Zm14 0-2.5 5a2.5 2.5 0 0 0 5 0Z"/></svg>',
  graduation: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 8.5 12 4l10 4.5-10 4.5-10-4.5Z"/><path d="M6 10.8v4.3c0 1.4 2.7 2.9 6 2.9s6-1.5 6-2.9v-4.3M22 8.5v6"/></svg>',
  google: '<svg viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.1 29.3 35 24 35c-6.1 0-11-4.9-11-11s4.9-11 11-11c2.8 0 5.3 1 7.3 2.7l5.7-5.7C33.6 6.5 29.1 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5 43.5 34.8 43.5 24c0-1.2-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 16 18.9 13 24 13c2.8 0 5.3 1 7.3 2.7l5.7-5.7C33.6 6.5 29.1 4.5 24 4.5c-7.7 0-14.3 4.4-17.7 10.2z"/><path fill="#4CAF50" d="M24 43.5c5 0 9.5-1.9 12.9-5.1l-6-4.9C29 35 26.6 35.8 24 35.8c-5.2 0-9.6-3.5-11.2-8.3l-6.6 5.1C9.6 39 16.2 43.5 24 43.5z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.4 5.6l6 4.9c3.5-3.2 5.6-8 5.6-13.5 0-1.2-.1-2.4-.4-3.5z"/></svg>',
  yandex: '<svg viewBox="0 0 24 24"><text x="12" y="17.5" text-anchor="middle" font-size="16" font-weight="700" font-family="Georgia, serif" fill="#fff">Я</text></svg>',
  telegram: '<svg viewBox="0 0 24 24" fill="#fff" stroke="none"><path d="M20.4 3.6 2.8 10.6c-.9.35-.9 1.5.02 1.83l4.4 1.55 1.7 5.4c.2.6.95.75 1.4.28l2.4-2.5 4.3 3.2c.7.5 1.65.13 1.8-.72l3.1-14.6c.16-.83-.6-1.5-1.5-1.44Zm-2 3.15-8 7.3-.4 3.2-1.5-4.7 8.9-6.5c.3-.2.6.15.35.4z"/></svg>',
  refresh: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 15.5-6.3M21 12a9 9 0 0 1-15.5 6.3"/><path d="M18.5 2v4.2h-4.2M5.5 22v-4.2h4.2"/></svg>',
  target: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/></svg>',
  coin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9.5 15.2c.5.9 1.4 1.3 2.5 1.3 1.7 0 2.8-.9 2.8-2.1 0-3-5.6-1.4-5.6-4.2 0-1.2 1.1-2.1 2.8-2.1 1.1 0 2 .4 2.5 1.3M12 6.3v1.7M12 16v1.7"/></svg>',
  handshake: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12.5 6 9l4 3-1.5 1.5a1.4 1.4 0 0 0 2 2L14 12l3 3M22 12.5 18 9l-4 3"/></svg>',
  globe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18Z"/></svg>',
  pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s7-6.5 7-11.5a7 7 0 1 0-14 0C5 14.5 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.3"/></svg>',
  unlock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="10.5" width="16" height="10" rx="1.5"/><path d="M7.5 10.5V7a4.5 4.5 0 0 1 8.3-2.4"/></svg>',
  lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="10.5" width="16" height="10" rx="1.5"/><path d="M7.5 10.5V7a4.5 4.5 0 0 1 9 0v3.5"/></svg>',
  lockClosed: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="10.5" width="16" height="10" rx="1.5"/><path d="M7.5 10.5V7a4.5 4.5 0 0 1 9 0v3.5"/></svg>',
  undo_old: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10h9a6 6 0 0 1 0 12h-2"/><path d="M8 5 4 10l4 5"/></svg>',
  arrowRight: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h16M13 5l7 7-7 7"/></svg>',
  moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/></svg>',
  sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.4M12 19v2.4M4.9 4.9l1.7 1.7M17.4 17.4l1.7 1.7M2.5 12h2.4M19 12h2.4M4.9 19.1l1.7-1.7M17.4 6.6l1.7-1.7"/></svg>',
  sliders: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="14" cy="7" r="2.3"/><circle cx="8" cy="17" r="2.3"/></svg>',
  clipboard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="12" height="17" rx="2"/><rect x="9" y="2.5" width="6" height="3" rx="1"/><path d="M9 11h6M9 15h6"/></svg>',
  spark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 4h11L22 9.5 12 21 2 9.5z"/><path d="M2 9.5h20M9 4l-2 5.5L12 21l5-11.5L15 4"/></svg>',
  calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>',
  arrowLeft: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>'
};

const GRADIENTS = [
  'linear-gradient(135deg,#1B2A4A,#34496F)', 'linear-gradient(135deg,#8B3FD1,#B06FE8)',
  'linear-gradient(135deg,#2F5233,#4C7A52)', 'linear-gradient(135deg,#96702F,#C0954E)',
  'linear-gradient(135deg,#3A5068,#5A7794)', 'linear-gradient(135deg,#1F5E5A,#3A8B84)',
  'linear-gradient(135deg,#5C2A4D,#82446F)', 'linear-gradient(135deg,#2B3245,#4A536B)'
];

// Значение `value` у каждой специальности — канонический (английский) ключ:
// именно он хранится в profile.major, участвует в поиске категории
// (findMajorCategory) и уходит на бэкенд. `ru` — только текст для отображения,
// когда state.lang === 'ru' (см. majorLabel()/categoryLabel() ниже); сам
// хранимый профиль от языка интерфейса не зависит.
const MAJOR_CATEGORIES = [
  {
    key: 'cs', label: 'Computer Science & Technology', label_ru: 'Компьютерные науки и технологии', icon: 'laptop', majors: [
      { value: 'Computer Science', ru: 'Компьютерные науки' },
      { value: 'Artificial Intelligence / Machine Learning', ru: 'Искусственный интеллект / машинное обучение' },
      { value: 'Data Science', ru: 'Наука о данных' },
      { value: 'Software Engineering', ru: 'Программная инженерия' },
      { value: 'Computer Engineering', ru: 'Компьютерная инженерия' },
      { value: 'Cybersecurity', ru: 'Кибербезопасность' },
      { value: 'Information Systems / IT', ru: 'Информационные системы / IT' },
      { value: 'Robotics', ru: 'Робототехника' },
      { value: 'Game Development', ru: 'Разработка игр' },
      { value: 'Human-Computer Interaction', ru: 'Взаимодействие человека и компьютера' }
    ]
  },
  {
    key: 'eng', label: 'Engineering', label_ru: 'Инженерия', icon: 'gear', majors: [
      { value: 'Mechanical Engineering', ru: 'Машиностроение' },
      { value: 'Electrical Engineering', ru: 'Электротехника' },
      { value: 'Civil Engineering', ru: 'Строительная инженерия' },
      { value: 'Chemical Engineering', ru: 'Химическая инженерия' },
      { value: 'Aerospace Engineering', ru: 'Аэрокосмическая инженерия' },
      { value: 'Biomedical Engineering', ru: 'Биомедицинская инженерия' },
      { value: 'Industrial Engineering', ru: 'Промышленная инженерия' },
      { value: 'Environmental Engineering', ru: 'Экологическая инженерия' }
    ]
  },
  {
    key: 'math', label: 'Mathematics & Natural Sciences', label_ru: 'Математика и естественные науки', icon: 'sigma', majors: [
      { value: 'Mathematics', ru: 'Математика' },
      { value: 'Statistics', ru: 'Статистика' },
      { value: 'Physics', ru: 'Физика' },
      { value: 'Chemistry', ru: 'Химия' },
      { value: 'Biology', ru: 'Биология' },
      { value: 'Astronomy', ru: 'Астрономия' },
      { value: 'Environmental Science', ru: 'Экология' }
    ]
  },
  {
    key: 'biz', label: 'Business & Economics', label_ru: 'Бизнес и экономика', icon: 'barChart', majors: [
      { value: 'Business Administration', ru: 'Управление бизнесом' },
      { value: 'Economics', ru: 'Экономика' },
      { value: 'Finance', ru: 'Финансы' },
      { value: 'Accounting', ru: 'Бухгалтерский учёт' },
      { value: 'Marketing', ru: 'Маркетинг' },
      { value: 'Business Analytics', ru: 'Бизнес-аналитика' },
      { value: 'Entrepreneurship', ru: 'Предпринимательство' },
      { value: 'International Business', ru: 'Международный бизнес' }
    ]
  },
  {
    key: 'social', label: 'Social Sciences', label_ru: 'Социальные науки', icon: 'compass', majors: [
      { value: 'Psychology', ru: 'Психология' },
      { value: 'Political Science', ru: 'Политология' },
      { value: 'Sociology', ru: 'Социология' },
      { value: 'International Relations', ru: 'Международные отношения' },
      { value: 'Public Policy', ru: 'Государственная политика' },
      { value: 'Anthropology', ru: 'Антропология' }
    ]
  },
  {
    key: 'health', label: 'Life Sciences & Health', label_ru: 'Науки о жизни и здоровье', icon: 'heartPulse', majors: [
      { value: 'Pre-Med / Biology', ru: 'Пре-мед / биология' },
      { value: 'Neuroscience', ru: 'Нейронауки' },
      { value: 'Biotechnology', ru: 'Биотехнологии' },
      { value: 'Public Health', ru: 'Общественное здравоохранение' },
      { value: 'Nursing', ru: 'Сестринское дело' }
    ]
  },
  {
    key: 'humanities', label: 'Humanities & Arts', label_ru: 'Гуманитарные науки и искусство', icon: 'book', majors: [
      { value: 'History', ru: 'История' },
      { value: 'Philosophy', ru: 'Философия' },
      { value: 'English Literature', ru: 'Английская литература' },
      { value: 'Linguistics', ru: 'Лингвистика' },
      { value: 'Architecture', ru: 'Архитектура' },
      { value: 'Graphic Design', ru: 'Графический дизайн' },
      { value: 'Film Studies', ru: 'Киноведение' },
      { value: 'Music', ru: 'Музыка' }
    ]
  },
  {
    key: 'law', label: 'Law & Government', label_ru: 'Право и государственное управление', icon: 'scale', majors: [
      { value: 'Pre-Law', ru: 'Пре-лоу (подготовка к юрфаку)' },
      { value: 'Criminal Justice', ru: 'Уголовное право и юстиция' }
    ]
  }
];
// Отображаемое название категории на текущем языке интерфейса (сам `key`
// категории от языка не зависит).
function categoryLabel(cat) {
  return state.lang === 'ru' ? cat.label_ru : cat.label;
}
// Отображаемое название специальности на текущем языке интерфейса. `value` —
// это то, что реально хранится в profile.major (канонический английский
// ключ), поэтому сравнение/матчинг по нему не меняется — переводится только
// то, что видит пользователь.
function majorLabel(value) {
  if (state.lang !== 'ru') return value;
  for (const cat of MAJOR_CATEGORIES) {
    const m = cat.majors.find(m => m.value === value);
    if (m) return m.ru;
  }
  return value;
}
// Специальность теперь мульти-select (profile.majors) — эта функция собирает
// отображаемую строку из всех выбранных значений, а не только первого.
function majorsLabel(values) {
  const list = (Array.isArray(values) ? values : [values]).filter(Boolean);
  if (!list.length) return '';
  return list.map(majorLabel).join(', ');
}
function findMajorCategory(majorValue) {
  const cat = MAJOR_CATEGORIES.find(c => c.majors.some(m => m.value === majorValue));
  return cat ? cat.key : MAJOR_CATEGORIES[0].key;
}

const TEST_RANGES = {
  SAT: { min: 400, max: 1600, step: 10, academicMin: 900, academicMax: 1600, hint: '400 – 1600' },
  ACT: { min: 1, max: 36, step: 1, academicMin: 18, academicMax: 36, hint: '1 – 36' },
  IELTS: { min: 0, max: 9, step: 0.5, academicMin: 5, academicMax: 9, hint: '0 – 9' },
  TOEFL: { min: 0, max: 120, step: 1, academicMin: 60, academicMax: 120, hint: '0 – 120' },
  DET: { min: 10, max: 160, step: 5, academicMin: 90, academicMax: 160, hint: '10 – 160' },
  IB: { min: 24, max: 45, step: 1, academicMin: 24, academicMax: 45, hint: '24 – 45' },
  EGE: { min: 100, max: 310, step: 1, academicMin: 180, academicMax: 300, hint: '100 – 310' }
};
const TEST_NAME = { SAT: 'SAT', ACT: 'ACT', IB: 'IB Diploma', EGE: 'ЕГЭ', IELTS: 'IELTS', TOEFL: 'TOEFL iBT', DET: 'Duolingo (DET)' };
const ACADEMIC_TESTS = ['SAT', 'ACT', 'IB', 'EGE'];
const ENGLISH_TESTS = ['IELTS', 'TOEFL', 'DET'];
const DEFAULT_EXTRA_TESTS = { TOEFL: { taken: false, score: 95 }, DET: { taken: false, score: 120 }, IB: { taken: false, score: 36 }, EGE: { taken: false, score: 250 } };
/* Страна и родной язык — для подсказок «учёба в своей стране» и «язык обучения». */
const HOME_COUNTRIES = [
  ['Russia', 'Россия', 'Russia'], ['Kazakhstan', 'Казахстан', 'Kazakhstan'], ['Belarus', 'Беларусь', 'Belarus'],
  ['Ukraine', 'Украина', 'Ukraine'], ['Uzbekistan', 'Узбекистан', 'Uzbekistan'], ['Kyrgyzstan', 'Кыргызстан', 'Kyrgyzstan'],
  ['Armenia', 'Армения', 'Armenia'], ['Georgia', 'Грузия', 'Georgia'], ['Azerbaijan', 'Азербайджан', 'Azerbaijan'],
  ['Germany', 'Германия', 'Germany'], ['USA', 'США', 'USA'], ['China', 'Китай', 'China'], ['India', 'Индия', 'India'],
  ['Turkey', 'Турция', 'Turkey'], ['Israel', 'Израиль', 'Israel'], ['UAE', 'ОАЭ', 'UAE'], ['other', 'Другая страна', 'Other country']
];
const NATIVE_LANGS = [
  ['ru', 'Русский', 'Russian'], ['kk', 'Казахский', 'Kazakh'], ['uk', 'Украинский', 'Ukrainian'], ['uz', 'Узбекский', 'Uzbek'],
  ['en', 'Английский', 'English'], ['de', 'Немецкий', 'German'], ['zh', 'Китайский', 'Chinese'], ['hy', 'Армянский', 'Armenian'],
  ['ka', 'Грузинский', 'Georgian'], ['az', 'Азербайджанский', 'Azerbaijani'], ['tr', 'Турецкий', 'Turkish'], ['other', 'Другой', 'Other']
];
/* Основной язык бакалавриата по стране вуза (где не английский). */
const COUNTRY_TEACH_LANG = {
  Germany: 'de', Austria: 'de', Switzerland: 'de', France: 'fr', Italy: 'it', Spain: 'es', Russia: 'ru', Japan: 'ja',
  China: 'zh', Taiwan: 'zh', 'South Korea': 'ko', Brazil: 'pt', Argentina: 'es', Mexico: 'es', Chile: 'es',
  'Czech Republic': 'cs', Poland: 'pl', Belgium: 'nl', Netherlands: 'nl', Sweden: 'sv', Denmark: 'da', Finland: 'fi',
  Israel: 'he', Egypt: 'ar', 'Saudi Arabia': 'ar', Indonesia: 'id', Vietnam: 'vi'
};
const LANG_NAME_RU = { de: 'немецком', fr: 'французском', it: 'итальянском', es: 'испанском', ru: 'русском', ja: 'японском', zh: 'китайском', ko: 'корейском', pt: 'португальском', cs: 'чешском', pl: 'польском', nl: 'нидерландском', sv: 'шведском', da: 'датском', fi: 'финском', he: 'иврите', ar: 'арабском', id: 'индонезийском', vi: 'вьетнамском' };
const LANG_NAME_EN = { de: 'German', fr: 'French', it: 'Italian', es: 'Spanish', ru: 'Russian', ja: 'Japanese', zh: 'Chinese', ko: 'Korean', pt: 'Portuguese', cs: 'Czech', pl: 'Polish', nl: 'Dutch', sv: 'Swedish', da: 'Danish', fi: 'Finnish', he: 'Hebrew', ar: 'Arabic', id: 'Indonesian', vi: 'Vietnamese' };
/* Бэкенд хранит только SAT/ACT/IELTS — остальные экзамены, страну и язык держим в браузере. */
const PROFILE_EXTRA_KEY = 'unimatch_profile_extra_v1';
function ensureProfileExtras(p) {
  p.tests = p.tests || {};
  Object.keys(DEFAULT_EXTRA_TESTS).forEach(k => { if (!p.tests[k]) p.tests[k] = Object.assign({}, DEFAULT_EXTRA_TESTS[k]); });
  if (p.homeCountry === undefined) p.homeCountry = '';
  if (p.nativeLang === undefined) p.nativeLang = '';
  return p;
}
function saveProfileExtras() {
  try {
    const p = state.profile, tests = {};
    Object.keys(DEFAULT_EXTRA_TESTS).forEach(k => { tests[k] = p.tests[k]; });
    lsSet(PROFILE_EXTRA_KEY, JSON.stringify({ tests, homeCountry: p.homeCountry, nativeLang: p.nativeLang }));
  } catch (e) { }
}
function applyProfileExtras(p) {
  ensureProfileExtras(p);
  try {
    const x = JSON.parse(lsGet(PROFILE_EXTRA_KEY) || 'null');
    if (x) {
      Object.keys(DEFAULT_EXTRA_TESTS).forEach(k => { if (x.tests && x.tests[k]) p.tests[k] = x.tests[k]; });
      if (x.homeCountry) p.homeCountry = x.homeCountry;
      if (x.nativeLang) p.nativeLang = x.nativeLang;
    }
  } catch (e) { }
  return p;
}
function setHomeCountry(v) { state.profile.homeCountry = v; if (!state.profile.nativeLang) { const m = { Russia: 'ru', Belarus: 'ru', Kazakhstan: 'ru', Ukraine: 'uk', Uzbekistan: 'uz', Germany: 'de', USA: 'en', China: 'zh', Turkey: 'tr', Armenia: 'hy', Georgia: 'ka', Azerbaijan: 'az' }; if (m[v]) state.profile.nativeLang = m[v]; } saveProfileExtras(); restoreScrollAround(renderOnboarding); }
function setNativeLang(v) { state.profile.nativeLang = v; saveProfileExtras(); restoreScrollAround(renderOnboarding); }

// Чисто декоративная привязка иконка+буква для бейджа теста в renderTestRow()
// (визуальный редизайн карточек тестов) — не влияет ни на какую логику,
// только на то, какая иконка показывается слева от названия теста.
const TEST_ICON = {
  SAT: 'sigma',
  ACT: 'barChart',
  IELTS: 'globe', TOEFL: 'globe', DET: 'globe', IB: 'graduation', EGE: 'sigma'
};

/* Уникальные «монограммы» экзаменов вместо повторяющихся одинаковых иконок
   (одна и та же «сигма» у SAT и ЕГЭ и одинаковый глобус у IELTS/TOEFL/DET
   выглядели как заглушки). Короткая аббревиатура в цветном чипе читается
   как бренд теста и у каждого теста своя. */
const TEST_MONO = {
  SAT: 'SAT', ACT: 'ACT', IB: 'IB', EGE: 'ЕГЭ',
  IELTS: 'IELTS', TOEFL: 'TOEFL', DET: 'DET'
};

/* ============================================================
   LANGUAGE / i18n
   ============================================================ */
const STRINGS = {
  ru: {
    step_of: n => `Шаг ${n} из 5`,
    obx_title: "Оценки и экзамены",
    obx_sub: "По ним мы оценим твои шансы. Если экзамен ещё не сдан, просто пропусти его.",
    ob0_title: "Расскажи о себе",
    ob0_sub: "Откуда ты, на кого хочешь учиться и куда поступаешь.",
    gpa_label: "Средний балл (GPA)",
    gpa_hint: "Укажи средний балл по шкале 4,0. Если оценки в другой шкале — проверь, как выбранный вуз пересчитывает баллы.",
    test_type_label: "Тип теста",
    test_none: "Ещё не сдавал(а)",
    test_none_hint: "Ничего страшного, балл можно добавить позже. Пока считаем только по среднему баллу.",
    score_label: r => `Балл (${r})`,
    sat_explain: "Американский вступительный экзамен: математика, чтение и письмо. Максимум 1600 баллов.",
    act_explain: "Замена SAT: английский, математика, чтение и естественные науки. Максимум 36 баллов.",
    ielts_explain: "Экзамен по английскому, шкала от 0 до 9. Большинство вузов просят от 6,5.",
    ielts_hint: "Нужен почти всем, кто поступает в англоязычный вуз из другой страны.",
    toefl_explain: "Американский экзамен по английскому, от 0 до 120. Обычно просят 90–100.",
    det_explain: "Онлайн-экзамен по английскому, сдаётся из дома. Шкала от 10 до 160, обычно просят от 120.",
    ib_explain: "Международный школьный диплом, от 24 до 45 баллов. Хороший результат — от 38.",
    ege_explain: "Сумма за три предмета и до 10 баллов за достижения. Нужен для поступления в российские вузы.",
    ege_hint: "Проходной балл на бюджет зависит от специальности и вуза — точные цифры прошлых лет есть на сайте приёмной комиссии.",
    tests_academic: "Вступительные экзамены", tests_english: "Английский язык",
    home_country_label: "Откуда ты", home_lang_label: "Родной язык", choose_ph: "Выбери",
    home_country_hint: "От этого зависят стипендии: часть помощи дают только гражданам страны вуза.",
    home_lang_hint: "Язык, на котором ты учился. Влияет на то, насколько легко влиться в учёбу.",
    major_label: "Специальность",
    degree_label: "Уровень программы",
    degree_bachelor: "Бакалавриат", degree_master: "Магистратура", degree_phd: "Докторантура",
    next: "Далее", back: "Назад",
    ob1_title: "Что для тебя важно",
    ob1_sub: "Это стартовые настройки. Дальше подборка будет подстраиваться под твои лайки.",
    size_label: "Размер университета",
    size_small: "Маленький", size_medium: "Средний", size_large: "Большой",
    setting_label: "Где находится кампус",
    setting_urban: "Городской", setting_suburban: "Пригород", setting_coastal: "У моря",
    climate_label: "Климат",
    climate_warm: "Тёплый", climate_moderate: "Умеренный", climate_cold: "Холодный",
    multi_select_hint: "Можно выбрать несколько вариантов",
    research_label: "Насколько важна наука",
    budget_label: "Сколько можешь тратить в год",
    aid_label: "Нужна стипендия или финансовая помощь?",
    aid_yes: "Да, важно", aid_no: "Не обязательно",
    ob2_title: "Где хочешь учиться?",
    ob2_sub: "Отметь регионы на карте. Если ничего не выбрать, покажем вузы со всего мира.",
    map_hint: "Нажми на регион, чтобы выбрать его или снять выбор",
    map_universities_suffix: "университетов",
    country_refine: "Уточнить страны (необязательно)",
    ob3_title: "Профиль готов",
    ob3_sub: "Мы оценили твои шансы и собрали вузы под твои запросы.",
    strength_label: "Академическая сила",
    major_kv: "Специальность", budget_kv: "Бюджет", regions_kv: "Регионы", world: "Весь мир",
    start_swiping: "Смотреть вузы",
    nav_premium: "Premium",
    d_short: n => n < 0 ? `просрочено на ${Math.abs(n)} ${ruDays(Math.abs(n))}` : `${n} ${ruDays(n)}`,
    board_col_not_started: "Пока не начато", board_col_in_progress: "Пишу и собираю", board_col_submitted: "Отправлено", board_col_decision: "Ответ получен",
    board_empty_not_started: "Новые лайки попадают сюда сами.", board_empty_in_progress: "Сюда попадут заявки, которые ты начал(а).", board_empty_submitted: "Пока ничего не отправлено.", board_empty_decision: "Здесь появятся ответы вузов.",
    board_move_next: s => `Переместить: ${s}`, board_move_back: "Назад",
    season_ready: "Готовность", season_ready_sub: (d, n) => `${d} из ${n} документов`,
    season_next: "Ближайший дедлайн", season_next_none: "Дедлайнов нет",
    season_mix: "Баланс списка",
    mix_few: "Обычно подают в 6–10 вузов: пару сложных, несколько реальных и хотя бы один надёжный. У тебя пока меньше.",
    mix_no_likely: "Нет запасного варианта. Добавь 1–2 вуза с высоким шансом.",
    mix_reach_heavy: "Сложных вузов больше, чем остальных. Добавь вузы с реальным шансом.",
    mix_ok: "Список сбалансирован: есть и амбициозные, и надёжные варианты.",
    season_focus: "Что сделать сейчас", season_focus_empty: "Срочных задач нет. Все документы под контролем.",
    season_ladder: "Все дедлайны",
    act_tests: "Сдать тест", act_recs: "Запросить рекомендации", act_essay: "Закончить эссе", act_transcript: "Подготовить выписку оценок", act_submit: "Отметить как поданную",
    due_by: d => `до ${d}`, due_today: "сегодня", due_late: "просрочено",
    cal_export: "Дедлайны в календарь", cal_done: "Файл .ics скачан — открой его в Google Calendar, Apple Calendar или Outlook", cal_empty: "Нет активных заявок для экспорта",
    cal_note: "Ориентировочная дата, проверь её на сайте приёмной комиссии вуза. Создано в Admitly.",
    pm_h1: "Узнай, сколько баллов не хватает до шанса повыше",
    pm_lead: "Симулятор показывает, как изменится твой шанс, если поднять GPA или балл теста, и в каких вузах это реально что-то даст.",
    pm_cta: "Включить Premium для теста", pm_cta_active: "Premium активен", pm_demo_note: "Оплата ещё не подключена: кнопка включает Premium сразу и бесплатно — чтобы всё попробовать.",
    pm_buy: "Оформить Premium", pm_buy_note: "Оплата картой на защищённой странице Stripe. Premium включается сразу после оплаты.",
    pm_pay_off: "Оплата ещё не подключена — сообщим, когда запустим", pm_pay_success: "Оплата прошла! Premium включается в течение минуты.",
    pm_insight_title: n => `В ${n} ${ruPlural(n, 'вузе', 'вузах', 'вузах')} ты в шаге от следующего уровня`,
    pm_insight_none: "Лайкни несколько вузов, и здесь появится твой личный расчёт.",
    pm_insight_row: (from, to, d, unit) => `${chanceLabel(from)} → ${chanceLabel(to)}, если поднять ${unit} на ${d}`,
    pm_unlock_insight: "Открыть расчёт",
    pm_features: "Что внутри",
    pm_f_sim: "Симулятор «Что если?»", pm_f_sim_d: "Двигай GPA и балл теста на странице вуза и сразу видишь, как меняется шанс.",
    pm_f_cal: "Дедлайны в календарь", pm_f_cal_d: "Один файл .ics: дедлайны и вехи подготовки появятся в твоём календаре с напоминанием за неделю.",
    pm_f_pdf: "PDF-отчёт по вузу", pm_f_pdf_d: "Шансы, совпадение и план подготовки на одной странице. Удобно показать родителям.",
    pm_f_share: "Доступ для родителя", pm_f_share_d: "Ссылка только на просмотр: родитель или консультант видит твой список вузов и шансы — без входа в аккаунт.",
    pm_tag_live: "Работает", pm_tag_soon: "Скоро",
    pm_free_title: "Бесплатно", pm_free_1: "Свайпы и Match Score", pm_free_2: "Шансы на поступление по твоим баллам", pm_free_3: "Доска заявок и план сезона", pm_free_4: "ДНК-профиль",
    pm_pro_title: "Premium",
    pm_active_lead: "Всё включено. Вот с чего начать:", pm_go_sim: "Открыть симулятор в понравившихся", pm_go_cal: "Скачать календарь", pm_go_share: "Ссылка для родителя",
    season_teaser: n => n > 0 ? `${n} ${ruPlural(n, 'вуз', 'вуза', 'вузов')} можно подтянуть до следующего уровня` : "Узнай, что сдвинет твои шансы",
    sb_pm_cta: "Смотреть",
    paywall_more: "Что входит в Premium",
    tab_tracker: "Мои заявки", tab_roadmap: "План по датам",
    tracker_title: "Заявки", roadmap_title: "Заявки",
    nav_discover: "Подбор", nav_matches: "Понравившиеся", nav_tracker: "Заявки", nav_dna: "ДНК-профиль", nav_account: "Профиль", account_sub: "Профиль, язык и тема оформления.",
    guest_line: id => `Гость · ${id}`, account_line: e => `Аккаунт: ${e}`,
    restart: "↺ Пройти профиль заново",
    restart_confirm: "Сбросить профиль и начать заново? Гостевая сессия и список понравившихся будут удалены.",
    discover_title: "Подбор",
    discover_sub_fallback: "В выбранном регионе пока мало вузов в базе — показываем подборку по всему миру",
    discover_sub: n => `${n} ${ruPlural(n, 'университет подходит', 'университета подходят', 'университетов подходят')} под твои критерии`,
    discover_sub_loading: "Подбираем университеты под твой профиль…",
    uni_lookup_loading: "Загружаем университет…",
    deck_empty_title: "Карточки закончились",
    deck_empty_body: "Ты посмотрел(а) все вузы под свои критерии. Твой список — в разделе «Понравившиеся».",
    view_matches: "Смотреть понравившиеся",
    your_matches: n => `Понравившиеся (${n})`,
    swipe_hint_empty: "Свайпни вправо, чтобы добавить вуз в список",
    how_it_works: "Как это работает",
    how_it_works_body: "Совпадение — это в первую очередь вкус: специальность, цена, место. Поступаемость входит в него лишь небольшим весом (15%). Шанс считается отдельно — по твоим баллам и статистике вуза. Это разные вопросы, поэтому и цифры разные.",
    scholarship_label: "Финансовая помощь и стипендии",
    added_to_matches: name => `${name} — в понравившихся`,
    your_matches_title: "Понравившиеся",
    matches_sub: n => `${n} ${ruPlural(n, 'университет в твоём списке', 'университета в твоём списке', 'университетов в твоём списке')}`,
    filter_all: "Все",
    empty_matches: "Пока пусто. Лайкни вузы в «Подборе», и они появятся здесь.",
    to_discover: "К подбору",
    
    
    tracker_sub: n => `${n} ${ruPlural(n, 'заявка', 'заявки', 'заявок')} в списке`,
    empty_tracker: "Заявок пока нет. Лайкни вуз в «Подборе», и он появится здесь.",
    
    roadmap_sub: n => `${n} ${ruPlural(n, 'вуз ждёт', 'вуза ждут', 'вузов ждут')} подачи заявки`,
    empty_roadmap: "Активных заявок нет. Лайкни вуз, и здесь появится план.",
    status_not_started: "Не начато", status_in_progress: "В процессе", status_submitted: "Подано", status_decision: "Ответ получен",
    doc_essay: "Эссе", doc_recs: "Рекомендации", doc_transcript: "Выписка оценок", doc_tests: "Тесты",
    days_left: n => n < 0 ? `Просрочено на ${Math.abs(n)} ${ruDays(Math.abs(n))}` : (n === 0 ? "Дедлайн сегодня" : `Осталось ${n} ${ruDays(n)}`),
    roadmap_tests: "Тесты", roadmap_transcript: "Выписка оценок", roadmap_recs: "Рекомендации", roadmap_essay: "Эссе", roadmap_submit: "Отметить как поданную",
    back_btn: "Назад",
    save_btn: "Сохранить", in_matches_btn: "В понравившихся", share_btn: "Поделиться",
    match_pref: "Match Score",
    admission_diff: "Admission Reality",
    match_breakdown: "Из чего складывается совпадение",
    removed_from_matches: "Убрано из понравившихся",
    added_to_matches_short: "Добавлено в понравившиеся",
    link_copied: "Ссылка скопирована (демо)",
    dna_title: "ДНК-профиль",
    dna_sub: n => `Строится по твоим лайкам: ${n} ${ruPlural(n, "вуз", "вуза", "вузов")}`,
    dna_liked: "Понравилось", dna_passed: "Пропущено", dna_avg: "Средний Match",
    dna_profile_title: "Твой профиль",
    dna_profile_sub: "Чем больше свайпов, тем точнее картина.",
    dna_share: "Поделиться ДНК-профилем",
    dna_share_toast: "Карточка скопирована (демо для соцсетей)",
    dna_what_title: "Что это значит",
    dna_what_p1: "ДНК-профиль показывает, что тебе нравится на самом деле. Он собирается из твоих свайпов, а не из анкеты.",
    dna_what_p2: "Если ты чаще лайкаешь вузы одного типа, график вытянется в эту сторону. Так видно, что для тебя главное: климат, размер, цена или наука.",
    why_cs: cs => `Один из сильнейших факультетов информатики в подборке (${cs}/100)`,
    why_setting: s => `Совпадает с твоим предпочтением по типу кампуса: ${s}`,
    why_climate: c => `Климат (${c}) соответствует твоим предпочтениям`,
    why_research: r => `Высокий уровень научной работы (${r}/5)`,
    why_cost: "Стоимость обучения укладывается в твой бюджет",
    why_generic: "Похож по профилю на другие университеты, которые тебе понравились",
    qt_elite_cs: "Топ по информатике", qt_strong_cs: "Сильная информатика", qt_top_research: "Мощная наука",
    qt_strong_aid: "Хорошая финпомощь", qt_affordable: "Доступная цена", qt_good_odds: "Высокие шансы",
    qt_solid_pick: "Крепкий вариант", qt_very_competitive: "Очень высокий конкурс", qt_expensive: "Дорого",
    qt_weak_aid: "Слабая финпомощь", qt_competitive: "Высокий конкурс", qt_pricey: "Недёшево", qt_niche_fit: "Смотри детали",
    snapshot: "Общая картина", location_kv: "Расположение", setting_kv: "Кампус", size_kv: "Размер", climate_kv: "Климат",
    about_title: "Об университете", visit_website: "Сайт университета",
    acceptance_kv: "Доля принятых", cs_index_kv: "Индекс информатики", tags_title: "Метки",
    cs_program_title: "Программа по информатике", cs_strength_kv: "Сила программы", research_opp_kv: "Научная работа",
    admission_reality_title: "Шансы на поступление", admission_reality_body: (g25, g75, s25, s75) => `Диапазон баллов поступающих (GPA от ${g25} до ${g75}, SAT от ${s25} до ${s75}) оценён по доле принятых. Для вузов США SAT взят из College Scorecard, а GPA и данные вузов вне США посчитаны приблизительно. Мы сравниваем твои баллы с этим диапазоном, а не с общим процентом приёма.`,
    sim_title: "А если поднять баллы?", sim_body: "Подвигай ползунки и посмотри, как GPA и балл теста меняют твой шанс. Сохранённый профиль при этом не меняется.",
    sim_locked_body: "Симулятор доступен в Premium.", sim_unlock_cta: "Открыть Премиум",
    sim_gpa_label: "GPA", sim_explain_gpa: "Слабое место сейчас — GPA: балл теста выглядит сильнее.", sim_explain_test: "Слабое место сейчас — балл теста: GPA выглядит сильнее.",
    partner_cta: "Перейти →",
    paywall_title: "Премиум-фича", paywall_body: "Эта функция доступна в Admitly Premium.",
    paywall_cta_demo: "Активировать Премиум (демо)", paywall_note: "Оплата ещё не подключена: кнопка включает Premium сразу и бесплатно.",
    premium_activated: "Премиум активирован (демо)", premium_demo_off: "Premium не включился: демо-режим отключён на сервере",
    premium_active_title: "Premium", premium_active_desc: "Активен (демо, без оплаты).",
    premium_free_title: "Admitly Premium", premium_season_sub: "Все премиум-функции.",
    premium_feat_sim: "Симулятор «Что если?» (GPA/тест)", premium_feat_pdf: "PDF-отчёты по вузам",
    premium_feat_calendar: "Экспорт дедлайнов в календарь", premium_feat_share: "Доступ для родителя/консультанта",
    premium_demo_grant: "Включить (демо)", premium_demo_revoke: "Отключить премиум",
    pdf_btn: "PDF-отчёт", pdf_popup_blocked: "Браузер заблокировал окно печати — разреши всплывающие окна и попробуй снова.",
    pdf_footer: "Отчёт собран в Admitly. Цифры ориентировочные: проверяй актуальные данные на сайте вуза. Диалог печати — «Сохранить как PDF».",
    share_link_copied: "Ссылка скопирована — отправь её родителю или консультанту",
    share_view_title: "Подборка в Admitly", share_view_sub: "Список вузов, сохранённых студентом. Только просмотр.",
    share_loading: "Загружаем подборку…", share_owner_line: "Студент:", share_empty: "В подборке пока пусто.",
    share_invalid: "Ссылка недействительна или была отозвана", share_open_app: "Открыть Admitly",
    legend_title: "Обозначения",
    legend_reach: "Сложно — твои баллы ниже, чем у большинства поступивших",
    legend_target: "Реально — твои баллы на уровне поступивших",
    legend_likely: "Высокий — твои баллы выше, чем у большинства поступивших",
    your_profile_short: "Твой профиль",
    checklist_title: "Заполненность профиля", checklist_all_done: "Всё заполнено — совпадение и шансы считаются по полным данным.",
    checklist_setting: "Укажи, где хочешь жить: в городе, пригороде или у моря.",
    checklist_climate: "Укажи, какой климат тебе ближе.",
    checklist_size: "Укажи желаемый размер вуза (маленький, средний или большой).",
    checklist_aid: "Ответь, нужна ли стипендия — это влияет на подборку.",
    checklist_region: "Выбери регионы, где хочешь учиться.",
    checklist_progress: p => `Заполнен на ${p}%`,
    activity_title: "Активность", activity_today: "просмотрено сегодня",
    activity_breakdown: (liked, passed) => `Лайкнуто всего: ${liked} · Пропущено в этой сессии: ${passed}`,
    recent_passes_title: "Только что пропустил(а)", restore_btn: "Вернуть",
    restored_card: name => `${name} снова в колоде`,
    dna_preview_title: "ДНК-профиль", dna_preview_cta: "Смотреть полную картину",
    essay_tip_title: "Совет дня: эссе о выборе специальности",
    essay_tips: [
      "Не пиши «я с детства люблю программировать» — так пишут все. Начни с конкретного случая: например, с ошибки в коде, которую ты искал(а) три часа.",
      "Эссе «почему эта специальность» — не признание в любви к предмету, а история задачи, которую тебе хотелось решить.",
      "Комиссия читает сотни эссе про «изменить мир с помощью технологий». Небольшой реальный проект убеждает сильнее.",
      "Показывай, а не рассказывай: вместо «я аналитически мыслю» опиши случай, где это было видно.",
      "В части «почему этот вуз» называй конкретные курсы, лаборатории и преподавателей, а не место в рейтинге.",
      "Первая фраза должна цеплять сама по себе: на одну заявку у комиссии уходит 8–10 минут."
    ],
    filters_title: "Фильтры", kbd_pass: "Мимо", kbd_like: "Нравится",
    compare_title: "Сравнение", compare_cta: "Сравнить", compare_pick: "Выбери 2–3 вуза, чтобы сравнить их",
    compare_empty: "Сначала лайкни хотя бы 2 университета, чтобы сравнить их.", compare_close: "Закрыть сравнение",
    edit_profile_link: "Изменить",
    annual_cost_title: "Стоимость в год", sticker_kv: "Полная цена", est_aid_kv: "С учётом помощи", your_budget_kv: "Твой бюджет",
    fits_budget_kv: "Укладывается в бюджет?", fits_yes: "Да", fits_tight: "Впритык",
    aid_options_title: "Финансовая помощь и стипендии", aid_level_kv: "Размер финпомощи", merit_kv: "Стипендии за успехи",
    why_title: "Почему этот университет?",

    /* ===== LANDING ===== */
    nav_how: "Как это работает", nav_why: "Почему мы", nav_pricing: "Бесплатно",
    nav_cta: "Начать бесплатно", nav_login: "Войти",

    auth_login_title: "Вход в Admitly", auth_login_sub: "Профиль, лайки и подборка хранятся в аккаунте. Заходи с любого устройства.",
    auth_register_title: "Регистрация в Admitly", auth_register_sub: "Сохрани прогресс, чтобы не потерять его на другом устройстве.",
    auth_email_ph: "you@example.com", auth_password_ph: "Пароль",
    auth_submit_login: "Войти", auth_submit_register: "Зарегистрироваться", auth_submitting: "Секунду…",
    auth_no_account: "Нет аккаунта?", auth_to_register: "Зарегистрироваться",
    auth_have_account: "Уже есть аккаунт?", auth_to_login: "Войти",
    auth_logout_btn: "Выйти",
    auth_legal: "Продолжая, ты принимаешь", auth_legal_terms: "оферту", auth_legal_and: "и", auth_legal_privacy: "политику персональных данных",
    auth_error_generic: "Не получилось. Проверь почту и пароль и попробуй ещё раз.",
    auth_error_network: "Сервер недоступен. Попробуй ещё раз через минуту.",
    auth_session_expired: "Сессия истекла — войди через кнопку в шапке или продолжи как гость.",
    auth_or: "или", auth_social_soon: "Вход через {provider} ещё не подключён — нужен ключ приложения. Пока можно войти по почте.", auth_social_fail: "Не получилось войти. Попробуй ещё раз или войди по почте.", auth_social_ok: "Вход через {provider} выполнен",
    hero_title: "Найди университет, который реально тебе подходит.",
    hero_sub: "Свайпай вузы вместо десятков вкладок. Совпадение — насколько вуз подходит тебе, шанс — реально ли поступить туда с твоими баллами.",
    hero_cta_primary: "Найти свой вуз",
    hero_stat1_v: String(TOTAL_UNIVERSITIES_COUNT), hero_stat1_l: "университетов в каталоге",
    hero_stat2_v: "Бесплатно", hero_stat2_l: "без пробного периода",
    hero_stat3_v: "5 шагов", hero_stat3_l: "до первой подборки",
    hero_chip1: "Match Score считается честно",
    hero_chip2: "Без скрытых платных стен",
    hero_chip3: "Admission Reality — по цифрам",
    /* Было «Сделай важный шаг в своё будущее» — чистой воды мотивационный
       лозунг без смысла (AI-slop). Теперь конкретика: что делает человек
       и что получает. */
    hero_quote: "Свайпни десяток вузов — <span class='hq-accent'>подходящие сохранятся в твой список</span>.",
    hero_card_match: "Совпадение", hero_card_reality: "Шанс",
    /* Было «Match Score / Admission Reality» — английский жаргон в русской
       карточке. В приложении термины уже локализованы: chanceLabel() даёт
       Сложно/Реально/Высокий, подпись — «Шанс» (см. hero_sub). */

    pain_title: "Выбор вуза оказывается стрессом, к которому обычно не готовят.",
    marquee_eyebrow: "Такие вузы уже внутри",
    pain_body: "Ещё до выбора вуза встаёт вопрос сложнее: а что вообще изучать? Потом — десятки вкладок, советы, которые спорят друг с другом, и дедлайны, о которых узнаёшь слишком поздно. И постоянный страх совершить дорогую ошибку, которую некому проверить.",
    pain1_title: "«Я даже не знаю, что изучать»",
    pain1_body: "Многие начинают искать вуз, ещё не выбрав направление. А почти все сервисы считают, что ты уже определился.",
    pain2_title: "«Не знаю, с чего вообще начать»",
    pain2_body: "Тысячи программ, десятки стран, и каждый советует своё. Непонятно, кому верить.",
    pain3_title: "«А если я ошибусь?»",
    pain3_body: "От этого решения зависят несколько лет жизни и большие деньги. А принимают его почти наугад, через поисковик.",
    pain_footer: "Дело не в тебе. Выбор вуза до сих пор делают в десятках вкладок и почти наугад.",
    dawn_eyebrow: "А потом становится проще",
    dawn_body: "Понравившиеся вузы сохраняются в один список. Для каждого можно вести чек-лист заявки.",
    why_compare_title: "Сорок вкладок или один список",
    why_badge: "Проще",
    why_before_label: "Без Admitly", why_before_points: ["Десятки вкладок с сайтами вузов", "Советы из чатов, и у каждого свои", "Шансы на поступление — на глаз"],
    why_after_label: "С Admitly", why_after_points: ["Один список, собранный под тебя", "Совпадение — насколько вуз подходит тебе", "Шанс — насколько реально поступить"],
    why_note: "Меньше вкладок — больше времени на сами заявки.",

    how_title: "Как это работает",
    how_sub: "Четыре шага: от первого свайпа до отправки заявки.",
    how1_title: "По каждому вузу план заявки", how1_body: "Лайкнул Cornell, и его чек-лист уже в «Заявках»: тесты, эссе, рекомендации, транскрипт. ED 1 ноября, RD 2 января. Отмечай готовое, даты перепроверяй на сайте вуза.",
    how2_title: "Профиль рисуется сам по лайкам", how2_body: "Анкеты на сто вопросов нет. Приложение смотрит, какие вузы ты лайкаешь, и рисует радар: сильный CS, город покрупнее, бюджет до $60K в год. Не согласен с чем-то, поправь в фильтрах.",
    how3_title: "Листаешь карточки вузов", how3_body: "На карточке кампус, процент поступления, SAT и GPA прошлого набора, полная стоимость года. Нравится, свайпаешь вправо. Не нравится, влево. Десяток вузов уходит за пару минут.",
    how4_title: "Лайкнутое собирается в список", how4_body: "Свайп вправо, и вуз уже в «Понравившихся», на своём месте по совпадению. Список выходит короткий. Таблиц на 300 вкладок нет.",

    why_section_title: "Не очередной поисковик по вузам",
    why_section_body: "Каталоги дают только фильтры. Нейросети отвечают уверенно, но не говорят, откуда взяли цифры. Admitly считает совпадение и шансы раздельно и показывает, из чего складывается каждая цифра.",
    why_col1: "Обычный поиск", why_col1_body: "Фильтры, которые ничего не знают о тебе и твоих шансах.",
    why_col2: "Нейросети", why_col2_body: "Могут уверенно называть программы и дедлайны, которых не существует.",
    why_col3: "Admitly", why_col3_body: "Совпадение и шансы показываются раздельно — у них разная арифметика.",

    cta_title: "Посмотрим, какие вузы тебе подходят?",
    cta_sub: "Регистрация не нужна. Пять шагов — и первая подборка готова.",
    cta_button: "Начать бесплатно",
    footer_tagline: "Честный подбор вузов: совпадение и шансы на поступление — отдельно и без магии.",
    footer_contact: "Нашли баг или есть технический вопрос?",
    footer_contact_title: "Контакты",
    footer_product: "Продукт", footer_company: "О проекте", footer_legal: "Документы",
    footer_how: "Как это работает", footer_why: "Почему мы", footer_privacy: "Конфиденциальность", footer_terms: "Условия",
    footer_rights: "Все права защищены.",
    server_error: "Не удалось связаться с сервером. Попробуй ещё раз чуть позже.",
    connecting: "Подключаемся к серверу…",
  },
  en: {
    step_of: n => `Step ${n} of 5`,
    obx_title: "Grades & exams",
    obx_sub: "We use these to estimate your chances. Skip any exam you have not taken yet.",
    ob0_title: "Tell us about yourself",
    ob0_sub: "It helps us show both whether you'll like a school and how realistic getting in is.",
    gpa_label: "GPA (0.0 – 4.0)",
    gpa_hint: "GPA is your average grade on a 4.0 scale. If your school grades differently, check how your target universities recalculate it.",
    test_type_label: "Test type",
    test_none: "Haven't taken one yet",
    test_none_hint: "No problem — you can add a score later. For now we'll base things on GPA only.",
    score_label: r => `Score (${r})`,
    sat_explain: "SAT — a standardized US college admissions test covering math and reading/writing, scored out of 1600.",
    act_explain: "ACT — an alternative to the SAT with four sections (English, math, reading, science), scored out of 36.",
    ielts_explain: "IELTS — an international English proficiency exam, scored on a 0–9 band scale.",
    ielts_hint: "Usually expected if you're applying to an English-language program from abroad.",
    toefl_explain: "TOEFL iBT — US English test scored 0–120. Most universities ask for 90–100+.",
    det_explain: "Duolingo English Test — online English test from home, 10–160. Accepted by 5,000+ schools, usually 115–120+.",
    ib_explain: "IB Diploma — international high-school diploma, 24–45 points. 38+ is strong.",
    ege_explain: "EGE (Unified State Exam) — total of three subjects (plus up to 10 for achievements). Required for Russian universities.",
    ege_hint: "The cutoff for tuition-free places depends on the program and university — see last year's numbers on the admissions site.",
    tests_academic: "Academic exams", tests_english: "English",
    home_country_label: "Where you're from", home_lang_label: "Native language", choose_ph: "Choose",
    home_country_hint: "This drives scholarships: some aid is only for citizens of the university's country.",
    home_lang_hint: "The language you studied in. It affects how easy it is to settle into classes.",
    major_label: "Intended major",
    degree_label: "Degree level",
    degree_bachelor: "Bachelor's", degree_master: "Master's", degree_phd: "PhD / Doctorate",
    next: "Next", back: "Back",
    ob1_title: "Your preferences",
    ob1_sub: "These are the starting weights for Match Score — the system refines them as you swipe.",
    size_label: "University size",
    size_small: "Small", size_medium: "Medium", size_large: "Large",
    setting_label: "Campus setting",
    setting_urban: "Urban", setting_suburban: "Suburban", setting_coastal: "Coastal",
    climate_label: "Climate",
    climate_warm: "Warm", climate_moderate: "Moderate", climate_cold: "Cold",
    multi_select_hint: "You can select more than one",
    research_label: "Importance of research opportunities",
    budget_label: "Budget per year, up to",
    aid_label: "Need financial aid / scholarships?",
    aid_yes: "Yes, important", aid_no: "Not critical",
    ob2_title: "Where do you want to study?",
    ob2_sub: "Pick one or more continents on the map. You can leave it empty to see options from around the world.",
    map_hint: "Click a region to toggle it on/off",
    map_universities_suffix: "universities",
    country_refine: "Narrow down countries (optional)",
    ob3_title: "Profile ready",
    ob3_sub: "We've calculated your academic strength index and picked universities matching your criteria.",
    strength_label: "Academic strength",
    major_kv: "Major", budget_kv: "Budget", regions_kv: "Regions", world: "Worldwide",
    start_swiping: "Start swiping",
    nav_premium: "Premium",
    d_short: n => n < 0 ? `−${Math.abs(n)}d` : `${n}d`,
    board_col_not_started: "Not started", board_col_in_progress: "In the works", board_col_submitted: "Sent", board_col_decision: "Heard back",
    board_empty_not_started: "New likes land here on their own.", board_empty_in_progress: "Applications you have started move here.", board_empty_submitted: "Nothing sent yet.", board_empty_decision: "Decisions from schools will show up here.",
    board_move_next: s => `Move to: ${s}`, board_move_back: "Back",
    season_ready: "Readiness", season_ready_sub: (d, n) => `${d} of ${n} documents`,
    season_next: "Nearest deadline", season_next_none: "No deadlines",
    season_mix: "List balance",
    mix_few: "Most applicants send 6–10 applications: a couple of Reach, several Target and at least one Likely. You have fewer for now.",
    mix_no_likely: "No safety option yet. Add one or two Likely schools so you are not left without an answer.",
    mix_reach_heavy: "Reach outnumbers everything else. Add some Target schools, or your odds of a yes stay low.",
    mix_ok: "The list is balanced: ambitious and safer options are both there.",
    season_focus: "Do these first", season_focus_empty: "Nothing urgent. Every document is under control.",
    season_ladder: "Deadlines in order",
    act_tests: "Take the test", act_recs: "Request recommendations", act_essay: "Finish the essay", act_transcript: "Prepare the transcript", act_submit: "Mark as submitted",
    due_by: d => `by ${d}`, due_today: "today", due_late: "overdue",
    cal_export: "Deadlines to calendar", cal_done: "The .ics file is downloaded — open it in Google Calendar, Apple Calendar or Outlook", cal_empty: "No active applications to export",
    cal_note: "Estimated date — check it on the school's admissions site. Created in Admitly.",
    pm_h1: "Find out how many points separate you from Target",
    pm_lead: "The simulator shows how your admission chances change if you raise GPA or a test score, and at which schools it actually matters.",
    pm_cta: "Turn on Premium for testing", pm_cta_active: "Premium is on", pm_demo_note: "Payments aren't wired up yet: the button turns Premium on right away, free, so you can try everything.",
    pm_buy: "Get Premium", pm_buy_note: "Card payment on Stripe's secure page. Premium turns on right after payment.",
    pm_pay_off: "Payments aren't connected yet — we'll announce the launch", pm_pay_success: "Payment complete! Premium activates within a minute.",
    pm_insight_title: n => `You are one step from the next level at ${n} ${n === 1 ? 'school' : 'schools'}`,
    pm_insight_none: "Like a few schools and your personal calculation will appear here.",
    pm_insight_row: (from, to, d, unit) => `${from} → ${to} at ${unit} +${d}`,
    pm_unlock_insight: "Unlock the calculation",
    pm_features: "What is inside",
    pm_f_sim: "\"What if?\" simulator", pm_f_sim_d: "Move GPA and test score on any school page and see the new level right away: Reach, Target or Likely.",
    pm_f_cal: "Deadlines in your calendar", pm_f_cal_d: "One .ics file: deadlines and prep milestones land in your calendar with a reminder a week ahead.",
    pm_f_pdf: "PDF report per school", pm_f_pdf_d: "Chances, Match Score breakdown and a prep plan on one page. Easy to show your parents.",
    pm_f_share: "Parent access", pm_f_share_d: "A view-only link: a parent or counselor sees your school list and admission odds — no login needed.",
    pm_tag_live: "Live", pm_tag_soon: "Soon",
    pm_free_title: "Free", pm_free_1: "Swipes and Match Score", pm_free_2: "Admission Reality for your profile", pm_free_3: "Application board and season plan", pm_free_4: "University DNA",
    pm_pro_title: "Premium",
    pm_active_lead: "Everything is on. Here is where to start:", pm_go_sim: "Open the simulator in your liked schools", pm_go_cal: "Download the calendar", pm_go_share: "Parent link",
    season_teaser: n => n > 0 ? `${n} ${n === 1 ? 'school' : 'schools'} can move up a level` : "See what would move your odds",
    sb_pm_cta: "See more",
    paywall_more: "What Premium includes",
    tab_tracker: "My applications", tab_roadmap: "Plan by date",
    tracker_title: "Applications", roadmap_title: "Applications",
    nav_discover: "Discover", nav_matches: "Matches", nav_tracker: "Application Tracker", nav_dna: "University DNA", nav_account: "Account", account_sub: "Your profile, language, and theme — same as the sidebar on desktop.",
    guest_line: id => `Guest · ${id}`, account_line: e => `Account: ${e}`,
    restart: "↺ Redo profile",
    restart_confirm: "Reset your profile and start over? Your guest session and Matches list will be deleted.",
    discover_title: "Discover",
    discover_sub_fallback: "Not many universities in this region yet — showing picks from around the world",
    discover_sub: n => `${n} universities match your criteria`,
    discover_sub_loading: "Matching universities to your profile…",
    uni_lookup_loading: "Loading university…",
    deck_empty_title: "That's all the cards",
    deck_empty_body: "You've gone through every university matching your criteria. Check out Matches to see your list.",
    view_matches: "View Matches",
    your_matches: n => `Your Matches (${n})`,
    swipe_hint_empty: "Swipe right to add a school to your list",
    how_it_works: "How this works",
    how_it_works_body: "Match Score is mostly about taste: major, cost, location. Admission odds enter it only with a small weight (15%). Admission Reality is a separate estimate from your scores and the school's own stats. Different questions, different numbers.",
    scholarship_label: "Scholarships/aid",
    added_to_matches: name => `${name} added to Matches`,
    your_matches_title: "Your Matches",
    matches_sub: n => `${n} universities in your list`,
    filter_all: "All",
    empty_matches: "Nothing here yet. Go back to Discover and like some universities.",
    to_discover: "Go to Discover",
    
    
    tracker_sub: n => `${n} application${n === 1 ? '' : 's'} in your list`,
    empty_tracker: "No applications yet. Like a university on Discover — its application card will show up here automatically.",
    
    roadmap_sub: n => `${n} ${n === 1 ? 'university' : 'universities'} still to submit`,
    empty_roadmap: "Everything's submitted, or you haven't liked any universities yet. Check back later.",
    status_not_started: "Not started", status_in_progress: "In progress", status_submitted: "Submitted", status_decision: "Decision",
    doc_essay: "Essay", doc_recs: "Recommendations", doc_transcript: "Transcript", doc_tests: "Tests",
    days_left: n => n < 0 ? `Overdue by ${Math.abs(n)} day${Math.abs(n) === 1 ? '' : 's'}` : (n === 0 ? "Due today" : `${n} day${n === 1 ? '' : 's'} left`),
    roadmap_tests: "Tests", roadmap_transcript: "Transcript", roadmap_recs: "Recs", roadmap_essay: "Essay", roadmap_submit: "Mark as submitted",
    back_btn: "Back",
    save_btn: "Save", in_matches_btn: "In Matches", share_btn: "Share",
    match_pref: "Match Score",
    admission_diff: "Admission Reality",
    match_breakdown: "Match Breakdown",
    removed_from_matches: "Removed from Matches",
    added_to_matches_short: "Added to Matches",
    link_copied: "Link copied (demo)",
    dna_title: "University DNA",
    dna_sub: n => `Updates as you swipe — ${n} liked universities`,
    dna_liked: "Liked", dna_passed: "Passed", dna_avg: "Avg Match",
    dna_profile_title: "Your profile",
    dna_profile_sub: "The more you swipe, the more accurate this gets.",
    dna_share: "Share University DNA",
    dna_share_toast: "Card copied (demo for social sharing)",
    dna_what_title: "What this means",
    dna_what_p1: "University DNA is a profile of what you actually like. It is built from your swipes, not from a questionnaire.",
    dna_what_p2: "If one type of school dominates your likes, the radar stretches that way. It shows what you actually care about: climate, class size, cost or research.",
    why_cs: cs => `One of the strongest CS departments in this set (${cs}/100)`,
    why_setting: s => `Matches your campus-setting preference: ${s}`,
    why_climate: c => `Climate (${c}) matches your preferences`,
    why_research: r => `High level of research opportunities (${r}/5)`,
    why_cost: "Tuition fits within your budget",
    why_generic: "Similar profile to other universities you've liked",
    qt_elite_cs: "Elite CS", qt_strong_cs: "Strong CS", qt_top_research: "Heavy research",
    qt_strong_aid: "Strong aid", qt_affordable: "Affordable", qt_good_odds: "Good odds",
    qt_solid_pick: "Solid pick", qt_very_competitive: "Very competitive", qt_expensive: "Expensive",
    qt_weak_aid: "Weak aid", qt_competitive: "Competitive", qt_pricey: "Pricey", qt_niche_fit: "Check details",
    snapshot: "Snapshot", location_kv: "Location", setting_kv: "Setting", size_kv: "Size", climate_kv: "Climate",
    about_title: "About", visit_website: "University website",
    acceptance_kv: "Acceptance rate", cs_index_kv: "CS Strength Index", tags_title: "Tags",
    cs_program_title: "Computer Science Program", cs_strength_kv: "CS Program Strength", research_opp_kv: "Research Opportunities",
    admission_reality_title: "Admission Reality", admission_reality_body: (g25, g75, s25, s75) => `The admitted-student range (GPA ${g25}–${g75}, SAT ${s25}–${s75}) is estimated from the acceptance rate. SAT for US schools comes from College Scorecard; GPA and all non-US figures are approximate. We compare your numbers to that range, not to the overall acceptance rate.`,
    sim_title: "What if?", sim_body: "Drag the sliders to see how GPA and test score move Reach/Target/Likely for this school. Your saved profile doesn't change.",
    sim_locked_body: "GPA/test simulator is a premium feature.", sim_unlock_cta: "Unlock Premium",
    sim_gpa_label: "GPA", sim_explain_gpa: "The weaker signal here is GPA — your test score currently reads stronger.", sim_explain_test: "The weaker signal here is the test score — your GPA currently reads stronger.",
    partner_cta: "Go →",
    paywall_title: "Premium feature", paywall_body: "This feature is part of Admitly Premium.",
    paywall_cta_demo: "Activate Premium (demo)", paywall_note: "Payments aren't wired up yet: the button turns Premium on right away, free.",
    premium_activated: "Premium activated (demo)", premium_demo_off: "Premium didn't turn on: demo mode is off on the server",
    premium_active_title: "Premium", premium_active_desc: "Active (demo, no billing).",
    premium_free_title: "Admitly Premium", premium_season_sub: "All premium features.",
    premium_feat_sim: "\"What if?\" simulator (GPA/test)", premium_feat_pdf: "PDF reports for each school",
    premium_feat_calendar: "Export deadlines to calendar", premium_feat_share: "Parent/counselor access",
    premium_demo_grant: "Enable (demo)", premium_demo_revoke: "Disable premium",
    pdf_btn: "PDF report", pdf_popup_blocked: "The print window was blocked — allow pop-ups and try again.",
    pdf_footer: "Report generated in Admitly. Figures are approximate — check current data on the university website. Use “Save as PDF” in the print dialog.",
    share_link_copied: "Link copied — send it to a parent or counselor",
    share_view_title: "Admitly shortlist", share_view_sub: "Schools saved by the student. View only.",
    share_loading: "Loading the shortlist…", share_owner_line: "Student:", share_empty: "The shortlist is empty so far.",
    share_invalid: "This link is invalid or was revoked", share_open_app: "Open Admitly",
    legend_title: "What the badges mean",
    legend_reach: "Reach — your academic strength is below typical admits, odds are slim",
    legend_target: "Target — roughly matches typical admits, realistic chances",
    legend_likely: "Likely — your academic strength is above typical admits, admission is likely",
    your_profile_short: "Your profile",
    checklist_title: "Profile completeness", checklist_all_done: "All set — Match Score and Admission Reality are running on your full profile.",
    checklist_setting: "Add a campus setting preference (Urban/Suburban/Coastal) — it's part of Match Score.",
    checklist_climate: "Add a climate preference — also part of Match Score.",
    checklist_size: "Add a preferred university size (Small/Medium/Large).",
    checklist_aid: "Answer whether financial aid matters — affects Match Score.",
    checklist_region: "Pick the regions you want to study in.",
    checklist_progress: p => `${p}% complete`,
    activity_title: "Activity", activity_today: "reviewed today",
    activity_breakdown: (liked, passed) => `Liked in total: ${liked} · Passed this session: ${passed}`,
    recent_passes_title: "Just passed on", restore_btn: "Restore",
    restored_card: name => `${name} is back in your deck`,
    dna_preview_title: "University DNA", dna_preview_cta: "See the full picture",
    essay_tip_title: "Tip of the day: the Why-CS essay",
    essay_tips: [
      "Don't write \"I've loved coding since I was a kid\" — everyone does. Start with a specific moment: a bug you couldn't find for three hours, then found.",
      "A good \"why this major\" answer names one problem you wanted to solve and explains how CS became the tool for it.",
      "Admissions officers read hundreds of essays about \"changing the world through technology.\" One concrete small project is more convincing than an abstract mission.",
      "Show, don't tell: not \"I think analytically,\" but one moment where that was visible in action.",
      "Tie \"why this university\" to specific people/courses/labs, not rankings — generic phrasing signals a templated essay.",
      "Your first sentence should work even without the paragraph around it — admissions officers spend 8-10 minutes per application."
    ],
    filters_title: "Filters", kbd_pass: "Pass", kbd_like: "Like",
    compare_title: "Compare", compare_cta: "Compare", compare_pick: "Pick 2-3 schools to compare side by side",
    compare_empty: "Like at least 2 universities first to compare them.", compare_close: "Close comparison",
    edit_profile_link: "Edit",
    annual_cost_title: "Annual Cost", sticker_kv: "Sticker price", est_aid_kv: "Est. with aid", your_budget_kv: "Your budget",
    fits_budget_kv: "Fits budget?", fits_yes: "Yes", fits_tight: "Tight",
    aid_options_title: "Aid & Scholarships", aid_level_kv: "Aid generosity", merit_kv: "Merit scholarships",
    why_title: "Why this university?",

    /* ===== LANDING ===== */
    nav_how: "How it works", nav_why: "Why us", nav_pricing: "Free",
    nav_cta: "Get started free", nav_login: "Log in",

    auth_login_title: "Log in to Admitly", auth_login_sub: "Your profile, likes and shortlist live in your account — pick up on any device.",
    auth_register_title: "Create your account", auth_register_sub: "Keep your progress tied to you so it isn't lost if you switch devices.",
    auth_email_ph: "you@example.com", auth_password_ph: "Password",
    auth_submit_login: "Log in", auth_submit_register: "Create account", auth_submitting: "One sec…",
    auth_no_account: "No account yet?", auth_to_register: "Sign up",
    auth_have_account: "Already have an account?", auth_to_login: "Log in",
    auth_logout_btn: "Log out",
    auth_legal: "By continuing you agree to the", auth_legal_terms: "terms", auth_legal_and: "and", auth_legal_privacy: "privacy policy",
    auth_error_generic: "That didn't work. Check your email and password and try again.",
    auth_error_network: "Server's unreachable. Try again in a minute.",
    auth_session_expired: "Session expired — use the login button in the header or continue as a guest.",
    hero_title: "Find a university that actually fits you.",
    hero_sub: "Swipe schools instead of keeping forty tabs open. Match — how well a school fits you. Chance — whether you can realistically get in with your grades.",
    hero_cta_primary: "Find your fit",
    hero_stat1_v: String(TOTAL_UNIVERSITIES_COUNT), hero_stat1_l: "universities in the catalog",
    hero_stat2_v: "Free", hero_stat2_l: "with no time limit",
    hero_stat3_v: "5 steps", hero_stat3_l: "to your first shortlist",
    hero_chip1: "Match Score is scored honestly",
    hero_chip2: "No hidden paywalls",
    hero_chip3: "Admission Reality — by the numbers",
    hero_quote: "Swipe through a dozen schools — <span class='hq-accent'>the ones you like land in your shortlist</span>.",
    hero_card_match: "Match Score", hero_card_reality: "Admission Reality",

    pain_title: "Nobody prepares you for how stressful this actually is.",
    marquee_eyebrow: "Schools like these are already inside",
    pain_body: "Long before \"which university,\" there's a harder, quieter question: what do I even want to study? Then it piles up: dozens of tabs, conflicting advice, deadlines you find out about too late, and the worry that you're about to make an expensive mistake with no one to check your work.",
    pain1_title: "\"I don't even know what to study\"",
    pain1_body: "Most students start looking before they have picked a field, and every tool assumes you already have one.",
    pain2_title: "\"I don't know where to even start\"",
    pain2_body: "Thousands of programs, dozens of countries, every source giving different advice with no way to tell which one to trust.",
    pain3_title: "\"What if I get it wrong?\"",
    pain3_body: "This decision shapes years of your life and a lot of money, and most people make it with a search bar and a guess.",
    pain_footer: "None of that is a personal failure. People still pick universities through dozens of tabs and a lot of guesswork.",
    dawn_eyebrow: "After the anxiety",
    dawn_body: "Schools you like land in one list. Each one gets an application checklist you can maintain.",
    why_compare_title: "Forty tabs, or one list",
    why_badge: "Simpler",
    why_before_label: "Without Admitly", why_before_points: ["Dozens of university tabs", "Advice from forums, all different", "Odds guessed by feel, no numbers"],
    why_after_label: "With Admitly", why_after_points: ["One list built around you", "Match Score — how much a school suits your taste", "Admission Reality — your odds, from your numbers"],
    why_note: "Fewer tabs, more time for the applications themselves.",

    how_title: "How it works",
    how_sub: "Four steps from the first swipe to a submitted application.",
    how1_title: "Every school gets an application plan", how1_body: "Like Cornell and its checklist is already in Tracker: tests, essay, recommendations, transcript. ED is November 1, RD is January 2. Tick off what's done, and double-check the dates on the school's site.",
    how2_title: "Your profile draws itself from likes", how2_body: "There is no hundred-question form. The app watches which schools you like and draws the radar: strong CS, a bigger city, under $60K a year. Disagree with something, fix it in the filters.",
    how3_title: "You swipe school cards", how3_body: "Each card shows the campus, the acceptance rate, last year's SAT and GPA, and the full cost per year. Like it, swipe right. Don't, swipe left. Ten schools take a couple of minutes.",
    how4_title: "Likes turn into a shortlist", how4_body: "Swipe right and the school is already in Matches, in its place by fit. The list stays short. No table with 300 tabs.",

    why_section_title: "Not another university search engine.",
    why_section_body: "Directory sites offer filters. ChatGPT offers confident guesses. A private counselor offers one person's network and availability. Admitly scores Match Score and Admission Reality separately and shows what goes into each number.",
    why_col1: "Generic search", why_col1_body: "Filters with no sense of your profile or real chances.",
    why_col2: "Generative AI", why_col2_body: "Can confidently name programs and deadlines that don't exist.",
    why_col3: "Admitly", why_col3_body: "Match Score and Admission Reality, shown separately with different math.",

    cta_title: "Let's see which schools fit you?",
    cta_sub: "No sign-up needed. Five steps and your first shortlist is ready.",
    cta_button: "Get started free",
    footer_tagline: "Honest university matching: Match Score and Admission Reality, kept separate, no magic.",
    footer_contact: "Found a bug or have a technical question?",
    footer_contact_title: "Contact",
    footer_product: "Product", footer_company: "Company", footer_legal: "Legal",
    footer_how: "How it works", footer_why: "Why us", footer_privacy: "Privacy", footer_terms: "Terms",
    footer_rights: "All rights reserved.",
    server_error: "Couldn't reach the server. Please try again in a moment.",
    connecting: "Connecting to server…",
  }
};
/* Типографика: тире не должно начинать строку (перенос «шанс / — реально» выглядит
   сломанным). Клеим тире к слову слева неразрывным пробелом — тогда перенос
   происходит ПОСЛЕ тире, а не перед ним. */
function typoDash(s) {
  // Массивы (например why_after_points) обрабатываем поэлементно, сохраняя тип.
  if (Array.isArray(s)) return s.map(typoDash);
  if (typeof s !== 'string') return s;
  return s
    // тире не должно начинать строку — прижимаем его к предыдущему слову
    .replace(/ — /g, '\u00A0— ')
    // Одиночные предлоги/союзы (в, с, к, о, у, и, а, я) не должны висеть в
    // конце строки («...поступить туда с ↵ твоими») — привязываем к следующему
    // слову неразрывным пробелом. Правило русской типографики. Граница — negative
    // lookbehind (не-буква или начало строки): если ПОТРЕБЛЯТЬ граничный символ,
    // в цепочке «и в городе» регулярка связывала бы только первый предлог,
    // а «в» оставался висеть (граничный пробел уже съеден предыдущим матчем).
    .replace(/(?<![\p{L}])([ВвСсКкОоУуЯяАаИи])(\s)/gu, '$1\u00A0');
}
function t(key, ...args) {
  const dict = STRINGS[state.lang] || STRINGS.ru;
  const val = dict[key] !== undefined ? dict[key] : STRINGS.ru[key];
  const out = typeof val === 'function' ? val(...args) : val;
  return typoDash(out);
}
/* Раньше setLang() сразу дёргал state.lang + renderApp()/renderOnboarding() —
   к моменту, когда CSS увидел бы transition на .lang-switch-thumb, старый
   переключатель уже был уничтожен полным innerHTML-рендером, а новый
   создавался сразу в финальном положении (двум РАЗНЫМ DOM-узлам transition
   играть не на чем). Поэтому анимация не проигрывалась вообще. Теперь:
   сперва проигрываем скольжение бегунка на уже существующем узле,
   и только после того, как анимация физически успела отыграть (300мс —
   тот же duration, что в .lang-switch-thumb transition в styles.css),
   переключаем язык и запускаем настоящий перерендер. */
function animateLangSwitches(lang) {
  document.querySelectorAll('.lang-switch').forEach(el => {
    el.classList.toggle('is-en', lang === 'en');
    el.querySelectorAll('.lang-btn').forEach(btn => {
      btn.classList.toggle('active', btn.textContent.trim().toLowerCase() === lang);
    });
  });
}
function setLang(lang) {
  if (lang === state.lang) return;
  // html lang должен соответствовать языку интерфейса: от него зависят
  // словарные переносы (hyphens: auto), a11y и проверка орфографии браузера.
  document.documentElement.lang = lang;
  animateLangSwitches(lang);
  setTimeout(() => {
    state.lang = lang;
    saveGuestSession();
    if (document.getElementById('mainapp') && !document.getElementById('mainapp').classList.contains('hidden')) renderApp();
    else renderOnboarding();
  }, 300);
}
function langSwitcher() {
  return `<div class="lang-switch ${state.lang === 'en' ? 'is-en' : ''}">
    <span class="lang-switch-thumb"></span>
    <button class="lang-btn ${state.lang === 'ru' ? 'active' : ''}" onclick="setLang('ru')">RU</button>
    <button class="lang-btn ${state.lang === 'en' ? 'active' : ''}" onclick="setLang('en')">EN</button>
  </div>`;
}

const CONTINENTS = {
  na: { name: "North America", color: '#8A7A4E' },
  sa: { name: "South America", color: '#4E6B5C' },
  eu: { name: "Europe", color: '#6E7F45' },
  af: { name: "Africa", color: '#9C6A42' },
  as: { name: "Asia", color: '#8C4F5C' },
  oc: { name: "Oceania", color: '#5B6E85' }
};

const CONTINENT_RU = { na: 'Северная Америка', sa: 'Южная Америка', eu: 'Европа', af: 'Африка', as: 'Азия', oc: 'Австралия' };

function contName(k) { return state.lang === 'ru' ? CONTINENT_RU[k] : CONTINENTS[k].name; }

// Фиксированные [lon, lat] для размещения подписи каждого континента на карте.
// Раньше подпись ставилась в геометрический центроид всей объединённой фигуры
// (path.centroid) — но для Европы в фигуру входит вся Россия до Тихого океана,
// и центроид (взвешенный по площади) уезжал далеко на восток, оказываясь поверх
// Азии. Точки ниже — заведомо внутри "ядра" каждого континента, независимо от
// того, как сильно фигура растянута смежными странами.
const CONTINENT_LABEL_ANCHORS = {
  na: [-98, 45],
  sa: [-58, -15],
  eu: [15, 49],   // Германия/Польша — подальше от границы с Азией
  af: [20, 3],
  as: [92, 32],   // Китай/Тибет — подальше от границы с Европой
  oc: [135, -25]
};

// Названия стран (world-atlas 110m, английские) по континентам — только для
// отрисовки настоящей карты в mountWorldMap(). Ключи (na/sa/eu/af/as/oc)
// совпадают с CONTINENTS/REAL_COUNTRIES_BY_CONTINENT выше и с profile.continents.
const MAP_COUNTRY_NAMES = {
  sa: ['Argentina', 'Chile', 'Brazil', 'Uruguay', 'Paraguay', 'Bolivia', 'Peru', 'Ecuador', 'Colombia', 'Venezuela', 'Guyana', 'Suriname', 'Falkland Is.'],
  na: ['Canada', 'United States of America', 'Mexico', 'Greenland', 'Haiti', 'Dominican Rep.', 'Bahamas', 'Puerto Rico', 'Jamaica', 'Cuba', 'Belize', 'Guatemala', 'Honduras', 'El Salvador', 'Nicaragua', 'Costa Rica', 'Panama', 'Trinidad and Tobago'],
  eu: ['Russia', 'Norway', 'Sweden', 'Finland', 'Iceland', 'United Kingdom', 'Ireland', 'France', 'Spain', 'Portugal', 'Germany', 'Poland', 'Austria', 'Switzerland', 'Italy', 'Belgium', 'Netherlands', 'Luxembourg', 'Denmark', 'Czechia', 'Slovakia', 'Hungary', 'Romania', 'Bulgaria', 'Greece', 'Albania', 'Croatia', 'Slovenia', 'Bosnia and Herz.', 'Serbia', 'Montenegro', 'Macedonia', 'Kosovo', 'Belarus', 'Ukraine', 'Moldova', 'Lithuania', 'Latvia', 'Estonia', 'N. Cyprus', 'Cyprus'],
  af: ['Tanzania', 'W. Sahara', 'Dem. Rep. Congo', 'Somalia', 'Kenya', 'Sudan', 'Chad', 'South Africa', 'Lesotho', 'Zimbabwe', 'Botswana', 'Namibia', 'Senegal', 'Mali', 'Mauritania', 'Benin', 'Niger', 'Nigeria', 'Cameroon', 'Togo', 'Ghana', "Côte d'Ivoire", 'Guinea', 'Guinea-Bissau', 'Liberia', 'Sierra Leone', 'Burkina Faso', 'Central African Rep.', 'Congo', 'Gabon', 'Eq. Guinea', 'Zambia', 'Malawi', 'Mozambique', 'eSwatini', 'Angola', 'Burundi', 'Madagascar', 'Tunisia', 'Algeria', 'Morocco', 'Libya', 'Egypt', 'Ethiopia', 'Djibouti', 'Somaliland', 'Uganda', 'Rwanda', 'Eritrea', 'S. Sudan', 'Gambia'],
  as: ['Kazakhstan', 'Uzbekistan', 'China', 'Mongolia', 'North Korea', 'South Korea', 'Japan', 'India', 'Pakistan', 'Afghanistan', 'Tajikistan', 'Kyrgyzstan', 'Turkmenistan', 'Iran', 'Iraq', 'Syria', 'Israel', 'Lebanon', 'Palestine', 'Jordan', 'Saudi Arabia', 'Yemen', 'Oman', 'United Arab Emirates', 'Qatar', 'Kuwait', 'Bangladesh', 'Bhutan', 'Nepal', 'Myanmar', 'Thailand', 'Laos', 'Vietnam', 'Cambodia', 'Malaysia', 'Brunei', 'Indonesia', 'Philippines', 'Taiwan', 'Sri Lanka', 'Armenia', 'Azerbaijan', 'Georgia', 'Turkey', 'Timor-Leste', 'Hong Kong', 'Singapore'],
  oc: ['Australia', 'New Zealand', 'Papua New Guinea', 'Fiji', 'Solomon Is.', 'Vanuatu', 'New Caledonia']
};

/* Каталог вузов (UNIVERSITIES, UNI_EXTRA, UNI_DESC_RU, UNI_FACTS, UNI_PHOTO_EXTRA, UNI_DATA),
   TOTAL_UNIVERSITIES_COUNT, REAL_CONTINENT_COUNTS и REAL_COUNTRIES_BY_CONTINENT
   живут в unidata.js (генерируется из data/universities.json). Подключается раньше app.js. */




/* ============================================================
   STATE
   ============================================================ */
const GUEST_KEY = 'unimatch_guest_v1';

function generateGuestId() {
  return 'guest_' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
}

/* ---------- Локальная сессия — теперь только "указатель" на пользователя на
   бэкенде (userId + guestId), а не полная копия профиля/свайпов. Источник
   истины — сервер (FastAPI); localStorage используется только чтобы не
   заставлять человека проходить онбординг заново при каждом визите. ---------- */
function loadGuestSession() {
  try {
    const raw = lsGet(GUEST_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; } // приватный режим браузера / localStorage недоступен — работаем без сохранения
}
function saveGuestSession() {
  try {
    lsSet(GUEST_KEY, JSON.stringify({
      userId: state.userId,
      guestId: state.guestId,
      lang: state.lang
    }));
  } catch (e) { /* тихо игнорируем — приватный режим браузера и т.п. */ }
}

/* ---------- Токен серверной сессии (Bearer). Выдаётся /auth/register и
   /auth/login, хранится отдельно от гостевой сессии. Персональные ручки
   (/users/{id}, swipes, matches, dna) для зарегистрированных пользователей
   бэкенд пускает только с ним — guestId и числовой id доступ больше не дают. */
const AUTH_KEY = 'unimatch_auth_v1';
let authToken = null;

function saveAuthSession(token) {
  authToken = token;
  try { lsSet(AUTH_KEY, token); } catch (e) { }
}
function loadAuthSession() {
  try { authToken = lsGet(AUTH_KEY) || null; } catch (e) { authToken = null; }
}
function clearAuthSession() {
  authToken = null;
  try { lsRemove(AUTH_KEY); } catch (e) { }
}

/* ============================================================
   API — все запросы к бэкенду (FastAPI). Бэкенд отдаёт camelCase
   один-в-один с полями profile/university на фронте, поэтому в
   большинстве мест ответ можно использовать напрямую.
   ============================================================ */
// Адрес API. Локально (localhost) можно переопределить: index.html?api=http://127.0.0.1:8000
const API_BASE = (() => {
  const prod = 'https://unimatch-lfy3.onrender.com';
  try {
    const local = ['localhost', '127.0.0.1'].includes(location.hostname);
    const q = new URLSearchParams(location.search).get('api');
    if (local && q && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(q)) return q;
  } catch (e) { /* без location (тесты) — боевой адрес */ }
  return prod;
})();

async function apiRequest(path, options = {}, { rawResponse, silent } = {}) {
  let res;
  // ТАЙМАУТ ЗАПРОСА (20 секунд). Без него «спящий» бэкенд на Render
  // (холодный старт 10-30 секунд) или оборвавшаяся сеть оставляли fetch
  // висеть НАВСЕГДА: fetch не резолвится и не падает, поэтому catch в
  // finishOnboarding никогда не срабатывал — приложение просто
  // «не открывалось» после финальной кнопки онбординга.
  // Отмена действует на ВЕСЬ запрос, включая чтение тела: если заголовки
  // пришли, а тело висит, res.json() точно так же отвергается по abort —
  // таймер снимается только после полного чтения ответа.
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20000);
  try {
    res = await fetch(API_BASE + path, {
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: 'Bearer ' + authToken } : {}),
        // Гостевые ручки закрыты «паролем» гостя (main.py: _require_access) —
        // шлём guestId в каждом запросе, пока нет Bearer-токена.
        ...((typeof state !== 'undefined' && state.guestId && !authToken) ? { 'X-Guest-Token': state.guestId } : {})
      },
      signal: ctrl.signal,
      ...options
    });
  } catch (e) {
    clearTimeout(timer);
    // Сервер недоступен физически (не запущен / сеть отвалилась) — не роняем приложение.
    toast(t('server_error'));
    throw e;
  }
  if (!res.ok) {
    clearTimeout(timer);
    // 402 — серверная проверка премиума (см. entitlements.py): не «ошибка сервера»,
    // а нормальный paywall — показываем модалку, а не пугающий toast.
    if (res.status === 402) {
      state.paywallOpen = true;
      try { renderApp(); } catch (e) { /* экран ещё не готов — модалка покажется при следующем рендере */ }
      throw Object.assign(new Error(`API ${path} -> 402`), { status: 402 });
    }
    if (!silent) toast(t('server_error'));
    throw Object.assign(new Error(`API ${path} -> ${res.status}`), { status: res.status });
  }
  // rawResponse: нужен вызывающему коду, которому важны не только тело, но и
  // заголовки ответа (см. buildDeck / X-Deck-Fallback) — .json() один раз
  // потребляет тело, поэтому оставляем это вызывающей стороне. Таймер здесь
  // сознательно НЕ снимаем: тело читает вызывающий код, и зависшее чтение
  // должно отменяться по таймауту так же, как и сами заголовки (abort()
  // уже завершённого fetch — безвредный no-op).
  if (rawResponse) return res;
  if (res.status === 204) { clearTimeout(timer); return null; }
  try {
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

function apiSaveProfile() {
  // Эквивалент POST /users — создаёт гостя (если guestId ещё нет) или обновляет
  // существующего. Возвращает {id, guestId, isRegistered, email, lang, profile}.
  // profile.majors (мульти-select) — только для фронта: бэкенд знает лишь про
  // одно поле major, поэтому не отправляем ему массив, которого он не ждёт.
  const { majors, ...profileForApi } = state.profile;
  return apiRequest('/users', {
    method: 'POST',
    body: JSON.stringify({ guestId: state.guestId, lang: state.lang, profile: profileForApi })
  });
}
function apiFetchUser(userId) {
  return apiRequest(`/users/${userId}`);
}
function apiRegisterEmail(userId, email) {
  return apiRequest(`/users/${userId}/register`, { method: 'POST', body: JSON.stringify({ email }) });
}
function apiFetchDeck(userId) {
  // rawResponse: buildDeck() читает и тело, и заголовок X-Deck-Fallback.
  return apiRequest(`/universities?user_id=${userId}`, {}, { rawResponse: true });
}
function apiFetchMatches(userId) {
  return apiRequest(`/users/${userId}/matches`);
}
function apiFetchUniversity(userId, uniId) {
  // "Аварийный" прямой запрос одного вуза — фолбэк findUni() для случая, когда
  // карточки нет ни в state.deck, ни в state.liked, ни в uniCache (см. viewUniversity).
  return apiRequest(`/universities/${uniId}?user_id=${userId}`);
}
// ---------------------------------------------------------------- monetization (MONETIZATION_SPEC.md)
function apiFetchPlacements(userId, slot, universityId) {
  const q = universityId ? `&university_id=${universityId}` : '';
  return apiRequest(`/placements/${slot}?user_id=${userId}${q}`);
}
function apiGrantEntitlement(userId, plan) {
  // ДЕМО-ONLY (см. main.py): без реального биллинга это единственный способ
  // переключить премиум для тестирования. В проде эта ручка не публична.
  // silent: чтобы 403 «демо отключён» не маскировался под «сервер недоступен».
  return apiRequest(`/users/${userId}/entitlement`, {
    method: 'POST',
    body: JSON.stringify({ plan })
  }, { silent: true });
}
function apiPostSwipe(userId, universityId, liked) {
  return apiRequest(`/users/${userId}/swipes`, {
    method: 'POST',
    body: JSON.stringify({ universityId, liked })
  });
}
function apiDeleteSwipe(userId, universityId) {
  return apiRequest(`/users/${userId}/swipes/${universityId}`, { method: 'DELETE' });
}

/* ---------- Auth (email + password) ----------
   Отдельная от apiRequest() обёртка: экран логина показывает ошибку
   ПРЯМО в форме (см. renderLoginScreen), а не общим toast'ом — поэтому
   здесь не глушим и не тостим ошибку, а пробрасываем её с текстом из
   тела ответа бэкенда (FastAPI обычно отдаёт {detail: "..."} на 4xx).
   ВАЖНО: судя по текущей интеграции (README/apiRegisterEmail — "мягкая"
   регистрация по email без пароля), выделенных ручек /auth/login и
   /auth/register с паролем на бэке ещё может не быть. Формат запроса/
   ответа ниже — разумное предположение (email+password → {id, ...}, тот
   же контракт, что и объект user из /users); если бэк отдаёт другую
   форму ответа или другой путь — поправить только эти два хелпера. */
async function authRequest(path, body) {
  let res;
  try {
    res = await fetch(API_BASE + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
  } catch (e) {
    const err = new Error(t('auth_error_network'));
    err.isNetwork = true;
    throw err;
  }
  let data = null;
  try { data = await res.json(); } catch (e) { /* пустое тело — ок для некоторых ошибок */ }
  if (!res.ok) {
    const msg = (data && (data.detail || data.message || data.error)) || t('auth_error_generic');
    throw new Error(typeof msg === 'string' ? msg : t('auth_error_generic'));
  }
  return data;
}
function apiAuthLogin(email, password) {
  return authRequest('/auth/login', { email, password });
}
async function logoutUser() {
  try { await apiAuthLogout(); } catch (e) { /* сервер мог уснуть — локальную сессию всё равно чистим */ }
  clearAuthSession();
  try { lsRemove(GUEST_KEY); } catch (e) { }
  location.reload(); // чистый перезапуск: лендинг -> онбординг/вход
}
function apiAuthLogout() {
  // Сервер удаляет сессию; локально токен и гостевую сессию чистим в logoutUser().
  return apiRequest('/auth/logout', { method: 'POST' });
}
function apiAuthRegister(email, password) {
  // guestId опционален на бэке, но если передать текущую гостевую сессию,
  // сервер "усыновит" уже сделанный профиль/свайпы вместо пустого нового
  // аккаунта (см. auth_register в main.py). Раньше guestId/lang вообще не
  // отправлялись — регистрация технически проходила, но терялся весь
  // прогресс, сделанный до регистрации, и язык всегда падал на дефолтный "ru".
  return authRequest('/auth/register', { email, password, lang: state.lang, guestId: state.guestId });
}


/* Сайты и описания (EN/RU) для вузов 51–200, которые приходят только с бэкенда,
   плюс русские описания для первых 50. Подмешиваются в fromApiUni(). */


/* Фото кампусов для 51–200 (Wikimedia Commons). */
/* Факты о вузах из Wikidata: год основания, число студентов, тип, ссылки на Википедию. */



/* Ответ бэкенда по вузу использует matchScore/admissionReality — приводим
   к тем же _match/_reality, которыми уже пользуется весь рендеринг ниже,
   чтобы не переписывать buildWhyReasons/renderDiscover/renderMatches и т.д. */
/* ============================================================
   ДАННЫЕ О ВУЗАХ ДЛЯ ПОДБОРА (все 200)
   [обучение для иностранцев $/год, проживание+питание $/год,
    тип помощи, сила направлений "cs,eng,math,biz,social,health,humanities,law",
    коротко RU, коротко EN, плюсы RU[3], плюсы EN[3], минус RU, минус EN,
    помощь RU, помощь EN]
   Суммы — ориентировочные для бакалавриата иностранцев на 2025–26 год,
   округлены и переведены в доллары. Тип помощи:
   full — покрывает подтверждённую нужду; need — частичная помощь по нужде;
   merit — стипендии за успехи; gov — государственные стипендии (MEXT, CSC, GKS…);
   low — помощи почти нет, но обучение и так дешёвое.
   ============================================================ */

const DIRS = ['cs', 'eng', 'math', 'biz', 'social', 'health', 'humanities', 'law'];
const DIR_LABEL = {
  cs: ['Компьютерные науки', 'Computer science'], eng: ['Инженерия', 'Engineering'],
  math: ['Математика и науки', 'Math & sciences'], biz: ['Бизнес и экономика', 'Business & economics'],
  social: ['Социальные науки', 'Social sciences'], health: ['Медицина и науки о жизни', 'Health & life sciences'],
  humanities: ['Гуманитарные науки и искусство', 'Humanities & arts'], law: ['Право и госуправление', 'Law & government']
};
function isRu() { return state.lang === 'ru'; }
function L2(pair) { return Array.isArray(pair) ? (isRu() ? pair[0] : pair[1]) : pair; }
function dirLabel(k) { return L2(DIR_LABEL[k] || [k, k]); }
function uniData(u) {
  const d = u && UNI_DATA[u.id];
  if (!d) return null;
  const s = d[3].split(',').map(Number);
  const strengths = {}; DIRS.forEach((k, i) => { strengths[k] = s[i]; });
  return { tuition: d[0], living: d[1], aid: d[2], strengths, tag: [d[4], d[5]], pros: [d[6], d[7]], con: [d[8], d[9]], aidNote: [d[10], d[11]] };
}
/* Направления, которые выбрал пользователь (по выбранным специальностям). */
function userDirs(p) {
  const majors = (p.majors && p.majors.length ? p.majors : [p.major]).filter(Boolean);
  const dirs = [...new Set(majors.map(findMajorCategory))];
  return dirs.length ? dirs : ['cs'];
}
/* Сила вуза именно по направлению пользователя: берём лучшее из выбранных. */
function programStrength(u, p) {
  const d = uniData(u);
  if (!d) return u.cs || 60;
  return Math.max(...userDirs(p).map(k => d.strengths[k] ?? 50));
}
function mainDir(u, p) {
  const d = uniData(u); const dirs = userDirs(p);
  if (!d) return dirs[0];
  return dirs.slice().sort((a, b) => (d.strengths[b] ?? 0) - (d.strengths[a] ?? 0))[0];
}
/* Реальная стоимость в год и честная оценка помощи. */
/* Стоимость с учётом РЕАЛЬНОЙ помощи. Раньше любой вуз со стипендиями считался
   «укладывается с помощью», даже если стипендии там маленькие и редкие, — поэтому при
   маленьком бюджете в подборку попадали вузы, которые человек не потянет.
   Теперь у каждого типа помощи есть реалистичный размер и надёжность (насколько
   вероятно её получить):
   full  — покрывает всю подтверждённую нужду (MIT, Princeton…): надёжно, но только при поступлении;
   gov   — государственные гранты/бюджет: надёжно;
   need  — частичная помощь по доходу семьи: средне;
   merit — стипендии за успехи: небольшие, дают немногим, зависят от силы профиля;
   low   — помощи почти нет. */
const AID_RELIABILITY = { full: 0.8, gov: 0.7, need: 0.45, merit: 0.3, low: 0 };
function costInfo(u, p) {
  const d = uniData(u);
  const tuition = d ? d.tuition : u.cost;
  const living = d ? d.living : 15000;
  const total = tuition + living;
  const aid = d ? d.aid : 'merit';
  const strength = academicStrength(p);
  const budget = p.budget || 0;
  let aidMax = 0;
  if (aid === 'full') aidMax = Math.max(0, total - budget);
  else if (aid === 'gov') aidMax = Math.round(tuition + living * 0.6);
  else if (aid === 'need') aidMax = Math.round(tuition * (p.needsAid === true ? 0.5 : 0.15));
  else if (aid === 'merit') aidMax = Math.round(tuition * (strength >= 85 ? 0.4 : strength >= 70 ? 0.22 : 0.08));
  let reliability = AID_RELIABILITY[aid] || 0;
  const domestic = !!p.homeCountry && p.homeCountry === u.country;
  if (domestic && u.country === 'Russia') { aidMax = Math.max(aidMax, tuition); reliability = Math.max(reliability, 0.6); } // бюджетное место по ЕГЭ

  /* КРИТИЧНО — ПРОИСХОЖДЕНИЕ СТУДЕНТА: «полное покрытие нужды» (aid='full',
     надёжность 0.8) в реальности доступно ПОЧТИ ИСКЛЮЧИТЕЛЬНО domestic
     студентам (в США — только US citizens/permanent residents: Pell Grant,
     federal student loans, FAFSA-only). Для international students даже у
     Harvard/MIT это ОДИН общий конкурсный пул на ~5-10 мест в год.
     Поэтому если студент international (homeCountry ≠ u.country, или
     homeCountry пуст — считаем international по умолчанию, чтобы не
     обманывать пользователя завышенной доступностью aid) — reliability
     для 'full' типа урезаем с 0.8 до 0.12 (примерно соответствует 1/8
     фактической вероятности попадания в тот один пул).
     Это гарантирует, что international студент с «нужна фин.помощь» не
     увидит MIT как «95% Match + aid покроет всё» — реальность:
     только top-1% профилю это возможно. */
  const isInternationalStudent = !domestic;
  // Для international студента: если aid-тип 'full' и note вуза явно
  // говорит про international → урезаем reliability до 0.05-0.15 (честнее).
  // Консистентно с matchScore() выше.
  let intlLimited = false;
  const aidNote = (u.aid && u.aid.note || '').toLowerCase();
  const noteHasIntlMention = /иностранц|international/.test(aidNote);
  const noteSaysLimitedIntl = noteHasIntlMention && /limited|almost no|not available|no aid|only rare|нет|не да|не доступ|огранич/.test(aidNote);
  // Любой тип помощи: если note явно говорит «limited for internationals» и
  // студент из другой страны — помощь считается урезанной: считаем только
  // остаток пула (~30% типичной помощи) с низкой надёжностью. Это честно
  // отражается и во вкладке стоимости, и в подборке (через cost-компонент
  // computeMatch): вуз не получает баллов за недоступную студенту помощь.
  if (isInternationalStudent && noteSaysLimitedIntl) {
    intlLimited = true;
    aidMax = Math.round(aidMax * 0.3);
    reliability = Math.min(reliability, 0.15);
  }
  if (isInternationalStudent && aid === 'full' && noteHasIntlMention) {
    if (noteSaysLimitedIntl) {
      reliability = 0.05;
    }
  }
  if (isInternationalStudent && aid === 'full' && !noteHasIntlMention) {
    // «Full need met» без упоминания international → считаем только merit-pool
    // (не government) — урезаем с 0.8 до 0.15. Это консервативнее, но честнее
    // для international студентов, которым gov-гранты США/UK недоступны.
    reliability = Math.min(reliability, 0.15);
  }

  const netBest = Math.max(0, total - aidMax);
  const netExpected = Math.max(0, Math.round(total - aidMax * reliability));
  let verdict;
  if (total <= budget) verdict = 'yes';
  else if (netBest <= budget && reliability >= 0.3) verdict = 'aid';
  else verdict = 'no';
  return { domestic, tuition, living, total, aid, aidMax, reliability, netBest, netExpected, budget, verdict, gap: Math.max(0, netBest - budget), over: Math.max(0, total - budget), intlLimited };
}
/* Шанс поступления словами (вместо Reach/Target/Likely без пояснений). */
function chanceLabel(r) {
  return isRu() ? ({ Reach: 'Сложно', Target: 'Реально', Likely: 'Высокий' })[r] || '—' : ({ Reach: 'Reach', Target: 'Target', Likely: 'Likely' })[r] || r;
}
/* Свежесть каталога: дата последнего изменения данных (mtime
   backend/data/universities.json) пробрасывается генератором unidata.js
   константой CATALOG_UPDATED. Честный бейдж «Цены проверены: …». */
function catalogUpdatedLabel() {
  if (typeof CATALOG_UPDATED === 'undefined' || !CATALOG_UPDATED) return '';
  const d = new Date(CATALOG_UPDATED + 'T12:00:00');
  if (isNaN(d)) return '';
  return isRu()
    ? 'Цены проверены: ' + d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'Prices checked: ' + d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
/* ---- Новый Match Score ----
   Направление 35 · стоимость 25 · шансы 15 · исследования 10 · город/климат/размер 15.
   Если предпочтения по городу/размеру не заданы, их вес делится между направлением и стоимостью. */
function matchParts(u, p) {
  const s = programStrength(u, p);
  const program = Math.max(0, Math.min(1, (s - 45) / 50));
  const c = costInfo(u, p);
  let cost;
  if (c.verdict === 'yes') cost = 1;
  else if (c.verdict === 'aid') cost = 0.35 + 0.55 * c.reliability * Math.min(1, c.budget / Math.max(c.netExpected, 1));
  else cost = Math.max(0, 0.3 * Math.min(1, c.budget / Math.max(c.netBest, 1)));
  const r = u._reality || admissionReality(u, p);
  const chance = r === 'Likely' ? 1 : (r === 'Target' ? 0.85 : (u.acceptance < 0.1 ? 0.3 : 0.5));
  const research = Math.max(0, 1 - Math.abs((u.research || 3) - p.research) / 4);
  let prefs = null; const pp = [];
  if (p.setting.length) pp.push(p.setting.includes(u.setting) ? 1 : 0.2);
  if (p.climate.length) pp.push(p.climate.includes(u.climate) ? 1 : 0.2);
  if (p.size.length) pp.push(p.size.includes(u.size) ? 1 : 0.3);
  if (pp.length) prefs = pp.reduce((a, b) => a + b, 0) / pp.length;
  /* ЯЗЫК ОБУЧЕНИЯ — реальный критерий выбора вуза, а не только текст
     в карточке. Английский: родной или сданный тест с уверенным баллом
     (IELTS 6.5+ / TOEFL 90+ / DET 110+ — уровень, на котором учёба идёт
     комфортно). Учёба на родном языке — 1. Другой язык без подготовки —
     0.3 (барьер: год подтяжки языка или программа-исключение). Если
     пользователь не указал родной язык — нейтрально. */
  const teachLang = COUNTRY_TEACH_LANG[u.country] || 'en';
  let lang = 0.5;
  if (teachLang === 'en') {
    if (p.nativeLang === 'en') lang = 1;
    else {
      const goodEng = { IELTS: 6.5, TOEFL: 90, DET: 110 };
      const eng = ['IELTS', 'TOEFL', 'DET'].filter(k => p.tests[k] && p.tests[k].taken);
      lang = eng.some(k => p.tests[k].score >= goodEng[k]) ? 1 : (eng.length ? 0.65 : 0.5);
    }
  } else if (teachLang === (p.nativeLang || null)) {
    lang = 1;
  } else if (p.nativeLang) {
    lang = 0.3;
  } else {
    lang = 0.55; // родной язык не указан — нейтрально
  }
  return { program, cost, chance, research, prefs, lang, strength: s, costInfo: c, reality: r };
}
function matchWeightsFor(m) {
  const c = m.costInfo;
  // Чем меньше бюджет, тем важнее деньги: при бюджете до $15k стоимость весит 40 из 100.
  const costW = c.budget && c.budget < 15000 ? 40 : (c.budget && c.budget < 30000 ? 32 : 25);
  const w = { program: 31, cost: costW, chance: 13, research: 9, prefs: 13, lang: 9 };
  const extra = costW - 25; w.program -= Math.round(extra * 0.6); w.research -= Math.round(extra * 0.4);
  if (m.prefs === null) { w.program += 7; w.cost += 6; w.prefs = 0; }
  return w;
}
function computeMatch(u, p) {
  const m = matchParts(u, p);
  const c = m.costInfo;
  const w = matchWeightsFor(m);
  let score = m.program * w.program + m.cost * w.cost + m.chance * w.chance + m.research * w.research + (m.prefs || 0) * w.prefs + m.lang * w.lang;
  // Не по карману даже с реальной помощью — вуз уходит вниз подборки, какой бы сильной ни была программа.
  if (c.verdict === 'no') score *= 0.5 + 0.3 * Math.min(1, c.budget / Math.max(c.netBest, 1));
  else if (c.verdict === 'aid' && c.reliability < 0.5) score *= 0.88;
  if (u.id === 193 && p.degreeLevel === 'bachelor') score = Math.min(score, 25); // KAUST — только магистратура/PhD
  return Math.max(15, Math.min(99, Math.round(score)));
}
function rescoreAll() {
  const p = state.profile;
  const seen = new Set();
  [...state.deck, ...state.liked, ...Object.values(state.uniCache)].forEach(u => {
    if (!u || seen.has(u)) return; seen.add(u);
    u._reality = realityFor(u, p);
    u._match = computeMatch(u, p);
  });
  state.deck.sort((a, b) => b._match - a._match);
}

function uniDesc(u) {
  if (!u) return '';
  const ru = u.desc_ru || UNI_DESC_RU[u.id] || (UNI_EXTRA[u.id] || {}).desc_ru;
  const en = u.desc || (UNI_EXTRA[u.id] || {}).desc;
  return typoDash((state.lang === 'ru' ? (ru || en) : (en || ru)) || '');
}
function uniFacts(u) { return (u && UNI_FACTS[u.id]) || {}; }
function fmtInt(n) { return Number(n).toLocaleString(state.lang === 'ru' ? 'ru-RU' : 'en-US'); }
function uniFactsLine(u) {
  const f = uniFacts(u), ru = state.lang === 'ru', parts = [];
  if (f.founded) parts.push((ru ? 'основан в ' : 'founded ') + f.founded);
  if (f.students) parts.push(fmtInt(f.students) + (ru ? ' ' + ruPlural(f.students, 'студент', 'студента', 'студентов') : ' students'));
  return parts.join(' · ');
}
function uniFactsBlock(u) {
  const f = uniFacts(u), ru = state.lang === 'ru', site = uniSite(u);
  const ftype = f.type || ((u.tags || []).includes('Public') ? 'public' : ((u.tags || []).includes('Private') ? 'private' : ''));
  const typeLabel = ftype ? (ru ? { public: 'Государственный', private: 'Частный' }[ftype] : { public: 'Public', private: 'Private' }[ftype]) : '';
  const items = [
    f.founded ? [ru ? 'Основан' : 'Founded', f.founded] : null,
    f.students ? [ru ? 'Студентов' : 'Students', fmtInt(f.students)] : null,
    typeLabel ? [ru ? 'Тип' : 'Type', typeLabel] : null,
    site ? [ru ? 'Официальный сайт' : 'Official website', `<a href="${site}" target="_blank" rel="noopener noreferrer" class="facts-link">${site.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}</a>`] : null,
    f.wiki ? [ru ? 'Подробнее' : 'More', `<a href="${ru && f.wiki_ru ? f.wiki_ru : f.wiki}" target="_blank" rel="noopener noreferrer" class="facts-link">${ru ? 'Википедия' : 'Wikipedia'}</a>`] : null
  ].filter(Boolean);
  if (!items.length) return '';
  return `<div class="info-block reveal"><h4>${ru ? 'Факты' : 'Key facts'}</h4><div class="kv-grid">${items.map(([k, v]) => `<div class="kv"><div class="k">${k}</div><div class="v">${v}</div></div>`).join('')}</div></div>`;
}
function uniSite(u) {
  return u && (u.website || (UNI_EXTRA[u.id] || {}).website || (UNIVERSITIES.find(x => x.id === u.id) || {}).website) || '';
}

// До-заливка фото для вузов, у которых в сгенерированном каталоге нет картинки.
// NYU Abu Dhabi — фото кампуса с Wikimedia Commons. Universidad de San Andrés —
// на Commons есть только логотип, поэтому взято официальное фото кампуса Victoria
// с CDN самого вуза (og:image с images.udesa.edu.ar).
UNI_PHOTO_EXTRA[312] = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/1a/NYUAbuDhabiSaadiyat.jpg/1280px-NYUAbuDhabiSaadiyat.jpg';
UNI_PHOTO_EXTRA[325] = 'https://images.udesa.edu.ar/sites/default/files/2025-10/udesa-campus-victoria.jpg';

// Редакторские правки нескольких русских описаний из сгенерированного каталога
// (файл unidata.js руками не правим — правим точечно здесь, по id вуза).
// Университеты несут собственное поле desc_ru, поэтому правим и его, и справочник.
const UNI_DESC_RU_FIXES = {
  45: 'Национальный университет в Сеуле, основан в 1946 году. Вместе с университетами Ёнсе и Корё входит в SKY — тройку самых престижных вузов Кореи. Главный кампус Кванак расположен у подножия горы Кванаксан.',
  78: 'Государственный land-grant университет в Колледж-Стейшн (Техас), основан в 1876 году. Сильный инженерный колледж и Корпус кадетов — крупнейший в США студенческий корпус в форме после военных академий.',
  97: 'Главный государственный университет штата Орегон в Юджине, основан в 1876 году. Здесь появилась Nike: тренер по лёгкой атлетике Билл Бауэрман и выпускник Фил Найт основали компанию, а стадион Hayward Field — одна из главных арен мировой лёгкой атлетики.',
  237: 'Государственный исследовательский университет в Лондоне, основан в 1895 году. Специализируется на социальных науках: сильные факультеты экономики, политологии, права и международных отношений, кампус рядом с Ковент-Гарденом.',
  293: 'Частный исследовательский университет в Сеуле, основан в 1905 году как Bosung College. Входит в группу SKY. На кампусе Анам-дон работают известные юридическая и бизнес-школы.'
};
Object.entries(UNI_DESC_RU_FIXES).forEach(([id, text]) => {
  UNI_DESC_RU[id] = text;
  const local = UNIVERSITIES.find(u => u.id === +id);
  if (local) local.desc_ru = text;
});

function fromApiUni(u) {
  // Бэкенд сознательно не хранит и не отдаёт photo (см. README бэкенда) — это
  // забота фронта. Подмешиваем его из локального справочника UNIVERSITIES по id.
  // Фото кампусов загружены с Wikimedia Commons для всех 50 вузов.
  const local = UNIVERSITIES.find(x => x.id === u.id) || {};
  const extra = UNI_EXTRA[u.id] || {};
  return {
    ...u,
    photo: u.photo || local.photo || UNI_PHOTO_EXTRA[u.id],
    website: u.website || local.website || extra.website,
    desc: u.desc || local.desc || extra.desc,
    desc_ru: u.desc_ru || UNI_DESC_RU[u.id] || extra.desc_ru,
    _match: u.matchScore, _reality: u.admissionReality
  };
}
function egeReality(u, p) {
  // Российские вузы поступают по ЕГЭ, а не по SAT/GPA. Пороги — ориентир по бюджетным
  // местам сильных программ (внутренний ориентир, пользователю цифры не показываем — проходной зависит от специальности).
  if (u.country !== 'Russia' || !p.tests.EGE || !p.tests.EGE.taken) return null;
  const need = u.acceptance < 0.2 ? 290 : 260, v = p.tests.EGE.score;
  return v >= need + 8 ? 'Likely' : (v >= need - 12 ? 'Target' : 'Reach');
}
/* Шанс считаем на фронтенде: здесь известны специальность и все тесты пользователя,
   а ответ бэкенда остаётся запасным значением и не устаревает после правки профиля. */
function realityFor(u, p) {
  return egeReality(u, p) || admissionReality(u, p) || u.admissionReality;
}
function fromApiUniScored(u) {
  const x = fromApiUni(u);
  x._reality = realityFor(x, state.profile);
  x._match = computeMatch(x, state.profile);
  return x;
}

let state = {
  screen: 'discover',
  deckLoading: false, // true пока идёт GET /universities — Discover рисует skeleton-карточки вместо пустоты
  discoverPanelOpen: false, // true = открыта выезжающая панель (фильтры/профиль/matches/DNA) поверх hero-карточки
  obStep: 0,
  obMajorCategory: 'cs',
  lang: 'ru',
  guestId: null,
  userId: null,
  isRegistered: false,
  email: null,
  profile: {
    gpa: 3.6,
    tests: {
      SAT: { taken: true, score: 1350 },
      ACT: { taken: false, score: 30 },
      IELTS: { taken: false, score: 7 },
      TOEFL: { taken: false, score: 95 }, DET: { taken: false, score: 120 }, IB: { taken: false, score: 36 }, EGE: { taken: false, score: 250 }
    },
    major: 'Computer Science',
    majors: ['Computer Science'],
    degreeLevel: 'bachelor',
    size: [], setting: [], climate: [], research: 3, budget: 40000, needsAid: null,
    continents: [], countries: [],
    homeCountry: '', nativeLang: ''
  },
  deck: [],
  liked: [],
  disliked: [],
  // Кэш "любой университет, который мы когда-либо видели с сервера в этой
  // сессии" (id -> university с _match/_reality), ключ — findUni() ниже.
  // Раньше findUni() смотрел только в state.deck/state.liked и, если там не
  // находилось, откатывался на локальный справочник UNIVERSITIES (всего 50
  // штук, тогда как на бэкенде их 200) — открыть карточку любого вуза за
  // пределами этих 50 и вне текущей подборки/лайков было невозможно, экран
  // просто молча возвращал на Discover. uniCache плюс прямой GET
  // /universities/{id} (см. viewUniversity) закрывают этот разрыв.
  uniCache: {},
  currentUniId: null,
  activeTab: 'overview',
  matchFilter: 'all',
  recentPasses: [],
  trackerView: 'tracker', // 'tracker' | 'roadmap' — какой вид открыт на экране Application Tracker
  trackerExpanded: new Set(), // id вузов с развёрнутой карточкой в Tracker (см. renderTrackerList)
  uniLookupPending: false, // true пока идёт "аварийный" GET /universities/{id} для карточки, которой ещё нет в кэше
  isPremium: false, // см. entitlements.py на бэке; обновляется в loadSessionForUser()
  paywallOpen: false,
  payments: null // конфиг оплаты с бэкенда {stripe, demo} — см. loadPaymentsConfig()
};

function uniColor(id) { return GRADIENTS[id % GRADIENTS.length]; }

/* ---------- Profile completeness checklist (left sidebar) ----------
   Только поля, которые реально участвуют в matchScore() (см. scoring.py /
   matchScore выше) — не включаем сюда IELTS, он сознательно не влияет ни на
   Match Score, ни на Admission Reality (см. english_proficiency_level). */
function profileCompleteness() {
  const p = state.profile;
  const items = [
    { done: p.setting.length > 0, key: 'checklist_setting' },
    { done: p.climate.length > 0, key: 'checklist_climate' },
    { done: p.size.length > 0, key: 'checklist_size' },
    { done: p.needsAid !== null, key: 'checklist_aid' },
    { done: (p.continents.length > 0 || p.countries.length > 0), key: 'checklist_region' },
  ];
  const doneCount = items.filter(i => i.done).length;
  const percent = Math.round(100 * doneCount / items.length);
  const next = items.find(i => !i.done);
  return { percent, next };
}

/* ---------- Daily activity counter (left sidebar) ----------
   "Сегодня" — единственная честная формулировка: liked переживает перезагрузку
   (приходит с бэкенда), а disliked — нет (см. README фронтенда), поэтому
   "всего" мы не смешиваем эти два числа в одно, а показываем оба отдельно. */
const ACTIVITY_KEY = 'unimatch_activity_v1';
function bumpDailyActivity() {
  const today = new Date().toISOString().slice(0, 10);
  let data = { date: today, count: 0 };
  try {
    const raw = lsGet(ACTIVITY_KEY);
    if (raw) data = JSON.parse(raw);
  } catch (e) { /* localStorage недоступен — просто не считаем */ }
  if (data.date !== today) data = { date: today, count: 0 };
  data.count += 1;
  try { lsSet(ACTIVITY_KEY, JSON.stringify(data)); } catch (e) { }
  return data.count;
}
function getDailyActivity() {
  const today = new Date().toISOString().slice(0, 10);
  try {
    const raw = lsGet(ACTIVITY_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (data.date === today) return data.count;
    }
  } catch (e) { }
  return 0;
}

/* ---------- Application Tracker + Roadmap ----------
   Полностью локальная фича, по аналогии со счётчиком "passed" на экране DNA
   (см. README, раздел "Что осталось локальным"): ни бэкенд, ни state.liked
   не хранят статус заявки/чек-лист документов — всё живёт в localStorage на
   этом устройстве, ключ по id университета. Данные читаются заново на
   каждый вызов (как getDailyActivity() выше), а не кэшируются в state, чтобы
   не городить отдельную синхронизацию state<->localStorage.
   Двусторонняя синхронизация со свайпами — через toggleLike() ниже: лайкнул
   вуз → появилась запись трекера, убрал лайк → запись удаляется. ---------- */
const TRACKER_KEY = 'unimatch_tracker_v1';
function loadTrackerData() {
  try {
    const raw = lsGet(TRACKER_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) { return {}; } // приватный режим браузера / localStorage недоступен
}
function saveTrackerData(data) {
  try { lsSet(TRACKER_KEY, JSON.stringify(data)); } catch (e) { }
}
function trackerDefaultEntry() {
  return { status: 'not_started', checklist: { essay: false, recs: false, transcript: false, tests: false } };
}
function ensureTrackerEntry(id) {
  const data = loadTrackerData();
  if (!data[id]) { data[id] = trackerDefaultEntry(); saveTrackerData(data); }
}
function removeTrackerEntry(id) {
  const data = loadTrackerData();
  if (data[id]) { delete data[id]; saveTrackerData(data); }
}
/* На случай лайков, сделанных до появления этой фичи (или с другого устройства) —
   догоняем недостающие записи и подчищаем те, для которых лайк уже снят. Вызывается
   один раз после загрузки state.liked с бэкенда (см. init() ниже). */
function syncTrackerWithLiked() {
  const data = loadTrackerData();
  const likedIds = new Set(state.liked.map(u => String(u.id)));
  let changed = false;
  likedIds.forEach(id => { if (!data[id]) { data[id] = trackerDefaultEntry(); changed = true; } });
  Object.keys(data).forEach(id => { if (!likedIds.has(id)) { delete data[id]; changed = true; } });
  if (changed) saveTrackerData(data);
}
function setTrackerStatus(id, status) {
  const data = loadTrackerData();
  data[id] = data[id] || trackerDefaultEntry();
  data[id].status = status;
  saveTrackerData(data);
  restoreScrollAround(renderApp);
}
function toggleTrackerChecklistItem(id, key) {
  const data = loadTrackerData();
  data[id] = data[id] || trackerDefaultEntry();
  data[id].checklist[key] = !data[id].checklist[key];
  saveTrackerData(data);
  restoreScrollAround(renderApp);
}
// Карточки Tracker свёрнуты по умолчанию (см. renderTrackerList) — открыт
// список видно с одного взгляда на телефоне, а не как раньше, когда каждая
// карточка сразу показывала степпер на 4 подписи и чек-лист, из-за чего
// список из нескольких вузов почти не помещался на экран без скролла.
function toggleTrackerExpanded(id) {
  if (state.trackerExpanded.has(id)) state.trackerExpanded.delete(id);
  else state.trackerExpanded.add(id);
  restoreScrollAround(renderApp);
}
/* Сохраняет window.scrollY, выполняет rerenderFn (синхронно переписывает
   innerHTML), затем восстанавливает позицию. Раньше scrollTo вызывался
   сразу после renderApp() — но когда клик разрушает сфокусированную
   кнопку, браузер иногда сам подскраливает страницу уже ПОСЛЕ нашего
   restore (при возврате фокуса на body/следующий элемент), и наш фикс
   "перебивался". Двойной requestAnimationFrame откладывает restore до
   следующего кадра ПОСЛЕ layout/paint — то есть после любых браузерных
   авто-скроллов, так что наш вызов выполняется последним и побеждает.
   behavior:'instant' — чтобы не ловить наложение с smooth-анимацией. */
function restoreScrollAround(rerenderFn) {
  const prevScroll = window.scrollY;
  rerenderFn();
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      window.scrollTo({ top: prevScroll, left: 0, behavior: 'instant' });
    });
  });
}

/* ---------- Application deadline estimate (Tracker / Roadmap) ----------
   ПЛЕЙСХОЛДЕР, как и gpa25/gpa75/sat25/sat75 в admissionReality() ниже: ни
   бэкенд, ни UNIVERSITIES не хранят реальные даты приёмных дедлайнов — тип
   (ED/EA/RD) и число выводятся эвристически из acceptance (селективность) и
   continent. Правдоподобно для демо, но НЕ факт: в проде даты по каждому
   вузу должны приходить с сайта его приёмной комиссии. ---------- */
function startOfToday() { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }
function nextOccurrence(month, day) {
  const today = startOfToday();
  let candidate = new Date(today.getFullYear(), month, day);
  if (candidate < today) candidate = new Date(today.getFullYear() + 1, month, day);
  return candidate;
}
function estimateDeadline(u) {
  const selective = u.acceptance < 0.2;
  let type, month, day;
  if (u.continent === 'na') {
    if (selective) { type = 'ED'; month = 10; day = 1; } // 1 ноября
    else { type = 'RD'; month = 0; day = 1; } // 1 января
  } else if (u.continent === 'eu') {
    if (selective) { type = 'EA'; month = 9; day = 15; } // 15 октября (Oxbridge-style)
    else { type = 'RD'; month = 0; day = 15; } // 15 января
  } else {
    type = 'RD'; month = 1; day = 1; // 1 февраля — Азия/Океания/Ю.Америка/Африка
  }
  const date = nextOccurrence(month, day);
  const daysLeft = Math.round((date - startOfToday()) / 86400000);
  return { type, date, daysLeft };
}
function urgencyClass(daysLeft) {
  if (daysLeft < 0) return 'overdue';
  if (daysLeft <= 14) return 'urgent';
  if (daysLeft <= 45) return 'soon';
  return 'ok';
}
function fmtDeadlineDate(d) {
  return d.toLocaleDateString(state.lang === 'ru' ? 'ru-RU' : 'en-US', { day: 'numeric', month: 'long' });
}
/* Вехи Roadmap считаются НАЗАД от дедлайна: тесты → рекомендации → эссе → подача.
   Первые три — те же булевы поля чек-листа из Tracker (essay/recs/tests), single
   source of truth; "подача" — не чекбокс из чек-листа, а сам статус заявки. */
function roadmapMilestones(meta) {
  const offsets = [
    { key: 'tests', offset: -70, labelKey: 'roadmap_tests' },
    { key: 'transcript', offset: -56, labelKey: 'roadmap_transcript' },
    { key: 'recs', offset: -42, labelKey: 'roadmap_recs' },
    { key: 'essay', offset: -21, labelKey: 'roadmap_essay' },
    { key: 'submit', offset: 0, labelKey: 'roadmap_submit' }
  ];
  // Идеальный график — за 10 недель до дедлайна. Если человек пришёл позже, вехи не должны
  // сразу гореть «просрочено»: сжимаем те же 4 этапа в оставшееся время (тесты — сегодня,
  // дальше пропорционально), и только реально пропущенные даты остаются красными.
  const day = 86400000;
  const left = meta.daysLeft;
  return offsets.map(m => {
    const days = left >= 70 ? left + m.offset : Math.round(left * (1 + m.offset / 70));
    return { ...m, date: new Date(startOfToday().getTime() + Math.max(days, 0) * day) };
  });
}

/* ---------- "Только что пропустил" + restore (под кнопками свайпа) ---------- */
async function restorePassed(id) {
  const idx = state.recentPasses.findIndex(u => u.id === id);
  if (idx === -1) return;
  const u = state.recentPasses[idx];
  try {
    await apiDeleteSwipe(state.userId, id); // убирает dislike-запись на бэке — вуз снова доступен в /universities
  } catch (e) { return; } // ошибка уже показана тостом внутри apiRequest
  state.recentPasses.splice(idx, 1);
  state.disliked = state.disliked.filter(x => x.id !== id);
  state.deck.unshift(u);
  toast(t('restored_card', u.name));
  renderDiscover();
}

/* ---------- Essay tip of the day (right sidebar) — меняется раз в день, не при каждом рендере ---------- */
function essayTipOfTheDay() {
  const tips = t('essay_tips');
  const dayIndex = Math.floor(Date.now() / 86400000) % tips.length;
  return tips[dayIndex];
}

function cardPhotoStyle(u) {
  return u.photo ? `background-image:url('${u.photo}');background-size:cover;background-position:center;` : `background:${uniColor(u.id)};`;
}

/* Возвращает HTML содержимого для контейнера-фото вуза: реальное фото — просто
   img-слой; если фото нет — иллюстрированная SVG-сцена cardScene() (небо по
   climate + скайлайн/волны/холмы по setting) вместо плоского градиента с
   эмодзи поверх. Контейнер должен иметь position:relative + overflow:hidden
   (см. .uni-visual-host в styles.css).

   ФИКС «карточка долго появляется»: раньше `.uni-photo` вставлялся как
   <div style="background-image:url(...)"> — браузер начинал качать картинку
   с Wikipedia только ПОСЛЕ вставки в DOM (т.к. это просто CSS-фон, а не
   <img>), и до полной загрузки слой был ПУСТЫМ (прозрачным), из-за чего
   карточка «долго появлялась». Теперь:
   - `.uni-photo` — настоящий <img> с loading="lazy" decoding="async" →
     загрузка стартует раньше (браузер знает про <img> ещё до рендера),
     не блокирует render/main thread.
   - ПОД ним ставим мгновенный fallback-фон `cardScene(u)` (SVG, рисуется
     моментально, без сети) → карточка сразу выглядит законченной, а фото
     просто «проявляется» сверху с плавным fade-in после загрузки
     (см. `.uni-photo.loaded` ниже и CSS `.uni-photo`).
   - Изображение отрендерено как absolute inset:0, чтобы сохранить
     поведение «контейнер-хост с position:relative». */
function uniVisual(u) {
  // Фолбэк по UNI_PHOTO_EXTRA — на случай, когда объект вуза пришёл напрямую
  // из локального UNIVERSITIES и photo не подмешан (например NYU Abu Dhabi).
  const photo = u.photo || UNI_PHOTO_EXTRA[u.id];
  if (photo) {
    return `${cardScene(u)}<img class="uni-photo" src="${photo}" alt="${u.name}" loading="lazy" decoding="async" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;">`;
  }
  return cardScene(u);
}

const SKY_BY_CLIMATE = {
  Warm: ['#C88B5A', '#96702F'],
  Moderate: ['#8FA3A8', '#3A5068'],
  Cold: ['#AEC0D6', '#3A5068']
};
// Простой детерминированный псевдослучайный генератор от id — чтобы у
// каждого вуза была своя, воспроизводимая (не дёргающаяся при ре-рендере)
// вариация, а не общий вид на всех 18 вузов с одинаковым climate+setting.
function seededRand(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}
// Данные для скролл-марквиз-секции (см. renderLanding + initLpMarqueeScroll):
// две строки из реальных университетов, картинка — та же генеративная
// cardScene(), что и в остальном приложении (Discover), а не внешние
// картинки — так плитки совпадают по стилю с остальным UI и не зависят
// от стороннего хостинга.
// Текст итогового блока pain-секции с жирным выделением последней, ключевой
// фразы. Текст руками (не через t()+regex), чтобы не зависеть от пунктуации
// перевода при поиске последнего предложения.
function landingMarqueeSchools() {
  const row1 = [
    { id: 9001, name: 'Stanford University', setting: 'Suburban', climate: 'Warm' },
    { id: 9002, name: 'MIT', setting: 'Urban', climate: 'Cold' },
    { id: 9003, name: 'University of Oxford', setting: 'Urban', climate: 'Moderate' },
    { id: 9004, name: 'ETH Zurich', setting: 'Urban', climate: 'Cold' },
    { id: 9005, name: 'NUS', setting: 'Coastal', climate: 'Warm' },
    { id: 9006, name: 'University of Toronto', setting: 'Urban', climate: 'Cold' },
  ];
  const row2 = [
    { id: 9007, name: 'Cornell University', setting: 'Suburban', climate: 'Cold' },
    { id: 9008, name: 'UC Berkeley', setting: 'Urban', climate: 'Warm' },
    { id: 9009, name: 'University of Melbourne', setting: 'Urban', climate: 'Warm' },
    { id: 9010, name: 'TU Munich', setting: 'Urban', climate: 'Cold' },
    { id: 9011, name: 'HKUST', setting: 'Coastal', climate: 'Warm' },
    { id: 9012, name: 'McGill University', setting: 'Urban', climate: 'Cold' },
  ];
  return { row1, row2 };
}

function marqueeTile(u) {
  // Look up real university by name to get its photo
  const real = UNIVERSITIES.find(x => x.name === u.name);
  const visual = real ? uniVisual(real) : cardScene(u);
  return `<div class="lp-marquee-tile"><div class="uni-visual-host">${visual}</div><span class="lp-marquee-name">${u.name}</span></div>`;
}

// Оборачивает текст для посимвольной scroll-reveal анимации (см.
// initLpAnimText): каждый непробельный символ — свой <span class="lp-char">
// с прозрачностью, растущей по мере прокрутки контейнера через вьюпорт.
//
// ИСПРАВЛЕНИЕ (баг "ghosting" на .lp-pain-footer-text, из-за которого текст
// когда-то откатили на обычный абзац): раньше каждая буква была отдельным
// display:inline-block-сиблингом прямо в потоке абзаца, без обёртки на
// уровне слова. На тексте с text-align:center браузер иногда переносил
// строку МЕЖДУ буквами одного слова (визуально — разорванное слово, часть
// на одной строке, часть на другой, с "наплывом" соседних строк друг на
// друга). Причина: у соседних inline-block-элементов нет автоматической
// гарантии "не переносить строку внутри слова" — она есть только для
// обычного текста и работает надёжно, лишь пока буквы слова физически
// не разделены на разные inline-level боксы.
// Фикс: каждое слово теперь обёрнуто в свой <span class="lp-word"
// style="display:inline-block">, а буквы — уже внутри этой обёртки.
// Перенос строк снова возможен только на пробелах между словами (как в
// обычном тексте), а не между буквами внутри слова — вся "печатная"
// анимация (прозрачность по --ci) работает как раньше.
function animatedTextHTML(text) {
  let idx = 0;
  const wordsHtml = text.split(' ').map(word => {
    const lettersHtml = word.split('').map(ch => {
      const html = `<span class="lp-char" style="--ci:${idx}">${ch}</span>`;
      idx++;
      return html;
    }).join('');
    return `<span class="lp-word">${lettersHtml}</span>`;
  }).join(' ');
  return `<span class="lp-anim-text" data-total="${idx}">${wordsHtml}</span>`;
}

function cardScene(u) {
  const base = SKY_BY_CLIMATE[u.climate] || SKY_BY_CLIMATE.Moderate;
  const rnd = seededRand(u.id * 97 + 13);
  // Было: один и тот же sky[0]/sky[1] у ВСЕХ вузов с одинаковым climate —
  // раньше это давало буквально идентичный фон у десятков разных карточек
  // ("everywhere просто цвет", жалоба пользователя). Лёгкий сдвиг оттенка
  // и яркости на основе id делает каждый вуз визуально уникальным, оставаясь
  // в пределах палитры своего климата (не превращается в случайный цвет).
  const hueShift = Math.round((rnd() - 0.5) * 26); // ±13°
  const lightShift = Math.round((rnd() - 0.5) * 16); // ±8%
  const sky = [shiftColor(base[0], hueShift, lightShift), shiftColor(base[1], hueShift, lightShift)];
  let shapes = '';
  if (u.setting === 'Coastal') {
    // Высота/фаза волн тоже слегка варьируются по id, а не фиксированы.
    const wOffset = Math.round(rnd() * 20);
    shapes = `
      <circle cx="340" cy="45" r="26" fill="rgba(255,255,255,0.55)"/>
      <path d="M0,${150 + wOffset} Q50,${130 + wOffset} 100,${150 + wOffset} T200,${150 + wOffset} T300,${150 + wOffset} T400,${150 + wOffset} V210 H0 Z" fill="rgba(255,255,255,0.18)"/>
      <path d="M0,${168 + wOffset} Q50,${150 + wOffset} 100,${168 + wOffset} T200,${168 + wOffset} T300,${168 + wOffset} T400,${168 + wOffset} V210 H0 Z" fill="rgba(255,255,255,0.30)"/>
      <path d="M0,${185 + wOffset} Q50,${170 + wOffset} 100,${185 + wOffset} T200,${185 + wOffset} T300,${185 + wOffset} T400,${185 + wOffset} V210 H0 Z" fill="rgba(255,255,255,0.5)"/>`;
  } else if (u.setting === 'Urban') {
    // Высоты и ширины зданий теперь сгенерированы по id (детерминированно),
    // а не захардкожены одним списком на все urban-вузы — каждый город
    // получает свой силуэт.
    const buildings = [];
    let x = 6;
    while (x < 380) {
      const w = 24 + Math.round(rnd() * 16);
      const h = 90 + Math.round(rnd() * 90);
      buildings.push([x, h, w]);
      x += w + (8 + Math.round(rnd() * 10));
    }
    shapes = buildings.map(([bx, h, w]) => `<rect x="${bx}" y="${210 - h}" width="${w}" height="${h}" fill="rgba(255,255,255,0.22)"/>`).join('');
    let windows = '';
    buildings.forEach(([bx, h, w]) => {
      for (let wy = 210 - h + 10; wy < 200; wy += 18) {
        for (let wx = bx + 5; wx < bx + w - 5; wx += 12) {
          if ((wx + wy) % 23 < 9) windows += `<rect x="${wx}" y="${wy}" width="4" height="6" fill="rgba(255,255,255,0.7)"/>`;
        }
      }
    });
    shapes += windows;
  } else {
    // Suburban: позиция и размер холма/деревьев/домика тоже смещаются по id.
    const dx = Math.round((rnd() - 0.5) * 40);
    shapes = `
      <path d="M0,160 Q100,120 200,155 T400,150 V210 H0 Z" fill="rgba(255,255,255,0.2)"/>
      <circle cx="${70 + dx}" cy="150" r="22" fill="rgba(255,255,255,0.35)"/>
      <rect x="${60 + dx}" y="150" width="6" height="30" fill="rgba(255,255,255,0.35)"/>
      <circle cx="${300 - dx}" cy="140" r="26" fill="rgba(255,255,255,0.3)"/>
      <rect x="${292 - dx}" y="140" width="6" height="40" fill="rgba(255,255,255,0.3)"/>
      <rect x="150" y="140" width="70" height="50" fill="rgba(255,255,255,0.28)"/>
      <polygon points="150,140 185,110 220,140" fill="rgba(255,255,255,0.28)"/>`;
  }
  return `<svg viewBox="0 0 400 210" preserveAspectRatio="xMidYMax slice" xmlns="http://www.w3.org/2000/svg" style="position:absolute;inset:0;width:100%;height:100%;">
    <defs><linearGradient id="sky${u.id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${sky[0]}"/><stop offset="100%" stop-color="${sky[1]}"/></linearGradient></defs>
    <rect width="400" height="210" fill="url(#sky${u.id})"/>
    ${shapes}
  </svg>`;
}
// Сдвигает HEX-цвет по оттенку (градусы HSL) и светлоте (%) — используется
// cardScene() для уникализации фона каждой карточки по id, без ухода за
// пределы исходной цветовой семьи climate.
function shiftColor(hex, hueDeg, lightPct) {
  const r = parseInt(hex.slice(1, 3), 16) / 255, g = parseInt(hex.slice(3, 5), 16) / 255, b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0; const l = (max + min) / 2;
  const d = max - min;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60; if (h < 0) h += 360;
  }
  h = (h + hueDeg + 360) % 360;
  const l2 = Math.min(1, Math.max(0, l + lightPct / 100));
  const c = (1 - Math.abs(2 * l2 - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l2 - c / 2;
  let [r2, g2, b2] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  const toHex = (v) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
  return `#${toHex(r2)}${toHex(g2)}${toHex(b2)}`;
}
function fmtMoney(v) { return '$' + v.toLocaleString('en-US'); }
function ruDays(n) {
  const n10 = n % 10, n100 = n % 100;
  if (n10 === 1 && n100 !== 11) return 'день';
  if ([2, 3, 4].includes(n10) && ![12, 13, 14].includes(n100)) return 'дня';
  return 'дней';
}
// Русское склонение существительных по числу: одна форма на "1", другая на
// "2-4" ("2 заявки"), третья на "5+"/"11-14" ("5 заявок"). Раньше в паре
// мест (tracker_sub/roadmap_sub) использовался наивный n===1 ? ед. : мн. —
// из-за чего "2 заявки" превращалось в грамматически неверное "2 заявок".
function ruPlural(n, one, few, many) {
  const n10 = n % 10, n100 = n % 100;
  if (n10 === 1 && n100 !== 11) return one;
  if ([2, 3, 4].includes(n10) && ![12, 13, 14].includes(n100)) return few;
  return many;
}

/* ============================================================
   SCORING
   ============================================================ */
function academicStrength(p) {
  let gpaScore = Math.min(Math.max((p.gpa - 2.0) / 2.0, 0), 1) * 100; // 2.0-4.0 -> 0-100
  // IELTS сознательно исключён отсюда: это тест на владение английским, а не на академическую
  // силу профиля, и его нельзя усреднять с SAT/ACT так, будто это одна и та же шкала.
  const academicKeys = ACADEMIC_TESTS.filter(k => p.tests[k] && p.tests[k].taken);
  if (academicKeys.length === 0) return Math.round(gpaScore); // ни SAT, ни ACT не сдан — считаем только по GPA
  const avgTestScore = academicKeys.reduce((sum, k) => {
    const r = TEST_RANGES[k];
    const norm = Math.min(Math.max((p.tests[k].score - r.academicMin) / (r.academicMax - r.academicMin), 0), 1) * 100;
    return sum + norm;
  }, 0) / academicKeys.length; // если сдано и SAT, и ACT — усредняем их нормализованный балл
  return Math.round(gpaScore * 0.5 + avgTestScore * 0.5);
}

function englishProficiencyLevel(p) {
  // Отдельная, не влияющая на academicStrength оценка уровня английского — только для IELTS.
  const eq = [];
  if (p.tests.IELTS && p.tests.IELTS.taken) eq.push(p.tests.IELTS.score);
  if (p.tests.TOEFL && p.tests.TOEFL.taken) { const v = p.tests.TOEFL.score; eq.push(v >= 110 ? 8 : v >= 102 ? 7.5 : v >= 94 ? 7 : v >= 79 ? 6.5 : v >= 60 ? 6 : 5.5); }
  if (p.tests.DET && p.tests.DET.taken) { const v = p.tests.DET.score; eq.push(v >= 145 ? 8 : v >= 135 ? 7.5 : v >= 125 ? 7 : v >= 115 ? 6.5 : v >= 100 ? 6 : 5.5); }
  if (!eq.length) return null;
  const score = Math.max(...eq);
  if (score >= 7.5) return { level: 'strong', label_ru: 'Сильный уровень английского', label_en: 'Strong English proficiency' };
  if (score >= 6.5) return { level: 'good', label_ru: 'Соответствует типичным требованиям вузов', label_en: 'Meets typical university requirements' };
  return { level: 'low', label_ru: 'Ниже типичных требований большинства вузов', label_en: 'Below typical requirements at most universities' };
}

// Базовые веса категорий Match Score. Сумма = 100%. Портировано 1:1 из
// scoring.py (_BASE_WEIGHTS/_ALWAYS_KNOWN/_effective_weights) — см. комментарий
// там же для полного разбора, здесь только краткая версия.
const MATCH_BASE_WEIGHTS = { cs: 26, loc: 16, cost: 16, research: 13, size: 11, aid: 9, lang: 9 };
const MATCH_ALWAYS_KNOWN = ['cs', 'cost', 'research'];

// ИСПРАВЛЕНИЕ: раньше пустые setting/climate/size/needsAid превращались в
// фиксированные "нейтральные" числа (0.6/0.7/0.7), которые прибавлялись ВСЕМ
// вузам одинаково — 40% веса переставали различать вузы, и для гостя без
// preferences Match Score у сильного и слабого вуза отличался на пару пунктов.
// Теперь вес незаполненной категории перераспределяется на категории с
// сигналом, который есть всегда (cs/cost/research), пропорционально их
// базовым весам — сумма весов остаётся 100%, а скор опирается только на то,
// что реально известно о пользователе.
function matchWeights(p) {
  const w = { ...MATCH_BASE_WEIGHTS };
  let pool = 0;
  if (!p.setting.length && !p.climate.length) { pool += w.loc; delete w.loc; }
  if (!p.size.length) { pool += w.size; delete w.size; }
  if (p.needsAid !== true) { pool += w.aid; delete w.aid; }
  if (pool) {
    const knownTotal = MATCH_ALWAYS_KNOWN.reduce((s, k) => s + MATCH_BASE_WEIGHTS[k], 0);
    MATCH_ALWAYS_KNOWN.forEach(k => { w[k] += pool * (MATCH_BASE_WEIGHTS[k] / knownTotal); });
  }
  return w;
}

function matchScore(u, p) {
  const w = matchWeights(p);
  let score = 0;
  // CS fit
  score += (u.cs / 100) * w.cs;
  // Cost fit (lower cost relative to budget = better, but not penalized much if under)
  let costRatio = p.budget > 0 ? u.cost / p.budget : 1;
  let costFit = costRatio <= 1 ? 1 : Math.max(0, 1 - (costRatio - 1) * 0.8);
  score += costFit * w.cost;
  // Research fit
  let researchFit = 1 - Math.abs(u.research - p.research) / 5;
  score += Math.max(0, researchFit) * w.research;
  // Location fit (setting + climate) — только если что-то из этого указано
  if (w.loc !== undefined) {
    let locFit = 0;
    if (p.setting.length && p.setting.includes(u.setting)) locFit += 0.55;
    if (p.climate.length && p.climate.includes(u.climate)) locFit += 0.45;
    score += locFit * w.loc;
  }
  // Size fit — только если список не пуст
  if (w.size !== undefined) {
    let sizeFit = p.size.includes(u.size) ? 1 : 0.4;
    score += sizeFit * w.size;
  }
  // Financial aid fit — только если студент явно отметил, что помощь важна
  if (w.aid !== undefined) {
    // ФИНАНСОВАЯ ПОМОЩЬ + ПРОИСХОЖДЕНИЕ СТУДЕНТА:
    // реальность рынка в том, что большие need-based гранты (aid.level === 'High',
    // «full need met») в США почти никогда не даются international students.
    // Если студент international (homeCountry ≠ u.country, или homeCountry пуст —
    // по умолчанию считаем «international»), и note явно говорит «limited for international",
    // то aidFit = 0, независимо от заявленного уровня вуза. Это ключевой баг:
    // у MIT в заметке «Meets 100% need» (High), но это только для domestic —
    // а вы у него международный студент → фактический fit почти нулевой.
    // (Правка 2026-11: раньше стояло исключение «aidLevel !== 'High'» — вузы
    //  с заявленным «Meets 100% need» продолжали получать полный aidFit даже
    //  при явном «limited for internationals» в заметке. Исключение убрано.)
    let aidLevel = u.aid.level;
    const isInternational = !(p.homeCountry && p.homeCountry === u.country);
    // Регулярка: ищем явное упоминание, что помощь недоступна/ограничена для
    // international. Старый паттерн с /вузам/ был слишком широким и матчил
    // случайные строки UNI_DATA (например «Лидер мировых рейтингов по…»).
    // Точнее: 'иностранц' или 'international' рядом с 'limited|нет|almost no|не да|не доступ|only rare|огранич'.
    const aidNote = (u.aid.note || '').toLowerCase();
    const noteSaysLimitedIntl = /иностранц|international/.test(aidNote) && /limited|almost no|not available|no aid|only rare|нет|не да|не доступ|огранич/.test(aidNote);
    if (isInternational && noteSaysLimitedIntl) {
      // note явно говорит, что международным студентам помощь ограничена
      aidLevel = 'Low';
    }
    let aidFit = { High: 1, Medium: 0.6, Low: 0.25 }[aidLevel] ?? 0.5;
    // Если студент domestic (homeCountry === u.country), вузы его страны имеют
    // доступ к gov-грантам → бустим aidFit для domestic-вузов, чтобы студент
    // видел, что у него реально хорошие стипендии именно дома.
    if (!isInternational && aidLevel !== 'Low') {
      aidFit = Math.min(1, aidFit + 0.15);
    }
    score += aidFit * w.aid;
  }
  // Language fit — язык обучения вуза против родного языка/английского студента.
  // Та же логика, что в matchParts() (см. комментарий там).
  if (w.lang !== undefined) {
    const teachLang = COUNTRY_TEACH_LANG[u.country] || 'en';
    let langFit = 0.5;
    if (teachLang === 'en') {
      if (p.nativeLang === 'en') langFit = 1;
      else {
        const goodEng = { IELTS: 6.5, TOEFL: 90, DET: 110 };
        const eng = ['IELTS', 'TOEFL', 'DET'].filter(k => p.tests[k] && p.tests[k].taken);
        langFit = eng.some(k => p.tests[k].score >= goodEng[k]) ? 1 : (eng.length ? 0.65 : 0.5);
      }
    } else if (teachLang === (p.nativeLang || null)) {
      langFit = 1;
    } else if (p.nativeLang) {
      langFit = 0.3;
    } else {
      langFit = 0.55;
    }
    score += langFit * w.lang;
  }
  return Math.max(40, Math.min(99, Math.round(score)));
}

function toSATEquivalent(testKey, score) {
  // Normalizes ACT (or SAT itself) onto the SAT 900-1600 academic band, using the same
  // min/max normalization the rest of the app already uses for academicStrength — so a
  // 30 ACT and a ~1400 SAT are treated as equivalent everywhere, not just here.
  const r = TEST_RANGES[testKey];
  const norm = Math.min(Math.max((score - r.academicMin) / (r.academicMax - r.academicMin), 0), 1);
  return 900 + norm * 700;
}

function admissionReality(u, p) {
  // Common Data Set style check: universities publish the middle-50% (25th-75th percentile)
  // GPA/SAT of their ADMITTED class every year. Real counselors sort Reach/Target/Likely by
  // comparing a student's own numbers against that published range — not by inventing a
  // single blended "how strong is this student" score and diffing it against acceptance rate.
  // ДАННЫЕ: для вузов США SAT 25/75 взяты из College Scorecard (где вуз не сообщает SAT, значение
  // оценено по доле принятых). GPA 25/75 и все баллы вузов вне США оценены по доле принятых
  // (formula в tools/build_data.py), это ориентиры, а не опубликованные Common Data Set.
  const rank = { below: 0, within: 1, above: 2 };
  const gpaPos = p.gpa < u.gpa25 ? 'below' : (p.gpa > u.gpa75 ? 'above' : 'within');

  const academicKeys = Object.keys(p.tests || {}).filter(k => k !== 'IELTS' && p.tests[k] && p.tests[k].taken);
  let testPos = null;
  if (academicKeys.length) {
    // If the student reports both SAT and ACT, use whichever reflects better on them —
    // same as how a student would submit their strongest test to admissions.
    const best = Math.max(...academicKeys.map(k => {
      const satEq = toSATEquivalent(k, p.tests[k].score);
      return satEq < u.sat25 ? rank.below : (satEq > u.sat75 ? rank.above : rank.within);
    }));
    testPos = best;
  }

  // Overall position is the WEAKER of the two available signals — a 4.0 GPA doesn't make a
  // school a "Likely" if the student's test score sits well below the admitted middle-50%.
  const overall = testPos !== null ? Math.min(rank[gpaPos], testPos) : rank[gpaPos];

  // Вузы с приёмом ниже 10% — «Reach» для любого абитуриента, даже с идеальными баллами:
  // там отказывают большинству сильных кандидатов (так делят вузы и школьные консультанты).
  if (u.acceptance < 0.10) return 'Reach';
  if (overall === rank.below) return 'Reach';
  // Приём 10–20%: попадание в диапазон поступивших ещё не делает вуз «Target» надёжным,
  // но и «Likely» здесь быть не может.
  if (overall === rank.within || u.acceptance < 0.25) return 'Target';
  // Сильная программа внутри вуза с широким приёмом (например, CS в Waterloo) принимает строже,
  // чем показывает общий процент: «Likely» там заменяем на «Target». Работает только для
  // реального профиля, где известна специальность.
  if (u.acceptance < 0.6 && (p.major || (p.majors && p.majors.length)) && programStrength(u, p) >= 95) return 'Target';
  return 'Likely';
}

/* ============================================================
   MONETIZATION — Admission Reality "What if" simulator
   (см. MONETIZATION_SPEC.md, раздел 1). Намеренно без запроса к бэку на
   каждое движение слайдера: admissionReality() уже чистая функция без
   побочных эффектов, портированная 1:1 из scoring.py — принимает
   произвольные gpa/sat вместо state.profile, ничего не пишет в state и
   ничего не шлёт на бэк. Реальный профиль пользователя не меняется —
   симуляция это гипотеза, а не редактирование профиля.
   ============================================================ */
function simulateAdmissionReality(u, hypotheticalGpa, hypotheticalTestKey, hypotheticalScore) {
  const fakeProfile = {
    gpa: hypotheticalGpa,
    tests: {
      SAT: { taken: hypotheticalTestKey === 'SAT', score: hypotheticalTestKey === 'SAT' ? hypotheticalScore : 0 },
      ACT: { taken: hypotheticalTestKey === 'ACT', score: hypotheticalTestKey === 'ACT' ? hypotheticalScore : 0 },
      IELTS: { taken: false, score: 0 }
    }
  };
  return admissionReality(u, fakeProfile);
}

function explainAdmissionReality(u, gpa, testKey, testScore) {
  // Структурированное объяснение (code + params), как why_this_university() —
  // локализация на фронте через t(), а не захардкоженная строка на одном языке.
  const gpaCode = gpa < u.gpa25 ? 'gpa_below' : (gpa > u.gpa75 ? 'gpa_above' : 'gpa_within');
  let testCode = 'test_not_taken', weakerSignal = 'gpa';
  if (testKey) {
    const satEq = toSATEquivalent(testKey, testScore);
    testCode = satEq < u.sat25 ? 'test_below' : (satEq > u.sat75 ? 'test_above' : 'test_within');
    const rank = { below: 0, within: 1, above: 2 };
    const gpaRank = rank[gpaCode.replace('gpa_', '')];
    const testRank = rank[testCode.replace('test_', '')];
    weakerSignal = testRank <= gpaRank ? 'test' : 'gpa';
  }
  return { gpaCode, testCode, weakerSignal, gpa25: u.gpa25, gpa75: u.gpa75, sat25: u.sat25, sat75: u.sat75 };
}

/* ---------- Paywall + premium gate ---------- */
function requirePremium(onUnlocked) {
  if (state.isPremium) { onUnlocked(); return; }
  state.paywallOpen = true;
  renderApp();
}
function closePaywall() { state.paywallOpen = false; renderApp(); }
function paywallModalHtml() {
  if (!state.paywallOpen) return '';
  // В paywall — только то, что реально работает (см. renderPremium: теги «Скоро»)
  const feats = ['pm_f_sim', 'pm_f_cal', 'pm_f_pdf', 'pm_f_share'];
  return `
    <div class="hero-panel-overlay open" onclick="closePaywall()"></div>
    <div class="paywall-modal">
      <button class="hero-icon-btn" style="position:absolute;top:14px;right:14px;" onclick="closePaywall()">${ICONS.x}</button>
      <span class="paywall-ico">${ICONS.spark}</span>
      <h3>${t('pm_h1')}</h3>
      <ul class="paywall-list">${feats.map(f => `<li>${ICONS.check}<span>${t(f)}</span></li>`).join('')}</ul>
      <button class="lp-btn lp-btn-primary" style="width:100%;justify-content:center;" onclick="premiumBuy()">${premiumCtaLabel()}</button>
      <button class="premium-demo-link" onclick="closePaywall();go('premium')">${t('paywall_more')}</button>
      <p class="paywall-note">${(state.payments && state.payments.stripe) ? t('pm_buy_note') : t('pm_demo_note')}</p>
    </div>`;
}
/* Подпись кнопки Premium: реальная оплата («Оформить»), демо или честное
   «не подключено» — по конфигу /payments/config с бэкенда. */
function premiumCtaLabel() {
  return (state.payments && state.payments.stripe) ? t('pm_buy') : t('pm_cta');
}
/* Конфиг оплаты: {stripe: bool, demo: bool}. Публичная ручка — фронт зовёт
   её при старте, чтобы рисовать честные кнопки (никаких фейковых «Купить»). */
async function loadPaymentsConfig() {
  try { state.payments = await apiRequest('/payments/config'); } catch (e) { state.payments = null; }
}
/* Действие «оформить Premium»: Stripe подключён — уводим на страницу оплаты
   (POST /payments/checkout-session отдаёт url); не подключён, но демо-режим —
   демо-активация; иначе честно говорим, что оплаты пока нет. */
async function premiumBuy() {
  if (state.payments && state.payments.stripe) {
    try {
      const s = await apiRequest(`/payments/checkout-session?user_id=${state.userId}`, { method: 'POST' });
      if (s && s.url) { location.href = s.url; return; }
      toast(t('server_error'));
    } catch (e) {
      toast(e.status === 503 ? t('pm_pay_off') : (e.message || t('server_error')));
    }
    return;
  }
  if (state.payments && state.payments.demo) { await devGrantPremium(); return; }
  toast(t('pm_pay_off'));
}
// ДЕМО-ONLY: нет платёжного провайдера, поэтому вместо оплаты — прямой вызов
// демо-ручки POST /users/{id}/entitlement (main.py). В реальном запуске эта
// кнопка ведёт на чекаут, а не выдаёт премиум сама.
async function devGrantPremium() {
  try {
    // main.py принимает только "free" | "premium" — другие значения (например,
    // "premium_monthly") бэкенд отклоняет с 400, и активация не работала.
    const user = await apiGrantEntitlement(state.userId, 'premium');
    state.isPremium = !!user.isPremium;
    state.paywallOpen = false;
    toast(t('premium_activated'));
    renderApp();
  } catch (e) {
    // 402 уже открыл paywall выше; 403 — демо-режим выключен на сервере;
    // остальное — как обычная ошибка сервера.
    if (e.status === 402) return;
    toast(e.status === 403 ? t('premium_demo_off') : t('server_error'));
  }
}
async function devRevokePremium() {
  try {
    const user = await apiGrantEntitlement(state.userId, 'free');
    state.isPremium = !!user.isPremium;
    state.paywallOpen = false;
    renderApp();
  } catch (e) {
    if (e.status === 402) return;
    toast(e.status === 403 ? t('premium_demo_off') : t('server_error'));
  }
}

/* ---------- Partner placements (см. спека, раздел 3) ---------- */
// Партнёрские блоки видны всем — requirePremium() здесь не участвует.
async function loadPartnerSlot(slot, universityId, targetElId) {
  try {
    const partners = await apiFetchPlacements(state.userId, slot, universityId);
    const el = document.getElementById(targetElId);
    if (!el || !partners.length) return;
    el.innerHTML = partners.map(p => `
      <div class="partner-block">
        <span class="partner-disclosure">${p.disclosureLabel}</span>
        <span class="partner-name">${p.name}</span>
        <a href="${API_BASE}/go/${p.id}?user_id=${state.userId}" target="_blank" rel="noopener noreferrer" class="partner-link">${t('partner_cta')}</a>
      </div>`).join('');
  } catch (e) { /* тихо: партнёрский блок необязателен для основного функционала */ }
}

/* ---------- "What if" simulator markup + live update (не через renderApp(),
   чтобы драг слайдера не дёргал весь экран — только текст результата) ---------- */
function admissionSimulatorHtml(u) {
  const p = state.profile;
  const defaultTestKey = p.tests.SAT.taken ? 'SAT' : (p.tests.ACT.taken ? 'ACT' : 'SAT');
  const defaultScore = p.tests[defaultTestKey].taken ? p.tests[defaultTestKey].score
    : (defaultTestKey === 'SAT' ? 1350 : 30);
  if (!state.isPremium) {
    // Тизер показывает НАСТОЯЩИЙ расчёт по реальному профилю (не заглушку) —
    // размытый, под лок-оверлеем. Человек видит, что там реально есть готовый
    // ответ на его вопрос "какие у меня шансы", и это и есть триггер "хочу
    // посмотреть, но не могу" — а не абстрактный текст про фичу.
    return `
      <div class="info-block reveal sim-teaser">
        <h4>${t('sim_title')}</h4>
        <div class="sim-teaser-preview" aria-hidden="true">
          <div class="sim-row"><label>${t('sim_gpa_label')} <b>${p.gpa.toFixed(2)}</b></label><input type="range" min="2" max="4" value="${p.gpa}" disabled></div>
          <div class="sim-row"><label>${defaultTestKey} <b>${defaultScore}</b></label><input type="range" min="${TEST_RANGES[defaultTestKey].min}" max="${TEST_RANGES[defaultTestKey].max}" value="${defaultScore}" disabled></div>
          <span class="badge badge-${u._reality}" style="font-size:13px;padding:8px 16px;">${chanceLabel(u._reality)}</span>
        </div>
        <div class="sim-teaser-overlay">
          <div class="sim-teaser-lock">${ICONS.lock}</div>
          <p>${t('sim_locked_body')}</p>
          <button class="lp-btn lp-btn-primary" onclick="requirePremium(()=>{})">${t('sim_unlock_cta')}</button>
        </div>
      </div>`;
  }
  return `
    <div class="info-block reveal" id="sim-block" data-uni-id="${u.id}">
      <h4>${t('sim_title')}</h4>
      <p style="font-size:12.5px;color:var(--ink-soft);margin:0 0 12px;">${t('sim_body')}</p>
      <div class="sim-row">
        <label>${t('sim_gpa_label')} <b id="sim-gpa-val">${p.gpa.toFixed(2)}</b></label>
        <input type="range" id="sim-gpa-input" min="2" max="4" step="0.05" value="${p.gpa}" oninput="onSimSliderChange(${u.id})">
      </div>
      <div class="sim-row">
        <label>${defaultTestKey} <b id="sim-test-val">${defaultScore}</b></label>
        <input type="range" id="sim-test-input" min="${TEST_RANGES[defaultTestKey].min}" max="${TEST_RANGES[defaultTestKey].max}" step="${TEST_RANGES[defaultTestKey].step}" value="${defaultScore}" data-test-key="${defaultTestKey}" oninput="onSimSliderChange(${u.id})">
      </div>
      <div id="sim-result" class="sim-result"></div>
    </div>`;
}

function onSimSliderChange(uniId) {
  const u = findUni(uniId);
  if (!u) return;
  const gpaInput = document.getElementById('sim-gpa-input');
  const testInput = document.getElementById('sim-test-input');
  const gpa = parseFloat(gpaInput.value);
  const testKey = testInput.dataset.testKey;
  const score = parseFloat(testInput.value);
  document.getElementById('sim-gpa-val').textContent = gpa.toFixed(2);
  document.getElementById('sim-test-val').textContent = testKey === 'ACT' ? Math.round(score) : Math.round(score);

  const reality = simulateAdmissionReality(u, gpa, testKey, score);
  const explain = explainAdmissionReality(u, gpa, testKey, score);
  const resultEl = document.getElementById('sim-result');
  resultEl.innerHTML = `
    <span class="badge badge-${reality}" style="font-size:13px;padding:8px 16px;">${chanceLabel(reality)}</span>
    <p style="font-size:12.5px;color:var(--ink-soft);margin:10px 0 0;">${t('sim_explain_' + explain.weakerSignal)}</p>`;
}

/* buildDeck() больше не считает подборку локально — deck теперь всегда
   приходит с бэкенда (GET /universities?user_id=), который сам фильтрует по
   continents/countries, откатывается на полный список при пустом фильтре
   (deckFallback), исключает уже свайпнутые вузы и сортирует по Match Score.
   Эта функция просто оборачивает запрос и кладёт результат в state.deck. */
async function buildDeck() {
  const res = await apiFetchDeck(state.userId);
  // ИСПРАВЛЕНИЕ: раньше deckFallback угадывался на фронте эвристикой
  // "rows.length === 50" — верно, только пока в базе было ровно 50
  // университетов. После того как seed_data.py вырос до 200 записей,
  // эта проверка почти никогда не совпадала, и подсказка "под твои фильтры
  // ничего не нашлось, показываем всё" на Discover перестала появляться.
  // Теперь бэкенд сам сообщает об этом явно через заголовок (main.py).
  state.deckFallback = res.headers.get('X-Deck-Fallback') === 'true';
  const rows = await res.json();
  state.deck = rows.map(fromApiUniScored);
  state.deck.sort((a, b) => b._match - a._match);
  state.deck.forEach(u => { state.uniCache[u.id] = u; });
}

/* ---------- Discover-screen filters: region + budget, editable without redoing onboarding ---------- */
async function rebuildDeckKeepingHistory() {
  await apiSaveProfile(); // persist изменившийся profile.continents/countries/budget на бэке
  await buildDeck();      // и сразу перезапросить deck с новым фильтром
}
async function toggleDiscoverContinent(key) {
  const p = state.profile;
  const idx = p.continents.indexOf(key);
  if (idx > -1) p.continents.splice(idx, 1); else p.continents.push(key);
  p.countries = p.countries.filter(c => p.continents.some(k => (REAL_COUNTRIES_BY_CONTINENT[k] || []).includes(c)));
  renderDiscover(); // мгновенно показываем нажатый чип, не дожидаясь сети
  await rebuildDeckKeepingHistory();
  saveGuestSession();
  renderDiscover();
}
async function setDiscoverBudget(value) {
  state.profile.budget = parseInt(value, 10);
  await rebuildDeckKeepingHistory();
  saveGuestSession();
  renderDiscover();
}

/* ============================================================
   ONBOARDING RENDER
   ============================================================ */
const OB_STEPS = ['About you', 'Grades & exams', 'Preferences', 'Where to study', 'Ready'];
let obPop = null; // что именно только что появилось (плашка баллов теста / панель стран) — анимируем только это
let lastAnimatedObStep = -1; // анимация появления шага должна проигрываться только при реальном переходе между шагами, а не при каждом клике внутри шага
let lastAnimatedMajorCategory = null; // то же самое для сетки специальностей — переигрываем только когда реально сменилась категория

/* ============================================================
   LANDING PAGE
   ============================================================ */
function setLandingLang(lang) {
  if (lang === state.lang) return;
  animateLangSwitches(lang);
  setTimeout(() => {
    state.lang = lang;
    renderLanding();
  }, 300);
}
/* ---------- Mobile landing nav: RU/EN + theme + login live behind this
   compact menu button below ~680px, instead of squeezing into one row next
   to the primary CTA and wrapping onto an awkward second line. ---------- */
function lpHeaderLinks() {
  const en = state.lang === 'en';
  return [
    { id: 'lp-marquee', label: en ? 'Universities' : 'Вузы' },
    { id: 'lp-how', label: t('nav_how') },
  ];
}
function toggleLpMenu(force) {
  const h = document.getElementById('lp-header');
  const btn = document.getElementById('lp-menu-btn');
  if (!h) return;
  const open = typeof force === 'boolean' ? force : !h.classList.contains('menu-open');
  h.classList.toggle('menu-open', open);
  if (btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  updateLpMobileCtaBar(); // нижняя CTA-панель не должна висеть поверх открытого меню
}
document.addEventListener('click', (e) => {
  const h = document.getElementById('lp-header');
  if (!h || !h.classList.contains('menu-open')) return;
  if (h.contains(e.target)) return;
  toggleLpMenu(false);
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') toggleLpMenu(false); });
/* Шапка: на самом верху — без подложки (лежит на небе хиро), после
   небольшого скролла — сплошной фон и тонкая линия. Плюс подсветка
   раздела, который сейчас на экране. */
function lpHeaderSync() {
  const h = document.getElementById('lp-header');
  if (!h || !h.offsetParent) return;
  h.classList.toggle('is-scrolled', window.scrollY > 8);
  const probe = 120;
  let cur = '';
  lpHeaderLinks().forEach(l => {
    const el = document.getElementById(l.id);
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (r.top <= probe && r.bottom > probe) cur = l.id;
  });
  h.querySelectorAll('.hd-links a').forEach(a => a.classList.toggle('active', a.dataset.sec === cur));
}
window.addEventListener('scroll', () => requestAnimationFrame(lpHeaderSync), { passive: true });
window.addEventListener('resize', () => { if (window.innerWidth > 900) toggleLpMenu(false); lpHeaderSync(); });

function enterOnboarding() {
  const landing = document.getElementById('landing');
  const onboarding = document.getElementById('onboarding');
  landing.classList.add('lp-fade-out');
  setTimeout(() => {
    landing.classList.add('hidden');
    landing.classList.remove('lp-fade-out');
    onboarding.classList.remove('hidden');
    renderOnboarding();
    updateLpMobileCtaBar(); // лендинг скрыт — панель уходит вместе с ним
    onboarding.classList.add('ob-fade-in');
    setTimeout(() => onboarding.classList.remove('ob-fade-in'), 550);
  }, 260);
}
function backToLanding() {
  // Прогресс всё равно не теряется — он уже лежит в state и (для гостевой сессии) в localStorage,
  // поэтому можно спокойно вернуться на главную и продолжить с того же места через "Начать бесплатно".
  const landing = document.getElementById('landing');
  const onboarding = document.getElementById('onboarding');
  const mainapp = document.getElementById('mainapp');
  const active = !onboarding.classList.contains('hidden') ? onboarding : mainapp;
  active.classList.add('lp-fade-out');
  setTimeout(() => {
    active.classList.add('hidden');
    active.classList.remove('lp-fade-out');
    landing.classList.remove('hidden');
    renderLanding();
    landing.classList.add('ob-fade-in');
    setTimeout(() => landing.classList.remove('ob-fade-in'), 550);
    window.scrollTo(0, 0);
  }, 260);
}
function lpScrollTo(id) {
  const el = document.getElementById(id);
  if (!el) return;
  /* prefers-reduced-motion: при включённой настройке «уменьшить
     анимацию» плавный скролл (behavior:'smooth') тоже считается
     движением и отключается — переход к секции становится мгновенным.
     CSS-правила (@media prefers-reduced-motion) на scrollIntoView
     не действуют, поэтому проверяем matchMedia здесь. */
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  el.scrollIntoView({ behavior: reduced ? 'instant' : 'smooth', block: 'start' });
}

/* ============================================================
   LOGIN / REGISTER
   ============================================================ */
let authState = { mode: 'login', submitting: false, error: null, prefillEmail: null };

function showLoginScreen(mode, prefillEmail) {
  authState = { mode: mode || 'login', submitting: false, error: null, prefillEmail: prefillEmail || null };
  document.getElementById('login').classList.remove('hidden');
  renderLoginScreen();
  window.scrollTo(0, 0);
  updateLpMobileCtaBar(); // полноэкранный логин поверх лендинга — панель прячем
}
function closeLoginScreen() {
  document.getElementById('login').classList.add('hidden');
  updateLpMobileCtaBar();
}
function setAuthMode(mode) {
  authState.mode = mode;
  authState.error = null;
  renderLoginScreen();
}
function toggleAuthPasswordVisibility() {
  const input = document.getElementById('auth-password-input');
  const btn = document.getElementById('auth-pw-toggle-btn');
  if (!input || !btn) return;
  const showing = input.type === 'text';
  input.type = showing ? 'password' : 'text';
  btn.innerHTML = showing ? ICONS.lockClosed : ICONS.unlock;
  input.focus();
}

// Реального OAuth пока нет (нужен бэкенд-флоу с каждым провайдером отдельно) —
// кнопки уже в интерфейсе и кликабельны, чтобы макет выглядел завершённым,
// но по клику честно говорим, что это скоро появится, а не притворяемся,
// что вход произошёл.
/* ============================================================
   ВХОД ЧЕРЕЗ GOOGLE / ЯНДЕКС / TELEGRAM
   Ключи вписываются только сюда. Пока поле пустое — кнопка честно
   говорит, что вход ещё не подключён.
   - google:   OAuth Client ID (Google Cloud Console → Credentials → Web client),
               в «Authorized JavaScript origins» добавить домен сайта.
   - yandex:   ClientID приложения на oauth.yandex.ru (права: login:email, login:info),
               Redirect URI = адрес сайта.
   - telegram: числовой bot_id бота (первая часть токена до «:»), в @BotFather
               выполнить /setdomain и указать домен сайта.
   ============================================================ */
const OAUTH = { google: '', yandex: '', telegram: '' };

function loadScriptOnce(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const el = document.createElement('script');
    el.src = src; el.async = true; el.onload = () => resolve(); el.onerror = () => reject(new Error('script'));
    document.head.appendChild(el);
  });
}
function socialProviderName(p) { return { google: 'Google', yandex: 'Яндекс ID', telegram: 'Telegram' }[p] || p; }

async function socialAuthClick(provider) {
  const key = ({ 'Google': 'google', 'Яндекс ID': 'yandex', 'Telegram': 'telegram' })[provider] || provider;
  if (!OAUTH[key]) { toast(t('auth_social_soon').replace('{provider}', socialProviderName(key))); return; }
  try {
    if (key === 'google') {
      // Токен получаем через Google Identity Services, а ПРОВЕРЯЕМ его на
      // нашем бэкенде (/auth/social дергает userinfo.googleapis.com): связка
      // «Google-аккаунт → профиль Admitly» хранится в БД, не в localStorage.
      await loadScriptOnce('https://accounts.google.com/gsi/client');
      const client = google.accounts.oauth2.initTokenClient({
        client_id: OAUTH.google, scope: 'openid email profile',
        callback: async resp => {
          if (!resp || !resp.access_token) { toast(t('auth_social_fail')); return; }
          await completeSocialLogin({ provider: 'google', token: resp.access_token });
        }
      });
      client.requestAccessToken();
    } else if (key === 'yandex') {
      // Открываем окно Яндекса; после входа он вернёт нас на сайт с токеном в адресе
      // (#access_token=...), это ловит handleYandexRedirect() при загрузке страницы.
      const redirect = location.origin + location.pathname;
      lsSet('unimatch_yandex_pending', '1');
      location.href = `https://oauth.yandex.ru/authorize?response_type=token&client_id=${encodeURIComponent(OAUTH.yandex)}&redirect_uri=${encodeURIComponent(redirect)}&state=yandex`;
    } else if (key === 'telegram') {
      // Login Widget присылает подписанный payload (hash) — проверяем его
      // HMAC-подпись на бэкенде токеном бота (TELEGRAM_BOT_TOKEN в env).
      await loadScriptOnce('https://telegram.org/js/telegram-widget.js?22');
      window.Telegram.Login.auth({ bot_id: OAUTH.telegram, request_access: 'write', lang: state.lang }, async data => {
        if (!data || !data.id) { toast(t('auth_social_fail')); return; }
        await completeSocialLogin({ provider: 'telegram', telegramData: data });
      });
    }
  } catch (e) { toast(t('auth_social_fail')); }
}

async function handleYandexRedirect() {
  const h = new URLSearchParams(location.hash.slice(1));
  if (h.get('state') !== 'yandex' || !h.get('access_token')) return false;
  history.replaceState(null, '', location.pathname);
  lsRemove('unimatch_yandex_pending');
  // Токен Яндекса уходит на /auth/social — бэкенд сам дергает
  // login.yandex.ru/info и валидирует его (раньше это делал браузер).
  await completeSocialLogin({ provider: 'yandex', token: h.get('access_token') });
  return true;
}

/* Соцвход через бэкенд: POST /auth/social {provider, token | telegramData,
   guestId}. Бэкенд проверяет токен у провайдера (Google userinfo /
   Яндекс login.yandex.ru/info / Telegram HMAC), находит или создаёт
   пользователя (гостевая сессия «усыновляется» — прогресс сохраняется) и
   выдаёт серверный Bearer-токен — ровно как email-вход. Связка живёт в
   таблице social_accounts БД, а не в localStorage браузера. */
async function completeSocialLogin({ provider, token, telegramData }) {
  try {
    const user = await apiRequest('/auth/social', {
      method: 'POST',
      body: JSON.stringify({
        provider,
        token: token || '',
        telegramData: telegramData || null,
        lang: state.lang,
        guestId: state.guestId || null,
      }),
    });
    if (user.sessionToken) saveAuthSession(user.sessionToken);
    state.guestId = user.guestId || state.guestId;
    toast(t('auth_social_ok').replace('{provider}', socialProviderName(provider)));
    await loadSessionForUser(user.id);
  } catch (e) {
    toast(e && e.message ? e.message : t('auth_social_fail'));
  }
}

async function submitAuthForm(e) {
  e.preventDefault();
  if (authState.submitting) return;
  const email = document.getElementById('auth-email-input').value.trim();
  const password = document.getElementById('auth-password-input').value;
  if (!email || !password) return;

  authState.submitting = true;
  authState.error = null;
  renderLoginScreen();

  try {
    const user = authState.mode === 'register'
      ? await apiAuthRegister(email, password)
      : await apiAuthLogin(email, password);
    // Бэкенд выдаёт токен серверной сессии только в /auth/register и /auth/login
    // (sessionToken); остальные ручки его не возвращают. Без токена персональные
    // запросы зарегистрированного пользователя упадут с 401.
    if (user.sessionToken) saveAuthSession(user.sessionToken);
    state.guestId = user.guestId || state.guestId;
    await loadSessionForUser(user.id);
  } catch (err) {
    authState.submitting = false;
    authState.error = err.message || t('auth_error_generic');
    renderLoginScreen();
  }
}

function renderLoginScreen() {
  const box = document.getElementById('login');
  const isRegister = authState.mode === 'register';
  box.innerHTML = `
    <div class="auth-bg" aria-hidden="true">
      <div class="lp-bg-fx-day" style="--sky-top:#DCEEFB;--sky-haze:#EAF4FA;--sky-near:#BFE3EA;--sky-far:#DCEEFB;--p:1">${heroDayMistMarkup()}${heroDayCloudsMarkup()}</div>
      <div class="lp-bg-fx-night">${nightSkyMarkup(140, true)}</div>
    </div>
    <div class="auth-topbar">
      <a href="#" class="lp-logo" onclick="return false;"><span class="mark">${ICONS.logo}</span><span class="text">Admitly</span></a>
      <button class="auth-close" aria-label="close" onclick="closeLoginScreen()">${ICONS.x}</button>
    </div>
    <div class="auth-stage">
      <div class="auth-box">
        <div class="auth-mark">${ICONS.logo}</div>
        <h1 class="auth-title">${t(isRegister ? 'auth_register_title' : 'auth_login_title')}</h1>
        <p class="auth-sub">${t(isRegister ? 'auth_register_sub' : 'auth_login_sub')}</p>
        <div class="auth-card">
          <form onsubmit="submitAuthForm(event)">
            ${authState.error ? `<div class="auth-error">${ICONS.info}<span>${authState.error}</span></div>` : ''}
            <div class="auth-field">
              <input id="auth-email-input" type="email" autocomplete="email" placeholder="${t('auth_email_ph')}" required>
            </div>
            <div class="auth-field has-toggle">
              <input id="auth-password-input" type="password" autocomplete="${isRegister ? 'new-password' : 'current-password'}" placeholder="${t('auth_password_ph')}" required minlength="6">
              <button type="button" class="auth-pw-toggle" id="auth-pw-toggle-btn" onclick="toggleAuthPasswordVisibility()" aria-label="toggle password visibility">${ICONS.lockClosed}</button>
            </div>
            <button type="submit" class="lp-btn lp-btn-primary auth-submit" ${authState.submitting ? 'disabled' : ''}>
              ${authState.submitting ? t('auth_submitting') : t(isRegister ? 'auth_submit_register' : 'auth_submit_login')}
            </button>
          </form>
          <div class="auth-social-divider"><span>${t('auth_or')}</span></div>
          <div class="auth-social-row">
            <button type="button" class="auth-social-btn auth-social-google" aria-label="Google" title="Google" onclick="socialAuthClick('Google')">${ICONS.google}</button>
            <button type="button" class="auth-social-btn auth-social-yandex" aria-label="Яндекс ID" title="Яндекс ID" onclick="socialAuthClick('Яндекс ID')">${ICONS.yandex}</button>
            <button type="button" class="auth-social-btn auth-social-telegram" aria-label="Telegram" title="Telegram" onclick="socialAuthClick('Telegram')">${ICONS.telegram}</button>
          </div>
        </div>
        <div class="auth-switch">
          ${isRegister
      ? `${t('auth_have_account')} <button onclick="setAuthMode('login')">${t('auth_to_login')}</button>`
      : `${t('auth_no_account')} <button onclick="setAuthMode('register')">${t('auth_to_register')}</button>`}
        </div>
        <p class="auth-legal"><span>${t('auth_legal')} <a href="#" onclick="openLegal('terms');return false;">${t('auth_legal_terms')}</a></span> <span>${t('auth_legal_and')} <a href="#" onclick="openLegal('privacy');return false;">${t('auth_legal_privacy')}</a>.</span></p>
      </div>
    </div>`;

  // Prefill email подставляем через DOM, а не интерполяцией в innerHTML:
  // в шаблон попадал бы пользовательский ввод из баннера (guest-email-input),
  // а регулярка email допускает кавычки — value="..." можно было бы «сломать».
  const prefillInput = document.getElementById('auth-email-input');
  if (prefillInput && authState.prefillEmail) prefillInput.value = authState.prefillEmail;
}

// Заголовок хиро с маркер-хайлайтом на ключевом слове (RU: "реально", EN: "actually") —
// текст руками, а не через t(), потому что подсветить нужно конкретное слово внутри фразы,
// а не всю строку целиком.
// УДАЛЕНО: heroParticlesMarkup() — "пылинки в луче света" для светлого hero.
// По прямому запросу заменено на настоящее звёздное небо (heroStarsMarkup
// ниже) с тёмным фоном — как в референсе, без компромиссной адаптации.

// Звёздное небо для тёмной темы (глобальный фон, см. .lp-bg-fx-night) —
// как на референсе: россыпь мерцающих точек. Позиции/тайминги захардкожены
// (не Math.random на каждый рендер), чтобы при переключении языка/темы
// звёзды не перескакивали на новые случайные места.
// Было 90 -> 160 -> теперь 260 (жалоба "чуть красивее, а то не очень") —
// плюс доля "крупных" звёзд увеличена с каждой 9-й до каждой 6-й, чтобы
// на глаз читалось заметно гуще и объёмнее, а не просто "ещё немного
// точек того же вида".
function heroStarsMarkup(count) {
  let out = '';
  const seeds = [7, 23, 41, 59, 83, 11, 37, 61, 79, 97, 13, 29, 47, 67, 89, 3, 19, 53, 71, 101];
  const n = count || 110;
  for (let i = 0; i < n; i++) {
    const s = seeds[i % seeds.length] * (i + 1) + i * 31;
    const left = (s * 13) % 1000 / 10;
    const top = (s * 7) % 1000 / 10;
    const big = i % 6 === 0;
    const sz = big ? 3 + (s % 2) : 1 + (s % 2);
    const dur = 2.2 + (s % 45) / 10;
    const delay = (s % 60) / 10;
    out += `<span class="star${big ? ' big' : ''}" style="left:${left}%;top:${top}%;width:${sz}px;height:${sz}px;animation-duration:${dur}s;animation-delay:${delay}s"></span>`;
  }
  return out;
}

// Редкие "падающие звёзды" для тёмного неба (см. .comet в CSS) — 3 штуки
// с разной длительностью цикла и стартовой позицией/задержкой, чтобы не
// пролетали синхронно и не мельтешили: каждая видна только в первые ~9%
// своего цикла, остальное время ждёт следующего прохода.
// Плюс 3 "дальних" (.comet.far) — та же идея, но короче путь, дольше
// цикл, тише след (см. .comet.far в CSS): по правилу перспективы дальний
// объект и медленнее, и меньше смещается на глаз, чем близкий — это и
// даёт ощущение неба с несколькими слоями глубины, а не одной плоскости
// летящих точек, по просьбе "кометы вдали летят".
function heroCometsMarkup() {
  const cfg = [
    { left: 18, top: 8, dur: 9, delay: 1 },
    { left: 62, top: 4, dur: 13, delay: 6 },
    { left: 82, top: 14, dur: 17, delay: 11 },
  ];
  const far = [
    { left: 8, top: 22, dur: 26, delay: 3 },
    { left: 46, top: 16, dur: 31, delay: 14 },
    { left: 88, top: 28, dur: 23, delay: 19 },
  ];
  const near = cfg.map(c => `<span class="comet" style="left:${c.left}%;top:${c.top}%;animation-duration:${c.dur}s;animation-delay:${c.delay}s"></span>`).join('');
  const farOut = far.map(c => `<span class="comet far" style="left:${c.left}%;top:${c.top}%;animation-duration:${c.dur}s;animation-delay:${c.delay}s"></span>`).join('');
  return near + farOut;
}

// Тонкие полосы облачной дымки для тёмного неба (см. .cloud в CSS) —
// очень медленно (85-140s) проплывают через весь экран слева направо,
// каждая на своей высоте/задержке. Сами почти не видны — читаются по
// тому, что звёзды под ними на секунду тускнеют и снова проступают,
// как настоящая лёгкая облачность ночью. Это и заменяет убранную луну
// как сигнал "я смотрю в небо с земли", без объекта-ориентира в кадре.
function heroNightCloudsMarkup() {
  const cfg = [
    { top: 12, vh: 14, dur: 92, delay: 0 },
    { top: 34, vh: 32, dur: 118, delay: 30 },
    { top: 6, vh: 7, dur: 140, delay: 60 },
  ];
  // top через custom-свойства, не инлайном (инлайн не переопределить из
  // @media): --nc-top-page — % от всей высоты лендинга (десктоп),
  // --nc-top-vh — доля экрана для мобильных (см. mobile-блок в styles.css;
  // без этого в тёмной теме на телефоне облака лежат на 12-34% длины
  // страницы — далеко за первым экраном, «облаков нет».
  return cfg.map(c => `<span class="cloud" style="--nc-top-page:${c.top}%;--nc-top-vh:${c.vh}vh;animation-duration:${c.dur}s;animation-delay:${c.delay}s"></span>`).join('');
}

// Плавающие тёплые "пылинки" для светлой темы — тот же принцип, что и
// звёзды, но одним фирменным тоном (не три разных цвета, как в убранных
// пятнах-жалобе "разноцветные, стрёмные"), и не мерцают на месте, а
// медленно поднимаются вверх и гаснут (см. .lp-bg-fx-day .mote в CSS).
function heroDayMotesMarkup() {
  let out = '';
  const seeds = [5, 17, 31, 43, 61, 73, 89, 101, 113, 127, 139, 151];
  for (let i = 0; i < 46; i++) {
    const s = seeds[i % seeds.length] * (i + 1) + i * 19;
    const left = (s * 11) % 1000 / 10;
    const sz = 2 + (s % 3);
    const dur = 14 + (s % 60) / 10;
    const delay = (s % 80) / 10;
    out += `<span class="mote" style="left:${left}%;width:${sz}px;height:${sz}px;animation-duration:${dur}s;animation-delay:${delay}s"></span>`;
  }
  return out;
}

// Тёплый "туман" для светлой темы (см. .mist в CSS) — 3 полосы на разной
// высоте/скорости. Тот же фикс с отрицательным delay, что и у облаков
// ниже (heroDayCloudsMarkup) — без него полосы тоже простаивали бы у
// левого края до истечения задержки.
function heroDayMistMarkup() {
  const cfg = [
    { top: 18, dur: 80,  frac: .1 },
    { top: 42, dur: 104, frac: .35 },
    { top: 8,  dur: 126, frac: .6 },
  ];
  return cfg.map(c => `<span class="mist" style="top:${c.top}%;animation-duration:${c.dur}s;animation-delay:${-(c.dur*c.frac).toFixed(1)}s"></span>`).join('');
}

// Кучевые облака для светлой темы (см. .lp-bg-fx-day .day-cloud в CSS) —
// раньше в дневном небе не было ничего объёмного, только пылинки (mote) и
// едва заметный туман (mist); жалоба была именно про отсутствие проработанных
// облаков. Сделаны по тому же принципу, что heroNightCloudsMarkup() выше —
// захардкоженные конфиги (не Math.random), чтобы при смене языка/темы
// (renderLanding перерисовывает всё) облака не перескакивали на новые
// случайные позиции/тайминги. --dc-scale масштабирует один и тот же
// градиентный "рецепт" облака (см. CSS) под разный размер/дальность.
// top задан в % от ВСЕЙ высоты .lp-bg-fx-day (= высота #landing, весь
// лендинг, не только хиро — см. комментарий у .lp-bg-fx в CSS), точно
// так же, как top у .mist выше.
//
// ПОЧЕМУ ОБЛАКА БЫЛИ ТОЛЬКО СЛЕВА: у каждого облака был ПОЛОЖИТЕЛЬНЫЙ
// animation-delay (0..175s) без animation-fill-mode. Без fill-mode браузер
// до истечения задержки показывает элемент в его обычном, НЕ анимированном
// состоянии — а не на кадре 0% — и поскольку явного left тут не задано,
// это "обычное" состояние съезжало к левому краю контейнера. При
// задержках до 175 секунд (некоторые дольше самой типичной сессии на
// сайте) все 10 облаков попросту простаивали слева и никогда не
// добирались до момента, когда должны были поехать направо.
// Фикс: ОТРИЦАТЕЛЬНЫЙ delay — анимация в этом случае не "ждёт", а сразу
// стартует с середины своего цикла (проигрывается так, будто уже идёт
// |delay| секунд) — облака с первого кадра оказываются равномерно
// раскиданы по всей ширине неба, а не пачкой слева.
function heroDayCloudsMarkup() {
  const cfg = [
    { top: 2,  vh: 5,  scale: .6,   dur: 140, frac: .02 },
    { top: 5,  vh: 10, scale: .9,   dur: 190, frac: .12 },
    { top: 9,  vh: 17, scale: .75,  dur: 165, frac: .22 },
    { top: 12, vh: 23, scale: 1.05, dur: 210, frac: .32 },
    { top: 4,  vh: 7,  scale: .5,   dur: 125, frac: .42 },
    { top: 15, vh: 28, scale: .8,   dur: 180, frac: .52 },
    { top: 18, vh: 33, scale: .95,  dur: 200, frac: .62 },
    { top: 21, vh: 39, scale: .65,  dur: 155, frac: .72 },
    { top: 24, vh: 45, scale: 1.1,  dur: 225, frac: .82 },
    { top: 7,  vh: 12, scale: .55,  dur: 135, frac: .92 },
  ];
  // top больше НЕ инлайном: инлайн-стиль нельзя переопределить из
  // @media. Вместо него две координаты — --dc-top-page (% от всей высоты
  // лендинга, как на десктопе) и --dc-top-vh (доля ЭКРАНА телефона —
  // на мобильном лендинг в разы выше вьюпорта, и % от страницы оставляли
  // облака глубоко за первым экраном, см. mobile-правила в styles.css).
  // --dc-x — статичная горизонтальная позиция (vw) для prefers-reduced-
  // motion: без анимации облака не должны толпиться у левого края.
  return cfg.map((c, i) => {
    const delay = -(c.dur * c.frac).toFixed(1);
    const cool = i % 2 === 1;
    const x = Math.round(8 + c.frac * 72);
    return `<span class="day-cloud${cool ? ' cool' : ''}" style="--dc-top-page:${c.top}%;--dc-top-vh:${c.vh}vh;--dc-x:${x};--dc-scale:${c.scale};animation-duration:${c.dur}s;animation-delay:${delay}s"></span>`;
  }).join('');
}

// Рыбы у дна (см. .lp-bg-fx-day .fish в CSS). ПЕРЕДЕЛАНО: раньше top задавался
// в % от ВСЕЙ высоты страницы (56-94%) — на разной ширине экрана (а значит и
// разной высоте страницы) рыбы оказывались то посреди секции "Как это
// устроено", то не у дна. Теперь они привязаны к ДНУ: bottom = высота футера
// (--foot-h, её выставляет syncSeaFloor) + N px. Значит рыбы всегда плавают
// в толще воды прямо над песчаным дном, что бы ни менялось выше по странице
// (жалоба "рыбы плывут внизу, а там песок").
// Захардкоженные конфиги + отрицательный delay (не Math.random) — раскладка
// не прыгает при перерисовке, рыбы с первого кадра раскиданы по ширине.
// Форма рыбы: овальное тело, вильчатый хвост, спинной/грудной плавники, блик
// и глаз; спрайт по умолчанию смотрит ВЛЕВО (lpFishSwim разворачивает
// scaleX(-1), lpFishSwimRev — нет; подробности в CSS).
function heroFishMarkup() {
  // Цвета подобраны под тёмную бирюзовую воду у дна: тёмно-синий/тёмно-
  // бирюзовый, который был раньше, на ней просто растворялся.
  const colors = ['#F4D06F', '#F08A5D', '#8FE3DA', '#EDEFEA', '#FF9F6E'];
  const cfg = [
    { b: 130,  scale: .95, dur: 38, frac: .05, rev: false, c: 0 },
    { b: 175,  scale: .6,  dur: 27, frac: .55, rev: true,  c: 3 },
    { b: 240,  scale: 1.2, dur: 46, frac: .35, rev: true,  c: 1 },
    { b: 310,  scale: .5,  dur: 23, frac: .72, rev: false, c: 2 },
    { b: 380,  scale: .85, dur: 34, frac: .15, rev: true,  c: 4 },
    { b: 470,  scale: .7,  dur: 30, frac: .62, rev: false, c: 0 },
    { b: 560,  scale: 1.05,dur: 41, frac: .9,  rev: true,  c: 2 },
    { b: 650,  scale: .6,  dur: 26, frac: .3,  rev: false, c: 3 },
    { b: 760,  scale: 1.0, dur: 40, frac: .18, rev: true,  c: 1 },
    { b: 860,  scale: .55, dur: 24, frac: .5,  rev: false, c: 4 },
    { b: 960,  scale: .7,  dur: 29, frac: .82, rev: true,  c: 0 },
    { b: 1080, scale: .45, dur: 21, frac: .4,  rev: false, c: 2 },
    { b: 1200, scale: .8,  dur: 36, frac: .08, rev: false, c: 3 },
  ];
  // Стайки мелких рыбок: несколько спрайтов с одним dur и чуть разными
  // delay/b — плывут вместе, как настоящая стая, а не разрозненные точки.
  const schools = [
    { b: 300, dur: 44, frac: .25, rev: false, c: 2, n: 6 },
    { b: 700, dur: 52, frac: .7,  rev: true,  c: 0, n: 7 },
    { b: 1000, dur: 48, frac: .1, rev: false, c: 3, n: 5 },
  ];
  schools.forEach(sc => {
    for (let i = 0; i < sc.n; i++) {
      cfg.push({
        b: sc.b + ((i * 37) % 60) - 30,
        scale: .32 + (i % 3) * .05,
        dur: sc.dur,
        frac: sc.frac + i * 0.012,
        rev: sc.rev, c: sc.c,
      });
    }
  });
  const FISH_SVG = `<svg viewBox="0 0 64 32" xmlns="http://www.w3.org/2000/svg">
    <path fill="currentColor" opacity=".95" d="M6 16C6 9 15 5 27 5C37 5 43 10 43 16C43 22 37 27 27 27C15 27 6 23 6 16Z"/>
    <path fill="currentColor" opacity=".8" d="M41 12L62 3L50 16L62 29L41 20Z"/>
    <path fill="currentColor" opacity=".55" d="M19 7L24 1L29 8Z"/>
    <path fill="currentColor" opacity=".55" d="M16 21L11 28L22 23Z"/>
    <ellipse cx="21" cy="10" rx="9" ry="3" fill="#fff" opacity=".22"/>
    <path fill="#fff" opacity=".12" d="M27 8C30 12 30 20 27 24C25 20 25 12 27 8Z"/>
    <circle cx="12" cy="13" r="2.2" fill="#fff" opacity=".95"/>
    <circle cx="12.5" cy="13" r=".9" fill="#16242a"/>
  </svg>`;
  // Ширина/высота заданы напрямую (не через transform:scale) — animation-name
  // анимирует transform, инлайновый transform был бы тут же перезаписан.
  return cfg.map(c => {
    const delay = -(c.dur * c.frac).toFixed(1);
    const anim = c.rev ? 'lpFishSwimRev' : 'lpFishSwim';
    const w = Math.round(38 * c.scale), h = Math.round(19 * c.scale);
    const color = colors[c.c];
    return `<span class="fish" style="bottom:calc(var(--foot-h, 340px) + ${Math.round(c.b)}px);width:${w}px;height:${h}px;color:${color};animation-name:${anim};animation-duration:${c.dur}s;animation-delay:${delay}s">${FISH_SVG}</span>`;
  }).join('');
}

// Пузырьки у дна — тот же приём (bottom от футера, отрицательный delay).
// Часть поднимается от "растений" (см. seaFloorMarkup), часть — из толщи.
function heroSeaBubblesMarkup() {
  const cfg = [
    { b: 60,  left: 7,  sz: 7,  dur: 9,   frac: .10 },
    { b: 70,  left: 21, sz: 5,  dur: 7,   frac: .40 },
    { b: 90,  left: 34, sz: 10, dur: 11,  frac: .65 },
    { b: 65,  left: 52, sz: 6,  dur: 8,   frac: .20 },
    { b: 100, left: 66, sz: 9,  dur: 10,  frac: .85 },
    { b: 80,  left: 14, sz: 5,  dur: 7.5, frac: .50 },
    { b: 75,  left: 79, sz: 8,  dur: 9.5, frac: .05 },
    { b: 110, left: 44, sz: 6,  dur: 8.5, frac: .30 },
    { b: 70,  left: 91, sz: 11, dur: 12,  frac: .70 },
    { b: 130, left: 27, sz: 6,  dur: 8,   frac: .55 },
    { b: 240, left: 60, sz: 9,  dur: 10.5,frac: .15 },
    { b: 320, left: 4,  sz: 5,  dur: 7,   frac: .90 },
    { b: 420, left: 88, sz: 6,  dur: 8,   frac: .35 },
    { b: 520, left: 38, sz: 12, dur: 13,  frac: .60 },
    { b: 620, left: 72, sz: 7,  dur: 9,   frac: .25 },
    { b: 760, left: 18, sz: 8,  dur: 10,  frac: .78 },
  ];
  return cfg.map(c => {
    const delay = -(c.dur * c.frac).toFixed(1);
    return `<span class="bubble" style="bottom:calc(var(--foot-h, 340px) + ${c.b}px);left:${c.left}%;width:${c.sz}px;height:${c.sz}px;animation-duration:${c.dur}s;animation-delay:${delay}s"></span>`;
  }).join('');
}

// Морское дно над футером (только светлая тема — в тёмной .sea-floor скрыт
// CSS): две дюны песка (дальняя темнее и с более неровным гребнем, ближняя
// сливается по цвету с фоном футера — шва нет), между ними качающиеся
// водоросли (корни спрятаны за ближней дюной, поэтому ничего "висит"), на
// гребне — ракушки/морская звезда/камешки. Всё inline-SVG, без картинок.
function seaFloorMarkup() {
  const kelp = (h, c1, c2) => `<svg viewBox="0 0 40 120" preserveAspectRatio="none" style="height:${h}px">
    <path d="M20 120C9 98 31 84 18 62C8 44 28 30 20 4" stroke="${c1}" stroke-width="5.2" fill="none" stroke-linecap="round"/>
    <path d="M11 120C3 102 17 92 9 74" stroke="${c2}" stroke-width="4" fill="none" stroke-linecap="round"/>
    <path d="M29 120C37 100 23 88 31 66" stroke="${c2}" stroke-width="4" fill="none" stroke-linecap="round"/>
  </svg>`;
  const plants = [
    { left: 6,  h: 96,  d: 5.2, c1: '#2E8B6A', c2: '#48A57F' },
    { left: 13, h: 70,  d: 4.4, c1: '#3A9A74', c2: '#5DB58C' },
    { left: 31, h: 110, d: 6.0, c1: '#287A5F', c2: '#3F9A76' },
    { left: 47, h: 64,  d: 4.8, c1: '#3F9F78', c2: '#63BA90' },
    { left: 62, h: 100, d: 5.6, c1: '#2E8B6A', c2: '#48A57F' },
    { left: 78, h: 76,  d: 4.6, c1: '#3A9A74', c2: '#5DB58C' },
    { left: 90, h: 104, d: 5.9, c1: '#287A5F', c2: '#3F9A76' },
  ].map((k, i) => `<span class="kelp" style="left:${k.left}%;animation-duration:${k.d}s;animation-delay:${-(i * 0.9).toFixed(1)}s">${kelp(k.h, k.c1, k.c2)}</span>`).join('');
  const shell = `<svg viewBox="0 0 24 20"><path d="M2 17C2 8 8 2 12 2C16 2 22 8 22 17Z" fill="#F3E4C6"/><path d="M12 2V17M7 5L8 17M17 5L16 17" stroke="#CDB58A" stroke-width="1.1" fill="none"/></svg>`;
  const star = `<svg viewBox="0 0 24 24"><path d="M12 2L14.6 9L22 9.3L16.2 13.9L18.3 21L12 17L5.7 21L7.8 13.9L2 9.3L9.4 9Z" fill="#F08A5D"/><circle cx="12" cy="12" r="1.3" fill="#F7B48F"/></svg>`;
  const pebble = `<svg viewBox="0 0 20 12"><ellipse cx="10" cy="7" rx="9" ry="5" fill="#B9A577"/><ellipse cx="8" cy="5" rx="4" ry="2" fill="#D3C193" opacity=".7"/></svg>`;
  const deco = `
    <span class="sf-item" style="left:11%;width:22px;bottom:26px">${shell}</span>
    <span class="sf-item" style="left:24%;width:15px;bottom:24px">${pebble}</span>
    <span class="sf-item" style="left:38%;width:26px;bottom:24px">${star}</span>
    <span class="sf-item" style="left:54%;width:18px;bottom:27px">${shell}</span>
    <span class="sf-item" style="left:69%;width:16px;bottom:25px">${pebble}</span>
    <span class="sf-item" style="left:84%;width:22px;bottom:26px">${star}</span>`;
  return `<div class="sea-floor" aria-hidden="true">
    <svg class="sea-dunes back" viewBox="0 0 1440 120" preserveAspectRatio="none"><path d="M0 60C120 34 260 30 420 48C560 64 660 74 820 56C960 40 1100 30 1260 44C1350 52 1400 56 1440 50L1440 120L0 120Z"/></svg>
    ${plants}
    <svg class="sea-dunes front" viewBox="0 0 1440 120" preserveAspectRatio="none"><path d="M0 88C160 82 300 94 480 90C640 86 760 80 940 86C1100 92 1260 84 1440 88L1440 120L0 120Z"/></svg>
    ${deco}
  </div>`;
}

// Композиция ночного неба (туманность + звёзды + облака + кометы +
// свечение горизонта) — вынесена в отдельную функцию, чтобы не дублировать
// один и тот же набор span'ов в двух местах: внутри лендинга (см.
// renderLanding, .lp-bg-fx-night) и в глобальном фоне на весь сайт (см.
// #appBgNight в index.html, initAppBgNight ниже).
// topDense: добавляет плотный слой звёзд именно в первый экран. Звёзды в
// heroStarsMarkup раскиданы по ВСЕЙ высоте страницы (%), а лендинг высокий
// (~6000px) — в первом экране оказывалась лишь пара десятков точек, поэтому
// "с самого начала" небо выглядело пустым (жалоба "добавь звёзд, красивее").
// Здесь top в диапазоне 0-13% высоты страницы (= первые ~800px).
function heroStarsTopMarkup(n) {
  let out = '';
  const seeds = [9, 27, 43, 61, 79, 97, 17, 33, 51, 73, 89, 5, 23, 41, 67];
  const topN = n || 70;
  for (let i = 0; i < topN; i++) {
    const s = seeds[i % seeds.length] * (i + 3) + i * 29;
    const left = (s * 17) % 1000 / 10;
    const top = (s * 5) % 130 / 10;
    const big = i % 7 === 0;
    const sz = big ? 3 + (s % 2) : 1 + (s % 2);
    const dur = 2.6 + (s % 40) / 10;
    const delay = (s % 50) / 10;
    out += `<span class="star${big ? ' big' : ''}" style="left:${left}%;top:${top}%;width:${sz}px;height:${sz}px;animation-duration:${dur}s;animation-delay:${delay}s"></span>`;
  }
  return out;
}

function nightSkyMarkup(starCount, topDense) {
  return `<span class="nebula"></span>${heroStarsMarkup(starCount)}${topDense ? heroStarsTopMarkup(70) : ''}${heroNightCloudsMarkup()}${heroCometsMarkup()}<span class="horizon-glow"></span>`;
}

// Заполняет глобальный фон #appBg (онбординг/приложение; НЕ лендинг — у него свой .lp-bg-fx). Один
// раз при загрузке — сам слой показывается/прячется чисто через CSS
// (data-theme), тут только контент.
function initAppBgNight() {
  const el = document.getElementById('appBg');
  if (!el) return;
  el.innerHTML = `
    <div class="lp-bg-fx-day app-day" style="--p:1">${appBgCloudsMarkup()}</div>
    <div class="lp-bg-fx-night">${nightSkyMarkup(60, true)}</div>`;
}

/* Облака для фона ПРИЛОЖЕНИЯ (онбординг/основной экран) — то же небо
   и те же облака, что на первом экране лендинга, чуть реже. */
function appBgCloudsMarkup() {
  const cfg = [
    { vh: 2,  scale: .5,  dur: 260, frac: .10 },
    { vh: 10, scale: .38, dur: 300, frac: .40 },
    { vh: 24, scale: .55, dur: 240, frac: .62 },
    { vh: 42, scale: .42, dur: 280, frac: .25 },
    { vh: 60, scale: .5,  dur: 320, frac: .75 },
    { vh: 78, scale: .36, dur: 260, frac: .45 },
    { vh: 92, scale: .46, dur: 300, frac: .20 },
  ];
  return cfg.map((c, i) => {
    const delay = -(c.dur * c.frac).toFixed(1);
    const cool = i % 2 === 1;
    const x = Math.round(6 + c.frac * 70);
    return `<span class="day-cloud${cool ? ' cool' : ''}" style="--dc-top-page:${c.vh}vh;--dc-top-vh:${c.vh}vh;--dc-x:${x};--dc-scale:${c.scale};animation-duration:${c.dur}s;animation-delay:${delay}s"></span>`;
  }).join('');
}

function heroTitleMarkup() {
  // Было: жёлто-зелёный "маркер-хайлайтер" с рваной SVG-формой под словом —
  // самый узнаваемый AI-паттерн лендингов. Заменил на типографику: слово
  // просто набрано курсивом самого дисплейного шрифта и акцентным цветом,
  // без декоративной подложки. Разница в весе/наклоне достаточно заметна
  // сама по себе — не нужен цветной штрих позади текста.
  // Разбивка на строки задана явно (как на скрине-референсе: ровно 2 строки),
  // а не «как получится» при переносе по ширине колонки — раньше на десктопе
  // заголовок уезжал в 3 строки с коротким хвостиком.
  const mk = (word) => `<em class="mk">${word}</em>`;
  /* Пробел между двумя .hl-строками: на десктопе display:block делает
     перенос строки на границе span'а, пробел не мешает (схлопывается);
     на мобильных (≤760px, где .hl становится inline) этот пробел
     гарантирует, что последняя строка не склеивается с первой при
     естественном переносе по ширине. */
  const hl = (line) => `<span class="hl">${line}</span>`;
  if (state.lang === 'ru') {
    return `${hl(`Найди университет, который`)} ${hl(`${mk('реально')} тебе\u00A0подходит.`)}`;
  }
  return `${hl('Find a university that')} ${hl(`${mk('actually')} fits\u00A0you.`)}`;
}

// Заголовок пейн-секции с контрастом размера: первая часть фразы — мельче
// и приглушённее, вторая (акцентная) — крупным жирным курсивом дисплейного
// шрифта в брендовом зелёном. Как и heroTitleMarkup() — текст руками, а не
// через t(), потому что разбивка на две строки у RU/EN своя, да и вторая
// часть чуть сокращена ("на самом деле" убрано) ради ритма.
function painTitleMarkup() {
  if (state.lang === 'ru') {
    return `<span class="lp-pain-title-lead">Никто не готовит тебя к тому,</span><span class="lp-pain-title-big">насколько это стрессово.</span>`;
  }
  return `<span class="lp-pain-title-lead">Nobody prepares you for</span><span class="lp-pain-title-big">how stressful this actually is.</span>`;
}

function renderLanding() {
  const L = document.getElementById('landing');
  L.innerHTML = `
    <div class="lp-bg-fx" aria-hidden="true">
      <div class="lp-bg-fx-day">${heroDayMotesMarkup()}${heroDayMistMarkup()}${heroDayCloudsMarkup()}${heroFishMarkup()}${heroSeaBubblesMarkup()}<span class="sea-glint"></span>${seaFloorMarkup()}</div>
      <div class="lp-bg-fx-night">${nightSkyMarkup(110, true)}</div>
      <div class="lp-bg-fx-fade"></div>
    </div>
    <header class="hd" id="lp-header">
      <div class="hd-inner">
        <a href="#" class="hd-logo" onclick="window.scrollTo({top:0,behavior:'smooth'});return false;" aria-label="Admitly">
          <span class="hd-mark">${ICONS.logo}</span><span class="hd-word">Admitly</span>
        </a>
        <nav class="hd-links" aria-label="${state.lang === 'en' ? 'Main' : 'Основное меню'}">
          ${lpHeaderLinks().map(l => `<a href="#${l.id}" data-sec="${l.id}" onclick="lpScrollTo('${l.id}');return false;">${l.label}</a>`).join('')}
        </nav>
        <div class="hd-right">
          <div class="hd-lang" role="group" aria-label="${state.lang === 'en' ? 'Language' : 'Язык'}">
            <button class="${state.lang === 'ru' ? 'on' : ''}" onclick="setLandingLang('ru')">RU</button><button class="${state.lang === 'en' ? 'on' : ''}" onclick="setLandingLang('en')">EN</button>
          </div>
          ${themeSwitcher('hd-theme')}
          <span class="hd-sep" aria-hidden="true"></span>
          <button class="hd-login" onclick="showLoginScreen('login')">${t('nav_login')}</button>
          <button class="hd-cta" onclick="enterOnboarding()"><span class="full">${t('nav_cta')}</span><span class="short">${state.lang === 'en' ? 'Start' : 'Начать'}</span><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12L12 4M5.5 4H12v6.5"/></svg></button>
          <button class="hd-burger" id="lp-menu-btn" onclick="toggleLpMenu()" aria-expanded="false" aria-controls="lp-nav-secondary" aria-label="${state.lang === 'en' ? 'Menu' : 'Меню'}"><span></span><span></span></button>
        </div>
      </div>
      <div class="hd-sheet" id="lp-nav-secondary">
        <nav class="hd-sheet-links">
          ${lpHeaderLinks().map(l => `<a href="#${l.id}" onclick="toggleLpMenu(false);lpScrollTo('${l.id}');return false;">${l.label}<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M6 3l5 5-5 5"/></svg></a>`).join('')}
        </nav>
        <div class="hd-sheet-row">
          <span>${state.lang === 'en' ? 'Language' : 'Язык'}</span>
          <div class="hd-lang"><button class="${state.lang === 'ru' ? 'on' : ''}" onclick="setLandingLang('ru')">RU</button><button class="${state.lang === 'en' ? 'on' : ''}" onclick="setLandingLang('en')">EN</button></div>
        </div>
        <div class="hd-sheet-row">
          <span>${state.lang === 'en' ? 'Theme' : 'Тема'}</span>
          ${themeSwitcher('hd-theme')}
        </div>
        <button class="hd-sheet-login" onclick="toggleLpMenu(false);showLoginScreen('login')">${t('nav_login')}</button>
      </div>
    </header>

    <section class="lp-hero">
      <div class="lp-container lp-hero-grid">
        <h1 class="lp-hero-title lp-enter lp-enter-1">${heroTitleMarkup()}</h1>
        <p class="lp-hero-quote lp-enter lp-enter-2">${t('hero_quote')}</p>
        <p class="lp-hero-sub lp-enter lp-enter-2">${t('hero_sub').split(/(?<=\.)\s+/).map(x => `<span>${x}</span>`).join(' ')}</p>
        <div class="lp-hero-stats-line lp-enter lp-enter-3">
          <div class="lp-hero-stat"><div class="v">${t('hero_stat1_v')}</div><div class="l">${t('hero_stat1_l')}</div></div>
          <div class="lp-hero-stat"><div class="v">${t('hero_stat2_v')}</div><div class="l">${t('hero_stat2_l')}</div></div>
          <div class="lp-hero-stat"><div class="v">${t('hero_stat3_v')}</div><div class="l">${t('hero_stat3_l')}</div></div>
        </div>
        <div class="lp-hero-ctas lp-enter lp-enter-4">
          <button class="lp-btn lp-btn-primary lp-hero-cta" onclick="enterOnboarding()">
            <span>${t('hero_cta_primary')}</span>
            <svg class="lp-cta-arrow" viewBox="0 0 16 16" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4"/></svg>
          </button>
        </div>
        <div class="lp-hero-visual lp-phone-stage">
          <div class="lp-phone">
            <span class="lp-phone-btn p1" aria-hidden="true"></span>
            <span class="lp-phone-btn p2" aria-hidden="true"></span>
            <div class="lp-phone-screen">
              <div class="lp-statusbar">
                <span class="lp-sb-time">9:41</span>
                <span class="lp-sb-icons">
                  <svg class="lp-sb-ic" viewBox="0 0 18 12" fill="currentColor" aria-hidden="true"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5.5" width="3" height="6.5" rx="1"/><rect x="10" y="3" width="3" height="9" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></svg>
                  <svg class="lp-sb-ic" viewBox="0 0 16 12" fill="currentColor" aria-hidden="true"><path d="M8 10.8a1.15 1.15 0 1 0 0-2.3 1.15 1.15 0 0 0 0 2.3Z"/><path d="M3.18 6.32a6.9 6.9 0 0 1 9.64 0l-1.13 1.13a5.3 5.3 0 0 0-7.38 0L3.18 6.32Z"/><path d="M.4 3.55a10.8 10.8 0 0 1 15.2 0l-1.13 1.13a9.2 9.2 0 0 0-12.94 0L.4 3.55Z"/></svg>
                  <span class="lp-sb-batt"><i></i></span>
                </span>
              </div>
              <div class="lp-screen-topbar">
                <div class="lp-screen-brand"><span class="dot"></span>Admitly</div>
                <div class="lp-screen-avatar"></div>
              </div>
              <div class="lp-swipe-card">
                <div class="lp-swipe-photo">${uniVisual(UNIVERSITIES.find(x => x.id === 25) || { id: 25, setting: 'Suburban', climate: 'Warm' })}<span class="tag">Stanford, CA</span></div>
                <h4 class="lp-swipe-name">Stanford University</h4>
                <p class="lp-swipe-loc">Stanford, CA, USA</p>
                <div class="lp-swipe-scores">
                  <div class="lp-swipe-score match"><span class="n num">94%</span><span class="l">${state.lang === 'ru' ? 'Совпадение' : 'Match'}</span></div>
                  <div class="lp-swipe-score reality"><span class="n num">${chanceLabel('Reach')}</span><span class="l">${state.lang === 'ru' ? 'Шанс' : 'Chance'}</span></div>
                </div>
                <div class="lp-swipe-actions">
                  <span class="dislike" aria-hidden="true">${ICONS.x}</span>
                  <span class="info" aria-hidden="true">${ICONS.info}</span>
                  <span class="like" aria-hidden="true">${ICONS.heart}</span>
                </div>
              </div>
              <div class="lp-home-indicator"></div>
            </div>
            <div class="lp-island"></div>
          </div>
        </div>
      </div>
    </section>

    <section class="lp-marquee-section" id="lp-marquee">
      <div class="lp-container">
        <p class="lp-eyebrow lp-marquee-eyebrow">${t('marquee_eyebrow')}</p>
      </div>
      <div class="lp-marquee-stage" id="lpMarqueeStage">
        <div class="lp-marquee-row" id="lpMarqueeRow1">
          ${(() => { const r = landingMarqueeSchools().row1; return [...r, ...r, ...r].map(marqueeTile).join(''); })()}
        </div>
        <div class="lp-marquee-row" id="lpMarqueeRow2">
          ${(() => { const r = landingMarqueeSchools().row2; return [...r, ...r, ...r].map(marqueeTile).join(''); })()}
        </div>
      </div>
    </section>

    <section class="lp-section tight">
      <div class="lp-container">
        <div class="lp-section-head">
          <h2 class="lp-section-title lp-pain-title">${painTitleMarkup()}</h2>
          <p class="lp-section-body">${t('pain_body')}</p>
        </div>
        <div class="lp-pain-list">
          <div class="lp-pain-item reveal" style="transition-delay:.05s"><span class="n">01</span><div><p class="q"><span class="type">${t('pain1_title')}</span></p><p class="a">${t('pain1_body')}</p></div></div>
          <div class="lp-pain-item reveal" style="transition-delay:.18s"><span class="n">02</span><div><p class="q"><span class="type">${t('pain2_title')}</span></p><p class="a">${t('pain2_body')}</p></div></div>
          <div class="lp-pain-item reveal" style="transition-delay:.31s"><span class="n">03</span><div><p class="q"><span class="type">${t('pain3_title')}</span></p><p class="a">${t('pain3_body')}</p></div></div>
        </div>
      </div>
    </section>

    <!-- ============================================================
         DAWN — текстовая секция сразу после pain: своего фона больше НЕ
         имеет (раньше был отдельный локальный слой .lp-dawn-sky-night/day
         с собственным градиентом — на стыке с глобальным .lp-bg-fx-night
         это давало заметный шов/полосу, жалоба "цвета не вливаются").
         Солнце и небо теперь часть ЕДИНОГО глобального фона на весь сайт
         (.lp-bg-fx-day .sun, см. renderLanding выше и initLpDayArcScroll
         в app.js) — ровно тот же принцип, что и у звёзд в тёмной теме:
         один сквозной слой позади всего контента, без швов между
         секциями. Прогресс дня теперь считается от самого верха страницы
         (хиро, "Найди университет...") до конца этой секции — солнце
         встаёт сразу, как только видно хиро, и садится к концу этого
         текста, а не только в границах этой секции. Текст — обычная
         посимвольная подсветка, цвет фиксированный (не завязан на
         локальный прогресс секции — фон общий, страничный). -->
    <section class="lp-dawn" id="lpDawn">
      <div class="lp-container lp-dawn-inner">
        <p class="lp-dawn-eyebrow">${t('dawn_eyebrow')}</p>
        <p class="lp-dawn-text">${t('dawn_body')}</p>
      </div>
    </section>

    <section class="lp-section" id="lp-how">
      <div class="lp-container">
        <div class="lp-section-head center">
          <h2 class="lp-section-title lp-soft">${t('how_title')}</h2>
          <p class="lp-section-body lp-soft" style="transition-delay:.2s">${t('how_sub')}</p>
        </div>
      </div>
      <div class="lp-feature-stage-outer" id="lpFeatureStageOuter">
        <div class="lp-feature-stage">
          ${landingFeatureCards().map((f, i) => `
            <div class="lp-feature-card" data-i="${i}">
              <div class="lp-feature-mock">${f.mock}</div>
              <div class="lp-feature-text"><span class="lp-feature-step"><i>${String(i + 1).padStart(2, '0')}</i><b>${f.step}</b></span><h3>${f.title}</h3><p>${f.body}</p></div>
            </div>`).join('')} 
        </div>
      </div>
    </section>

    <section class="lp-cta-section">
      <div class="lp-container">
        <div class="lp-cta-box reveal">
          <h2>${t('cta_title')}</h2>
          <p>${t('cta_sub')}</p>
          <button class="lp-btn lp-btn-primary lp-btn-lg" onclick="enterOnboarding()">${t('cta_button')}</button>
        </div>
      </div>
    </section>

    <footer class="lp-footer">
      <div class="lp-container">
        <div class="lp-footer-top">
          <div class="lp-footer-brand">
            <a href="#" class="lp-logo" onclick="return false;"><span class="mark">${ICONS.logo}</span><span class="text">Admitly</span></a>
            <p>${t('footer_tagline')}</p>
          </div>
          <div class="lp-footer-col">
            <h5>${t('footer_product')}</h5>
            <a href="#lp-how" onclick="lpScrollTo('lp-how');return false;">${t('footer_how')}</a>
          </div>
          <div class="lp-footer-col">
            <h5>${t('footer_legal')}</h5>
            <a href="#" onclick="openLegal('privacy');return false;">${state.lang === 'ru' ? 'Конфиден\u00ADциальность' : t('footer_privacy')}</a>
            <a href="#" onclick="openLegal('terms');return false;">${t('footer_terms')}</a>
          </div>
          <div class="lp-footer-col">
            <h5>${t('footer_contact_title')}</h5>
            <p class="lp-footer-contact-note">${t('footer_contact')}</p>
            <a href="mailto:vanya.medvedev.11.00@mail.ru">${'vanya.medvedev.11.00@mail.ru'.replace(/@/g, '<wbr>@').replace(/\./g, '.<wbr>')}</a>
          </div>
        </div>
        <div class="lp-footer-bottom">
          <span>© 2026 Admitly. ${t('footer_rights')}</span>
          <span class="lp-badge-live"><i></i>${state.lang === 'ru' ? 'Демо-версия · собирается в открытую' : 'Demo build · building in public'}</span>
        </div>
      </div>
    </footer>

    <div class="lp-mobile-cta-bar" id="lpMobileCtaBar" aria-hidden="true">
      <button class="lp-btn lp-btn-primary" onclick="enterOnboarding()">${t('cta_button')}</button>
    </div>
  `;
  initScrollReveal();
  initLpSoftReveal();
  initLpPainTypewriter();
  initLpFeatureStack();
  initLpMarqueeScroll();
  initCmpAnimation();
  initLpAnimText();
  initLpDayArcScroll();
  initSeaFloorSync();
  initLpCountUp();
  lpHeaderSync();
  initLpMobileCtaBar();
  bindLpFeatureResizeOnce();
}

/* ============================================================
   «Count-up» — hero-статистика (12,000+ вузов, 100+ стран, 4 минуты) →
   числа плавно «поднимаются» с fade-in при попадании в viewport.
   IntersectionObserver → ставит класс .lp-count-anim; сам счётчик
   (0→target) уже работает через animateScoreCounters (data-target),
   этот класс только добавляет входную анимацию CSS (не блокирует scroll).
   NOT AI-slop: честный счётчик с физически корректным easing. */
function initLpCountUp() {
  // На тач-устройствах счётчики не раскручиваем — на мобильном hero должен
  // быть спокойнее/быстрее, а не «догоняющим» числом. См. ревью по
  // мобильной адаптации.
  if (window.matchMedia('(pointer: coarse)').matches) return;
  const nodes = document.querySelectorAll('.lp-count');
  if (!nodes.length) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('lp-count-anim');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.3 });
  nodes.forEach(n => io.observe(n));
}

/* Секция «Как это работает» — слайды 01–04 (pinned-стек),
   см. renderLanding и landingFeatureCards. */

/* Четыре карточки фич из #lp-how, переиспользующие реальные компоненты
   продукта (tracker-card/roadmap/dna-card/match-list-row) со статичными
   демо-данными — те же классы, что видит пользователь внутри самого
   приложения, поэтому "витрина" на лендинге не расходится с реальным UI.
   Данные в мокапах — настоящие цифры из каталога (приём, SAT, GPA,
   стоимость, дедлайны), чтобы демо выглядело как живой экран, а не
   абстрактная заглушка. Через все карточки идёт один и тот же Cornell. */
function landingFeatureCards() {
  const ru = state.lang === 'ru';

  /* ---------- 04 · Заявки: трекер Cornell (ED) ---------- */
  const tracker = `
    <div class="tracker-card">
      <div class="tracker-card-head">
        <div class="match-thumb uni-visual-host">${uniVisual(UNIVERSITIES.find(x => x.id === 28))}</div>
        <div class="match-info"><h4>Cornell University</h4><div class="loc">Ithaca, NY · Ivy League</div></div>
        <span class="badge badge-Target">Target</span>
      </div>
      <div class="tracker-deadline urgency-soon">
        <span class="tracker-deadline-type">ED</span>
        <span>${ru ? '1 ноября' : 'Nov 1'}</span>
        <span class="tracker-deadline-days">${t('days_left', 12)}</span>
      </div>
      <div class="tracker-deadline lp-tracker-deadline-2">
        <span class="tracker-deadline-type">RD</span>
        <span>${ru ? '2 января' : 'Jan 2'}</span>
        <span class="tracker-deadline-days">${ru ? 'запасной вариант' : 'backup plan'}</span>
      </div>
      <div class="tracker-status-pills">
        <span class="tracker-status-pill">${t('status_not_started')}</span>
        <span class="tracker-status-pill active">${t('status_in_progress')}</span>
        <span class="tracker-status-pill">${t('status_submitted')}</span>
        <span class="tracker-status-pill">${t('status_decision')}</span>
      </div>
      <div class="tracker-checklist">
        <span class="checklist-item done"><span class="checklist-box">${ICONS.check}</span>${t('doc_tests')} · 1540</span>
        <span class="checklist-item done"><span class="checklist-box">${ICONS.check}</span>${t('doc_recs')} · ${ru ? '2 из 2' : '2 of 2'}</span>
        <span class="checklist-item"><span class="checklist-box"></span>${t('doc_essay')} · ${ru ? 'черновик' : 'draft'}</span>
        <span class="checklist-item"><span class="checklist-box"></span>${t('doc_transcript')}</span>
        <span class="checklist-item"><span class="checklist-box"></span>${ru ? 'Финансовые документы' : 'Financial docs'} (CSS Profile)</span>
      </div>
      <div class="roadmap-timeline">
        <div class="roadmap-milestone done"><span class="roadmap-dot">${ICONS.check}</span><div class="roadmap-milestone-label">${t('doc_tests')}</div></div>
        <div class="roadmap-milestone done"><span class="roadmap-dot">${ICONS.check}</span><div class="roadmap-milestone-label">${t('doc_recs')}</div></div>
        <div class="roadmap-milestone"><span class="roadmap-dot"></span><div class="roadmap-milestone-label">${t('doc_essay')}</div></div>
        <div class="roadmap-milestone"><span class="roadmap-dot"></span><div class="roadmap-milestone-label">${ru ? 'Подача' : 'Submit'}</div></div>
      </div>
    </div>`;

  /* ---------- 02 · ДНК-профиль: радар по лайкам ---------- */
  const dnaDemo = { cs: 82, coastal: 74, research: 68, urban: 63, costSensitive: 55, warm: 47 };
  const dnaAxes = DNA_AXIS_SETS.cs;
  const dna = `
    <div class="dna-card">
      <h4 style="font-family:var(--font-display);margin:0 0 12px;">${ru ? 'ДНК профиля · пересобран по 23 лайкам' : 'Profile DNA · rebuilt from 23 likes'}</h4>
      ${renderRadar(dnaDemo).replace('<svg', '<div class="lp-radar-shrink"><svg').replace('</svg>', '</svg></div>')}
      <div class="dna-legend">
        ${dnaAxes.map(a => `<span class="item">${(ru ? a.label_ru : a.label)}: ${dnaDemo[a.k]}%</span>`).join('')}
      </div>
    </div>`;

  /* ---------- 01 · Свайп: карточка Cornell с настоящими цифрами ---------- */
  const swipe = `
    <div style="display:flex;justify-content:center;">
      <div class="lp-swipe-card" style="width:270px;">
        <div class="lp-swipe-photo">${uniVisual(UNIVERSITIES.find(x => x.id === 28) || { id: 28, setting: 'Suburban', climate: 'Cold' })}<span class="tag">🇺🇸 USA</span></div>
        <h4 class="lp-swipe-name">Cornell University</h4>
        <p class="lp-swipe-loc">Ithaca, NY · Ivy League · ${ru ? 'частный' : 'private'}</p>
        <div class="lp-swipe-stats">
          <div class="lp-swipe-stat"><span class="v num">9%</span><span class="l">${ru ? 'приём' : 'acceptance'}</span></div>
          <div class="lp-swipe-stat"><span class="v num">1500–1570</span><span class="l">SAT</span></div>
          <div class="lp-swipe-stat"><span class="v num">3.7–4.0</span><span class="l">GPA</span></div>
          <div class="lp-swipe-stat"><span class="v num">$93K</span><span class="l">${ru ? 'в год' : 'per year'}</span></div>
        </div>
        <div class="lp-swipe-scores">
          <div class="lp-swipe-score match"><span class="n num">87%</span><span class="l">${t('hero_card_match')}</span></div>
          <div class="lp-swipe-score reality"><span class="n num">${chanceLabel('Target')}</span><span class="l">${t('hero_card_reality')}</span></div>
        </div>
        <div class="lp-swipe-actions">
          <span class="dislike" aria-hidden="true">${ICONS.x}</span>
          <span class="like" aria-hidden="true">${ICONS.heart}</span>
        </div>
      </div>
    </div>`;

  /* ---------- 03 · Понравившиеся: список из 5 вузов ---------- */
  const matchesList = `
    <div>
      <div class="lp-matches-head">${ru ? 'Понравившиеся · 12 вузов' : 'Matches · 12 schools'}</div>
      ${[
      { name: 'Cornell University', loc: 'Ithaca, NY', v: 87, badge: 'Target', setting: 'Suburban', climate: 'Cold', id: 28 },
      { name: 'UC Berkeley', loc: 'Berkeley, CA', v: 81, badge: 'Reach', setting: 'Urban', climate: 'Moderate', id: 26 },
      { name: 'University of Michigan', loc: 'Ann Arbor, MI', v: 79, badge: 'Target', setting: 'Suburban', climate: 'Cold', id: 7 },
      { name: 'UT Austin', loc: 'Austin, TX', v: 77, badge: 'Likely', setting: 'Urban', climate: 'Hot', id: 37 },
      { name: 'Purdue University', loc: 'West Lafayette, IN', v: 76, badge: 'Likely', setting: 'Suburban', climate: 'Cold', id: 38 }
    ].map((u, i) => `
        <div class="match-list-row" style="cursor:default;">
          <div class="match-thumb uni-visual-host">${uniVisual(UNIVERSITIES.find(x => x.id === u.id) || { id: 30 + i, setting: u.setting, climate: u.climate })}</div>
          <div class="match-info"><h4>${u.name}</h4><div class="loc">${u.loc}</div></div>
          <div class="match-score-block"><div class="v">${u.v}%</div><div class="l">Match</div></div>
          <span class="badge badge-${u.badge}">${u.badge}</span>
        </div>`).join('')}
    </div>`;

  /* Порядок карточек = реальный сценарий пользователя:
     01 свайпаешь вузы → 02 профиль строится сам по лайкам → 03 лайкнутое
     собирается в список → 04 по каждому вузу — заявка с чек-листом. */
  const steps = ru
    ? ['Свайп', 'Профиль', 'Список', 'Заявки']
    : ['Swipe', 'Profile', 'Shortlist', 'Applications'];
  return [
    { mock: swipe, step: steps[0], title: t('how3_title'), body: t('how3_body') },
    { mock: dna, step: steps[1], title: t('how2_title'), body: t('how2_body') },
    { mock: matchesList, step: steps[2], title: t('how4_title'), body: t('how4_body') },
    { mock: tracker, step: steps[3], title: t('how1_title'), body: t('how1_body') },
  ];
}

// Приём 1:1 из макета: один pinned "стейдж", карточки друг на друге, прогресс
// считается от прокрутки внешней обёртки. Слушатель — на window (страница не
// оборачивает лендинг в отдельный скролл-контейнер, см. README), поэтому
// перепривязываем обработчик на каждый renderLanding(), а не копим их —
// иначе смена языка на лендинге плодила бы по одному listener'у на переключение.
let lpDawnScrollHandler = null;
let lpDayRafId = null;
let lpDaySmoothScrollY = 0;
let lpFeatureScrollHandler = null;
let lpFeatureResizeHandler = null;
let lpMarqueeScrollHandler = null;
let lpAnimTextScrollHandler = null;
// Было: .lp-feature-stage держался на CSS position:sticky, а JS только
// двигал карточки внутри. Проблема — #landing использует overflow-x:clip,
// а по спецификации CSS overflow это неявно превращает overflow-y (по
// умолчанию visible) в auto, то есть #landing сам становится
// "прокручиваемым контейнером" — и именно ОН, а не вьюпорт, становится
// точкой отсчёта для position:sticky у всех потомков. #landing никогда
// не скроллится сам по себе (скроллится страница), поэтому в результате
// стейдж либо не залипал вовсе, либо залипал не там — карточки наезжали
// друг на друга без реального "пина" (жалоба: "просто скроллю вниз,
// карточки не листаются", и скриншот с наложенным текстом двух карточек
// разом). Теперь пин целиком на JS: три явных состояния (до/во время/
// после) с ручным переключением position absolute → fixed → absolute,
// не зависит от overflow родителей вообще.
function initLpFeatureStack() {
  if (lpFeatureScrollHandler) window.removeEventListener('scroll', lpFeatureScrollHandler);
  if (lpFeatureResizeHandler) window.removeEventListener('resize', lpFeatureResizeHandler);
  const outer = document.getElementById('lpFeatureStageOuter');
  const cards = outer ? Array.from(outer.querySelectorAll('.lp-feature-card')) : [];
  if (!outer || !cards.length) { lpFeatureScrollHandler = null; lpFeatureResizeHandler = null; return; }

  const stageEl = outer.querySelector('.lp-feature-stage');
  const clamp = (v, a, b) => Math.min(Math.max(v, a), b);

  // TEARDOWN мобильного пиннинга: при любом повторном вызове (смена языка
  // через renderLanding или переход десктоп↔мобиль по resize) сначала
  // сбрасываем ВСЕ инлайн-стили, которые ставила десктопная версия ниже,
  // — иначе после resize 1280→390 карточки остаются absolute/-50%/-перекрытыми
  // и карусель «не заводится» поверх мёртвых координат.
  if (stageEl) ['position', 'top', 'left', 'width'].forEach(p => stageEl.style.removeProperty(p));
  cards.forEach(c => ['transform', 'filter', 'opacity', 'visibility', 'z-index'].forEach(p => c.style.removeProperty(p)));

  // МОБИЛЬНАЯ АРХИТЕКТУРА (≤760px): никакой JS-пиннинг и 560vh «листа» —
  // вместо этого нативная горизонтальная карусель (scroll-snap в CSS) +
  // точки-индикаторы. См. initLpFeatureCarousel ниже и mobile-блок в конце
  // styles.css. Это и есть «архитектура под телефон», а не уменьшенный десктоп.
  if (window.innerWidth <= 760) {
    initLpFeatureCarousel(outer, stageEl, cards);
    lpFeatureScrollHandler = null;
    lpFeatureResizeHandler = null;
    return;
  }
  if (lpFeatureCarouselCleanup) { lpFeatureCarouselCleanup(); lpFeatureCarouselCleanup = null; }
  const dots = outer.querySelector('.lp-feature-dots');
  if (dots) dots.remove();

  function update() {
    if (outer.offsetParent === null) return; // лендинг сейчас скрыт (другой экран) — не считаем зря
    const stageH = stageEl.offsetHeight;
    const outerRect = outer.getBoundingClientRect();
    const outerTop = outerRect.top + window.scrollY;
    const outerH = outer.offsetHeight;
    const maxScroll = Math.max(outerH - stageH, 0);
    const scrollY = window.scrollY;

    // Три состояния стейджа относительно окна прокрутки outer:
    if (maxScroll <= 0 || scrollY <= outerTop) {
      // До входа в зону пина — стейдж просто стоит у верхнего края outer.
      stageEl.style.position = 'absolute';
      stageEl.style.top = '0';
      stageEl.style.left = '0';
      stageEl.style.width = '100%';
    } else if (scrollY < outerTop + maxScroll) {
      // В зоне пина — реально прибит к вьюпорту (fixed), координаты по
      // getBoundingClientRect (viewport-relative), а не proценты/сетка.
      stageEl.style.position = 'fixed';
      stageEl.style.top = '0';
      stageEl.style.left = outerRect.left + 'px';
      stageEl.style.width = outerRect.width + 'px';
    } else {
      // После зоны пина — стейдж "отпущен" и остаётся у нижнего края outer,
      // дальше скроллится вместе со страницей как обычно.
      stageEl.style.position = 'absolute';
      stageEl.style.top = maxScroll + 'px';
      stageEl.style.left = '0';
      stageEl.style.width = '100%';
    }

    const scrolled = clamp(scrollY - outerTop, 0, maxScroll);
    const overall = clamp(maxScroll > 0 ? scrolled / maxScroll : 0, 0, 1);
    const segments = Math.max(cards.length - 1, 1);
    const segLen = 1 / segments;

    cards.forEach((card, i) => {
      let entrance = 1;
      if (i > 0) {
        const segStart = (i - 1) * segLen;
        entrance = clamp((overall - segStart) / segLen, 0, 1);
      }
      // Карточка въезжает снизу из-за края стейджа (overflow:hidden его обрезает)
      // и всегда непрозрачна — раньше она проявлялась через opacity, и текст
      // двух карточек смешивался посередине перехода.
      const offsetBelowPct = (1 - entrance) * 130;
      let covered = 0;
      if (i < cards.length - 1) {
        const segStart = i * segLen;
        covered = clamp((overall - segStart) / segLen, 0, 1);
      }
      const scale = 1 - covered * 0.05;
      const dim = 1 - covered * 0.3;
      card.style.transform = `translateX(-50%) translateY(calc(-50% + ${offsetBelowPct}%)) scale(${scale})`;
      card.style.filter = `brightness(${dim})`;
      card.style.opacity = 1;
      card.style.visibility = (i > 0 && entrance <= 0) ? 'hidden' : 'visible';
      card.style.zIndex = i + 1;
    });
  }

  lpFeatureScrollHandler = update;
  lpFeatureResizeHandler = update;
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();
}

let lpFeatureResizeBound = false;
function bindLpFeatureResizeOnce() {
  if (lpFeatureResizeBound) return;
  lpFeatureResizeBound = true;
  let wasMobile = window.innerWidth <= 760;
  window.addEventListener('resize', () => {
    const isMobile = window.innerWidth <= 760;
    if (isMobile !== wasMobile) { wasMobile = isMobile; initLpFeatureStack(); }
  });
}

/* ============================================================
   МОБИЛЬНАЯ КАРУСЕЛЬ ФИЧ (см. ветку в initLpFeatureStack выше).
   CSS (mobile-блок в конце styles.css) превращает .lp-feature-stage в
   горизонтальный scroll-snap контейнер; здесь остаётся только:
   — точки-индикаторы (реальные <button>, не декоративные «кружки»);
   — подсветка активной точки при прокрутке (пассивный scroll-listener
     на самом стейдже, не на window).
   Клик по точке скроллит к карточке (scrollIntoView с inline:center).
   При каждом re-render (смена языка/темы) старые точки удаляются вместе
   с DOM стейджа, а старый scroll-listener снимается через
   lpFeatureCarouselCleanup — накопления не происходит. */
let lpFeatureCarouselCleanup = null;
function initLpFeatureCarousel(outer, stageEl, cards) {
  if (lpFeatureCarouselCleanup) { lpFeatureCarouselCleanup(); lpFeatureCarouselCleanup = null; }
  if (!outer || !stageEl || !cards.length) return;
  let dots = outer.querySelector('.lp-feature-dots');
  if (dots) dots.remove();
  dots = document.createElement('div');
  dots.className = 'lp-feature-dots';
  cards.forEach((card, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'lp-feature-dot';
    b.setAttribute('aria-label', (state.lang === 'en' ? 'Feature ' : 'Возможность ') + (i + 1) + ' / ' + cards.length);
    b.addEventListener('click', () => {
      card.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    });
    dots.appendChild(b);
  });
  outer.appendChild(dots);
  const update = () => {
    const sr = stageEl.getBoundingClientRect();
    const first = cards[0].getBoundingClientRect();
    const step = cards.length > 1 ? cards[1].getBoundingClientRect().left - first.left : 0;
    const x = first.left - sr.left;
    const idx = step > 1 ? Math.max(0, Math.min(cards.length - 1, Math.round(-x / step))) : 0;
    dots.querySelectorAll('.lp-feature-dot').forEach((d, i) => {
      d.classList.toggle('is-active', i === idx);
    });
  };
  stageEl.addEventListener('scroll', update, { passive: true });

  // МАСШТАБИРОВАНИЕ МОКА ПОД ВЫСОТУ КАРТОЧКИ: моки спроектированы под
  // десктоп и по своей высоте на телефоне в карточку не влезают. Карточка
  // теперь flex-колонка (см. mobile-блок CSS), мок получает flex:1 +
  // overflow:hidden, а его содержимое ужимается transform-ом до доступной
  // высоты через --mock-fit (всегда <= 1). Layout-высота от transform не
  // зависит, поэтому offsetHeight всегда «натуральный» и повторные вызовы
  // идемпотентны. Пересчёт — на resize и после загрузки шрифтов.
  const fitMocks = () => {
    const scs = getComputedStyle(stageEl);
    const stageH = stageEl.getBoundingClientRect().height
      - parseFloat(scs.paddingTop) - parseFloat(scs.paddingBottom);
    cards.forEach(card => {
      const head = card.querySelector('.lp-feature-text');
      const mock = card.querySelector('.lp-feature-mock');
      const inner = mock && mock.firstElementChild;
      if (!inner) return;
      const cs = getComputedStyle(card);
      const mcs = getComputedStyle(mock);
      const headH = head ? head.getBoundingClientRect().height : 0;
      const avail = stageH
        - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom)
        - headH - 12 /* gap колонки */
        - parseFloat(mcs.paddingTop) - parseFloat(mcs.paddingBottom);
      if (avail <= 0) return;
      const fit = Math.min(1, avail / inner.offsetHeight);
      mock.style.setProperty('--mock-fit', String(Math.round(fit * 100) / 100));
    });
  };
  const onResize = () => requestAnimationFrame(fitMocks);
  window.addEventListener('resize', onResize);
  fitMocks();
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(fitMocks).catch(() => {});
  }
  lpFeatureCarouselCleanup = () => {
    stageEl.removeEventListener('scroll', update);
    window.removeEventListener('resize', onResize);
    cards.forEach(card => {
      const m = card.querySelector('.lp-feature-mock');
      if (m) m.style.removeProperty('--mock-fit');
    });
  };
  update();
}

/* ============================================================
   МОБИЛЬНАЯ НИЖНЯЯ CTA-ПАНЕЛЬ (≤760px). Классика мобильных лендингов:
   после того как hero-кнопка ушла вверх за экран, снизу появляется
   закреплённая панель с «Начать бесплатно» — main action всегда под
   большим пальцем. Появление/скрытие — один rAF-троттленный scroll/
   resize-listener (регистрируется один раз, см. lpMobileCtaBound),
   сами проверки дешёвые. Скрывается: на десктопе, при скрытом #landing
   (онбординг/приложение), при открытом логине или меню шапки. */
let lpMobileCtaBound = false;
function updateLpMobileCtaBar() {
  const bar = document.getElementById('lpMobileCtaBar');
  if (!bar) return;
  const landing = document.getElementById('landing');
  const login = document.getElementById('login');
  const header = document.getElementById('lp-header');
  const ctas = document.querySelector('#landing .lp-hero-ctas');
  const mobile = window.innerWidth <= 760;
  const landingHidden = !landing || landing.classList.contains('hidden');
  const loginOpen = login && !login.classList.contains('hidden');
  const menuOpen = header && header.classList.contains('menu-open');
  // «Hero-кнопка ушла вверх»: низ её блока выше 72px от верха вьюпорта —
  // т.е. кнопка точно не видна и панель не дублирует её на одном экране.
  let pastHero = false;
  if (ctas) {
    const r = ctas.getBoundingClientRect();
    pastHero = r.bottom < 72;
  }
  const show = mobile && !landingHidden && !loginOpen && !menuOpen && pastHero;
  bar.classList.toggle('is-visible', show);
  bar.setAttribute('aria-hidden', show ? 'false' : 'true');
  // одного aria-hidden мало: кнопка внутри остаётся достижимой по Tab и
  // клику, когда панель спрятана за экраном. inert выключает панель целиком.
  try { bar.inert = !show; } catch (e) { /* старые браузеры без inert */ }
}
function initLpMobileCtaBar() {
  if (!lpMobileCtaBound) {
    lpMobileCtaBound = true;
    window.addEventListener('scroll', () => requestAnimationFrame(updateLpMobileCtaBar), { passive: true });
    window.addEventListener('resize', () => requestAnimationFrame(updateLpMobileCtaBar), { passive: true });
  }
  updateLpMobileCtaBar();
}

// Посимвольная scroll-reveal анимация текста (.lp-anim-text/.lp-char, см.
// animatedTextHTML): прозрачность каждого символа растёт от .2 до 1 по мере
// того, как контейнер проходит через "рабочую зону" вьюпорта — верх
// контейнера на 80% высоты экрана в начале, низ на 20% в конце. Слушатель
// на window, поэтому при каждом renderLanding() старый обработчик сперва
// снимается — иначе они бы копились на каждый повторный рендер.
// Было: querySelector (только первый .lp-anim-text на странице) — пока
// такой блок был один (pain_body), работало; как только рядом появился
// второй (вывод под списком страхов), второй просто не анимировался.
// querySelectorAll — обрабатывает любое количество таких блоков сразу.
function initLpAnimText() {
  if (lpAnimTextScrollHandler) window.removeEventListener('scroll', lpAnimTextScrollHandler);
  // Посимвольный blur на тач-устройствах отключаем — это лишь ослабление
  // нечитаемого текста на скролле, на мобильном только добавляет GPU-нагрузку
  // и не работает как задумано (палец скроллит быстро, эффект не заметен).
  if (window.matchMedia('(pointer: coarse)').matches) {
    document.querySelectorAll('.lp-anim-text-host').forEach(el => el.classList.add('no-anim-text'));
    lpAnimTextScrollHandler = null;
    return;
  }
  const containers = Array.from(document.querySelectorAll('.lp-anim-text'));
  if (!containers.length) { lpAnimTextScrollHandler = null; return; }
  const clamp = (v, a, b) => Math.min(Math.max(v, a), b);
  const items = containers.map(container => ({
    container,
    total: Math.max(parseInt(container.dataset.total, 10) || 1, 1),
    chars: Array.from(container.querySelectorAll('.lp-char')),
  }));
  function update() {
    items.forEach(({ container, total, chars }) => {
      if (container.offsetParent === null) return; // лендинг сейчас скрыт
      const rect = container.getBoundingClientRect();
      const vh = window.innerHeight;
      const start = vh * 0.98; // текст начинает проявляться сразу, как появился снизу,
      const end = vh * 0.62;   // и полностью виден, когда доходит до середины экрана
      const span = Math.max(start - end + rect.height, 1);
      const p = clamp((start - rect.top) / span, 0, 1);
      chars.forEach((el, i) => {
        const t = i / total;
        const local = clamp((p - t) * total * 0.9, 0, 1);
        const k = local * local * (3 - 2 * local); // плавная кривая, без рывков
        el.style.opacity = (0.45 + 0.55 * k).toFixed(3);
        el.style.filter = k > 0.98 ? '' : `blur(${((1 - k) * 1.4).toFixed(2)}px)`;
      });
    });
  }
  lpAnimTextScrollHandler = update;
  window.addEventListener('scroll', update, { passive: true });
  update();
}

/* .no-anim-text — на touch: символы .lp-char просто получают opacity 1
   без blur-фильтра, текст сразу полностью виден. */

// Прогресс "дня" для неба в глобальном светлом фоне (.lp-bg-fx-day, см.
// renderLanding) — раньше это было изолировано внутри секции .lp-dawn
// (своя локальная прокрутка, свой отдельный фон), из-за чего на стыке с
// глобальным звёздным фоном тёмной темы получался шов ("цвета не
// вливаются"). Теперь цвет неба — часть ТОГО ЖЕ самого фонового слоя, что
// и звёзды (.lp-bg-fx), просто в его светлой ветке: один сквозной слой на
// весь сайт, без границ между секциями. Прогресс p считается от самого
// верха страницы (там, где хиро-заголовок "Найди университет, который
// реально тебе подходит") до конца текстовой секции .lp-dawn — небо уже
// начинает меняться, как только виден хиро, и доходит до закатного тона к
// финалу этого текста; дальше по странице небо просто остаётся в этом
// состоянии, не отыгрывая цикл заново.
//
// РЕШЕНИЕ УБРАТЬ СОЛНЦЕ КАК ОТДЕЛЬНЫЙ ДИСК: несколько итераций подряд
// (дуга слева-направо, потом спуск сверху вниз) всё равно не нравились —
// сам диск как графический объект оказался проблемой, а не конкретная
// траектория. Оставлена только смена цвета неба (утро -> день -> вечер) +
// облака — без солнца как физического объекта на сцене. Если понадобится
// вернуть — вся структура (--p, три цветовых узла) для этого уже готова,
// не хватает только диска.
function initLpDayArcScroll() {
  if (lpDawnScrollHandler) window.removeEventListener('scroll', lpDawnScrollHandler);
  if (lpDayRafId) cancelAnimationFrame(lpDayRafId);
  const bgDay = document.querySelector('#landing .lp-bg-fx-day');
  if (!bgDay) { lpDawnScrollHandler = null; lpDayRafId = null; return; }
  const clamp = (v, a, b) => Math.min(Math.max(v, a), b);
  const lerpNum = (a, b, t) => Math.round(a + (b - a) * t);
  const mix = (c1, c2, t) => c1.map((v, i) => lerpNum(v, c2[i], t));
  // Было 3 точки (top/mid/bottom) — плавный, но "никакой" переход,
  // без ощущения настоящего горизонта. На референсных фото (небо+море)
  // есть чёткая structура: глубокий синий верх -> бледная дымка ровно на
  // линии горизонта -> яркая бирюзовая вода сразу под ней -> тёмная вода
  // на переднем плане. Теперь 4 точки повторяют эту структуру: top (небо),
  // haze (дымка у горизонта), near (бирюза сразу под горизонтом), far
  // (глубокая вода/тень на переднем плане).
  // Было: DAWN/NOON почти monochromatic бледно-серо-голубые (top/near/far
  // отличались на 15-20 единиц) — небо не читалось как небо, вода не
  // читалась как вода, "кисель" на промежуточных стадиях скролла. Теперь
  // каждая стадия держит тот же контраст top(небо)/near(бирюза)/far(тёмная
  // вода), что и в SKY_SEA, просто светлее и мягче — прогресс не бледность
  // -> цвет, а мягкий утренний тон -> насыщенный полуденный.
  const SKY_DAWN = { top: [196, 219, 236], haze: [232, 238, 240], near: [150, 205, 205], far: [90, 130, 150] };
  const SKY_NOON = { top: [150, 195, 225], haze: [222, 236, 238], near: [110, 197, 197], far: [55, 112, 137] };
  const SKY_SEA = { top: [96, 160, 205], haze: [214, 232, 233], near: [64, 176, 184], far: [12, 70, 100] };
  // lerp-сглаживание scrollY (как в референсе hero-b-parallax-3d.html):
  // событие scroll только обновляет цель, отдельный rAF-цикл каждый кадр
  // подтягивает "сглаженный" scrollY к цели — небо переливается плавно
  // даже на рваном скролле (колесо мыши, трекпад), а не дёргается шагами.
  let targetScrollY = window.scrollY;
  lpDaySmoothScrollY = targetScrollY;
  const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function onScroll() {
    targetScrollY = window.scrollY;
    if (prefersReduced) { lpDaySmoothScrollY = targetScrollY; applyFrame(); }
  }
  function onResize() {
    targetScrollY = window.scrollY;
    if (prefersReduced) { lpDaySmoothScrollY = targetScrollY; applyFrame(); }
  }

  function applyFrame() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    if (isDark) return; // в тёмной теме этот слой скрыт целиком (display:none), считать нечего
    const dawnEl = document.getElementById('lpDawn');
    const endY = dawnEl ? (dawnEl.offsetTop + dawnEl.offsetHeight) : document.documentElement.scrollHeight;
    const span = Math.max(endY - window.innerHeight, 1);
    const p = clamp(lpDaySmoothScrollY / span, 0, 1);
    bgDay.style.setProperty('--p', p.toFixed(3));

    const seg = p < 0.5 ? [SKY_DAWN, SKY_NOON, p / 0.5] : [SKY_NOON, SKY_SEA, (p - 0.5) / 0.5];
    const [from, to, k] = seg;
    const top = mix(from.top, to.top, k);
    const haze = mix(from.haze, to.haze, k);
    const near = mix(from.near, to.near, k);
    const far = mix(from.far, to.far, k);

    // УБРАНО: вторая стадия выцветания в светлый тон футера (SKY_FOOT). Она
    // делала низ страницы почти белым (жалоба "снизу слишком светло") —
    // теперь вода остаётся насыщенной до самого песчаного дна над футером
    // (см. seaFloorMarkup), а сам футер — песочный, без резкого шва.

    bgDay.style.setProperty('--sky-top', `rgb(${top.join(',')})`);
    bgDay.style.setProperty('--sky-haze', `rgb(${haze.join(',')})`);
    bgDay.style.setProperty('--sky-near', `rgb(${near.join(',')})`);
    bgDay.style.setProperty('--sky-far', `rgb(${far.join(',')})`);
  }

  function tick() {
    lpDaySmoothScrollY += (targetScrollY - lpDaySmoothScrollY) * 0.09;
    // Ниже 0.05px разницы можно просто долить точно в цель — иначе lerp
    // теоретически бесконечно приближается и держит rAF занятым вечно.
    if (Math.abs(targetScrollY - lpDaySmoothScrollY) < 0.05) lpDaySmoothScrollY = targetScrollY;
    applyFrame();
    lpDayRafId = requestAnimationFrame(tick);
  }

  lpDawnScrollHandler = onScroll;
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize, { passive: true });
  applyFrame();
  if (!prefersReduced) lpDayRafId = requestAnimationFrame(tick);
}

// --foot-h: высота футера. Морское дно, рыбы и пузырьки привязаны к НИЗУ
// страницы (bottom: var(--foot-h) + N px), а не к % высоты — иначе на разной
// ширине экрана (разная высота страницы) они уезжали с дна в середину секций.
let lpSeaRO = null;
function initSeaFloorSync() {
  if (lpSeaRO) { lpSeaRO.disconnect(); lpSeaRO = null; }
  const bg = document.querySelector('#landing .lp-bg-fx-day');
  const foot = document.querySelector('.lp-footer');
  if (!bg || !foot) return;
  const sync = () => bg.style.setProperty('--foot-h', foot.offsetHeight + 'px');
  sync();
  if (window.ResizeObserver) { lpSeaRO = new ResizeObserver(sync); lpSeaRO.observe(foot); }
  window.addEventListener('resize', sync, { passive: true });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(sync);
}

/* 40 → 1: вкладки «сыпятся» по одной, счётчик бежит до 40, затем появляется один список. */
function initCmpAnimation() {
  const row = document.getElementById('cmpRow');
  if (!row) return;
  const counter = document.getElementById('cmpCount');
  const play = () => {
    if (row.classList.contains('cmp-play')) return;
    row.classList.add('cmp-play');
    if (counter) {
      const t0 = performance.now(), dur = 1150;
      const step = now => { const k = Math.min(1, (now - t0) / dur); counter.textContent = Math.round(40 * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(step); };
      counter.textContent = '0'; requestAnimationFrame(step);
    }
  };
  if (!('IntersectionObserver' in window)) { play(); return; }
  const io = new IntersectionObserver(es => { es.forEach(e => { if (e.isIntersecting) { play(); io.disconnect(); } }); }, { threshold: 0.35 });
  io.observe(row);
}
function initLpMarqueeScroll() {
  if (lpMarqueeScrollHandler) window.removeEventListener('scroll', lpMarqueeScrollHandler);
  const stage = document.getElementById('lpMarqueeStage');
  const row1 = document.getElementById('lpMarqueeRow1');
  const row2 = document.getElementById('lpMarqueeRow2');
  if (!stage || !row1 || !row2) { lpMarqueeScrollHandler = null; return; }
  function update() {
    if (stage.offsetParent === null) return;
    const rect = stage.getBoundingClientRect();
    const sectionTop = rect.top + window.scrollY;
    const offset = (window.scrollY - sectionTop + window.innerHeight) * 0.3;
    row1.style.transform = `translateX(${offset - 200}px)`;
    row2.style.transform = `translateX(${-(offset - 200)}px)`; // второй ряд едет навстречу первому
  }
  lpMarqueeScrollHandler = update;
  window.addEventListener('scroll', update, { passive: true });
  update();
}

function renderOnboarding() {
  bindObFitResize();
  const p = state.profile;
  const s = state.obStep;
  const isStepChange = s !== lastAnimatedObStep;
  lastAnimatedObStep = s;
  const isCategoryChange = state.obMajorCategory !== lastAnimatedMajorCategory;
  lastAnimatedMajorCategory = state.obMajorCategory;

  // renderOnboarding() перерисовывает весь #onboarding через innerHTML, из-за
  // чего .major-grid (список специальностей, свой overflow-y:auto) и
  // .category-scroll каждый раз создаются заново и теряют scrollTop/scrollLeft —
  // визуально это выглядит как "прыжок" к началу списка при каждом выборе
  // специальности. Запоминаем прокрутку до перерисовки и восстанавливаем её
  // после, кроме случаев смены шага/категории, когда список и так новый.
  const prevMajorGrid = document.querySelector('.major-grid');
  const prevMajorGridScrollTop = (prevMajorGrid && !isStepChange && !isCategoryChange) ? prevMajorGrid.scrollTop : 0;
  const prevCategoryScroll = document.querySelector('.category-scroll');
  const prevCategoryScrollLeft = (prevCategoryScroll && !isStepChange) ? prevCategoryScroll.scrollLeft : 0;

  let inner = '';

  let navHtml = '';

  if (s === 0) {
    inner += `
      <div class="ob-card-heading">
      <p class="ob-eyebrow">${t('step_of', 1)}</p>
      <h1 class="ob-title">${t('ob0_title')}</h1>
      <p class="ob-sub">${t('ob0_sub')}</p>
      </div>
      <div class="field">
        <label>${t('home_country_label')}</label>
        <p class="field-hint">${t('home_country_hint')}</p>
        <div class="ob-select">
          <select onchange="setHomeCountry(this.value)" aria-label="${t('home_country_label')}">
            <option value="">${t('choose_ph')}</option>
            ${HOME_COUNTRIES.map(c => `<option value="${c[0]}" ${p.homeCountry === c[0] ? 'selected' : ''}>${state.lang === 'ru' ? c[1] : c[2]}</option>`).join('')}
          </select>
          ${ICONS.chevronDown}
        </div>
      </div>
      <div class="field">
        <label>${t('home_lang_label')}</label>
        <p class="field-hint">${t('home_lang_hint')}</p>
        <div class="ob-select">
          <select onchange="setNativeLang(this.value)" aria-label="${t('home_lang_label')}">
            <option value="">${t('choose_ph')}</option>
            ${NATIVE_LANGS.map(c => `<option value="${c[0]}" ${p.nativeLang === c[0] ? 'selected' : ''}>${state.lang === 'ru' ? c[1] : c[2]}</option>`).join('')}
          </select>
          ${ICONS.chevronDown}
        </div>
      </div>
      <div class="field">
          <label>${t('degree_label')}</label>
          <div class="chip-group">
            ${chip(t('degree_bachelor'), p.degreeLevel === 'bachelor', `setDegreeLevel('bachelor')`)}
            ${chip(t('degree_master'), p.degreeLevel === 'master', `setDegreeLevel('master')`)}
            ${chip(t('degree_phd'), p.degreeLevel === 'phd', `setDegreeLevel('phd')`)}
          </div>
        </div>
      <div class="field">
        <label>${t('major_label')}</label>
        <p class="field-hint">${t('multi_select_hint')}</p>
        <div class="category-scroll ${isStepChange ? 'stagger-in' : ''}">
          ${MAJOR_CATEGORIES.map(c => `
            <button type="button" class="category-chip ${state.obMajorCategory === c.key ? 'active' : ''}" onclick="setMajorCategory('${c.key}')">
              <span class="category-chip-icon">${ICONS[c.icon]}</span><span>${categoryLabel(c)}</span>
            </button>`).join('')}
        </div>
        <div class="major-grid ${(isStepChange || isCategoryChange) ? 'stagger-in' : ''}" style="margin-top:10px;">
          ${(MAJOR_CATEGORIES.find(c => c.key === state.obMajorCategory) || MAJOR_CATEGORIES[0]).majors.map(m => `
            <button type="button" class="major-card ${p.majors.includes(m.value) ? 'active' : ''}" onclick="setMajor('${m.value}')">
              ${p.majors.includes(m.value) ? `<span class="major-card-check">${ICONS.check}</span>` : ''}
              <span class="major-name">${majorLabel(m.value)}</span>
            </button>`).join('')}
        </div>
      </div>`;
    navHtml = `
      <span></span>
      <button class="btn btn-primary" onclick="obNext()">${t('next')}</button>`;
  } else if (s === 1) {
    inner += `
      <div class="ob-card-heading">
      <p class="ob-eyebrow">${t('step_of', 2)}</p>
      <h1 class="ob-title">${t('obx_title')}</h1>
      <p class="ob-sub">${t('obx_sub')}</p>
      </div>
      <div class="field">
          <label>${t('gpa_label')}</label>
          <p class="field-hint">${t('gpa_hint')}</p>
          <div class="gpa-card">
            <div class="gpa-card-head"><span class="test-mono tm-gpa">GPA</span><span class="gpa-scale">${state.lang === 'ru' ? 'шкала' : 'scale'} 4.0</span></div>
            <div class="slider-row">
              <input type="range" min="2" max="4" step="0.05" value="${p.gpa}" oninput="updateSlider('gpa',this.value,'val-gpa',v=>parseFloat(v).toFixed(2))">
              <div class="slider-val" id="val-gpa">${p.gpa.toFixed(2)}</div>
            </div>
            <div class="slider-range-labels"><span>2.0</span><span>4.0</span></div>
          </div>
        </div>
      <div class="field">
        <label>${t('tests_academic')}</label>
        <div class="test-rows test-grid">${ACADEMIC_TESTS.map(k => renderTestRow(k)).join('')}</div>
      </div>
      <div class="field">
        <label>${t('tests_english')}</label>
        <div class="test-rows test-grid">${ENGLISH_TESTS.map(k => renderTestRow(k)).join('')}</div>
      </div>
`;
    navHtml = `
      <button class="btn btn-ghost" onclick="obBack()">${t('back')}</button>
      <button class="btn btn-primary" onclick="obNext()">${t('next')}</button>`;
  } else if (s === 2) {
    inner += `
      <div class="ob-card-heading">
      <p class="ob-eyebrow">${t('step_of', 3)}</p>
      <h1 class="ob-title">${t('ob1_title')}</h1>
      <p class="ob-sub">${t('ob1_sub')}</p>
      </div>
      <div class="field">
        <label>${t('size_label')}</label>
        <p class="ob-field-hint">${t('multi_select_hint')}</p>
        <div class="chip-group">${['Small', 'Medium', 'Large'].map(v => chip(t('size_' + v.toLowerCase()), p.size.includes(v), `setChip('size','${v}')`)).join('')}</div>
      </div>
      <div class="field">
        <label>${t('setting_label')}</label>
        <p class="ob-field-hint">${t('multi_select_hint')}</p>
        <div class="chip-group">${['Urban', 'Suburban', 'Coastal'].map(v => chip(t('setting_' + v.toLowerCase()), p.setting.includes(v), `setChip('setting','${v}')`)).join('')}</div>
      </div>
      <div class="field">
        <label>${t('climate_label')}</label>
        <p class="ob-field-hint">${t('multi_select_hint')}</p>
        <div class="chip-group">${['Warm', 'Moderate', 'Cold'].map(v => chip(t('climate_' + v.toLowerCase()), p.climate.includes(v), `setChip('climate','${v}')`)).join('')}</div>
      </div>
      <div class="field">
        <label>${t('research_label')}</label>
        <div class="slider-row"><input type="range" min="1" max="5" step="1" value="${p.research}" oninput="updateSlider('research',this.value,'val-research',v=>v+'/5')"><div class="slider-val" id="val-research">${p.research}/5</div></div>
      </div>
      <div class="field">
        <label>${t('budget_label')}</label>
        <div class="slider-row"><input type="range" min="0" max="70000" step="1000" value="${p.budget}" oninput="updateSlider('budget',this.value,'val-budget',v=>fmtMoney(parseInt(v)))"><div class="slider-val" id="val-budget">${fmtMoney(p.budget)}</div></div>
      </div>
      <div class="field">
        <label>${t('aid_label')}</label>
        <div class="chip-group">
          ${chip(t('aid_yes'), p.needsAid === true, `setAid(true)`)}
          ${chip(t('aid_no'), p.needsAid === false, `setAid(false)`)}
        </div>
      </div>`;
    navHtml = `
      <button class="btn btn-ghost" onclick="obBack()">${t('back')}</button>
      <button class="btn btn-primary" onclick="obNext()">${t('next')}</button>`;
  } else if (s === 3) {
    inner += `
      <div class="ob-card-heading">
      <p class="ob-eyebrow">${t('step_of', 4)}</p>
      <h1 class="ob-title">${t('ob2_title')}</h1>
      <p class="ob-sub">${t('ob2_sub')}</p>
      </div>
      <div class="map-wrap">
        <div class="map-wrap-head">
          <span class="map-wrap-label">${t('map_hint')}</span>
        </div>
        ${renderWorldMap()}
      </div>
      ${renderCountryPanel()}`;
    navHtml = `
      <button class="btn btn-ghost" onclick="obBack()">${t('back')}</button>
      <button class="btn btn-primary" onclick="obNext()">${t('next')}</button>`;
  } else {
    const strength = academicStrength(p);
    const eng = englishProficiencyLevel(p);
    inner += `
      <div class="ob-card-heading">
      <p class="ob-eyebrow">${t('step_of', 5)}</p>
      <h1 class="ob-title">${t('ob3_title')}</h1>
      <p class="ob-sub">${t('ob3_sub')}</p>
      </div>
      <div class="kv-grid" style="margin-bottom:20px;">
        <div class="kv"><div class="k">${t('strength_label')}${(!p.tests.SAT.taken && !p.tests.ACT.taken) ? ' (GPA only)' : ''}</div><div class="v">${strength}/100</div></div>
        <div class="kv"><div class="k">${t('major_kv')}</div><div class="v">${majorsLabel(p.majors)}</div></div>
        <div class="kv"><div class="k">${t('degree_label')}</div><div class="v">${t('degree_' + p.degreeLevel)}</div></div>
        <div class="kv"><div class="k">${t('budget_kv')}</div><div class="v">${fmtMoney(p.budget)}</div></div>
        <div class="kv"><div class="k">${t('regions_kv')}</div><div class="v">${p.continents.length ? p.continents.map(c => contName(c)).join(', ') : t('world')}</div></div>
        ${eng ? `<div class="kv"><div class="k">${state.lang === 'ru' ? 'Английский' : 'English'}</div><div class="v" style="font-family:var(--font-body);font-size:12.5px;">${state.lang === 'en' ? eng.label_en : eng.label_ru}</div></div>` : ''}
      </div>`;
    navHtml = `
      <button class="btn btn-ghost" onclick="obBack()">${t('back')}</button>
      <button class="btn btn-primary" onclick="finishOnboarding()">${t('start_swiping')}</button>`;
  }

  const stepTitles = [t('ob0_title'), t('obx_title'), t('ob1_title'), t('ob2_title'), t('ob3_title')];
  const stepSubs = [t('ob0_sub'), t('obx_sub'), t('ob1_sub'), t('ob2_sub'), t('ob3_sub')];
  const brandPanel = `
    <aside class="ob-brand-panel">
      <div class="ob-brand-top">
        <div class="ob-brand-logo" onclick="backToLanding()" style="cursor:pointer;" title="${state.lang === 'ru' ? 'Вернуться на главную' : 'Back to home'}"><div class="mark">${ICONS.logo}</div><div class="text">Admitly</div></div>
        <div style="display:flex;align-items:center;gap:10px;">
          <div class="ob-lang-switch-dark">
            <button class="${state.lang === 'ru' ? 'active' : ''}" onclick="setLang('ru')">RU</button>
            <button class="${state.lang === 'en' ? 'active' : ''}" onclick="setLang('en')">EN</button>
          </div>
          ${themeSwitcher()}
        </div>
      </div>
      <div class="ob-brand-mid">
        <p class="ob-brand-eyebrow">${t('step_of', s + 1)}</p>
        <h2 class="ob-brand-headline">${stepTitles[s]}</h2>
        <p class="ob-brand-sub">${stepSubs[s]}</p>
      </div>
      <div class="ob-steps">
        ${stepTitles.map((title, i) => `
          <div class="ob-step-row ${i < s ? 'done' : ''} ${i === s ? 'current' : ''}">
            <div class="ob-step-dot">${i < s ? ICONS.check : i + 1}</div>
            <div class="ob-step-label">${title}</div>
          </div>`).join('')}
      </div>
      <div class="ob-brand-facts">${renderObSideFacts()}</div>
    </aside>`;

  document.getElementById('onboarding').innerHTML = `
    ${brandPanel}
    <main class="ob-form-panel ${s <= 1 ? 'ob-compact' : ''}">
      <div class="ob-card-col">
        <div class="ob-card">
          <div class="ob-mobile-bar">
            <div class="ob-top-row">
              <button class="ob-mobile-home" onclick="backToLanding()" title="${state.lang === 'ru' ? 'На главную' : 'Home'}">${ICONS.back} ${state.lang === 'ru' ? 'Главная' : 'Home'}</button>
              ${langSwitcher()}
            </div>
            <div class="ob-progress">${OB_STEPS.map((_, i) => `<i class="${i <= s ? 'done' : ''}"></i>`).join('')}</div>
          </div>
          <div class="${isStepChange ? 'ob-step' : ''}">${inner}</div>
        </div>
        <div class="ob-nav-spacer">${renderObFiller(s)}</div>
        <div class="ob-nav">${navHtml}</div>
      </div>
    </main>`;

  // innerHTML не выполняет встроенные <script>, поэтому карта монтируется
  // отдельно, императивно, уже после того как разметка реально в DOM.
  if (s === 3) mountWorldMap();

  // Восстанавливаем прокрутку списка специальностей и строки категорий
  // (см. комментарий в начале функции) — без этого выбор специальности
  // визуально "перебрасывал" список наверх.
  if (s === 0) {
    const majorGrid = document.querySelector('.major-grid');
    if (majorGrid) majorGrid.scrollTop = prevMajorGridScrollTop;
    const categoryScroll = document.querySelector('.category-scroll');
    if (categoryScroll) categoryScroll.scrollLeft = prevCategoryScrollLeft;
  }

  fitObStepZero();
  // Анимацию запускаем ПОСЛЕ замера высоты: transform у детей иначе раздувает scrollHeight.
  playObEntrance(isStepChange);
  paintAllRanges(document.getElementById('onboarding'));
}

// Красивое появление элементов при составлении профиля. Всё в onboarding
// перерисовывается целиком на каждый клик, поэтому анимируем только то, что
// реально новое: при смене шага — всё по цепочке (панель слева, заголовок,
// поля, чипы, тесты, карта, подсказки), при клике — только то, что появилось
// (баллы включённого теста, панель стран после выбора первого континента).
// Задержка идёт через --d, сам keyframe — .ob-in в styles.css.
function playObEntrance(isStepChange) {
  const root = document.getElementById('onboarding');
  if (!root) return;
  // Тайминги ужаты примерно втрое: раньше последний элемент шага появлялся почти через
  // 1.5 с после смены экрана. Теперь весь шаг «собирается» за ~0.7 с, а каждый элемент
  // выезжает с лёгким пружинящим «подпрыгиванием» (см. .ob-in в styles.css).
  const put = (el, ms) => { if (el) { el.classList.add('ob-in'); el.style.setProperty('--d', Math.round(ms) + 'ms'); } };

  if (obPop) {
    const pop = obPop; obPop = null;
    if (pop.type === 'test') {
      const val = document.getElementById('val-test-' + pop.key);
      put(val && val.closest('.test-row-score-wrap'), 0);
    } else if (pop.type === 'country') {
      const cp = root.querySelector('.country-panel');
      put(cp, 0);
      if (cp) cp.querySelectorAll('.chip').forEach((c, j) => put(c, 60 + Math.min(j, 24) * 16));
    }
    if (!isStepChange) return;
  }
  if (!isStepChange) return;

  root.querySelectorAll('.ob-brand-mid > *').forEach((el, i) => put(el, i * 45));
  root.querySelectorAll('.ob-step-row').forEach((el, i) => put(el, 80 + i * 40));
  root.querySelectorAll('.ob-brand-fact').forEach((el, i) => put(el, 220 + i * 50));

  const step = root.querySelector('.ob-step');
  if (step) {
    const head = step.querySelector('.ob-card-heading');
    if (head) [...head.children].forEach((el, i) => put(el, 40 + i * 55));
    const blocks = [];
    [...step.children].forEach(c => {
      if (c === head) return;
      if (c.classList.contains('row2') || c.classList.contains('kv-grid')) blocks.push(...c.children);
      else blocks.push(c);
    });
    blocks.forEach((b, i) => {
      const base = 140 + i * 55;
      const rows = b.querySelector('.test-rows');
      if (rows) {
        [...b.children].forEach(ch => { if (ch !== rows) put(ch, base); });
        [...rows.children].forEach((r, j) => put(r, base + 50 + j * 60));
      } else if (b.querySelector('.major-grid')) {
        [...b.children].forEach(ch => { if (!ch.classList.contains('stagger-in')) put(ch, base); });
      } else {
        put(b, base);
        b.querySelectorAll('.chip-group .chip').forEach((c, j) => put(c, base + 70 + Math.min(j, 12) * 24));
      }
    });
  }
  const map = root.querySelector('.world-map-mount');
  if (map) map.classList.add('ob-map-in');
  put(root.querySelector('.ob-filler'), 380);
  root.querySelectorAll('.ob-tip-card').forEach((el, i) => put(el, 260 + i * 80));
  put(root.querySelector('.ob-nav'), 420);
}

/* «Щелчок» по выбранному варианту: после перерисовки онбординга находим только что
   включённый элемент и проигрываем на нём короткий пружинящий отклик + кольцо. */
function pickPop(selector) {
  requestAnimationFrame(() => {
    const el = document.querySelector(selector);
    if (!el || !(el.classList.contains('active'))) return;
    el.classList.remove('pick-pop'); void el.offsetWidth; el.classList.add('pick-pop');
  });
}

// Подстраховка для шага 0 ("Расскажи о своей учёбе") на десктопе: там
// больше всего полей (GPA, степень, 3 теста, специальность), и даже
// с компактными отступами (.ob-compact в styles.css) контент может не
// влезть по высоте на невысоких окнах/ноутбучных экранах — тогда вместо
// внутреннего скролла мы аккуратно уменьшаем всю колонку целиком (scale),
// чтобы страницу вообще не нужно было листать. На шагах 1-3 и на мобильном
// (там уже своя, более узкая, компоновка) ничего не трогаем.
function fitObStepZero() {
  const col = document.querySelector('.ob-card-col');
  const panel = document.querySelector('.ob-form-panel');
  if (!col || !panel) return;

  // Сбрасываем предыдущее масштабирование перед измерением — иначе
  // scrollHeight будет считаться уже от уменьшенной версии.
  col.style.transform = '';
  col.style.transformOrigin = '';
  col.style.height = '';
  col.style.marginBottom = '';

  if (state.obStep !== 0 || window.innerWidth < 981) return;

  const panelStyle = getComputedStyle(panel);
  const available = window.innerHeight - parseFloat(panelStyle.paddingTop) - parseFloat(panelStyle.paddingBottom);
  const natural = col.scrollHeight;

  if (natural > available && available > 0) {
    // Нижняя граница 0.78, чтобы на совсем маленьких окнах текст не
    // становился нечитаемым — дальше это уже крайний случай, а не
    // типичный десктоп, под который сделана эта подстройка.
    const scale = Math.max(available / natural, 0.78);
    col.style.transformOrigin = 'top center';
    col.style.transform = `scale(${scale})`;
    // transform не меняет фактически занимаемое место в потоке — сами
    // проставляем итоговую высоту и отрицательный отступ, чтобы под
    // уменьшенной колонкой не оставалось пустого места.
    col.style.height = (natural * scale) + 'px';
    col.style.marginBottom = (natural * scale - natural) + 'px';
  }
}

let obFitResizeBound = false;
function bindObFitResize() {
  if (obFitResizeBound) return;
  obFitResizeBound = true;
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(fitObStepZero, 120);
  });
}

function renderObFiller(s) {
  const ru = state.lang === 'ru';
  const items = {
    2: { label: ru ? 'На заметку' : 'Good to know',
         text: ru ? 'Подборка не попала? Любой ответ анкеты можно поменять — список пересоберётся сам.' : 'List feels off? Any answer can be changed — the list rebuilds itself.' },
    3: { label: ru ? 'Не сужай сразу' : 'Keep it open',
         text: ru ? 'Иногда лучший вариант — страна, о которой ты не думал.' : 'Sometimes the best option is a country you never considered.' },
    4: { label: ru ? 'Что дальше' : 'What is next',
         text: ru ? 'Дальше — свайпы: каждый лайк уточняет Match Score, вводить ничего не нужно.' : 'Next — swipes: every like refines Match Score, nothing to type.' }
  };
  const it = items[s];
  if (!it) return '';
  return `<div class="ob-filler">
    <div class="ob-filler-overlay">
      <div class="ob-filler-head">
        <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9.5 2.5a5 5 0 0 0-5.6 7L2.5 12l2.6-.7a5 5 0 1 0 4.4-8.8Z"/><path d="M6.5 7h.01M9 7h.01"/></svg>
        <span class="ob-filler-label">${typoDash(it.label)}</span>
      </div>
      <p>${typoDash(it.text)}</p>
    </div>
  </div>`;
}

function renderObTips(s) {
  const tipsByStep = state.lang === 'en' ? [
    [{ icon: 'graduation', text: 'GPA and test scores only feed Admission Reality — they never affect Match Score.' },
    { icon: 'refresh', text: 'You can change your major later; nothing you enter here is lost.' },
    { icon: 'target', text: 'Bachelor\'s, Master\'s and PhD each surface a different set of universities next.' }],
    [{ icon: 'scale', text: 'These are starting weights — the exact mix adapts to your swipes over time.' },
    { icon: 'coin', text: 'Going over budget doesn\'t exclude a school, it just lowers its Match Score.' },
    { icon: 'handshake', text: '"Not critical" on financial aid is a perfectly fine answer.' }],
    [{ icon: 'globe', text: 'You can pick more than one continent at once.' },
    { icon: 'pin', text: 'Picking countries narrows things further within a continent.' },
    { icon: 'unlock', text: 'Leave it empty if you\'re open to anywhere in the world.' }],
    [{ icon: 'undo', text: 'You can always come back and change any answer later.' },
    { icon: 'arrowRight', text: 'Next comes swiping — every like/dislike fine-tunes your Match Score.' },
    { icon: 'lockClosed', text: 'Guest data is saved automatically; registration is optional.' }],
  ] : [
    [{ icon: 'graduation', text: 'GPA и баллы тестов влияют только на Admission Reality — на Match Score они не влияют.' },
    { icon: 'refresh', text: 'Специальность можно поменять позже — ничего из введённого не пропадёт.' },
    { icon: 'target', text: 'Бакалавриат, магистратура и докторантура дальше показывают разные наборы вузов.' }],
    [{ icon: 'scale', text: 'Это стартовые веса — точные пропорции подстроятся под твои свайпы.' },
    { icon: 'coin', text: 'Вуз дороже бюджета не исключается, просто получает Match Score ниже.' },
    { icon: 'handshake', text: '«Не критично» по финансовой помощи — тоже нормальный ответ.' }],
    [{ icon: 'globe', text: 'Можно выбрать сразу несколько континентов.' },
    { icon: 'pin', text: 'Выбор стран сузит подборку внутри континента.' },
    { icon: 'unlock', text: 'Оставь пустым, если готов(а) рассматривать любую страну.' }],
    [{ icon: 'undo', text: 'В любой момент можно вернуться и поменять ответы.' },
    { icon: 'arrowRight', text: 'Дальше — свайпы: лайк/дизлайк уточняют Match Score под тебя.' },
    { icon: 'lockClosed', text: 'Гостевые данные сохраняются сами, регистрация не обязательна.' }],
  ];
  return tipsByStep[s].map(f => `<div class="ob-tip-card"><div class="icon">${ICONS[f.icon]}</div><p>${f.text}</p></div>`).join('');
}

function renderObSideFacts() {
  const facts = state.lang === 'en' ? [
    { icon: 'target', text: 'Preference Match ≠ Admission chances — we show both, separately, honestly.' },
    { icon: 'globe', text: `${TOTAL_UNIVERSITIES_COUNT} universities across ${Object.keys(CONTINENTS).length} continents in the catalog.` },
    { icon: 'dna', text: 'Your University DNA sharpens with every swipe — implicit feedback, not just a form.' }
  ] : [
    { icon: 'target', text: 'Match Score ≠ шансы на поступление — показываем оба честно и раздельно.' },
    { icon: 'globe', text: `${TOTAL_UNIVERSITIES_COUNT} университетов на ${Object.keys(CONTINENTS).length} континентах в каталоге.` },
    { icon: 'dna', text: 'ДНК-профиль становится точнее с каждым свайпом — он собирается по твоим действиям, а не по анкете.' }
  ];
  return facts.map(f => `<div class="ob-brand-fact"><div class="icon">${ICONS[f.icon]}</div><p>${f.text}</p></div>`).join('');
}

function chip(label, active, onclick) {
  return `<button type="button" class="chip ${active ? 'active' : ''}" onclick="${onclick}">${label}</button>`;
}

function renderTestRow(key) {
  const p = state.profile;
  const info = p.tests[key];
  const r = TEST_RANGES[key];
  return `<div class="test-row ${info.taken ? 'is-on' : ''}">
    <div class="test-row-head">
      <div class="test-row-id">
        <span class="test-row-icon test-mono tm-${key.toLowerCase()}">${TEST_MONO[key]}</span>
        <span class="test-row-name">${TEST_NAME[key] || key}</span>
      </div>
      <label class="switch">
        <input type="checkbox" ${info.taken ? 'checked' : ''} onchange="toggleTestTaken('${key}',this.checked)">
        <span class="switch-track"><span class="switch-thumb">${ICONS.check}</span></span>
      </label>
    </div>
    <p class="test-row-explain">${t(key.toLowerCase() + '_explain')}</p>
    ${info.taken ? `
      <div class="test-row-score-wrap">
        <div class="test-row-score">
          <input type="range" class="test-row-slider" min="${r.min}" max="${r.max}" step="${r.step}" value="${info.score}"
                 oninput="updateTestSlider('${key}',this.value)">
          <div class="test-row-score-val" id="val-test-${key}">${info.score}</div>
        </div>
        <div class="test-row-hint-row">
          <span class="test-row-hint">${r.hint}</span>
        </div>
        ${key === 'IELTS' ? `<p class="test-row-note">${t('ielts_hint')}</p>` : ''}
        ${key === 'EGE' ? `<p class="test-row-note">${t('ege_hint')}</p>` : ''}
      </div>
    ` : ``}
  </div>`;
}

// Реальная карта мира (d3 + topojson, world-atlas 110m). Т.к. весь #onboarding
// перерисовывается через innerHTML на каждое взаимодействие (renderOnboarding()),
// сама разметка карты — это просто пустой div-контейнер; сама отрисовка (SVG,
// подписи, обработчики кликов) происходит императивно в mountWorldMap(), которую
// renderOnboarding() вызывает следом за вставкой HTML в DOM (иначе <script>-логика
// внутри innerHTML просто не выполнится).
function renderWorldMap() {
  return `<div id="world-map-mount" class="world-map-mount"></div>`;
}

let worldAtlasPromise = null;
function getWorldAtlas() {
  if (!worldAtlasPromise) {
    worldAtlasPromise = d3.json('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json');
  }
  return worldAtlasPromise;
}

// Убирает мелкие острова из объединённой фигуры континента: оставляет только
// полигоны, чья площадь не меньше minRatio от площади самого большого полигона
// этого континента (материк + сопоставимые по размеру острова остаются,
// точечные архипелаги/островки — нет).
function pruneSmallPolygons(geometry, minRatio) {
  if (!geometry || geometry.type !== 'MultiPolygon') return geometry;
  const areas = geometry.coordinates.map(coords => Math.abs(d3.geoArea({ type: 'Polygon', coordinates: coords })));
  const maxArea = Math.max(...areas);
  const kept = geometry.coordinates.filter((_, i) => areas[i] >= maxArea * minRatio);
  return { type: 'MultiPolygon', coordinates: kept.length ? kept : geometry.coordinates };
}

function mountWorldMap() {
  const mount = document.getElementById('world-map-mount');
  if (!mount) return; // шаг онбординга уже сменился раньше, чем прогрузилась карта
  // Карта зависит от d3+topojson. Если на странице нет этих скриптов
  // (index.html их не подключает) или CDN недоступен — раньше на шаге
  // выбора страны просто появлялось пустое место, и казалось, что
  // «карта пропала». Теперь библиотеки догружаются сами, а при полном
  // отказе (адблок, оффлайн) рисуется фолбэк — кнопки континентов:
  // выбрать регион и пройти онбординг дальше можно ВСЕГДА.
  ensureMapLibs()
    .then(() => mountWorldMapSvg(mount))
    .catch(() => mountWorldMapFallback(mount));
}

/* Догрузка d3/topojson с CDN, если их нет на странице. typeof безопасен
   и при необъявленном идентификаторе. Промис падает только если скрипт
   реально не загрузился — тогда включается фолбэк. */
function ensureMapLibs() {
  const load = (src) => new Promise((res, rej) => {
    const sc = document.createElement('script');
    sc.src = src;
    sc.onload = res;
    sc.onerror = () => rej(new Error('script failed: ' + src));
    document.head.appendChild(sc);
  });
  const jobs = [];
  if (typeof d3 === 'undefined') jobs.push(load('https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js'));
  if (typeof topojson === 'undefined') jobs.push(load('https://cdn.jsdelivr.net/npm/topojson-client@3/dist/topojson-client.min.js'));
  return Promise.all(jobs);
}

/* Фолбэк: вместо карты — кнопки континентов (те же toggleContinent,
   что и клики по континентам на карте, состояние общее). */
function mountWorldMapFallback(mount) {
  if (!mount || !document.getElementById('world-map-mount')) return;
  mount.innerHTML = '<div class="map-fallback">' +
    Object.keys(MAP_COUNTRY_NAMES).map(k =>
      '<button type="button" class="map-fallback-btn' + (state.profile.continents.includes(k) ? ' selected' : '') +
      '" data-continent="' + k + '">' + contName(k) + '</button>'
    ).join('') + '</div>';
  mount.querySelectorAll('[data-continent]').forEach(b =>
    b.addEventListener('click', () => toggleContinent(b.getAttribute('data-continent'))));
}

function mountWorldMapSvg(mount) {
  // viewBox уменьшен относительно прежнего 860x520 (та же пропорция ~1.65:1):
  // при том же физическом размере контейнера это делает подписи, обводки и
  // чекмарки на карте крупнее, чтобы их было видно без приближения.
  mount.innerHTML = `<svg class="worldmap" viewBox="0 0 560 340" xmlns="http://www.w3.org/2000/svg"></svg>`;
  const svg = d3.select(mount).select('svg');
  const projection = d3.geoNaturalEarth1().fitExtent([[10, 10], [550, 330]], { type: 'Sphere' });
  const path = d3.geoPath(projection);

  getWorldAtlas().then(world => {
    if (!document.getElementById('world-map-mount')) return; // размонтировали, пока грузилось

    const features = topojson.feature(world, world.objects.countries).features;
    const geometries = world.objects.countries.geometries;
    const byContinent = {};
    Object.keys(MAP_COUNTRY_NAMES).forEach(k => byContinent[k] = []);
    const otherGeoms = [];

    geometries.forEach((geom, i) => {
      const name = features[i].properties.name;
      const key = Object.keys(MAP_COUNTRY_NAMES).find(k => MAP_COUNTRY_NAMES[k].includes(name));
      if (key) byContinent[key].push(geom); else otherGeoms.push(geom);
    });

    // Некликабельный фон — Антарктида и всё неклассифицированное, без внутренних границ.
    if (otherGeoms.length) {
      svg.append('path')
        .attr('class', 'other-land')
        .attr('d', path(topojson.merge(world, otherGeoms)))
        .attr('fill', getComputedStyle(document.documentElement).getPropertyValue('--surface-2').trim() || '#C9C6BA')
        .attr('stroke', getComputedStyle(document.documentElement).getPropertyValue('--surface').trim() || '#F1EFE6')
        .attr('stroke-width', 0.6)
        .attr('opacity', 0.5);
    }

    const p = state.profile;
    const suffix = t('map_universities_suffix');

    const continentData = Object.keys(MAP_COUNTRY_NAMES).map(key => {
      const merged = topojson.merge(world, byContinent[key]);
      const geometry = pruneSmallPolygons(merged, 0.02); // убираем мелкие острова
      const c = CONTINENTS[key];
      const selected = p.continents.includes(key);
      const count = REAL_CONTINENT_COUNTS[key] || 0;
      // Подпись — по фиксированной геоточке (см. CONTINENT_LABEL_ANCHORS), а не по
      // центроиду фигуры: для Европы (в неё входит вся Россия) центроид уезжал в Азию.
      const centroid = projection(CONTINENT_LABEL_ANCHORS[key]);
      return { key, geometry, c, selected, count, centroid };
    });

    // Проход 1: сначала заливки ВСЕХ континентов. Раньше заливка и подпись
    // рисовались вместе, континент за континентом — и, например, галочка
    // Африки (со смещением от центра) попадала в область, которую позже
    // перекрывала своей заливкой Азия, рисуемая следом. Теперь заливки идут
    // отдельным первым проходом.
    continentData.forEach(({ key, geometry, c, selected }) => {
      svg.append('path')
        .attr('class', 'continent' + (selected ? ' selected' : ''))
        .attr('d', path(geometry))
        .attr('fill', c.color)
        .on('click', () => toggleContinent(key));
    });

    // Проход 2: подписи, счётчики и галочки — поверх ВСЕХ заливок сразу,
    // так что ни одна из них больше не может быть перекрыта чужим континентом.
    continentData.forEach(({ key, c, selected, count, centroid }) => {
      const g = svg.append('g')
        .attr('class', 'continent-group' + (selected ? ' is-selected' : ''))
        .on('click', () => toggleContinent(key));

      // Название континента — прямо на карте, поверх его силуэта.
      g.append('text')
        .attr('class', 'continent-label')
        .attr('x', centroid[0])
        .attr('y', centroid[1] - 5)
        .attr('text-anchor', 'middle')
        .text(state.lang === 'ru' ? CONTINENT_RU[key] : c.name);

      g.append('text')
        .attr('class', 'continent-count')
        .attr('x', centroid[0])
        .attr('y', centroid[1] + 13)
        .attr('text-anchor', 'middle')
        .text(state.lang === 'ru' ? `${count} ${ruPlural(count, 'вуз', 'вуза', 'вузов')}` : `${count} ${suffix}`);

      const check = g.append('g')
        .attr('class', 'continent-check')
        .attr('transform', `translate(${centroid[0] + 46},${centroid[1] - 30})`);
      check.append('circle').attr('r', 13).attr('fill', '#fff');
      check.append('path')
        .attr('d', 'M-6,0 L-2,5 L6,-5')
        .attr('fill', 'none').attr('stroke', '#3B6B4A').attr('stroke-width', 3)
        .attr('stroke-linecap', 'round').attr('stroke-linejoin', 'round');
    });
  }).catch(() => mountWorldMapFallback(mount)); // атлас с CDN не загрузился (адблок/оффлайн)
}

function renderCountryPanel() {
  const p = state.profile;
  if (p.continents.length === 0) return '';
  let countries = [...new Set(p.continents.flatMap(k => REAL_COUNTRIES_BY_CONTINENT[k] || []))];
  return `<div class="country-panel">
    <h4>${t('country_refine')}</h4>
    <div class="chip-group">${countries.map(c => chip(cName(c), p.countries.includes(c), `toggleCountry('${c}')`)).join('')}</div>
  </div>`;
}

function toggleContinent(key) {
  const p = state.profile;
  const idx = p.continents.indexOf(key);
  if (idx > -1) p.continents.splice(idx, 1); else p.continents.push(key);
  // drop countries that no longer belong to a selected continent
  p.countries = p.countries.filter(c => p.continents.some(k => (REAL_COUNTRIES_BY_CONTINENT[k] || []).includes(c)));
  obPop = (idx === -1 && p.continents.length === 1) ? { type: 'country' } : null;
  renderOnboarding();
}
function toggleCountry(c) {
  const p = state.profile;
  const idx = p.countries.indexOf(c);
  if (idx > -1) p.countries.splice(idx, 1); else p.countries.push(c);
  renderOnboarding();
}
// Приводит size/setting/climate к массиву: поддерживает как новую схему
// (массив), так и старую (null / одиночная строка), которую может вернуть
// бэкенд или прежняя гостевая сессия.
function normalizeMultiSelect(v) {
  if (Array.isArray(v)) return v;
  if (v === null || v === undefined) return [];
  return [v];
}
function setChip(field, value) {
  // Мульти-select: size/setting/climate хранятся как массивы, чтобы можно
  // было отметить сразу несколько вариантов (например, и Small, и Large).
  const arr = state.profile[field];
  const idx = arr.indexOf(value);
  if (idx > -1) arr.splice(idx, 1); else arr.push(value);
  restoreScrollAround(renderOnboarding);
  pickPop(`[onclick="setChip('${field}','${value}')"]`);
}
function setAid(value) {
  state.profile.needsAid = state.profile.needsAid === value ? null : value;
  restoreScrollAround(renderOnboarding);
  pickPop(`[onclick="setAid(${value})"]`);
}
function updateProfile(field, value) {
  state.profile[field] = value;
}
function setMajor(value) {
  const arr = state.profile.majors;
  const idx = arr.indexOf(value);
  if (idx > -1) {
    // не даём снять последний выбранный вариант — всегда должна остаться
    // хотя бы одна специальность (иначе профиль/DNA-категория повиснут в воздухе)
    if (arr.length > 1) arr.splice(idx, 1);
  } else {
    arr.push(value);
  }
  pickPop(`[onclick="setMajor('${value}')"]`);
  // major — первая выбранная специальность, "основная": она одна уходит на
  // бэкенд (там пока только одно поле major) и определяет набор осей DNA.
  state.profile.major = arr[0];
  restoreScrollAround(renderOnboarding);
}
function setDegreeLevel(value) {
  state.profile.degreeLevel = value;
  restoreScrollAround(renderOnboarding);
  pickPop(`[onclick="setDegreeLevel('${value}')"]`);
}
function setMajorCategory(key) {
  state.obMajorCategory = key;
  restoreScrollAround(renderOnboarding);
  pickPop(`[onclick="setMajorCategory('${key}')"]`);
}
function toggleTestTaken(key, checked) {
  state.profile.tests[key].taken = checked;
  saveProfileExtras();
  obPop = checked ? { type: 'test', key } : null;
  restoreScrollAround(renderOnboarding);
}
function updateTestSlider(key, rawValue) {
  // Тот же паттерн, что и updateSlider() для GPA/research/budget: обновляем
  // state и только маленький текстовый лейбл со значением, не перерисовывая
  // всю форму — иначе перетаскивание ползунка дёргалось бы на каждый шаг.
  const r = TEST_RANGES[key];
  const v = key === 'IELTS' ? parseFloat(rawValue) : parseInt(rawValue, 10);
  state.profile.tests[key].score = v;
  saveProfileExtras();
  const el = document.getElementById('val-test-' + key);
  if (el) el.textContent = v;
}
function updateSlider(field, rawValue, displayId, formatFn) {
  // update state + only the small value label, so dragging the range input never gets interrupted by a full re-render
  const value = field === 'gpa' ? parseFloat(rawValue) : parseInt(rawValue);
  state.profile[field] = value;
  const el = document.getElementById(displayId);
  if (el) el.textContent = formatFn(rawValue);
}

/* ---------- Слайдеры: заливка трека до ползунка ----------
   У каждого input[type=range] градиентный фон рисуется через CSS-переменную
   --fill (процент заполнения). paintRange() считает её от min/max/value,
   paintAllRanges() красит все слайдеры на экране после перерисовки innerHTML,
   а делегированный слушатель 'input' в init() обновляет заливку на лету —
   поэтому сами inline-обработчики (updateSlider и т.п.) трогать не нужно. */
function paintRange(el) {
  if (!el || el.type !== 'range') return;
  const min = parseFloat(el.min), max = parseFloat(el.max);
  if (!isFinite(min) || !isFinite(max) || max <= min) return;
  const v = Math.min(max, Math.max(min, parseFloat(el.value) || min));
  el.style.setProperty('--fill', ((v - min) / (max - min) * 100).toFixed(2) + '%');
}
function paintAllRanges(root) {
  (root || document).querySelectorAll('input[type=range]').forEach(paintRange);
}
function obNext() { if (state.obStep < 4) state.obStep++; renderOnboarding(); }
function obBack() { if (state.obStep > 0) state.obStep--; renderOnboarding(); }

async function finishOnboarding() {
  let user;
  try {
    user = await apiSaveProfile(); // POST /users — создаёт (или обновляет) пользователя на бэке
    state.userId = user.id;
    state.guestId = user.guestId;
    state.isRegistered = user.isRegistered;
    state.email = user.email;
    saveGuestSession();
  } catch (e) {
    // Бэкенд недоступен — переключаемся на Discover в гостевом режиме,
    // чтобы пользователь не застревал на онбординге.
    state.userId = null;
    saveGuestSession();
  }

  // Профиль на бэке уже создан — переключаемся на Discover сразу, показывая skeleton-карточки,
  // а не ждём ответа GET /universities вслепую на экране онбординга. На бесплатном тарифе
  // Render бэкенд может "просыпаться" 10-30 секунд, и без этого пользователь решит, что кнопка
  // онбординга просто не сработала.
  state.deckLoading = true;
  document.getElementById('onboarding').classList.add('hidden');
  document.getElementById('mainapp').classList.remove('hidden');
  state.screen = 'discover';
  renderApp();

  try {
    await buildDeck();
  } catch (e) {
    // apiRequest уже показал toast; оставляем skeleton не зависшим навечно — просто
    // выключаем состояние загрузки, deck.length останется 0 и покажется deck-empty.
  }
  state.deckLoading = false;
  renderApp();
}

function restartOnboarding() {
  if (!confirm(t('restart_confirm'))) return;
  try { lsRemove(GUEST_KEY); } catch (e) { }
  try { lsRemove(TRACKER_KEY); } catch (e) { }
  const keepLang = state.lang;
  state = {
    screen: 'discover', obStep: 0, obMajorCategory: 'cs', lang: keepLang, guestId: generateGuestId(), userId: null, isRegistered: false, email: null,
    profile: { gpa: 3.6, tests: { SAT: { taken: true, score: 1350 }, ACT: { taken: false, score: 30 }, IELTS: { taken: false, score: 7 }, TOEFL: { taken: false, score: 95 }, DET: { taken: false, score: 120 }, IB: { taken: false, score: 36 }, EGE: { taken: false, score: 250 } }, homeCountry: '', nativeLang: '', major: 'Computer Science', majors: ['Computer Science'], degreeLevel: 'bachelor', size: [], setting: [], climate: [], research: 3, budget: 40000, needsAid: null, continents: [], countries: [] },
    deck: [], liked: [], disliked: [], uniCache: {}, currentUniId: null, activeTab: 'overview', matchFilter: 'all', recentPasses: [], trackerView: 'tracker', trackerExpanded: new Set(), uniLookupPending: false
  };
  document.getElementById('mainapp').classList.add('hidden');
  document.getElementById('onboarding').classList.remove('hidden');
  renderOnboarding();
}

/* ============================================================
   MAIN APP SHELL
   ============================================================ */
/* «Оболочка» приложения внутри #mainapp. В эталонном index.html она
   статическая (<aside id="sidebar"> + <main id="content"> + paywall-root),
   но попадаются index.html без неё — и тогда renderSidebar падал на
   null.innerHTML сразу после онбординга: mainapp открывался ПУСТЫМ
   («проект не открывается», «не появляются выбор/подай/понравившиеся»).
   Здесь недостающие контейнеры создаются сами — приложение работает
   с любым index.html. */
function ensureAppShell() {
  const main = document.getElementById('mainapp');
  if (!main) return;
  // ВАЖНО: оформление панели и контента в styles.css привязано к КЛАССАМ
  // (.sidebar / .content), а не к id — создаём элементы сразу с классами,
  // иначе оболочка будет работать, но без стилей (панель без фона и ширины).
  if (!document.getElementById('sidebar')) {
    const sb = document.createElement('aside');
    sb.id = 'sidebar';
    sb.className = 'sidebar';
    main.appendChild(sb);
  }
  if (!document.getElementById('content')) {
    const c = document.createElement('main');
    c.id = 'content';
    c.className = 'content';
    main.appendChild(c);
  }
  if (!document.getElementById('paywall-root')) {
    const p = document.createElement('div');
    p.id = 'paywall-root';
    main.appendChild(p);
  }
}

function renderApp() {
  ensureAppShell();
  renderSidebar();
  if (state.screen === 'discover') renderDiscover();
  else if (state.screen === 'matches') renderMatches();
  else if (state.screen === 'tracker') renderTracker();
  else if (state.screen === 'university') renderUniversityDetail();
  else if (state.screen === 'dna') renderDNA();
  else if (state.screen === 'account') renderAccount();
  else if (state.screen === 'premium') renderPremium();
  injectPremiumPill();
  const paywallRoot = document.getElementById('paywall-root');
  if (paywallRoot) paywallRoot.innerHTML = paywallModalHtml();
  paintAllRanges(document.getElementById('content'));
}

function go(screen) {
  if (screen === 'tracker') trackerEnter = true;
  if (screen === 'premium') premiumEnter = true;
  state.screen = screen; renderApp(); window.scrollTo(0, 0);
}

function renderSidebar() {
  const items = [
    { id: 'discover', label: t('nav_discover'), short: state.lang === 'ru' ? 'Подбор' : 'Discover', icon: ICONS.discover },
    { id: 'matches', label: t('nav_matches'), short: state.lang === 'ru' ? 'Лайки' : 'Matches', icon: ICONS.matches },
    { id: 'tracker', label: t('nav_tracker'), short: state.lang === 'ru' ? 'Заявки' : 'Apps', icon: ICONS.clipboard },
    { id: 'dna', label: t('nav_dna'), short: 'DNA', icon: ICONS.dna },
  ];
  const p = state.profile;
  const pmItem = `<button class="nav-item nav-premium ${state.screen === 'premium' ? 'active' : ''}" onclick="go('premium')">${ICONS.spark}<span>Premium</span>${state.isPremium ? `<i class="nav-pm-on">${ICONS.check}</i>` : '<i class="nav-pm-dot"></i>'}</button>`;
  const pmCard = false ? `<button class="sb-pm-card" onclick="go('premium')">
      <span class="sb-pm-ico">${ICONS.spark}</span>
      <span class="sb-pm-text"><b>${premiumNavHint()}</b><small>${t('sb_pm_cta')}</small></span>
    </button>` : '';
  const statusLine = state.isRegistered
    ? t('account_line', state.email)
    : t('guest_line', state.guestId ? state.guestId.slice(0, 10) : '');
  document.getElementById('sidebar').innerHTML = `
    <div class="logo" onclick="backToLanding()" style="cursor:pointer;" title="${state.lang === 'ru' ? 'Вернуться на главную' : 'Back to home'}"><div class="logo-mark">${ICONS.logo}</div><div class="logo-text">Admitly</div></div>
    ${items.map(it => `<button class="nav-item ${state.screen === it.id ? 'active' : ''}" onclick="go('${it.id}')">${it.icon}<span><b class="nl-f">${it.label}</b><b class="nl-s">${it.short}</b></span></button>`).join('')}
    ${pmItem}
    <button class="nav-item mobile-only-tab ${state.screen === 'account' ? 'active' : ''}" onclick="go('account')">${ICONS.user}<span>${t('nav_account')}</span></button>
    <button class="nav-item" onclick="backToLanding()">${ICONS.back}<span>${state.lang === 'ru' ? 'Главная' : 'Home'}</span></button>
    <div class="sidebar-foot">
      ${pmCard}
      <div class="sidebar-foot-row">
        ${langSwitcher()}
        ${themeSwitcher()}
      </div>
      <div class="mini-profile">
        <div class="avatar"></div>
        <div>
          <div class="mini-profile-name">${majorsLabel(p.majors)}</div>
          <div class="mini-profile-sub">${t('degree_' + p.degreeLevel)} · ${statusLine}</div>
          <div class="mini-profile-sub2">${t('strength_label')}: ${academicStrength(p)}/100${(!p.tests.SAT.taken && !p.tests.ACT.taken) ? ' (GPA only)' : ''}</div>
        </div>
      </div>
      ${!state.isRegistered
        ? `<button class="lp-btn lp-btn-primary sidebar-register-btn" onclick="showLoginScreen('register')">${t('auth_to_register')}</button>`
        : `<button class="lp-btn lp-btn-ghost sidebar-register-btn" onclick="logoutUser()">${t('auth_logout_btn')}</button>`}
    </div>`;
}

// Состояние формы на вкладке "Профиль" — отдельное от authState полноэкранного
// /login, чтобы ошибка/спиннер здесь не задевали оверлей логина (и наоборот),
// если оба когда-нибудь окажутся в DOM одновременно.
let accountAuthState = { submitting: false, error: null };

async function submitAccountRegister(e) {
  e.preventDefault();
  if (accountAuthState.submitting) return;
  const email = document.getElementById('account-email-input').value.trim();
  const password = document.getElementById('account-password-input').value;
  if (!email || !password) return;

  accountAuthState.submitting = true;
  accountAuthState.error = null;
  renderAccount();

  try {
    const user = await apiAuthRegister(email, password);
    state.guestId = user.guestId || state.guestId;
    await loadSessionForUser(user.id);
  } catch (err) {
    accountAuthState.submitting = false;
    accountAuthState.error = err.message || t('auth_error_generic');
    renderAccount();
  }
}

function toggleAccountPasswordVisibility() {
  const input = document.getElementById('account-password-input');
  const btn = document.getElementById('account-pw-toggle-btn');
  const show = input.type === 'password';
  input.type = show ? 'text' : 'password';
  btn.innerHTML = show ? ICONS.unlock : ICONS.lockClosed;
}

/* ---------- "Профиль" на мобильном ----------
   Раньше это был отдельный bottom sheet поверх текущего экрана — открывался
   и закрывался иначе, чем остальные вкладки (Discover/Matches/Tracker/DNA),
   которые просто меняют #content через go(screen). Теперь "Профиль" —
   такая же вкладка: go('account') → renderApp() → renderAccount() ниже,
   без отдельного оверлея/анимации снизу.

   Раньше незарегистрированный гость видел здесь только одну кнопку
   "Зарегистрироваться" в пустом auth-box — по сути кнопку в никуда, без
   намёка на то, что произойдёт после клика. Теперь та же самая форма
   (email + пароль + соцкнопки), что и на полноэкранном /login — просто
   встроенная прямо в вкладку, а не за отдельным переходом. */
function renderAccount() {
  const p = state.profile;
  const statusLine = state.isRegistered
    ? t('account_line', state.email)
    : t('guest_line', state.guestId ? state.guestId.slice(0, 10) : '');
  const strengthLine = `${t('strength_label')}: ${academicStrength(p)}/100${(!p.tests.SAT.taken && !p.tests.ACT.taken) ? ' (GPA only)' : ''}`;
  const guestForm = `
        <div class="auth-card" style="margin-bottom:18px;">
          <form onsubmit="submitAccountRegister(event)">
            ${accountAuthState.error ? `<div class="auth-error">${ICONS.info}<span>${accountAuthState.error}</span></div>` : ''}
            <div class="auth-field">
              <input id="account-email-input" type="email" autocomplete="email" placeholder="${t('auth_email_ph')}" required>
            </div>
            <div class="auth-field has-toggle">
              <input id="account-password-input" type="password" autocomplete="new-password" placeholder="${t('auth_password_ph')}" required minlength="6">
              <button type="button" class="auth-pw-toggle" id="account-pw-toggle-btn" onclick="toggleAccountPasswordVisibility()" aria-label="toggle password visibility">${ICONS.lockClosed}</button>
            </div>
            <button type="submit" class="lp-btn lp-btn-primary auth-submit" ${accountAuthState.submitting ? 'disabled' : ''}>
              ${accountAuthState.submitting ? t('auth_submitting') : t('auth_submit_register')}
            </button>
          </form>
          <div class="auth-social-divider"><span>${t('auth_or')}</span></div>
          <div class="auth-social-row">
            <button type="button" class="auth-social-btn auth-social-google" aria-label="Google" title="Google" onclick="socialAuthClick('Google')">${ICONS.google}</button>
            <button type="button" class="auth-social-btn auth-social-yandex" aria-label="Яндекс ID" title="Яндекс ID" onclick="socialAuthClick('Яндекс ID')">${ICONS.yandex}</button>
            <button type="button" class="auth-social-btn auth-social-telegram" aria-label="Telegram" title="Telegram" onclick="socialAuthClick('Telegram')">${ICONS.telegram}</button>
          </div>
        </div>
        <div class="auth-switch" style="margin-bottom:18px;">${t('auth_have_account')} <button onclick="showLoginScreen('login')">${t('auth_to_login')}</button></div>`;
  document.getElementById('content').innerHTML = `
    <div class="content-header">
      <div><h1 class="content-title">${t('nav_account')}</h1></div>
    </div>
    <div class="auth-stage" style="min-height:55vh;padding:24px 20px;">
      <div class="auth-box">
        <div class="auth-mark">${ICONS.user}</div>
        <h1 class="auth-title">${majorsLabel(p.majors)}</h1>
        <p class="auth-sub">${t('degree_' + p.degreeLevel)} · ${statusLine}<br>${strengthLine}</p>
        ${!state.isRegistered ? guestForm : ''}
        ${premiumStatusBlockHtml()}
        <div class="sidebar-foot-row account-lang-theme-row" style="justify-content:center;gap:20px;margin-bottom:14px;">
          ${langSwitcher()}
          ${themeSwitcher()}
        </div>
        <button class="restart-btn" style="width:100%;" onclick="restartOnboarding()">${t('restart')}</button>
      </div>
    </div>`;
}

/* ---------- Premium status (демо, без биллинга — см. main.py) ---------- */
function premiumStatusBlockHtml() {
  const features = [t('premium_feat_sim'), t('premium_feat_pdf'), t('premium_feat_calendar'), t('premium_feat_share')];
  const featureList = `<ul class="premium-feature-list">${features.map(f => `<li>${ICONS.check}<span>${f}</span></li>`).join('')}</ul>`;

  if (state.isPremium) {
    return `
      <div class="premium-card premium-card-active">
        <div class="premium-card-top">
          <div class="premium-card-icon">${ICONS.unlock}</div>
          <div>
            <h4>${t('premium_active_title')} <span class="premium-pill">DEMO</span></h4>
            <p class="premium-card-sub">${t('premium_active_desc')}</p>
          </div>
        </div>
        ${featureList}
        <button class="premium-demo-link" onclick="devRevokePremium()">${t('premium_demo_revoke')}</button>
      </div>`;
  }
  return `
    <div class="premium-card">
      <div class="premium-card-top">
        <div class="premium-card-icon">${ICONS.lock}</div>
        <div>
          <h4>${t('premium_free_title')}</h4>
          <p class="premium-card-sub">${t('premium_season_sub')}</p>
        </div>
      </div>
      ${featureList}
      <button class="lp-btn lp-btn-primary premium-card-cta" onclick="go('premium')">${t('paywall_more')}</button>
    </div>`;
}


function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => t.classList.remove('show'), 1800);
}

/* ---------- Privacy / Terms — простая модалка вместо мёртвых ссылок в футере.
   Это студенческий демо-проект, а не юридический документ: короткий, честный
   текст о том, какие данные собираются и как используются, вместо страницы-
   заглушки "скоро будет" или битой ссылки. ---------- */
const LEGAL = {
  privacy: {
    ru: {
      title: 'Конфиденциальность',
      body: `<p>Admitly — учебный демо-проект (портфолио для поступления в университет), а не коммерческий сервис.</p>
             <p>Что сохраняется: анкета онбординга (GPA, баллы тестов, предпочтения) и свайпы — на сервере проекта, привязаны к случайному ID устройства, без пароля и без email, если ты сам его не указал.</p>
             <p>Данные не продаются и не передаются третьим лицам. Используются только для расчёта Match Score и Admission Reality внутри самого приложения.</p>
             <p>Если хочешь, чтобы твои данные удалили — напиши на <a href="mailto:vanya.medvedev.11.00@mail.ru">vanya.medvedev.11.00@mail.ru</a>.</p>`
    },
    en: {
      title: 'Privacy',
      body: `<p>Admitly is a student demo project (a college-application portfolio piece), not a commercial service.</p>
             <p>What's stored: your onboarding profile (GPA, test scores, preferences) and swipes — on the project's server, tied to a random device ID, no password or email unless you provide one.</p>
             <p>Data isn't sold or shared with third parties. It's used only to calculate Match Score and Admission Reality inside the app itself.</p>
             <p>Want your data deleted? Email <a href="mailto:vanya.medvedev.11.00@mail.ru">vanya.medvedev.11.00@mail.ru</a>.</p>`
    }
  },
  terms: {
    ru: {
      title: 'Условия использования',
      body: `<p>Admitly создан как учебный проект и демонстрация навыков — используй его на свой страх и риск.</p>
             <p>Match Score и Admission Reality — оценочные модели на демо-данных, а не гарантия поступления или отказа. Итоговое решение всегда принимает приёмная комиссия конкретного вуза.</p>
             <p>Сервис может быть недоступен, изменён или отключён в любой момент без предупреждения — это учебный, а не production-проект.</p>`
    },
    en: {
      title: 'Terms of Use',
      body: `<p>Admitly is a student project and skills demonstration — use it at your own discretion.</p>
             <p>Match Score and Admission Reality are estimate models built on demo data, not a guarantee of admission or rejection. The final decision always belongs to each university's admissions office.</p>
             <p>The service may be unavailable, changed, or taken down at any time without notice — this is a learning project, not a production service.</p>`
    }
  }
};

function openLegal(kind) {
  const lang = (state && state.lang === 'en') ? 'en' : 'ru';
  const entry = LEGAL[kind][lang];
  let modal = document.getElementById('legalModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'legalModal';
    modal.className = 'legal-modal';
    modal.innerHTML = `<div class="legal-modal-card">
        <button class="legal-modal-close" onclick="closeLegal()" aria-label="Close">${ICONS.x}</button>
        <h3 id="legalModalTitle"></h3>
        <div id="legalModalBody" class="legal-modal-body"></div>
      </div>`;
    modal.addEventListener('click', (e) => { if (e.target === modal) closeLegal(); });
    document.body.appendChild(modal);
  }
  modal.querySelector('#legalModalTitle').textContent = entry.title;
  modal.querySelector('#legalModalBody').innerHTML = entry.body;
  modal.classList.add('open');
}
function closeLegal() {
  const modal = document.getElementById('legalModal');
  if (modal) modal.classList.remove('open');
}

/* ---------- Scroll-reveal: элементы с классом .reveal плавно проявляются,
   когда докручиваешь до них — используется на странице университета и в DNA ---------- */
// Мягкое появление подписей на лендинге: проявление + лёгкое размытие + подъём.
// Класс .in вешается один раз, когда элемент входит в экран.
function initLpSoftReveal() {
  const els = document.querySelectorAll('.lp-soft:not(.in)');
  if (!els.length) return;
  if (!('IntersectionObserver' in window)) { els.forEach(el => el.classList.add('in')); return; }
  const io = new IntersectionObserver((entries) => {
    entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
  }, { threshold: 0.35, rootMargin: '0px 0px -8% 0px' });
  els.forEach(el => io.observe(el));
}

function initScrollReveal() {
  const els = document.querySelectorAll('.reveal:not(.is-visible)');
  if (!els.length) return;
  if (!('IntersectionObserver' in window)) {
    els.forEach(el => el.classList.add('is-visible'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -30px 0px' });
  els.forEach(el => io.observe(el));
}

// Цитаты в .lp-pain-card "печатаются" при появлении карточки — тот же
// .reveal/.is-visible на родителе двигает .lp-pain-card, а тут отдельно
// анимируем ширину текста внутри (0 -> полная ширина, ступенчато, как
// у печатной машинки). scrollWidth снимаем один раз сразу после рендера:
// он у span с overflow:hidden всё равно равен полной ширине контента,
// несмотря на схлопнутый CSS-width — так по одному числу на карточку
// вместо константы под конкретный текст (текст меняется по языку).
function initLpPainTypewriter() {
  // Typewriter на тач-устройствах отключаем — «печатающая» строка в
  // карточках болей на мобильном только отвлекает и тормозит первый рендер.
  if (window.matchMedia('(pointer: coarse)').matches) {
    document.querySelectorAll('.lp-pain-item .type').forEach(el => el.classList.add('done'));
    return;
  }
  document.querySelectorAll('.lp-pain-item .type').forEach(el => {
    const full = el.scrollWidth;
    if (!full) return;
    const steps = Math.max(10, Math.min(34, el.textContent.trim().length));
    el.style.setProperty('--tw', full + 'px');
    el.style.transitionDuration = Math.min(1300, steps * 42) + 'ms';
    el.style.transitionTimingFunction = `steps(${steps}, end)`;
    // Курсор-каретка (border-right) должен мигать только пока идёт "печать".
    // Раньше border-right + бесконечный keyframe оставались навсегда даже
    // после того, как ширина уже доехала до --tw — на скрине это выглядело
    // как мусорная вертикальная чёрточка после закрывающей кавычки у всех
    // трёх карточек сразу. transitionend от самого width — самый надёжный
    // сигнал "печать закончилась" (не завязан на фиксированный таймаут).
    el.addEventListener('transitionend', (e) => {
      if (e.propertyName === 'width') el.classList.add('done');
    });
  });
}

/* ---------- Progress-bar / count-up / radar draw-in animations —
   портированы из animation-demo.html: раньше проценты и радар появлялись
   мгновенно, скачком; теперь Match Score "накручивается", бары едут плавно,
   а контур радара DNA дорисовывается, а не появляется весь сразу. ---------- */
function animateBars(root) {
  const bars = (root || document).querySelectorAll('.bar-fill[data-target]');
  bars.forEach(bar => {
    const target = parseFloat(bar.dataset.target) || 0;
    // rAF нужен, чтобы браузер успел отрисовать width:0% до того, как мы
    // поставим целевое значение — иначе CSS transition не увидит перехода.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => { bar.style.width = target + '%'; });
    });
  });
}

function animateScoreCounters(root) {
  const nodes = (root || document).querySelectorAll('.score-count[data-target], .lp-count[data-target]');
  nodes.forEach(node => {
    const target = parseInt(node.dataset.target, 10) || 0;
    const suffix = node.dataset.suffix !== undefined ? node.dataset.suffix : '%';
    // Большие числа (12,000+) — форматируем с запятой, чтобы не выглядело как
    // «сырой» счётчик (12000+ → 12,000+). Чистая честная анимация, без AI-слопа.
    const format = (n) => n >= 1000 ? n.toLocaleString('en-US') : String(n);
    const duration = 900;
    const start = performance.now();
    let hasAnimated = false;
    // Счётчик не должен перезапускаться каждый раз при перерендере (renderDiscover
    // перерисовывает DOM), поэтому стартуем только один раз через класс-маркер.
    if (node.dataset.counted === '1') return;
    node.dataset.counted = '1';
    function frame(now) {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      node.textContent = format(Math.round(eased * target)) + suffix;
      if (p < 1) requestAnimationFrame(frame);
      else { node.textContent = format(target) + suffix; hasAnimated = true; }
    }
    requestAnimationFrame(frame);
    void hasAnimated;
  });
}

function animateRadar(root) {
  const shapes = (root || document).querySelectorAll('.dna-radar-shape');
  shapes.forEach(shape => {
    // Пропускаем фигуры в скрытых контейнерах (например, мокап DNA в скрытом
    // лендинге): getTotalLength() на нерендерящемся SVG бросает InvalidStateError.
    if (!shape.getClientRects().length) return;
    const len = shape.getTotalLength();
    shape.style.transition = 'none';
    shape.style.strokeDasharray = len;
    shape.style.strokeDashoffset = len;
    shape.style.fillOpacity = 0;
    // форсируем reflow, чтобы браузер зафиксировал стартовое состояние
    // до того, как мы включим transition и подвинем конечные значения
    shape.getBoundingClientRect();
    requestAnimationFrame(() => {
      shape.style.transition = 'stroke-dashoffset 1.1s cubic-bezier(.16,1,.3,1), fill-opacity 1.1s ease .25s';
      shape.style.strokeDashoffset = 0;
      shape.style.fillOpacity = 1;
    });
  });
}

/* ============================================================
   DISCOVER / SWIPE
   ============================================================ */
/* Названия стран для русского интерфейса. Внутри данных страны хранятся по-английски. */
const COUNTRY_RU = {"Argentina": "Аргентина", "Australia": "Австралия", "Austria": "Австрия", "Belgium": "Бельгия", "Brazil": "Бразилия", "Canada": "Канада", "Chile": "Чили", "China": "Китай", "Colombia": "Колумбия", "Czech Republic": "Чехия", "Denmark": "Дания", "Egypt": "Египет", "Estonia": "Эстония", "Finland": "Финляндия", "France": "Франция", "Germany": "Германия", "Ghana": "Гана", "Hong Kong": "Гонконг", "India": "Индия", "Indonesia": "Индонезия", "Ireland": "Ирландия", "Israel": "Израиль", "Italy": "Италия", "Japan": "Япония", "Kazakhstan": "Казахстан", "Kenya": "Кения", "Lebanon": "Ливан", "Lithuania": "Литва", "Malaysia": "Малайзия", "Mexico": "Мексика", "Morocco": "Марокко", "Netherlands": "Нидерланды", "New Zealand": "Новая Зеландия", "Norway": "Норвегия", "Philippines": "Филиппины", "Poland": "Польша", "Portugal": "Португалия", "Russia": "Россия", "Saudi Arabia": "Саудовская Аравия", "Singapore": "Сингапур", "South Africa": "ЮАР", "South Korea": "Южная Корея", "Spain": "Испания", "Sweden": "Швеция", "Switzerland": "Швейцария", "Taiwan": "Тайвань", "Thailand": "Таиланд", "Turkey": "Турция", "UAE": "ОАЭ", "UK": "Великобритания", "USA": "США", "Uganda": "Уганда", "Vietnam": "Вьетнам"};
function cName(c) { return (state && state.lang === 'ru' && COUNTRY_RU[c]) || c; }

/* Skeleton-заглушка для .hero-card-stack на время GET /universities (finishOnboarding /
   init для вернувшегося пользователя) — повторяет геометрию реальной .hero-card 1:1,
   чтобы при подмене на настоящие данные не было прыжка layout. */
function deckSkeletonHtml(count = 2) {
  return Array.from({ length: count }).map((_, i) => {
    const fromTop = count - 1 - i;
    return `<div class="hero-card skeleton-card" style="z-index:${i}; transform:scale(${0.96 + i * 0.02}) translateY(${fromTop * -8}px);">
      <div class="hero-card-photo skeleton-block shimmer"></div>
      <div class="hero-card-content">
        <div class="skeleton-block shimmer skeleton-line skeleton-title" style="background:rgba(244,242,230,.16);"></div>
        <div class="skeleton-block shimmer skeleton-line skeleton-loc" style="background:rgba(244,242,230,.16);"></div>
        <div class="hero-stat-row">
          <div class="skeleton-block shimmer skeleton-stat" style="background:rgba(244,242,230,.16);"></div>
          <div class="skeleton-block shimmer skeleton-stat" style="background:rgba(244,242,230,.16);"></div>
          <div class="skeleton-block shimmer skeleton-stat" style="background:rgba(244,242,230,.16);"></div>
        </div>
      </div>
    </div>`;
  }).join('');
}

/* Единственный источник правды по "второстепенным" панелям Discover (легенда,
   фильтры, профиль, чеклист, matches, how-it-works, DNA, активность, совет по
   эссе, недавние пропуски) — раньше это было 8 карточек в 3 колонках вокруг
   деки; теперь это содержимое выезжающей панели (см. .hero-panel), а на
   основном экране остаётся только сама карточка вуза. */
function discoverPanelHtml() {
  return `
    <div class="panel-card">
      <h4>${t('legend_title')}</h4>
      <div class="legend-row"><span class="legend-dot" style="background:var(--brand-dislike);"></span><div><div class="n">Reach</div><div class="d">${t('legend_reach')}</div></div></div>
      <div class="legend-row"><span class="legend-dot" style="background:var(--brand-target);"></span><div><div class="n">Target</div><div class="d">${t('legend_target')}</div></div></div>
      <div class="legend-row"><span class="legend-dot" style="background:var(--brand-like);"></span><div><div class="n">Likely</div><div class="d">${t('legend_likely')}</div></div></div>
    </div>
    <div class="panel-card">
      <h4>${t('filters_title')}</h4>
      <div class="chip-group">${Object.keys(CONTINENTS).map(k => chip(contName(k), state.profile.continents.includes(k), `toggleDiscoverContinent('${k}')`)).join('')}</div>
      <div class="filter-budget-row">
        <label class="filter-budget-label">${t('budget_kv')}: <b id="discover-budget-val">${fmtMoney(state.profile.budget)}</b></label>
        <input type="range" min="5000" max="80000" step="1000" value="${state.profile.budget}"
          oninput="document.getElementById('discover-budget-val').textContent=fmtMoney(this.value)"
          onchange="setDiscoverBudget(this.value)">
      </div>
    </div>
    <div class="panel-card">
      <h4>${t('your_profile_short')}</h4>
      <div class="legend-row"><div><div class="n">${majorsLabel(state.profile.majors)}</div><div class="d">${t('degree_' + state.profile.degreeLevel)} · GPA ${state.profile.gpa}</div></div></div>
      <button class="restart-btn" style="width:100%;margin-top:8px;" onclick="restartOnboarding()">${t('edit_profile_link')}</button>
    </div>`;
}

function toggleDiscoverPanel(forceVal) {
  state.discoverPanelOpen = (forceVal !== undefined) ? forceVal : !state.discoverPanelOpen;
  renderDiscover();
}

function renderDiscover() {
  const deck = state.deck;
  let cardsHtml = '';
  if (state.deckLoading) {
    cardsHtml = deckSkeletonHtml(2);
  } else if (deck.length === 0) {
    cardsHtml = `<div class="deck-empty">
        <svg class="empty-illustration" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="9"/><path d="M9 10h.01M15 10h.01M9 15c1 1 5 1 6 0"/></svg>
        <h3>${t('deck_empty_title')}</h3>
        <p>${t('deck_empty_body')}</p>
        <button class="btn btn-primary" onclick="go('matches')" style="margin-top:10px;">${t('view_matches')}</button>
        ${(state.swipeHistory || []).length ? `<button class="btn btn-ghost" onclick="undoSwipe()" style="margin-top:6px;">${ICONS.undo} ${state.lang === 'ru' ? 'Вернуть прошлую карточку' : 'Undo last swipe'}</button>` : ''}
      </div>`;
  } else {
    const visible = deck.slice(0, 3).reverse();
    cardsHtml = visible.map((u, i) => {
      const isTop = (i === visible.length - 1);
      return `<div class="hero-card${isTop && state.returningId === u.id ? ' is-returning' : ''}" id="card-${u.id}" style="z-index:${i}; transform:scale(${0.96 + i * 0.02}) translateY(${(visible.length - 1 - i) * -8}px);">
        <div class="hero-card-photo uni-visual-host">
          ${uniVisual(u)}
        </div>
        <div class="hero-card-scrim"></div>
        <div class="hero-badge badge-${u._reality}">${state.lang === 'ru' ? 'Шанс' : 'Chance'}: ${chanceLabel(u._reality)}</div>
        ${isTop ? `<div class="swipe-stamp like" id="stamp-like">LIKE</div><div class="swipe-stamp nope" id="stamp-nope">NOPE</div>` : ''}
        <div class="hero-card-content">
          <h3>${u.name}</h3>
          <p class="hero-card-loc"><span class="loc-icon">${ICONS.pin}</span>${u.city}, ${cName(u.country)}${uniFactsLine(u) ? ' · ' + uniFactsLine(u) : ''}</p>
          <p class="hero-card-tagline">${uniTagline(u)}</p>
          <ul class="hero-card-points">
            ${quickTakeaway(u).plus.map(p => `<li class="qt-plus">${ICONS.check}<span>${typoDash(p)}</span></li>`).join('')}
            ${quickTakeaway(u).minus.map(m => `<li class="qt-minus">${ICONS.x}<span>${typoDash(m)}</span></li>`).join('')}
          </ul>
          <div class="hero-stat-row">
            <div class="hero-stat"><div class="v">${u._match}%</div><div class="l">${state.lang === 'ru' ? 'Совпадение' : 'Match'}</div></div>
            <div class="hero-stat"><div class="v">${chanceLabel(u._reality)}</div><div class="l">${state.lang === 'ru' ? 'Шанс' : 'Chance'}</div></div>
            <div class="hero-stat"><div class="v">${Math.max(1, Math.round(u.acceptance * 100))}%</div><div class="l">${state.lang === 'ru' ? 'Приём' : 'Admit rate'}</div></div>
            <div class="hero-stat"><div class="v">${costInfo(u, state.profile).total ? fmtMoney(costInfo(u, state.profile).total) : (state.lang === 'ru' ? 'Бесплатно' : 'Free')}</div><div class="l">${state.lang === 'ru' ? 'В год с\u00A0жильём' : 'Per year, all-in'}</div></div>
          </div>
        </div>
      </div>`;
    }).join('');
  }

  const liked = state.liked;
  const dotsCount = state.deckLoading ? 2 : Math.min(3, deck.length);
  const subText = state.deckLoading ? t('discover_sub_loading') : (state.deckFallback ? t('discover_sub_fallback') : t('discover_sub', deck.length));

  document.getElementById('content').innerHTML = `
    <div class="discover-hero">
      <div class="hero-topbar">
        <div class="hero-progress">${Array.from({ length: Math.max(dotsCount, 1) }).map((_, i) => `<span class="hero-progress-dot${i === 0 ? ' active' : ''}"></span>`).join('')}</div>
        <button class="hero-icon-btn" onclick="toggleDiscoverPanel(true)" aria-label="${t('filters_title')}">${ICONS.sliders}</button>
      </div>
      <p class="hero-subtitle">${subText}</p>
      ${catalogUpdatedLabel() ? `<p class="catalog-fresh"><span class="cf-dot"></span>${catalogUpdatedLabel()}</p>` : ''}
      <div class="hero-stage">
        <div class="hero-card-stack">${cardsHtml}</div>
        ${liked.length ? `<button class="hero-avatar-stack" onclick="go('matches')" aria-label="${t('your_matches', liked.length)}">
          ${liked.slice(-3).reverse().map(u => `<div class="hero-avatar" style="${cardPhotoStyle(u)}"></div>`).join('')}
          <div class="hero-avatar-count">${liked.length}</div>
        </button>` : ''}
      </div>
      ${(!state.deckLoading && deck.length > 0) ? `<div class="swipe-actions hero-actions">
        <button class="action-btn dislike" onclick="swipeTop('dislike')" aria-label="${state.lang === 'ru' ? 'Пропустить' : 'Pass'}">${ICONS.x}</button>
        <button class="action-btn info" onclick="openFromDeck()" aria-label="${state.lang === 'ru' ? 'Подробнее' : 'Details'}">${ICONS.info}</button>
        <button class="action-btn like big" onclick="swipeTop('like')" aria-label="${state.lang === 'ru' ? 'Нравится' : 'Like'}">${ICONS.heart}</button>
      </div>
      <div class="undo-row"><button class="undo-btn" onclick="undoSwipe()" ${(state.swipeHistory || []).length ? '' : 'disabled'} title="Backspace">${ICONS.undo}<span>${state.lang === 'ru' ? 'Вернуть прошлую карточку' : 'Bring back last card'}</span></button></div>` : ''}
    </div>
    <div class="hero-panel-overlay${state.discoverPanelOpen ? ' open' : ''}" onclick="toggleDiscoverPanel(false)"></div>
    <div class="hero-panel${state.discoverPanelOpen ? ' open' : ''}">
      <div class="hero-panel-head">
        <h3>${t('discover_title')}</h3>
        <button class="hero-icon-btn" onclick="toggleDiscoverPanel(false)" aria-label="Close">${ICONS.x}</button>
      </div>
      <div class="hero-panel-body">${discoverPanelHtml()}</div>
    </div>`;

  if (deck.length > 0) attachSwipeHandlers(deck[0].id);
  animateScoreCounters(document);
  animateRadar(document);
}

function attachSwipeHandlers(topId) {
  const card = document.getElementById('card-' + topId);
  if (!card) return;
  let startX = 0, startY = 0, curX = 0, curY = 0, dragging = false;
  let lastX = 0, lastTime = 0, velocity = 0, rafScheduled = false;

  function pointerDown(e) {
    dragging = true;
    card.classList.add('dragging');
    const pt = e.touches ? e.touches[0] : e;
    startX = pt.clientX; startY = pt.clientY;
    lastX = 0; lastTime = Date.now(); velocity = 0;
  }
  function applyDragTransform() {
    rafScheduled = false;
    const rot = curX / 13;
    const lift = Math.max(0, 1 - Math.abs(curX) / 900); // едва заметный подъём при сильном свайпе
    card.style.transform = `translate(${curX}px, ${curY * 0.4}px) rotate(${rot}deg) scale(${0.98 + lift * 0.02})`;
    const intensity = Math.max(0, Math.min(1, Math.abs(curX) / 100));
    const likeStamp = document.getElementById('stamp-like');
    const nopeStamp = document.getElementById('stamp-nope');
    if (likeStamp) {
      likeStamp.style.opacity = curX > 0 ? intensity : 0;
      likeStamp.style.transform = `rotate(-18deg) scale(${0.7 + intensity * 0.35})`;
    }
    if (nopeStamp) {
      nopeStamp.style.opacity = curX < 0 ? intensity : 0;
      nopeStamp.style.transform = `rotate(18deg) scale(${0.7 + intensity * 0.35})`;
    }
  }
  function pointerMove(e) {
    if (!dragging) return;
    const pt = e.touches ? e.touches[0] : e;
    curX = pt.clientX - startX; curY = pt.clientY - startY;
    const now = Date.now();
    const dt = now - lastTime;
    if (dt > 0) velocity = (curX - lastX) / dt; // px/ms — скорость движения пальца прямо сейчас
    lastX = curX; lastTime = now;
    if (!rafScheduled) { rafScheduled = true; requestAnimationFrame(applyDragTransform); }
  }
  function pointerUp() {
    if (!dragging) return;
    dragging = false;
    card.classList.remove('dragging');
    const isFastFlick = Math.abs(velocity) > 0.55; // резкий "флик" пальцем — засчитываем свайп даже на небольшом расстоянии
    if (curX > 110 || (isFastFlick && curX > 24)) doSwipe('like', velocity);
    else if (curX < -110 || (isFastFlick && curX < -24)) doSwipe('dislike', velocity);
    else {
      card.style.transition = 'transform .38s cubic-bezier(.34,1.4,.4,1)';
      card.style.transform = '';
      const likeStamp = document.getElementById('stamp-like');
      const nopeStamp = document.getElementById('stamp-nope');
      if (likeStamp) likeStamp.style.opacity = 0;
      if (nopeStamp) nopeStamp.style.opacity = 0;
      setTimeout(() => { card.style.transition = ''; }, 400);
    }
    curX = 0; curY = 0; velocity = 0;
  }
  card.addEventListener('mousedown', pointerDown);
  window.addEventListener('mousemove', pointerMove);
  window.addEventListener('mouseup', pointerUp);
  card.addEventListener('touchstart', pointerDown, { passive: true });
  card.addEventListener('touchmove', pointerMove, { passive: true });
  card.addEventListener('touchend', pointerUp);
}

function doSwipe(direction, velocity) {
  const u = state.deck[0];
  if (!u) return;
  const card = document.getElementById('card-' + u.id);
  const flyDistance = Math.max(window.innerWidth, 480) * 1.35;
  // Чем резче был флик пальцем — тем быстрее и дальше улетает карточка, как в настоящем Tinder
  const speedBoost = Math.min(Math.abs(velocity || 0), 1.8);
  const duration = Math.max(180, 320 - speedBoost * 100);
  if (card) {
    card.style.transition = `transform ${duration}ms cubic-bezier(.15,.7,.3,1), opacity ${duration}ms ease-out`;
    card.style.transform = direction === 'like'
      ? `translate(${flyDistance}px, -70px) rotate(26deg)`
      : `translate(-${flyDistance}px, -70px) rotate(-26deg)`;
    card.style.opacity = '0';
  }
  if (navigator.vibrate) { try { navigator.vibrate(direction === 'like' ? [10] : [10]); } catch (e) { } }
  setTimeout(() => {
    state.deck.shift();
    bumpDailyActivity();
    state.swipeHistory = state.swipeHistory || [];
    state.swipeHistory.push({ u, direction });
    if (state.swipeHistory.length > 30) state.swipeHistory.shift();
    state.returningId = null;
    if (direction === 'like') {
      // Та же защита от дубля, что уже есть в toggleLike() — без неё двойной
      // тап/клик по одной карточке мог продублировать её в state.liked с тем
      // же id и сломать Application Tracker (см. фикс в init()).
      if (!state.liked.some(x => x.id === u.id)) state.liked.push(u);
      toast(t('added_to_matches', u.name));
    }
    else {
      state.disliked.push(u); // локальный счётчик "passed" для DNA-статистики — на бэке отдельного эндпоинта под него нет
      state.recentPasses.unshift(u);
      if (state.recentPasses.length > 3) state.recentPasses.pop();
    }
    renderDiscover();
    // Пишем свайп на бэк уже после того, как карточка визуально улетела — если
    // запрос не пройдёт, apiRequest сам покажет toast, а локальный UI уже не откатываем
    // (свайп в этом демо необратим локально; чтобы отменить лайк — есть toggleLike на странице вуза).
    apiPostSwipe(state.userId, u.id, direction === 'like').catch(() => { });
  }, duration);
}
function swipeTop(direction) { doSwipe(direction, 0); }
/* Вернуть последний свайп: карточка возвращается наверх колоды, лайк/пропуск
   снимается и на сервере (DELETE /users/{id}/swipes/{uni}). */
async function undoSwipe() {
  const last = (state.swipeHistory || []).pop();
  if (!last) return;
  const { u, direction } = last;
  if (direction === 'like') {
    state.liked = state.liked.filter(x => x.id !== u.id);
    removeTrackerEntry(u.id);
  } else {
    state.disliked = state.disliked.filter(x => x.id !== u.id);
    state.recentPasses = state.recentPasses.filter(x => x.id !== u.id);
  }
  state.deck = state.deck.filter(x => x.id !== u.id);
  state.deck.unshift(u);
  state.returningId = u.id;
  renderDiscover();
  toast(state.lang === 'ru' ? `Вернули: ${u.name}` : `Restored: ${u.name}`);
  try { await apiDeleteSwipe(state.userId, u.id); } catch (e) { }
}

/* ---------- Keyboard shortcuts: ← Pass / → Like, only while a card is on screen ---------- */
document.addEventListener('keydown', (e) => {
  if (state.screen !== 'discover') return;
  if (e.key === 'Escape' && state.discoverPanelOpen) { toggleDiscoverPanel(false); return; }
  const tag = (document.activeElement && document.activeElement.tagName) || '';
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return; // don't hijack typing into a text field
  if (state.discoverPanelOpen) return;
  if (e.key === 'Backspace' || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z')) { e.preventDefault(); undoSwipe(); return; }
  if (!state.deck.length) return;
  if (e.key === 'Backspace' || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z')) { e.preventDefault(); undoSwipe(); return; }
  if (e.key === 'ArrowRight') { e.preventDefault(); doSwipe('like'); }
  else if (e.key === 'ArrowLeft') { e.preventDefault(); doSwipe('dislike'); }
});
function openFromDeck() {
  if (state.deck[0]) { state.currentUniId = state.deck[0].id; state.activeTab = 'overview'; go('university'); }
}

/* ============================================================
   MATCHES LIST
   ============================================================ */
/* ============================================================
   APPLICATION TRACKER + ROADMAP
   ============================================================ */
function setTrackerView(v) { state.trackerView = v; trackerEnter = true; renderApp(); }
function trackerTabs() {
  const ru = state.lang === 'ru';
  const n = state.liked.length;
  const isRoad = state.trackerView === 'roadmap';
  return `<div class="seg" role="tablist">
    <button class="seg-btn ${!isRoad ? 'active' : ''}" role="tab" aria-selected="${!isRoad}" onclick="setTrackerView('tracker')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M3 9.5h18M9 9.5V20"/></svg>
      <span>${t('tab_tracker')}</span>${n ? `<b>${n}</b>` : ''}
    </button>
    <button class="seg-btn ${isRoad ? 'active' : ''}" role="tab" aria-selected="${isRoad}" onclick="setTrackerView('roadmap')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>
      <span>${t('tab_roadmap')}</span>
    </button>
  </div>
  <p class="seg-hint">${isRoad
    ? (ru ? 'Что и к какому сроку сделать: тесты, рекомендации, эссе и подача. Сроки\u00A0— ориентиры: точные даты проверяй на сайте вуза.' : 'What to do and by when: tests, recommendations, essay and submission. Deadlines are estimates\u00A0— check exact dates on the university site.')
    : (ru ? 'Здесь вузы, которые ты сохранил(а) лайками. Меняй статус по мере подготовки, а документы отмечай в «Плане по датам». Саму заявку нужно отправить на сайте вуза.' : 'Universities you saved with likes live here. Change the status as you go, and tick documents in “Plan by date”. The application itself is submitted on the university’s site.')}</p>`;
}

/* ============================================================
   ДОСКА ЗАЯВОК + СЕЗОН
   Одни и те же данные (лайки + запись трекера), два взгляда:
   • «Доска» — колонки по статусу заявки, карточка двигается вперёд/назад одним тапом;
   • «Сезон» — дедлайны по порядку, что делать в первую очередь и баланс списка.
   Анимации входа играют только при открытии экрана/вкладки (trackerEnter), а не при каждом
   клике по чекбоксу — иначе список «трясётся» (см. комментарий про .reveal выше). ============================================================ */
let trackerEnter = true;   // true → следующий рендер экрана проиграет анимацию входа
let trackerFlash = null;   // 'id:key' — элемент, который только что изменили (короткий «щелчок»)

const TRACKER_STATUSES = ['not_started', 'in_progress', 'submitted', 'decision'];
const TRACKER_DOCS = ['essay', 'recs', 'transcript', 'tests'];

function isActiveRow(r) { return r.entry.status !== 'submitted' && r.entry.status !== 'decision'; }
function trackerRows() {
  state.liked.forEach(u => ensureTrackerEntry(u.id)); // догоняем лайки, сделанные до открытия экрана
  const data = loadTrackerData();
  // У лайков, восстановленных из бэкенда после перезагрузки, может не быть _reality —
  // без этого вместо «Сложно/Реально/Высокий» в списке заявок светился «undefined».
  state.liked.forEach(u => { if (!u._reality) u._reality = realityFor(u, state.profile); });
  return state.liked.map(u => ({ u, entry: data[u.id] || trackerDefaultEntry(), meta: estimateDeadline(u) }));
}
function docsDone(entry) { return TRACKER_DOCS.filter(k => entry.checklist[k]).length; }
function shortDays(n) { return t('d_short', n); }

/* Следующее действие по заявке: первая невыполненная веха от тестов к подаче. */
function nextActionFor(row) {
  if (!isActiveRow(row)) return null;
  const today = startOfToday();
  for (const m of roadmapMilestones(row.meta)) {
    if (m.key === 'submit' || !row.entry.checklist[m.key]) {
      return { key: m.key, u: row.u, date: m.date, daysTo: Math.round((m.date - today) / 86400000) };
    }
  }
  return null;
}

function trackerSetStatusFlash(id, status) { trackerFlash = id + ':card'; setTrackerStatus(id, status); }
function trackerToggleDoc(id, key) { trackerFlash = id + ':' + key; toggleTrackerChecklistItem(id, key); }
function trackerAdvance(id, dir) {
  const data = loadTrackerData();
  const cur = (data[id] || trackerDefaultEntry()).status;
  const idx = TRACKER_STATUSES.indexOf(cur) + dir;
  if (idx < 0 || idx >= TRACKER_STATUSES.length) return;
  trackerSetStatusFlash(id, TRACKER_STATUSES[idx]);
}

/* ---------- Сводка сверху: готовность, ближайший дедлайн, баланс списка ---------- */
function mixAdviceKey(mix, total) {
  if (total < 4) return 'mix_few';
  if (mix.Likely === 0) return 'mix_no_likely';
  if (mix.Reach > mix.Target + mix.Likely) return 'mix_reach_heavy';
  return 'mix_ok';
}
/* ---------- Календарь (.ics) — Premium ---------- */
function icsEscape(str) { return String(str).replace(/([,;\\])/g, '\\$1').replace(/\r?\n/g, '\\n'); }
function icsDate(d) { return d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0'); }
function exportCalendar() { requirePremium(doExportCalendar); }
function doExportCalendar() {
  const rows = trackerRows().filter(isActiveRow);
  if (!rows.length) { toast(t('cal_empty')); return; }
  const today = startOfToday();
  const stamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Admitly//Season//EN', 'CALSCALE:GREGORIAN'];
  rows.forEach(({ u, entry, meta }) => {
    roadmapMilestones(meta).forEach(m => {
      if (m.key !== 'submit' && entry.checklist[m.key]) return;
      if (m.date < today) return;
      const title = m.key === 'submit' ? `${u.name}: ${deadlineTypeLabel(meta.type)} (≈)` : `${u.name}: ${t('roadmap_' + m.key)}`;
      L.push('BEGIN:VEVENT', `UID:admitly-${u.id}-${m.key}-${icsDate(m.date)}@admitly`, `DTSTAMP:${stamp}`,
        `DTSTART;VALUE=DATE:${icsDate(m.date)}`, `DTEND;VALUE=DATE:${icsDate(new Date(m.date.getTime() + 86400000))}`,
        `SUMMARY:${icsEscape(title)}`, `DESCRIPTION:${icsEscape(t('cal_note'))}`);
      if (m.key === 'submit') L.push('BEGIN:VALARM', 'TRIGGER:-P7D', 'ACTION:DISPLAY', 'DESCRIPTION:Admitly', 'END:VALARM');
      L.push('END:VEVENT');
    });
  });
  L.push('END:VCALENDAR');
  const blob = new Blob([L.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = 'admitly-deadlines.ics';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  toast(t('cal_done'));
}

/* ---------- PDF-отчёт по вузу — Premium ----------
   Настоящего PDF-рендера на клиенте без тяжёлых зависимостей нет, поэтому
   отчёт собирается как отдельная печатная страница (window.open + print):
   «Сохранить как PDF» в диалоге печати даёт тот же результат — одна страница
   со шансами, совпадением и планом, удобно показать родителям. */
function exportUniPdf(uniId) { requirePremium(() => buildUniPdf(uniId)); }

function buildUniPdf(uniId) {
  const u = findUni(uniId);
  if (!u) return;
  const p = state.profile, ru = isRu();
  const match = computeMatch(u, p);
  const reality = admissionReality(u, p);
  const d = uniData(u);
  const site = uniSite(u);
  const meta = estimateDeadline(u);
  const milestone = roadmapMilestones(meta).find(m => m.key === 'submit');
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&' + 'amp;').replace(/</g, '&' + 'lt;').replace(/>/g, '&' + 'gt;');
  const kv = (k, v) => `<div class="kv"><div class="k">${esc(k)}</div><div class="v">${esc(v)}</div></div>`;
  const w = window.open('', '_blank');
  if (!w) { toast(t('pdf_popup_blocked')); return; }
  w.document.write(`<!DOCTYPE html>
<html lang="${state.lang}">
<head>
<meta charset="utf-8">
<title>Admitly — ${esc(u.name)}</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, 'Segoe UI', Roboto, Arial, sans-serif; color: #0B1628; margin: 36px auto; max-width: 720px; padding: 0 24px; }
  header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
  .brand { font-weight: 800; font-size: 15px; letter-spacing: .01em; }
  .brand i { color: #2563EB; font-style: normal; }
  .date { font-size: 11px; color: #64748B; }
  h1 { font-size: 26px; margin: 10px 0 2px; line-height: 1.15; }
  .loc { font-size: 13px; color: #64748B; margin: 0 0 16px; }
  .hero { display: flex; gap: 8px; margin-bottom: 18px; }
  .pill { border-radius: 10px; padding: 8px 14px; font-weight: 700; font-size: 13px; }
  .pill .s { display: block; font-size: 10px; font-weight: 600; opacity: .75; text-transform: uppercase; letter-spacing: .04em; }
  .p-match { background: #EEF4FF; color: #1D4ED8; }
  .p-reach { background: #FDF2F2; color: #B91C1C; }
  .p-target { background: #FEF7EC; color: #B45309; }
  .p-likely { background: #EFFAF3; color: #15803D; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 18px; margin: 14px 0; }
  .kv { display: flex; justify-content: space-between; gap: 10px; border-bottom: 1px solid #EDF1F7; padding: 7px 0; font-size: 13px; }
  .k { color: #64748B; }
  .v { font-weight: 700; text-align: right; }
  h2 { font-size: 15px; margin: 20px 0 6px; }
  p.desc { font-size: 13px; line-height: 1.55; color: #334155; margin: 0 0 8px; }
  ul { margin: 6px 0; padding-left: 18px; }
  li { font-size: 13px; line-height: 1.5; color: #334155; }
  footer { margin-top: 26px; padding-top: 12px; border-top: 1px solid #EDF1F7; font-size: 11px; color: #94A3B8; line-height: 1.5; }
  .site { color: #2563EB; }
  @media print { body { margin: 0 auto; } }
</style>
</head>
<body>
<header>
  <div class="brand">Admit<i>ly</i></div>
  <div class="date">${new Date().toLocaleDateString(ru ? 'ru-RU' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
</header>
<h1>${esc(u.name)}</h1>
<p class="loc">${esc(u.city)}, ${esc(cName(u.country))}${site ? ' · <span class="site">' + esc(site.replace(/^https?:\/\//, '')) + '</span>' : ''}</p>
<div class="hero">
  <div class="pill p-match"><span class="s">${ru ? 'Совпадение' : 'Match'}</span>${match}%</div>
  <div class="pill p-${reality.toLowerCase()}"><span class="s">${ru ? 'Шанс' : 'Chance'}</span>${esc(chanceLabel(reality))}</div>
  <div class="pill p-match"><span class="s">${ru ? 'Приём' : 'Admit rate'}</span>${Math.max(1, Math.round(u.acceptance * 100))}%</div>
</div>
<h2>${ru ? 'Ключевые цифры' : 'Key numbers'}</h2>
<div class="grid">
  ${kv(ru ? 'Стоимость года (всё включено)' : 'Cost per year (all-in)', fmtMoney(u.cost))}
  ${kv(ru ? 'GPA принятых (25–75 перцентиль)' : 'Admitted GPA (25th–75th)', u.gpa25 + ' – ' + u.gpa75)}
  ${kv(ru ? 'SAT принятых (25–75 перцентиль)' : 'Admitted SAT (25th–75th)', u.sat25 + ' – ' + u.sat75)}
  ${kv(ru ? 'Размер' : 'Size', esc(trvPdf('size', u.size)))}
  ${kv(ru ? 'Город' : 'Setting', esc(trvPdf('setting', u.setting)))}
  ${kv(ru ? 'Климат' : 'Climate', esc(trvPdf('climate', u.climate)))}
  ${kv(ru ? 'Исследования' : 'Research', u.research + '/5')}
  ${kv(ru ? 'Следующий дедлайн' : 'Next deadline', milestone ? milestone.date.toLocaleDateString(ru ? 'ru-RU' : 'en-US', { day: 'numeric', month: 'long' }) + ' (' + esc(deadlineTypeLabel(meta.type)) + ')' : '—')}
</div>
<h2>${ru ? 'О вузе' : 'About'}</h2>
<p class="desc">${esc(uniDesc(u))}</p>
${d && L2(d.pros) && Array.isArray(L2(d.pros)) ? `<h2>${ru ? 'Сильные стороны' : 'Strengths'}</h2><ul>${L2(d.pros).map(x => `<li>${esc(typoDash(x))}</li>`).join('')}</ul>` : ''}
<h2>${ru ? 'Что это значит для тебя' : 'What it means for you'}</h2>
<p class="desc">${esc(ru
    ? `Твой GPA ${p.gpa} против диапазона принятых ${u.gpa25}–${u.gpa75}, бюджет ${fmtMoney(p.budget)} против полной стоимости ${fmtMoney(u.cost)} в год. Совпадение с твоими предпочтениями — ${match}%, итоговая оценка шансов — «${chanceLabel(reality)}».`
    : `Your GPA ${p.gpa} against the admitted range ${u.gpa25}–${u.gpa75}, budget ${fmtMoney(p.budget)} against the full cost of ${fmtMoney(u.cost)} per year. Fit with your preferences — ${match}%, overall admission odds — "${chanceLabel(reality)}".`)}</p>
<footer>${esc(t('pdf_footer'))}</footer>
</body>
</html>`);
  w.document.close();
  w.focus();
  // Печать — после загрузки страницы (шрифты/разметка), с запасным таймером.
  const fire = () => { try { w.print(); } catch (e) { } };
  w.addEventListener('load', fire);
  setTimeout(fire, 600);
}
function trvPdf(pfx, v) {
  const k = pfx + '_' + String(v || '').toLowerCase();
  const r = t(k);
  return r && r !== k ? r : (v || '—');
}

/* ---------- Ссылка для родителя/консультанта — Premium ----------
   Бэкенд выдаёт токен (POST /users/{id}/share), фронт собирает ссылку
   вида #share=<token> и копирует в буфер. Кто откроет её — увидит
   read-only список Matches (maybeRenderSharedView ниже). */
function apiCreateShareLink() { return apiRequest(`/users/${state.userId}/share`, { method: 'POST' }); }
function apiRevokeShareLink() { return apiRequest(`/users/${state.userId}/share`, { method: 'DELETE' }); }
function apiFetchShared(token) { return apiRequest('/share/' + encodeURIComponent(token)); }

async function copyToClipboard(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch (e) { }
  try {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    const ok = document.execCommand('copy'); ta.remove(); return ok;
  } catch (e) { return false; }
}

function shareShortlist() {
  requirePremium(async () => {
    if (!state.userId) { toast(t('server_error')); return; }
    try {
      const r = await apiCreateShareLink();
      const url = location.origin + location.pathname + '#share=' + r.token;
      const ok = await copyToClipboard(url);
      toast(ok ? t('share_link_copied') : url);
    } catch (e) { toast(t('server_error')); }
  });
}

/* ---------- Экран «только для чтения» по ссылке #share=<token> ---------- */
async function maybeRenderSharedView() {
  const m = location.hash.match(/^#share=([A-Za-z0-9_-]{8,})/);
  if (!m) return false;
  renderSharedView(m[1]);
  return true;
}

async function renderSharedView(token) {
  const landing = document.getElementById('landing');
  if (landing) landing.classList.add('hidden');
  const box = document.getElementById('login');
  box.classList.remove('hidden');
  box.innerHTML = `<div class="auth-stage"><div class="auth-box" style="max-width:640px;">
    <div class="auth-mark">${ICONS.logo}</div>
    <h1 class="auth-title">${t('share_view_title')}</h1>
    <p class="auth-sub">${t('share_view_sub')}</p>
    <div id="share-view-body"><p class="auth-sub">${t('share_loading')}</p></div>
    <button class="lp-btn lp-btn-primary" style="margin-top:18px;" onclick="location.hash='';location.reload();">${t('share_open_app')}</button>
  </div></div>`;
  try {
    const r = await apiFetchShared(token);
    const rows = (r.matches || []).map(u => `
      <div class="match-list-row" style="cursor:default;">
        <div class="match-thumb uni-visual-host">${uniVisual(u)}</div>
        <div class="match-info"><h4>${esc2(u.name)}</h4><div class="loc">${esc2(u.city)}, ${esc2(cName(u.country))}</div></div>
        <div class="match-score-block"><div class="v">${u.matchScore}%</div><div class="l">${state.lang === 'ru' ? 'совпадение' : 'match'}</div></div>
        <span class="badge badge-${u.admissionReality}">${chanceLabel(u.admissionReality)}</span>
      </div>`).join('');
    document.getElementById('share-view-body').innerHTML = `
      <p class="auth-sub" style="margin-bottom:14px;">${t('share_owner_line')} <b>${esc2(r.owner)}</b> · ${r.matches.length}</p>
      ${rows || `<p class="auth-sub">${t('share_empty')}</p>`}`;
    document.querySelectorAll('#share-view-body img.uni-photo').forEach(img => img.classList.add('loaded'));
  } catch (e) {
    document.getElementById('share-view-body').innerHTML =
      `<div class="auth-error">${ICONS.info}<span>${t('share_invalid')}</span></div>`;
  }
}
function esc2(s) { return String(s == null ? '' : s).replace(/&/g, '&' + 'amp;').replace(/</g, '&' + 'lt;').replace(/>/g, '&' + 'gt;'); }

/* ---------- ДОСКА ----------
   Упрощённая версия: одна строка сводки, фильтр по статусу вместо четырёх
   колонок канбана и спокойная строка на каждую заявку. Документы
   раскрываются по клику, статус меняется одним выпадающим списком. */
function deadlineTypeLabel(type) {
  const ru = state.lang === 'ru';
  return ({ RD: ru ? 'основной приём' : 'regular decision', ED: ru ? 'ранний приём с обязательством' : 'early decision', EA: ru ? 'ранний приём' : 'early action' })[type] || type;
}
function trackerSetFilter(f) { state.trackerFilter = f; renderTrackerList(); }
function trackerRowHtml(r, idx, flash) {
  const { u, entry, meta } = r;
  const active = isActiveRow(r);
  const ru = state.lang === 'ru';
  return `
  <article class="app-row app-row-lite ${flash === u.id + ':card' ? 'flash-land' : ''}" style="--i:${idx}">
    <div class="app-row-main">
      <button class="app-thumb uni-visual-host" onclick="viewUniversity(${u.id})" aria-label="${u.name}">${uniVisual(u)}</button>
      <div class="app-info" onclick="viewUniversity(${u.id})">
        <div class="app-title"><h4>${u.name}</h4></div>
        <div class="app-meta">${u.city}, ${cName(u.country)}</div>
      </div>
      <div class="app-side">
        ${active
          ? `<div class="app-deadline u-${urgencyClass(meta.daysLeft)}"><b>≈ ${fmtDeadlineDate(meta.date)}</b><span>${ru ? 'ориентировочно · ' : 'estimated · '}${deadlineTypeLabel(meta.type)} · ${shortDays(meta.daysLeft)}</span></div>`
          : `<div class="app-deadline is-done"><b>${t('status_' + entry.status)}</b></div>`}
        <label class="status-pill s-${entry.status}">
          <i class="sp-dot"></i><span>${t('status_' + entry.status)}</span>${ICONS.chevronDown}
          <select onchange="trackerSetStatusFlash(${u.id}, this.value)" aria-label="${ru ? 'Статус заявки' : 'Application status'}">
            ${TRACKER_STATUSES.map(s => `<option value="${s}" ${entry.status === s ? 'selected' : ''}>${t('status_' + s)}</option>`).join('')}
          </select>
        </label>
      </div>
    </div>
  </article>`;
}

function trackerSummaryHtml(rows) {
  const active = rows.filter(isActiveRow);
  const docsTotal = rows.length * 4;
  const docsReady = rows.reduce((s, r) => s + (isActiveRow(r) ? docsDone(r.entry) : 4), 0);
  const ready = docsTotal ? Math.round(docsReady / docsTotal * 100) : 0;
  const next = active.slice().sort((a, b) => a.meta.daysLeft - b.meta.daysLeft)[0];
  const ru = state.lang === 'ru';
  return `<div class="app-summary">
    <div class="app-sum-item"><span>${ru ? 'Подготовка' : 'Preparation'}</span><b>${ready}%</b></div>
    <div class="app-sum-item ${next ? 'u-' + urgencyClass(next.meta.daysLeft) : ''}"><span>${ru ? 'Ближайший дедлайн' : 'Next deadline'}</span>
      <b>${next ? `${fmtDeadlineDate(next.meta.date)} <small>${next.u.name}</small>` : (ru ? 'нет' : 'none')}</b></div>
    <div class="app-sum-item"><span>${ru ? 'В работе' : 'Active'}</span><b>${active.length} ${ru ? 'из' : 'of'} ${rows.length}</b></div>
  </div>`;
}

function renderTrackerList() {
  const rows = trackerRows();
  const enter = trackerEnter; trackerEnter = false;
  const flash = trackerFlash; trackerFlash = null;
  const f = state.trackerFilter || 'all';
  const counts = {}; TRACKER_STATUSES.forEach(s => { counts[s] = rows.filter(r => r.entry.status === s).length; });
  const shown = rows.filter(r => f === 'all' || r.entry.status === f)
    .sort((a, b) => TRACKER_STATUSES.indexOf(a.entry.status) - TRACKER_STATUSES.indexOf(b.entry.status) || a.meta.daysLeft - b.meta.daysLeft);
  const chip = (key, label, n) => `<button class="app-filter ${f === key ? 'active' : ''}" aria-pressed="${f === key}" onclick="trackerSetFilter('${key}')">${key !== 'all' ? `<i class="af-dot s-${key}"></i>` : ''}${label}<b>${n}</b></button>`;
  document.getElementById('content').innerHTML = `
    <div class="content-header">
      <div><h1 class="content-title">${t('tracker_title')}</h1><p class="content-sub">${t('tracker_sub', state.liked.length)}</p></div>
    </div>
    ${trackerTabs()}
    ${rows.length === 0 ? trackerEmptyHtml('empty_tracker', true) : `
    <div class="app-board ${enter ? 'tr-enter' : ''}">
      <div class="app-filters">
        ${chip('all', state.lang === 'ru' ? 'Все' : 'All', rows.length)}
        ${TRACKER_STATUSES.map(s => chip(s, t('status_' + s), counts[s])).join('')}
      </div>
      <div class="app-list">
        ${shown.length ? shown.map((r, i) => trackerRowHtml(r, i, flash)).join('') : `<div class="bcol-empty">${t('board_empty_' + f)}</div>`}
      </div>
    </div>`}`;
}

function trackerEmptyHtml(key, withBtn) {
  return `<div class="empty-state">
    <svg class="empty-illustration" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
    <p>${t(key)}</p>
    ${withBtn ? `<button class="btn btn-primary" onclick="go('discover')" style="margin-top:6px;">${t('to_discover')}</button>` : ''}
  </div>`;
}

function renderTracker() {
  if (state.trackerView === 'roadmap') renderRoadmap();
  else renderTrackerList();
}

/* ---------- СЕЗОН ---------- */
const MONTHS_SHORT = {
  ru: ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
};
function seasonMonthBarHtml(groups) {
  if (!groups.length) return '';
  const today = startOfToday();
  const start = new Date(today.getFullYear(), today.getMonth(), 1);
  const last = groups[groups.length - 1].date;
  const end = new Date(last.getFullYear(), last.getMonth() + 1, 1);
  const span = end - start;
  const months = [];
  for (let d = new Date(start); d < end; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) months.push(new Date(d));
  const pos = d => Math.max(0, Math.min(100, (d - start) / span * 100));
  const ms = MONTHS_SHORT[state.lang === 'ru' ? 'ru' : 'en'];
  return `<div class="season-months" aria-hidden="true">
    <div class="sm-track">
      ${months.map(m => `<span class="sm-month" style="flex:${new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate()}">${ms[m.getMonth()]}</span>`).join('')}
      <span class="sm-today" style="left:${pos(today)}%"></span>
      ${groups.map(g => `<span class="sm-pin u-${urgencyClass(g.daysLeft)}" style="left:${pos(g.date)}%">${g.rows.length > 1 ? g.rows.length : ''}</span>`).join('')}
    </div>
  </div>`;
}

function seasonStepHtml(r, m, nextKey, today) {
  const { u, entry } = r;
  const done = m.key === 'submit' ? false : entry.checklist[m.key];
  const late = !done && m.date < today;
  const isNext = nextKey === m.key;
  const click = m.key === 'submit' ? `trackerSetStatusFlash(${u.id},'submitted')` : `trackerToggleDoc(${u.id},'${m.key}')`;
  return `<button class="sstep ${done ? 'done' : ''} ${isNext ? 'is-next' : ''} ${late ? 'late' : ''}" onclick="${click}">
    <span class="sstep-dot">${done ? ICONS.check : ''}</span>
    <span class="sstep-label">${t('roadmap_' + m.key)}</span>
    <span class="sstep-date">${done ? (state.lang === 'ru' ? 'готово' : 'done') : (late ? (state.lang === 'ru' ? 'просрочено' : 'overdue') : (state.lang === 'ru' ? 'до ' : 'by ') + fmtDeadlineDate(m.date))}</span>
  </button>`;
}

function renderRoadmap() {
  const rows = trackerRows();
  const enter = trackerEnter; trackerEnter = false;
  const flash = trackerFlash; trackerFlash = null;
  const active = rows.filter(isActiveRow).sort((a, b) => a.meta.date - b.meta.date);
  const today = startOfToday();
  const ru = state.lang === 'ru';
  const MONTHS_FULL = ru ? ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'] : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const next = active.map(nextActionFor).filter(Boolean).sort((a, b) => a.daysTo - b.daysTo)[0];
  const insightCount = state.isPremium ? 0 : whatIfInsights().length;
  const byMonth = [];
  active.forEach(r => { const k = r.meta.date.getFullYear() * 12 + r.meta.date.getMonth(); let g = byMonth.find(x => x.k === k); if (!g) byMonth.push(g = { k, d: r.meta.date, rows: [] }); g.rows.push(r); });
  const stepDone = (r, key) => key === 'submit' ? ['submitted', 'decision'].includes(r.entry.status) : !!r.entry.checklist[key];
  const stepClick = (r, key) => key === 'submit' ? `trackerSetStatusFlash(${r.u.id},'submitted')` : `trackerToggleDoc(${r.u.id},'${key}')`;

  document.getElementById('content').innerHTML = `
    <div class="content-header">
      <div><h1 class="content-title">${t('roadmap_title')}</h1><p class="content-sub">${t('roadmap_sub', active.length)}</p></div>
      ${rows.length ? `<button class="cal-btn" onclick="exportCalendar()">${ICONS.calendar}<span>${t('cal_export')}</span>${state.isPremium ? '' : '<b class="pro-tag">PRO</b>'}</button>` : ''}
    </div>
    ${trackerTabs()}
    ${rows.length === 0 ? trackerEmptyHtml('empty_roadmap', true) : `
    <div class="tr-board ${enter ? 'tr-enter' : ''}">
      <div class="sn">
      ${next ? `<section class="sn-next">
        <div class="sn-next-l"><span class="sn-kicker">${ru ? 'Следующий шаг' : 'Next step'}</span>
          <b>${typoDash(t('act_' + next.key) + ' — ' + next.u.name)}</b>
          <span class="sn-due ${next.daysTo < 0 ? 'late' : ''}">${next.daysTo < 0 ? t('due_late') : (next.daysTo === 0 ? t('due_today') : t('due_by', fmtDeadlineDate(next.date)))}</span></div>
        <button class="sn-done-btn" onclick="${next.key === 'submit' ? `trackerSetStatusFlash(${next.u.id},'submitted')` : `trackerToggleDoc(${next.u.id},'${next.key}')`}">${ICONS.check}<span>${ru ? 'Готово' : 'Done'}</span></button>
      </section>` : `<p class="sn-allgood">${t('season_focus_empty')}</p>`}
      ${byMonth.map(g => `
        <h3 class="sn-month">${MONTHS_FULL[g.d.getMonth()]} ${g.d.getFullYear()}</h3>
        <div class="sn-list">
          ${g.rows.map(r => {
            const ms = roadmapMilestones(r.meta);
            const doneN = ms.filter(m => stepDone(r, m.key)).length;
            return `<article class="sn-row u-${urgencyClass(r.meta.daysLeft)}">
              <div class="sn-date"><b>${r.meta.date.getDate()}</b><span>${deadlineTypeLabel(r.meta.type)}</span></div>
              <div class="sn-main">
                <div class="sn-uni" onclick="viewUniversity(${r.u.id})"><span class="sn-thumb uni-visual-host">${uniVisual(r.u)}</span><div><h4>${r.u.name}</h4><span>${t('days_left', r.meta.daysLeft)} · ${ru ? 'готово' : 'done'} ${doneN} ${ru ? 'из' : 'of'} ${ms.length}</span></div></div>
                <div class="sn-steps">${ms.map(m => { const d = stepDone(r, m.key); const late = !d && m.date < today; return `<button class="sn-step ${d ? 'done' : ''} ${late ? 'late' : ''} ${flash === r.u.id + ':' + m.key ? 'flash' : ''}" aria-pressed="${d}" onclick="${stepClick(r, m.key)}"><span class="dc-box">${ICONS.check}</span><span>${t('roadmap_' + m.key)}</span><small>${d ? (ru ? 'готово' : 'done') : (late ? (ru ? 'просрочено' : 'overdue') : (ru ? 'до ' : 'by ') + fmtDeadlineDate(m.date))}</small></button>`; }).join('')}</div>
              </div>
            </article>`;
          }).join('')}
        </div>`).join('')}
      </div>
    </div>`}
    <div id="partner-slot-scholarships"></div>`;
  loadPartnerSlot('roadmap_scholarships', null, 'partner-slot-scholarships');
}

/* ============================================================
   PREMIUM: отдельный экран + «что если» на реальных данных пользователя
   ============================================================ */
const REALITY_RANK = { Reach: 0, Target: 1, Likely: 2 };
/* Для каждого вуза из лайков (или из колоды, если лайков ещё нет) ищем минимальный шаг
   по тесту (или по GPA, если тестов нет), после которого уровень становится выше. */
function whatIfInsights() {
  const p = state.profile;
  const pool = (state.liked.length ? state.liked : state.deck).slice(0, 40);
  const testKey = p.tests.SAT.taken ? 'SAT' : (p.tests.ACT.taken ? 'ACT' : null);
  const out = [];
  pool.forEach(u => {
    const cur = admissionReality(u, p);
    if (cur === 'Likely') return;
    if (testKey) {
      const base = p.tests[testKey].score;
      const step = testKey === 'SAT' ? 10 : 1;
      const maxD = testKey === 'SAT' ? 150 : 4;
      for (let d = step; d <= maxD; d += step) {
        if (base + d > TEST_RANGES[testKey].max) break;
        const sim = simulateAdmissionReality(u, p.gpa, testKey, base + d);
        if (REALITY_RANK[sim] > REALITY_RANK[cur]) { out.push({ u, from: cur, to: sim, delta: d, unit: testKey }); return; }
      }
    } else {
      for (let d = 0.05; d <= 0.4001; d += 0.05) {
        if (p.gpa + d > 4) break;
        const sim = simulateAdmissionReality(u, p.gpa + d, null, 0);
        if (REALITY_RANK[sim] > REALITY_RANK[cur]) { out.push({ u, from: cur, to: sim, delta: +d.toFixed(2), unit: 'GPA' }); return; }
      }
    }
  });
  return out.sort((a, b) => (a.unit === 'GPA' ? a.delta * 250 : a.delta) - (b.unit === 'GPA' ? b.delta * 250 : b.delta));
}

let premiumEnter = true;
function premiumNavHint() {
  const n = whatIfInsights().length;
  return n > 0 ? t('season_teaser', n) : t('pm_lead');
}
function renderPremium() {
  const enter = premiumEnter; premiumEnter = false;
  const ins = whatIfInsights();
  const on = state.isPremium;
  let shown = ins.slice(0, 5);
  // Если реальных расчётов нет (мало лайков или всё уже «Высокий»), в закрытом режиме
  // всё равно показываем замазанный пример на вузах из подборки — иначе блок пропадал целиком.
  const teaserMode = !on && shown.length < 3;
  if (teaserMode) {
    const real = shown;
    const pool = (state.liked.length ? state.liked : state.deck).slice(0, 5);
    const fallbackNames = ['ETH Zurich', 'University of Toronto', 'NUS', 'TU Munich', 'University of Edinburgh'];
    shown = (pool.length ? pool : fallbackNames.map((name, i) => ({ id: 0, name }))).slice(0, 5).map((u, i) => ({ u, from: i % 2 ? 'Target' : 'Reach', to: i % 2 ? 'Likely' : 'Target', delta: [30, 40, 20, 50, 60][i], unit: 'SAT' }));
    shown = real.concat(shown.filter(x => !real.some(r => r.u.name === x.u.name))).slice(0, 4);
  }
  const best = ins[0];
  const feats = [
    { ico: ICONS.sliders, t: 'pm_f_sim', d: 'pm_f_sim_d', live: true },
    { ico: ICONS.calendar, t: 'pm_f_cal', d: 'pm_f_cal_d', live: true },
    { ico: ICONS.book, t: 'pm_f_pdf', d: 'pm_f_pdf_d', live: true },
    { ico: ICONS.user, t: 'pm_f_share', d: 'pm_f_share_d', live: true }
  ];
  const insightRows = shown.map(r => `
    <li class="pm-row" ${on ? `onclick="viewUniversity(${r.u.id})"` : ''}>
      <span class="pm-row-name">${r.u.name}</span>
      <span class="pm-row-move"><span class="badge badge-${r.from}">${chanceLabel(r.from)}</span>${ICONS.arrowRight}<span class="badge badge-${r.to}">${chanceLabel(r.to)}</span></span>
      <span class="pm-row-need">${r.unit === 'GPA' ? '+' + r.delta.toFixed(2) + ' GPA' : '+' + r.delta + ' ' + r.unit}</span>
    </li>`).join('');

  document.getElementById('content').innerHTML = `
  <div class="pm ${enter ? 'pm-enter' : ''}">
    <section class="pm-hero">
      <div class="pm-hero-copy">
        <h1>${t('pm_h1')}</h1>
        <p>${t('pm_lead')}</p>
        ${on
          ? `<div class="pm-on"><span>${ICONS.check}</span>${t('pm_cta_active')}</div>`
          : `<button class="pm-cta" onclick="premiumBuy()">${ICONS.spark}<span>${premiumCtaLabel()}</span></button>
             <p class="pm-note">${t('pm_demo_note')}</p>`}
      </div>
      <div class="pm-ladder" aria-hidden="true">
        <div class="pm-rung pm-rung-likely"><span>${chanceLabel('Likely')}</span></div>
        <div class="pm-rung pm-rung-target"><span>${chanceLabel('Target')}</span></div>
        <div class="pm-rung pm-rung-reach"><span>${chanceLabel('Reach')}</span></div>
        <div class="pm-marker"><b>${best ? (best.unit === 'GPA' ? '+' + best.delta.toFixed(2) : '+' + best.delta) : '+40'}</b></div>
      </div>
    </section>

    <section class="pm-insight ${on ? '' : 'is-locked'}">
      <h2>${ins.length ? t('pm_insight_title', ins.length) : (state.liked.length
        ? (state.lang === 'ru' ? 'Для сохранённых вузов готовых подсказок пока нет. Другие баллы можно проверить в карточке вуза, на вкладке «Учёба и поступление».' : 'No ready tips for your saved schools yet. Try other scores on the university card, the “Academics” tab.')
        : (teaserMode ? (state.lang === 'ru' ? 'Посмотри, где тебе не хватает пары баллов' : 'See where a few points would change things') : t('pm_insight_none')))}</h2>
      ${shown.length ? `
      <div class="pm-insight-wrap">
        <ul class="pm-rows ${on ? '' : 'blurred'}" ${on ? '' : 'aria-hidden="true"'}>${insightRows}</ul>
        ${on ? '' : `<div class="pm-lock"><span class="sim-teaser-lock">${ICONS.lock}</span><button class="lp-btn lp-btn-primary" onclick="premiumBuy()">${t('pm_unlock_insight')}</button></div>`}
      </div>` : ''}
    </section>

    <h2 class="pm-h2">${t('pm_features')}</h2>
    <div class="pm-feats">
      ${feats.map((f, i) => `
      <article class="pm-feat" style="--i:${i}">
        <span class="pm-feat-ico">${f.ico}</span>
        <div><h3>${t(f.t)} <em class="pm-tag ${f.live ? 'live' : ''}">${t(f.live ? 'pm_tag_live' : 'pm_tag_soon')}</em></h3><p>${t(f.d)}</p></div>
      </article>`).join('')}
    </div>

    <div class="pm-compare">
      <div class="pm-plan">
        <h3>${t('pm_free_title')}</h3>
        <ul>${[1, 2, 3, 4].map(n => `<li>${ICONS.check}<span>${t('pm_free_' + n)}</span></li>`).join('')}</ul>
      </div>
      <div class="pm-plan pm-plan-pro">
        <h3>${t('pm_pro_title')}</h3>
        <ul><li>${ICONS.check}<span>${t('pm_f_sim')}</span></li><li>${ICONS.check}<span>${t('pm_f_cal')}</span></li><li>${ICONS.check}<span>${t('pm_f_pdf')}</span></li><li>${ICONS.check}<span>${t('pm_f_share')}</span></li></ul>
        ${on
          ? `<div class="pm-actions"><button class="btn btn-primary" onclick="go('matches')">${t('pm_go_sim')}</button><button class="btn btn-ghost" onclick="doExportCalendar()">${t('pm_go_cal')}</button><button class="btn btn-ghost" onclick="shareShortlist()">${t('pm_go_share')}</button></div>
             <button class="premium-demo-link" onclick="devRevokePremium()">${t('premium_demo_revoke')}</button>`
          : `<button class="pm-cta pm-cta-block" onclick="premiumBuy()">${ICONS.spark}<span>${premiumCtaLabel()}</span></button>`}
      </div>
    </div>
  </div>`;
}

/* Пилюля «Premium» в шапке экранов (видна и на мобильном, где боковой панели нет) */
function injectPremiumPill() {
  if (state.isPremium || state.screen === 'premium') return;
  const h = document.querySelector('#content .content-header');
  if (!h || h.querySelector('.pm-pill')) return;
  h.insertAdjacentHTML('beforeend', `<button class="pm-pill" onclick="go('premium')">${ICONS.spark}<span>Premium</span></button>`);
}


function renderMatches() {
  let list = state.liked.slice().sort((a, b) => b._match - a._match);
  if (state.matchFilter !== 'all') list = list.filter(u => u._reality === state.matchFilter);

  document.getElementById('content').innerHTML = `
    <div class="content-header">
      <div><h1 class="content-title">${t('your_matches_title')}</h1><p class="content-sub">${t('matches_sub', state.liked.length)}</p></div>
    </div>
    <div class="filter-tabs">
      ${['all', 'Reach', 'Target', 'Likely'].map(f => `<button class="filter-tab ${state.matchFilter === f ? 'active' : ''}" onclick="setMatchFilter('${f}')">${f === 'all' ? t('filter_all') : chanceLabel(f)}</button>`).join('')}
    </div>
    ${list.length === 0 ? `<div class="empty-state">
        <svg class="empty-illustration" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 1 0-7.8 7.8l1 1L12 21l7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.8Z"/></svg>
        <p>${t('empty_matches')}</p>
        <button class="btn btn-primary" onclick="go('discover')" style="margin-top:6px;">${t('to_discover')}</button>
      </div>` :
      list.map(u => `
        <div class="match-list-row reveal" onclick="viewUniversity(${u.id})">
          <div class="match-thumb uni-visual-host">${uniVisual(u)}</div>
          <div class="match-info"><h4>${u.name}</h4><div class="loc">${u.city}, ${cName(u.country)}${uniFactsLine(u) ? ' · ' + uniFactsLine(u) : ''}</div><p class="match-desc">${uniTagline(u)}</p></div>
          <div class="match-score-block"><div class="v score-count" data-target="${u._match}">0%</div><div class="l">${state.lang === 'ru' ? 'совпадение' : 'match'}</div></div>
          <span class="badge badge-${u._reality}">${chanceLabel(u._reality)}</span>
        </div>`).join('')
    }`;
  initScrollReveal();
  animateScoreCounters(document);
}
function setMatchFilter(f) { state.matchFilter = f; renderMatches(); }
function viewUniversity(id) {
  state.currentUniId = id;
  state.activeTab = 'overview';
  go('university');
  ensureUniLoaded(id);
}

/* ============================================================
   UNIVERSITY DETAIL
   ============================================================ */
function findUni(id) {
  let u = state.liked.find(x => x.id === id) || state.deck.find(x => x.id === id) || state.uniCache[id];
  if (u) return u;
  const base = UNIVERSITIES.find(x => x.id === id);
  if (!base) return null;
  return { ...base, _match: matchScore(base, state.profile), _reality: admissionReality(base, state.profile) };
}

/* ИСПРАВЛЕНИЕ: раньше findUni() либо находил вуз среди уже загруженного
   (state.liked/state.deck), либо откатывался на локальный справочник
   UNIVERSITIES — но там всего 50 записей, тогда как в базе на бэкенде их 200.
   Карточку любого университета за пределами этих 50, которого не было в
   текущей (отфильтрованной) подборке или в лайках, открыть было невозможно —
   renderUniversityDetail молча возвращал на Discover. Теперь, если findUni()
   ничего не находит синхронно, идём напрямую на бэкенд за конкретным id
   (см. GET /universities/{id} в main.py) и кэшируем результат. */
async function ensureUniLoaded(id) {
  if (findUni(id)) return;
  state.uniLookupPending = true;
  renderApp();
  try {
    const raw = await apiFetchUniversity(state.userId, id);
    state.uniCache[id] = fromApiUniScored(raw);
  } catch (e) {
    // apiRequest уже показал toast с ошибкой; university останется не найден —
    // renderUniversityDetail ниже аккуратно откатит на Discover, а не оставит
    // "Загружаем университет…" висеть навсегда.
  }
  state.uniLookupPending = false;
  if (state.screen === 'university' && state.currentUniId === id) renderApp();
}

function renderUniversityDetail() {
  const u = findUni(state.currentUniId);
  if (!u) {
    if (state.uniLookupPending) {
      document.getElementById('content').innerHTML =
        `<div class="uni-lookup-loading"><div class="spinner"></div><p>${t('uni_lookup_loading')}</p></div>`;
      return;
    }
    go('discover');
    return;
  }
  const p = state.profile, ru = isRu();
  const d = uniData(u);
  const m = matchParts(u, p), c = m.costInfo;
  const dir = mainDir(u, p);
  const tabs = ru
    ? [['overview', 'Обзор'], ['academics', 'Учёба и поступление'], ['cost', 'Стоимость и помощь'], ['why', 'Почему этот вуз']]
    : [['overview', 'Overview'], ['academics', 'Academics & admission'], ['cost', 'Cost & aid'], ['why', 'Why this university']];
  const trv = (pfx, v) => { const k = pfx + '_' + String(v || '').toLowerCase(); const r = t(k); return r && r !== k ? r : v; };
  const money = v => v ? fmtMoney(v) : (ru ? 'бесплатно' : 'free');
  const verdictText = {
    yes: ru ? 'Укладывается в бюджет' : 'Fits your budget',
    aid: ru ? (c.aid === 'full' ? 'Уложится, если одобрят помощь' : 'Уложится только со стипендией') : (c.aid === 'full' ? 'Fits if aid is approved' : 'Fits only with a scholarship'),
    no: ru ? `Не хватает ~${fmtMoney(c.gap)} в год` : `~${fmtMoney(c.gap)}/yr short`
  }[c.verdict];

  const keyStrip = `
    <dl class="ud-facts">
      <div><dt>${ru ? 'Совпадение' : 'Match'}</dt><dd>${u._match}%</dd><small>${ru ? 'с твоим профилем' : 'with your profile'}</small></div>
      <div class="k-${u._reality}"><dt>${ru ? 'Шанс поступить' : 'Admission chance'}</dt><dd>${chanceLabel(u._reality)}</dd><small>${ru ? 'принимают' : 'admit rate'} ${Math.max(1, Math.round(u.acceptance * 100))}%</small></div>
      <div><dt>${dirLabel(dir)}</dt><dd>${m.strength}<span> ${ru ? 'из' : '/'} 100</span></dd><small>${ru ? 'сила направления' : 'program strength'}</small></div>
      <div class="v-${c.verdict}"><dt>${ru ? 'В год с\u00A0жильём' : 'Per year, all-in'}</dt><dd>${money(c.total)}</dd><small>${verdictText}</small></div>
    </dl>`;

  let tabContent = '';
  if (state.activeTab === 'overview') {
    tabContent = `
      <div class="info-block reveal">
        <p class="uni-about">${uniDesc(u)}</p>
        <div class="pc-grid">
          <div class="pc-col pc-plus"><h5>${ru ? 'Сильные стороны' : 'Strengths'}</h5><ul>${(d ? L2(d.pros) : []).map(x => `<li><span>${typoDash(x)}</span></li>`).join('')}</ul></div>
          <div class="pc-col pc-minus"><h5>${ru ? 'Что учесть' : 'Keep in mind'}</h5><ul>${d ? `<li><span>${typoDash(L2(d.con))}</span></li>` : ''}${u.acceptance <= 0.15 ? `<li><span>${ru ? `Высокий конкурс: принимают ${Math.max(1, Math.round(u.acceptance * 100))}%` : `Highly selective: ${Math.max(1, Math.round(u.acceptance * 100))}% admitted`}</span></li>` : ''}</ul></div>
        </div>
      </div>
      ${uniFactsBlock(u)}
      <div class="info-block reveal">
        <h4>${t('snapshot')}</h4>
        <div class="kv-grid">
          <div class="kv"><div class="k">${t('location_kv')}</div><div class="v">${u.city}, ${cName(u.country)}</div></div>
          <div class="kv"><div class="k">${t('setting_kv')}</div><div class="v">${trv('setting', u.setting)}</div></div>
          <div class="kv"><div class="k">${t('size_kv')}</div><div class="v">${trv('size', u.size)}</div></div>
          <div class="kv"><div class="k">${t('climate_kv')}</div><div class="v">${trv('climate', u.climate)}</div></div>
        </div>
      </div>`;
  } else if (state.activeTab === 'academics') {
    const mine = userDirs(p);
    tabContent = `
      <div class="info-block reveal">
        <h4>${ru ? 'Сила по направлениям' : 'Strength by field'}</h4>
        <p class="block-note">${ru ? 'Оценка 0–100 по предметным рейтингам и репутации. Твои направления выделены.' : '0–100 estimate from subject rankings and reputation. Your fields are highlighted.'}</p>
        ${DIRS.map(k => { const v = d ? d.strengths[k] : (k === 'cs' ? u.cs : 50); return `<div class="bar-row ${mine.includes(k) ? 'is-mine' : ''}"><div class="top"><span>${dirLabel(k)}${mine.includes(k) ? ` <em>${ru ? 'твоё' : 'yours'}</em>` : ''}</span><b>${v}</b></div><div class="bar-track"><div class="bar-fill" data-target="${v}" style="width:0%"></div></div></div>`; }).join('')}
        <div class="bar-row"><div class="top"><span>${t('research_opp_kv')}</span><b>${u.research}/5</b></div><div class="bar-track"><div class="bar-fill" data-target="${u.research * 20}" style="width:0%"></div></div></div>
      </div>
      <div class="info-block reveal">
        <h4>${t('admission_reality_title')}</h4>
        <p class="block-note">${t('admission_reality_body', u.gpa25, u.gpa75, u.sat25, u.sat75)}</p>
        <span class="badge badge-${u._reality}" style="font-size:13px;padding:8px 16px;">${ru ? 'Шанс: ' : 'Chance: '}${chanceLabel(u._reality)}</span>
      </div>
      ${admissionSimulatorHtml(u)}
      <div id="partner-slot-test_prep"></div>`;
  } else if (state.activeTab === 'cost') {
    const aidName = {
      full: ru ? 'Покрывает подтверждённую нужду' : 'Meets demonstrated need',
      need: ru ? 'Частичная помощь по нужде' : 'Partial need-based aid',
      merit: ru ? 'Стипендии за успехи' : 'Merit scholarships',
      gov: ru ? 'Государственные стипендии' : 'Government scholarships',
      low: ru ? 'Почти нет помощи, но обучение недорогое' : 'Little aid, but low tuition'
    }[c.aid];
    const aidExplain = {
      full: ru ? `Вуз считает, сколько может платить семья, и доплачивает остальное. Если семья может ${fmtMoney(p.budget)} в год, примерно столько и придётся платить. Для иностранцев заявка на помощь часто немного снижает шансы поступить.` : `The school works out what your family can pay and covers the rest. If that's ${fmtMoney(p.budget)}/yr, that's roughly what you'd pay. For internationals, applying for aid can lower admission odds (need-aware).`,
      need: ru ? `Помощь возможна, но не гарантирована: обычно снижает плату за обучение на 15–40%. В лучшем случае — около ${fmtMoney(c.netBest)} в год.` : `Aid is possible but not guaranteed: usually 15–40% off tuition. Best case — about ${fmtMoney(c.netBest)}/yr.`,
      merit: ru ? `Стипендии дают за оценки и тесты, обычно 10–30% от обучения. С твоим профилем реалистично — до ${fmtMoney(c.aidMax)} в год, итого от ${fmtMoney(c.netBest)}.` : `Awards are based on grades and tests, typically 10–30% of tuition. With your profile — up to ${fmtMoney(c.aidMax)}/yr, so from ${fmtMoney(c.netBest)}.`,
      gov: ru ? `Государственная стипендия может покрыть обучение и часть проживания, но конкурс на неё отдельный. Без неё — ${money(c.total)} в год.` : `A government scholarship can cover tuition and part of living costs, but it's competitive. Without it — ${money(c.total)}/yr.`,
      low: ru ? 'Рассчитывай на полную сумму — стипендий почти нет, но и цена невысокая.' : 'Plan for the full amount — few scholarships, but the price is low.'
    }[c.aid];
    const barMax = Math.max(c.total, p.budget, 1);
    tabContent = `
      <div class="info-block reveal">
        <h4>${ru ? 'Сколько стоит год учёбы' : 'Cost of one year'}</h4>
        <div class="cost-table">
          <div class="cost-row"><span>${ru ? 'Обучение для иностранцев' : 'International tuition'}</span><b>${money(c.tuition)}</b></div>
          <div class="cost-row"><span>${ru ? 'Жильё, еда, транспорт' : 'Housing, food, transport'}</span><b>${money(c.living)}</b></div>
          <div class="cost-row total"><span>${ru ? 'Итого в год' : 'Total per year'}</span><b>${money(c.total)}</b></div>
          ${c.aidMax > 0 && (c.aid !== 'low' || c.domestic) ? `<div class="cost-row aid"><span>${ru ? 'Возможная помощь' : 'Possible aid'}</span><b>− ${fmtMoney(c.aidMax)}</b></div>
          <div class="cost-row total"><span>${ru ? 'В лучшем случае' : 'Best case'}</span><b>${money(c.netBest)}</b></div>` : ''}
        </div>
        <div class="budget-viz">
          <div class="bv-row"><span>${ru ? 'Полная цена' : 'Full price'}</span><div class="bv-track"><i style="width:${Math.round(c.total / barMax * 100)}%"></i></div><b>${money(c.total)}</b></div>
          ${c.aidMax > 0 && (c.aid !== 'low' || c.domestic) ? `<div class="bv-row best"><span>${ru ? 'С помощью' : 'With aid'}</span><div class="bv-track"><i style="width:${Math.round(c.netBest / barMax * 100)}%"></i></div><b>${money(c.netBest)}</b></div>` : ''}
          <div class="bv-row budget"><span>${ru ? 'Твой бюджет' : 'Your budget'}</span><div class="bv-track"><i style="width:${Math.round(p.budget / barMax * 100)}%"></i></div><b>${fmtMoney(p.budget)}</b></div>
        </div>
        <div class="verdict v-${c.verdict}">${c.verdict === 'yes' ? ICONS.check : ICONS.info}<div><b>${verdictText}</b><span>${c.verdict === 'yes' ? (p.budget - c.total < 1000 ? (ru ? 'Впритык: запаса почти нет, заложи расходы на перелёты и страховку.' : 'Tight: almost no buffer for flights and insurance.') : (ru ? `Остаётся запас ~${fmtMoney(p.budget - c.total)} в год.` : `About ${fmtMoney(p.budget - c.total)}/yr to spare.`)) : (c.verdict === 'aid' ? (ru ? `Без помощи не хватает ~${fmtMoney(c.over)} в год.` : `Without aid you're ~${fmtMoney(c.over)}/yr short.`) : (ru ? 'Даже с типичной помощью сумма выше бюджета. Смотри вузы с полной помощью или дешевле.' : 'Even with typical aid it exceeds your budget. Look at full-aid or cheaper schools.'))}</span></div></div>
      </div>
      <div class="info-block reveal">
        <h4>${ru ? 'Финансовая помощь для иностранцев' : 'Financial aid for internationals'}</h4>
        <div class="aid-type a-${c.aid}">${aidName}</div>
        <p class="block-note">${typoDash(aidExplain)}</p>
        ${c.intlLimited ? `<div class="aid-note">${ICONS.graduation}<span>${ru ? 'Важно: эта помощь — только для граждан страны вуза (или сильно урезана для иностранцев). В твоём расчёте она почти не учитывается, и в подборе вуз не получает за неё баллов.' : 'Important: this aid is for domestic students only (or heavily limited for internationals). Your estimate barely counts it, and matching gives no credit for it.'}</span></div>` : ''}
        ${c.domestic && u.country === 'Russia' ? `<div class="aid-note">${ICONS.graduation}<span>${ru ? 'Для граждан РФ есть бюджетные места: обучение бесплатно, если хватает баллов ЕГЭ. Расчёт выше это учитывает.' : 'Russian citizens can get tuition-free state-funded places with a high enough EGE score. The estimate above includes this.'}</span></div>` : ''}
        ${d ? `<div class="aid-note">${ICONS.graduation}<span>${typoDash(L2(d.aidNote))}</span></div>` : ''}
        <p class="fine-print">${typoDash(ru ? 'Суммы ориентировочные на 2025–26 учебный год, переведены в доллары. Точные цифры и сроки подачи на помощь — на сайте вуза' : 'Approximate 2025–26 figures in USD. Check exact numbers and aid deadlines on the university website')}${uniSite(u) ? `: <a href="${uniSite(u)}" target="_blank" rel="noopener noreferrer">${uniSite(u).replace(/^https?:\/\/(www\.)?/, '').replace(/\/.*$/, '')}</a>` : ''}.${catalogUpdatedLabel() ? ' ' + catalogUpdatedLabel() + '.' : ''}</p>
      </div>`;
  } else {
    tabContent = whyTabHtml(u, p);
  }

  const isSaved = !!state.liked.find(x => x.id === u.id);
  const site = uniSite(u);
  const factsLine = uniFactsLine(u);
  document.getElementById('content').innerHTML = `
  <article class="ud">
    <button class="ud-back" onclick="go('${isSaved ? 'matches' : 'discover'}')">${ICONS.back}<span>${isSaved ? (ru ? 'К понравившимся' : 'Back to saved') : (ru ? 'К подбору' : 'Back to Discover')}</span></button>
    <div class="ud-photo uni-visual-host">${uniVisual(u)}</div>
    <header class="ud-head">
      <div class="ud-head-l">
        <p class="ud-loc">${u.city}, ${cName(u.country)}${factsLine ? ' · ' + factsLine : ''}</p>
        <h1>${u.name}</h1>
        ${d ? `<p class="ud-tag">${L2(d.tag)}</p>` : ''}
      </div>
      <div class="ud-actions">
        <button class="ud-save ${isSaved ? 'is-saved' : ''}" onclick="toggleLike(${u.id})">${ICONS.heart}<span>${isSaved ? t('in_matches_btn') : t('save_btn')}</span></button>
        <button class="ud-save" onclick="exportUniPdf(${u.id})" title="${t('pdf_btn')}">${ICONS.book}<span>${t('pdf_btn')}</span></button>
        ${site ? `<a class="ud-site" href="${site}" target="_blank" rel="noopener noreferrer">${ICONS.globe}<span>${t('visit_website')}</span></a>` : ''}
      </div>
    </header>
    ${keyStrip}
    <nav class="ud-tabs">${tabs.map(([id, label]) => `<button class="${state.activeTab === id ? 'active' : ''}" onclick="setUniTab('${id}')">${label}</button>`).join('')}</nav>
    <div class="ud-grid">
      <div class="ud-main">${tabContent}</div>
      <aside class="ud-aside">
        <h4>${ru ? 'Из чего складывается совпадение' : 'What the match is made of'}</h4>
        <p class="ud-aside-total"><b>${u._match}%</b><span>${ru ? 'итог' : 'total'}</span></p>
        ${matchBreakdown(u, p).map(b => `<div class="bar-row"><div class="top"><span>${b.label} <em>${ru ? 'вес' : 'weight'} ${b.w}%</em></span><b>${b.val}%</b></div><div class="bar-track"><div class="bar-fill" data-target="${b.val}" style="width:0%"></div></div></div>`).join('')}
      </aside>
    </div>
  </article>`;
  initScrollReveal();
  animateBars(document);
  animateScoreCounters(document);
  if (state.activeTab === 'academics') loadPartnerSlot('admission_reality_low_score', u.id, 'partner-slot-test_prep');
}

function matchBreakdown(u, p) {
  const m = matchParts(u, p), ru = isRu();
  const w = matchWeightsFor(m);
  const rows = [
    { label: ru ? 'Направление' : 'Your field', val: Math.round(m.program * 100), w: w.program },
    { label: ru ? 'Стоимость и бюджет' : 'Cost vs budget', val: Math.round(m.cost * 100), w: w.cost },
    { label: ru ? 'Шансы поступить' : 'Admission odds', val: Math.round(m.chance * 100), w: w.chance },
    { label: ru ? 'Исследования' : 'Research', val: Math.round(m.research * 100), w: w.research },
    { label: ru ? 'Язык обучения' : 'Teaching language', val: Math.round(m.lang * 100), w: w.lang }
  ];
  if (m.prefs !== null) rows.push({ label: ru ? 'Город, климат, размер' : 'Setting, climate, size', val: Math.round(m.prefs * 100), w: w.prefs });
  return rows;
}

/* Вкладка «Почему этот вуз»: по каждому критерию — подходит / с оговоркой / не подходит
   и одно предложение, почему. Плюс настоящие сильные стороны вуза. */
function whyTabHtml(u, p) {
  const ru = isRu(), m = matchParts(u, p), c = m.costInfo, d = uniData(u);
  const dir = mainDir(u, p);
  const rows = [];
  const add = (lvl, title, text) => rows.push({ lvl, title, text });
  const majorsTxt = majorsLabel(p.majors && p.majors.length ? p.majors : [p.major]);
  add(m.strength >= 80 ? 'good' : (m.strength >= 65 ? 'ok' : 'bad'), ru ? 'Специальность' : 'Your major',
    ru ? `${majorsTxt}: направление «${dirLabel(dir).toLowerCase()}» здесь оценено на ${m.strength}/100${m.strength >= 90 ? ' — один из лучших вариантов в мире' : (m.strength >= 80 ? ' — сильная программа' : (m.strength >= 65 ? ' — нормальный уровень, но есть сильнее' : ' — это не профильное направление вуза'))}.`
      : `${majorsTxt}: ${dirLabel(dir).toLowerCase()} scores ${m.strength}/100 here${m.strength >= 90 ? ' — among the best anywhere' : (m.strength >= 80 ? ' — a strong program' : (m.strength >= 65 ? ' — decent, but stronger options exist' : ' — not a core strength of this school'))}.`);
  add(c.verdict === 'yes' ? 'good' : (c.verdict === 'aid' ? 'ok' : 'bad'), ru ? 'Бюджет' : 'Budget',
    ru ? `Год с жильём — ${c.total ? fmtMoney(c.total) : 'бесплатно'}, твой бюджет — ${fmtMoney(p.budget)}. ${c.verdict === 'yes' ? 'Укладываешься без помощи.' : (c.verdict === 'aid' ? `Уложишься только с помощью: в лучшем случае ${fmtMoney(c.netBest)}.` : `Даже с помощью не хватает ~${fmtMoney(c.gap)} в год.`)}`
      : `A year all-in costs ${c.total ? fmtMoney(c.total) : 'nothing'}, your budget is ${fmtMoney(p.budget)}. ${c.verdict === 'yes' ? 'You fit without aid.' : (c.verdict === 'aid' ? `Fits only with aid: best case ${fmtMoney(c.netBest)}.` : `Even with aid you're ~${fmtMoney(c.gap)}/yr short.`)}`);
  const gpaPos = p.gpa < u.gpa25 ? (ru ? 'ниже' : 'below') : (p.gpa > u.gpa75 ? (ru ? 'выше' : 'above') : (ru ? 'внутри' : 'within'));
  add(m.reality === 'Likely' ? 'good' : (m.reality === 'Target' ? 'ok' : 'bad'), ru ? 'Шансы' : 'Odds',
    ru ? `Твой GPA ${p.gpa} — ${gpaPos} диапазона принятых (${u.gpa25}–${u.gpa75}). Принимают ${Math.max(1, Math.round(u.acceptance * 100))}% заявок. Итог: ${chanceLabel(m.reality).toLowerCase()}.`
      : `Your GPA ${p.gpa} is ${gpaPos} the admitted range (${u.gpa25}–${u.gpa75}). Admit rate ${Math.max(1, Math.round(u.acceptance * 100))}%. Verdict: ${chanceLabel(m.reality).toLowerCase()}.`);
  add(m.research >= 0.75 ? 'good' : 'ok', ru ? 'Исследования' : 'Research',
    ru ? `Уровень исследований ${u.research}/5, ты хотел(а) ${p.research}/5.` : `Research level ${u.research}/5, you wanted ${p.research}/5.`);
  if (p.setting.length || p.climate.length || p.size.length) {
    const hits = [], miss = [];
    const tr = (pfx, v) => { const k = pfx + '_' + String(v || '').toLowerCase(); const r = t(k); return r && r !== k ? r : v; };
    if (p.setting.length) (p.setting.includes(u.setting) ? hits : miss).push(tr('setting', u.setting).toLowerCase());
    if (p.climate.length) (p.climate.includes(u.climate) ? hits : miss).push(tr('climate', u.climate).toLowerCase());
    if (p.size.length) (p.size.includes(u.size) ? hits : miss).push(tr('size', u.size).toLowerCase());
    add(!miss.length ? 'good' : (hits.length ? 'ok' : 'bad'), ru ? 'Место и формат' : 'Place & format',
      ru ? `${hits.length ? 'Совпадает: ' + hits.join(', ') + '. ' : ''}${miss.length ? 'Не совпадает: ' + miss.join(', ') + '.' : ''}` : `${hits.length ? 'Matches: ' + hits.join(', ') + '. ' : ''}${miss.length ? 'Differs: ' + miss.join(', ') + '.' : ''}`);
  }
  {
    const tl = COUNTRY_TEACH_LANG[u.country] || 'en';
    const eng = englishProficiencyLevel(p);
    const ln = ru ? LANG_NAME_RU[tl] : LANG_NAME_EN[tl];
    if (p.homeCountry && p.homeCountry === u.country) {
      add('good', ru ? 'Страна и язык' : 'Country & language', ru ? 'Учёба в своей стране: без визы, переезда за границу и языкового барьера.' : 'Studying in your own country: no visa, no move abroad, no language barrier.');
    } else if (tl !== 'en') {
      const native = p.nativeLang === tl;
      add(native ? 'good' : 'ok', ru ? 'Язык обучения' : 'Teaching language',
        ru ? `Бакалавриат здесь в основном на ${ln}${native ? ' — это твой родной язык.' : '; на английском программ меньше. Проверь, есть ли твоя специальность на английском.'}`
          : `Bachelor's teaching is mostly in ${ln}${native ? ' — your native language.' : '; fewer programs in English. Check whether your major is taught in English.'}`);
    } else if (p.nativeLang === 'en') {
      add('good', ru ? 'Язык обучения' : 'Teaching language', ru ? 'Обучение на английском — твоём родном языке.' : 'Taught in English, your native language.');
    } else if (eng) {
      add(eng.level === 'low' ? 'bad' : 'good', ru ? 'Английский' : 'English', (ru ? eng.label_ru : eng.label_en) + (ru ? '. Обычно просят IELTS 6.5–7, TOEFL 90–100 или DET 120+.' : '. Usually IELTS 6.5–7, TOEFL 90–100 or DET 120+ is required.'));
    } else {
      add('ok', ru ? 'Английский' : 'English', ru ? 'Обучение на английском. Понадобится IELTS (6.5+), TOEFL (90+) или Duolingo (120+) — добавь результат в профиль.' : 'Taught in English. You will need IELTS (6.5+), TOEFL (90+) or Duolingo (120+) — add your score to the profile.');
    }
  }
  if (u.country === 'Russia' && p.tests.EGE && p.tests.EGE.taken) {
    const er = egeReality(u, p);
    add(er === 'Likely' ? 'good' : (er === 'Target' ? 'ok' : 'bad'), ru ? 'ЕГЭ' : 'EGE', ru ? `Твой ЕГЭ — ${p.tests.EGE.score}. ${er === 'Likely' ? 'Это хороший результат для бюджетных мест.' : (er === 'Target' ? 'На бюджет можно пройти, но многое зависит от специальности.' : 'На популярные бюджетные программы баллов может не хватить — посмотри проходные баллы своей специальности.')}` : `Your EGE total is ${p.tests.EGE.score}. Cutoffs for tuition-free places depend on the program.`);
  }
  if (p.needsAid === true) add(['full', 'gov'].includes(c.aid) ? 'good' : (c.aid === 'low' ? 'bad' : 'ok'), ru ? 'Финпомощь' : 'Financial aid', d ? L2(d.aidNote) : '');
  const goodN = rows.filter(r => r.lvl === 'good').length;
  const summary = ru
    ? (goodN >= 4 ? 'Сильный кандидат в твой список' : (goodN >= 2 ? 'Подходит с оговорками' : 'Скорее не твой вариант'))
    : (goodN >= 4 ? 'A strong pick for your list' : (goodN >= 2 ? 'A fit with caveats' : 'Probably not your best option'));
  const icon = l => l === 'good' ? ICONS.check : (l === 'ok' ? ICONS.info : ICONS.x);
  return `
    <div class="info-block reveal">
      <h4>${ru ? 'Как этот вуз подходит тебе' : 'How this university fits you'}</h4>
      <div class="why-summary">${summary} · ${goodN} ${ru ? 'из' : 'of'} ${rows.length}</div>
      <ul class="why-list">${rows.map(r => `<li class="w-${r.lvl}"><span class="why-ic">${icon(r.lvl)}</span><div><b>${r.title}</b><p>${typoDash(r.text)}</p></div></li>`).join('')}</ul>
    </div>
    ${d ? `<div class="info-block reveal"><h4>${ru ? 'Чем выделяется этот вуз' : 'What makes it stand out'}</h4><ul class="why-pros">${L2(d.pros).map(x => `<li>${ICONS.check}<span>${typoDash(x)}</span></li>`).join('')}</ul></div>` : ''}`;
}

function buildWhyReasons(u, p) {
  const d = uniData(u);
  return d ? L2(d.pros) : [t('why_generic')];
}

/* Короткая подсказка "плюс / минус" на карточке свайпа — чтобы решать не
   только по цифрам (Match/Accept/Cost), а сразу видеть главный аргумент
   "за" и главную оговорку. Чистая функция от u, детерминированная (одна и
   та же пара для одного и того же вуза), без обращения к профилю p —
   в отличие от buildWhyReasons() это не "почему подходит тебе", а общая
   характеристика вуза в двух словах. */
function quickTakeaway(u) {
  // Плюсы/минусы под профиль: направление пользователя, его бюджет, его шансы —
  // плюс один настоящий факт о вузе из UNI_DATA.
  const p = state.profile, ru = isRu();
  const m = matchParts(u, p), c = m.costInfo, d = uniData(u);
  const dir = mainDir(u, p), dl = dirLabel(dir).toLowerCase();
  const plus = [], minus = [];
  if (m.strength >= 90) plus.push(ru ? `Топ по направлению «${dl}»` : `Top for ${dl}`);
  else if (m.strength >= 78) plus.push(ru ? `Сильная программа: ${dl}` : `Strong in ${dl}`);
  if (c.verdict === 'yes') plus.push(ru ? 'Укладывается в твой бюджет' : 'Fits your budget');
  else if (c.verdict === 'aid') plus.push(ru ? (c.aid === 'full' ? 'Покрывает нужду — шанс уложиться в бюджет' : 'В бюджет — только со стипендией') : (c.aid === 'full' ? 'Meets need — can fit your budget' : 'Fits budget only with a scholarship'));
  if (m.reality === 'Likely') plus.push(ru ? 'Твои баллы выше, чем у большинства принятых' : 'Your scores beat most admits');
  if (d && plus.length < 2) plus.push(L2(d.pros)[0]);
  if (m.strength < 65) minus.push(ru ? `Слабее по направлению «${dl}»` : `Weaker for ${dl}`);
  if (c.verdict === 'no') minus.push(ru ? `Дороже бюджета на ${fmtMoney(c.gap)} в год` : `${fmtMoney(c.gap)}/yr over budget`);
  if (u.acceptance <= 0.12) minus.push(ru ? `Принимают всего ${Math.max(1, Math.round(u.acceptance * 100))}%` : `Only ${Math.max(1, Math.round(u.acceptance * 100))}% admitted`);
  if (d && !minus.length) minus.push(L2(d.con));
  return { plus: plus.slice(0, 2), minus: minus.slice(0, 1) };
}
function uniTagline(u) { const d = uniData(u); return d ? L2(d.tag) : uniDesc(u); }

function setUniTab(id) { state.activeTab = id; renderUniversityDetail(); }
async function toggleLike(id) {
  const idx = state.liked.findIndex(x => x.id === id);
  try {
    if (idx > -1) {
      await apiDeleteSwipe(state.userId, id); // DELETE — убирает свайп из истории, вуз снова может попасть в deck
      state.liked.splice(idx, 1);
      removeTrackerEntry(id); // Application Tracker: карточка заявки пропадает вместе с лайком
      toast(t('removed_from_matches'));
    } else {
      await apiPostSwipe(state.userId, id, true);
      const u = findUni(id);
      state.liked.push(u);
      ensureTrackerEntry(id); // Application Tracker: карточка заявки появляется автоматически
      toast(t('added_to_matches_short'));
    }
  } catch (e) {
    return; // ошибка уже показана тостом внутри apiRequest, локальный state не трогаем
  }
  renderUniversityDetail();
}

/* ============================================================
   UNIVERSITY DNA
   ============================================================ */
// Реестр отдельных метрик DNA — каждая считается только по существующим
// полям вузов (research/cost/acceptance/setting/climate/size/cs), поэтому
// набор осей под любое направление собирается из одних и тех же "кирпичей",
// без придумывания несуществующих в данных полей per-major.
const DNA_METRICS = {
  cs: liked => Math.round(liked.reduce((s, u) => s + u.cs, 0) / liked.length),
  research: liked => Math.round(liked.reduce((s, u) => s + u.research, 0) / liked.length * 20),
  coastal: liked => Math.round(100 * liked.filter(u => u.setting === 'Coastal').length / liked.length),
  urban: liked => Math.round(100 * liked.filter(u => u.setting === 'Urban').length / liked.length),
  costSensitive: liked => Math.round(100 - Math.min(100, (liked.reduce((s, u) => s + u.cost, 0) / liked.length) / 700)),
  warm: liked => Math.round(100 * liked.filter(u => u.climate === 'Warm').length / liked.length),
  // "Selective" — ниже средний acceptance rate у лайкнутых = выше селективность.
  selective: liked => Math.round(100 - Math.min(100, (liked.reduce((s, u) => s + u.acceptance, 0) / liked.length) * 100)),
  smallCohort: liked => Math.round(100 * liked.filter(u => u.size === 'Small' || u.size === 'Medium').length / liked.length),
  largeNetwork: liked => Math.round(100 * liked.filter(u => u.size === 'Large').length / liked.length),
  // "Theory-focused" — композит из research + selective: тяжёлые по науке
  // и одновременно селективные школы обычно сильнее в теоретической базе.
  theoryFocus: liked => Math.round((DNA_METRICS.research(liked) + DNA_METRICS.selective(liked)) / 2),
};

// Набор осей радара по категории направления (state.obMajorCategory).
// Для 'cs' оставлен исходный набор без изменений, чтобы не менять то, что
// уже видели существующие пользователи. Остальные категории собраны из
// DNA_METRICS так, чтобы отражать то, что реально важно для направления
// (напр. для математики — теория/наука/маленькие потоки, а не "CS-focused").
const DNA_AXIS_SETS = {
  cs: [
    { k: 'cs', label: 'CS-focused', label_ru: 'Технологии (информатика)' }, { k: 'coastal', label: 'Coastal', label_ru: 'У океана' }, { k: 'research', label: 'Research', label_ru: 'Наука' },
    { k: 'urban', label: 'Urban', label_ru: 'Городской' }, { k: 'costSensitive', label: 'Cost-sensitive', label_ru: 'Бюджетность' }, { k: 'warm', label: 'Warm climate', label_ru: 'Тёплый климат' }
  ],
  eng: [
    { k: 'research', label: 'Research-intensive', label_ru: 'Насыщенность наукой' }, { k: 'selective', label: 'Selective', label_ru: 'Селективность' }, { k: 'smallCohort', label: 'Small cohort', label_ru: 'Маленькие потоки' },
    { k: 'urban', label: 'Urban', label_ru: 'Городской' }, { k: 'costSensitive', label: 'Cost-sensitive', label_ru: 'Бюджетность' }, { k: 'warm', label: 'Warm climate', label_ru: 'Тёплый климат' }
  ],
  math: [
    { k: 'theoryFocus', label: 'Theory-focused', label_ru: 'Теоретическая база' }, { k: 'research', label: 'Research-intensive', label_ru: 'Насыщенность наукой' }, { k: 'smallCohort', label: 'Small cohort', label_ru: 'Маленькие потоки' },
    { k: 'selective', label: 'Selective', label_ru: 'Селективность' }, { k: 'costSensitive', label: 'Cost-sensitive', label_ru: 'Бюджетность' }, { k: 'warm', label: 'Warm climate', label_ru: 'Тёплый климат' }
  ],
  biz: [
    { k: 'selective', label: 'Selective', label_ru: 'Селективность' }, { k: 'urban', label: 'Urban', label_ru: 'Городской' }, { k: 'largeNetwork', label: 'Large network', label_ru: 'Большая сеть' },
    { k: 'costSensitive', label: 'Cost-sensitive', label_ru: 'Бюджетность' }, { k: 'coastal', label: 'Coastal', label_ru: 'У океана' }, { k: 'warm', label: 'Warm climate', label_ru: 'Тёплый климат' }
  ],
  social: [
    { k: 'urban', label: 'Urban', label_ru: 'Городской' }, { k: 'smallCohort', label: 'Small cohort', label_ru: 'Маленькие потоки' }, { k: 'research', label: 'Research', label_ru: 'Наука' },
    { k: 'costSensitive', label: 'Cost-sensitive', label_ru: 'Бюджетность' }, { k: 'coastal', label: 'Coastal', label_ru: 'У океана' }, { k: 'warm', label: 'Warm climate', label_ru: 'Тёплый климат' }
  ],
  health: [
    { k: 'research', label: 'Research-intensive', label_ru: 'Насыщенность наукой' }, { k: 'selective', label: 'Selective', label_ru: 'Селективность' }, { k: 'urban', label: 'Urban', label_ru: 'Городской' },
    { k: 'costSensitive', label: 'Cost-sensitive', label_ru: 'Бюджетность' }, { k: 'coastal', label: 'Coastal', label_ru: 'У океана' }, { k: 'warm', label: 'Warm climate', label_ru: 'Тёплый климат' }
  ],
  humanities: [
    { k: 'smallCohort', label: 'Small cohort', label_ru: 'Маленькие потоки' }, { k: 'urban', label: 'Urban', label_ru: 'Городской' }, { k: 'coastal', label: 'Coastal', label_ru: 'У океана' },
    { k: 'costSensitive', label: 'Cost-sensitive', label_ru: 'Бюджетность' }, { k: 'warm', label: 'Warm climate', label_ru: 'Тёплый климат' }, { k: 'selective', label: 'Selective', label_ru: 'Селективность' }
  ],
  law: [
    { k: 'selective', label: 'Selective', label_ru: 'Селективность' }, { k: 'urban', label: 'Urban', label_ru: 'Городской' }, { k: 'largeNetwork', label: 'Large network', label_ru: 'Большая сеть' },
    { k: 'costSensitive', label: 'Cost-sensitive', label_ru: 'Бюджетность' }, { k: 'coastal', label: 'Coastal', label_ru: 'У океана' }, { k: 'warm', label: 'Warm climate', label_ru: 'Тёплый климат' }
  ],
};
// Подпись оси на текущем языке интерфейса — та же схема, что у majorLabel()/
// categoryLabel() выше: канонический (английский) `label` используется как
// значение/ключ при необходимости, а на экране показывается перевод, если
// state.lang === 'ru'.
function axisLabel(axis) {
  return state.lang === 'ru' ? (axis.label_ru || axis.label) : axis.label;
}
function dnaAxesForCategory(categoryKey) {
  return DNA_AXIS_SETS[categoryKey] || DNA_AXIS_SETS.cs;
}

function computeDNA(categoryKey) {
  const axes = dnaAxesForCategory(categoryKey);
  const liked = state.liked;
  const out = {};
  if (liked.length === 0) {
    axes.forEach(a => out[a.k] = 50);
    return out;
  }
  axes.forEach(a => out[a.k] = DNA_METRICS[a.k](liked));
  return out;
}

function radarLabelLines(text) {
  // Длинные подписи («Насыщенность наукой», «Теоретическая база») режем на две строки
  // по ближайшему к середине пробелу — так они не вылезают за край SVG.
  if (text.length <= 12 || text.indexOf(' ') === -1) return [text];
  const mid = text.length / 2;
  let best = -1;
  for (let i = 0; i < text.length; i++) if (text[i] === ' ' && (best === -1 || Math.abs(i - mid) < Math.abs(best - mid))) best = i;
  return [text.slice(0, best), text.slice(best + 1)];
}
function renderRadar(dna, axes) {
  axes = axes || DNA_AXIS_SETS.cs;
  // Широкий viewBox с запасом по бокам: подписи стоят снаружи радара и выравниваются
  // по стороне (слева — по правому краю, справа — по левому), а не по центру.
  const W = 520, H = 400, cx = W / 2, cy = 200, R = 128;
  const n = axes.length;
  function pt(i, val, extra) {
    const angle = (Math.PI * 2 * i / n) - Math.PI / 2;
    const r = (val / 100) * R + (extra || 0);
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle), Math.cos(angle), Math.sin(angle)];
  }
  const poly = axes.map((a, i) => pt(i, dna[a.k]).slice(0, 2).join(',')).join(' ');
  const rings = [0.25, 0.5, 0.75, 1].map(f => {
    const p = axes.map((a, i) => pt(i, f * 100).slice(0, 2).join(',')).join(' ');
    return `<polygon points="${p}" fill="none" stroke="var(--border)" stroke-width="1"/>`;
  }).join('');
  const spokes = axes.map((a, i) => {
    const [x, y] = pt(i, 100);
    return `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="var(--border)" stroke-width="1"/>`;
  }).join('');
  const labels = axes.map((a, i) => {
    const [x, y, c, sn] = pt(i, 100, 16);
    const anchor = c > 0.3 ? 'start' : (c < -0.3 ? 'end' : 'middle');
    const lines = radarLabelLines(axisLabel(a));
    const lh = 13;
    const total = lines.length + 1; // строки подписи + строка с процентом
    const y0 = y + (sn > 0.3 ? 8 : (sn < -0.3 ? -4 - (total - 1) * lh : 4 - (total - 1) * lh / 2));
    const tspans = lines.map((ln, j) => `<tspan x="${x}" dy="${j === 0 ? 0 : lh}">${ln}</tspan>`).join('');
    return `<text x="${x}" y="${y0}" text-anchor="${anchor}" font-size="12.5" font-weight="700" fill="var(--ink-soft)" font-family="Manrope, sans-serif">${tspans}<tspan x="${x}" dy="${lh + 1}" fill="var(--primary)" font-size="12" font-weight="800">${dna[a.k]}%</tspan></text>`;
  }).join('');
  const dots = axes.map((a, i) => {
    const [x, y] = pt(i, dna[a.k]);
    return `<circle class="dna-radar-dot" cx="${x}" cy="${y}" r="4" fill="var(--primary)" style="animation-delay:${0.5 + i * 0.05}s"/>`;
  }).join('');
  return `<svg class="dna-radar-svg" viewBox="0 0 ${W} ${H}" style="width:100%;max-width:520px;display:block;margin:0 auto;overflow:visible;">
    ${rings}${spokes}
    <polygon class="dna-radar-shape" points="${poly}" fill="color-mix(in srgb, var(--primary) 18%, transparent)" stroke="var(--primary)" stroke-width="2.5" stroke-linejoin="round"/>
    ${dots}${labels}
  </svg>`;
}

function renderDNA() {
  // Оси радара теперь зависят от направления, выбранного на онбординге
  // (state.obMajorCategory), а не фиксированы на CS-набор — см. DNA_AXIS_SETS.
  const categoryKey = state.obMajorCategory;
  const axes = dnaAxesForCategory(categoryKey);
  const dna = computeDNA(categoryKey);
  const liked = state.liked;
  document.getElementById('content').innerHTML = `
    <div class="content-header">
      <div><h1 class="content-title">${t('dna_title')}</h1><p class="content-sub">${t('dna_sub', liked.length)}</p></div>
    </div>
    <div class="stat-tiles">
      <div class="stat-tile reveal"><div class="v score-count" data-target="${liked.length}" data-suffix="">0</div><div class="l">${t('dna_liked')}</div></div>
      <div class="stat-tile reveal"><div class="v score-count" data-target="${state.disliked.length}" data-suffix="">0</div><div class="l">${t('dna_passed')}</div></div>
      <div class="stat-tile reveal"><div class="v score-count" data-target="${liked.length ? Math.round(liked.reduce((s, u) => s + u._match, 0) / liked.length) : 0}">0%</div><div class="l">${t('dna_avg')}</div></div>
    </div>
    <div class="dna-layout">
      <div class="dna-card reveal">
        <h4 style="font-family:var(--font-display);margin:0 0 4px;">${t('dna_profile_title')}</h4>
        <p class="list-caption" style="margin:0 0 10px;">${t('dna_profile_sub')}</p>
        ${renderRadar(dna, axes)}
        <div class="dna-legend">
          ${axes.map(a => `<span class="item">${axisLabel(a)}: ${dna[a.k]}%</span>`).join('')}
        </div>
      </div>
      <div class="dna-card reveal">
        <h4 style="font-family:var(--font-display);margin:0 0 12px;">${t('dna_what_title')}</h4>
        <p style="font-size:13.5px;color:var(--ink-soft);line-height:1.6;">${t('dna_what_p1')}</p>
        <p style="font-size:13.5px;color:var(--ink-soft);line-height:1.6;">${t('dna_what_p2')}</p>
      </div>
    </div>`;
  initScrollReveal();
  animateScoreCounters(document);
  animateRadar(document);
}

/* ============================================================
   INIT
   ============================================================ */
/* Раньше это тело try{} жило только внутри init(). Вынесено в отдельную
   функцию, чтобы её же вызывать сразу после успешного логина/регистрации
   (submitAuthForm) — не дублировать 3 запроса и переключение экранов. */
async function loadSessionForUser(userId) {
  state.deckLoading = true;
  document.getElementById('landing').classList.add('hidden');
  document.getElementById('onboarding').classList.add('hidden');
  document.getElementById('login').classList.add('hidden');
  document.getElementById('mainapp').classList.remove('hidden');
  state.screen = 'discover';
  renderApp();

  // 1) профиль — источник истины GET /users/{id}. Для зарегистрированных бэкенд
  // требует Bearer-токен: сессия протухла/стёрлась — НЕ запираем человека на
  // экране входа (жалоба: «без регистрации не пускает на сайт»). Чистим
  // протухшие ключи и откатываемся на лендинг: можно зайти гостём или
  // нажать «Войти» в шапке — когда сам захочет.
  let user;
  try {
    user = await apiFetchUser(userId);
  } catch (e) {
    state.deckLoading = false;
    document.getElementById('mainapp').classList.add('hidden');
    document.getElementById('landing').classList.remove('hidden');
    clearAuthSession();
    try { lsRemove(GUEST_KEY); } catch (e2) { }
    try { toast(t('auth_session_expired')); } catch (e3) { }
    state.guestId = generateGuestId();
    renderLanding();
    return;
  }
  state.userId = userId;
  state.guestId = user.guestId;
  state.isRegistered = user.isRegistered;
  state.email = user.email;
  state.lang = user.lang || state.lang;
  state.isPremium = !!user.isPremium;
  state.profile = Object.assign(state.profile, user.profile);
  applyProfileExtras(state.profile);
  // Бэкенд хранит только одну специальность (profile.major) — мульти-select
  // существует только на фронте. После загрузки профиля с бэка синхронизируем
  // majors с тем, что реально пришло, иначе там мог остаться дефолт из
  // начального state и разойтись с тем, что видит пользователь.
  state.profile.majors = state.profile.major ? [state.profile.major] : [];
  // size/setting/climate теперь мульти-select (массивы) на фронте; бэкенд
  // может вернуть старую схему (null или одиночную строку) — приводим к
  // массиву на всякий случай, чтобы .includes()/.length в коде выше не упали.
  state.profile.size = normalizeMultiSelect(state.profile.size);
  state.profile.setting = normalizeMultiSelect(state.profile.setting);
  state.profile.climate = normalizeMultiSelect(state.profile.climate);
  state.obMajorCategory = findMajorCategory(state.profile.major);

  // 2) уже лайкнутые вузы — GET /users/{id}/matches (нужны для экранов Matches/DNA)
  const matches = await apiFetchMatches(state.userId);
  // dedupe по id: Application Tracker хранит прогресс в объекте, ключом
  // которого служит u.id (см. ensureTrackerEntry/data[u.id] ниже) — если
  // сюда попадут два элемента с одинаковым id (дубль в ответе бэка), оба
  // будут читать и мутировать один и тот же объект прогресса, из-за чего
  // чек-лист/статус одной карточки визуально "телепортируется" на дубль.
  const seenLikedIds = new Set();
  state.liked = matches.map(fromApiUniScored).filter(u => {
    if (seenLikedIds.has(u.id)) return false;
    seenLikedIds.add(u.id);
    return true;
  });
  state.liked.forEach(u => { state.uniCache[u.id] = u; });
  syncTrackerWithLiked();

  // 3) сама подборка на сегодня — GET /universities?user_id= (уже без свайпнутых)
  await buildDeck();

  state.deckLoading = false;
  saveGuestSession();
  renderApp();
}

(async function init() {
  initAppBgNight();
  // Глобальный слушатель: как только <img class="uni-photo"> (см. uniVisual)
  // догружается — ставим ему .loaded → CSS fade-in поверх мгновенного SVG-fallback.
  // Это делигированный listener на document, а не на каждый render, чтобы не
  // терялся при каждом content.innerHTML перерендере renderDiscover().
  document.addEventListener('load', (e) => {
    if (e.target && e.target.classList && e.target.classList.contains('uni-photo')) {
      e.target.classList.add('loaded');
    }
  }, true); // capture=true: события load у <img> не всплывают
  // Заливка трека слайдеров на лету: перехватываем любой input[type=range]
  // на документе, чтобы не вешать обработчик на каждый слайдер после каждого
  // innerHTML-перерендера (см. paintRange выше).
  document.addEventListener('input', (e) => {
    if (e.target && e.target.type === 'range') paintRange(e.target);
  }, true);
  // Ссылка «только для чтения» для родителя/консультанта (#share=<token>):
  // отдельный экран без входа в аккаунт — гостевую сессию не трогаем.
  if (await maybeRenderSharedView()) return;
  // Возврат со страницы оплаты Stripe (?payment=success): вебхук может
  // прийти чуть позже редиректа — показываем тост и перезагружаем профиль
  // через пару секунд, чтобы isPremium подтянулся сам.
  {
    const qp = new URLSearchParams(location.search);
    if (qp.get('payment') === 'success') {
      history.replaceState(null, '', location.pathname + location.hash);
      toast(t('pm_pay_success'));
      setTimeout(async () => {
        if (state.userId) { try { await loadSessionForUser(state.userId); } catch (e) { } }
      }, 4000);
    } else if (qp.get('payment') === 'cancel') {
      history.replaceState(null, '', location.pathname + location.hash);
    }
  }
  // Конфиг оплаты {stripe, demo} — фронт рисует честные кнопки Premium.
  loadPaymentsConfig();
  if (location.hash.includes('access_token') && await handleYandexRedirect()) return;
  loadAuthSession(); // Bearer-токен нужен loadSessionForUser ниже (GET /users/{id})
  const saved = loadGuestSession();
  // синхронизируем html lang с языком сессии (переносы слов, a11y)
  document.documentElement.lang = (saved && saved.lang) || 'ru';
  // ВАЖНО: state.guestId должен стоять ДО loadSessionForUser: apiRequest шлёт
  // заголовок X-Guest-Token только если state.guestId не пуст. Без этого гость
  // при перезагрузке страницы получал 401 на GET /users/{id} и терял сессию
  // (лайки/профиль) — каждый F5 начинал жизнь заново.
  if (saved && saved.guestId) state.guestId = saved.guestId;

  if (saved && saved.userId) {
    state.lang = saved.lang || 'ru';
    try {
      await loadSessionForUser(saved.userId);
      return;
    } catch (e) {
      // Бэкенд недоступен или userId на сервере больше не существует (например, БД
      // пересоздали) — откатываемся на онбординг вместо зависшего skeleton-экрана.
      state.deckLoading = false;
      document.getElementById('mainapp').classList.add('hidden');
      document.getElementById('landing').classList.remove('hidden');
      try { lsRemove(GUEST_KEY); } catch (e2) { }
    }
  }

  state.guestId = (saved && saved.guestId) || generateGuestId();
  state.lang = (saved && saved.lang) || 'ru';
  renderLanding();
})();