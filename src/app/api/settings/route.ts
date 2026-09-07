import { NextRequest, NextResponse } from "next/server";
import { getSettings, maskKey, saveSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  const settings = await getSettings();
  return NextResponse.json({
    rawg: { set: Boolean(settings.rawgKey), hint: maskKey(settings.rawgKey) },
    giga: { set: Boolean(settings.gigaKey), hint: maskKey(settings.gigaKey) },
    youtube: { set: Boolean(settings.youtubeKey), hint: maskKey(settings.youtubeKey) },
    yandex: { set: Boolean(settings.yandexToken), hint: maskKey(settings.yandexToken) },
    lastExportAt: settings.lastExportAt ?? null,
    lastImportAt: settings.lastImportAt ?? null,
  });
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }
  const patch: Record<string, string> = {};
  for (const key of ["rawgKey", "gigaKey", "youtubeKey", "yandexToken"] as const) {
    if (key in body) patch[key] = String(body[key] ?? "");
  }
  await saveSettings(patch);
  const settings = await getSettings();
  return NextResponse.json({
    ok: true,
    rawg: { set: Boolean(settings.rawgKey), hint: maskKey(settings.rawgKey) },
    giga: { set: Boolean(settings.gigaKey), hint: maskKey(settings.gigaKey) },
    youtube: { set: Boolean(settings.youtubeKey), hint: maskKey(settings.youtubeKey) },
    yandex: { set: Boolean(settings.yandexToken), hint: maskKey(settings.yandexToken) },
  });
}
