# Production Go-Live Runbook — BIBI Cars

Покроковий чек-лист виходу в продакшн на **реальний домен**. Охоплює:
підготовку коду/конфігу, **переключення інтеграцій на бойову логіку**,
перевірку після деплою, health-моніторинг, масштабованість і автономність.

> Легенда: ✅ зроблено / ⬜ зробити при деплої / ⚠️ критично.

---

## 0. Поточний стан (вже зроблено)

- ✅ Код очищено від `emergent`, готовий до публічного репо.
- ✅ Деплой-скан (deployment agent): **PASS, блокерів немає**.
- ✅ Health-проби: `/api/health`, `/api/healthz` (легкі, для LB/k8s) +
  `/api/system/health` (повна діагностика: воркери, mongo, observability).
- ✅ Автономність: 11 фонових воркерів стартують самі (running 11/11).
- ✅ Stripe підключено в **test/sandbox** і перевірено вживу.
- ✅ `.env` у `.gitignore`, є `.env.example` для backend і frontend.

---

## 1. Підготовка коду / конфігу (перед деплоєм)

| | Дія |
|---|------|
| ⚠️ | Згенерувати сильний `JWT_SECRET` (довгий випадковий рядок). |
| ⚠️ | Змінити паролі staff через `BIBI_ADMIN_PASSWORD` / `BIBI_MANAGER_PASSWORD` / `BIBI_TEAM_LEAD_PASSWORD`. |
| ⚠️ | **Прибрати тестовий обхід клієнта** `test@customer.com` / `test123` у `backend/server.py` (функція `customer_login`). |
| ⬜ | `DB_NAME` — окрема прод-база (напр. `bibi_cars`). |
| ⬜ | `CORS_ORIGINS` — вказати РЕАЛЬНИЙ домен (не `*`), напр. `https://bibi.cars`. |
| ⬜ | `PUBLIC_SITE_URL=https://ВАШ-ДОМЕН` (листи, посилання на контракти). |
| ⬜ | `frontend/public/robots.txt` і `sitemap.xml` — замінити плейсхолдер `https://bibi.cars` на реальний домен. |
| ⬜ | `frontend/.env` → `REACT_APP_BACKEND_URL=https://ВАШ-ДОМЕН` (бажано той самий origin, що й фронт). |
| ⬜ | Створити `.env` із `.env.example` (backend і frontend). |

---

## 2. ⚠️ Переключення інтеграцій на бойову логіку

Усі інтеграції зберігають конфіг у Mongo (`integration_configs`), керуються
адміном через UI. На проді з чистою базою їх треба налаштувати заново.

| Інтеграція | Зараз | Що зробити на проді | Де |
|-----------|-------|---------------------|-----|
| **Stripe** | test/sandbox, працює | Вставити **live**-ключі (`pk_live`/`sk_live`), `mode=live`; перестворити вебхук (див. §3); Test Connection → `live, charges_enabled=true` | `/admin/payments` + `docs/STRIPE.md` |
| **Email/SMTP** | не налаштовано | ⚠️ Налаштувати SMTP — **інакше не доставляються листи**: Email-OTP для team_lead, сповіщення, контракти | `/admin/settings` (provider `email`) |
| **Google OAuth** (вхід клієнтів) | не налаштовано | Опційно: додати `GOOGLE_CLIENT_ID` для входу через Google (email/пароль і так працює) | `/admin/settings` |
| **Resend** (листи) | не налаштовано | Опційно: альтернатива SMTP для транзакційних листів | `/admin/settings` |
| **SMS** | не налаштовано | Опційно: SMS-сповіщення | `/admin/settings` |
| **Shipping / VesselFinder** | трекінг суден | Опційно: додати ключ для повноцінного трекінгу контейнерів | `/admin/settings` |
| **Ringostat** (дзвінки) | cron працює, 0 дзвінків | Опційно: додати `api_key` + `project_id` для синхронізації дзвінків | `/admin/settings` |
| Парсери (bidmotors, lemon, …) | реальні, автономні | Працюють самі; за потреби вимкнути на репліці `PARSER_ENABLED=false` | env |

