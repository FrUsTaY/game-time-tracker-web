"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink, Loader2, Play, SendHorizonal, Youtube } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type VideoMode = "trailer" | "gameplay" | "review";

interface VideoResult {
  videoId: string;
  title: string;
  channel: string;
  thumbnail: string;
}

const MODES: { id: VideoMode; label: string; suffix: string }[] = [
  { id: "trailer", label: "Трейлер", suffix: "трейлер" },
  { id: "gameplay", label: "Геймплей", suffix: "gameplay прохождение" },
  { id: "review", label: "Обзор StopGame", suffix: "обзор StopGame" },
];

function extractVideoId(input: string): string | null {
  const raw = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(raw)) return raw;
  const match = raw.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  return match?.[1] ?? null;
}

interface VideoDialogProps {
  gameTitle: string;
  gameId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialMode?: VideoMode;
}

export function VideoDialog({
  gameTitle,
  gameId,
  open,
  onOpenChange,
  initialMode = "trailer",
}: VideoDialogProps) {
  const [mode, setMode] = useState<VideoMode>(initialMode);
  const [results, setResults] = useState<VideoResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [failReason, setFailReason] = useState<string | null>(null);
  const [manualUrl, setManualUrl] = useState("");
  const [playing, setPlaying] = useState<VideoResult | null>(null);
  const [customId, setCustomId] = useState<string | null>(null);

  const query = useMemo(() => {
    const modeInfo = MODES.find((m) => m.id === mode)!;
    return `${gameTitle} ${modeInfo.suffix}`;
  }, [gameTitle, mode]);

  useEffect(() => {
    if (!open) {
      setPlaying(null);
      setCustomId(null);
      setManualUrl("");
      setMode(initialMode);
      setFailReason(null);
      return;
    }
  }, [open, initialMode]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setResults(null);
    setFailReason(null);
    fetch(`/api/youtube/search?q=${encodeURIComponent(query)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then(
        (
          data: { results?: VideoResult[] | null; reason?: string } | null
        ) => {
          if (!cancelled) {
            setResults(data?.results ?? null);
            setFailReason(data?.results ? null : (data?.reason ?? "error"));
          }
        }
      )
      .catch(() => {
        if (!cancelled) {
          setResults(null);
          setFailReason("network");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, query]);

  const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(
    query
  )}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto overflow-x-hidden sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display tracking-tight">
            <Youtube className="h-5 w-5 text-red-500" />
            Видеохаб: {gameTitle}
          </DialogTitle>
          <DialogDescription>
            Трейлеры, геймплей и обзоры — не выходя из бэклога
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-1.5">
          {MODES.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setMode(item.id);
                setPlaying(null);
                setCustomId(null);
              }}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                mode === item.id
                  ? "border-foreground bg-primary text-primary-foreground shadow-comic-sm"
                  : "text-muted-foreground hover:border-foreground/30 hover:text-foreground"
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        {playing || customId ? (
          <div className="relative aspect-video w-full overflow-hidden rounded-lg border-2 border-foreground shadow-comic">
            <iframe
              src={`https://www.youtube.com/embed/${playing ? playing.videoId : customId}?autoplay=1`}
              title={playing?.title ?? query}
              allow="autoplay; encrypted-media; fullscreen"
              allowFullScreen
              className="absolute inset-0 h-full w-full"
            />
          </div>
        ) : (
          <div className="space-y-3">
            {loading ? (
              <div className="flex h-40 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Ищем ролики…
              </div>
            ) : results && results.length > 0 ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {results.map((video) => (
                  <button
                    key={video.videoId}
                    type="button"
                    onClick={() => setPlaying(video)}
                    className="group flex items-center gap-3 rounded-lg border p-2 text-left transition-colors hover:border-primary/60 hover:bg-primary/5"
                  >
                    <span className="relative h-14 w-24 shrink-0 overflow-hidden rounded-md bg-muted">
                      {video.thumbnail && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={video.thumbnail}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      )}
                      <Play className="absolute inset-0 m-auto h-5 w-5 text-white opacity-0 drop-shadow transition-opacity group-hover:opacity-100" />
                    </span>
                    <span className="min-w-0">
                      <span className="line-clamp-2 text-sm font-medium">
                        {video.title}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                        {video.channel}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="max-w-full rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                <p>
                  {failReason === "no_key"
                    ? "Автопоиск недоступен: не задан YouTube API-ключ."
                    : failReason === "quota"
                      ? "Автопоиск недоступен: дневная квота YouTube API исчерпана."
                      : failReason === "bad_key"
                        ? "Автопоиск недоступен: YouTube отклонил API-ключ."
                        : "Автопоиск недоступен: сервер не смог связаться с YouTube."}{" "}
                  Найдите ролик вручную и вставьте ссылку ниже — либо{" "}
                  <Link
                    href="/settings"
                    className="text-primary underline underline-offset-2"
                    onClick={() => onOpenChange(false)}
                  >
                    проверьте ключ в настройках
                  </Link>
                  .
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 h-auto max-w-full whitespace-normal py-2 text-left"
                  onClick={() => window.open(searchUrl, "_blank", "noopener")}
                >
                  <ExternalLink className="mr-2 h-3.5 w-3.5 shrink-0" />
                  <span className="break-words">Найти «{query}» на YouTube</span>
                </Button>
              </div>
            )}

            <form
              className="flex gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                const id = extractVideoId(manualUrl);
                if (id) {
                  setCustomId(id);
                  setPlaying(null);
                } else {
                  alert("Не похоже на ссылку YouTube. Пример: https://youtu.be/XXXXXXXXXXX");
                }
              }}
            >
              <Input
                value={manualUrl}
                onChange={(event) => setManualUrl(event.target.value)}
                placeholder="Вставьте ссылку YouTube или ID видео…"
                className="flex-1"
              />
              <Button type="submit" variant="secondary">
                <SendHorizonal className="h-4 w-4" />
                <span className="sr-only">Смотреть</span>
              </Button>
            </form>
            {gameId && (
              <p className="text-xs text-muted-foreground">
                Совет: ссылку на конкретный ролик можно сохранить в заметках игры.
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
