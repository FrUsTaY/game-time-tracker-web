import { NextRequest, NextResponse } from "next/server";
import { getSettings } from "@/lib/settings";

export async function GET(request: NextRequest) {
  const query = (request.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 200);
  if (!query) {
    return NextResponse.json({ error: "Укажите поисковый запрос" }, { status: 400 });
  }

  const { youtubeKey } = await getSettings();
  if (!youtubeKey) {
    return NextResponse.json({ results: null, reason: "no_key" });
  }

  const params = new URLSearchParams({
    key: youtubeKey,
    part: "snippet",
    q: query,
    type: "video",
    maxResults: "6",
  });

  try {
    const res = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`, {
      cache: "no-store",
    });
    if (!res.ok) {
      let reason = "api_error";
      try {
        const err = await res.json();
        const apiReason = err?.error?.errors?.[0]?.reason;
        if (apiReason === "quotaExceeded") reason = "quota";
        else if (res.status === 400 || apiReason === "keyInvalid") reason = "bad_key";
      } catch {
        // тело ошибки разобрать не удалось — оставляем api_error
      }
      return NextResponse.json({ results: null, reason }, { status: 200 });
    }
    const data = (await res.json()) as {
      items?: { id?: { videoId?: string }; snippet?: { title: string; channelTitle: string; thumbnails?: { medium?: { url?: string } } } }[];
    };
    const results = (data.items ?? [])
      .filter((item) => item.id?.videoId)
      .map((item) => ({
        videoId: item.id!.videoId!,
        title: item.snippet?.title ?? "",
        channel: item.snippet?.channelTitle ?? "",
        thumbnail: item.snippet?.thumbnails?.medium?.url ?? "",
      }));
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: null, reason: "network" });
  }
}
