"use client";

import { useCallback, useEffect, useState } from "react";
import type { Game, GameDraft } from "@/lib/types";

export function useGames() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/games/", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Не удалось загрузить игры");
      setGames(data.games ?? []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createGame = useCallback(
    async (draft: GameDraft) => {
      const res = await fetch("/api/games/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Не удалось добавить игру");
      await refresh();
      return data.game as Game;
    },
    [refresh]
  );

  const updateGame = useCallback(
    async (id: string, patch: Record<string, unknown>) => {
      const res = await fetch(`/api/games/${id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Не удалось обновить игру");
      await refresh();
      return data.game as Game;
    },
    [refresh]
  );

  const deleteGame = useCallback(
    async (id: string) => {
      const res = await fetch(`/api/games/${id}/`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Не удалось удалить игру");
      await refresh();
    },
    [refresh]
  );

  return { games, loading, error, refresh, createGame, updateGame, deleteGame };
}
