"use client";

import { useState, useEffect, useRef, useSyncExternalStore } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Treemap,
} from "recharts";
import data from "@/lib/data.json";
import { LanguageProvider, useTranslation } from "@/lib/i18n";

// Color palette
const COLORS = {
  blue: "#3b82f6",
  cyan: "#06b6d4",
  amber: "#f59e0b",
  red: "#ef4444",
  emerald: "#10b981",
  purple: "#8b5cf6",
  rose: "#f43f5e",
  slate: "#64748b",
};

const PIE_COLORS = [COLORS.blue, COLORS.cyan, COLORS.amber, COLORS.emerald, COLORS.purple, COLORS.rose, COLORS.red, COLORS.slate, "#818cf8", "#fb923c"];

// Animated counter hook
function useCounter(target: number, duration = 2000) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    const startTime = Date.now();
    const tick = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [inView, target, duration]);

  return { count, ref };
}

// Client-only wrapper to avoid Recharts SSR measurement warnings
const emptySubscribe = () => () => {};
function ClientOnly({ children, fallbackHeight = "h-80" }: { children: React.ReactNode; fallbackHeight?: string }) {
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);
  if (!mounted) return <div className={`${fallbackHeight} bg-[#111827]/50 rounded-lg animate-pulse`} />;
  return <>{children}</>;
}

// Section wrapper with scroll animation
function Section({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });
  return (
    <motion.section
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={className}
    >
      {children}
    </motion.section>
  );
}

// Stat card
function StatCard({ label, value, suffix = "", icon, color, delay = 0 }: {
  label: string; value: number; suffix?: string; icon: string; color: string; delay?: number;
}) {
  const { count, ref } = useCounter(value);
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.9 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      className="glow-card p-6 relative overflow-hidden group"
    >
      <div className="absolute top-0 right-0 w-24 h-24 opacity-5 group-hover:opacity-10 transition-opacity text-6xl flex items-center justify-center" style={{ color }}>
        {icon}
      </div>
      <p className="text-sm text-slate-400 mb-1 uppercase tracking-wider">{label}</p>
      <p className="text-4xl font-bold tabular-nums" style={{ color }}>
        {count.toLocaleString()}{suffix}
      </p>
    </motion.div>
  );
}

// Custom tooltip
function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number | string; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#111827] border border-[#1e293b] rounded-lg px-4 py-3 shadow-xl">
      <p className="text-slate-400 text-sm mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-sm font-medium" style={{ color: p.color }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toLocaleString() : p.value}
        </p>
      ))}
    </div>
  );
}

// Treemap custom content
function TreemapContent(props: { x?: number; y?: number; width?: number; height?: number; name?: string; count?: number; index?: number }) {
  const { x = 0, y = 0, width = 0, height = 0, name, count, index = 0 } = props;
  if (width < 50 || height < 30) return null;
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} rx={4}
        fill={PIE_COLORS[index % PIE_COLORS.length]} fillOpacity={0.85}
        stroke="#0a0e1a" strokeWidth={2} />
      <text x={x + width / 2} y={y + height / 2 - 8} textAnchor="middle" fill="#fff" fontSize={width < 100 ? 10 : 13} fontWeight="600">
        {name}
      </text>
      <text x={x + width / 2} y={y + height / 2 + 10} textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize={width < 100 ? 9 : 11}>
        {count}
      </text>
    </g>
  );
}

