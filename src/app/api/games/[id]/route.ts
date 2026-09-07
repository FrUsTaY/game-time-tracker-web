import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { readGames, withStoreLock, writeGames } from "@/lib/store";
import {
  GAME_STATUSES,
  normalizePriority,
  normalizeRating,
  type Game,
  type GameSession,
  type GameStatus,
} from "@/lib/types";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  if (!body) {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const result = await withStoreLock(async () => {
    const games = await readGames();
    const index = games.findIndex((game) => game.id === id);
    if (index === -1) return { notFound: true as const };

    const game: Game = { ...games[index] };
    const now = new Date().toISOString();

    if (body.addHours !== undefined) {
      const hours = Number(body.addHours);
      if (Number.isFinite(hours) && hours > 0 && hours <= 48) {
        const rawDate =
          typeof body.sessionDate === "string" && !Number.isNaN(Date.parse(body.sessionDate))
            ? new Date(body.sessionDate)
            : new Date();
        const rounded = Math.round(hours * 100) / 100;
        const session: GameSession = {
          id: randomUUID(),
          date: rawDate.toISOString(),
          hours: rounded,
        };
        game.sessions = [...(game.sessions ?? []), session];
        game.hoursPlayed = Math.round(((game.hoursPlayed ?? 0) + rounded) * 100) / 100;
        game.lastPlayedAt = session.date;
      }
    }

    if (body.status !== undefined) {
      if (!GAME_STATUSES.includes(body.status as GameStatus)) {
        return { error: "Недопустимый статус" as const };
      }
      const prev = game.status;
      game.status = body.status as GameStatus;
      if (game.status === "playing" && !game.startedAt) game.startedAt = now;
      if (game.status === "completed" && prev !== "completed") game.completedAt = now;
      if (game.status !== "completed") delete game.completedAt;
    }

    const stringFields = [
      "title",
      "cover",
      "description",
      "releaseDate",
      "notes",
      "review",
      "developer",
      "publisher",
    ] as const;
    for (const field of stringFields) {
      if (typeof body[field] === "string") {
        const value = (body[field] as string).trim();
        if (field === "title" && !value) continue;
        game[field] = value.slice(0, field === "title" ? 200 : 4000) || undefined;
      }
    }

    const numberFields = [
      "avgPlaytime",
      "metacritic",
      "rawgRating",
      "storyTime",
      "completionistTime",
    ] as const;
    for (const field of numberFields) {
      if (body[field] === null) {
        delete game[field];
        continue;
      }
      const num = typeof body[field] === "string" ? Number(body[field]) : body[field];
      if (typeof num === "number" && Number.isFinite(num) && num >= 0) {
        const max =
          field === "avgPlaytime"
            ? 5000
            : field === "rawgRating"
              ? 5
              : field === "metacritic"
                ? 100
                : 2000;
        game[field] = Math.min(num, max);
      }
    }

    if (body.rating !== undefined) {
      if (body.rating === null) {
        delete game.rating;
      } else {
        const normalized = normalizeRating(body.rating);
        if (normalized) game.rating = normalized;
      }
    }

    if (body.platforms !== undefined) {
      game.platforms = Array.isArray(body.platforms)
        ? [...new Set(
            body.platforms
              .filter((p): p is string => typeof p === "string")
              .map((p) => p.trim().slice(0, 60))
              .filter(Boolean)
          )].slice(0, 14)
        : [];
    }

    if (Array.isArray(body.genres)) {
      game.genres = body.genres
        .filter((g): g is string => typeof g === "string")
        .slice(0, 14);
    }

    if (Array.isArray(body.sessions)) {
      game.sessions = body.sessions
        .filter(
          (s): s is GameSession =>
            Boolean(s) &&
            typeof s === "object" &&
            typeof (s as GameSession).date === "string" &&
            Number.isFinite(Number((s as GameSession).hours))
        )
        .slice(0, 2000)
        .map((s) => ({
          id: typeof s.id === "string" ? s.id : randomUUID(),
          date: s.date,
          hours: Math.round(Number(s.hours) * 100) / 100,
        }));
      game.hoursPlayed =
        Math.round(game.sessions.reduce((sum, s) => sum + s.hours, 0) * 100) / 100;
    }

    if (body.rawgId === null) delete game.rawgId;
    else if (typeof body.rawgId === "number") game.rawgId = body.rawgId;

    if (body.favorite === true) game.favorite = true;
    else if (body.favorite === false) delete game.favorite;

    if (body.priority !== undefined) {
      if (body.priority === null) delete game.priority;
      else {
        const normalized = normalizePriority(body.priority);
        if (normalized) game.priority = normalized;
      }
    }

    game.updatedAt = now;
    games[index] = game;
    await writeGames(games);
    return { game };
  });

  if ("notFound" in result) {
    return NextResponse.json({ error: "Игра не найдена" }, { status: 404 });
  }
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ game: result.game });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const deleted = await withStoreLock(async () => {
    const games = await readGames();
    const next = games.filter((game) => game.id !== id);
    if (next.length === games.length) return false;
    await writeGames(next);
    return true;
  });
  if (!deleted) {
    return NextResponse.json({ error: "Игра не найдена" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
