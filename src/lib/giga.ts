import https from "node:https";
import crypto from "node:crypto";

const OAUTH_URL = "https://ngw.devices.sberbank.ru:9443/api/v2/oauth";
const CHAT_URL = "https://gigachat.devices.sberbank.ru/api/v1/chat/completions";
const SCOPE = "GIGACHAT_API_PERS";

export class GigaError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

interface HttpsOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  timeoutMs?: number;
}

interface HttpsResult {
  status: number;
  data: unknown;
}

// Сертификаты GigaChat подписаны российским УЦ, которого нет в стандартном
// доверенном хранилище Node.js, поэтому по умолчанию для этих хостов проверка
// цепочки отключена. Строгая проверка включается через GIGA_TLS_STRICT=1
// (потребуется указать CA-сертификт на уровне окружения).
function httpsRequestJson(url: string, options: HttpsOptions = {}): Promise<HttpsResult> {
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    const req = https.request(
      {
        hostname: target.hostname,
        port: target.port ? Number(target.port) : 443,
        path: `${target.pathname}${target.search}`,
        method: options.method ?? "GET",
        headers: options.headers,
        rejectUnauthorized: process.env.GIGA_TLS_STRICT === "1",
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");
          let data: unknown = null;
          try {
            data = text ? JSON.parse(text) : null;
          } catch {
            data = null;
          }
          resolve({ status: res.statusCode ?? 0, data });
        });
      }
    );
    req.setTimeout(options.timeoutMs ?? 60_000, () => {
      req.destroy(new GigaError("GigaChat не ответил за отведённое время", 504));
    });
    req.on("error", (err) => {
      reject(
        err instanceof GigaError
          ? err
          : new GigaError(`Не удалось связаться с GigaChat: ${err.message}`, 502)
      );
    });
    if (options.body) req.write(options.body);
    req.end();
  });
}

// Принимает и готовый Base64-ключ (Authorization key), и пару client_id:secret
function toBasicAuth(key: string): string {
  const trimmed = key.trim().replace(/^Basic\s+/i, "");
  const decoded = (() => {
    try {
      return Buffer.from(trimmed, "base64").toString("utf8");
    } catch {
      return "";
    }
  })();
  if (decoded.includes(":")) return trimmed;
  if (trimmed.includes(":")) return Buffer.from(trimmed, "utf8").toString("base64");
  throw new GigaError(
    "Ключ GigaChat имеет неверный формат. Нужен ключ авторизации (client_id:secret в Base64).",
    400
  );
}

let cachedToken: { token: string; expiresAt: number } | null = null;

export async function getAccessToken(key: string): Promise<string> {
  if (cachedToken && cachedToken.expiresAt - 60_000 > Date.now()) {
    return cachedToken.token;
  }
  const { status, data } = await httpsRequestJson(OAUTH_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${toBasicAuth(key)}`,
      RqUID: crypto.randomUUID(),
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: `scope=${SCOPE}`,
    timeoutMs: 30_000,
  });
  const payload = data as { access_token?: string; expires_at?: number } | null;
  if (status === 401 || status === 403) {
    throw new GigaError("GigaChat отклонил ключ авторизации", status);
  }
  if (status !== 200 || !payload?.access_token) {
    throw new GigaError(`Ошибка авторизации GigaChat (${status})`, status || 502);
  }
  cachedToken = {
    token: payload.access_token,
    expiresAt: payload.expires_at ?? Date.now() + 25 * 60_000,
  };
  return cachedToken.token;
}

export interface GigaMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function gigaChat(messages: GigaMessage[], key: string): Promise<string> {
  const token = await getAccessToken(key);
  const { status, data } = await httpsRequestJson(CHAT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      model: "GigaChat",
      messages,
      temperature: 0.7,
      max_tokens: 1200,
    }),
    timeoutMs: 120_000,
  });
  if (status === 401) {
    cachedToken = null;
    throw new GigaError("Сессия GigaChat истекла, повторите запрос", 401);
  }
  const payload = data as { choices?: { message?: { content?: string } }[] } | null;
  const content = payload?.choices?.[0]?.message?.content;
  if (status !== 200 || !content) {
    throw new GigaError(`GigaChat вернул ошибку (${status})`, status || 502);
  }
  return content;
}
