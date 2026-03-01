import type { Metadata } from "next";
import "./globals.css";
import data from "@/lib/data.json";

export const metadata: Metadata = {
  title: "ИИ-галлюцинации в суде — Трекер дел",
  description: `Интерактивная визуализация случаев ИИ-галлюцинаций в судебных процессах. ${data.totalCases} дел, ${data.totalHallucinations} галлюцинаций. На основе исследования Damien Charlotin.`,
  openGraph: {
    title: "ИИ-галлюцинации в суде — Трекер дел",
    description: `${data.totalCases} дел. ${data.totalHallucinations.toLocaleString()} галлюцинаций. Отслеживание влияния ИИ-фабрикаций на правовые системы по всему миру.`,
    type: "website",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru" className="dark">
      <body className="antialiased" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
        {children}
      </body>
    </html>
  );
}
