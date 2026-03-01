"use client";

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";

export type Lang = "ru" | "en";

const translations = {
  // Navigation
  "nav.title": { ru: "Трекер Галлюцинаций", en: "Hallucinations Tracker" },
  "nav.source": { ru: "Источник", en: "Source" },

  // Hero
  "hero.snapshot": { ru: "Снимок базы данных: 1 марта 2026", en: "Database snapshot: March 1, 2026" },
  "hero.title1": { ru: "ИИ-галлюцинации", en: "AI Hallucinations" },
  "hero.title2": { ru: "в суде", en: "in Court" },
  "hero.description": {
    ru: "Отслеживание всех задокументированных случаев, когда сгенерированные ИИ фабрикации — поддельные цитаты, несуществующие дела и искажённые выводы — были обнаружены в судебных процессах по всему миру.",
    en: "Tracking every documented case where AI-generated fabrications — fake citations, phantom cases, and misrepresented holdings — have been identified in legal proceedings worldwide.",
  },
  "hero.cta": { ru: "Оригинальное исследование Damien Charlotin", en: "Original Research by Damien Charlotin" },
  "hero.credit": {
    ru: "Все данные получены из",
    en: "All data sourced from",
  },
  "hero.credit2": {
    ru: ". Эта визуализация — независимый проект, основанный на его тщательном исследовании.",
    en: ". This visualization is an independent project crediting his meticulous research.",
  },

  // Stats
  "stat.totalCases": { ru: "Всего дел", en: "Total Cases" },
  "stat.hallucinations": { ru: "Обнаружено галлюцинаций", en: "Hallucinations Found" },
  "stat.penalties": { ru: "Денежные штрафы", en: "Monetary Penalties" },
  "stat.sanctions": { ru: "Профессиональные санкции", en: "Professional Sanctions" },

  // Tabs
  "tab.timeline": { ru: "Хронология", en: "Timeline" },
  "tab.geography": { ru: "География", en: "Geography" },
  "tab.tools": { ru: "ИИ-инструменты", en: "AI Tools" },
  "tab.outcomes": { ru: "Решения", en: "Outcomes" },
  "tab.penalties": { ru: "Штрафы", en: "Penalties" },

  // Timeline charts
  "chart.cumulativeGrowth": { ru: "Кумулятивный рост дел", en: "Cumulative Case Growth" },
  "chart.cumulativeGrowth.sub": { ru: "Экспоненциальное ускорение с 2024 года", en: "Exponential acceleration since 2024" },
  "chart.monthlyCases": { ru: "Новые дела по месяцам", en: "Monthly New Cases" },
  "chart.monthlyCases.sub": { ru: "Выявленные подачи по месяцам", en: "Filings identified per month" },
  "chart.yoyGrowth": { ru: "Рост по годам", en: "Year-over-Year Growth" },
  "chart.yoyGrowth.sub": { ru: "Данные 2026 — только янв-фев", en: "2026 data covers Jan-Feb only" },

  // Geography charts
  "chart.jurisdiction": { ru: "Дела по юрисдикциям", en: "Cases by Jurisdiction" },
  "chart.jurisdiction.sub": { ru: "Топ-15 юрисдикций по количеству дел", en: "Top 15 jurisdictions by case count" },
  "chart.topJurisdictions": { ru: "Ведущие юрисдикции", en: "Top Jurisdictions" },
  "chart.topJurisdictions.sub": { ru: "Количество выявленных дел по странам", en: "Number of identified cases per country" },

  // AI Tools charts
  "chart.aiTools": { ru: "Задействованные ИИ-инструменты", en: "AI Tools Involved" },
  "chart.aiTools.sub": { ru: "Выявленные или предполагаемые ИИ-инструменты", en: "Identified or implied AI tools" },
  "chart.hallTypes": { ru: "Типы галлюцинаций", en: "Hallucination Types" },
  "chart.hallTypes.sub": { ru: "Классификация сфабрикованного контента", en: "Classification of fabricated content" },
  "chart.whoFiled": { ru: "Кто подал ИИ-контент?", en: "Who Filed the AI-Generated Content?" },
  "chart.whoFiled.sub": { ru: "Сторона, ответственная за подачу с галлюцинациями", en: "Party responsible for the hallucinated submission" },

  // Outcomes charts
  "chart.courtOutcomes": { ru: "Решения судов", en: "Court Outcomes" },
  "chart.courtOutcomes.sub": { ru: "Как суды реагировали на ИИ-галлюцинации", en: "How courts responded to AI hallucinations" },
  "chart.sanctionsBreakdown": { ru: "Разбивка санкций", en: "Sanctions Breakdown" },
  "chart.withPenalties": { ru: "Дела с денежными штрафами", en: "Cases with monetary penalties" },
  "chart.withSanctions": { ru: "Дела с профессиональными санкциями", en: "Cases with professional sanctions" },
  "chart.warningsOnly": { ru: "Только предупреждения (без штрафа)", en: "Warnings only (no monetary penalty)" },
  "chart.keyFindings": { ru: "Ключевые выводы", en: "Key Findings" },

  // Key Findings content (use {0}, {1} etc. for interpolation)
  "finding.1": {
    ru: "дел уже в 2026 (янв-фев), на пути к превышению показателей 2025",
    en: "cases already in 2026 (Jan-Feb), on track to surpass 2025",
  },
  "finding.2": {
    ru: "— самый распространённый тип ({0} случаев)",
    en: "are the most common type ({0} instances)",
  },
  "finding.2.label": { ru: "Сфабрикованные ссылки", en: "Fabricated citations" },
  "finding.3": {
    ru: "Самопредставляющиеся стороны — {0} дел ({1}%)",
    en: "Pro se litigants account for {0} cases ({1}%)",
  },
  "finding.4": {
    ru: "США лидируют с {0} делами, затем Канада и Австралия",
    en: "USA dominates with {0} cases, followed by Canada and Australia",
  },

  // Penalties tab
  "penalties.totalFines": { ru: "Общая сумма штрафов", en: "Total Fines Imposed" },
  "penalties.average": { ru: "Среднее", en: "Average" },
  "penalties.median": { ru: "Медиана", en: "Median" },
  "penalties.min": { ru: "Мин", en: "Min" },
  "penalties.max": { ru: "Макс", en: "Max" },
  "penalties.distribution": { ru: "Распределение штрафов", en: "Penalty Distribution" },
  "penalties.distribution.sub": { ru: "Количество дел по диапазону штрафа", en: "Number of cases by penalty amount range" },
  "penalties.byYear": { ru: "Штрафы по годам", en: "Total Penalties by Year" },
  "penalties.byYear.sub": { ru: "Годовые суммы наложенных штрафов", en: "Annual total monetary penalties imposed" },
  "penalties.top15": { ru: "Топ-15 крупнейших штрафов", en: "Top 15 Largest Penalties" },
  "penalties.top15.sub": { ru: "Дела с наибольшими денежными санкциями", en: "Cases with the highest monetary sanctions" },

  // Table
  "table.recentCases": { ru: "Последние дела", en: "Most Recent Cases" },
  "table.recentCases.sub": { ru: "Последние задокументированные инциденты с ИИ-галлюцинациями в суде", en: "Latest documented AI hallucination incidents in court" },
  "table.date": { ru: "Дата", en: "Date" },
  "table.case": { ru: "Дело", en: "Case" },
  "table.country": { ru: "Страна", en: "Country" },
  "table.party": { ru: "Сторона", en: "Party" },
  "table.aiTool": { ru: "ИИ", en: "AI Tool" },
  "table.hallucinations": { ru: "Галлюцинации", en: "Hallucinations" },
  "table.outcome": { ru: "Решение", en: "Outcome" },

  // Top cases
  "topCases.title": { ru: "Топ дел по количеству галлюцинаций", en: "Top Cases by Hallucination Count" },
  "topCases.sub": { ru: "Дела с наибольшим числом сфабрикованных или искажённых элементов", en: "Cases with the most fabricated or misrepresented items" },

  // Tooltip names
  "tooltip.totalCases": { ru: "Всего дел", en: "Total Cases" },
  "tooltip.newCases": { ru: "Новые дела", en: "New Cases" },
  "tooltip.cases": { ru: "Дела", en: "Cases" },
  "tooltip.total": { ru: "Итого ($)", en: "Total ($)" },

  // Footer
  "footer.description": {
    ru: "Интерактивная визуализация ИИ-галлюцинаций, задокументированных в судебных процессах по всему миру. Это общественный проект, предоставляющий визуальную аналитику на основе тщательно собранных исследовательских данных.",
    en: "An interactive visualization of AI-generated hallucinations documented in legal proceedings around the world. This is a community project providing visual analytics on top of rigorously collected research data.",
  },
  "footer.credits": { ru: "Источник данных и благодарности", en: "Data Source & Credits" },
  "footer.creditsText": {
    ru: "Все данные получены из выдающегося исследования",
    en: "All data sourced from the extraordinary research of",
  },
  "footer.creditsText2": {
    ru: ", который тщательно отслеживает и документирует каждый известный случай ИИ-галлюцинаций в судебных процессах по всему миру.",
    en: ", who meticulously tracks and documents every known case of AI hallucinations appearing in court proceedings globally.",
  },
  "footer.snapshot": { ru: "Снимок базы данных: 1 марта 2026", en: "Database snapshot: March 1, 2026" },
  "footer.casesDocumented": { ru: "задокументировано дел", en: "cases documented" },
  "footer.visitSite": { ru: "Посетить damiencharlotin.com/hallucinations", en: "Visit damiencharlotin.com/hallucinations" },
  "footer.disclaimer": {
    ru: "Эта визуализация предоставлена исключительно в информационных целях. Не является юридической консультацией.",
    en: "This visualization is provided for informational purposes only. Not legal advice.",
  },
} as const;

export type TranslationKey = keyof typeof translations;

interface I18nContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: TranslationKey) => string;
}

const I18nContext = createContext<I18nContextType>({
  lang: "ru",
  setLang: () => {},
  t: (key) => key,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("ru");

  useEffect(() => {
    const stored = localStorage.getItem("lang") as Lang | null;
    if (stored === "en" || stored === "ru") {
      setLangState(stored);
    }
  }, []);

  const setLang = useCallback((newLang: Lang) => {
    setLangState(newLang);
    localStorage.setItem("lang", newLang);
  }, []);

  const t = useCallback(
    (key: TranslationKey): string => {
      const entry = translations[key];
      if (!entry) return key;
      return entry[lang] || entry["en"] || key;
    },
    [lang]
  );

  return (
    <I18nContext value={{ lang, setLang, t }}>
      {children}
    </I18nContext>
  );
}

export function useTranslation() {
  return useContext(I18nContext);
}
