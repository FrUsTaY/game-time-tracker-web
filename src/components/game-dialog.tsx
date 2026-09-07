"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Gamepad2, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  GAME_STATUSES,
  GAME_PRIORITIES,
  GENRE_PRESETS,
  PLATFORM_PRESETS,
  PRIORITY_META,
  STATUS_META,
  formatHours,
  normalizeRating,
  type Game,
  type GameDraft,
  type GamePriority,
  type GameRating,
  type GameStatus,
} from "@/lib/types";
import { RatingPicker } from "@/components/rating-picker";
import { Switch } from "@/components/ui/switch";

interface RawgResult {
  rawgId: number;
  title: string;
  cover?: string;
  description?: string;
  platforms: string[];
  genres?: string[];
  releaseDate?: string;
  avgPlaytime?: number;
  metacritic?: number;
  developer?: string;
  publisher?: string;
  rawgRating?: number;
  storyTime?: number;
  completionistTime?: number;
}

interface GameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  game?: Game | null;
  defaultStatus?: GameStatus;
  onSubmit: (draft: GameDraft) => Promise<unknown>;
}

const EMPTY = {
  title: "",
  cover: "",
  releaseDate: "",
  avgPlaytime: "",
  rating: undefined as GameRating | null,
  notes: "",
  status: "backlog" as GameStatus,
  platforms: [] as string[],
  description: undefined as string | undefined,
  genres: undefined as string[] | undefined,
  metacritic: undefined as number | undefined,
  rawgId: undefined as number | undefined,
  developer: "",
  publisher: "",
  rawgRating: "" as string,
  storyTime: "" as string,
  completionistTime: "" as string,
  review: "",
  favorite: false,
  priority: undefined as GamePriority | undefined,
};

