"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Dices,
  Gamepad2,
  Heart,
  Layers,
  LayoutDashboard,
  Menu,
  PauseCircle,
  Settings,
  Sparkles,
  Trophy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

const NAV_ITEMS = [
  { href: "/", label: "Обзор", icon: LayoutDashboard },
  { href: "/playing", label: "Активные", icon: Gamepad2 },
  { href: "/backlog", label: "Бэклог", icon: Layers },
  { href: "/wishlist", label: "Вишлист", icon: Heart },
  { href: "/completed", label: "Пройденные", icon: Trophy },
  { href: "/paused", label: "Пауза / Дроп", icon: PauseCircle },
  { href: "/wheel", label: "Колесо выбора", icon: Dices },
  { href: "/analytics", label: "Аналитика", icon: BarChart3 },
  { href: "/assistant", label: "Giga-помощник", icon: Sparkles },
  { href: "/settings", label: "Настройки", icon: Settings },
] as const;

type Integrations = { rawg?: boolean; giga?: boolean; yandex?: boolean };

function Brand() {
  return (
    <Link href="/" className="group flex items-center gap-2.5 px-2">
      <Image
        src="/brand-icon.png"
        alt=""
        width={36}
        height={36}
        priority
        className="h-9 w-9 shrink-0 rounded-xl border-2 border-foreground object-cover shadow-comic-sm"
      />
      <span className="flex flex-col leading-tight">
        <span className="font-display glitch-title text-sm font-bold tracking-tight text-foreground">
          GameBacklogs
        </span>
        <span className="text-[11px] text-muted-foreground">
          трекер игрового бэклога
        </span>
      </span>
    </Link>
  );
}

function IntegrationStatus({ integrations }: { integrations: Integrations | null }) {
  const items = [
    { key: "rawg", label: "RAWG" },
    { key: "giga", label: "GigaChat" },
    { key: "yandex", label: "Яндекс.Диск" },
  ] as const;
  return (
    <Link
      href="/settings"
      className="group flex items-center justify-between rounded-lg border bg-background/50 px-3 py-2 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
    >
      <span>Интеграции</span>
      <span className="flex items-center gap-1.5">
        {items.map((item) => (
          <span
            key={item.key}
            title={`${item.label}: ${integrations === null ? "…" : integrations[item.key] ? "подключён" : "не задан"}`}
            className={cn(
              "h-2 w-2 rounded-full transition-colors",
              integrations?.[item.key] ? "bg-emerald-500" : "bg-muted-foreground/30"
            )}
          />
        ))}
      </span>
    </Link>
  );
}

function SidebarNav({
  integrations,
  onNavigate,
}: {
  integrations: Integrations | null;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 shrink-0 items-center border-b px-3">
        <Brand />
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {NAV_ITEMS.map((item) => {
          const active =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "group relative flex items-center gap-3 rounded-lg border-2 border-transparent px-3 py-2 text-sm font-medium transition-all",
                active
                  ? "border-foreground bg-primary shadow-comic-sm"
                  : "text-muted-foreground hover:border-foreground/20 hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="shrink-0 space-y-2 border-t p-3">
        <IntegrationStatus integrations={integrations} />
        <div className="flex items-center justify-between px-1 text-[11px] text-muted-foreground">
          <span>Данные хранятся локально</span>
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [integrations, setIntegrations] = useState<Integrations | null>(null);

  useEffect(() => {
    fetch("/api/settings/")
      .then((res) => res.json())
      .then((data) =>
        setIntegrations({
          rawg: Boolean(data?.rawg?.set),
          giga: Boolean(data?.giga?.set),
          yandex: Boolean(data?.yandex?.set),
        })
      )
      .catch(() => setIntegrations({}));
  }, []);

  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
  }, []);

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r bg-card md:flex md:flex-col">
        <SidebarNav integrations={integrations} />
      </aside>

      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/90 px-4 backdrop-blur md:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Открыть меню">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 border-r bg-card p-0">
            <SheetTitle className="sr-only">Меню</SheetTitle>
            <SidebarNav integrations={integrations} onNavigate={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
        <Brand />
        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </header>

      <main className="md:pl-64">{children}</main>
      <Toaster position="bottom-right" richColors />
    </div>
  );
}
