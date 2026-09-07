import { NextResponse } from "next/server";
import { getSettings } from "@/lib/settings";
import { GigaError, getAccessToken } from "@/lib/giga";

export const dynamic = "force-dynamic";

export async function GET() {
  const { gigaKey } = await getSettings();
  if (!gigaKey) {
    return NextResponse.json({ ok: false, error: "Ключ не задан" }, { status: 200 });
  }
  try {
    await getAccessToken(gigaKey);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const status = error instanceof GigaError ? error.status : 502;
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "Ошибка подключения",
      status,
    });
  }
}
