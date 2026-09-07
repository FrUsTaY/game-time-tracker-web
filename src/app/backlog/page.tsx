import { GamesSection } from "@/components/games-section";

export const metadata = {
  title: "Бэклог",
};

export default function BacklogPage() {
  return (
    <GamesSection
      status="backlog"
      defaultStatus="backlog"
      title="Бэклог"
      description="Игры, которые вы планируете пройти. Когда начнёте — перенесите игру в «Активные» одним кликом."
    />
  );
}
