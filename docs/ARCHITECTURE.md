# Архітектура BIBI Cars

Цей документ описує технічну будову платформи: шари, модулі, фонові
процеси, модель даних та безпеку.

---

## 1. Загальна схема

Платформа — це **тришарова система**:

1. **Frontend (React SPA)** — публічна вітрина + 4 кабінети. Вся комунікація
   з бекендом — через `${REACT_APP_BACKEND_URL}/api/*`.
2. **Backend (FastAPI)** — REST API + WebSocket (socket.io) + фонові воркери.
3. **MongoDB** — єдине джерело правди (document store, доступ через Motor/async).

Усі бекенд-маршрути мають префікс `/api` (це вимога ingress-маршрутизації:
`/api/*` → бекенд :8001, решта → фронтенд :3000).

---

## 2. Backend

### 2.1. Структура (контрольований модульний моноліт)

Історично ядро жило в одному `server.py`. Зараз його поступово розкладають на
модулі в `backend/app/` (механічна екстракція, один домен — один модуль):

```
backend/app/
├── routers/        # FastAPI APIRouter за доменами (admin_*, auth_*, contracts, content …)
├── services/       # Бізнес-логіка (calculator, lead_sla, contract_lifecycle, dashboard_aggregator …)
├── repositories/   # Робота з MongoDB (auth_otp, audit_events, invoice_templates …)
├── models/         # Pydantic-схеми
├── middleware/     # Безпека, rate limiting
├── core/           # observability, config, утиліти
├── integrations/   # Зовнішні сервіси
└── wave*/          # Історичні «хвилі» рефакторингу
```

Нові ендпойнти/сервіси мають створюватися в `backend/app/` і підключатись
через `fastapi_app.include_router(...)` у `server.py`.

### 2.2. Точка входу

- ASGI-додаток: `server:fastapi_app`.
- При `startup` відбувається: підключення до Mongo, створення індексів,
  ідемпотентний сидинг staff-акаунтів, старт реєстру воркерів.

### 2.3. Фонові воркери (`worker_registry`)

Реєстр керує життєвим циклом асинхронних задач (рестарт при збоях):

| Воркер | Призначення |
|--------|-------------|
| `enrichment_worker` | Збагачення карток авто додатковими даними |
| `watchlist_live_poll` | Опитування обраних лотів (жива ціна/статус) |
| `tracking_worker` | Трекінг доставки (судна/контейнери) |
| `resolver_worker` | Резолвінг/злиття даних з різних джерел |
| `transfer_detector` | Виявлення переміщень/передач |
| `ops_guardian` | Моніторинг стану операцій / алерти |
| `lead_sla` | Контроль SLA по лідах |
| `lead_reminders` | Нагадування менеджерам |
| `payment_reminder` | Нагадування про платежі |
| `escalations_wakeup` | Ескалації прострочених завдань |
| `ringostat_cron` | Періодична синхронізація дзвінків (потребує конфігу) |

### 2.4. Парсери джерел

Модулі `*_scraper.py` / `*_parser.py` збирають дані авто:

- `bitmotors_scraper.py` — основне джерело (bidmotors.bg), живий пошук + повна синхронізація.
- `lemon_scraper.py` / `lemon_sync.py` — lemon-cars.
- `westmotors_scraper.py` та воркери парсингу.
- `vesselfinder_scraper.py` — трекінг суден.
- `statvin_scraper.py`, `auctionauto_scraper.py`, `copart_vin_normalizer.py` — додаткові джерела/нормалізація.

> Примітка: частина джерел, захищених Cloudflare, потребує окремого
> browser-extension клієнта (шар «extension layer»). Без нього ці джерела
> просто вимкнені і не впливають на ядро CRM.

### 2.5. Ключові доменні модулі

- `vin_service.py` — живий пошук за VIN з кешуванням та circuit breaker.
- `legal_workflow.py` — юридичний воркфлоу, шаблони документів, контракти, e-підпис.
- `payments_tracking.py`, `financial_breakdown.py`, `cabinet_financials.py` — фінанси.
- `notifications.py` — сповіщення (in-app + email outbox).
- `multisource_resolver.py`, `resolver_engine.py`, `shipment_identity_resolver.py` —
  злиття/резолвінг сутностей.
