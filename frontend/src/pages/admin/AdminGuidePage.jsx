/**
 * AdminGuidePage — BIBI Cars Internal Whitepaper (UK / EN / BG)
 * ==============================================================
 *
 * Three independent editions of the same guide. Each is hand-written in
 * its own language's natural style — NOT a machine translation:
 *
 *   • Ukrainian — conversational, written like a senior colleague would
 *     explain things to a junior teammate over coffee.
 *   • English  — direct, scannable, US-style operations writing with
 *     bullet lists and short paragraphs.
 *   • Bulgarian — written in proper Bulgarian (not transliterated UK),
 *     respecting Bulgarian sentence rhythm and idioms.
 *
 * The active language follows the global `useLang()` selector in the
 * header, so the guide switches together with the rest of the UI.
 *
 * Scrolling note: this page is rendered inside `<main className="overflow-auto">`
 * in Layout.js, so window.scrollTo doesn't help. We rely on
 * `element.scrollIntoView()` (works on any scroll parent) plus
 * `scroll-margin-top` (Tailwind `scroll-mt-24`) for the anchor offset.
 * Active-section highlighting uses an IntersectionObserver against the
 * scrollable parent — that's the only way to get accurate state.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLang } from '../../i18n/LanguageContext';

/* ─────────────────────────────────────────────────────────────────
 * Section IDs are the same across all three languages so anchor
 * URLs (#m-leads, #firstday …) keep working when the user switches
 * the language mid-read.
 * ───────────────────────────────────────────────────────────────── */
const SECTION_IDS = [
  'intro', 'roles', 'data-flow',
  'm-dashboard', 'm-action', 'm-executive', 'm-notif',
  'm-leads', 'm-customers', 'm-sales', 'm-portal',
  'm-roadmaps', 'm-docs', 'm-contracts',
  'm-finance', 'm-delivery', 'm-operations', 'm-forecasting',
  'm-calc', 'm-vin', 'm-staff',
  'flows', 'sla', 'auth', 'integrations', 'i18n',
  'firstday', 'faq',
];

/* TOC titles per language (28 sections each). */
const TOC_BY_LANG = {
  uk: [
    '1. З чого все починається',
    '2. Ролі та права доступу',
    '3. Як рухаються дані всередині CRM',
    '4. Дашборд (головна сторінка)',
    '5. Центр дій (Action Center)',
    '6. Виконавчий центр (Executive Center)',
    '7. Центр сповіщень (Notification Center)',
    '8. CRM → Ліди (Leads)',
    '9. CRM → Клієнти (Customers)',
    '10. Продажі та Зустрічі',
    '11. Портал клієнта (Customer Portal)',
    '12. Дорожні карти (Roadmaps)',
    '13. Шаблони документів і Файловий менеджер',
    '14. Контракти 360',
    '15. Фінанси (Finance 360 + Stripe)',
    '16. Доставка 360 (Delivery)',
    '17. Операції 360',
    '18. Прогнозування 360',
    '19. Калькулятор пригону',
    '20. VIN Engine та парсери',
    '21. Команда (Staff / Team Lead / Manager)',
    '22. Наскрізні бізнес-процеси',
    '23. SLA, ескалації та контроль якості',
    '24. Безпека, авторизація, аудит',
    '25. Інтеграції (Stripe, Resend, SMS)',
    '26. Мови інтерфейсу (UK / EN / BG)',
    '27. Перший день нового співробітника',
    '28. Часті питання',
  ],
  en: [
    '1. Why this CRM exists',
    '2. Roles & access control',
    '3. How data flows inside the CRM',
    '4. Dashboard (home screen)',
    '5. Action Center',
    '6. Executive Center',
    '7. Notification Center',
    '8. CRM → Leads',
    '9. CRM → Customers',
    '10. Sales & Meetings',
    '11. Customer Portal',
    '12. Roadmaps',
    '13. Document templates & File manager',
    '14. Contracts 360',
    '15. Finance (Finance 360 + Stripe)',
    '16. Delivery 360',
    '17. Operations 360',
    '18. Forecasting 360',
    '19. Import Calculator',
    '20. VIN Engine & parsers',
    '21. Team (Staff / Team Lead / Manager)',
    '22. End-to-end business flows',
    '23. SLA, escalations & quality control',
    '24. Security, auth, audit trail',
    '25. Integrations (Stripe, Resend, SMS)',
    '26. UI languages (UK / EN / BG)',
    '27. First day on the team',
    '28. FAQ',
  ],
  bg: [
    '1. Защо съществува тази CRM',
    '2. Роли и нива на достъп',
    '3. Как се движат данните в CRM',
    '4. Табло (начален екран)',
    '5. Action Center',
    '6. Executive Center',
    '7. Notification Center',
    '8. CRM → Лийдове (Leads)',
    '9. CRM → Клиенти (Customers)',
    '10. Продажби и срещи',
    '11. Клиентски портал',
    '12. Пътни карти (Roadmaps)',
    '13. Шаблони на документи и Файлов мениджър',
    '14. Договори 360',
    '15. Финанси (Finance 360 + Stripe)',
    '16. Доставка 360 (Delivery)',
    '17. Операции 360',
    '18. Прогнозиране 360',
    '19. Калкулатор за внос',
    '20. VIN Engine и парсери',
    '21. Екип (Staff / Team Lead / Manager)',
    '22. Бизнес процеси от край до край',
    '23. SLA, ескалации и контрол на качеството',
    '24. Сигурност, оторизация, одит',
    '25. Интеграции (Stripe, Resend, SMS)',
    '26. Езици на интерфейса (UK / EN / BG)',
    '27. Първи ден в екипа',
    '28. Често задавани въпроси',
  ],
};

const HERO_BY_LANG = {
  uk: {
    badge1: 'Внутрішній документ',
    title:  'BIBI Cars CRM — повний гайд для команди',
    intro:  'Це наша внутрішня «біла книга». Вона не для клієнтів і не для маркетингу. Вона для тих, хто щодня працює в системі: менеджерів, тімлідів, адміністрації. Тут описано з яких блоків складається CRM, як вони між собою повʼязані, який шлях проходить лід від першого дзвінка до моменту, коли клієнт отримує авто. Якщо ви тільки прийшли в команду — починайте з розділу «Перший день нового співробітника» (внизу). Якщо ви вже в темі — використовуйте бічне меню як довідник.',
    searchPh: 'Пошук по розділах…',
    notFound: 'Нічого не знайдено',
    bodyTestId: 'guide-body',
  },
  en: {
    badge1: 'Internal document',
    title:  'BIBI Cars CRM — full guide for the team',
    intro:  'This is our internal whitepaper. It is not marketing material and not for customers. It is for the people who live inside the system every day: managers, team leads, admins. It explains what each module of the CRM does, how the modules connect, and the path a lead travels from the first phone call to the moment a customer drives the car away. New to the team? Start with the "First day on the team" section at the bottom. Already shipping deals? Use the sidebar as a reference manual.',
    searchPh: 'Search sections…',
    notFound: 'Nothing found',
    bodyTestId: 'guide-body',
  },
  bg: {
    badge1: 'Вътрешен документ',
    title:  'BIBI Cars CRM — пълно ръководство за екипа',
    intro:  'Това е нашата вътрешна „бяла книга“. Не е маркетинг и не е за клиенти. Тя е за хората, които работят със системата всеки ден: мениджъри, тимлийди, администрация. Описано е от какви модули се състои CRM, как те се свързват помежду си и какъв път изминава един лийд от първото обаждане до момента, когато клиентът получи автомобила си. Нов сте в екипа? Започнете от раздел „Първи ден в екипа“ най-долу. Вече сте опитен? Използвайте лявото меню като справочник.',
    searchPh: 'Търсене в разделите…',
    notFound: 'Няма резултати',
    bodyTestId: 'guide-body',
  },
};

const ANCHOR_PAD_TOP = 24; // matches `scroll-mt-24` on each <Section>

