import type { Metadata } from "next";
import { GamesSection } from "@/components/games-section";

export const metadata: Metadata = {
  title: "Пауза / Дроп — GameBacklogs",
  description: "Игры, отложенные на потом или заброшенные",
};

export default function PausedPage() {
  return (
    <GamesSection
      statuses={["paused", "dropped"]}
      title="Пауза / Дроп"
      description="Отложенные на потом и окончательно заброшенные игры. Можно вернуть в любой статус в один клик."
      defaultStatus="paused"
    />
  );
}