- `security.py` — автентифікація, ролі, аудит.

### 2.6. Реальний час

WebSocket через **socket.io** (`python-socketio`) — пуш-оновлення для
сповіщень, статусів доставки та дзвінків.

---

## 3. Frontend

### 3.1. Стек

React 19 + CRACO (надбудова над CRA). Стилі — Tailwind + shadcn/ui (Radix).
Стан/дані — React Query + локальні контексти. Маршрутизація — react-router-dom 7.

### 3.2. Організація

- `App.js` — дерево маршрутів (~200 routes) + `AuthContext` (staff) і контекст клієнта.
- `pages/` — за ролями: `admin/`, `manager/`, `team/`, `cabinet/`, `public/`, `security/`.
- `components/` — UI-компоненти за доменами (crm, deal360, delivery360, payments, calls …).
- `i18n/` — переклади EN/BG/UK (`translations.js`) + контекст мови.
- `lib/runtime-origin-patch.js` — портативність між доменами (див. нижче).

### 3.3. Портативність домену

`runtime-origin-patch.js` встановлює axios-інтерсептор і обгортку `fetch`,
які переписують URL бекенду на поточний origin, якщо бандл був зібраний
з іншим `REACT_APP_BACKEND_URL`. Це робить деплой переносним на будь-який
власний домен без перезбірки.

---

## 4. Модель даних (MongoDB)

Основні колекції (найважливіші):

| Колекція | Призначення |
|----------|-------------|
| `staff` | Персонал (admin/manager/team_lead): роль, хеш пароля, статус |
| `customers` | Клієнти (юзери) |
| `customer_sessions` | Сесії клієнтів (TTL 7 днів) |
| `leads` | Ліди (джерело, статус, пріоритет, SLA) |
| `deals` | Угоди (пайплайн) |
| `invoices` | Інвойси |
| `payments` | Платежі |
| `contracts` | Контракти (та їхній життєвий цикл/підпис) |
| `shipments` / `shipment_events` | Доставка та події |
| `vin_data`, `vin_data_lemon` | Зібрані/збагачені дані авто за VIN |
| `notifications`, `notification_rules` | Сповіщення та правила |
| `auth_email_otp` | Одноразові коди (Email-OTP для team_lead) |
| `login_audit`, `audit_log` | Аудит входів та дій |
| `blog_articles`, `email_templates`, `services` | Контент та довідники |

Ідентифікатори — рядкові `id`/`customerId`/`call_id` (а не ObjectId), щоб
безпечно серіалізувати в JSON.

---

## 5. Автентифікація та безпека

### 5.1. Staff (admin / manager / team_lead)
- Ендпойнт: `POST /api/auth/login` → JWT (`python-jose`, HS256).
- Паролі — `bcrypt`. При старті — ідемпотентний ресинк хешів (авторизація
  не «ламається» після редеплою).
- 2FA:
  - `admin` — TOTP (`pyotp`), якщо увімкнено в політиці автентифікації.
  - `team_lead` — Email-OTP: код генерується, зберігається в `auth_email_otp`,
    підтверджується через `POST /api/auth/email-otp/verify`.

### 5.2. Customer (клієнт)
- `POST /api/customer-auth/login` — email/пароль → сесійний токен.
- `POST /api/customer-auth/google/verify` — вхід через Google Identity
  (стандартний Google OAuth, потребує `GOOGLE_CLIENT_ID`; опційно).

### 5.3. Інше
- Rate limiting — `slowapi`.
- Аудит — `login_audit` / `audit_log` (без PII у buffer-подіях observability).

---

## 6. Конфігурація

Уся конфігурація — через змінні оточення (`.env`), нічого не хардкодиться.
Повний перелік — у `backend/.env.example` та `frontend/.env.example`.
Обовʼязкові для бекенду: `MONGO_URL`, `DB_NAME`, `JWT_SECRET`.
