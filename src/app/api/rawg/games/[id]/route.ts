import { NextResponse } from "next/server";
import { RawgError, getGame, mapRawgToGameFields } from "@/lib/rawg";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const rawgId = Number(id);
  if (!Number.isInteger(rawgId) || rawgId <= 0) {
    return NextResponse.json({ error: "Некорректный id игры" }, { status: 400 });
  }
  try {
    const game = await getGame(rawgId);
    return NextResponse.json({ game: mapRawgToGameFields(game) });
  } catch (error) {
    const status = error instanceof RawgError ? error.status : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ошибка RAWG" },
      { status }
    );
  }
}
