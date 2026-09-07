import { NextRequest, NextResponse } from "next/server";
import { getSettings, saveSettings } from "@/lib/settings";
import { BACKUP_PATH, YandexError, downloadBackup, uploadBackup, yandexStatus } from "@/lib/yandex";
import { readGames, withStoreLock, writeGames } from "@/lib/store";
import {
  GAME_STATUSES,
  normalizeRating,
  type Game,
  type GameSession,
  type GameStatus,
} from "@/lib/types";

export const dynamic = "force-dynamic";

function sanitizeIncoming(value: unknown): Game | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.id !== "string" || typeof raw.title !== "string") return null;
  const now = new Date().toISOString();
  const str = (v: unknown, max: number): string | undefined => {
    if (typeof v !== "string" || !v.trim()) return undefined;
    return v.trim().slice(0, max);
  };
  const num = (v: unknown): number | undefined => {
    const n = typeof v === "string" ? Number(v) : v;
    return typeof n === "number" && Number.isFinite(n) && n >= 0
      ? Math.min(n, 100_000)
      : undefined;
  };
  const strArray = (v: unknown): string[] =>
    Array.isArray(v)
      ? [...new Set(
          v
            .filter((item): item is string => typeof item === "string")
            .map((item) => item.trim().slice(0, 60))
            .filter(Boolean)
        )].slice(0, 14)
      : [];

  return {
    id: raw.id.slice(0, 64),
    rawgId: num(raw.rawgId),
    title: raw.title.trim().slice(0, 200),
    cover: str(raw.cover, 2000),
    description: str(raw.description, 6000),
    platforms: strArray(raw.platforms),
    genres: strArray(raw.genres),
    releaseDate: str(raw.releaseDate, 32),
    avgPlaytime: num(raw.avgPlaytime),
    metacritic: num(raw.metacritic),
    rating: normalizeRating(raw.rating),
    notes: str(raw.notes, 4000),
    hoursPlayed: num(raw.hoursPlayed) ?? 0,
    sessions: Array.isArray(raw.sessions)
      ? (raw.sessions as unknown[])
          .filter(
            (s): s is GameSession =>
              Boolean(s) &&
              typeof s === "object" &&
              typeof (s as GameSession).date === "string" &&
              Number.isFinite(Number((s as GameSession).hours))
          )
          .slice(0, 2000)
          .map((s) => ({
            id: typeof s.id === "string" ? s.id : crypto.randomUUID(),
            date: s.date,
            hours: Math.round(Number(s.hours) * 100) / 100,
          }))
      : [],
    status: GAME_STATUSES.includes(raw.status as GameStatus)
      ? (raw.status as GameStatus)
      : "backlog",
    startedAt: str(raw.startedAt, 32),
    completedAt: str(raw.completedAt, 32),
    createdAt: str(raw.createdAt, 32) ?? now,
    updatedAt: str(raw.updatedAt, 32) ?? now,
  };
}

export async function GET() {
  const { yandexToken } = await getSettings();
  if (!yandexToken) {
    return NextResponse.json({ connected: false, error: "Токен не задан" });
  }
  const status = await yandexStatus(yandexToken);
  return NextResponse.json({ ...status, backupPath: BACKUP_PATH });
}

export async function POST(request: NextRequest) {
  const { yandexToken } = await getSettings();
  if (!yandexToken) {
    return NextResponse.json(
      { error: "Задайте токен Яндекс.Диска на странице «Настройки»" },
      { status: 503 }
    );
  }
  const body = (await request.json().catch(() => null)) as {
    action?: string;
  } | null;

  try {
    if (body?.action === "export") {
      const games = await readGames();
      const exportedAt = new Date().toISOString();
      const payload = {
        app: "GameBacklogs",
        version: 1,
        exportedAt,
        games,
      };
      await uploadBackup(yandexToken, JSON.stringify(payload, null, 2));
      await saveSettings({ lastExportAt: exportedAt });
      return NextResponse.json({ ok: true, exportedAt, count: games.length });
    }

    if (body?.action === "import") {
      const raw = await downloadBackup(yandexToken);
      if (raw === null) {
        return NextResponse.json(
          {
            error:
              "Резервная копия не найдена на диске. Сначала выполните экспорт.",
          },
          { status: 404 }
        );
      }
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        return NextResponse.json({ error: "Файл копии повреждён" }, { status: 422 });
      }
      const incomingRaw = Array.isArray((parsed as { games?: unknown })?.games)
        ? ((parsed as { games: unknown[] }).games)
        : [];
      const incoming = incomingRaw
        .map(sanitizeIncoming)
        .filter((g): g is Game => g !== null);

      const result = await withStoreLock(async () => {
        const games = await readGames();
        const byId = new Map(games.map((g) => [g.id, g]));
        let added = 0;
        let updated = 0;
        for (const game of incoming) {
          const existing = byId.get(game.id);
          if (!existing) {
            byId.set(game.id, game);
            added += 1;
          } else if ((game.updatedAt ?? "") >= (existing.updatedAt ?? "")) {
            byId.set(game.id, game);
            updated += 1;
          }
        }
        await writeGames([...byId.values()]);
        return { added, updated };
      });
      const importedAt = new Date().toISOString();
      await saveSettings({ lastImportAt: importedAt });
      return NextResponse.json({ ok: true, importedAt, ...result });
    }

    return NextResponse.json({ error: "Неизвестное действие" }, { status: 400 });
  } catch (error) {
    const status = error instanceof YandexError ? error.status : 502;
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Ошибка обмена с Яндекс.Диском",
      },
      { status }
    );
  }
}
