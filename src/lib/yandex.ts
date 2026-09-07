const API_BASE = "https://cloud-api.yandex.net/v1/disk";
export const BACKUP_PATH = "disk:/GameBacklogs/backlog-export.json";

export class YandexError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function ydFetch(pathWithQuery: string, token: string, init?: RequestInit) {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${pathWithQuery}`, {
      ...init,
      cache: "no-store",
      headers: {
        Authorization: `OAuth ${token}`,
        ...(init?.headers ?? {}),
      },
    });
  } catch {
    throw new YandexError("Не удалось связаться с Яндекс.Диском", 502);
  }
  return res;
}

export async function yandexStatus(
  token: string
): Promise<{ connected: boolean; user?: string; error?: string }> {
  if (!token) return { connected: false, error: "Токен не задан" };
  const res = await ydFetch("/", token);
  if (res.status === 401) return { connected: false, error: "Токен недействителен" };
  if (!res.ok) return { connected: false, error: `Ошибка Яндекс.Диска (${res.status})` };
  const data = (await res.json()) as { user?: { display_name?: string; login?: string } };
  return { connected: true, user: data.user?.display_name || data.user?.login };
}

async function getOperationLink(
  endpoint: string,
  token: string,
  filePath: string
): Promise<string> {
  const res = await ydFetch(
    `/resources/${endpoint}?overwrite=true&path=${encodeURIComponent(filePath)}`,
    token
  );
  if (res.status === 401) {
    throw new YandexError("Токен Яндекс.Диска недействителен", 401);
  }
  if (!res.ok) {
    throw new YandexError(`Яндекс.Диск вернул ошибку (${res.status})`, res.status);
  }
  const data = (await res.json()) as { href?: string };
  if (!data.href) throw new YandexError("Яндекс.Диск не вернул ссылку операции", 502);
  return data.href;
}

export async function uploadBackup(
  token: string,
  content: string,
  filePath: string = BACKUP_PATH
): Promise<void> {
  const href = await getOperationLink("upload", token, filePath);
  const put = await fetch(href, {
    method: "PUT",
    body: content,
    headers: { "Content-Type": "application/json" },
  });
  if (!put.ok) {
    throw new YandexError(`Не удалось загрузить файл (${put.status})`, put.status);
  }
}

export async function downloadBackup(
  token: string,
  filePath: string = BACKUP_PATH
): Promise<string | null> {
  const href = await getOperationLink("download", token, filePath);
  const file = await fetch(href, { cache: "no-store" });
  if (file.status === 404) return null;
  if (!file.ok) {
    throw new YandexError(`Не удалось скачать файл (${file.status})`, file.status);
  }
  return file.text();
}
