import { GamesSection } from "@/components/games-section";

export const metadata = {
  title: "Вишлист",
};

export default function WishlistPage() {
  return (
    <GamesSection
      status="wishlist"
      defaultStatus="wishlist"
      title="Вишлист"
      description="Игры, которые хочется купить или получить в подарок. Купили и начали играть — переведите в нужный статус."
    />
  );
}
