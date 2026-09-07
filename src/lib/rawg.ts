import { getSettings } from "./settings";

const RAWG_BASE = "https://api.rawg.io/api";

export interface RawgGame {
  id: number;
  slug?: string;
  name: string;
  released: string | null;
  background_image: string | null;
  metacritic: number | null;
  playtime: number;
  platforms?: { platform: { id: number; name: string } }[];
  genres?: { id: number; name: string }[];
  developers?: { name: string }[];
  publishers?: { name: string }[];
  rating?: number;
  description_raw?: string;
}

export class RawgError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function rawgFetch(
  path: string,
  params: Record<string, string> = {}
): Promise<RawgGame | { results?: RawgGame[] }> {
  const { rawgKey } = await getSettings();
  if (!rawgKey) {
    throw new RawgError(
      "Ключ RAWG не настроен. Добавьте его на странице «Настройки».",
      503
    );
  }
  const url = new URL(`${RAWG_BASE}${path}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  url.searchParams.set("key", rawgKey);

  let res: Response;
  try {
    res = await fetch(url, { cache: "no-store" });
  } catch {
    throw new RawgError("Не удалось связаться с RAWG API", 502);
  }
  if (res.status === 401) {
    throw new RawgError("RAWG отклонил ключ — проверьте его в настройках", 401);
  }
  if (!res.ok) {
    throw new RawgError(`Ошибка RAWG API (${res.status})`, res.status);
  }
  return res.json();
}

export async function searchGames(query: string, pageSize = 12): Promise<RawgGame[]> {
  const data = (await rawgFetch("/games", {
    search: query,
    page_size: String(pageSize),
  })) as { results?: RawgGame[] };
  const results = data.results ?? [];

  // RAWG часто отдаёт playtime: 0 в поисковой выдаче — добираем из детальных
  // карточек, иначе поле «Ср. время прохождения» останется пустым
  const ENRICH_LIMIT = 6;
  return Promise.all(
    results.map(async (game, index) => {
      if (game.playtime > 0 || index >= ENRICH_LIMIT) return game;
      try {
        return await getGame(game.id);
      } catch {
        return game;
      }
    })
  );
}

export async function getGame(id: number): Promise<RawgGame> {
  return (await rawgFetch(`/games/${id}`)) as RawgGame;
}

export function mapRawgToGameFields(game: RawgGame) {
  return {
    rawgId: game.id,
    title: game.name,
    cover: game.background_image ?? undefined,
    releaseDate: game.released ?? undefined,
    avgPlaytime: game.playtime > 0 ? game.playtime : undefined,
    metacritic: game.metacritic ?? undefined,
    rawgRating:
      typeof game.rating === "number" && game.rating > 0
        ? Math.round(game.rating * 10) / 10
        : undefined,
    developer: game.developers?.[0]?.name || undefined,
    publisher: game.publishers?.[0]?.name || undefined,
    platforms: (game.platforms ?? []).map((p) => p.platform.name),
    genres: (game.genres ?? []).map((g) => g.name),
    description: game.description_raw?.slice(0, 4000) || undefined,
  };
}
