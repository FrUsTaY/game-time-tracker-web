"use client";

import { cn } from "@/lib/utils";
import { GAME_RATINGS, RATING_META, type GameRating } from "@/lib/types";

interface RatingPickerProps {
  value: GameRating | null;
  onChange: (value: GameRating | null) => void;
}

export function RatingPicker({ value, onChange }: RatingPickerProps) {
  return (
    <div
      className="grid grid-cols-2 gap-1.5"
      role="radiogroup"
      aria-label="Личная оценка"
    >
      {GAME_RATINGS.map((key) => {
        const meta = RATING_META[key];
        const active = value === key;
        return (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={active}
            title={active ? "Сбросить оценку" : meta.label}
            onClick={() => onChange(active ? null : key)}
            className={cn(
              "flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all",
              active
                ? cn("border-transparent font-semibold ring-2", meta.ring, meta.active)
                : "text-muted-foreground hover:border-primary/40 hover:text-foreground"
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={meta.icon}
              alt=""
              width={24}
              height={24}
              className="h-6 w-6 shrink-0"
            />
            {meta.label}
          </button>
        );
      })}
    </div>
  );
}
