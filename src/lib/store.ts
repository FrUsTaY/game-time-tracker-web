import { promises as fs } from "node:fs";
import path from "node:path";
import { normalizeRating, type Game } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const GAMES_FILE = path.join(DATA_DIR, "games.json");

// Сериализуем чтение-изменение-запись, чтобы параллельные запросы не затирали данные
let queue: Promise<unknown> = Promise.resolve();

export function withStoreLock<T>(fn: () => Promise<T>): Promise<T> {
  const next = queue.then(fn, fn);
  queue = next.catch(() => undefined);
  return next;
}

export async function readGames(): Promise<Game[]> {
  try {
    const raw = await fs.readFile(GAMES_FILE, "utf8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return (parsed as Game[]).map((game) => ({
      ...game,
      rating: normalizeRating(game.rating),
    }));
  } catch {
    return [];
  }
}

export async function writeGames(games: Game[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = `${GAMES_FILE}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(games, null, 2), "utf8");
  await fs.rename(tmp, GAMES_FILE);
}