// Language switcher component
function LangSwitch() {
  const { lang, setLang } = useTranslation();
  return (
    <div className="flex items-center bg-[#1e293b] rounded-full p-0.5">
      {(["ru", "en"] as const).map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
            lang === l
              ? "bg-blue-600 text-white shadow"
              : "text-slate-400 hover:text-white"
          }`}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

function Dashboard() {
  const { t, td } = useTranslation();
  const [activeTab, setActiveTab] = useState<"timeline" | "geography" | "tools" | "outcomes" | "penalties">("timeline");

  // Prepare treemap data for countries
  const treemapData = data.byCountry.slice(0, 15).map((c, i) => ({
    name: td(c.country),
    size: c.count,
    count: c.count,
    index: i,
  }));

  // Hallucination types for donut
  const hallTypeData = data.byHallType.map((h) => ({
    name: td(h.type),
    value: h.count,
  }));

  const tabKeys = ["timeline", "geography", "tools", "outcomes", "penalties"] as const;
  const tabLabels: Record<typeof tabKeys[number], string> = {
    timeline: t("tab.timeline"),
    geography: t("tab.geography"),
    tools: t("tab.tools"),
    outcomes: t("tab.outcomes"),
    penalties: t("tab.penalties"),
  };

  return (
    <div className="min-h-screen hero-gradient grid-bg">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-[#0a0e1a]/80 backdrop-blur-xl border-b border-[#1e293b]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-sm">
              AI
            </div>
            <span className="font-semibold text-lg hidden sm:block">{t("nav.title")}</span>
          </div>
          <div className="flex items-center gap-4">
            <LangSwitch />
            <a
              href="https://www.damiencharlotin.com/hallucinations/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
              {t("nav.source")}
            </a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <header className="pt-28 pb-16 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="flex items-center gap-2 mb-6">
              <span className="pulse-dot inline-block w-2 h-2 rounded-full bg-red-500"></span>
              <span className="text-sm text-slate-400">{t("hero.snapshot")}</span>
            </div>
            <h1 className="text-5xl sm:text-7xl font-bold tracking-tight mb-6">
              <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
                {t("hero.title1")}
              </span>
              <br />
              <span className="text-slate-200">{t("hero.title2")}</span>
            </h1>
            <p className="text-xl text-slate-400 max-w-2xl mb-8 leading-relaxed">
              {t("hero.description")}
            </p>
            <div className="flex flex-wrap items-center gap-4 mb-6">
              <a
                href="https://www.damiencharlotin.com/hallucinations/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-medium transition-all hover:shadow-lg hover:shadow-blue-500/25"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                {t("hero.cta")}
              </a>
            </div>
            <p className="text-sm text-slate-500">
              {t("hero.credit")}{" "}
              <a href="https://www.damiencharlotin.com/hallucinations/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline underline-offset-2">
                damiencharlotin.com/hallucinations
              </a>
              {t("hero.credit2")}
            </p>
          </motion.div>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="max-w-7xl mx-auto px-6 pb-16">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label={t("stat.totalCases")} value={data.totalCases} icon={"\u2696"} color={COLORS.blue} delay={0} />
          <StatCard label={t("stat.hallucinations")} value={data.totalHallucinations} icon={"\u26A0"} color={COLORS.amber} delay={0.1} />
          <StatCard label={t("stat.penalties")} value={data.totalPenalties} icon="$" color={COLORS.emerald} delay={0.2} />
          <StatCard label={t("stat.sanctions")} value={data.totalSanctions} icon={"\u26A0"} color={COLORS.red} delay={0.3} />
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="max-w-7xl mx-auto px-6 pb-8">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {tabKeys.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-500/25"
                  : "bg-[#111827] text-slate-400 hover:text-white border border-[#1e293b] hover:border-blue-500/30"
              }`}
            >
              {tabLabels[tab]}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Sections */}
      <div className="max-w-7xl mx-auto px-6 pb-16">
        <AnimatePresence mode="wait">
          {activeTab === "timeline" && (
            <motion.div key="timeline" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.3 }}>
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Cumulative Growth */}
                <div className="glow-card p-6">
                  <h3 className="text-lg font-semibold mb-1">{t("chart.cumulativeGrowth")}</h3>
                  <p className="text-sm text-slate-500 mb-4">{t("chart.cumulativeGrowth.sub")}</p>
                  <div className="h-80">
                    <ClientOnly><ResponsiveContainer>
                      <AreaChart data={data.timeline}>
                        <defs>
                          <linearGradient id="gradBlue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={COLORS.blue} stopOpacity={0.4} />
                            <stop offset="95%" stopColor={COLORS.blue} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="month" stroke="#475569" tick={{ fontSize: 11 }}
                          tickFormatter={(v) => { const [y,m] = v.split('-'); return `${m}/${y.slice(2)}`; }} />
                        <YAxis stroke="#475569" tick={{ fontSize: 11 }} />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(59, 130, 246, 0.08)' }} />
                        <Area type="monotone" dataKey="cumulative" stroke={COLORS.blue} fill="url(#gradBlue)" strokeWidth={2} name={t("tooltip.totalCases")} />
                      </AreaChart>
                    </ResponsiveContainer></ClientOnly>
                  </div>
                </div>

                {/* Monthly Cases */}
                <div className="glow-card p-6">
                  <h3 className="text-lg font-semibold mb-1">{t("chart.monthlyCases")}</h3>
                  <p className="text-sm text-slate-500 mb-4">{t("chart.monthlyCases.sub")}</p>
                  <div className="h-80">
                    <ClientOnly><ResponsiveContainer>
                      <BarChart data={data.timeline}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="month" stroke="#475569" tick={{ fontSize: 11 }}
                          tickFormatter={(v) => { const [y,m] = v.split('-'); return `${m}/${y.slice(2)}`; }} />
                        <YAxis stroke="#475569" tick={{ fontSize: 11 }} />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(59, 130, 246, 0.08)' }} />
                        <Bar dataKey="count" fill={COLORS.cyan} radius={[4, 4, 0, 0]} name={t("tooltip.newCases")} />
                      </BarChart>
                    </ResponsiveContainer></ClientOnly>
                  </div>
                </div>

                {/* Year-over-Year */}
                <div className="glow-card p-6 lg:col-span-2">
                  <h3 className="text-lg font-semibold mb-1">{t("chart.yoyGrowth")}</h3>
                  <p className="text-sm text-slate-500 mb-4">{t("chart.yoyGrowth.sub")}</p>
                  <div className="h-64">
                    <ClientOnly fallbackHeight="h-64"><ResponsiveContainer>
                      <BarChart data={data.byYear} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis type="number" stroke="#475569" tick={{ fontSize: 11 }} />
                        <YAxis type="category" dataKey="year" stroke="#475569" tick={{ fontSize: 13 }} width={50} />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(59, 130, 246, 0.08)' }} />
                        <Bar dataKey="count" radius={[0, 4, 4, 0]} name={t("tooltip.cases")}>
                          {data.byYear.map((_, i) => (
                            <Cell key={i} fill={[COLORS.slate, COLORS.purple, COLORS.blue, COLORS.cyan][i]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer></ClientOnly>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "geography" && (
            <motion.div key="geography" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.3 }}>
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Country Treemap */}
                <div className="glow-card p-6 lg:col-span-2">
                  <h3 className="text-lg font-semibold mb-1">{t("chart.jurisdiction")}</h3>
                  <p className="text-sm text-slate-500 mb-4">{t("chart.jurisdiction.sub")}</p>
                  <div className="h-96">
                    <ClientOnly fallbackHeight="h-96"><ResponsiveContainer>
                      <Treemap
                        data={treemapData}
                        dataKey="size"
                        aspectRatio={4 / 3}
                        content={<TreemapContent />}
                      />
                    </ResponsiveContainer></ClientOnly>
                  </div>
                </div>

                {/* Country bar chart */}
                <div className="glow-card p-6 lg:col-span-2">
                  <h3 className="text-lg font-semibold mb-1">{t("chart.topJurisdictions")}</h3>
                  <p className="text-sm text-slate-500 mb-4">{t("chart.topJurisdictions.sub")}</p>
                  <div className="h-80">
                    <ClientOnly><ResponsiveContainer>
                      <BarChart data={data.byCountry.slice(0, 12).map(c => ({ ...c, countryLabel: td(c.country) }))} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis type="number" stroke="#475569" tick={{ fontSize: 11 }} />
                        <YAxis type="category" dataKey="countryLabel" stroke="#475569" tick={{ fontSize: 12 }} width={140} />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(59, 130, 246, 0.08)' }} />
                        <Bar dataKey="count" fill={COLORS.blue} radius={[0, 4, 4, 0]} name={t("tooltip.cases")}>
                          {data.byCountry.slice(0, 12).map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer></ClientOnly>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "tools" && (
            <motion.div key="tools" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.3 }}>
              <div className="grid lg:grid-cols-2 gap-6">
                {/* AI Tools Pie */}
                <div className="glow-card p-6">
                  <h3 className="text-lg font-semibold mb-1">{t("chart.aiTools")}</h3>
                  <p className="text-sm text-slate-500 mb-4">{t("chart.aiTools.sub")}</p>
                  <div className="h-80">
                    <ClientOnly><ResponsiveContainer>
                      <PieChart>
                        <Pie data={data.byAiTool.map(item => ({ ...item, toolLabel: td(item.tool) }))} dataKey="count" nameKey="toolLabel" cx="50%" cy="50%"
                          outerRadius={120} innerRadius={60} paddingAngle={2} strokeWidth={0}>
                          {data.byAiTool.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} cursor={false} />
                      </PieChart>
                    </ResponsiveContainer></ClientOnly>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-4">
                    {data.byAiTool.map((item, i) => (
                      <span key={i} className="inline-flex items-center gap-1.5 text-xs text-slate-300 bg-[#1e293b] rounded-full px-3 py-1">
                        <span className="w-2 h-2 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}></span>
                        {td(item.tool)} ({item.count})
                      </span>
                    ))}
                  </div>
                </div>

                {/* Hallucination Types */}
                <div className="glow-card p-6">
                  <h3 className="text-lg font-semibold mb-1">{t("chart.hallTypes")}</h3>
                  <p className="text-sm text-slate-500 mb-4">{t("chart.hallTypes.sub")}</p>
                  <div className="h-80">
                    <ClientOnly><ResponsiveContainer>
                      <PieChart>
                        <Pie data={hallTypeData} dataKey="value" nameKey="name" cx="50%" cy="50%"
                          outerRadius={120} innerRadius={60} paddingAngle={3} strokeWidth={0}>
                          {hallTypeData.map((_, i) => (
                            <Cell key={i} fill={[COLORS.red, COLORS.amber, COLORS.purple, COLORS.cyan, COLORS.slate][i]} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} cursor={false} />
                      </PieChart>
                    </ResponsiveContainer></ClientOnly>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-4">
                    {hallTypeData.map((h, i) => (
                      <span key={i} className="inline-flex items-center gap-1.5 text-xs text-slate-300 bg-[#1e293b] rounded-full px-3 py-1">
                        <span className="w-2 h-2 rounded-full" style={{ background: [COLORS.red, COLORS.amber, COLORS.purple, COLORS.cyan, COLORS.slate][i] }}></span>
                        {h.name} ({h.value.toLocaleString()})
                      </span>
                    ))}
                  </div>
                </div>

                {/* Party Types */}
                <div className="glow-card p-6 lg:col-span-2">
                  <h3 className="text-lg font-semibold mb-1">{t("chart.whoFiled")}</h3>
                  <p className="text-sm text-slate-500 mb-4">{t("chart.whoFiled.sub")}</p>
                  <div className="h-64">
                    <ClientOnly fallbackHeight="h-64"><ResponsiveContainer>
                      <BarChart data={data.byParty.slice(0, 6).map(p => ({ ...p, partyLabel: td(p.party) }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="partyLabel" stroke="#475569" tick={{ fontSize: 12 }} />
                        <YAxis stroke="#475569" tick={{ fontSize: 11 }} />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(59, 130, 246, 0.08)' }} />
                        <Bar dataKey="count" radius={[4, 4, 0, 0]} name={t("tooltip.cases")}>
                          {data.byParty.slice(0, 6).map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer></ClientOnly>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "outcomes" && (
            <motion.div key="outcomes" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.3 }}>
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Outcome Categories */}
                <div className="glow-card p-6 lg:col-span-2">
                  <h3 className="text-lg font-semibold mb-1">{t("chart.courtOutcomes")}</h3>
                  <p className="text-sm text-slate-500 mb-4">{t("chart.courtOutcomes.sub")}</p>
                  <div className="h-96">
                    <ClientOnly fallbackHeight="h-96"><ResponsiveContainer>
                      <BarChart data={data.byOutcome.map(o => ({ ...o, outcomeLabel: td(o.outcome) }))} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis type="number" stroke="#475569" tick={{ fontSize: 11 }} />
                        <YAxis type="category" dataKey="outcomeLabel" stroke="#475569" tick={{ fontSize: 12 }} width={220} />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(59, 130, 246, 0.08)' }} />
                        <Bar dataKey="count" radius={[0, 4, 4, 0]} name={t("tooltip.cases")}>
                          {data.byOutcome.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer></ClientOnly>
                  </div>
                </div>

                {/* Sanctions / penalties breakdown */}
                <div className="glow-card p-6">
                  <h3 className="text-lg font-semibold mb-4">{t("chart.sanctionsBreakdown")}</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-400">{t("chart.withPenalties")}</span>
                        <span className="text-emerald-400 font-medium">{data.totalPenalties}</span>
                      </div>
                      <div className="h-2 bg-[#1e293b] rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          whileInView={{ width: `${(data.totalPenalties / data.totalCases) * 100}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 1, delay: 0.2 }}
                          className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full"
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-400">{t("chart.withSanctions")}</span>
                        <span className="text-red-400 font-medium">{data.totalSanctions}</span>
                      </div>
                      <div className="h-2 bg-[#1e293b] rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          whileInView={{ width: `${(data.totalSanctions / data.totalCases) * 100}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 1, delay: 0.3 }}
                          className="h-full bg-gradient-to-r from-red-500 to-red-400 rounded-full"
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-400">{t("chart.warningsOnly")}</span>
                        <span className="text-amber-400 font-medium">
                          {data.byOutcome.find(o => o.outcome === "Warning/Admonishment")?.count ?? 0}
                        </span>
                      </div>
                      <div className="h-2 bg-[#1e293b] rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          whileInView={{ width: `${((data.byOutcome.find(o => o.outcome === "Warning/Admonishment")?.count ?? 0) / data.totalCases) * 100}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 1, delay: 0.4 }}
                          className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Key insight */}
                <div className="glow-card p-6 flex flex-col justify-center">
                  <h3 className="text-lg font-semibold mb-4">{t("chart.keyFindings")}</h3>
                  <ul className="space-y-3 text-slate-300 text-sm leading-relaxed">
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0"></span>
                      <span><strong className="text-white">{data.byYear[data.byYear.length - 1]?.count}</strong> {t("finding.1")}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0"></span>
                      <span><strong className="text-white">{t("finding.2.label")}</strong> {t("finding.2").replace("{0}", data.byHallType[0]?.count.toLocaleString())}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0"></span>
                      <span>{t("finding.3").replace("{0}", String(data.byParty[0]?.count)).replace("{1}", String(Math.round((data.byParty[0]?.count / data.totalCases) * 100)))}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shrink-0"></span>
                      <span>{t("finding.4").replace("{0}", String(data.byCountry[0]?.count))}</span>
                    </li>
                  </ul>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "penalties" && (
            <motion.div key="penalties" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.3 }}>
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Total penalty sum headline */}
                <div className="glow-card p-6 lg:col-span-2">
                  <div className="flex flex-wrap items-center gap-6">
                    <div>
                      <p className="text-sm text-slate-400 uppercase tracking-wider mb-1">{t("penalties.totalFines")}</p>
                      <p className="text-4xl sm:text-5xl font-bold text-emerald-400">
                        ~${(data.totalPenaltySum / 1e6).toFixed(1)}M
                      </p>
                      <p className="text-xs text-slate-500 mt-1">{t("penalties.approxNote")}</p>
                    </div>
                    <div className="flex flex-wrap gap-6">
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wider">{t("penalties.average")}</p>
                        <p className="text-xl font-semibold text-white">~${data.avgPenalty.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wider">{t("penalties.median")}</p>
                        <p className="text-xl font-semibold text-white">~${data.medianPenalty.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wider">{t("penalties.min")}</p>
                        <p className="text-xl font-semibold text-white">~${data.minPenalty.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wider">{t("penalties.max")}</p>
                        <p className="text-xl font-semibold text-white">~${data.maxPenalty.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Penalty distribution histogram */}
                <div className="glow-card p-6">
                  <h3 className="text-lg font-semibold mb-1">{t("penalties.distribution")}</h3>
                  <p className="text-sm text-slate-500 mb-4">{t("penalties.distribution.sub")}</p>
                  <div className="h-80">
                    <ClientOnly><ResponsiveContainer>
                      <BarChart data={data.penaltyRanges}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="range" stroke="#475569" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
                        <YAxis stroke="#475569" tick={{ fontSize: 11 }} />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(59, 130, 246, 0.08)' }} />
                        <Bar dataKey="count" radius={[4, 4, 0, 0]} name={t("tooltip.cases")} fill={COLORS.emerald} />
                      </BarChart>
                    </ResponsiveContainer></ClientOnly>
                  </div>
                </div>

                {/* Penalty trend by year */}
                <div className="glow-card p-6">
                  <h3 className="text-lg font-semibold mb-1">{t("penalties.byYear")}</h3>
                  <p className="text-sm text-slate-500 mb-4">{t("penalties.byYear.sub")}</p>
                  <div className="h-80">
                    <ClientOnly><ResponsiveContainer>
                      <BarChart data={data.penaltyByYear}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="year" stroke="#475569" tick={{ fontSize: 12 }} />
                        <YAxis stroke="#475569" tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(59, 130, 246, 0.08)' }} />
                        <Bar dataKey="total" radius={[4, 4, 0, 0]} name={t("tooltip.total")}>
                          {data.penaltyByYear.map((_, i) => (
                            <Cell key={i} fill={[COLORS.slate, COLORS.purple, COLORS.emerald, COLORS.cyan][i]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer></ClientOnly>
                  </div>
                </div>

                {/* Top 15 largest penalties */}
                <div className="glow-card p-6 lg:col-span-2">
                  <h3 className="text-lg font-semibold mb-1">{t("penalties.top15")}</h3>
                  <p className="text-sm text-slate-500 mb-6">{t("penalties.top15.sub")}</p>
                  <div className="space-y-3">
                    {data.topPenalties.map((c, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.04 }}
                        className="flex items-center gap-4"
                      >
                        <span className="text-2xl font-bold text-slate-600 w-8 text-right tabular-nums">
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="h-8 bg-[#1e293b] rounded-lg overflow-hidden relative">
                            <motion.div
                              initial={{ width: 0 }}
                              whileInView={{ width: `${(c.amount / data.topPenalties[0].amount) * 100}%` }}
                              viewport={{ once: true }}
                              transition={{ duration: 0.8, delay: i * 0.04 }}
                              className="h-full rounded-lg"
                              style={{
                                background: `linear-gradient(90deg, ${PIE_COLORS[i % PIE_COLORS.length]}cc, ${PIE_COLORS[i % PIE_COLORS.length]}66)`
                              }}
                            />
                            <span className="absolute inset-0 flex items-center px-3 text-xs text-white truncate font-medium">
                              {c.name}
                            </span>
                          </div>
                        </div>
                        <span className="text-sm font-bold text-emerald-400 tabular-nums text-right whitespace-nowrap">
                          {c.currency === 'USD' ? `$${c.originalAmount.toLocaleString()}` : `${c.originalAmount.toLocaleString()} ${c.currency}`}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Recent Cases Table */}
      <Section className="max-w-7xl mx-auto px-6 pb-16">
        <div className="glow-card overflow-hidden">
          <div className="p-6 border-b border-[#1e293b]">
            <h3 className="text-lg font-semibold">{t("table.recentCases")}</h3>
            <p className="text-sm text-slate-500">{t("table.recentCases.sub")}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1e293b] text-slate-400">
                  <th className="text-left px-6 py-3 font-medium">{t("table.date")}</th>
                  <th className="text-left px-6 py-3 font-medium">{t("table.case")}</th>
                  <th className="text-left px-6 py-3 font-medium">{t("table.country")}</th>
                  <th className="text-left px-6 py-3 font-medium">{t("table.party")}</th>
                  <th className="text-left px-6 py-3 font-medium">{t("table.aiTool")}</th>
                  <th className="text-center px-6 py-3 font-medium">{t("table.hallucinations")}</th>
                  <th className="text-left px-6 py-3 font-medium">{t("table.outcome")}</th>
                </tr>
              </thead>
              <tbody>
                {data.recentCases.map((c, i) => (
                  <motion.tr
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.03 }}
                    className="border-b border-[#1e293b]/50 hover:bg-[#1e293b]/30 transition-colors"
                  >
                    <td className="px-6 py-3 text-slate-400 whitespace-nowrap font-mono text-xs">{c.date}</td>
                    <td className="px-6 py-3 text-slate-200 max-w-xs truncate">{c.name}</td>
                    <td className="px-6 py-3 text-slate-400">{td(c.country)}</td>
                    <td className="px-6 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                        c.party === "Lawyer" ? "bg-blue-500/20 text-blue-400" :
                        c.party === "Pro Se Litigant" ? "bg-amber-500/20 text-amber-400" :
                        "bg-slate-500/20 text-slate-400"
                      }`}>{td(c.party)}</span>
                    </td>
                    <td className="px-6 py-3 text-slate-400 text-xs">{td(c.aiTool)}</td>
                    <td className="px-6 py-3 text-center">
                      <span className="inline-block min-w-[2rem] text-center px-2 py-0.5 rounded bg-red-500/20 text-red-400 text-xs font-medium">
                        {c.hallCount}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                        c.outcomeCategory === "Monetary Sanction" ? "bg-emerald-500/20 text-emerald-400" :
                        c.outcomeCategory === "Warning/Admonishment" ? "bg-amber-500/20 text-amber-400" :
                        c.outcomeCategory === "Bar Referral" ? "bg-red-500/20 text-red-400" :
                        "bg-slate-500/20 text-slate-400"
                      }`}>{td(c.outcomeCategory)}</span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Section>

      {/* Top Cases by Hallucination Count */}
      <Section className="max-w-7xl mx-auto px-6 pb-16">
        <div className="glow-card p-6">
          <h3 className="text-lg font-semibold mb-1">{t("topCases.title")}</h3>
          <p className="text-sm text-slate-500 mb-6">{t("topCases.sub")}</p>
          <div className="space-y-3">
            {data.topCases.slice(0, 10).map((c, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-4"
              >
                <span className="text-2xl font-bold text-slate-600 w-8 text-right tabular-nums">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="h-8 bg-[#1e293b] rounded-lg overflow-hidden relative">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${(c.hallCount / data.topCases[0].hallCount) * 100}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.8, delay: i * 0.05 }}
                      className="h-full rounded-lg"
                      style={{
                        background: `linear-gradient(90deg, ${PIE_COLORS[i % PIE_COLORS.length]}cc, ${PIE_COLORS[i % PIE_COLORS.length]}66)`
                      }}
                    />
                    <span className="absolute inset-0 flex items-center px-3 text-xs text-white truncate font-medium">
                      {c.name}
                    </span>
                  </div>
                </div>
                <span className="text-sm font-bold text-white tabular-nums w-8 text-right">{c.hallCount}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* Footer with credits */}
      <footer className="border-t border-[#1e293b] bg-[#0a0e1a]/80">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-sm">
                  AI
                </div>
                <span className="font-semibold text-lg">{t("nav.title")}</span>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed max-w-md">
                {t("footer.description")}
              </p>
            </div>
            <div className="md:text-right">
              <h4 className="font-semibold text-white mb-3">{t("footer.credits")}</h4>
              <p className="text-slate-400 text-sm mb-3 leading-relaxed">
                {t("footer.creditsText")}{" "}
                <a
                  href="https://www.damiencharlotin.com/hallucinations/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 underline underline-offset-2 font-medium"
                >
                  Damien Charlotin
                </a>
                {t("footer.creditsText2")}
              </p>
              <p className="text-slate-500 text-xs">
                {t("footer.snapshot")} &middot; {data.totalCases} {t("footer.casesDocumented")}
              </p>
              <a
                href="https://www.damiencharlotin.com/hallucinations/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 rounded-full bg-[#1e293b] hover:bg-[#334155] text-blue-400 text-sm font-medium transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                {t("footer.visitSite")}
              </a>
            </div>
          </div>
          <div className="border-t border-[#1e293b] mt-8 pt-8 text-center text-xs text-slate-600">
            {t("footer.disclaimer")}
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function Home() {
  return (
    <LanguageProvider>
      <Dashboard />
    </LanguageProvider>
  );
}
