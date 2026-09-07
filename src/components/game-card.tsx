"use client";

import { useState } from "react";
import {
  CalendarDays,
  ChevronDown,
  Clock,
  EllipsisVertical,
  Flame,
  Gamepad2,
  Pencil,
  Star,
  Timer,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  GAME_STATUSES,
  PRIORITY_META,
  RATING_META,
  STATUS_META,
  formatGameDate,
  formatHours,
  type Game,
  type GameStatus,
} from "@/lib/types";

interface GameCardProps {
  game: Game;
  onUpdate: (id: string, patch: Record<string, unknown>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onOpenDetails: (game: Game) => void;
  onLogTime: (game: Game) => void;
  onEdit: (game: Game) => void;
}

export function GameCard({
  game,
  onUpdate,
  onDelete,
  onOpenDetails,
  onLogTime,
  onEdit,
}: GameCardProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const releaseDate = formatGameDate(game.releaseDate);
  const progress =
    game.avgPlaytime && game.avgPlaytime > 0
      ? Math.min(100, Math.round(((game.hoursPlayed ?? 0) / game.avgPlaytime) * 100))
      : 0;

  const changeStatus = async (status: GameStatus) => {
    if (status === game.status) return;
    try {
      await onUpdate(game.id, { status });
      toast.success(`«${game.title}» — ${STATUS_META[status].label.toLowerCase()}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Ошибка обновления");
    }
  };

  const remove = async () => {
    try {
      await onDelete(game.id);
      toast.success(`«${game.title}» удалена из коллекции`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Ошибка удаления");
    }
  };

  return (
    <div
      onClick={() => onOpenDetails(game)}
      className="group flex cursor-pointer flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
    >
      <div className="relative aspect-[16/9] shrink-0 overflow-hidden bg-muted">
        {game.cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={game.cover}
            alt={`Обложка игры ${game.title}`}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-violet-500/25 via-fuchsia-500/15 to-sky-500/25">
            <Gamepad2 className="h-10 w-10 text-muted-foreground/40" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-black/30" />

        <Badge
          className={cn(
            "pointer-events-none absolute left-2 top-2 border backdrop-blur",
            STATUS_META[game.status].badge
          )}
        >
          <span
            className={cn("mr-1.5 h-1.5 w-1.5 rounded-full", STATUS_META[game.status].dot)}
          />
          {STATUS_META[game.status].label}
        </Badge>

        {game.priority && (
          <Badge
            className={cn(
              "pointer-events-none absolute left-2 top-9 gap-1 border backdrop-blur",
              PRIORITY_META[game.priority].badge
            )}
          >
            {game.priority === "urgent" && <Flame className="h-3 w-3" />}
            {PRIORITY_META[game.priority].label}
          </Badge>
        )}

        {game.favorite && (
          <span
            className="pointer-events-none absolute bottom-9 right-2 rounded-md bg-black/60 p-1 backdrop-blur"
            title="В избранном"
          >
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
          </span>
        )}

        {typeof game.metacritic === "number" && (
          <span className="absolute right-11 top-2 rounded-md bg-black/60 px-1.5 py-0.5 text-xs font-bold text-emerald-400 backdrop-blur">
            {game.metacritic}
          </span>
        )}

        {game.rating && (
          <span
            className="pointer-events-none absolute right-2 top-9 flex rounded-md bg-black/60 p-1 backdrop-blur"
            title={`Оценка: ${RATING_META[game.rating].label}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={RATING_META[game.rating].icon}
              alt={RATING_META[game.rating].label}
              className="h-5 w-5"
            />
          </span>
        )}

        <div
          className="absolute right-2 top-2"
          onClick={(event) => event.stopPropagation()}
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 bg-black/50 text-white hover:bg-black/70 hover:text-white"
                aria-label="Действия с игрой"
              >
                <EllipsisVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Статус
              </DropdownMenuLabel>
              {GAME_STATUSES.map((status) => (
                <DropdownMenuItem
                  key={status}
                  onClick={() => changeStatus(status)}
                  className="gap-2"
                >
                  <span
                    className={cn("h-2 w-2 rounded-full", STATUS_META[status].dot)}
                  />
                  {STATUS_META[status].label}
                  {status === game.status && (
                    <span className="ml-auto text-xs text-muted-foreground">✓</span>
                  )}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onEdit(game)} className="gap-2">
                <Pencil className="h-4 w-4" /> Редактировать
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setConfirmOpen(true)}
                className="gap-2 text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4" /> Удалить
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <h3 className="pointer-events-none absolute inset-x-3 bottom-2 line-clamp-2 text-sm font-semibold leading-snug text-white drop-shadow-md">
          {game.title}
        </h3>
      </div>

      <div className="flex flex-1 flex-col gap-2.5 p-3.5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {releaseDate && (
            <span className="flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" />
              {releaseDate}
            </span>
          )}
          {Boolean(game.avgPlaytime) && (
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />≈ {formatHours(game.avgPlaytime)}
            </span>
          )}
        </div>

        {game.platforms.length > 0 && (
          <p className="truncate text-xs text-muted-foreground/80">
            {game.platforms.join(" · ")}
          </p>
        )}

        <div className="mt-auto space-y-1">
          {game.status === "playing" && game.avgPlaytime ? (
            <>
              <Progress value={progress} className="h-1.5" />
              <p className="text-xs text-muted-foreground">
                {formatHours(game.hoursPlayed)} из ≈ {formatHours(game.avgPlaytime)} ·{" "}
                {progress}%
              </p>
            </>
          ) : (game.hoursPlayed ?? 0) > 0 ? (
            <p className="text-xs text-muted-foreground">
              Наиграно: {formatHours(game.hoursPlayed)}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground/70">Время пока не записано</p>
          )}
        </div>

        <div
          className="flex items-center gap-2 border-t pt-2.5"
          onClick={(event) => event.stopPropagation()}
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs">
                <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_META[game.status].dot)} />
                {STATUS_META[game.status].label}
                <ChevronDown className="h-3 w-3 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {GAME_STATUSES.map((status) => (
                <DropdownMenuItem
                  key={status}
                  onClick={() => changeStatus(status)}
                  className="gap-2"
                >
                  <span className={cn("h-2 w-2 rounded-full", STATUS_META[status].dot)} />
                  {STATUS_META[status].label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 text-xs"
            onClick={() => onLogTime(game)}
          >
            <Timer className="h-3.5 w-3.5" /> Время
          </Button>
        </div>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить «{game.title}»?</AlertDialogTitle>
            <AlertDialogDescription>
              Игра будет удалена из коллекции вместе с записями о времени. Это
              действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                setConfirmOpen(false);
                remove();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
