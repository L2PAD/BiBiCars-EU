/**
 * CabinetRoadmap — Sprint 3.5 (premium redesign)
 * ----------------------------------------------
 * Customer-facing READ-ONLY view of the vehicle journey roadmap.
 * Routed under /cabinet/:customerId/roadmap.
 *
 * Renders each roadmap through the premium <CabinetJourney/> timeline
 * (dark-theme native). The legacy horizontal RoadmapStepper stays in
 * use by the back-office (Customer360) and is intentionally untouched.
 */
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Car } from '@phosphor-icons/react';
import CabinetJourney from './CabinetJourney';
import { useLang } from '../../i18n';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

const COPY = {
  title: { en: 'My Vehicle Journey', ru: 'Путь моего автомобиля', bg: 'Път на моя автомобил', uk: 'Шлях мого автомобіля' },
  subtitle: {
    en: 'Track your order progress live — from auction to handing over the keys.',
    ru: 'Следите за прогрессом вашего заказа в реальном времени — от аукциона до передачи ключей.',
    bg: 'Следвайте прогреса на вашата поръчка на живо — от търга до предаването на ключовете.',
    uk: 'Стежте за прогресом вашого замовлення в реальному часі — від аукціону до передачі ключів.',
  },
  empty: {
    en: "You don't have an active roadmap yet. A new one is created once you pay your first invoice.",
    ru: 'У вас пока нет активной дорожной карты. Она создаётся после оплаты первого счёта.',
    bg: 'Още нямате активна пътна карта. Нова ще се създаде, след като платите първата си фактура.',
    uk: 'У вас ще немає активної дорожньої карти. Нова створюється після оплати першого рахунку.',
  },
};
const pick = (m, lang) => m[lang] || m.en;

const CabinetRoadmap = () => {
  const { customerId } = useParams();
  const { lang } = useLang();
  const [items, setItems] = useState([]);
  const [stageTemplate, setStageTemplate] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await axios.get(`${API_URL}/api/customer-cabinet/${customerId}/roadmaps`);
        if (!cancelled) {
          setItems(res.data?.items || []);
          setStageTemplate(res.data?.stage_template || []);
        }
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [customerId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40" data-testid="cabinet-roadmap-loading">
        <div className="animate-spin w-8 h-8 border-2 border-[#FEAE00] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="cabinet-roadmap-page">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-100">{pick(COPY.title, lang)}</h1>
        <p className="text-sm text-zinc-400 mt-1">{pick(COPY.subtitle, lang)}</p>
      </header>

      {items.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#17171A] border border-[#27272A] rounded-2xl text-center py-16 px-6"
          data-testid="cabinet-roadmap-empty"
        >
          <div className="w-16 h-16 rounded-2xl bg-[#222227] border border-[#34343A] flex items-center justify-center mx-auto mb-4">
            <Car size={32} weight="duotone" className="text-zinc-500" />
          </div>
          <p className="text-zinc-400 max-w-md mx-auto">{pick(COPY.empty, lang)}</p>
        </motion.div>
      )}

      {items.map((rm) => (
        <CabinetJourney key={rm.id} roadmap={rm} stageTemplate={stageTemplate} lang={lang} />
      ))}
    </div>
  );
};

export default CabinetRoadmap;