> ⚠️ **Email-OTP для team_lead**: код наразі лише пишеться в БД. Для
> реальної доставки на пошту ОБОВʼЯЗКОВО налаштувати SMTP/Resend, інакше
> team_lead не зможе залогінитись на проді.

---

## 3. Stripe-вебхук після зміни домену

Stripe шле події на фіксований URL → при зміні домену перестворити вебхук:

```bash
cd backend
python scripts/setup_stripe_webhook.py --domain https://ВАШ-РЕАЛЬНИЙ-ДОМЕН
```

Скрипт видалить старий ендпоінт, створить новий на `…/api/stripe/webhook`
і збереже новий `whsec_…` у конфіг. Деталі та sandbox→live — у `docs/STRIPE.md`.

> Checkout success/cancel URL міняти НЕ треба — вони беруться з хоста запиту.

---

## 4. Перевірка ПІСЛЯ деплою (smoke-test)

```bash
# 1. Health
curl https://ВАШ-ДОМЕН/api/health            # -> {"status":"ok","mongo_ok":true}
curl https://ВАШ-ДОМЕН/api/system/health      # -> workers 11/11, mongo_ok:true

# 2. Логін усіх 4 ролей через /cabinet/login (admin/manager/team_lead/customer)
# 3. Stripe: /admin/payments -> Test Connection -> live, charges_enabled=true
# 4. Створити інвойс -> Checkout -> оплата тест-карткою -> платіж у /admin/payments
```

Чек-лист «що має працювати»:
- ⬜ Публічна вітрина (каталог, калькулятор, VIN-пошук).
- ⬜ Вхід усіх 4 кабінетів (team_lead — лише якщо налаштовано SMTP для OTP).
- ⬜ Stripe checkout + вебхук (платіж зʼявляється в `/admin/payments`).
- ⬜ Воркери 11/11 у `/api/system/health`.

---

## 5. Health-моніторинг

| Ендпоінт | Призначення |
|----------|-------------|
| `GET /api/health`, `/api/healthz` | Легка проба для LB / k8s liveness+readiness (200/503). |
| `GET /api/system/health` | Повна діагностика: статус воркерів (з рестартами), mongo_ok, observability (помилки, повільні запити). |

Рекомендація: liveness/readiness probe → `/api/health`; uptime-монітор та
алерти → `/api/system/health` (слідкувати за `workers.summary.running`).

---

## 6. Масштабованість і автономність

**Автономність**
- 11 фонових воркерів стартують автоматично і **самовідновлюються**
  (`worker_registry`, до 3 рестартів, видно в `/api/system/health`).
- Індекси Mongo створюються на старті; сидінг staff — **ідемпотентний**.

**Масштабованість**
- API **stateless** (стан — у MongoDB) → масштабується горизонтально.
- ⚠️ **Важливо:** фонові воркери/парсери виконуються В ПРОЦЕСІ API. Якщо
  підняти кілька реплік, кожна запустить свій набір воркерів → дублювання
  cron/парсингу/нагадувань. Рішення:
  - **Рекомендовано на старті:** одна backend-репліка (вертикальне
    масштабування). Для пікового трафіку фронтенд (статика) масштабується
    окремо й безмежно.
  - **Горизонтальне масштабування API:** тримати воркери лише на ОДНІЙ
    репліці — на решті виставити `PARSER_ENABLED=false` (вимикає
    парсер-шар). Повне рознесення воркерів в окремий деплоймент —
    рекомендований наступний крок (leader-only worker process).
- MongoDB — окремий керований інстанс із реплікацією та бекапами.

---

## 7. Безпека (мінімум перед go-live)

- ⚠️ `CORS_ORIGINS` = конкретні домени (не `*`).
- ⚠️ Сильний `JWT_SECRET`, змінені паролі staff.
- ⚠️ Прибрати тестовий обхід `test@customer.com`.
- ⬜ HTTPS на всьому домені (TLS на ingress/проксі).
- ⬜ Ключі Stripe/SMTP — лише через `/admin` (у БД), ніколи в git.
- ⬜ Бекапи MongoDB + ротація логів.
