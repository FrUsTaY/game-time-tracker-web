import { NextRequest, NextResponse } from "next/server";
import { RawgError, mapRawgToGameFields, searchGames } from "@/lib/rawg";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const query = (request.nextUrl.searchParams.get("q") ?? "").trim();
  if (query.length < 2) {
    return NextResponse.json({ results: [] });
  }
  try {
    const results = await searchGames(query);
    return NextResponse.json({ results: results.map(mapRawgToGameFields) });
  } catch (error) {
    const status = error instanceof RawgError ? error.status : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ошибка поиска" },
      { status }
    );
  }
}
