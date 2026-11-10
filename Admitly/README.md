# Admitly

Сервис подбора университетов через свайпы: Match Score (совпадение по вкусу),
Admission Reality (оценка шансов по баллам). 330 вузов в каталоге, RU/EN,
светлая/тёмная темы, вход и регистрация, Premium (PDF-отчёт, доступ для
родителя/консультанта, приоритет в подборе).

## Что нового в этой версии

- **Лендинг**: мокап телефона теперь как настоящий iPhone — титановая рамка,
  чёрный безель, Dynamic Island с камерой, кнопки громкости и питания,
  спокойный наклон без лишнего «эйч-ти-си-глоу».
- **Шаг «Расскажи о себе»**: выпадающие списки «Откуда ты» и «Родной язык»
  получили аккуратные кнопки — скруглённые, с шевроном, подсветкой при
  наведении и фокусе, шеврон переворачивается при открытии. У каждого
  вопроса подсказка: «От этого зависят стипендии…», «Язык, на котором ты
  учился…». Формат выбора не менялся — только внешний вид.
- **Свежесть каталога**: на экране подбора и на вкладке стоимости появился
  бейдж «Цены проверены: …» — дата берётся из даты последнего изменения
  `backend/data/universities.json` (константа `CATALOG_UPDATED` в
  `unidata.js`, генерируется `tools/make_unidata.py`). Обновляешь каталог —
  дата обновляется сама.
- **Язык обучения — новый критерий подбора (вес 9%)**: вуз, где учат на твоём
  родном языке, получает максимум; учёба на английском засчитывается, если
  английский родной или сдан IELTS 6.5+ / TOEFL 90+ / DET 110+; другой язык
  без подготовки — честный барьер (снижение). Веса сбалансированы: направление
  31, стоимость 25–40 (чем меньше бюджет, тем важнее), шансы 13, исследования
  9, предпочтения 13, язык 9.
- **Стипендии и происхождение — теперь по-настоящему учитываются**:
  - Если стипендия вуза заявлена «только для граждан страны вуза» или в
    описании помощи прямо сказано «limited for internationals», а ты из
    другой страны — вуз НЕ получает за неё баллов в подборе, а на вкладке
    «Стоимость и помощь» появляется честное предупреждение.
  - Убрана старая дыра: раньше вузы с заявленным «Meets 100% need» (High)
    продолжали получать полный балл за помощь даже при пометке «limited for
    internationals». Теперь уровень снижается до Low и в фронте, и в бэке.
  - Пример эффекта (профиль «нужна помощь»): University of Michigan — match
    40 для иностранца против 47 для гражданина США, MIT — 48 против 73.
- **Карта в мобильной версии**: подпись «Нажми на регион, чтобы выбрать его
  или снять выбор» больше не капсом и без разреженных букв — обычный
  читаемый текст.
- Проверено: test_scoring.py 26/26, test_auth.py 54 ok, test_catalog.py 24 ok.

## Структура

```
admitly/
├── render.yaml              # деплой API на Render (rootDir: backend)
├── README.md                # этот файл
├── tools/
│   └── make_unidata.py      # генератор frontend/unidata.js из каталога
├── backend/                 # FastAPI API (Python)
│   ├── main.py              # точка входа (uvicorn main:app)
│   ├── models.py            # таблицы БД (users, swipes, sessions, share_links)
│   ├── schemas.py           # Pydantic-схемы запросов/ответов
│   ├── scoring.py           # Match Score, шансы, язык, стипендии
│   ├── auth.py              # регистрация/вход, pbkdf2-хэши, Bearer-сессии
│   ├── entitlements.py      # Premium-права
│   ├── placements.py        # партнёрские переходы (/go)
│   ├── database.py          # подключение БД (SQLite по умолчанию / Postgres)
│   ├── seed_data.py         # заливка каталога вузов в БД при старте
│   ├── data/universities.json   # 330 вузов — источник истины каталога
│   ├── test_*.py            # тесты (см. «Тесты»)
│   ├── requirements.txt     # зависимости
│   ├── runtime.txt          # версия Python для Render
│   └── file.env.example     # пример переменных окружения
└── frontend/                # статический сайт (без сборки)
    ├── index.html
    ├── app.js               # всё приложение (vanilla JS)
    ├── styles.css
    ├── unidata.js           # справочник вузов (генерируется tools/make_unidata.py)
    └── assets/              # логотипы, иконки
```

## Как запустить (локально)

Нужен Python 3.12+.

