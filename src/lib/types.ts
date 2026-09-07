export type GameStatus =
  | "playing"
  | "backlog"
  | "completed"
  | "wishlist"
  | "paused"
  | "dropped";

export type GameRating = "musor" | "prohodnyak" | "pohvalno" | "izumitelno";

export type GamePriority = "urgent" | "high" | "medium" | "low";

export const GAME_STATUSES: GameStatus[] = [
  "playing",
  "backlog",
  "completed",
  "wishlist",
  "paused",
  "dropped",
];

export const GAME_RATINGS: GameRating[] = [
  "musor",
  "prohodnyak",
  "pohvalno",
  "izumitelno",
];

export interface GameSession {
  id: string;
  date: string;
  hours: number;
}

export interface Game {
  id: string;
  rawgId?: number;
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
  hoursPlayed: number;
  sessions: GameSession[];
  status: GameStatus;
  rating?: GameRating;
  review?: string;
  notes?: string;
  favorite?: boolean;
  priority?: GamePriority;
  startedAt?: string;
  completedAt?: string;
  lastPlayedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type GameDraft = {
  title: string;
  rawgId?: number;
  cover?: string;
  description?: string;
  platforms?: string[];
  genres?: string[];
  releaseDate?: string;
  avgPlaytime?: number;
  metacritic?: number;
  developer?: string;
  publisher?: string;
  rawgRating?: number;
  storyTime?: number;
  completionistTime?: number;
  hoursPlayed?: number;
  status: GameStatus;
  rating?: GameRating | null;
  review?: string;
  notes?: string;
  favorite?: boolean;
  priority?: GamePriority;
};

export const STATUS_META: Record<
  GameStatus,
  { label: string; badge: string; dot: string }
> = {
  playing: {
    label: "Играю",
    badge:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  backlog: {
    label: "В бэклоге",
    badge: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-400",
    dot: "bg-sky-500",
  },
  wishlist: {
    label: "Вишлист",
    badge: "border-pink-500/30 bg-pink-500/10 text-pink-700 dark:text-pink-400",
    dot: "bg-pink-500",
  },
  completed: {
    label: "Пройдено",
    badge:
      "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-400",
    dot: "bg-violet-500",
  },
  paused: {
    label: "На паузе",
    badge: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  dropped: {
    label: "Брошено",
    badge: "border-zinc-500/30 bg-zinc-500/10 text-zinc-600 dark:text-zinc-400",
    dot: "bg-zinc-500",
  },
};

export const PRIORITY_META: Record<
  GamePriority,
  { label: string; badge: string; dot: string; rank: number }
> = {
  urgent: {
    label: "Срочный",
    badge: "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-400",
    dot: "bg-red-500",
    rank: 0,
  },
  high: {
    label: "Высокий",
    badge: "border-orange-500/40 bg-orange-500/10 text-orange-700 dark:text-orange-400",
    dot: "bg-orange-500",
    rank: 1,
  },
  medium: {
    label: "Средний",
    badge: "border-cyan-500/40 bg-cyan-500/10 text-cyan-700 dark:text-cyan-400",
    dot: "bg-cyan-500",
    rank: 2,
  },
  low: {
    label: "Низкий",
    badge: "border-zinc-500/40 bg-zinc-500/10 text-zinc-600 dark:text-zinc-400",
    dot: "bg-zinc-500",
    rank: 3,
  },
};

export const GAME_PRIORITIES: GamePriority[] = ["urgent", "high", "medium", "low"];

export const GENRE_PRESETS = [
  "Экшен",
  "Приключения",
  "Сюжетная",
  "RPG",
  "Шутер",
  "Хоррор",
  "Психологический хоррор",
  "Стелс",
  "Выживание",
  "Открытый мир",
  "Платформер",
  "Головоломка",
  "Инди",
  "Sci-Fi",
  "Киберпанк",
  "Фэнтези",
  "Слэшер",
  "Интерактивное кино",
  "VR",
  "Гонки",
  "Файтинг",
  "Стратегия",
  "Симулятор",
  "Метроидвания",
  "Рогалик",
  "Соулслайк",
  "Детектив",
];

export const PLATFORM_PRESETS = [
  "PC",
  "PlayStation 5",
  "PlayStation 4",
  "Xbox Series S/X",
  "Xbox One",
  "Nintendo Switch",
  "macOS",
  "Linux",
  "iOS",
  "Android",
];

export const RATING_META: Record<
  GameRating,
  { label: string; icon: string; active: string; ring: string; rank: number }
> = {
  musor: {
    label: "Мусор",
    icon: "/ratings/musor.svg",
    active: "bg-red-500/10 text-red-700 dark:text-red-400",
    ring: "ring-red-500/60",
    rank: 3,
  },
  prohodnyak: {
    label: "Проходняк",
    icon: "/ratings/prohodnyak.svg",
    active: "bg-zinc-500/10 text-zinc-700 dark:text-zinc-400",
    ring: "ring-zinc-500/60",
    rank: 2,
  },
  pohvalno: {
    label: "Похвально",
    icon: "/ratings/pohvalno.svg",
    active: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    ring: "ring-emerald-500/60",
    rank: 1,
  },
  izumitelno: {
    label: "Изумительно",
    icon: "/ratings/izumitelno.svg",
    active: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    ring: "ring-amber-500/60",
    rank: 0,
  },
};

// Старые данные хранили числовую оценку 0–10 — приводим к категории StopGame
export function normalizeRating(value: unknown): GameRating | undefined {
  if (typeof value === "string") {
    return GAME_RATINGS.includes(value as GameRating)
      ? (value as GameRating)
      : undefined;
  }
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    if (value < 4) return "musor";
    if (value < 6) return "prohodnyak";
    if (value < 8) return "pohvalno";
    return "izumitelno";
  }
  return undefined;
}

export function normalizePriority(value: unknown): GamePriority | undefined {
  return typeof value === "string" && GAME_PRIORITIES.includes(value as GamePriority)
    ? (value as GamePriority)
    : undefined;
}

export function formatHours(hours?: number): string {
  if (!hours || hours <= 0) return "0 ч";
  const rounded = Math.round(hours * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)} ч`;
}

export function formatGameDate(iso?: string): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
