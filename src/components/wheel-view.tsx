"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Check, Dices, Loader2, Shuffle, Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { VideoDialog } from "@/components/video-dialog";
import { useGames } from "@/hooks/use-games";
import { cn } from "@/lib/utils";
import {
  GAME_PRIORITIES,
  PRIORITY_META,
  RATING_META,
  formatHours,
  normalizeRating,
  type Game,
  type GamePriority,
} from "@/lib/types";

type DurationBucket = "any" | "short" | "medium" | "long" | "epic";

const DURATIONS: { id: DurationBucket; label: string; min: number; max: number }[] = [
  { id: "any", label: "Любая", min: 0, max: Infinity },
  { id: "short", label: "< 6 ч", min: 0, max: 6 },
  { id: "medium", label: "6–15 ч", min: 6, max: 15 },
  { id: "long", label: "15–30 ч", min: 15, max: 30 },
  { id: "epic", label: "30+ ч", min: 30, max: Infinity },
];

const SEGMENT_COLORS = [
  "hsl(178 85% 48%)",
  "hsl(335 95% 58%)",
  "hsl(48 100% 58%)",
  "hsl(262 85% 62%)",
  "hsl(14 95% 55%)",
];

const INK = "hsl(245 30% 6%)";
const PAPER = "hsl(0 0% 97%)";

function estimateHours(game: Game): number | undefined {
  return game.avgPlaytime ?? game.storyTime ?? game.completionistTime;
}

function playTick(ctx: AudioContext) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "square";
  osc.frequency.value = 900 + Math.random() * 300;
  gain.gain.setValueAtTime(0.08, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.06);
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.07);
}

function playFanfare(ctx: AudioContext) {
  const notes = [523.25, 659.25, 783.99, 1046.5];
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.value = freq;
    const start = ctx.currentTime + i * 0.12;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.12, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.35);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.4);
  });
}

