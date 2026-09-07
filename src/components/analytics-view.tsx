"use client";

import { useMemo } from "react";
import { AlertTriangle, BarChart3, Clock, Gamepad2, Layers, Loader2, Sparkles, Trophy } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useGames } from "@/hooks/use-games";
import { cn } from "@/lib/utils";
import {
  GAME_RATINGS,
  RATING_META,
  formatHours,
  normalizeRating,
  type Game,
  type GameRating,
} from "@/lib/types";

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  accent: string;
}) {
  return (
    <div className="comic-panel relative overflow-hidden p-4">
      <div className="halftone-corner pointer-events-none absolute right-0 top-0 h-16 w-16" />
      <Icon className={cn("h-5 w-5", accent)} />
      <p className="mt-2 font-display text-2xl font-bold tracking-tight">{value}</p>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
    </div>
  );
}

function DistributionBar({
  rating,
  count,
  total,
}: {
  rating: GameRating;
  count: number;
  total: number;
}) {
  const meta = RATING_META[rating];
  const percent = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={meta.icon} alt="" className="h-8 w-8 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2 text-sm">
          <span className="font-medium">{meta.label}</span>
          <span className="text-muted-foreground">
            {count} · {percent}%
          </span>
        </div>
        <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function TopList({
  title,
  items,
  emptyHint,
}: {
  title: string;
  items: { name: string; count: number }[];
  emptyHint: string;
}) {
  const max = Math.max(1, ...items.map((item) => item.count));
  return (
    <div className="comic-panel p-4">
      <h3 className="font-display text-sm font-bold uppercase tracking-wide">{title}</h3>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{emptyHint}</p>
      ) : (
        <div className="mt-3 space-y-2.5">
          {items.map((item) => (
            <div key={item.name} className="flex items-center gap-3 text-sm">
              <span className="w-32 shrink-0 truncate" title={item.name}>
                {item.name}
              </span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-cyan-500 transition-all"
                  style={{ width: `${(item.count / max) * 100}%` }}
                />
              </div>
              <span className="w-6 shrink-0 text-right text-muted-foreground">
                {item.count}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function AnalyticsView() {
  const { games, loading, error, refresh } = useGames();

  const stats = useMemo(() => {
    const rated: Partial<Record<GameRating, number>> = {};
    let ratedTotal = 0;
    const genres = new Map<string, number>();
    const platforms = new Map<string, number>();

    for (const game of games as Game[]) {
      const rating = normalizeRating(game.rating);
      if (rating) {
        rated[rating] = (rated[rating] ?? 0) + 1;
        ratedTotal += 1;
      }
      for (const genre of game.genres ?? []) {
        genres.set(genre, (genres.get(genre) ?? 0) + 1);
      }
      for (const platform of game.platforms) {
        platforms.set(platform, (platforms.get(platform) ?? 0) + 1);
      }
    }

    const totalHours = games.reduce((sum, g) => sum + (g.hoursPlayed ?? 0), 0);
    const backlogHours = games
      .filter((g) => g.status === "backlog")
      .reduce((sum, g) => sum + (g.avgPlaytime ?? 0), 0);
    const completedHours = games
      .filter((g) => g.status === "completed")
      .reduce((sum, g) => sum + (g.hoursPlayed ?? 0), 0);
    const completedCount = games.filter((g) => g.status === "completed").length;

    const top = (map: Map<string, number>) =>
      [...map.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 7)
        .map(([name, count]) => ({ name, count }));

    return {
      total: games.length,
      playing: games.filter((g) => g.status === "playing").length,
      backlog: games.filter((g) => g.status === "backlog").length,
      wishlist: games.filter((g) => g.status === "wishlist").length,
      paused: games.filter((g) => g.status === "paused").length,
      dropped: games.filter((g) => g.status === "dropped").length,
      completedCount,
      totalHours,
      backlogHours,
      completedHours,
      rated,
      ratedTotal,
      topGenres: top(genres),
      topPlatforms: top(platforms),
    };
  }, [games]);

  const avgCompletedHours =
    stats.completedCount > 0 ? stats.completedHours / stats.completedCount : 0;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-10">
      <div className="flex items-center gap-3">
        <div className="comic-panel-sm flex h-11 w-11 items-center justify-center">
          <BarChart3 className="h-5 w-5" />
        </div>
        <div>
          <h1 className="font-display glitch-title text-2xl font-bold tracking-tight md:text-3xl">
            Аналитика &amp; оценки
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Состояние библиотеки: часы, распределение оценок, жанры и платформы
          </p>
        </div>
      </div>

      {loading ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <Alert variant="destructive" className="mt-8">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Не удалось загрузить данные</AlertTitle>
          <AlertDescription className="flex items-center gap-3">
            <span>{error}</span>
            <Button size="sm" variant="outline" onClick={refresh}>
              <Loader2 className="mr-2 h-3.5 w-3.5" /> Повторить
            </Button>
          </AlertDescription>
        </Alert>
      ) : stats.total === 0 ? (
        <div className="comic-panel mt-8 flex flex-col items-center justify-center py-16 text-center">
          <Sparkles className="h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 font-medium">Пока нет данных для аналитики</p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Добавьте игры в библиотеку — статистика соберётся автоматически
          </p>
        </div>
      ) : (
        <div className="mt-8 space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={Gamepad2}
              label="Игр в библиотеке"
              value={stats.total}
              accent="text-primary"
            />
            <StatCard
              icon={Clock}
              label="Всего наиграно"
              value={formatHours(stats.totalHours)}
              accent="text-cyan-500"
            />
            <StatCard
              icon={Layers}
              label="Объём бэклога"
              value={`≈ ${formatHours(stats.backlogHours)}`}
              accent="text-amber-500"
            />
            <StatCard
              icon={Trophy}
              label="Пройдено игр"
              value={stats.completedCount}
              accent="text-violet-500"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="comic-panel p-4">
              <h3 className="font-display text-sm font-bold uppercase tracking-wide">
                Распределение оценок
              </h3>
              <div className="mt-4 space-y-3">
                {GAME_RATINGS.map((rating) => (
                  <DistributionBar
                    key={rating}
                    rating={rating}
                    count={stats.rated[rating] ?? 0}
                    total={stats.ratedTotal}
                  />
                ))}
              </div>
              {stats.ratedTotal === 0 && (
                <p className="mt-3 text-sm text-muted-foreground">
                  Ни одна игра ещё не оценена
                </p>
              )}
            </div>

            <div className="space-y-4">
              <div className="comic-panel grid grid-cols-3 gap-2 p-4 text-center">
                <div>
                  <p className="font-display text-lg font-bold">{stats.playing}</p>
                  <p className="text-xs text-muted-foreground">в процессе</p>
                </div>
                <div>
                  <p className="font-display text-lg font-bold">{stats.backlog}</p>
                  <p className="text-xs text-muted-foreground">в бэклоге</p>
                </div>
                <div>
                  <p className="font-display text-lg font-bold">{stats.wishlist}</p>
                  <p className="text-xs text-muted-foreground">в вишлисте</p>
                </div>
                <div>
                  <p className="font-display text-lg font-bold">{stats.paused}</p>
                  <p className="text-xs text-muted-foreground">на паузе</p>
                </div>
                <div>
                  <p className="font-display text-lg font-bold">{stats.dropped}</p>
                  <p className="text-xs text-muted-foreground">брошено</p>
                </div>
                <div>
                  <p className="font-display text-lg font-bold">
                    {avgCompletedHours > 0
                      ? `${avgCompletedHours.toFixed(1)} ч`
                      : "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">ср. прохождение</p>
                </div>
              </div>
              <TopList
                title="Топ жанров"
                items={stats.topGenres}
                emptyHint="Укажите жанры у игр в библиотеке"
              />
            </div>
          </div>

          <TopList
            title="Топ платформ"
            items={stats.topPlatforms}
            emptyHint="Укажите платформы у игр в библиотеке"
          />
        </div>
      )}
    </div>
  );
}
