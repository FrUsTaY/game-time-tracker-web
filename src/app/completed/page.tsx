import { GamesSection } from "@/components/games-section";

export const metadata = {
  title: "Пройденные",
};

export default function CompletedPage() {
  return (
    <GamesSection
      status="completed"
      defaultStatus="backlog"
      title="Пройденные"
      description="Архив завершённых прохождений: часы, личные оценки и заметки."
    />
  );
}
