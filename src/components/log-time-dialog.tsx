"use client";

import { useEffect, useState } from "react";
import { Loader2, Timer } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatHours, type Game } from "@/lib/types";

const PRESETS = [0.5, 1, 2, 3, 5];

interface LogTimeDialogProps {
  game: Game | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (hours: number, date: string) => Promise<void>;
}

function todayValue(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export function LogTimeDialog({ game, open, onOpenChange, onSubmit }: LogTimeDialogProps) {
  const [hours, setHours] = useState<string>("1");
  const [date, setDate] = useState(todayValue());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setHours("1");
      setDate(todayValue());
    }
  }, [open, game?.id]);

  const submit = async () => {
    const value = Number(hours);
    if (!Number.isFinite(value) || value <= 0 || value > 48) {
      toast.error("Введите время от 0.1 до 48 часов");
      return;
    }
    setSaving(true);
    try {
      await onSubmit(Math.round(value * 100) / 100, date);
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Не удалось записать");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Timer className="h-4 w-4 text-primary" /> Записать время
          </DialogTitle>
          <DialogDescription>
            {game ? `«${game.title}» · сейчас наиграно ${formatHours(game.hoursPlayed)}` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setHours(String(preset))}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm transition-colors",
                  Number(hours) === preset
                    ? "border-primary bg-primary/10 font-medium text-primary"
                    : "text-muted-foreground hover:border-primary/40 hover:text-foreground"
                )}
              >
                +{preset} ч
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="log-hours">Часов</Label>
              <Input
                id="log-hours"
                type="number"
                min="0.1"
                max="48"
                step="0.5"
                value={hours}
                onChange={(event) => setHours(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="log-date">Дата сессии</Label>
              <Input
                id="log-date"
                type="date"
                value={date}
                max={todayValue()}
                onChange={(event) => setDate(event.target.value)}
              />
            </div>
          </div>

          <Button onClick={submit} disabled={saving} className="w-full">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Записать {hours && Number(hours) > 0 ? `+${hours} ч` : ""}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
