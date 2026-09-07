import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { readGames, withStoreLock, writeGames } from "@/lib/store";
import {
  GAME_STATUSES,
  normalizePriority,
  normalizeRating,
  type Game,
  type GameStatus,
} from "@/lib/types";

export const dynamic = "force-dynamic";

function asString(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : undefined;
}

function asNumber(value: unknown, max: number): number | undefined {
  const num = typeof value === "string" ? Number(value) : value;
  if (typeof num !== "number" || !Number.isFinite(num) || num < 0) return undefined;
  return Math.min(num, max);
}

function asStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const items = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim().slice(0, 60))
    .filter(Boolean);
  return [...new Set(items)].slice(0, 14);
}

export async function GET(request: NextRequest) {
  const status = request.nextUrl.searchParams.get("status");
  let games = await readGames();
  if (status && GAME_STATUSES.includes(status as GameStatus)) {
    games = games.filter((game) => game.status === status);
  }
  games.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  return NextResponse.json({ games });
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  const title = asString(body?.title, 200);
  if (!title) {
    return NextResponse.json({ error: "Укажите название игры" }, { status: 400 });
  }
  const status = GAME_STATUSES.includes(body?.status as GameStatus)
    ? (body?.status as GameStatus)
    : "backlog";
  const now = new Date().toISOString();

  const game: Game = {
    id: randomUUID(),
    title,
    status,
    platforms: asStringArray(body?.platforms) ?? [],
    genres: asStringArray(body?.genres),
    cover: asString(body?.cover, 2000),
    description: asString(body?.description, 6000),
    releaseDate: asString(body?.releaseDate, 32),
    avgPlaytime: asNumber(body?.avgPlaytime, 5000),
    metacritic: asNumber(body?.metacritic, 100),
    developer: asString(body?.developer, 120),
    publisher: asString(body?.publisher, 120),
    rawgRating: asNumber(body?.rawgRating, 5),
    storyTime: asNumber(body?.storyTime, 2000),
    completionistTime: asNumber(body?.completionistTime, 2000),
    rating: normalizeRating(body?.rating),
    review: asString(body?.review, 4000),
    notes: asString(body?.notes, 4000),
    favorite: body?.favorite === true ? true : undefined,
    priority: normalizePriority(body?.priority),
    hoursPlayed: asNumber(body?.hoursPlayed, 100_000) ?? 0,
    sessions: [],
    rawgId: asNumber(body?.rawgId, Number.MAX_SAFE_INTEGER),
    startedAt: status === "playing" ? now : undefined,
    completedAt: status === "completed" ? now : undefined,
    createdAt: now,
    updatedAt: now,
  };

  await withStoreLock(async () => {
    const games = await readGames();
    games.push(game);
    await writeGames(games);
  });

  return NextResponse.json({ game }, { status: 201 });
}
