"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CloudDownload,
  CloudUpload,
  ExternalLink,
  Gamepad2,
  HardDriveDownload,
  Loader2,
  RefreshCw,
  Sparkles,
  Trash2,
  Youtube,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface KeyInfo {
  set: boolean;
  hint: string | null;
}

interface SettingsInfo {
  rawg: KeyInfo;
  giga: KeyInfo;
  youtube: KeyInfo;
  yandex: KeyInfo;
  lastExportAt: string | null;
  lastImportAt: string | null;
}

type KeyName = "rawgKey" | "gigaKey" | "youtubeKey" | "yandexToken";

const EMPTY_VALUES: Record<KeyName, string> = {
  rawgKey: "",
  gigaKey: "",
  youtubeKey: "",
  yandexToken: "",
};

function formatDateTime(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function KeyStatus({ info }: { info: KeyInfo | undefined }) {
  if (!info) {
    return (
      <Badge variant="outline" className="text-muted-foreground">
        …
      </Badge>
    );
  }
  return info.set ? (
    <Badge className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
      Подключён
    </Badge>
  ) : (
    <Badge variant="outline" className="text-muted-foreground">
      Не задан
    </Badge>
  );
}

export function SettingsView() {
  const [info, setInfo] = useState<SettingsInfo | null>(null);
  const [values, setValues] = useState({ ...EMPTY_VALUES });
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [yandexUser, setYandexUser] = useState<string | null>(null);
  const [yandexError, setYandexError] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const loadInfo = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/", { cache: "no-store" });
      if (res.ok) setInfo(await res.json());
    } catch {
      toast.error("Не удалось загрузить настройки");
    }
  }, []);

  useEffect(() => {
    loadInfo();
  }, [loadInfo]);

  const setBusyKey = (key: string, value: boolean) =>
    setBusy((prev) => ({ ...prev, [key]: value }));

  const saveKey = async (key: KeyName) => {
    const value = values[key].trim();
    if (!value) {
      toast.error("Вставьте ключ в поле");
      return;
    }
    setBusyKey(key, true);
    try {
      const res = await fetch("/api/settings/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Ошибка сохранения");
      await loadInfo();
      setValues((prev) => ({ ...prev, [key]: "" }));
      toast.success("Ключ сохранён");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Ошибка сохранения");
    } finally {
      setBusyKey(key, false);
    }
  };

  const removeKey = async (key: KeyName) => {
    setBusyKey(key, true);
    try {
      await fetch("/api/settings/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: "" }),
      });
      await loadInfo();
      toast.success("Ключ удалён");
    } catch {
      toast.error("Не удалось удалить ключ");
    } finally {
      setBusyKey(key, false);
    }
  };

  const checkRawg = async () => {
    setBusyKey("checkRawg", true);
    try {
      const res = await fetch("/api/rawg/search/?q=portal");
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "RAWG недоступен");
      toast.success(
        `RAWG подключён — тестовый запрос вернул ${data.results.length} игр`
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "RAWG недоступен");
    } finally {
      setBusyKey("checkRawg", false);
    }
  };

  const checkGiga = async () => {
    setBusyKey("checkGiga", true);
    try {
      const res = await fetch("/api/giga/status/");
      const data = await res.json();
      if (!data.ok) throw new Error(data?.error ?? "GigaChat недоступен");
      toast.success("GigaChat подключён");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "GigaChat недоступен");
    } finally {
      setBusyKey("checkGiga", false);
    }
  };

  const checkYandex = async () => {
    setBusyKey("checkYandex", true);
    try {
      const res = await fetch("/api/yandex/");
      const data = await res.json();
      if (!data.connected) throw new Error(data?.error ?? "Диск недоступен");
      setYandexUser(data.user ?? null);
      setYandexError(null);
      toast.success(data.user ? `Диск подключён: ${data.user}` : "Диск подключён");
    } catch (error) {
      setYandexError(error instanceof Error ? error.message : "Ошибка проверки");
      toast.error(error instanceof Error ? error.message : "Ошибка проверки");
    } finally {
      setBusyKey("checkYandex", false);
    }
  };

  const exportNow = async () => {
    setBusyKey("export", true);
    try {
      const res = await fetch("/api/yandex/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "export" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Ошибка экспорта");
      toast.success(`Экспортировано игр: ${data.count}`);
      await loadInfo();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Ошибка экспорта");
    } finally {
      setBusyKey("export", false);
    }
  };

  const importNow = async () => {
    setImportOpen(false);
    setBusyKey("import", true);
    try {
      const res = await fetch("/api/yandex/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "import" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Ошибка импорта");
      toast.success(
        `Импорт завершён: добавлено ${data.added}, обновлено ${data.updated}`
      );
      await loadInfo();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Ошибка импорта");
    } finally {
      setBusyKey("import", false);
    }
  };

  const keyRow = (
    key: KeyName,
    placeholder: string,
    onSave: () => void,
    checkButton?: React.ReactNode
  ) => (
    <div className="mt-4 flex flex-wrap gap-2">
      <Input
        value={values[key]}
        onChange={(event) =>
          setValues((prev) => ({ ...prev, [key]: event.target.value }))
        }
        placeholder={
          info?.[key === "rawgKey" ? "rawg" : key === "gigaKey" ? "giga" : "yandex"]
            ?.hint
            ? `Текущий ключ: ${info![key === "rawgKey" ? "rawg" : key === "gigaKey" ? "giga" : "yandex"]!.hint}`
            : placeholder
        }
        className="min-w-52 flex-1 font-mono text-sm"
      />
      <Button onClick={onSave} disabled={busy[key]} className="shrink-0">
        {busy[key] && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Сохранить
      </Button>
      {checkButton}
    </div>
  );

  const removeLink = (key: KeyName) =>
    info?.[
      key === "rawgKey" ? "rawg" : key === "gigaKey" ? "giga" : "yandex"
    ]?.set ? (
      <button
        type="button"
        onClick={() => removeKey(key)}
        disabled={busy[key]}
        className="ml-auto flex items-center gap-1 text-destructive hover:underline"
      >
        <Trash2 className="h-3 w-3" /> Удалить ключ
      </button>
    ) : null;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 md:px-8 md:py-10">
      <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Настройки</h1>
      <p className="mt-1 max-w-xl text-sm text-muted-foreground">
        Ключи API хранятся только на сервере (data/settings.json) и никогда не
        попадают в браузер. Их также можно задать переменными окружения
        RAWG_API_KEY, GIGA_API_KEY, YOUTUBE_API_KEY и YANDEX_DISK_TOKEN.
      </p>

      <div className="mt-6 space-y-4">
        <section className="rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
                <Gamepad2 className="h-4 w-4" />
              </span>
              <div>
                <h2 className="font-semibold leading-tight">RAWG API</h2>
                <p className="text-xs text-muted-foreground">
                  Карточки игр, обложки, платформы и среднее время прохождения
                </p>
              </div>
            </div>
            <KeyStatus info={info?.rawg} />
          </div>
          {keyRow(
            "rawgKey",
            "Вставьте ключ RAWG",
            () => saveKey("rawgKey"),
            <Button
              variant="outline"
              size="icon"
              className="shrink-0"
              onClick={checkRawg}
              disabled={busy.checkRawg}
              title="Проверить подключение"
            >
              {busy.checkRawg ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          )}
          <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
            <span>Бесплатный ключ — на</span>
            <a
              href="https://rawg.io/apidocs"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-0.5 text-primary hover:underline"
            >
              rawg.io/apidocs <ExternalLink className="h-3 w-3" />
            </a>
            {removeLink("rawgKey")}
          </p>
        </section>

        <section className="rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
                <Sparkles className="h-4 w-4" />
              </span>
              <div>
                <h2 className="font-semibold leading-tight">GigaChat</h2>
                <p className="text-xs text-muted-foreground">
                  Умный помощник по вашему бэклогу
                </p>
              </div>
            </div>
            <KeyStatus info={info?.giga} />
          </div>
          {keyRow(
            "gigaKey",
            "Вставьте ключ авторизации GigaChat",
            () => saveKey("gigaKey"),
            <Button
              variant="outline"
              size="icon"
              className="shrink-0"
              onClick={checkGiga}
              disabled={busy.checkGiga}
              title="Проверить подключение"
            >
              {busy.checkGiga ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          )}
          <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
            <span>Ключ авторизации — из кабинета</span>
            <a
              href="https://developers.sber.ru/gigachat"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-0.5 text-primary hover:underline"
            >
              developers.sber.ru/gigachat <ExternalLink className="h-3 w-3" />
            </a>
            {removeLink("gigaKey")}
          </p>
        </section>

        <section className="rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-red-600 dark:text-red-400">
                <Youtube className="h-4 w-4" />
              </span>
              <div>
                <h2 className="font-semibold leading-tight">YouTube Data API</h2>
                <p className="text-xs text-muted-foreground">
                  Автопоиск трейлеров, геймплеев и обзоров в видеохабе
                </p>
              </div>
            </div>
            <KeyStatus info={info?.youtube} />
          </div>
          {keyRow(
            "youtubeKey",
            "Вставьте API-ключ YouTube Data v3",
            () => saveKey("youtubeKey")
          )}
          <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
            <span>Ключ — в</span>
            <a
              href="https://console.cloud.google.com/apis/library/youtube.googleapis.com"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-0.5 text-primary hover:underline"
            >
              Google Cloud Console <ExternalLink className="h-3 w-3" />
            </a>
            {removeLink("youtubeKey")}
          </p>
        </section>

        <section className="rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <CloudUpload className="h-4 w-4" />
              </span>
              <div>
                <h2 className="font-semibold leading-tight">Яндекс.Диск</h2>
                <p className="text-xs text-muted-foreground">
                  Облачные сохранения: экспорт и импорт коллекции
                </p>
              </div>
            </div>
            <KeyStatus info={info?.yandex} />
          </div>
          {keyRow("yandexToken", "Вставьте OAuth-токен Яндекс.Диска", () =>
            saveKey("yandexToken")
          )}
          <p className="mt-2 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
            <span>Токен — на</span>
            <a
              href="https://oauth.yandex.ru/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-0.5 text-primary hover:underline"
            >
              oauth.yandex.ru <ExternalLink className="h-3 w-3" />
            </a>
            <span>
              (права доступа: Яндекс.Диск REST API — запись и чтение папки
              приложения)
            </span>
            {removeLink("yandexToken")}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2 border-t pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={checkYandex}
              disabled={busy.checkYandex}
              className="gap-1.5"
            >
              {busy.checkYandex ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              Проверить
            </Button>
            <Button
              size="sm"
              onClick={exportNow}
              disabled={busy.export}
              className="gap-1.5"
            >
              {busy.export ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CloudUpload className="h-3.5 w-3.5" />
              )}
              Экспортировать
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setImportOpen(true)}
              disabled={busy.import}
              className="gap-1.5"
            >
              {busy.import ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CloudDownload className="h-3.5 w-3.5" />
              )}
              Импортировать
            </Button>
          </div>
          <div className="mt-3 space-y-1 text-xs text-muted-foreground">
            {yandexError ? (
              <p className="text-destructive">{yandexError}</p>
            ) : yandexUser ? (
              <p className="text-emerald-600 dark:text-emerald-400">
                Подключён как {yandexUser}
              </p>
            ) : null}
            <p>
              Копия хранится в файле disk:/GameBacklogs/backlog-export.json.
              Последний экспорт: {formatDateTime(info?.lastExportAt ?? null) ?? "—"} ·
              последний импорт: {formatDateTime(info?.lastImportAt ?? null) ?? "—"}
            </p>
          </div>
        </section>
      </div>

      <AlertDialog open={importOpen} onOpenChange={setImportOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Импортировать коллекцию?</AlertDialogTitle>
            <AlertDialogDescription>
              Данные с Яндекс.Диска будут объединены с текущими: игры с совпадающими
              id обновятся более новыми версиями, остальные добавятся. Ничего не
              удаляется.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                importNow();
              }}
            >
              Импортировать
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