export function WheelView() {
  const { games, loading, error, updateGame, refresh } = useGames();

  const [platform, setPlatform] = useState("all");
  const [genre, setGenre] = useState("all");
  const [priority, setPriority] = useState<"all" | GamePriority>("all");
  const [duration, setDuration] = useState<DurationBucket>("any");
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [sound, setSound] = useState(true);

  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState<Game | null>(null);
  const [revealOpen, setRevealOpen] = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rotationRef = useRef(0);
  const audioRef = useRef<AudioContext | null>(null);
  const spinRaf = useRef<number>(0);

  const getAudio = useCallback(() => {
    if (!sound) return null;
    if (!audioRef.current) {
      audioRef.current = new AudioContext();
    }
    if (audioRef.current.state === "suspended") {
      void audioRef.current.resume();
    }
    return audioRef.current;
  }, [sound]);

  // Пул: активный бэклог (бэклог + пауза), фильтры, ручные исключения
  const pool = useMemo(() => {
    const candidates = games.filter(
      (game) => game.status === "backlog" || game.status === "paused"
    );
    const durationInfo = DURATIONS.find((d) => d.id === duration)!;
    return candidates.filter((game) => {
      if (excluded.has(game.id)) return false;
      if (platform !== "all" && !game.platforms.includes(platform)) return false;
      if (genre !== "all" && !(game.genres ?? []).includes(genre)) return false;
      if (priority !== "all" && game.priority !== priority) return false;
      if (duration !== "any") {
        const hours = estimateHours(game);
        if (hours === undefined) return false;
        if (hours < durationInfo.min || hours >= durationInfo.max) return false;
      }
      return true;
    });
  }, [games, excluded, platform, genre, priority, duration]);

  const availablePlatforms = useMemo(() => {
    const set = new Set<string>();
    for (const game of games) {
      for (const p of game.platforms) set.add(p);
    }
    return [...set].sort((a, b) => a.localeCompare(b, "ru"));
  }, [games]);

  const availableGenres = useMemo(() => {
    const set = new Set<string>();
    for (const game of games) {
      for (const g of game.genres ?? []) set.add(g);
    }
    return [...set].sort((a, b) => a.localeCompare(b, "ru"));
  }, [games]);

  const applyPreset = (preset: "quick" | "story" | "priority") => {
    setExcluded(new Set());
    if (preset === "quick") {
      setDuration("short");
      setPriority("all");
      setGenre("all");
      toast.info("Быстрый вечер: игры до 10 часов");
    } else if (preset === "story") {
      setGenre("Сюжетная");
      setDuration("any");
      toast.info("Сюжетные шедевры");
    } else {
      setPriority("urgent");
      setGenre("all");
      setDuration("any");
      toast.info("Главный приоритет: срочные игры");
    }
  };

  const shufflePool = () => {
    setExcluded(new Set());
    setPlatform("all");
    setGenre("all");
    setPriority("all");
    setDuration("any");
    toast.success("Пул сброшен и перемешан");
  };

  const drawWheel = useCallback(
    (angle: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const size = canvas.width;
      const cx = size / 2;
      const cy = size / 2;
      const radius = size / 2 - 10;

      ctx.clearRect(0, 0, size, size);

      // Внешнее «комиксное» кольцо
      ctx.beginPath();
      ctx.arc(cx, cy, radius + 8, 0, Math.PI * 2);
      ctx.fillStyle = INK;
      ctx.fill();

      if (pool.length === 0) {
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fillStyle = PAPER;
        ctx.fill();
        ctx.fillStyle = INK;
        ctx.font = "bold 22px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("Пул пуст", cx, cy - 14);
        ctx.font = "14px system-ui, sans-serif";
        ctx.fillText("Настрой фильтры или добавь бэклог", cx, cy + 16);
        return;
      }

      const segAngle = (Math.PI * 2) / pool.length;

      pool.forEach((game, i) => {
        const start = angle + i * segAngle;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, radius, start, start + segAngle);
        ctx.closePath();
        ctx.fillStyle = SEGMENT_COLORS[i % SEGMENT_COLORS.length];
        ctx.fill();
        ctx.strokeStyle = INK;
        ctx.lineWidth = 4;
        ctx.stroke();

        // Подпись
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(start + segAngle / 2);
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        const label =
          game.title.length > 26 ? `${game.title.slice(0, 25)}…` : game.title;
        ctx.fillStyle = INK;
        ctx.font = "bold 17px system-ui, sans-serif";
        ctx.fillText(label, radius - 14, 0);
        ctx.restore();
      });

      // Ступица
      ctx.beginPath();
      ctx.arc(cx, cy, 34, 0, Math.PI * 2);
      ctx.fillStyle = INK;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx, cy, 26, 0, Math.PI * 2);
      ctx.fillStyle = PAPER;
      ctx.fill();
      ctx.fillStyle = INK;
      ctx.font = "bold 16px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(pool.length), cx, cy + 1);

      // Стрелка-указатель сверху
      ctx.beginPath();
      ctx.moveTo(cx - 16, 6);
      ctx.lineTo(cx + 16, 6);
      ctx.lineTo(cx, 34);
      ctx.closePath();
      ctx.fillStyle = "hsl(335 100% 55%)";
      ctx.strokeStyle = INK;
      ctx.lineWidth = 4;
      ctx.fill();
      ctx.stroke();
    },
    [pool]
  );

  useEffect(() => {
    drawWheel(rotationRef.current);
  }, [drawWheel]);

  const segmentAtPointer = (angle: number): number => {
    if (pool.length === 0) return -1;
    const segAngle = (Math.PI * 2) / pool.length;
    const pointerAngle = -Math.PI / 2;
    const rel = ((pointerAngle - angle) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
    return Math.floor(rel / segAngle) % pool.length;
  };

  const spin = () => {
    if (spinning || pool.length < 2) return;
    const audio = getAudio();
    setSpinning(true);
    setRevealOpen(false);
    setWinner(null);

    const startRotation = rotationRef.current;
    const turns = 6 + Math.random() * 3;
    const targetRotation = startRotation + turns * Math.PI * 2 + Math.random() * Math.PI * 2;
    const durationMs = 4800 + Math.random() * 1200;
    const startTime = performance.now();
    let lastSegment = segmentAtPointer(startRotation);

    const frame = (now: number) => {
      const t = Math.min(1, (now - startTime) / durationMs);
      const eased = 1 - Math.pow(1 - t, 4);
      const angle = startRotation + (targetRotation - startRotation) * eased;
      rotationRef.current = angle;
      setRotation(angle);
      drawWheel(angle);

      const seg = segmentAtPointer(angle);
      if (seg !== lastSegment && audio) playTick(audio);
      lastSegment = seg;

      if (t < 1) {
        spinRaf.current = requestAnimationFrame(frame);
        return;
      }

      setSpinning(false);
      const index = segmentAtPointer(angle);
      const picked = pool[index] ?? null;
      if (audio) playFanfare(audio);
      if (picked) {
        setWinner(picked);
        setRevealOpen(true);
      }
    };

    spinRaf.current = requestAnimationFrame(frame);
  };

  useEffect(() => {
    return () => cancelAnimationFrame(spinRaf.current);
  }, []);

  const startWinner = async () => {
    if (!winner) return;
    try {
      await updateGame(winner.id, {
        status: "playing",
        ...(winner.startedAt ? {} : { startedAt: new Date().toISOString().slice(0, 10) }),
      });
      toast.success(`«${winner.title}» теперь в процессе`);
      setRevealOpen(false);
      void refresh();
    } catch {
      toast.error("Не удалось обновить статус");
    }
  };

  const winnerRating = winner ? normalizeRating(winner.rating) : undefined;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-10">
      <div className="flex items-center gap-3">
        <div className="comic-panel-sm flex h-11 w-11 items-center justify-center">
          <Dices className="h-5 w-5" />
        </div>
        <div>
          <h1 className="font-display glitch-title text-2xl font-bold tracking-tight md:text-3xl">
            Колесо выбора
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            «Во что сегодня играть?» — решает фортуна
          </p>
        </div>
      </div>

      {loading ? (
        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
          <Skeleton className="aspect-square w-full rounded-full" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      ) : error ? (
        <Alert variant="destructive" className="mt-8">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Не удалось загрузить библиотеку</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : (
        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
          {/* Колесо */}
          <div className="comic-panel flex flex-col items-center gap-5 p-5">
            <div className="relative w-full max-w-md">
              <canvas
                ref={canvasRef}
                width={520}
                height={520}
                className={cn(
                  "aspect-square w-full rounded-full",
                  spinning && "animate-pulse"
                )}
              />
            </div>
            <div className="flex w-full flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Button
                size="lg"
                onClick={spin}
                disabled={spinning || pool.length < 2}
                className="w-full font-display tracking-wide shadow-comic-magenta sm:w-auto"
              >
                {spinning ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Крутится…
                  </>
                ) : (
                  <>
                    <Dices className="mr-2 h-5 w-5" />
                    {pool.length < 2 ? "Нужно минимум 2 игры" : "Крутить колесо!"}
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSound((s) => !s)}
                title={sound ? "Выключить звук" : "Включить звук"}
              >
                {sound ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </Button>
              <Button variant="outline" onClick={shufflePool} title="Сбросить фильтры">
                <Shuffle className="mr-2 h-4 w-4" /> Перемешать
              </Button>
            </div>
          </div>

          {/* Фильтры и пул */}
          <div className="space-y-4">
            <div className="comic-panel p-4">
              <h3 className="font-display text-sm font-bold uppercase tracking-wide">
                Пресеты
              </h3>
              <div className="mt-3 flex flex-col gap-2">
                <Button variant="outline" size="sm" onClick={() => applyPreset("quick")}>
                  Быстрый вечер (&lt;10ч)
                </Button>
                <Button variant="outline" size="sm" onClick={() => applyPreset("story")}>
                  Сюжетные шедевры
                </Button>
                <Button variant="outline" size="sm" onClick={() => applyPreset("priority")}>
                  Главный приоритет
                </Button>
              </div>

              <h3 className="mt-5 font-display text-sm font-bold uppercase tracking-wide">
                Фильтры пула
              </h3>
              <div className="mt-3 space-y-3">
                <Select value={platform} onValueChange={setPlatform}>
                  <SelectTrigger>
                    <SelectValue placeholder="Платформа" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все платформы</SelectItem>
                    {availablePlatforms.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={genre} onValueChange={setGenre}>
                  <SelectTrigger>
                    <SelectValue placeholder="Жанр" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все жанры</SelectItem>
                    {availableGenres.map((g) => (
                      <SelectItem key={g} value={g}>
                        {g}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={priority}
                  onValueChange={(value) => setPriority(value as typeof priority)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Приоритет" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Любой приоритет</SelectItem>
                    {GAME_PRIORITIES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {PRIORITY_META[p].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex flex-wrap gap-1.5">
                  {DURATIONS.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setDuration(d.id)}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-xs transition-colors",
                        duration === d.id
                          ? "border-foreground bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                      )}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="comic-panel p-4">
              <h3 className="font-display text-sm font-bold uppercase tracking-wide">
                Кандидаты ({pool.length})
              </h3>
              {pool.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  Пусто — ослабьте фильтры или добавьте игр в бэклог
                </p>
              ) : (
                <div className="mt-3 max-h-72 space-y-1.5 overflow-y-auto pr-1">
                  {pool.map((game) => (
                    <button
                      key={game.id}
                      type="button"
                      onClick={() =>
                        setExcluded((prev) => {
                          const next = new Set(prev);
                          if (next.has(game.id)) next.delete(game.id);
                          else next.add(game.id);
                          return next;
                        })
                      }
                      className={cn(
                        "flex w-full items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left text-sm transition-colors",
                        excluded.has(game.id)
                          ? "opacity-40 line-through"
                          : "hover:border-primary/50 hover:bg-primary/5"
                      )}
                      title={excluded.has(game.id) ? "Вернуть в пул" : "Исключить из пула"}
                    >
                      {excluded.has(game.id) ? (
                        <Shuffle className="h-3.5 w-3.5 shrink-0" />
                      ) : (
                        <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
                      )}
                      <span className="min-w-0 flex-1 truncate">{game.title}</span>
                      {estimateHours(game) !== undefined && (
                        <span className="shrink-0 text-xs text-muted-foreground">
                          ≈{formatHours(estimateHours(game)!)}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reveal Stage */}
      <Dialog open={revealOpen} onOpenChange={setRevealOpen}>
        <DialogContent className="max-h-[92dvh] overflow-y-auto overflow-x-hidden sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-comic text-center text-3xl tracking-wide glitch-title">
              {winner?.title ?? ""}
            </DialogTitle>
          </DialogHeader>
          {winner && (
            <div className="space-y-4">
              <div className="comic-panel overflow-hidden">
                {winner.cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={winner.cover}
                    alt={winner.title}
                    className="aspect-video w-full object-cover"
                  />
                ) : (
                  <div className="flex aspect-video items-center justify-center bg-muted text-4xl">
                    <Dices className="h-10 w-10 text-muted-foreground/40" />
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-1.5 p-3">
                  {winner.platforms.slice(0, 3).map((platform) => (
                    <span
                      key={platform}
                      className="rounded-full border bg-background/60 px-2 py-0.5 text-[11px]"
                    >
                      {platform}
                    </span>
                  ))}
                  {(winner.genres ?? []).slice(0, 3).map((g) => (
                    <span
                      key={g}
                      className="rounded-full border bg-background/60 px-2 py-0.5 text-[11px]"
                    >
                      {g}
                    </span>
                  ))}
                  {estimateHours(winner) !== undefined && (
                    <span className="rounded-full border bg-background/60 px-2 py-0.5 text-[11px]">
                      ≈{formatHours(estimateHours(winner)!)}
                    </span>
                  )}
                  {winnerRating && (
                    <span
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-[11px]",
                        RATING_META[winnerRating].active
                      )}
                    >
                      {RATING_META[winnerRating].label}
                    </span>
                  )}
                </div>
              </div>
              {winner.notes && (
                <p className="rounded-lg border bg-background/50 p-3 text-sm text-muted-foreground">
                  {winner.notes}
                </p>
              )}
              <div className="flex flex-col gap-2">
                <Button onClick={startWinner} className="font-display tracking-wide">
                  Начать проходить сейчас
                </Button>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" onClick={() => setVideoOpen(true)}>
                    Смотреть трейлер
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setRevealOpen(false);
                      setTimeout(() => spin(), 300);
                    }}
                  >
                    Крутить ещё раз
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {winner && (
        <VideoDialog
          gameTitle={winner.title}
          gameId={winner.id}
          open={videoOpen}
          onOpenChange={setVideoOpen}
        />
      )}
    </div>
  );
}