export function GameDialog({
  open,
  onOpenChange,
  game,
  defaultStatus = "backlog",
  onSubmit,
}: GameDialogProps) {
  const isEdit = Boolean(game);
  const [tab, setTab] = useState<"search" | "manual">("search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<RawgResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY, status: defaultStatus });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (game) {
      setForm({
        title: game.title,
        cover: game.cover ?? "",
        releaseDate: game.releaseDate ?? "",
        avgPlaytime: game.avgPlaytime ? String(game.avgPlaytime) : "",
        rating: normalizeRating(game.rating) ?? null,
        notes: game.notes ?? "",
        status: game.status,
        platforms: game.platforms ?? [],
        description: game.description,
        genres: game.genres,
        metacritic: game.metacritic,
        rawgId: game.rawgId,
        developer: game.developer ?? "",
        publisher: game.publisher ?? "",
        rawgRating: game.rawgRating ? String(game.rawgRating) : "",
        storyTime: game.storyTime ? String(game.storyTime) : "",
        completionistTime: game.completionistTime ? String(game.completionistTime) : "",
        review: game.review ?? "",
        favorite: game.favorite ?? false,
        priority: game.priority,
      });
    } else {
      setForm({ ...EMPTY, status: defaultStatus });
      setQuery("");
      setResults([]);
      setSearchError(null);
      setTab("search");
    }
  }, [open, game, defaultStatus]);

  useEffect(() => {
    if (!open || tab !== "search" || isEdit) return;
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setSearchError(null);
      setSearching(false);
      return;
    }
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/rawg/search/?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? "Ошибка поиска");
        setResults(data.results ?? []);
        setSearchError(null);
      } catch (error) {
        setResults([]);
        setSearchError(error instanceof Error ? error.message : "Ошибка поиска");
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [query, open, tab, isEdit]);

  const platformOptions = useMemo(
    () => [...new Set([...PLATFORM_PRESETS, ...form.platforms])],
    [form.platforms]
  );

  const applyResult = (result: RawgResult) => {
    setForm((prev) => ({
      ...prev,
      title: result.title,
      cover: result.cover ?? prev.cover,
      releaseDate: result.releaseDate?.slice(0, 10) ?? prev.releaseDate,
      avgPlaytime: result.avgPlaytime ? String(result.avgPlaytime) : prev.avgPlaytime,
      platforms: result.platforms.length ? result.platforms : prev.platforms,
      description: result.description,
      genres: result.genres,
      metacritic: result.metacritic,
      rawgId: result.rawgId,
      developer: result.developer ?? prev.developer,
      publisher: result.publisher ?? prev.publisher,
      rawgRating: result.rawgRating ? String(result.rawgRating) : prev.rawgRating,
      storyTime: result.storyTime ? String(result.storyTime) : prev.storyTime,
      completionistTime: result.completionistTime
        ? String(result.completionistTime)
        : prev.completionistTime,
    }));

    // В поисковой выдаче RAWG нет playtime — добираем из детальной карточки игры
    fetch(`/api/rawg/games/${result.rawgId}/`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { game?: Partial<RawgResult> } | null) => {
        const details = data?.game;
        if (!details) return;
        setForm((prev) => ({
          ...prev,
          avgPlaytime: details.avgPlaytime
            ? String(details.avgPlaytime)
            : prev.avgPlaytime,
          metacritic: details.metacritic ?? prev.metacritic,
          cover: details.cover ?? prev.cover,
          releaseDate: details.releaseDate?.slice(0, 10) ?? prev.releaseDate,
          platforms: details.platforms?.length ? details.platforms : prev.platforms,
          genres: details.genres ?? prev.genres,
          description: details.description ?? prev.description,
          developer: details.developer ?? prev.developer,
          publisher: details.publisher ?? prev.publisher,
          rawgRating: details.rawgRating ? String(details.rawgRating) : prev.rawgRating,
          storyTime: details.storyTime ? String(details.storyTime) : prev.storyTime,
          completionistTime: details.completionistTime
            ? String(details.completionistTime)
            : prev.completionistTime,
        }));
      })
      .catch(() => undefined);
  };

  const togglePlatform = (platform: string) => {
    setForm((prev) => ({
      ...prev,
      platforms: prev.platforms.includes(platform)
        ? prev.platforms.filter((p) => p !== platform)
        : [...prev.platforms, platform],
    }));
  };

  const toggleGenre = (genre: string) => {
    setForm((prev) => ({
      ...prev,
      genres: prev.genres?.includes(genre)
        ? prev.genres.filter((g) => g !== genre)
        : [...(prev.genres ?? []), genre],
    }));
  };

  const submit = async () => {
    if (!form.title.trim()) {
      toast.error("Введите название игры");
      return;
    }
    setSaving(true);
    try {
      await onSubmit({
        title: form.title.trim(),
        status: form.status,
        platforms: form.platforms,
        cover: form.cover.trim() || undefined,
        releaseDate: form.releaseDate || undefined,
        avgPlaytime: form.avgPlaytime ? Number(form.avgPlaytime) : undefined,
        rating: form.rating,
        notes: form.notes.trim() || undefined,
        description: form.description,
        genres: form.genres,
        metacritic: form.metacritic,
        rawgId: form.rawgId,
        developer: form.developer.trim() || undefined,
        publisher: form.publisher.trim() || undefined,
        rawgRating: form.rawgRating ? Number(form.rawgRating) : undefined,
        storyTime: form.storyTime ? Number(form.storyTime) : undefined,
        completionistTime: form.completionistTime
          ? Number(form.completionistTime)
          : undefined,
        review: form.review.trim() || undefined,
        favorite: form.favorite || undefined,
        priority: form.priority,
      });
      toast.success(game ? "Изменения сохранены" : `«${form.title.trim()}» добавлена`);
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Не удалось сохранить");
    } finally {
      setSaving(false);
    }
  };

  const formFields = (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="game-title">Название *</Label>
        <Input
          id="game-title"
          value={form.title}
          onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
          placeholder="Например, Hades II"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="game-release">Дата выхода</Label>
          <Input
            id="game-release"
            type="date"
            value={form.releaseDate}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, releaseDate: event.target.value }))
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="game-playtime">Ср. время прохождения, ч</Label>
          <Input
            id="game-playtime"
            type="number"
            min="0"
            step="1"
            value={form.avgPlaytime}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, avgPlaytime: event.target.value }))
            }
            placeholder="напр. 40"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="game-story">Основной сюжет, ч</Label>
          <Input
            id="game-story"
            type="number"
            min="0"
            step="1"
            value={form.storyTime}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, storyTime: event.target.value }))
            }
            placeholder="напр. 12"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="game-completionist">100% прохождение, ч</Label>
          <Input
            id="game-completionist"
            type="number"
            min="0"
            step="1"
            value={form.completionistTime}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, completionistTime: event.target.value }))
            }
            placeholder="напр. 55"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="game-developer">Разработчик</Label>
          <Input
            id="game-developer"
            value={form.developer}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, developer: event.target.value }))
            }
            placeholder="напр. Supergiant Games"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="game-publisher">Издатель</Label>
          <Input
            id="game-publisher"
            value={form.publisher}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, publisher: event.target.value }))
            }
            placeholder="напр. Electronic Arts"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Жанры</Label>
        <div className="flex flex-wrap gap-1.5">
          {GENRE_PRESETS.map((genre) => {
            const active = form.genres?.includes(genre);
            return (
              <button
                key={genre}
                type="button"
                onClick={() => toggleGenre(genre)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs transition-colors",
                  active
                    ? "border-primary bg-primary/10 font-medium text-primary"
                    : "text-muted-foreground hover:border-primary/40 hover:text-foreground"
                )}
              >
                {genre}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Платформы</Label>
        <div className="flex flex-wrap gap-1.5">
          {platformOptions.map((platform) => {
            const active = form.platforms.includes(platform);
            return (
              <button
                key={platform}
                type="button"
                onClick={() => togglePlatform(platform)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs transition-colors",
                  active
                    ? "border-primary bg-primary/10 font-medium text-primary"
                    : "text-muted-foreground hover:border-primary/40 hover:text-foreground"
                )}
              >
                {platform}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Статус</Label>
        <Select
          value={form.status}
          onValueChange={(value) =>
            setForm((prev) => ({ ...prev, status: value as GameStatus }))
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {GAME_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {STATUS_META[status].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>Приоритет</Label>
        <Select
          value={form.priority ?? "none"}
          onValueChange={(value) =>
            setForm((prev) => ({
              ...prev,
              priority: value === "none" ? undefined : (value as GamePriority),
            }))
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Не задан" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Не задан</SelectItem>
            {GAME_PRIORITIES.map((priority) => (
              <SelectItem key={priority} value={priority}>
                {PRIORITY_META[priority].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
        <div>
          <Label htmlFor="game-favorite" className="text-sm">
            Избранное
          </Label>
          <p className="text-xs text-muted-foreground">
            Выделить игру звездой в списках
          </p>
        </div>
        <Switch
          id="game-favorite"
          checked={form.favorite}
          onCheckedChange={(checked) =>
            setForm((prev) => ({ ...prev, favorite: checked }))
          }
        />
      </div>

      <div className="space-y-1.5">
        <Label>Личная оценка</Label>
        <RatingPicker
          value={form.rating ?? null}
          onChange={(value) =>
            setForm((prev) => ({ ...prev, rating: value }))
          }
        />
        <p className="text-[11px] text-muted-foreground">
          Повторный клик по выбранной оценке сбрасывает её.
        </p>
      </div>

      {!isEdit && (
        <div className="space-y-1.5">
          <Label htmlFor="game-cover">Обложка (URL)</Label>
          <Input
            id="game-cover"
            value={form.cover}
            onChange={(event) => setForm((prev) => ({ ...prev, cover: event.target.value }))}
            placeholder="https://…"
          />
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="game-review">Отзыв</Label>
        <Textarea
          id="game-review"
          rows={3}
          value={form.review}
          onChange={(event) => setForm((prev) => ({ ...prev, review: event.target.value }))}
          placeholder="Впечатления после прохождения…"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="game-notes">Заметки</Label>
        <Textarea
          id="game-notes"
          rows={2}
          value={form.notes}
          onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
          placeholder="Где сохранился, что понравилось…"
        />
      </div>

      <Button onClick={submit} disabled={saving} className="w-full">
        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {isEdit ? "Сохранить изменения" : "Добавить игру"}
      </Button>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Редактирование игры" : "Добавить игру"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Обновите данные игры."
              : "Найдите игру через RAWG — обложка, дата выхода и среднее время прохождения подставятся автоматически, либо заполните вручную."}
          </DialogDescription>
        </DialogHeader>

        {!isEdit && (
          <Tabs value={tab} onValueChange={(value) => setTab(value as "search" | "manual")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="search">Поиск RAWG</TabsTrigger>
              <TabsTrigger value="manual">Вручную</TabsTrigger>
            </TabsList>
            <TabsContent value="search" className="mt-3 space-y-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Начните вводить название…"
                  className="pl-8"
                />
              </div>

              {searchError && (
                <Alert>
                  <AlertTitle>Поиск недоступен</AlertTitle>
                  <AlertDescription className="flex flex-col gap-2">
                    <span>{searchError}</span>
                    <span className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setTab("manual")}
                      >
                        Заполнить вручную
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => window.open("/settings", "_self")}
                      >
                        Настройки API <ExternalLink className="ml-1 h-3 w-3" />
                      </Button>
                    </span>
                  </AlertDescription>
                </Alert>
              )}

              {searching && (
                <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Ищем игры…
                </div>
              )}

              {!searching && query.trim().length >= 2 && !searchError && (
                <div className="max-h-56 space-y-1.5 overflow-y-auto pr-1">
                  {results.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">
                      Ничего не найдено
                    </p>
                  ) : (
                    results.map((result) => (
                      <button
                        key={result.rawgId}
                        type="button"
                        onClick={() => applyResult(result)}
                        className="flex w-full items-center gap-3 rounded-lg border p-2 text-left transition-colors hover:border-primary/50 hover:bg-accent"
                      >
                        <span className="flex h-12 w-20 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
                          {result.cover ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={result.cover}
                              alt=""
                              loading="lazy"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <Gamepad2 className="h-5 w-5 text-muted-foreground/50" />
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">
                            {result.title}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {[
                              result.releaseDate?.slice(0, 4),
                              result.platforms.slice(0, 3).join(", "),
                              result.avgPlaytime
                                ? `≈ ${formatHours(result.avgPlaytime)}`
                                : null,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}

              {!searching && query.trim().length < 2 && !searchError && (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  Введите минимум 2 символа
                </p>
              )}

              {form.rawgId && (
                <p className="rounded-lg bg-primary/10 px-3 py-2 text-xs text-primary">
                  Данные «{form.title}» подгружены из RAWG — при необходимости
                  поправьте их ниже.
                </p>
              )}
            </TabsContent>
            <TabsContent value="manual" className="mt-3">
              {formFields}
            </TabsContent>
          </Tabs>
        )}

        {isEdit && <div className="mt-2">{formFields}</div>}

        {!isEdit && tab === "search" && (
          <details className="text-sm">
            <summary className="cursor-pointer text-muted-foreground">
              Уточнить поля вручную
            </summary>
            <div className="mt-3">{formFields}</div>
          </details>
        )}
      </DialogContent>
    </Dialog>
  );
}
