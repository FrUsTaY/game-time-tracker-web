import { promises as fs } from "node:fs";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), "data");
const SETTINGS_FILE = path.join(DATA_DIR, "settings.json");

export interface AppSettings {
  rawgKey?: string;
  gigaKey?: string;
  youtubeKey?: string;
  yandexToken?: string;
  lastExportAt?: string;
  lastImportAt?: string;
}

async function readSettingsFile(): Promise<AppSettings> {
  try {
    const raw = await fs.readFile(SETTINGS_FILE, "utf8");
    return JSON.parse(raw) as AppSettings;
  } catch {
    return {};
  }
}

// Ключ из data/settings.json имеет приоритет, переменные окружения — запасной вариант
export async function getSettings(): Promise<AppSettings> {
  const file = await readSettingsFile();
  return {
    rawgKey: file.rawgKey || process.env.RAWG_API_KEY || "",
    gigaKey: file.gigaKey || process.env.GIGA_API_KEY || "",
    youtubeKey: file.youtubeKey || process.env.YOUTUBE_API_KEY || "",
    yandexToken: file.yandexToken || process.env.YANDEX_DISK_TOKEN || "",
    lastExportAt: file.lastExportAt,
    lastImportAt: file.lastImportAt,
  };
}

export async function saveSettings(patch: Partial<AppSettings>): Promise<void> {
  const current = await readSettingsFile();
  const next: AppSettings = { ...current };

  for (const key of ["rawgKey", "gigaKey", "youtubeKey", "yandexToken"] as const) {
    if (key in patch) {
      const value = patch[key]?.trim();
      if (value) next[key] = value;
      else delete next[key];
    }
  }
  if (patch.lastExportAt !== undefined) next.lastExportAt = patch.lastExportAt;
  if (patch.lastImportAt !== undefined) next.lastImportAt = patch.lastImportAt;

  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = `${SETTINGS_FILE}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(next, null, 2), "utf8");
  await fs.rename(tmp, SETTINGS_FILE);
}

export function maskKey(key?: string): string | null {
  if (!key) return null;
  if (key.length <= 8) return "•••";
  return `${key.slice(0, 4)}…${key.slice(-4)}`;
}
