# Розгортання BIBI Cars

Практичний гайд: локальний запуск, змінні оточення, продакшен, чек-лист.

---

## 1. Вимоги

- **Python** 3.11+
- **Node.js** 18+ та **Yarn** 1.x
- **MongoDB** 5+ (локально або керований кластер)

---

## 2. Змінні оточення

Секрети **ніколи** не комітяться — `.env` у `.gitignore`. У репо є лише
шаблони `*.env.example`.

### Backend (`backend/.env`)
| Змінна | Обовʼязкова | Опис |
|--------|:---------:|------|
| `MONGO_URL` | ✅ | Рядок підключення MongoDB |
| `DB_NAME` | ✅ | Назва БД (напр. `bibi_cars`) |
| `JWT_SECRET` | ✅ | Довгий випадковий секрет для JWT |
| `CORS_ORIGINS` | — | Дозволені origin (`*` або список) |
| `BIBI_ADMIN_EMAIL` / `BIBI_ADMIN_PASSWORD` | — | Перевизначення адмін-акаунта |
| `BIBI_MANAGER_EMAIL` / `BIBI_MANAGER_PASSWORD` | — | Перевизначення менеджера |
| `BIBI_TEAM_LEAD_EMAIL` / `BIBI_TEAM_LEAD_PASSWORD` | — | Перевизначення тімліда |
| `PUBLIC_SITE_URL` | — | Публічний домен (email, sitemap, посилання) |
| `GOOGLE_CLIENT_ID` | — | Google OAuth для клієнтів (опційно) |
| `STRIPE_API_KEY` / `STRIPE_WEBHOOK_SECRET` | — | Платежі (опційно) |

### Frontend (`frontend/.env`)
| Змінна | Обовʼязкова | Опис |
|--------|:---------:|------|
| `REACT_APP_BACKEND_URL` | ✅ | URL бекенду (усі запити — `${...}/api/*`) |
| `WDS_SOCKET_PORT` | — | Порт websocket для hot-reload (443 для HTTPS) |
| `ENABLE_HEALTH_CHECK` | — | Увімкнення health-check плагіна в dev |

> **Важливо:** у продакшені рекомендовано обслуговувати фронтенд і бекенд
> з одного домену (same-origin), а `/api/*` проксирувати на бекенд.

---

## 3. Локальний запуск

```bash
# Backend
cd backend
cp .env.example .env
pip install -r requirements.txt
uvicorn server:fastapi_app --host 0.0.0.0 --port 8001 --reload

# Frontend
cd frontend
cp .env.example .env
yarn install
yarn start
```

При першому старті backend створює індекси та staff-акаунти, піднімає
фонові воркери та починає синхронізацію каталогу.

---

## 4. Продакшен (орієнтовно)

- **Backend** запускати під процес-менеджером (systemd / supervisor / k8s),
  ASGI-сервер — `uvicorn server:fastapi_app --host 0.0.0.0 --port 8001`.
- **Frontend** зібрати (`yarn build`) і роздавати як статику (nginx/CDN).
- **Ingress/proxy**: `/api/*` → backend:8001, решта → статика фронтенду.
- **MongoDB** — окремий керований інстанс із бекапами.
- Для Cloudflare-захищених джерел парсингу потрібен окремий
  browser-extension клієнт (необовʼязково для ядра).

---

## 5. Чек-лист перед продакшеном

- [ ] Заданий сильний `JWT_SECRET`.
- [ ] Змінені паролі staff (`BIBI_*_PASSWORD`).
- [ ] **Прибраний клієнтський тестовий обхід** `test@customer.com` /
      `test123` у `backend/server.py` (функція `customer_login`).
- [ ] Встановлений справжній `PUBLIC_SITE_URL` + оновлені `robots.txt`/
      `sitemap.xml` на ваш домен (зараз плейсхолдер `https://bibi.cars`).
- [ ] `CORS_ORIGINS` обмежений вашими доменами (не `*`).
- [ ] Налаштовані бекапи MongoDB.
- [ ] (Опційно) `GOOGLE_CLIENT_ID`, `STRIPE_*` — якщо потрібні ці функції.

---

## 6. Збереження на GitHub

Репо вже очищене для продакшену: `.env` ігнорується, dev-артефакти
видалені, додані шаблони `.env.example` та документація. Після пушу
клонуйте, створіть `.env` з `.env.example` і запускайте за розділом 3–4.
