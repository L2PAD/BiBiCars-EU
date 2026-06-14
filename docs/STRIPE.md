# Платежі Stripe — налаштування та логіка

Документ описує інтеграцію Stripe у BIBI Cars: де зберігаються ключі, як
працює checkout, вебхуки, і **що перенастроювати при зміні домену**
(превʼю → реальний продакшн-домен).

---

## 1. Як це влаштовано

- **Бібліотека:** офіційний `stripe` Python SDK (НЕ сторонні обгортки).
- **Джерело правди для ключів:** колекція MongoDB `integration_configs`
  (документ `provider="stripe"`), а НЕ `.env`. Керується адміном через
  сторінку **`/admin/payments`** → секція **Stripe Integration**.
- **API адміна:**
  - `GET  /api/admin/integrations` — показати конфіги (секрети масковані).
  - `PATCH /api/admin/integrations/stripe` — зберегти ключі/налаштування
    (**merge-safe**: часткове оновлення не стирає інші ключі).
  - `POST /api/admin/integrations/stripe/test` — реальна перевірка ключів
    (дзвонить `stripe.Account.retrieve()`).
  - `GET  /api/admin/integrations/health` — статус (`ok` / `degraded` /
    `not_configured`).

### Ключі (4 поля)
| Поле | Префікс | Призначення |
|------|---------|-------------|
| Publishable Key | `pk_…` | Публічний ключ (фронтенд) |
| Secret Key | `sk_…` | Серверні операції (checkout, refunds) |
| Restricted Key | `rk_…` | Обмежений ключ (опційно) |
| Webhook Secret | `whsec_…` | Перевірка підпису вебхуків |

`mode`: `sandbox` (тест) або `live` (продакшн). `isEnabled`: вкл/викл.

---

## 2. Потік оплати (checkout)

```
Клієнт/менеджер → POST /api/invoices/checkout {invoiceId}
      → бекенд створює Stripe Checkout Session (sk_…)
      → повертає checkout URL (https://checkout.stripe.com/…)
      → клієнт оплачує карткою на стороні Stripe
      → Stripe шле подію на /api/stripe/webhook
      → бекенд перевіряє підпис, записує платіж (ідемпотентно)
      → платіж зʼявляється у /admin/payments
```

**success/cancel URL будуються з домену вхідного запиту**
(`x-forwarded-host`), тому при зміні домену вони підлаштовуються
**автоматично** — нічого правити не треба.

---

## 3. Вебхуки

Ендпоінт: `POST /api/stripe/webhook`. Обробляє 10 подій
(`checkout.session.*`, `payment_intent.*`, `charge.refunded`,
`charge.refund.updated`). Властивості:

- **Перевірка підпису** через `whsec_…` (підроблені події → HTTP 400).
- **Ідемпотентність** — повторні події дедуплікуються (`webhook_events`).
- Якщо `webhookSecret` не заданий — працює в режимі без перевірки
  (лише для локального тесту; на проді ОБОВʼЯЗКОВО задавати).

> Якщо `whsec` не задати на проді — Stripe-події приймаються без перевірки
> справжності. Завжди налаштовуйте webhook secret у live-режимі.

---

## 4. ⚠️ ЗМІНА / ДОДАВАННЯ ДОМЕНУ (мульти-домен)

Один бекенд (зі спільною БД) може обслуговувати **кілька доменів одночасно**
(напр. `bibicars.org` ЗАРАЗ + `bibicars.bg` у майбутньому). Кожен webhook
endpoint Stripe має свій підпис, тому бекенд зберігає **СПИСОК** підписів
(`credentials.webhookSecrets`) і приймає подію, якщо валідний БУДЬ-ЯКИЙ із них.

### Що працює автоматично (нічого не робити)
- Checkout success/cancel URL (беруться з хоста запиту → будь-який домен).
- Ключі `pk/sk/rk` — не залежать від домену.
- Перевірка вебхука по списку секретів (мульти-домен).

### Додати домен (швидкий перехід)
```bash
cd backend
# поточний домен:
python scripts/setup_stripe_webhook.py --domain https://bibicars.org
# пізніше ДОДАТИ другий домен (перший продовжує працювати):
python scripts/setup_stripe_webhook.py --domain https://bibicars.bg
# прибрати непотрібний домен:
python scripts/setup_stripe_webhook.py --domain https://old-domain.com --remove
```
Скрипт перестворює endpoint ЛИШЕ для вказаного домену, інші не чіпає, і
додає його підпис у список `webhookSecrets` (з дедуплікацією).

> Реєструйте webhook лише для домену, який УЖЕ доступний — інакше Stripe
> після кількох невдалих доставок вимкне endpoint.

### Перехід sandbox → live
1. Stripe Dashboard → live-режим → взяти live-ключі (`pk_live`/`sk_live`).
2. `/admin/payments` → Edit → вставити live-ключі, `mode=live`, Save.
3. Перестворити вебхуки на проді (скрипт вище) — у live секрети інші.
4. Test Connection → `live, charges_enabled=true`.

> Для прийому реальних платежів акаунт Stripe має бути активований
> (`charges_enabled=true`). У test-режимі це не обовʼязково.

---

## 5. Поточний стан (тестове середовище)

- Підключено тестові ключі акаунта **PM AUTO GROUP Ltd.**
  (`acct_1TP0ROBXF2ZAbV1V`, sandbox).
- Перевірено вживу: Test Connection ✓, створення checkout-сесій ✓
  (`cs_test_…`, реальні `checkout.stripe.com` URL), вебхук ✓
  (валідна підпис → 200, повтор → idempotent, підробка → 400).
- Webhook endpoint створено на домен превʼю; `whsec_` збережено у конфіг.
