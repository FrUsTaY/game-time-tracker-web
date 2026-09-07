import { NextRequest, NextResponse } from "next/server";
import { getSettings } from "@/lib/settings";
import { GigaError, gigaChat, type GigaMessage } from "@/lib/giga";
import { readGames } from "@/lib/store";
import { STATUS_META, formatHours, type Game } from "@/lib/types";

export const dynamic = "force-dynamic";

function buildContext(games: Game[]): string {
  if (!games.length) {
    return "Библиотека пользователя пока пуста — игр не добавлено.";
  }
  const by = (status: Game["status"]) => games.filter((g) => g.status === status);

  const lines: string[] = [];
  const playing = by("playing");
  const backlog = by("backlog");
  const wishlist = by("wishlist");
  const completed = by("completed");
  const dropped = by("dropped");
  const totalHours = Math.round(games.reduce((sum, g) => sum + (g.hoursPlayed ?? 0), 0));

  lines.push(`Всего игр: ${games.length}. Всего наиграно: ${formatHours(totalHours)}.`);
  lines.push(
    `Статусы: играю — ${playing.length}, бэклог — ${backlog.length}, вишлист — ${wishlist.length}, пройдено — ${completed.length}, брошено — ${dropped.length}.`
  );

  if (playing.length) {
    lines.push("Сейчас играет:");
    for (const g of playing) {
      const avg = g.avgPlaytime ? ` (в среднем прохождение ≈ ${g.avgPlaytime} ч)` : "";
      lines.push(`- ${g.title}: наиграно ${formatHours(g.hoursPlayed)}${avg}`);
    }
  }
  if (backlog.length) {
    lines.push(`Бэклог: ${backlog.slice(0, 40).map((g) => g.title).join(", ")}.`);
  }
  if (wishlist.length) {
    lines.push(`Вишлист: ${wishlist.slice(0, 25).map((g) => g.title).join(", ")}.`);
  }
  if (completed.length) {
    lines.push(
      `Недавно пройдено: ${completed
        .slice()
        .sort((a, b) => (b.completedAt ?? b.updatedAt).localeCompare(a.completedAt ?? a.updatedAt))
        .slice(0, 10)
        .map((g) => `${g.title} (${formatHours(g.hoursPlayed)})`)
        .join(", ")}.`
    );
  }
  return lines.join("\n");
}

export async function POST(request: NextRequest) {
  const { gigaKey } = await getSettings();
  if (!gigaKey) {
    return NextResponse.json(
      {
        error:
          "Ключ GigaChat не настроен. Добавьте его на странице «Настройки».",
      },
      { status: 503 }
    );
  }

  const body = (await request.json().catch(() => null)) as {
    messages?: unknown;
    includeContext?: boolean;
  } | null;

  const history: GigaMessage[] = Array.isArray(body?.messages)
    ? (body!.messages as unknown[])
        .filter(
          (m): m is { role: "user" | "assistant"; content: string } =>
            Boolean(m) &&
            typeof m === "object" &&
            ((m as { role?: string }).role === "user" ||
              (m as { role?: string }).role === "assistant") &&
            typeof (m as { content?: string }).content === "string" &&
            (m as { content: string }).content.trim().length > 0
        )
        .slice(-12)
        .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }))
    : [];

  const lastUser = [...history].reverse().find((m) => m.role === "user");
  if (!lastUser) {
    return NextResponse.json({ error: "Пустой запрос" }, { status: 400 });
  }

  const includeContext = body?.includeContext !== false;
  const games = includeContext ? await readGames() : [];
  const system: GigaMessage = {
    role: "system",
    content: includeContext
      ? [
          "Ты — игровой ассистент внутри приложения GameBacklogs (трекер игрового бэклога).",
          "Отвечай на русском языке: кратко, дружелюбно и по делу.",
          "Опирайся на данные библиотеки пользователя, когда они уместны.",
          "Используй короткие списки и выделяй названия игр жирным.",
          "Ниже — актуальные данные библиотеки:",
          buildContext(games),
        ].join("\n")
      : "Ты — игровой ассистент внутри приложения GameBacklogs. Отвечай на русском языке: кратко, дружелюбно и по делу. Используй короткие списки и выделяй названия игр жирным.",
  };

  try {
    const reply = await gigaChat([system, ...history], gigaKey);
    return NextResponse.json({ reply });
  } catch (error) {
    const status = error instanceof GigaError ? error.status : 502;
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Не удалось получить ответ от GigaChat",
      },
      { status }
    );
  }
}
