"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  Clock,
  Gamepad2,
  Heart,
  Layers,
  Plus,
  Sparkles,
  Trophy,
} from "lucide-react";
import { formatDistanceToNow, startOfWeek } from "date-fns";
import { ru } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useGames } from "@/hooks/use-games";
import { GameDialog } from "@/components/game-dialog";
import { formatGameDate, formatHours, STATUS_META, type Game } from "@/lib/types";

function GameThumb({ game, className }: { game: Game; className?: string }) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted",
        className
      )}
    >
      {game.cover ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={game.cover}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover"
        />
      ) : (
        <Gamepad2 className="h-4 w-4 text-muted-foreground/50" />
      )}
    </span>
  );
}

export function Dashboard() {
  const { games, loading, createGame, updateGame } = useGames();
  const [addOpen, setAddOpen] = useState(false);
  const [quickLogging, setQuickLogging] = useState<string | null>(null);

  const stats = useMemo(() => {
    const playing = games.filter((game) => game.status === "playing");
    const backlog = games.filter((game) => game.status === "backlog");
    const wishlist = games.filter((game) => game.status === "wishlist");
    const completed = games.filter((game) => game.status === "completed");
    const paused = games.filter((game) => game.status === "paused");
    const dropped = games.filter((game) => game.status === "dropped");
    const totalHours = games.reduce((sum, game) => sum + (game.hoursPlayed ?? 0), 0);
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const weekHours = games.reduce(
      (sum, game) =>
        sum +
        (game.sessions ?? [])
          .filter((session) => new Date(session.date) >= weekStart)
          .reduce((acc, session) => acc + session.hours, 0),
      0
    );
    const tracked = playing.length + backlog.length + completed.length;
    const progressPct = tracked
      ? Math.round((completed.length / tracked) * 100)
      : 0;
    const recent = [...games]
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 6);
    return {
      playing,
      backlog,
      wishlist,
      completed,
      paused,
      dropped,
      totalHours: Math.round(totalHours),
      weekHours: Math.round(weekHours * 10) / 10,
      tracked,
      progressPct,
      recent,
    };
  }, [games]);

  const quickLog = async (game: Game) => {
    setQuickLogging(game.id);
    try {
      await updateGame(game.id, { addHours: 1 });
      toast.success(`«${game.title}» +1 ч`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Не удалось записать");
    } finally {
      setQuickLogging(null);
    }
  };

  const tiles = [
    { label: "Активные", value: stats.playing.length, icon: Gamepad2, href: "/playing", iconClass: "text-emerald-500" },
    { label: "Часов всего", value: formatHours(stats.totalHours), icon: Clock, href: "/completed", iconClass: "text-violet-500" },
    { label: "Часов за неделю", value: formatHours(stats.weekHours), icon: CalendarDays, href: "/playing", iconClass: "text-sky-500" },
    { label: "Бэклог", value: stats.backlog.length, icon: Layers, href: "/backlog", iconClass: "text-sky-500" },
    { label: "Вишлист", value: stats.wishlist.length, icon: Heart, href: "/wishlist", iconClass: "text-pink-500" },
    { label: "Пройдено", value: stats.completed.length, icon: Trophy, href: "/completed", iconClass: "text-amber-500" },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display glitch-title text-2xl font-bold tracking-tight md:text-3xl">Обзор</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Ваш игровой прогресс в одном месте
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Добавить игру
        </Button>
      </div>

      {loading ? (
        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : games.length === 0 ? (
        <div className="mt-8 flex flex-col items-center rounded-2xl border border-dashed py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white">
            <Gamepad2 className="h-7 w-7" />
          </span>
          <h2 className="mt-4 text-lg font-semibold">
            Добро пожаловать в GameBacklogs
          </h2>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            Соберите игровой бэклог: добавляйте игры через RAWG, ведите активные
            прохождения, записывайте время и держите вишлист под рукой.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Добавить первую игру
            </Button>
            <Button variant="outline" asChild>
              <Link href="/assistant">
                <Sparkles className="mr-2 h-4 w-4" /> Giga-помощник
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
            {tiles.map((tile) => {
              const Icon = tile.icon;
              return (
                <Link
                  key={tile.label}
                  href={tile.href}
                  className="rounded-xl border bg-card p-4 transition-colors hover:border-primary/40"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{tile.label}</span>
                    <Icon className={cn("h-4 w-4", tile.iconClass)} />
                  </div>
                  <p className="mt-2 text-2xl font-bold tabular-nums">{tile.value}</p>
                </Link>
              );
            })}
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <div className="space-y-3 lg:col-span-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Сейчас в игре
              </h2>
              {stats.playing.length === 0 ? (
                <div className="rounded-xl border border-dashed px-4 py-10 text-center">
                  <p className="text-sm text-muted-foreground">
                    Нет активных игр. Добавьте игру или перенесите её из бэклога.
                  </p>
                  <Button variant="outline" size="sm" className="mt-3" asChild>
                    <Link href="/backlog">Открыть бэклог</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {stats.playing.slice(0, 5).map((game) => {
                    const pct =
                      game.avgPlaytime && game.avgPlaytime > 0
                        ? Math.min(
                            100,
                            Math.round(((game.hoursPlayed ?? 0) / game.avgPlaytime) * 100)
                          )
                        : 0;
                    return (
                      <div
                        key={game.id}
                        className="flex items-center gap-3 rounded-xl border bg-card p-2.5"
                      >
                        <GameThumb game={game} className="h-12 w-20" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{game.title}</p>
                          <div className="mt-1.5 flex items-center gap-2">
                            {Boolean(game.avgPlaytime) && (
                              <Progress value={pct} className="h-1 flex-1" />
                            )}
                            <span className="shrink-0 text-xs text-muted-foreground">
                              {formatHours(game.hoursPlayed)}
                              {game.avgPlaytime
                                ? ` / ≈ ${formatHours(game.avgPlaytime)}`
                                : ""}
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 shrink-0 gap-1"
                          disabled={quickLogging === game.id}
                          onClick={() => quickLog(game)}
                        >
                          <Plus className="h-3.5 w-3.5" /> 1 ч
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="rounded-xl border bg-card p-4">
                <h3 className="text-sm font-semibold">Прогресс коллекции</h3>
                <Progress value={stats.progressPct} className="mt-3 h-2" />
                <p className="mt-2 text-sm text-muted-foreground">
                  Пройдено {stats.completed.length} из {stats.tracked} игр (
                  {stats.progressPct}%)
                </p>
                <div className="mt-3 space-y-1.5 border-t pt-3 text-xs">
                  {(
                    [
                      ["playing", stats.playing.length],
                      ["backlog", stats.backlog.length],
                      ["wishlist", stats.wishlist.length],
                      ["completed", stats.completed.length],
                      ["paused", stats.paused.length],
                      ["dropped", stats.dropped.length],
                    ] as const
                  ).map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <span
                          className={cn("h-1.5 w-1.5 rounded-full", STATUS_META[status].dot)}
                        />
                        {STATUS_META[status].label}
                      </span>
                      <span className="font-medium tabular-nums">{count}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border bg-card p-4">
                <h3 className="text-sm font-semibold">Недавняя активность</h3>
                {stats.recent.length === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">Пока нет событий</p>
                ) : (
                  <div className="mt-3 space-y-2.5">
                    {stats.recent.map((game) => (
                      <div key={game.id} className="flex items-center gap-2.5">
                        <GameThumb game={game} className="h-9 w-14 rounded-md" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{game.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatGameDate(game.updatedAt)} ·{" "}
                            {formatDistanceToNow(new Date(game.updatedAt), {
                              addSuffix: true,
                              locale: ru,
                            })}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "h-2 w-2 shrink-0 rounded-full",
                            STATUS_META[game.status].dot
                          )}
                          title={STATUS_META[game.status].label}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      <GameDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        defaultStatus="backlog"
        onSubmit={createGame}
      />
    </div>
  );
}