export default function AdminGuidePage() {
  const { lang } = useLang();
  const safeLang = (TOC_BY_LANG[lang] ? lang : 'uk');
  const tocTitles = TOC_BY_LANG[safeLang];
  const hero      = HERO_BY_LANG[safeLang];

  const [active, setActive] = useState(SECTION_IDS[0]);
  const [search, setSearch] = useState('');
  const scrollerRef = useRef(null);

  // Find the scrolling parent (<main className="overflow-auto"> in Layout)
  useEffect(() => {
    const node = document.getElementById(SECTION_IDS[0]);
    let p = node?.parentElement;
    while (p) {
      const style = window.getComputedStyle(p);
      if (['auto', 'scroll', 'overlay'].includes(style.overflowY)) {
        scrollerRef.current = p;
        return;
      }
      p = p.parentElement;
    }
    scrollerRef.current = null;
  }, []);

  // IntersectionObserver tracks which section is currently in view → drives the TOC highlight
  useEffect(() => {
    const observed = SECTION_IDS
      .map((id) => document.getElementById(id))
      .filter(Boolean);
    if (observed.length === 0) return undefined;

    const visibleRatios = new Map();
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => visibleRatios.set(e.target.id, e.intersectionRatio));
        let bestId = SECTION_IDS[0];
        let bestRatio = -1;
        SECTION_IDS.forEach((id) => {
          const r = visibleRatios.get(id) || 0;
          if (r > bestRatio) { bestRatio = r; bestId = id; }
        });
        if (bestRatio > 0) setActive(bestId);
      },
      {
        root: scrollerRef.current,
        rootMargin: '-15% 0px -55% 0px',
        threshold: [0, 0.25, 0.5, 0.75, 1],
      },
    );
    observed.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [safeLang]);

  const filteredIndexes = useMemo(() => {
    const q = (search || '').trim().toLowerCase();
    if (!q) return tocTitles.map((_, i) => i);
    return tocTitles
      .map((t, i) => ({ t, i }))
      .filter(({ t }) => t.toLowerCase().includes(q))
      .map(({ i }) => i);
  }, [search, tocTitles]);

  const jumpTo = (id) => {
    const el = document.getElementById(id);
    if (!el) return;
    // scrollIntoView works inside ANY scroll parent — that was the bug.
    // The scroll-mt-24 class on each <Section> gives us the offset for the
    // sticky top bar.
    try {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch {
      // Older browsers — fall back to instant jump
      el.scrollIntoView();
    }
    // Replace the URL hash so deep-links stay in sync without polluting history
    if (window.history?.replaceState) {
      window.history.replaceState(null, '', `#${id}`);
    }
    setActive(id);
  };

  // Honour incoming #anchor on first load
  useEffect(() => {
    const hash = (window.location.hash || '').replace('#', '');
    if (hash && SECTION_IDS.includes(hash)) {
      // Wait for the DOM to settle, then scroll
      setTimeout(() => jumpTo(hash), 150);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="text-[#18181B]">
      {/* Hero */}
      <div className="border border-[#E4E4E7] bg-white rounded-2xl px-5 py-6 sm:px-8 sm:py-8 mb-6">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#4F46E5] bg-[#EEF2FF] px-2 py-1 rounded-md">
            {hero.badge1}
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold mb-2 leading-tight">{hero.title}</h1>
        <p className="text-[14px] text-[#52525B] max-w-3xl leading-relaxed">{hero.intro}</p>
      </div>

      <div className="flex gap-6">
        {/* Sticky TOC */}
        <aside className="hidden lg:block w-72 shrink-0">
          <div className="sticky top-2">
            <div className="bg-white border border-[#E4E4E7] rounded-2xl p-3 max-h-[calc(100vh-110px)] overflow-y-auto">
              <div className="px-2 pb-2 border-b border-[#F4F4F5] mb-2">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={hero.searchPh}
                  className="w-full text-[12.5px] px-2.5 py-1.5 border border-[#E4E4E7] rounded-lg outline-none focus:border-[#4F46E5]"
                  data-testid="guide-search-input"
                />
              </div>
              <nav className="space-y-0.5">
                {filteredIndexes.length === 0 ? (
                  <div className="px-2 py-3 text-[12px] text-[#A1A1AA] italic">{hero.notFound}</div>
                ) : filteredIndexes.map((i) => {
                  const id = SECTION_IDS[i];
                  return (
                    <button
                      key={id}
                      onClick={() => jumpTo(id)}
                      data-testid={`guide-toc-${id}`}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[12.5px] leading-snug transition-colors ${
                        active === id
                          ? 'bg-[#EEF2FF] text-[#3730A3] font-semibold'
                          : 'text-[#52525B] hover:bg-[#F4F4F5]'
                      }`}
                    >
                      {tocTitles[i]}
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>
        </aside>

        {/* Body */}
        <main className="flex-1 min-w-0 space-y-6 pb-24" data-testid={hero.bodyTestId}>
          {safeLang === 'uk' && <UkContent />}
          {safeLang === 'en' && <EnContent />}
          {safeLang === 'bg' && <BgContent />}
        </main>
      </div>
    </div>
  );
}

/* ── Markup helpers ─────────────────────────────────────────────── */

const Section = ({ id, title, children }) => (
  <section id={id} className="scroll-mt-24">
    <div className="bg-white border border-[#E4E4E7] rounded-2xl p-5 sm:p-7">
      <h2 className="text-[20px] sm:text-[22px] font-bold mb-4 leading-snug">{title}</h2>
      <div className="text-[14.5px] text-[#3F3F46] leading-[1.7] space-y-3">{children}</div>
    </div>
  </section>
);

const Callout = ({ tone = 'info', title, children }) => {
  const palette = ({
    info:   { box: 'border-[#BFDBFE] bg-[#EFF6FF]', label: 'text-[#1D4ED8]' },
    warn:   { box: 'border-[#FCD34D] bg-[#FFFBEB]', label: 'text-[#B45309]' },
    danger: { box: 'border-[#FCA5A5] bg-[#FEF2F2]', label: 'text-[#B91C1C]' },
    good:   { box: 'border-[#86EFAC] bg-[#F0FDF4]', label: 'text-[#15803D]' },
  })[tone] || { box: 'border-[#E4E4E7] bg-[#FAFAFA]', label: 'text-[#52525B]' };
  return (
    <div className={`rounded-xl border ${palette.box} px-3.5 py-2.5 my-2`}>
      {title ? <div className={`text-[12px] font-bold uppercase tracking-wider mb-1 ${palette.label}`}>{title}</div> : null}
      <div className="text-[13.5px] text-[#3F3F46] leading-relaxed">{children}</div>
    </div>
  );
};

const Step = ({ n, title, children }) => (
  <div className="flex gap-3 my-2.5">
    <div className="shrink-0 w-7 h-7 rounded-full bg-[#18181B] text-white flex items-center justify-center text-[12px] font-bold">{n}</div>
    <div className="flex-1">
      {title ? <div className="font-semibold text-[14.5px] mb-0.5">{title}</div> : null}
      <div className="text-[13.5px] text-[#52525B] leading-relaxed">{children}</div>
    </div>
  </div>
);

const Row = ({ k, v }) => (
  <tr className="border-b border-[#F4F4F5] last:border-b-0">
    <td className="py-1.5 pr-4 font-semibold text-[13px] text-[#18181B] align-top whitespace-nowrap">{k}</td>
    <td className="py-1.5 text-[13px] text-[#52525B]">{v}</td>
  </tr>
);
const Code = ({ children }) => (
  <code className="bg-[#F4F4F5] px-1.5 py-0.5 rounded text-[12px] mx-0.5">{children}</code>
);

/* ════════════════════════════════════════════════════════════════════
 * UKRAINIAN edition (expanded from original v1)
 * ════════════════════════════════════════════════════════════════════ */
function UkContent() { return (<>
  <Section id="intro" title="1. З чого все починається">
    <p>BIBI Cars — це CRM-система, через яку команда веде клієнтів від першого звернення до отримання авто на руки. Все, що відбувається з клієнтом (дзвінки, листи, рахунки, договори, доставка), фіксується в одному місці. Жодних паралельних таблиць в Excel, жодних особистих заміток у блокноті: якщо подія сталася — вона має бути в CRM.</p>
    <p>У системі є чотири ролі: <b>Адмін (admin)</b>, <b>Тімлід (team_lead)</b>, <b>Менеджер (manager)</b> та <b>Клієнт (user)</b>. Перші три — це наша команда, четверта — клієнти, які заходять у свій кабінет.</p>
    <p>Технічно сайт складається з двох частин: <b>публічного сайту</b> (каталог, лендінг, калькулятор, контакти) і <b>внутрішньої CRM</b> на адресі <Code>/admin</Code>. Цей гайд про внутрішню частину.</p>
    <Callout tone="info" title="Головна ідея">Кожен лід проходить через одні й ті самі етапи: <b>Лід → Клієнт → Інвойс → Оплата → Замовлення → Дорожня карта → Контракт → Доставка</b>. Усі модулі CRM — це обслуговуючі сервіси цього єдиного шляху.</Callout>
    <p>Якщо ви знаєте цей ланцюжок, ви знаєте 80% системи. Решта — деталі, які зрозумієте за тиждень практики.</p>
  </Section>

  <Section id="roles" title="2. Ролі та права доступу">
    <p>У системі суворо розмежовано чотири ролі. Кожна бачить тільки те, що їй потрібно для роботи. Цей принцип не «зручність», а вимога безпеки — клієнт А ніколи не повинен побачити дані клієнта Б, менеджер не повинен бачити чужих лідів.</p>
    <table className="w-full text-[13px] my-2"><tbody>
      <Row k="Admin" v="Бачить усю систему: всіх клієнтів, усі ліди, усі гроші, усі логи. Тільки адмін може змінювати глобальні налаштування, інтеграції (Stripe, Resend, SMS), редагувати інструкції для менеджерів, ставити SLA-параметри, призначати ролі." />
      <Row k="Team Lead" v="Бачить роботу всієї своєї команди: ліди, що зависли, перевитрати SLA, продуктивність менеджерів. Може робити масові перепризначення лідів, дивитись витрати і KPI. НЕ може змінювати інтеграції чи інструкції — це адмінська зона." />
      <Row k="Manager" v="Бачить лише своїх лідів, своїх клієнтів, свої угоди. Жоден менеджер не може бачити лідів іншого менеджера — це закрито на рівні бекенду. Навіть якщо вручну ввести URL із чужим ID — у відповідь буде 403 Forbidden." />
      <Row k="Customer (user)" v="Це клієнт. Заходить через окремий вхід /cabinet/login. Бачить тільки свій кабінет: свої замовлення, рахунки, контракти, документи, доставку. Клієнт А ніколи не побачить дані клієнта Б." />
    </tbody></table>
    <Callout tone="warn" title="Якщо менеджер каже «я не бачу лід»">Це нормально. Скоріше за все, лід призначено іншому менеджеру або не призначено нікому. Зайдіть під своєю роллю (team_lead) і подивіться у фільтрі «Без менеджера» або в самій картці ліда — там видно, кому він належить.</Callout>
    <p>Спеціальний випадок — <b>OTP для тімліда</b>. При вході team_lead отримує одноразовий код на email і має його ввести. Це 2FA, додатковий шар захисту для критичної ролі. Менеджер і клієнт логіняться без OTP.</p>
  </Section>

  <Section id="data-flow" title="3. Як рухаються дані всередині CRM">
    <p>Уявіть собі стрічку: клієнт зайшов на сайт → залишив заявку → потрапив у систему як <b>Лід</b>. Менеджер з ним поспілкувався — лід перетворився на <b>Клієнта</b>. Узгодили авто і ціну — створили <b>Інвойс</b>. Клієнт оплатив через Stripe — інвойс став «paid» і автоматично згенерувалось <b>Замовлення</b>. На замовлення поверх накладається <b>Дорожня карта</b> (Roadmap) — список етапів: купити на аукціоні, оформити документи, привезти, пройти митницю, передати ключі. Паралельно створюється <b>Контракт</b> — клієнт підписує його онлайн. Коли авто в дорозі, активується модуль <b>Delivery 360</b>: трекери, CMR, страховка, ETA. Коли клієнт отримав авто — цикл завершено.</p>
    <Callout tone="good" title="Чому це важливо памʼятати">Якщо ви бачите дивну поведінку — «у клієнта зник інвойс» — згадайте цей ланцюжок. Скоріш за все, інвойс перейшов у статус «paid» і тепер видно в Order, або клієнт ще не зробив дії, яка потрібна для просування ланцюжка далі.</Callout>
    <p>Кожна подія, яка зрушує ланцюжок, генерує <b>тайм-лайн</b> у картці клієнта. Тайм-лайн — це наша «чорна скринька» для розборів польотів.</p>
  </Section>

  <Section id="m-dashboard" title="4. Дашборд (головна сторінка)">
    <p>Адреса: <Code>/admin</Code>. Це перший екран, на який ви потрапляєте після входу. Тут зібрано «температуру системи» на сьогодні: скільки нових лідів за добу, скільки відкритих угод, скільки прострочених завдань, скільки дзвінків поки що без відповіді. Якщо щось пульсує червоним — туди й треба заходити в першу чергу.</p>
    <p>Дашборд динамічно адаптується до ролі. Менеджер бачить свої цифри, тімлід — цифри команди, адмін — всю компанію. Це не одна сторінка з фільтрами, а три різні дашборди під одним URL.</p>
  </Section>

  <Section id="m-action" title="5. Центр дій (Action Center)">
    <p>«Список того, що треба зробити просто зараз». На відміну від ваших особистих задач, Action Center показує системно згенеровані дії: «у цього ліда минув SLA», «цей клієнт чекає на дзвінок уже 3 дні», «по цій угоді протерміновано підпис договору».</p>
    <p>Сюди ж потрапляють кейси Bulk Reassign — наприклад, коли менеджер пішов у відпустку і його лідів треба перепризначити команді.</p>
    <Callout tone="info" title="Правило роботи">Якщо ви не знаєте, з чого почати робочий день — починайте з Action Center. Що зверху — горить.</Callout>
  </Section>

  <Section id="m-executive" title="6. Виконавчий центр (Executive Center)">
    <p>Сторінка для тімліда та адміна. Тут зведено картину команди: скільки лідів у кожного менеджера, який у нього SLA-перформенс, скільки конверсій за останні 7 днів, де «гарячі» ліди застрягли.</p>
    <p>Менеджер цього розділу не бачить — для нього сайдбар просто не показує цей пункт. Виконавчий центр потрібен керівнику, щоб <b>швидко зрозуміти, хто тоне і кому треба допомогти</b>.</p>
  </Section>

  <Section id="m-notif" title="7. Центр сповіщень (Notification Center)">
    <p>Усе, що система хоче вам сказати — потрапляє сюди: новий лід призначено вам, клієнт оплатив інвойс, прийшов вебхук від Stripe, контракт підписано, сталась ескалація SLA. Сповіщення приходять у реальному часі через веб-сокети (без перезавантаження сторінки).</p>
    <p>Тут є дві категорії: <b>системні</b> (це треба прочитати — наприклад, оплата надійшла) і <b>інформаційні</b> (це довідка, можна ігнорувати). Червоний бейдж біля дзвіночка у шапці — це непрочитані системні.</p>
  </Section>

  <Section id="m-leads" title="8. CRM → Ліди (Leads)">
    <p>Серце воронки продажу. Лід — це людина, яка десь залишила контакт: через форму на сайті, через ringostat (дзвінок), через імпорт з каталогу. Усі ліди потрапляють у Lead Workspace — це наш «канбан».</p>
    <p><b>Що з лідом можна робити:</b></p>
    <Step n="1" title="Призначити менеджера">Зазвичай це робить тімлід або правило авторозподілу. Можна перепризначити в будь-який момент.</Step>
    <Step n="2" title="Зателефонувати / написати">Усі дзвінки автоматично логуються через ringostat. Email/SMS — через Resend і TextBelt.</Step>
    <Step n="3" title="Створити задачу">«Передзвонити завтра», «надіслати пропозицію» тощо. Задача звʼязується з лідом.</Step>
    <Step n="4" title="Поміняти статус">Новий → Контакт встановлено → Кваліфікований → Перемовини → Готовий → Конвертовано / Відмова.</Step>
    <Step n="5" title="Конвертувати в клієнта">Коли лід погодився купувати — натискаємо «Конвертувати». Створюється запис у Customers, лід зберігається як історія.</Step>
    <Callout tone="warn" title="SLA правило">Якщо лід «New» і ніхто йому не відповів за 30 хвилин — на менеджера летить сповіщення. Через 2 години — ескалація тімліду. Це жорстко стежиться модулем Lead SLA.</Callout>
    <p><b>Smart-фільтри</b> у лівій панелі — готові пресети: «Потрібен контакт сьогодні», «Немає контакту &gt; 7 днів», «Гарячий + без відкритих задач», «Готові до конвертації», «Зависли на перемовинах», «Без менеджера», «Великий бюджет, активний». Користуйтеся ними — це швидше, ніж щоразу налаштовувати фільтри вручну.</p>
  </Section>

  <Section id="m-customers" title="9. CRM → Клієнти (Customers)">
    <p>Коли лід стає клієнтом — він потрапляє сюди. У клієнта є <b>картка 360°</b> (Customer360), де зібрано все: огляд, дорожня карта, коментарі команди, задачі, легальні документи, ліди, пропозиції, угоди, інвойси, замовлення, платежі, депозити, дзвінки, контракти, документи, тайм-лайн, продажі, зустрічі та історія змін.</p>
    <p>Якщо клієнт зателефонував і запитав «де моя машина?» — відкриваєте картку, дивитесь Roadmap і Delivery 360 у одному вікні. Не треба нікуди перемикатись.</p>
    <Callout tone="info" title="Історія змін">У вкладці «Історія змін» система автоматично фіксує всі редагування картки: хто змінив поле, яке було значення до і після, коли це сталося. Це бекапна страховка для команди — нічого не «загубиться».</Callout>
  </Section>

  <Section id="m-sales" title="10. Продажі та Зустрічі">
    <p><b>Продажі (Sales)</b> — окремий розділ для угод, які реально дійшли до контракту і грошей. По суті, це фінальна стадія воронки. Тут ведуть сальдо, скільки клієнт вже сплатив, що залишилось, у якій валюті.</p>
    <p><b>Зустрічі (Meetings)</b> — це календар. Менеджер планує очні або онлайн-зустрічі з клієнтом, додає посилання, нагадування. Клієнт у своєму кабінеті бачить заплановану зустріч.</p>
  </Section>

  <Section id="m-portal" title="11. Портал клієнта (Customer Portal)">
    <p>Це адмін-погляд на те, як виглядає кабінет клієнта. Корисно, коли клієнт телефонує і каже «я нічого там не бачу». Адмін може зайти і подивитись на власні очі.</p>
    <p>Сам клієнтський кабінет (для клієнта) лежить за адресою <Code>/cabinet</Code>. Туди клієнт логіниться окремим паролем і бачить лише свої дані.</p>
    <Callout tone="danger" title="Безпека — критично">Клієнт А <b>не може</b> технічно побачити дані клієнта Б, навіть якщо ввести URL з чужим ID. Це закрито на рівні бекенду (cross-tenant guard). Якщо колись помітите щось протилежне — це інцидент безпеки, повідомляйте адміна негайно.</Callout>
  </Section>

  <Section id="m-roadmaps" title="12. Дорожні карти (Roadmaps)">
    <p>Дорожня карта — це покроковий план виконання замовлення. Коли клієнт сплатив інвойс, система автоматично створює Roadmap на основі <b>шаблону робочого процесу</b> (Workflow Template): пригін з США, пригін з Кореї, реєстрація, адаптація, доставка, детейлінг.</p>
    <p>Кожен крок має статус (очікує / в роботі / завершено) і відповідального. Клієнт у своєму кабінеті бачить ці кроки наживо — це знімає 70% дзвінків «де моя машина?».</p>
  </Section>

  <Section id="m-docs" title="13. Шаблони документів і Файловий менеджер">
    <p>У клієнта є папки документів. Канонічна структура (єдина для всіх клієнтів):</p>
    <table className="w-full text-[13px] my-2"><tbody>
      <Row k="Документи клієнта (customer_docs)" v="Паспорт, EGN, ідентифікаційні дані." />
      <Row k="Документи по авто (vehicle_docs)" v="VIN-документ, тайтл, рахунки на авто, реєстраційні папери." />
      <Row k="Договори (contracts)" v="PDF-договори, оригінали та підписані версії." />
      <Row k="Фото авто (vehicle_photos)" v="Фотозвіти зі стоянки, з аукціону, після митниці." />
      <Row k="Інше (other)" v="Усе, що не влізло в категорії вище." />
    </tbody></table>
    <p><b>Шаблони документів</b> — готові заготовки договорів, актів, доручень. Менеджер вибирає шаблон → система підставляє дані клієнта → PDF готовий за 5 секунд.</p>
  </Section>

  <Section id="m-contracts" title="14. Контракти 360">
    <p>Модуль контрактного процесу. Договір живе в кількох станах: <b>Чернетка → Надіслано клієнту → Підписано → Архів</b>.</p>
    <Step n="1" title="Створюємо договір з шаблону">Натискаємо «Згенерувати договір» у картці клієнта. Підставляються дані: ПІБ, EGN, авто, VIN, ціна.</Step>
    <Step n="2" title="Перевіряємо і надсилаємо">Тиснемо «Надіслати клієнту». Система генерує унікальне посилання для підписання і надсилає клієнту email + SMS.</Step>
    <Step n="3" title="Клієнт підписує онлайн">Клієнт переходить за посиланням, читає договір, ставить галочку «згоден», вводить ПІБ, натискає «Підписати». Підпис фіксується з міткою часу і IP.</Step>
    <Step n="4" title="Архів">Після завершення угоди договір переходить в Архів. Залишається доступним назавжди — для аудитів і повторного перегляду.</Step>
  </Section>

  <Section id="m-finance" title="15. Фінанси (Finance 360 + Stripe)">
    <p>Модуль грошей. Працює зі Stripe. Що тут є:</p>
    <ul className="list-disc pl-5 space-y-1 my-2 text-[14px]">
      <li><b>Інвойси:</b> створюються вручну або генеруються автоматично з угоди.</li>
      <li><b>Stripe Checkout:</b> клієнт отримує посилання на оплату, оплачує карткою (Apple Pay, Google Pay теж підтримуються).</li>
      <li><b>Платежі:</b> усі транзакції зі Stripe — успішні, провалені, refund.</li>
      <li><b>Депозити:</b> часткові оплати на старті угоди — щоб клієнт «закріпився».</li>
      <li><b>Outstanding:</b> хто кому скільки винен, по якому інвойсу.</li>
    </ul>
    <Callout tone="info" title="Звʼязок зі Stripe">Усі ключі Stripe зберігаються у <Code>/admin/integrations → Stripe</Code>. Якщо треба змінити sandbox на live або поновити webhook secret — тільки звідти. Файл .env має дефолтні значення на випадок повної очистки БД.</Callout>
  </Section>

  <Section id="m-delivery" title="16. Доставка 360 (Delivery)">
    <p>Модуль логістики. Коли авто куплене на аукціоні, починається доставка: з аукціонної стоянки → у порт → морський контейнер → європейський порт → митниця → клієнт. Усі ці кроки фіксуються тут.</p>
    <p>На кожен крок є <b>ETA</b>, <b>CMR</b>, інформація про перевізника, фотозвіт зі стоянки. Якщо є GPS-трекер на контейнері — позиція оновлюється кожні 60 секунд.</p>
  </Section>

  <Section id="m-operations" title="17. Операції 360">
    <p>Сторінка «для CEO». Не потрібна менеджеру щодня. Тут зведено <b>вузькі місця</b> компанії: де команда тоне в задачах, які SLA постійно провалюються, скільки угод застрягли, які менеджери перевантажені. По суті — командний термометр.</p>
  </Section>

  <Section id="m-forecasting" title="18. Прогнозування 360">
    <p>Передбачуваність бізнесу. Скільки угод ми ймовірно закриємо цього місяця? Скільки грошей надійде? Які ліди мають найвищу ймовірність конвертації? Модуль не пророкує майбутнє — він на основі історичних даних і активності лідів виставляє ймовірності.</p>
  </Section>

  <Section id="m-calc" title="19. Калькулятор пригону">
    <p>Інструмент для менеджера: ввести VIN/лот або параметри авто (рік, марка, обʼєм, тип палива) — отримати орієнтовну собівартість з усіма зборами: аукціонний збір, доставка з США/Кореї, морський фрахт, ПДВ, акциз, експортний/імпортний податок, послуги BIBI Cars. На виході — пропозиція для клієнта.</p>
    <p>Калькулятор синхронізований з курсами валют (USD/EUR/BGN) і з ставками митниці. Якщо ставки змінилися — оновіть їх у налаштуваннях, а не змінюйте цифри вручну на калькуляторі.</p>
  </Section>

  <Section id="m-vin" title="20. VIN Engine та парсери">
    <p>VIN — це 17-символьний номер кузова. По ньому ми витягуємо інформацію про авто: марка, модель, рік, комплектація, історія аукціону, фотозвіт, одометр, історія пошкоджень. Дані тягнуться з шести джерел паралельно: BitMotors, WestMotors, Poctra, CarsFromWest, AutoAuctionHistory, SalvageBid.</p>
    <p>Якщо одне джерело не відповіло — використовується наступне. Це називається «multi-source resolver».</p>
    <Callout tone="info" title="Швидка перевірка">Сторінка <Code>/admin/parser</Code> — інтерфейс для VIN-перевірок. Адмін може вручну скинути кеш по конкретному VIN, якщо клієнт каже «там неправильна інформація».</Callout>
  </Section>

  <Section id="m-staff" title="21. Команда (Staff / Team Lead / Manager)">
    <p>Сторінка <Code>/admin/staff</Code> — список співробітників. Тут адмін додає нового менеджера, призначає роль (manager / team_lead / admin), бачить його завантаженість і статистику.</p>
    <p>Кожен співробітник має свій <b>Team Dashboard</b> (якщо тімлід) або <b>Мій простір</b> (якщо менеджер) — особиста сторінка з його лідами, задачами, KPI.</p>
  </Section>

  <Section id="flows" title="22. Наскрізні бізнес-процеси">
    <p>Покажемо найголовніший процес від А до Я — пригін авто з США:</p>
    <Step n="1" title="Заявка">Клієнт залишає заявку на сайті → автоматично створюється Лід.</Step>
    <Step n="2" title="Перший контакт">SLA-таймер запускається. У менеджера 30 хвилин на першу реакцію.</Step>
    <Step n="3" title="Кваліфікація">Бюджет, тип авто, терміни. Лід проходить статуси Контакт → Кваліфікований → Перемовини.</Step>
    <Step n="4" title="Калькулятор">Менеджер підраховує собівартість і додає маржу. Готує пропозицію.</Step>
    <Step n="5" title="Конвертація в клієнта">Клієнт каже «беремо». Створюється запис у Customers, генеруються канонічні папки документів.</Step>
    <Step n="6" title="Депозит">Виставляємо депозит-інвойс (зазвичай $500–$1000). Клієнт сплачує через Stripe.</Step>
    <Step n="7" title="Договір">Генерується PDF з шаблону, надсилається клієнту, той підписує онлайн.</Step>
    <Step n="8" title="Купівля на аукціоні">Менеджер бідає від імені клієнта. Виграли — створюється Order.</Step>
    <Step n="9" title="Дорожня карта">Розгортається Roadmap зі своїми кроками.</Step>
    <Step n="10" title="Доставка">Delivery 360 веде авто від аукціонної стоянки до митниці.</Step>
    <Step n="11" title="Передача">Останній інвойс на повну суму. Клієнт сплачує. Виписуємо Акт прийому-передачі.</Step>
    <Step n="12" title="Архів">Усі документи зберігаються в архіві клієнта. Картка переходить у статус «completed».</Step>
  </Section>

  <Section id="sla" title="23. SLA, ескалації та контроль якості">
    <p>Lead SLA — автоматичний наглядач. Параметри (адмін може змінити):</p>
    <table className="w-full text-[13px] my-2"><tbody>
      <Row k="Перша реакція" v="30 хвилин після створення ліда. Не відповів — летить сповіщення менеджеру." />
      <Row k="Ескалація" v="Через 2 години без реакції — летить сповіщення тімліду." />
      <Row k="Скан БД" v="Запускається раз на хвилину (worker lead_sla_worker)." />
    </tbody></table>
    <p>На сторінці Leads є кнопка-фільтр <b>SLA прострочено</b> — швидкий доступ до всіх лідів, де таймер вже червоний.</p>
  </Section>

  <Section id="auth" title="24. Безпека, авторизація, аудит">
    <p>Декілька шарів захисту:</p>
    <ul className="list-disc pl-5 space-y-1 my-2 text-[14px]">
      <li><b>JWT-токени</b> для всіх API-запитів. Без токена — 401.</li>
      <li><b>OTP для тімліда</b>: при вході team_lead отримує одноразовий код на email і має його ввести.</li>
      <li><b>Cross-tenant guard</b> для клієнтського кабінету (клієнт А не побачить дані клієнта Б).</li>
      <li><b>Manager scope</b>: менеджер бачить тільки своїх клієнтів і лідів.</li>
      <li><b>Login Audit</b>: усі входи логуються (хто, коли, з якого IP).</li>
      <li><b>Change History</b>: усі редагування полів зберігаються з міткою «хто, коли, що було, що стало».</li>
    </ul>
  </Section>

  <Section id="integrations" title="25. Інтеграції (Stripe, Resend, SMS)">
    <p>Усі сторонні сервіси налаштовуються в одному місці: <Code>/admin/integrations</Code>.</p>
    <ul className="list-disc pl-5 space-y-1 my-2 text-[14px]">
      <li><b>Stripe</b> — приймання платежів. Sandbox для тесту, live — для production.</li>
      <li><b>Resend</b> — сучасний email-API. Безкоштовно: 3 000 листів/міс. Потрібен верифікований домен з SPF + DKIM + DMARC.</li>
      <li><b>SMTP</b> — резервний канал email через будь-який сервер.</li>
      <li><b>TextBelt</b> — SMS. Дефолтно у безкоштовному режимі.</li>
      <li><b>Ringostat</b> — телефонія. Дзвінки логуються автоматично.</li>
    </ul>
  </Section>

  <Section id="i18n" title="26. Мови інтерфейсу (UK / EN / BG)">
    <p>Система розмовляє трьома мовами: українською, англійською, болгарською. Перемикач — у правому верхньому куті. Перемикання миттєве, без перезавантаження сторінки. Усі заголовки, фільтри, кнопки і Smart-фільтри з бекенду — все переходить на вибрану мову.</p>
    <Callout tone="info" title="Окремі терміни залишаються англійською">CRM, ROI, SLA, ETA, Ringostat — це міжнародні скорочення і бренди, які в усьому світі пишуть однаково.</Callout>
  </Section>

  <Section id="firstday" title="27. Перший день нового співробітника">
    <p>Що зробити в перший день, у такому порядку:</p>
    <Step n="1" title="Отримати доступи">Адмін створює акаунт у /admin/staff, призначає роль. Ви отримуєте email з логіном.</Step>
    <Step n="2" title="Зайти і поміняти пароль">Зайти на /admin/login, ввести початкові дані, одразу змінити пароль у профілі.</Step>
    <Step n="3" title="Прочитати цей гайд">Так. Зараз ви тут. Нормально, що з першого разу не запамʼятається все — він тут залишиться, можна повертатися.</Step>
    <Step n="4" title="Подивитись Дашборд">Зрозуміти, що зараз відбувається в системі.</Step>
    <Step n="5" title="Зайти у Leads → Lead Workspace">Подивитись «свій канбан». Якщо там пусто — тімлід ще не призначив вам ліди. Запитайте.</Step>
    <Step n="6" title="Відкрити одну картку 360°">Знайти будь-якого клієнта і відкрити Customer360. Подивитись усі вкладки. Зрозуміти, що в системі є все, що треба для роботи.</Step>
    <Step n="7" title="Перші реальні дзвінки">Перші 2-3 дзвінки робіть під наглядом тімліда. Дзвінок автоматично записується.</Step>
    <Step n="8" title="Кінець дня">Подивитись Action Center — там система покаже, що залишилось зробити завтра.</Step>
  </Section>

  <Section id="faq" title="28. Часті питання">
    <p><b>Питання:</b> Я не бачу лід, який бачив учора. Куди він подівся?</p>
    <p><b>Відповідь:</b> Скоріше за все, його переназначили іншому менеджеру або змінили статус (наприклад, на «Відмова»). Подивіться фільтр «Усі статуси». Якщо там його теж немає — звертайтесь до тімліда.</p>
    <p className="pt-3"><b>Питання:</b> Stripe не приймає тестову картку.</p>
    <p><b>Відповідь:</b> Перевірте, що ви на sandbox-ключах. Для тесту використовуйте <Code>4242 4242 4242 4242</Code> з будь-якою майбутньою датою і будь-яким CVC.</p>
    <p className="pt-3"><b>Питання:</b> Клієнт каже «не приходить email від нас».</p>
    <p><b>Відповідь:</b> Перевірте, чи налаштовано Resend і чи верифікований домен. Подивіться Email Outbox: можливо, лист у статусі dry_run. Перевірте, чи email клієнта не у спамі.</p>
    <p className="pt-3"><b>Питання:</b> Як змінити мову інтерфейсу для всіх співробітників одразу?</p>
    <p><b>Відповідь:</b> Ніяк — кожен сам обирає свою мову.</p>
    <p className="pt-3"><b>Питання:</b> Зробив помилку в картці клієнта, не памʼятаю, що там було до того.</p>
    <p><b>Відповідь:</b> Відкрийте Customer360 → вкладка «Історія змін» — там усе записано (хто, коли, яке поле, попереднє значення, нове). Можна відновити вручну.</p>
    <p className="pt-3"><b>Питання:</b> Чи можна додати своє правило в Manager Instructions?</p>
    <p><b>Відповідь:</b> Цей блок — для адміна. Менеджер його тільки читає. Якщо треба змінити правила роботи команди — пишіть адміну.</p>
    <Callout tone="good" title="Не знайшли свого питання?">Поспілкуйтесь з тімлідом або напишіть адміну. Цей гайд — живий документ: ми його доповнюємо, коли зʼявляються нові кейси.</Callout>
    <div className="pt-4 mt-6 border-t border-[#F4F4F5] text-[12px] text-[#71717A]">
      <p>BIBI Cars CRM · внутрішній документ · українська редакція.</p>
    </div>
  </Section>
</>); }

/* ════════════════════════════════════════════════════════════════════
 * ENGLISH edition — written natively in English, not translated
 * ════════════════════════════════════════════════════════════════════ */
function EnContent() { return (<>
  <Section id="intro" title="1. Why this CRM exists">
    <p>BIBI Cars is a CRM system the team uses to walk customers from their first inquiry to the moment they pick up their car. Everything that happens with a customer — calls, emails, invoices, contracts, shipping — lives in one place. No parallel spreadsheets, no private notes in someone's notebook: if it happened, it should be in the CRM.</p>
    <p>The system has four roles: <b>Admin</b>, <b>Team Lead</b>, <b>Manager</b>, and <b>Customer (user)</b>. The first three are us — the staff. The fourth is the people who buy cars through us; they sign in to their own customer cabinet.</p>
    <p>Technically the project has two halves: a <b>public site</b> (catalog, landing pages, calculator, contact forms) and an <b>internal CRM</b> at <Code>/admin</Code>. This guide only covers the internal side.</p>
    <Callout tone="info" title="The one idea to remember">Every lead travels through the same chain: <b>Lead → Customer → Invoice → Payment → Order → Roadmap → Contract → Delivery</b>. Every other module is a supporting service for that single path.</Callout>
    <p>If you understand that chain, you understand 80% of the system. Everything else is detail you'll pick up in your first week on the floor.</p>
  </Section>

  <Section id="roles" title="2. Roles & access control">
    <p>Access is strictly partitioned. Each role sees only what it needs. This isn't a convenience — it's a security requirement. Customer A must never see Customer B's data, and a manager must never see another manager's leads.</p>
    <table className="w-full text-[13px] my-2"><tbody>
      <Row k="Admin" v="Sees everything: every customer, every lead, every dollar, every log entry. Admins are the only ones who can change integrations (Stripe, Resend, SMS), edit manager instructions, set SLA thresholds, and assign roles." />
      <Row k="Team Lead" v="Sees their team's work: stuck leads, blown SLAs, manager productivity. Can bulk-reassign leads and review KPIs. Cannot change integrations or admin instructions." />
      <Row k="Manager" v="Sees only their own leads, customers, and deals. A manager cannot view another manager's data — this is enforced on the backend. Hand-typing the URL with someone else's ID returns 403 Forbidden." />
      <Row k="Customer (user)" v="The buyer. Signs in through /cabinet/login and sees only their own cabinet: their orders, invoices, contracts, documents, shipping. Customer A can never see Customer B." />
    </tbody></table>
    <Callout tone="warn" title="If a manager says 'I can't see this lead'">Usually it means the lead is assigned to someone else, or to nobody. Sign in as team_lead and check the "Unassigned" filter, or open the lead card directly — the assignee is shown there.</Callout>
    <p>Special case: <b>OTP for team leads</b>. When a team lead signs in, they receive a one-time code by email and have to enter it. This is 2FA — an extra security layer on a critical role. Managers and customers sign in without OTP.</p>
  </Section>

  <Section id="data-flow" title="3. How data flows inside the CRM">
    <p>Picture a conveyor belt. A visitor lands on the website → submits a form → enters the system as a <b>Lead</b>. The manager talks to them → the lead becomes a <b>Customer</b>. Vehicle and price are agreed → an <b>Invoice</b> is created. The customer pays via Stripe → the invoice flips to "paid" and an <b>Order</b> is automatically generated. A <b>Roadmap</b> is laid over that order — the step-by-step list of what must happen: bid at auction, paperwork, shipping, customs, hand-over. In parallel a <b>Contract</b> is generated and the customer signs it online. While the car is moving, <b>Delivery 360</b> tracks it: GPS, CMR, insurance, ETA. When the customer takes possession, the cycle is closed.</p>
    <Callout tone="good" title="Why memorize this">When something looks weird ("the invoice disappeared"), walk the chain. Most often the invoice flipped to "paid" and is now visible on the Order. Or the customer hasn't completed the step needed to move forward.</Callout>
    <p>Every event that advances the chain also writes a <b>timeline entry</b> on the customer card. The timeline is our flight recorder for postmortems.</p>
  </Section>

  <Section id="m-dashboard" title="4. Dashboard (home screen)">
    <p>URL: <Code>/admin</Code>. The first screen after sign-in. It shows today's "system temperature": new leads in the last 24 hours, open deals, overdue tasks, calls that haven't been returned. Anything pulsing red is what to handle first.</p>
    <p>The dashboard adapts to your role. Managers see their personal numbers. Team leads see their team. Admins see the whole company. It's the same URL but three different dashboards underneath.</p>
  </Section>

  <Section id="m-action" title="5. Action Center">
    <p>"The list of things to do right now." Unlike personal Tasks, the Action Center holds system-generated work: "this lead's SLA has expired", "this customer has been waiting 3 days for a call", "this deal's contract is overdue for signature".</p>
    <p>Bulk Reassign cases also land here — for example when a manager goes on vacation and their leads need to be redistributed.</p>
    <Callout tone="info" title="Daily ritual">If you don't know what to start with in the morning, start with the Action Center. The items at the top are on fire.</Callout>
  </Section>

  <Section id="m-executive" title="6. Executive Center">
    <p>Built for team leads and admins. It aggregates the team picture: each manager's load, SLA performance, conversions over the last 7 days, where the hot leads are stuck.</p>
    <p>Managers don't see this page in the sidebar at all. The Executive Center exists so leaders can <b>quickly figure out who's drowning and who needs help</b>.</p>
  </Section>

  <Section id="m-notif" title="7. Notification Center">
    <p>Anything the system wants to tell you ends up here: a new lead was assigned to you, a customer paid an invoice, a Stripe webhook arrived, a contract was signed, an SLA escalation fired. Notifications stream in real time over WebSockets — no page reload needed.</p>
    <p>Two categories: <b>system</b> notifications (you really should read these — like incoming payments) and <b>informational</b> (FYI — safe to ignore). The red badge on the bell in the top bar is your count of unread system notifications.</p>
  </Section>

  <Section id="m-leads" title="8. CRM → Leads">
    <p>The top of the funnel. A lead is anyone who left a contact: website form, Ringostat phone call, imported catalog click. All leads land in the Lead Workspace — our Kanban board.</p>
    <p><b>What you can do with a lead:</b></p>
    <Step n="1" title="Assign a manager">Usually done by the team lead or by an auto-assignment rule. Can be reassigned at any time.</Step>
    <Step n="2" title="Call / email / SMS">Calls are logged automatically via Ringostat. Email/SMS go through Resend and TextBelt.</Step>
    <Step n="3" title="Create a task">"Call back tomorrow", "send a quote". Tasks are linked to the lead.</Step>
    <Step n="4" title="Change status">New → Contacted → Qualified → Negotiation → Ready → Converted / Lost.</Step>
    <Step n="5" title="Convert to customer">When the lead agrees to buy, hit "Convert". A Customer record is created; the lead is preserved in history.</Step>
    <Callout tone="warn" title="SLA rule">If a lead is "New" and no one replies within 30 minutes, the manager gets a notification. After 2 hours it escalates to the team lead. This is enforced by the Lead SLA worker.</Callout>
    <p><b>Smart filter presets</b> live in the left panel — ready-made queries: "Needs contact today", "No contact &gt; 7d", "Hot + no open task", "Ready to convert", "Stuck in negotiation", "Unassigned", "Big budget, active". Use them; they're faster than building filters by hand each time.</p>
  </Section>

  <Section id="m-customers" title="9. CRM → Customers">
    <p>Once a lead becomes a customer, they land here. Every customer has a <b>360° card</b> (Customer360) containing everything in one place: overview, roadmap, team comments, tasks, legal docs, leads, quotes, deals, invoices, orders, payments, deposits, calls, contracts, documents, timeline, sales, meetings, and change history.</p>
    <p>When a customer phones and asks "where's my car?", you open the card and look at Roadmap and Delivery 360 in the same window. No tab-switching, no searching.</p>
    <Callout tone="info" title="Change history is your safety net">The "Change history" tab automatically records every edit: who changed the field, the old value, the new value, when it happened. Nothing gets "lost in translation".</Callout>
  </Section>

  <Section id="m-sales" title="10. Sales & Meetings">
    <p><b>Sales</b> is a dedicated section for deals that actually reached contract + money. Effectively the bottom of the funnel. It tracks balances: paid, outstanding, currency.</p>
    <p><b>Meetings</b> is the team calendar. Managers schedule in-person or online meetings with customers, add links, set reminders. The customer sees the meeting on their portal.</p>
  </Section>

  <Section id="m-portal" title="11. Customer Portal">
    <p>This is the admin's view of what the customer sees in their own cabinet. Helpful when a customer calls and says "I can't see anything in there" — the admin can sign in as them and look with their own eyes.</p>
    <p>The actual customer-facing cabinet sits at <Code>/cabinet</Code>. Customers sign in with a separate password and see only their own data.</p>
    <Callout tone="danger" title="Security — non-negotiable">Customer A <b>cannot</b> technically see Customer B's data, even by hand-editing the URL with someone else's ID. This is enforced at the backend layer (cross-tenant guard). If you ever observe the opposite, it's a security incident — report it to admin immediately.</Callout>
  </Section>

  <Section id="m-roadmaps" title="12. Roadmaps">
    <p>A roadmap is the step-by-step plan of how an order will be executed. When the customer pays an invoice, the system auto-creates a Roadmap from a <b>workflow template</b> tied to the service: US import, Korea import, registration, adaptation, delivery, detailing.</p>
    <p>Each step has a status (pending / in progress / done) and an owner. The customer can see these steps in their cabinet in real time — that alone removes about 70% of the "where's my car?" calls.</p>
  </Section>

  <Section id="m-docs" title="13. Document templates & File manager">
    <p>Every customer has a fixed folder structure. The same five canonical folders for everyone:</p>
    <table className="w-full text-[13px] my-2"><tbody>
      <Row k="Customer docs (customer_docs)" v="Passport, ID, proof of identity." />
      <Row k="Vehicle docs (vehicle_docs)" v="VIN doc, title, vehicle invoices, registration papers." />
      <Row k="Contracts" v="Generated PDFs, both drafts and signed copies." />
      <Row k="Vehicle photos (vehicle_photos)" v="Photo reports from the lot, the auction, after customs." />
      <Row k="Other" v="Anything that doesn't fit the categories above." />
    </tbody></table>
    <p><b>Document templates</b> are pre-built scaffolds for contracts, acts, powers of attorney. Manager picks a template → system injects customer data → PDF is ready in five seconds.</p>
  </Section>

  <Section id="m-contracts" title="14. Contracts 360">
    <p>A dedicated module for the contract lifecycle. A contract moves through clear states: <b>Draft → Sent to customer → Signed → Archived</b>.</p>
    <Step n="1" title="Generate from template">Hit "Generate contract" on the customer card. Name, EGN, vehicle, VIN, price are pre-filled.</Step>
    <Step n="2" title="Review and send">Hit "Send". The system creates a unique signing link and emails + SMSes the customer.</Step>
    <Step n="3" title="Customer signs online">They open the link, read the contract, tick "I agree", type their name, click "Sign". The signature is captured with a timestamp and IP.</Step>
    <Step n="4" title="Archive">When the deal closes, the contract moves to Archive. Stays available forever — for audit and re-review.</Step>
  </Section>

  <Section id="m-finance" title="15. Finance (Finance 360 + Stripe)">
    <p>The money module. Backed by Stripe. What you'll find here:</p>
    <ul className="list-disc pl-5 space-y-1 my-2 text-[14px]">
      <li><b>Invoices:</b> created manually or auto-generated from a deal.</li>
      <li><b>Stripe Checkout:</b> the customer receives a payment link, pays by card (Apple Pay and Google Pay also supported).</li>
      <li><b>Payments:</b> every Stripe transaction — successful, failed, refunded.</li>
      <li><b>Deposits:</b> partial early payments to "lock in" the customer.</li>
      <li><b>Outstanding:</b> who owes how much on which invoice.</li>
    </ul>
    <Callout tone="info" title="Stripe configuration">All Stripe keys live at <Code>/admin/integrations → Stripe</Code>. To switch sandbox → live or refresh the webhook secret — do it there. The .env file holds defaults so the integration survives a DB wipe.</Callout>
  </Section>

  <Section id="m-delivery" title="16. Delivery 360">
    <p>The logistics module. Once a car is bought at auction, shipping begins: auction lot → US port → ocean container → European port → customs → customer. Every step is logged here.</p>
    <p>Each step carries an <b>ETA</b>, a <b>CMR</b> (consignment note), carrier info, photo reports from the lot. If a GPS tracker is on the container, position updates every 60 seconds.</p>
  </Section>

  <Section id="m-operations" title="17. Operations 360">
    <p>The "CEO page". Not for daily manager use. It surfaces the company's <b>bottlenecks</b>: where the team is drowning, which SLAs keep blowing, how many deals are stuck, which managers are overloaded. Essentially a team thermometer.</p>
  </Section>

  <Section id="m-forecasting" title="18. Forecasting 360">
    <p>Business predictability. How many deals will we likely close this month? How much cash will land? Which leads have the highest conversion probability? The module doesn't predict the future — it ranks probabilities based on historical data and current lead activity.</p>
  </Section>

  <Section id="m-calc" title="19. Import Calculator">
    <p>A manager tool. Punch in a VIN/lot or vehicle params (year, make, engine, fuel type) and get a rough landed-cost figure with all fees: auction fee, US/Korea inland shipping, ocean freight, VAT, excise, export/import duties, BIBI Cars service fee. Output is the quote you give the customer.</p>
    <p>The calculator pulls live FX (USD/EUR/BGN) and customs rates. If rates change, update them in settings — don't manually patch numbers in the calculator UI.</p>
  </Section>

  <Section id="m-vin" title="20. VIN Engine & parsers">
    <p>A VIN is the 17-character chassis number. From it we pull make, model, year, trim, auction history, photo reports, odometer, damage history. The data comes from six sources fetched in parallel: BitMotors, WestMotors, Poctra, CarsFromWest, AutoAuctionHistory, SalvageBid.</p>
    <p>If one source fails, the next one is used. This is the multi-source resolver. The old Copart/BidCars wiring is no longer active.</p>
    <Callout tone="info" title="Quick check">The <Code>/admin/parser</Code> page is the manual VIN tester. Admin can flush the cache for a specific VIN if a customer complains the info is wrong.</Callout>
  </Section>

  <Section id="m-staff" title="21. Team (Staff / Team Lead / Manager)">
    <p><Code>/admin/staff</Code> is the team directory. Admins add new managers, assign roles (manager / team_lead / admin), and see load + stats.</p>
    <p>Every staff member has either a <b>Team Dashboard</b> (team leads) or a <b>My Workspace</b> (managers) — their personal page with leads, tasks, KPIs.</p>
  </Section>

  <Section id="flows" title="22. End-to-end business flows">
    <p>The flagship flow: importing a car from the US, from cradle to grave:</p>
    <Step n="1" title="Inquiry">Customer submits the website form → a Lead is auto-created.</Step>
    <Step n="2" title="First contact">SLA timer starts. The manager has 30 minutes to respond.</Step>
    <Step n="3" title="Qualification">Budget, vehicle type, timeline. Lead progresses through Contacted → Qualified → Negotiation.</Step>
    <Step n="4" title="Calculator">Manager runs the calculator, adds margin, prepares the quote.</Step>
    <Step n="5" title="Convert to customer">Customer says yes. A Customer record is created; canonical folders auto-seed.</Step>
    <Step n="6" title="Deposit">Deposit invoice (typically $500–$1000). Customer pays via Stripe.</Step>
    <Step n="7" title="Contract">PDF generated from template, sent to customer, signed online.</Step>
    <Step n="8" title="Auction win">Manager bids on the customer's behalf. Won → Order is created.</Step>
    <Step n="9" title="Roadmap">Workflow template materializes into a customer roadmap.</Step>
    <Step n="10" title="Shipping">Delivery 360 walks the car from auction lot to customs.</Step>
    <Step n="11" title="Hand-over">Final invoice. Customer pays. Acceptance act is signed.</Step>
    <Step n="12" title="Archive">All documents are archived on the customer card. Status flips to "completed".</Step>
  </Section>

  <Section id="sla" title="23. SLA, escalations & quality control">
    <p>Lead SLA is the automatic supervisor. Defaults (admin can change):</p>
    <table className="w-full text-[13px] my-2"><tbody>
      <Row k="First response" v="30 minutes after the lead lands. Missed? Manager gets pinged." />
      <Row k="Escalation" v="2 hours of silence → team lead is pinged." />
      <Row k="DB scan" v="Every 60 seconds (lead_sla_worker)." />
    </tbody></table>
    <p>The Leads page has an <b>SLA overdue</b> filter chip — one click to all leads whose timer has gone red.</p>
  </Section>

  <Section id="auth" title="24. Security, auth, audit trail">
    <p>Several defense layers:</p>
    <ul className="list-disc pl-5 space-y-1 my-2 text-[14px]">
      <li><b>JWT tokens</b> on every API call. No token, no entry — 401.</li>
      <li><b>OTP for team leads</b>: email-delivered one-time code on each login.</li>
      <li><b>Cross-tenant guard</b> for the customer cabinet (Customer A cannot reach Customer B).</li>
      <li><b>Manager scope</b>: managers only see their own customers and leads, period.</li>
      <li><b>Login audit</b>: every sign-in is logged (who, when, from what IP).</li>
      <li><b>Change history</b>: every field edit is recorded — who, when, before, after.</li>
    </ul>
  </Section>

  <Section id="integrations" title="25. Integrations (Stripe, Resend, SMS)">
    <p>All third-party services are configured in one place: <Code>/admin/integrations</Code>.</p>
    <ul className="list-disc pl-5 space-y-1 my-2 text-[14px]">
      <li><b>Stripe</b> — payments. Sandbox for testing, live for production.</li>
      <li><b>Resend</b> — modern email API. Free tier: 3,000 emails/month. Sender domain must be verified with SPF + DKIM + DMARC.</li>
      <li><b>SMTP</b> — fallback email channel through any SMTP server.</li>
      <li><b>TextBelt</b> — SMS, free tier by default.</li>
      <li><b>Ringostat</b> — phone. Calls auto-log into the CRM.</li>
    </ul>
  </Section>

  <Section id="i18n" title="26. UI languages (UK / EN / BG)">
    <p>The system speaks three languages: Ukrainian, English, Bulgarian. Picker is in the top right. Switching is instant, no reload. Headers, filters, buttons, even backend-driven smart filters — everything moves to the selected language.</p>
    <Callout tone="info" title="A few terms stay in English on purpose">CRM, ROI, SLA, ETA, Ringostat — international acronyms and brand names that are written the same way worldwide.</Callout>
  </Section>

  <Section id="firstday" title="27. First day on the team">
    <p>What to do on day one, in order:</p>
    <Step n="1" title="Get access">Admin creates your account in /admin/staff and assigns your role. You receive an email with credentials.</Step>
    <Step n="2" title="Sign in and rotate the password">Go to /admin/login, sign in, change your password in the profile immediately.</Step>
    <Step n="3" title="Read this guide">Yes — right now. It's normal not to remember everything on the first pass; the guide stays here, come back to it.</Step>
    <Step n="4" title="Open the Dashboard">Get a feel for what's currently happening across the system.</Step>
    <Step n="5" title="Go to Leads → Lead Workspace">Look at "your kanban". If it's empty, the team lead hasn't assigned leads yet — ask.</Step>
    <Step n="6" title="Open one Customer360 card">Pick any customer and click through every tab. Confirm the CRM holds everything you need.</Step>
    <Step n="7" title="First real calls">Make your first 2–3 calls with the team lead listening in. Calls are auto-recorded.</Step>
    <Step n="8" title="End of day">Check the Action Center — it'll show what's left for tomorrow.</Step>
  </Section>

  <Section id="faq" title="28. FAQ">
    <p><b>Q:</b> I can't see a lead I saw yesterday. Where did it go?</p>
    <p><b>A:</b> Most likely it was reassigned to another manager or its status was changed (e.g. to "Lost"). Try the "All statuses" filter. If still missing, ask the team lead.</p>
    <p className="pt-3"><b>Q:</b> Stripe rejects my test card.</p>
    <p><b>A:</b> Confirm you're on sandbox keys (admin → Integrations → Stripe → mode = sandbox). Use <Code>4242 4242 4242 4242</Code> with any future date and any CVC.</p>
    <p className="pt-3"><b>Q:</b> Customer says they're not receiving our emails.</p>
    <p><b>A:</b> (1) Check Resend is configured and the domain is verified (Integrations → Resend → Domains). (2) Open Email Outbox — the message may be in "dry_run", which means no channel is configured. (3) Confirm the customer's email isn't in spam and is spelled correctly.</p>
    <p className="pt-3"><b>Q:</b> Can I force everyone on the team to use the same language?</p>
    <p><b>A:</b> No — each person picks their own language. The CRM team chooses what suits them.</p>
    <p className="pt-3"><b>Q:</b> I made a mistake on a customer card and don't remember the previous value.</p>
    <p><b>A:</b> Open Customer360 → "Change history" tab. Every edit is logged (who, when, field, before, after). You can restore manually.</p>
    <p className="pt-3"><b>Q:</b> Can a manager edit Manager Instructions?</p>
    <p><b>A:</b> Read-only for managers. Only admins can edit. If team rules need to change, talk to admin.</p>
    <Callout tone="good" title="Don't see your question?">Ask the team lead or message admin. This guide is a living document — we add to it as new cases come up.</Callout>
    <div className="pt-4 mt-6 border-t border-[#F4F4F5] text-[12px] text-[#71717A]">
      <p>BIBI Cars CRM · internal document · English edition.</p>
    </div>
  </Section>
</>); }

/* ════════════════════════════════════════════════════════════════════
 * BULGARIAN edition — written natively in Bulgarian
 * ════════════════════════════════════════════════════════════════════ */
function BgContent() { return (<>
  <Section id="intro" title="1. Защо съществува тази CRM">
    <p>BIBI Cars е CRM системата, чрез която екипът води клиентите от първото им запитване до момента, в който получават автомобила си. Всичко, което се случва с клиента — обаждания, имейли, фактури, договори, доставка — е на едно място. Без паралелни таблици в Excel, без лични бележки в тефтерче: ако нещо се е случило, трябва да е в CRM.</p>
    <p>Системата има четири роли: <b>Admin</b>, <b>Team Lead</b>, <b>Manager</b> и <b>Customer (user)</b>. Първите три са нашият екип, четвъртата са клиентите, които влизат в своя собствен кабинет.</p>
    <p>Технически проектът се състои от две части: <b>публичен сайт</b> (каталог, лендинг страници, калкулатор, контакти) и <b>вътрешна CRM</b> на адрес <Code>/admin</Code>. Това ръководство покрива само вътрешната част.</p>
    <Callout tone="info" title="Основната идея">Всеки лийд минава през една и съща верига: <b>Лийд → Клиент → Фактура → Плащане → Поръчка → Пътна карта → Договор → Доставка</b>. Всеки друг модул е обслужваща услуга на този единен път.</Callout>
    <p>Ако разбирате тази верига, разбирате 80% от системата. Останалото е детайл, който ще научите за седмица практика.</p>
  </Section>

  <Section id="roles" title="2. Роли и нива на достъп">
    <p>Достъпът е строго разпределен. Всяка роля вижда само това, което ѝ трябва. Това не е удобство — а изискване за сигурност. Клиент А никога не трябва да вижда данни на клиент Б, а един мениджър не трябва да вижда лийдове на друг мениджър.</p>
    <table className="w-full text-[13px] my-2"><tbody>
      <Row k="Admin" v="Вижда всичко: всеки клиент, всеки лийд, всяко евро, всеки лог. Само администраторът може да променя глобалните настройки, интеграциите (Stripe, Resend, SMS), да редактира инструкциите за мениджърите, да задава SLA-параметри и да назначава роли." />
      <Row k="Team Lead" v="Вижда работата на целия си екип: зависнали лийдове, нарушени SLA-та, продуктивност на мениджърите. Може да прави масови преназначения и да гледа KPI. НЕ може да променя интеграции или инструкции." />
      <Row k="Manager" v="Вижда само своите лийдове, клиенти и сделки. Нито един мениджър не може да види лийдовете на друг — това е заключено на бекенда. Дори ръчно въвеждане на URL с чужд ID връща 403 Forbidden." />
      <Row k="Customer (user)" v="Това е клиентът. Влиза през отделен /cabinet/login. Вижда само своя кабинет: своите поръчки, фактури, договори, документи, доставка. Клиент А никога не вижда данни на клиент Б." />
    </tbody></table>
    <Callout tone="warn" title="Ако мениджър каже „не виждам лийда“">Това е нормално. Вероятно лийдът е назначен на друг мениджър или е без мениджър изобщо. Влезте като team_lead и проверете филтъра „Без мениджър“ или отворете самата карта на лийда — там пише на кого принадлежи.</Callout>
    <p>Специален случай: <b>OTP за тимлийд</b>. При влизане team_lead получава еднократен код на имейл и трябва да го въведе. Това е 2FA — допълнителен слой защита за критичната роля. Мениджърите и клиентите влизат без OTP.</p>
  </Section>

  <Section id="data-flow" title="3. Как се движат данните в CRM">
    <p>Представете си конвейер. Посетител идва на сайта → попълва форма → влиза в системата като <b>Лийд</b>. Мениджърът говори с него → лийдът става <b>Клиент</b>. Договарят се за автомобил и цена → създава се <b>Фактура</b>. Клиентът плаща през Stripe → фактурата става „paid“ и автоматично се генерира <b>Поръчка</b>. Върху поръчката се поставя <b>Пътна карта</b> (Roadmap) — списък със стъпки: купуване на търг, оформяне на документи, доставка, митница, предаване на ключове. Паралелно се създава <b>Договор</b>, който клиентът подписва онлайн. Когато автомобилът е по пътя, активира се <b>Delivery 360</b>: GPS, CMR, застраховка, ETA. Когато клиентът получи автомобила — цикълът е затворен.</p>
    <Callout tone="good" title="Защо да го помним">Когато нещо изглежда странно („фактурата изчезна“), извървете веригата. Най-често фактурата просто е минала в „paid“ и сега се вижда в Order, или клиентът все още не е направил действие, нужно за да продължи веригата напред.</Callout>
    <p>Всяко събитие, което придвижва веригата, се записва в <b>timeline-а</b> на клиентската карта. Timeline-ът е нашата „черна кутия“ за разбор на ситуации.</p>
  </Section>

  <Section id="m-dashboard" title="4. Табло (начален екран)">
    <p>Адрес: <Code>/admin</Code>. Първият екран след вход. Тук е „температурата на системата“ за днес: нови лийдове за денонощието, отворени сделки, просрочени задачи, обаждания без отговор. Това, което пулсира в червено — туда влизаме първо.</p>
    <p>Таблото се адаптира към ролята. Мениджърът вижда личните си числа, тимлийдът — числата на екипа, администраторът — цялата компания. Един URL, три различни табла отдолу.</p>
  </Section>

  <Section id="m-action" title="5. Action Center">
    <p>„Списък на това, което трябва да се направи точно сега“. За разлика от личните задачи, Action Center показва системно генерирани действия: „SLA на този лийд изтече“, „този клиент чака обаждане вече 3 дни“, „по тази сделка договорът е просрочен“.</p>
    <p>Тук попадат и Bulk Reassign кейсите — например когато мениджър отиде в отпуск и лийдовете му трябва да се преразпределят.</p>
    <Callout tone="info" title="Правило за деня">Ако не знаете откъде да започнете сутринта — започнете от Action Center. Това, което е най-горе, „гори“.</Callout>
  </Section>

  <Section id="m-executive" title="6. Executive Center">
    <p>Страница за тимлийда и администратора. Тук се обобщава картината на екипа: натовареност на всеки мениджър, SLA-перформанс, конверсии за последните 7 дни, къде „горещите“ лийдове са блокирали.</p>
    <p>Мениджърът не вижда този раздел — за него той просто не съществува в страничното меню. Executive Center е за ръководителя, който трябва <b>бързо да разбере кой се дави и на кого да помогне</b>.</p>
  </Section>

  <Section id="m-notif" title="7. Notification Center">
    <p>Всичко, което системата иска да ви каже, идва тук: нов лийд е назначен на вас, клиент е платил фактура, дойде webhook от Stripe, договор е подписан, SLA ескалация. Известията идват в реално време през WebSocket — без презареждане на страницата.</p>
    <p>Има две категории: <b>системни</b> (трябва да се прочетат — например пристигнало плащане) и <b>информационни</b> (могат да се игнорират). Червената значка на камбанката в горната лента е броят непрочетени системни.</p>
  </Section>

  <Section id="m-leads" title="8. CRM → Лийдове (Leads)">
    <p>Сърцето на фунията на продажбите. Лийд е човек, който е оставил контакт някъде: чрез форма на сайта, обаждане през Ringostat, импорт от каталога. Всички лийдове отиват в Lead Workspace — нашия канбан.</p>
    <p><b>Какво може да се прави с един лийд:</b></p>
    <Step n="1" title="Назначаване на мениджър">Обикновено от тимлийда или с правило за авторазпределение. Може да се преназначи по всяко време.</Step>
    <Step n="2" title="Обаждане / имейл / SMS">Обажданията се логват автоматично през Ringostat. Имейлите и SMS — през Resend и TextBelt.</Step>
    <Step n="3" title="Създаване на задача">„Обади се утре“, „изпрати оферта“ и т.н. Задачата е свързана с лийда.</Step>
    <Step n="4" title="Промяна на статус">Нов → Установен контакт → Квалифициран → Преговори → Готов → Конвертиран / Отказ.</Step>
    <Step n="5" title="Конверсия в клиент">Когато лийдът се съгласи да купува, натискаме „Convert“. Създава се запис в Customers, а лийдът остава в историята.</Step>
    <Callout tone="warn" title="SLA правило">Ако лийдът е „New“ и никой не отговори за 30 минути — известие лети към мениджъра. След 2 часа — ескалация към тимлийда. Това е стриктно контролирано от модула Lead SLA.</Callout>
    <p><b>Smart филтрите</b> в лявата лента са готови пресети: „Нужен контакт днес“, „Без контакт &gt; 7 дни“, „Горещ + без отворени задачи“, „Готови за конверсия“, „Заседнали в преговори“, „Без мениджър“, „Голям бюджет, активен“. Използвайте ги — по-бързо е, отколкото да настройвате филтри ръчно всеки път.</p>
  </Section>

  <Section id="m-customers" title="9. CRM → Клиенти (Customers)">
    <p>Когато лийдът стане клиент — той идва тук. Клиентът има <b>360° карта</b> (Customer360), където е събрано всичко: общ преглед, пътна карта, коментари на екипа, задачи, юридически документи, лийдове, оферти, сделки, фактури, поръчки, плащания, депозити, обаждания, договори, документи, timeline, продажби, срещи и история на промените.</p>
    <p>Когато клиентът се обади и попита „къде ми е колата?“ — отваряте картата, гледате Roadmap и Delivery 360 в един прозорец. Без превключване между табове.</p>
    <Callout tone="info" title="История на промените">В таба „История на промените“ системата автоматично записва всяко редактиране: кой е променил полето, каква е била стойността преди, каква е сега, кога. Това е резервна застраховка за екипа — нищо не „се губи“.</Callout>
  </Section>

  <Section id="m-sales" title="10. Продажби и срещи">
    <p><b>Продажби (Sales)</b> е отделен раздел за сделки, които реално са стигнали до договор и пари. По същество — финалната фаза на фунията. Тук се водят салда: колко е платил клиентът, колко му остава, в каква валута.</p>
    <p><b>Срещи (Meetings)</b> е календарът на екипа. Мениджърът планира лични или онлайн срещи с клиента, добавя линкове и напомняния. Клиентът вижда планираната среща в своя кабинет.</p>
  </Section>

  <Section id="m-portal" title="11. Клиентски портал">
    <p>Това е admin-погледът върху клиентския кабинет. Полезно, когато клиент се обади и каже „нищо не виждам“. Администраторът може да влезе и да провери с очите си.</p>
    <p>Самият клиентски кабинет е на <Code>/cabinet</Code>. Клиентът влиза с отделна парола и вижда само своите данни.</p>
    <Callout tone="danger" title="Сигурност — без компромиси">Клиент А <b>не може</b> технически да види данни на клиент Б, дори ръчно да въведе URL с чужд ID. Това е заключено на ниво бекенд (cross-tenant guard). Ако някога забележите обратното — това е инцидент по сигурността, докладвайте на администратора веднага.</Callout>
  </Section>

  <Section id="m-roadmaps" title="12. Пътни карти (Roadmaps)">
    <p>Пътна карта е стъпков план за изпълнение на поръчка. Когато клиентът плати фактура, системата автоматично създава Roadmap по <b>работен шаблон</b> (Workflow Template): внос от САЩ, внос от Корея, регистрация, адаптация, доставка, детейлинг.</p>
    <p>Всяка стъпка има статус (чака / в процес / завършена) и отговорник. Клиентът вижда стъпките в кабинета си в реално време — това премахва около 70% от обажданията „къде ми е колата?“.</p>
  </Section>

  <Section id="m-docs" title="13. Шаблони на документи и Файлов мениджър">
    <p>Всеки клиент има фиксирана структура от папки. Същите пет канонични папки за всички:</p>
    <table className="w-full text-[13px] my-2"><tbody>
      <Row k="Документи на клиента (customer_docs)" v="Паспорт, ЕГН/ЕНЧ, идентификационни данни." />
      <Row k="Документи на автомобила (vehicle_docs)" v="VIN документ, title, фактури за автомобила, регистрационни." />
      <Row k="Договори (contracts)" v="PDF договори, оригинали и подписани версии." />
      <Row k="Снимки на автомобила (vehicle_photos)" v="Фото-отчети от паркинга, търга, след митница." />
      <Row k="Друго (other)" v="Всичко, което не попада в горните категории." />
    </tbody></table>
    <p><b>Шаблоните на документи</b> са готови заготовки на договори, актове, пълномощни. Мениджърът избира шаблон → системата попълва данните на клиента → PDF-ът е готов за 5 секунди.</p>
  </Section>

  <Section id="m-contracts" title="14. Договори 360">
    <p>Модул за жизнения цикъл на договора. Договорът минава през ясни състояния: <b>Чернова → Изпратен на клиента → Подписан → Архив</b>.</p>
    <Step n="1" title="Генериране от шаблон">Натискаме „Генерирай договор“ в картата на клиента. Попълват се: имена, ЕГН, автомобил, VIN, цена.</Step>
    <Step n="2" title="Проверка и изпращане">Натискаме „Изпрати на клиента“. Системата генерира уникален линк за подписване и го изпраща чрез имейл + SMS.</Step>
    <Step n="3" title="Клиентът подписва онлайн">Отваря линка, чете договора, поставя отметка „Съгласен съм“, въвежда имената си, натиска „Подпиши“. Подписът се фиксира с timestamp и IP.</Step>
    <Step n="4" title="Архив">След приключване на сделката договорът отива в Архив. Остава достъпен завинаги — за одити и повторен преглед.</Step>
  </Section>

  <Section id="m-finance" title="15. Финанси (Finance 360 + Stripe)">
    <p>Модулът за пари. Работи със Stripe. Какво има тук:</p>
    <ul className="list-disc pl-5 space-y-1 my-2 text-[14px]">
      <li><b>Фактури:</b> създават се ръчно или се генерират автоматично от сделка.</li>
      <li><b>Stripe Checkout:</b> клиентът получава линк за плащане, плаща с карта (Apple Pay и Google Pay също се поддържат).</li>
      <li><b>Плащания:</b> всички Stripe транзакции — успешни, неуспешни, refund-и.</li>
      <li><b>Депозити:</b> частични плащания на старта, за да „заключим“ клиента.</li>
      <li><b>Outstanding:</b> кой колко дължи по коя фактура.</li>
    </ul>
    <Callout tone="info" title="Stripe конфигурация">Всички Stripe ключове са в <Code>/admin/integrations → Stripe</Code>. За смяна на sandbox ↔ live или подновяване на webhook secret — само оттам. Файлът .env пази стойностите по подразбиране в случай на пълно изтриване на БД.</Callout>
  </Section>

  <Section id="m-delivery" title="16. Доставка 360 (Delivery)">
    <p>Модулът за логистика. Когато автомобилът е купен на търг, започва доставка: от аукционния паркинг → в пристанище → морски контейнер → европейско пристанище → митница → клиент. Всички тези стъпки се записват тук.</p>
    <p>На всяка стъпка има <b>ETA</b>, <b>CMR</b>, информация за превозвача, фото-отчет от паркинга. Ако има GPS тракер на контейнера — позицията се обновява на всеки 60 секунди.</p>
  </Section>

  <Section id="m-operations" title="17. Операции 360">
    <p>„Страница за CEO“. Не е за всекидневна употреба от мениджъра. Тук са обобщени <b>тесните места</b> на компанията: къде екипът се дави в задачи, кои SLA постоянно се нарушават, колко сделки са блокирали, кои мениджъри са претоварени. По същество — термометър за екипа.</p>
  </Section>

  <Section id="m-forecasting" title="18. Прогнозиране 360">
    <p>Предсказуемост на бизнеса. Колко сделки вероятно ще затворим този месец? Колко пари ще постъпят? Кои лийдове имат най-висока вероятност за конверсия? Модулът не предсказва бъдещето — той подрежда вероятности на база историческите данни и текущата активност на лийдовете.</p>
  </Section>

  <Section id="m-calc" title="19. Калкулатор за внос">
    <p>Инструмент за мениджъра: въвежда VIN/лот или параметри на автомобила (година, марка, обем, тип гориво) и получава ориентировъчна себестойност с всички такси: аукционна такса, доставка от САЩ/Корея, морски транспорт, ДДС, акциз, експортни/импортни мита, услуга на BIBI Cars. Резултатът е офертата към клиента.</p>
    <p>Калкулаторът е синхронизиран с валутните курсове (USD/EUR/BGN) и митническите ставки. Ако ставките се променят — обновете ги в настройките, не редактирайте цифри ръчно в интерфейса.</p>
  </Section>

  <Section id="m-vin" title="20. VIN Engine и парсери">
    <p>VIN е 17-символен номер на шасито. Чрез него извличаме информация за автомобила: марка, модел, година, комплектация, аукционна история, фото-отчет, километраж, история на щети. Данните се теглят паралелно от шест източника: BitMotors, WestMotors, Poctra, CarsFromWest, AutoAuctionHistory, SalvageBid.</p>
    <p>Ако един източник не отговори — използва се следващият. Това е „multi-source resolver“-ът. Старата логика с Copart/BidCars вече не е активна.</p>
    <Callout tone="info" title="Бърза проверка">Страницата <Code>/admin/parser</Code> е ръчният тестер за VIN. Администраторът може да изчисти кеша за конкретен VIN, ако клиент каже „информацията не е вярна“.</Callout>
  </Section>

  <Section id="m-staff" title="21. Екип (Staff / Team Lead / Manager)">
    <p>Страницата <Code>/admin/staff</Code> е директория на екипа. Администраторът добавя нови мениджъри, задава роли (manager / team_lead / admin), вижда натовареност и статистика.</p>
    <p>Всеки служител има свой <b>Team Dashboard</b> (ако е тимлийд) или <b>My Workspace</b> (ако е мениджър) — лична страница със своите лийдове, задачи и KPI.</p>
  </Section>

  <Section id="flows" title="22. Бизнес процеси от край до край">
    <p>Основният процес — внос на автомобил от САЩ от А до Я:</p>
    <Step n="1" title="Запитване">Клиентът оставя заявка на сайта → автоматично се създава Лийд.</Step>
    <Step n="2" title="Първи контакт">SLA-таймерът тръгва. Мениджърът има 30 минути да отговори.</Step>
    <Step n="3" title="Квалификация">Бюджет, тип автомобил, срокове. Лийдът минава през Контакт → Квалифициран → Преговори.</Step>
    <Step n="4" title="Калкулатор">Мениджърът пресмята себестойност, добавя марж, подготвя офертата.</Step>
    <Step n="5" title="Конверсия в клиент">Клиентът казва „вземаме“. Създава се запис в Customers, генерират се каноничните папки.</Step>
    <Step n="6" title="Депозит">Депозитна фактура (обикновено $500–$1000). Клиентът плаща през Stripe.</Step>
    <Step n="7" title="Договор">Генерира се PDF от шаблон, изпраща се на клиента, той подписва онлайн.</Step>
    <Step n="8" title="Купуване на търг">Мениджърът наддава от името на клиента. Спечелено → създава се Order.</Step>
    <Step n="9" title="Пътна карта">Шаблонът се разгръща в клиентска пътна карта.</Step>
    <Step n="10" title="Доставка">Delivery 360 води автомобила от аукционния паркинг до митницата.</Step>
    <Step n="11" title="Предаване">Финалната фактура. Клиентът плаща. Подписваме акт за предаване.</Step>
    <Step n="12" title="Архив">Всички документи се архивират в картата на клиента. Статусът става „completed“.</Step>
  </Section>

  <Section id="sla" title="23. SLA, ескалации и контрол на качеството">
    <p>Lead SLA е автоматичният надзорник. По подразбиране (администраторът може да промени):</p>
    <table className="w-full text-[13px] my-2"><tbody>
      <Row k="Първи отговор" v="30 минути след създаване на лийда. Пропуснато → мениджърът получава известие." />
      <Row k="Ескалация" v="2 часа тишина → тимлийдът получава известие." />
      <Row k="Сканиране на БД" v="Веднъж на минута (worker lead_sla_worker)." />
    </tbody></table>
    <p>На страницата Leads има филтър-чип <b>SLA просрочено</b> — един клик за всички лийдове с червен таймер.</p>
  </Section>

  <Section id="auth" title="24. Сигурност, оторизация, одит">
    <p>Няколко защитни слоя:</p>
    <ul className="list-disc pl-5 space-y-1 my-2 text-[14px]">
      <li><b>JWT токени</b> за всеки API заявка. Без токен — 401.</li>
      <li><b>OTP за тимлийд</b>: при вход team_lead получава еднократен код на имейл.</li>
      <li><b>Cross-tenant guard</b> за клиентския кабинет (клиент А не може да достигне клиент Б).</li>
      <li><b>Manager scope</b>: мениджърите виждат само своите клиенти и лийдове, точка.</li>
      <li><b>Login audit</b>: всеки вход се записва (кой, кога, от кой IP).</li>
      <li><b>Change history</b>: всяко редактиране на поле се записва — кой, кога, преди, след.</li>
    </ul>
  </Section>

  <Section id="integrations" title="25. Интеграции (Stripe, Resend, SMS)">
    <p>Всички външни услуги се конфигурират на едно място: <Code>/admin/integrations</Code>.</p>
    <ul className="list-disc pl-5 space-y-1 my-2 text-[14px]">
      <li><b>Stripe</b> — плащания. Sandbox за тест, live за production.</li>
      <li><b>Resend</b> — модерен email API. Безплатен план: 3 000 писма/месец. Домейнът на изпращача трябва да е верифициран със SPF + DKIM + DMARC.</li>
      <li><b>SMTP</b> — резервен email канал през произволен SMTP сървър.</li>
      <li><b>TextBelt</b> — SMS, по подразбиране в безплатен режим.</li>
      <li><b>Ringostat</b> — телефония. Обажданията се логват автоматично.</li>
    </ul>
  </Section>

  <Section id="i18n" title="26. Езици на интерфейса (UK / EN / BG)">
    <p>Системата говори на три езика: украински, английски, български. Превключвателят е горе вдясно. Превключването е моментално, без презареждане. Заглавия, филтри, бутони, дори backend-driven smart филтрите — всичко преминава на избрания език.</p>
    <Callout tone="info" title="Някои термини остават на английски умишлено">CRM, ROI, SLA, ETA, Ringostat — международни съкращения и марки, които се пишат еднакво навсякъде.</Callout>
  </Section>

  <Section id="firstday" title="27. Първи ден в екипа">
    <p>Какво да направите в първия ден, по ред:</p>
    <Step n="1" title="Получаване на достъп">Администраторът създава акаунта ви в /admin/staff и задава ролята. Получавате имейл с данни за вход.</Step>
    <Step n="2" title="Вход и смяна на парола">Отворете /admin/login, влезте, веднага сменете паролата в профила.</Step>
    <Step n="3" title="Прочетете това ръководство">Да — сега. Нормално е да не запомните всичко от първи път. Ръководството остава тук, връщайте се при нужда.</Step>
    <Step n="4" title="Отворете Таблото">Усетете какво се случва в системата в момента.</Step>
    <Step n="5" title="Идете в Leads → Lead Workspace">Погледнете „своя канбан“. Ако е празен, тимлийдът още не ви е назначил лийдове — питайте.</Step>
    <Step n="6" title="Отворете една Customer360 карта">Изберете произволен клиент и преминете през всички табове. Уверете се, че CRM има всичко, от което имате нужда.</Step>
    <Step n="7" title="Първите реални обаждания">Първите 2–3 обаждания правете с тимлийда наблизо. Обажданията се записват автоматично.</Step>
    <Step n="8" title="Край на деня">Погледнете Action Center — там системата ще покаже какво остава за утре.</Step>
  </Section>

  <Section id="faq" title="28. Често задавани въпроси">
    <p><b>В:</b> Не виждам лийд, който видях вчера. Къде е?</p>
    <p><b>О:</b> Най-вероятно е преназначен на друг мениджър или му е сменен статусът (например на „Отказ“). Опитайте филтъра „Всички статуси“. Ако пак го няма — питайте тимлийда.</p>
    <p className="pt-3"><b>В:</b> Stripe не приема тестовата карта.</p>
    <p><b>О:</b> Проверете дали сте на sandbox ключове (admin → Integrations → Stripe → mode = sandbox). За тест използвайте <Code>4242 4242 4242 4242</Code> с произволна бъдеща дата и произволен CVC.</p>
    <p className="pt-3"><b>В:</b> Клиентът казва, че не получава имейлите ни.</p>
    <p><b>О:</b> (1) Проверете дали Resend е конфигуриран и домейнът верифициран (Integrations → Resend → Domains). (2) Отворете Email Outbox — писмото може да е в статус „dry_run“, което значи че няма конфигуриран канал. (3) Проверете дали имейлът на клиента не е в спам и е изписан правилно.</p>
    <p className="pt-3"><b>В:</b> Мога ли да накарам целия екип да работи на един език?</p>
    <p><b>О:</b> Не — всеки сам си избира своя език. Екипът избира какво му е удобно.</p>
    <p className="pt-3"><b>В:</b> Направих грешка в клиентската карта и не помня каква беше предишната стойност.</p>
    <p><b>О:</b> Отворете Customer360 → таб „История на промените“. Всяко редактиране е записано (кой, кога, поле, преди, след). Можете да върнете ръчно.</p>
    <p className="pt-3"><b>В:</b> Може ли мениджър да редактира Manager Instructions?</p>
    <p><b>О:</b> Само за четене за мениджъра. Само администраторът редактира. Ако трябва да се сменят правилата на екипа — пишете на администратора.</p>
    <Callout tone="good" title="Не намерихте въпроса си?">Питайте тимлийда или администратора. Това ръководство е живо — допълваме го, когато се появяват нови ситуации.</Callout>
    <div className="pt-4 mt-6 border-t border-[#F4F4F5] text-[12px] text-[#71717A]">
      <p>BIBI Cars CRM · вътрешен документ · българско издание.</p>
    </div>
  </Section>
</>); }
