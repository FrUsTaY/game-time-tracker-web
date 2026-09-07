"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, CalendarClock, Gauge, Loader2, PersonStanding, Send, Sparkles, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  error?: boolean;
}

const SUGGESTIONS = [
  "Что мне поиграть следующим из бэклога?",
  "Сколько часов я наиграл за всё время?",
  "Составь план игрового вечера на 2 часа",
  "Какие игры из бэклога можно пройти быстро?",
];

const SCENARIOS = [
  {
    icon: PersonStanding,
    label: "Портрет геймера",
    prompt:
      "Проанализируй мою игровую библиотеку и составь портрет геймера: любимые жанры, стиль прохождения, предпочтения и пару неожиданных наблюдений.",
  },
  {
    icon: Sparkles,
    label: "Что пройти следующим?",
    prompt:
      "Учитывая время прохождения, приоритеты и текущие активные игры, предложи, что пройти следующим. Обоснуй выбор.",
  },
  {
    icon: Gauge,
    label: "Совет по активной игре",
    prompt:
      "Дай тактический совет по моей активной игре: механики, билд или скрытые фишки. Без спойлеров.",
  },
  {
    icon: CalendarClock,
    label: "График зачистки · 10 ч/нед",
    prompt:
      "Построи график зачистки всего бэклога при темпе 10 часов в неделю: посчитай количество недель и стратегию чередования коротких и длинных игр.",
  },
] as const;

function renderContent(text: string) {
  return text.split("\n").map((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) return <div key={index} className="h-1.5" />;
    const listMatch = /^([-•*]|\d+[.)])\s+/.exec(trimmed);
    const content = listMatch ? trimmed.slice(listMatch[0].length) : trimmed;
    const parts = content.split(/(\*\*[^*]+\*\*)/g).map((part, partIndex) =>
      part.startsWith("**") && part.endsWith("**") ? (
        <strong key={partIndex}>{part.slice(2, -2)}</strong>
      ) : (
        part
      )
    );
    return (
      <p key={index} className={cn(listMatch && "flex gap-2 pl-1")}>
        {listMatch && <span className="text-primary">•</span>}
        <span>{parts}</span>
      </p>
    );
  });
}

export function AssistantChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [withContext, setWithContext] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, sending]);

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || sending) return;
    const userMessage: ChatMessage = { role: "user", content };
    const history = [...messages, userMessage];
    setMessages([...history, { role: "assistant", content: "" }]);
    setInput("");
    setSending(true);
    try {
      const res = await fetch("/api/giga/chat/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history.map(({ role, content: c }) => ({ role, content: c })),
          includeContext: withContext,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Ошибка GigaChat");
      setMessages([
        ...history,
        { role: "assistant", content: data.reply || "Пустой ответ" },
      ]);
    } catch (error) {
      setMessages([
        ...history,
        {
          role: "assistant",
          content:
            error instanceof Error ? error.message : "Не удалось получить ответ",
          error: true,
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mx-auto flex h-[calc(100dvh-3.5rem)] w-full max-w-3xl flex-col px-4 py-4 md:h-dvh md:px-8 md:py-8">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3">
        <div>
          <h1 className="flex items-center gap-2 font-display text-xl tracking-tight md:text-2xl">
            <Sparkles className="h-5 w-5 text-primary" /> Giga-помощник
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Игровой ассистент на базе GigaChat, знающий ваш бэклог
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            id="assistant-context"
            checked={withContext}
            onCheckedChange={setWithContext}
          />
          <Label htmlFor="assistant-context" className="text-sm text-muted-foreground">
            Учитывать мой бэклог
          </Label>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 space-y-4 overflow-y-auto rounded-xl border bg-card p-4"
      >
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white">
              <Sparkles className="h-7 w-7" />
            </span>
            <div>
              <p className="font-semibold">Чем помочь?</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Спросите совета, что играть дальше, попросите собрать план на вечер
                или посчитать часы в бэклоге.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((suggestion) => (
                <Button
                  key={suggestion}
                  variant="outline"
                  size="sm"
                  className="h-auto whitespace-normal py-1.5 text-xs"
                  onClick={() => send(suggestion)}
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              key={index}
              className={cn("flex gap-2.5", message.role === "user" && "flex-row-reverse")}
            >
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                  message.role === "user"
                    ? "bg-primary/15 text-primary"
                    : "bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white"
                )}
              >
                {message.role === "user" ? (
                  <User className="h-3.5 w-3.5" />
                ) : (
                  <Bot className="h-3.5 w-3.5" />
                )}
              </span>
              <div
                className={cn(
                  "max-w-[85%] space-y-1 rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : message.error
                      ? "border border-destructive/40 bg-destructive/10"
                      : "border bg-background"
                )}
              >
                {message.content ? (
                  renderContent(message.content)
                ) : (
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Думает…
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="pb-3">
        <div className="flex flex-wrap gap-1.5">
          {SCENARIOS.map((scenario) => {
            const Icon = scenario.icon;
            return (
              <Button
                key={scenario.label}
                variant="outline"
                size="sm"
                disabled={sending}
                className="h-auto py-1.5 text-xs shadow-comic-sm"
                onClick={() => send(scenario.prompt)}
              >
                <Icon className="mr-1.5 h-3.5 w-3.5" />
                {scenario.label}
              </Button>
            );
          })}
        </div>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          send();
        }}
        className="mt-3 flex gap-2"
      >
        <Input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Спросите что-нибудь о своих играх…"
          disabled={sending}
          className="flex-1"
        />
        <Button type="submit" disabled={sending || !input.trim()} aria-label="Отправить">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
