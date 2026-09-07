import { GamesSection } from "@/components/games-section";

export const metadata = {
  title: "Активные",
};

export default function PlayingPage() {
  return (
    <GamesSection
      status="playing"
      defaultStatus="playing"
      title="Активные игры"
      description="Игры в прохождении: записывайте время сессий, следите за прогрессом от среднего времени прохождения и меняйте статус по ходу дела."
    />
  );
}
