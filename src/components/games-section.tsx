"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Gamepad2,
  ImagePlus,
  Loader2,
  Plus,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useGames } from "@/hooks/use-games";
import { GameCard } from "@/components/game-card";
import { GameDialog } from "@/components/game-dialog";
import { GameDetailsDialog } from "@/components/game-details-dialog";
import { LogTimeDialog } from "@/components/log-time-dialog";
import {
  GAME_RATINGS,
  PRIORITY_META,
  RATING_META,
  formatHours,
  normalizeRating,
  type Game,
  type GameRating,
  type GameStatus,
} from "@/lib/types";
import type { RawgGame } from "@/lib/rawg";

function pluralGames(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return `${count} игра`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${count} игры`;
  return `${count} игр`;
}

const EMPTY_HINTS: Record<GameStatus | "all", string> = {
  playing: "Добавьте игру и начните отслеживать прохождение",
  backlog: "Добавьте игры, которые планируете пройти",
  wishlist: "Сохраняйте игры, которые хотите купить",
  completed: "Завершённые игры появятся здесь",
  paused: "Отложенные игры появятся здесь",
  dropped: "Заброшенные игры появятся здесь",
  all: "Начните с добавления первой игры",
};

interface GamesSectionProps {
  status?: GameStatus | "all";
  statuses?: GameStatus[];
  title: string;
  description: string;
  defaultStatus?: GameStatus;
}

export function GamesSection({
  status = "all",
  statuses,
  title,
  description,
  defaultStatus,
}: GamesSectionProps) {
  const { games, loading, error, refresh, createGame, updateGame, deleteGame } =
    useGames();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"recent" | "title" | "hours" | "rating" | "priority">(
    "recent"
  );
  const [platformFilter, setPlatformFilter] = useState("all");
  const [genreFilter, setGenreFilter] = useState("all");
  const [ratingFilter, setRatingFilter] = useState("all");
  const [enriching, setEnriching] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const [logTimeId, setLogTimeId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list =
      status === "all" && !statuses
        ? games
        : games.filter((game) =>
            statuses
              ? statuses.includes(game.status)
              : game.status === status
          );
    const query = search.trim().toLowerCase();
    if (query) {
      list = list.filter(
        (game) =>
          game.title.toLowerCase().includes(query) ||
          (game.genres ?? []).some((genre) => genre.toLowerCase().includes(query)) ||
          (game.notes ?? "").toLowerCase().includes(query) ||
          (game.review ?? "").toLowerCase().includes(query)
      );
    }
    if (platformFilter !== "all") {
      list = list.filter((game) => game.platforms.includes(platformFilter));
    }
    if (genreFilter !== "all") {
      list = list.filter((game) => (game.genres ?? []).includes(genreFilter));
    }
    if (ratingFilter !== "all") {
      list = list.filter(
        (game) =>
          ratingFilter === "none"
            ? !game.rating
            : normalizeRating(game.rating) === ratingFilter
      );
    }
    const sorted = [...list];
    if (sort === "title") {
      sorted.sort((a, b) => a.title.localeCompare(b.title, "ru"));
    } else if (sort === "hours") {
      sorted.sort((a, b) => (b.hoursPlayed ?? 0) - (a.hoursPlayed ?? 0));
    } else if (sort === "rating") {
      sorted.sort((a, b) => {
        const rankA = a.rating ? RATING_META[a.rating].rank : 99;
        const rankB = b.rating ? RATING_META[b.rating].rank : 99;
        return rankA - rankB;
      });
    } else if (sort === "priority") {
      sorted.sort((a, b) => {
        const rankA = a.priority ? PRIORITY_META[a.priority].rank : 99;
        const rankB = b.priority ? PRIORITY_META[b.priority].rank : 99;
        return rankA - rankB;
      });
    } else {
      sorted.sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));
    }
    return sorted;
  }, [games, status, statuses, search, sort, platformFilter, genreFilter, ratingFilter]);

  const availablePlatforms = useMemo(() => {
    const set = new Set<string>();
    for (const game of games) {
      for (const platform of game.platforms) set.add(platform);
    }
    return [...set].sort((a, b) => a.localeCompare(b, "ru"));
  }, [games]);

  const availableGenres = useMemo(() => {
    const set = new Set<string>();
    for (const game of games) {
      for (const genre of game.genres ?? []) set.add(genre);
    }
    return [...set].sort((a, b) => a.localeCompare(b, "ru"));
  }, [games]);

  const gamesWithoutCover = useMemo(
    () => filtered.filter((game) => !game.cover && game.title),
    [filtered]
  );

  const enrichCovers = async () => {
    if (!gamesWithoutCover.length) return;
    setEnriching(true);
    let updated = 0;
    try {
      for (const game of gamesWithoutCover) {
        try {
          const res = await fetch(
            `/api/rawg/search?q=${encodeURIComponent(game.title)}&page_size=3`
          );
          if (!res.ok) continue;
          const data: { results?: RawgGame[] } = await res.json();
          const match = (data.results ?? []).find((item) => item.background_image);
          if (!match) continue;
          await updateGame(game.id, {
            cover: match.background_image,
            rawgId: match.id,
          });
          updated += 1;
        } catch {
          continue;
        }
      }
      if (updated > 0) toast.success(`Обложки обновлены: ${updated}`);
      else toast.info("Подходящих обложек в RAWG не нашлось");
    } finally {
      setEnriching(false);
    }
  };

  const sectionHours = useMemo(
    () => filtered.reduce((sum, game) => sum + (game.hoursPlayed ?? 0), 0),
    [filtered]
  );

  const editGame = games.find((game) => game.id === editId) ?? null;
  const detailsGame = games.find((game) => game.id === detailsId) ?? null;
  const logTimeGame = games.find((game) => game.id === logTimeId) ?? null;

  const handleLogTime = async (hours: number, date: string) => {
    if (!logTimeId) return;
    try {
      await updateGame(logTimeId, { addHours: hours, sessionDate: date });
      toast.success(`Записано +${hours} ч`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Не удалось записать");
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display glitch-title text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">{description}</p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Добавить игру
        </Button>
      </div>

      {!loading && !error && (
        <p className="mt-3 text-sm text-muted-foreground">
          {pluralGames(filtered.length)}
          {sectionHours > 0 && ` · ${formatHours(sectionHours)} наиграно`}
        </p>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <div className="relative min-w-52 flex-1 sm:max-w-xs">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Название, жанр, заметки…"
            className="pl-8"
          />
        </div>
        <Select value={platformFilter} onValueChange={setPlatformFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Платформа" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все платформы</SelectItem>
            {availablePlatforms.map((platform) => (
              <SelectItem key={platform} value={platform}>
                {platform}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {availableGenres.length > 0 && (
          <Select value={genreFilter} onValueChange={setGenreFilter}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Жанр" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все жанры</SelectItem>
              {availableGenres.map((genre) => (
                <SelectItem key={genre} value={genre}>
                  {genre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {status === "completed" && (
          <Select value={ratingFilter} onValueChange={setRatingFilter}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Оценка" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Любая оценка</SelectItem>
              <SelectItem value="none">Без оценки</SelectItem>
              {GAME_RATINGS.map((rating) => (
                <SelectItem key={rating} value={rating}>
                  {RATING_META[rating].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Select value={sort} onValueChange={(value) => setSort(value as typeof sort)}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Сначала недавние</SelectItem>
            <SelectItem value="title">По названию</SelectItem>
            <SelectItem value="hours">По наигранным часам</SelectItem>
            {status === "completed" && (
              <SelectItem value="rating">По оценке</SelectItem>
            )}
            <SelectItem value="priority">По приоритету</SelectItem>
          </SelectContent>
        </Select>
        {gamesWithoutCover.length > 0 && (
          <Button
            variant="outline"
            onClick={enrichCovers}
            disabled={enriching}
            title="Найти обложки для игр без обложки через RAWG"
          >
            {enriching ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ImagePlus className="mr-2 h-4 w-4" />
            )}
            Подтянуть обложки RAWG
          </Button>
        )}
      </div>

      {loading ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="space-y-3 rounded-xl border p-3">
              <Skeleton className="aspect-[16/9] w-full rounded-lg" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-7 w-full" />
            </div>
          ))}
        </div>
      ) : error ? (
        <Alert variant="destructive" className="mt-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Не удалось загрузить игры</AlertTitle>
          <AlertDescription className="flex items-center gap-3">
            <span>{error}</span>
            <Button size="sm" variant="outline" onClick={refresh}>
              <Loader2 className="mr-2 h-3.5 w-3.5" /> Повторить
            </Button>
          </AlertDescription>
        </Alert>
      ) : filtered.length === 0 ? (
        <div className="col-span-full mt-6 flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
          <Gamepad2 className="h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 font-medium">
            {search ? "Ничего не найдено по запросу" : "Здесь пока пусто"}
          </p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            {search ? "Попробуйте изменить поисковый запрос" : EMPTY_HINTS[status]}
          </p>
          {!search && (
            <Button className="mt-4" onClick={() => setAddOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Добавить игру
            </Button>
          )}
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((game) => (
            <GameCard
              key={game.id}
              game={game}
              onUpdate={updateGame}
              onDelete={deleteGame}
              onOpenDetails={(g) => setDetailsId(g.id)}
              onLogTime={(g) => setLogTimeId(g.id)}
              onEdit={(g) => setEditId(g.id)}
            />
          ))}
        </div>
      )}

      <GameDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        defaultStatus={defaultStatus ?? (status === "all" ? "backlog" : (status as GameStatus))}
        onSubmit={createGame}
      />

      <GameDialog
        open={Boolean(editGame)}
        onOpenChange={(open) => !open && setEditId(null)}
        game={editGame}
        onSubmit={async (draft) => {
          if (!editId) return;
          await updateGame(editId, draft);
        }}
      />

      <GameDetailsDialog
        game={detailsGame}
        open={Boolean(detailsGame)}
        onOpenChange={(open) => !open && setDetailsId(null)}
        onUpdate={updateGame}
        onDelete={deleteGame}
        onLogTime={(g) => setLogTimeId(g.id)}
        onEdit={(g) => {
          setDetailsId(null);
          setEditId(g.id);
        }}
      />

      <LogTimeDialog
        game={logTimeGame}
        open={Boolean(logTimeGame)}
        onOpenChange={(open) => !open && setLogTimeId(null)}
        onSubmit={handleLogTime}
      />
    </div>
  );
}

export type { Game };
