"use client";

import { useEffect, useState } from "react";
import {
  CalendarDays,
  Clock,
  Gamepad2,
  Loader2,
  Pencil,
  RefreshCw,
  Star,
  Timer,
  Trash2,
  Youtube,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  GAME_STATUSES,
  STATUS_META,
  formatGameDate,
  formatHours,
  normalizeRating,
  type Game,
  type GameRating,
  type GameStatus,
} from "@/lib/types";
import { RatingPicker } from "@/components/rating-picker";
import { VideoDialog } from "@/components/video-dialog";

interface GameDetailsDialogProps {
  game: Game | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (id: string, patch: Record<string, unknown>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onLogTime: (game: Game) => void;
  onEdit: (game: Game) => void;
}

export function GameDetailsDialog({
  game,
  open,
  onOpenChange,
  onUpdate,
  onDelete,
  onLogTime,
  onEdit,
}: GameDetailsDialogProps) {
  const [rating, setRating] = useState<GameRating | null>(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);

  useEffect(() => {
    if (game) {
      setRating(normalizeRating(game.rating) ?? null);
      setNotes(game.notes ?? "");
    }
  }, [game?.id, open]);

  if (!game) return null;

  const sessions = [...(game.sessions ?? [])].sort((a, b) =>
    b.date.localeCompare(a.date)
  );

  const changeStatus = async (status: GameStatus) => {
    if (status === game.status) return;
    try {
      await onUpdate(game.id, { status });
      toast.success(`Статус: ${STATUS_META[status].label}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Ошибка обновления");
    }
  };

  const saveChanges = async () => {
    setSaving(true);
    try {
      await onUpdate(game.id, {
        rating,
        notes: notes.trim(),
      });
      toast.success("Изменения сохранены");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Не удалось сохранить");
    } finally {
      setSaving(false);
    }
  };

  const removeSession = async (sessionId: string) => {
    try {
      await onUpdate(game.id, {
        sessions: (game.sessions ?? []).filter((s) => s.id !== sessionId),
      });
      toast.success("Сессия удалена");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Ошибка удаления");
    }
  };

  const refreshFromRawg = async () => {
    if (!game.rawgId) return;
    setRefreshing(true);
    try {
      const res = await fetch(`/api/rawg/games/${game.rawgId}/`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Ошибка RAWG");
      const fields = data.game;
      await onUpdate(game.id, {
        title: fields.title,
        cover: fields.cover ?? null,
        releaseDate: fields.releaseDate ?? null,
        avgPlaytime: fields.avgPlaytime ?? null,
        metacritic: fields.metacritic ?? null,
        platforms: fields.platforms ?? [],
        genres: fields.genres ?? [],
        description: fields.description ?? null,
        rawgId: fields.rawgId,
      });
      toast.success("Данные обновлены из RAWG");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Ошибка обновления");
    } finally {
      setRefreshing(false);
    }
  };

  const remove = async () => {
    try {
      await onDelete(game.id);
      toast.success(`«${game.title}» удалена`);
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Ошибка удаления");
    }
  };

  const stats = [
    { label: "Дата выхода", value: formatGameDate(game.releaseDate) ?? "—" },
    {
      label: "Ср. время прохождения",
      value: game.avgPlaytime ? `≈ ${formatHours(game.avgPlaytime)}` : "—",
    },
    { label: "Наиграно", value: formatHours(game.hoursPlayed) },
    { label: "Metacritic", value: game.metacritic ? String(game.metacritic) : "—" },
    {
      label: "RAWG-рейтинг",
      value: game.rawgRating ? `${game.rawgRating} / 5` : "—",
    },
    {
      label: "Сюжет / 100%",
      value:
        game.storyTime || game.completionistTime
          ? `${game.storyTime ? `${formatHours(game.storyTime)}` : "—"} / ${
              game.completionistTime ? `${formatHours(game.completionistTime)}` : "—"
            }`
          : "—",
    },
    { label: "В коллекции с", value: formatGameDate(game.createdAt) ?? "—" },
    {
      label: game.completedAt ? "Пройдена" : "Начата",
      value: formatGameDate(game.completedAt ?? game.startedAt) ?? "—",
    },
  ];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="overflow-y-auto sm:max-w-2xl">
          <DialogHeader className="sr-only">
            <DialogTitle>{game.title}</DialogTitle>
          </DialogHeader>

          <div className="relative -mx-4 -mt-4 overflow-hidden rounded-t-2xl sm:-mx-4 sm:rounded-xl">
            <div className="aspect-[16/7] w-full bg-muted">
              {game.cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={game.cover}
                  alt={`Обложка игры ${game.title}`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-violet-500/25 via-fuchsia-500/15 to-sky-500/25">
                  <Gamepad2 className="h-12 w-12 text-muted-foreground/40" />
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="flex items-center gap-1.5 break-words text-xl font-bold tracking-tight">
                {game.title}
                {game.favorite && (
                  <Star className="h-4 w-4 shrink-0 fill-yellow-400 text-yellow-400" />
                )}
              </h2>
              {game.platforms.length > 0 && (
                <p className="mt-0.5 break-words text-sm text-muted-foreground">
                  {game.platforms.join(" · ")}
                </p>
              )}
              {(game.developer || game.publisher) && (
                <p className="mt-0.5 break-words text-xs text-muted-foreground/80">
                  {[game.developer, game.publisher].filter(Boolean).join(" · ")}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 shadow-comic-sm"
                onClick={() => setVideoOpen(true)}
              >
                <Youtube className="h-4 w-4 text-red-500" /> Трейлер
              </Button>
              <Select value={game.status} onValueChange={changeStatus}>
                <SelectTrigger
                  className={cn("w-40 border", STATUS_META[game.status].badge)}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GAME_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      <span className="flex items-center gap-2">
                        <span
                          className={cn(
                            "h-2 w-2 rounded-full",
                            STATUS_META[status].dot
                          )}
                        />
                        {STATUS_META[status].label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {stats.map((stat) => (
              <div key={stat.label} className="min-w-0 rounded-lg border bg-background/50 p-2.5">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  {stat.label}
                </p>
                <p className="mt-0.5 break-words text-sm font-semibold">{stat.value}</p>
              </div>
            ))}
          </div>

          {game.review && (
            <div className="space-y-1">
              <h3 className="text-sm font-semibold">Отзыв</h3>
              <p className="whitespace-pre-line break-words rounded-lg border bg-background/50 p-3 text-sm leading-relaxed">
                {game.review}
              </p>
            </div>
          )}

          {game.description && (
            <div className="space-y-1">
              <h3 className="text-sm font-semibold">Описание</h3>
              <p className="max-h-32 overflow-y-auto whitespace-pre-line break-words rounded-lg border bg-background/50 p-3 text-sm leading-relaxed text-muted-foreground">
                {game.description}
              </p>
            </div>
          )}

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Личная оценка</Label>
              <RatingPicker value={rating} onChange={setRating} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="details-notes">Заметки</Label>
              <Textarea
                id="details-notes"
                rows={2}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Личные заметки о прохождении…"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">
                Журнал сессий{" "}
                <span className="font-normal text-muted-foreground">
                  ({sessions.length})
                </span>
              </h3>
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1.5 text-xs"
                onClick={() => onLogTime(game)}
              >
                <Timer className="h-3.5 w-3.5" /> Записать
              </Button>
            </div>
            {sessions.length === 0 ? (
              <p className="rounded-lg border border-dashed px-3 py-3 text-center text-sm text-muted-foreground">
                Сессий пока нет — запишите первую игровую сессию
              </p>
            ) : (
              <div className="max-h-36 space-y-1 overflow-y-auto pr-1">
                {sessions.slice(0, 12).map((session) => (
                  <div
                    key={session.id}
                    className="flex min-w-0 items-center justify-between gap-2 rounded-lg border px-3 py-1.5 text-sm"
                  >
                    <span className="flex min-w-0 items-center gap-2 text-muted-foreground">
                      <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                      <span className="min-w-0 break-words">{formatGameDate(session.date)}</span>
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="flex items-center gap-1 font-medium">
                        <Clock className="h-3.5 w-3.5 text-primary" />
                        {formatHours(session.hours)}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeSession(session.id)}
                        className="rounded p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                        aria-label="Удалить сессию"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t pt-3">
            <Button onClick={saveChanges} disabled={saving} size="sm">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Сохранить
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(game)}
              className="gap-1.5"
            >
              <Pencil className="h-3.5 w-3.5" /> Редактировать
            </Button>
            {game.rawgId && (
              <Button
                variant="outline"
                size="sm"
                onClick={refreshFromRawg}
                disabled={refreshing}
                className="gap-1.5"
              >
                {refreshing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
                Обновить из RAWG
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfirmOpen(true)}
              className="ml-auto gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" /> Удалить
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <VideoDialog
        gameTitle={game.title}
        gameId={game.id}
        open={videoOpen}
        onOpenChange={setVideoOpen}
      />

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить «{game.title}»?</AlertDialogTitle>
            <AlertDialogDescription>
              Игра будет удалена вместе с журналом сессий. Это действие нельзя
              отменить.
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
    </>
  );
}