### 1. Бэкенд

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --host 127.0.0.1 --port 8000
```

При первом старте база создаётся автоматически (SQLite-файл `unimatch.db`
рядом с кодом), и каталог 330 вузов заливается из `data/universities.json`.

Проверка: открой http://127.0.0.1:8000/health — должно быть
`{"status":"ok","universities":330}`.

Хочешь потестировать Premium-функции без оплаты:

```bash
ADMITLY_DEMO_PREMIUM=1 uvicorn main:app --host 127.0.0.1 --port 8000
```

### 2. Фронтенд

Фронтенд — статика, но открывать index.html двойным кликом (file://) нельзя:
приложение ходит в API. Подними любой статический сервер:

```bash
cd frontend
python3 -m http.server 5500
```

Открой в браузере:

```
http://localhost:5500/?api=http://127.0.0.1:8000
```

Параметр `?api=` переключает приложение на локальный бэкенд (без него —
боевой адрес на Render). Дальше: «Начать бесплатно» → 5 шагов онбординга →
подборка.

### 3. Тесты

```bash
cd backend
python3 -m unittest test_scoring        # юнит-тесты скоринга — сервер не нужен
python3 test_social.py                  # соцвход/оплата: юнит-часть без сервера
python3 -m unittest test_auth            # интеграционные — нужен поднятый uvicorn (порт 8000)
python3 -m unittest test_catalog         # интеграционные — тоже
```

Актуальный статус: scoring 26/26, auth 54 ok, catalog 27 ok, social/payments 16 ok.

## Соцвход (Google / Яндекс / Telegram)

Связка «аккаунт провайдера → профиль Admitly» хранится в БД (таблица
`social_accounts`), токены провайдеров проверяет **бэкенд** (`social_auth.py`):
Google — userinfo.googleapis.com, Яндекс — login.yandex.ru/info,
Telegram — HMAC-подпись Login Widget токеном бота. Фронт только получает
токен и присылает его на `POST /auth/social` — как и email-вход, соцвход
выдаёт серверную сессию и «усыновляет» текущую гостевую (прогресс не теряется).

Чтобы кнопки заработали, нужны ключи:

| Провайдер | Что получить | Куда вставить |
|---|---|---|
| Google | OAuth client ID (Web) | `OAUTH.google` в `frontend/app.js` |
| Яндекс | ClientID приложения | `OAUTH.yandex` в `frontend/app.js` |
| Telegram | токен бота от @BotFather + `/setdomain` | `OAUTH.telegram` = числовая часть до `:`; полный токен — в env `TELEGRAM_BOT_TOKEN` |

Без ключей кнопки честно показывают «скоро» — никаких мёртвых кнопок.
Подделанный токен сервер отвергает с 401 (проверено тестами).

## Оплата Premium (Stripe)

Полный цикл без фейков: `POST /payments/checkout-session` отдаёт URL
платёжной страницы Stripe → фронт делает `location.href` → после оплаты
Stripe присылает вебхук `POST /payments/webhook` (подпись проверяется
секретом) → бэкенд включает `Entitlement.plan=premium` до конца оплаченного
периода. Отмена подписки или неоплата — план возвращается в `free`.

**Поведение без ключей честное:** `GET /payments/config` говорит
`{stripe: false}`, чекаут отвечает 503, кнопки оплаты не рисуются.

Что нужно задать в env (см. `backend/file.env.example`):

```
STRIPE_SECRET_KEY=sk_test_...        # Developers -> API keys
STRIPE_PRICE_ID=price_...            # продукт «Admitly Premium»
STRIPE_WEBHOOK_SECRET=whsec_...      # Developers -> Webhooks
FRONTEND_URL=https://домен-фронта    # страницы успеха/отмены оплаты
```

Вебхук: `https://<api-домен>/payments/webhook`, события
`checkout.session.completed`, `customer.subscription.deleted`,
`invoice.payment_failed`. Тестовые карты Stripe: `4242 4242 4242 4242`
(успех), `4000 0000 0000 0002` (отказ).

## Перегенерация справочника вузов

Если правишь `backend/data/universities.json` (цены, стипендии, описания):

```bash
python3 tools/make_unidata.py
```

Скрипт перезапишет `frontend/unidata.js` — его читает фронтенд для карточек,
описаний и фото.

## Деплой

- **API**: Render, сервис из `render.yaml` (rootDir `backend`). Обязательно
  задай `DATABASE_URL` (Postgres) — без него данные будут жить в SQLite и
  пропадут при перезапуске. В `ADMITLY_CORS_ORIGINS` укажи домен фронтенда.
- **Фронтенд**: любую статику (Render Static Site, Netlify, Vercel, GitHub
  Pages). В `app.js` найди `const prod = 'https://unimatch-lfy3.onrender.com'`
  и подставь адрес своего API.

## Что дальше (идеи продолжения)

1. **Запустить прод** — GitHub → Render (Postgres + API + Static Site),
   env-переменные из `backend/file.env.example`. Код оплаты и соцвхода уже
   готов — оживают при вставке ключей.
2. **Восстановление пароля** — роуты «забыл пароль» + email-сервис
   (Resend, 100 писем/день бесплатно).
3. **Лимит попыток входа** — простой счётчик на email против перебора.
4. **Дедлайны и заявки** — таблица дедлайнов вуза + напоминания в шортлист.
