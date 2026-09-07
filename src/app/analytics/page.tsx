import type { Metadata } from "next";
import { AnalyticsView } from "@/components/analytics-view";

export const metadata: Metadata = {
  title: "Аналитика — GameBacklogs",
  description: "Статистика библиотеки: часы, оценки, жанры и платформы",
};

export default function AnalyticsPage() {
  return <AnalyticsView />;
}
