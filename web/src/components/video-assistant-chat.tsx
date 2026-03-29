"use client";

import { MessageCircle, Send, Sparkles } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buildVideoChatContext } from "@/lib/video-chat-context";
import type { AnalysisPayload } from "@/lib/types";

type ChatMessage = { role: "user" | "assistant"; content: string };

type Props = {
  videoId: string;
  videoTitle: string;
  analysis: AnalysisPayload;
  canSeek: boolean;
  onSeek: (sec: number) => void;
  formatSecondsAsMmSs: (sec: number) => string;
};

function buildQuickPrompts(analysis: AnalysisPayload): string[] {
  const { contentKind, hypeMoments, segments, keyMoments } = analysis;
  const prompts: string[] = [];

  if (hypeMoments.length > 0) {
    prompts.push("Jump to the first hype moment");
    if (hypeMoments.length > 1) {
      prompts.push("Go to the strongest hype peak");
    }
    prompts.push("En iyi hype anına git");
  }

  if (segments.length >= 2) {
    prompts.push("Go to segment 2");
    prompts.push("İkinci bölüme git");
  } else if (segments.length === 1) {
    prompts.push("Jump to this section");
  }

  const km0 = keyMoments[0]?.trim();
  if (km0) {
    const short = km0.length > 52 ? `${km0.slice(0, 49)}…` : km0;
    prompts.push(`Jump to: ${short}`);
  }

  if (contentKind === "music") {
    prompts.push("Şarkının en yoğun yerine git");
    prompts.push("Take me to the chorus / drop");
  }
  if (contentKind === "tutorial") {
    prompts.push("Jump to the main how-to part");
    prompts.push("Anlatımın özüne git");
  }
  if (contentKind === "podcast" || contentKind === "news") {
    prompts.push("Skip to the main story");
  }

  const textBlob = [
    ...keyMoments,
    ...segments.flatMap((s) => [s.heading ?? "", ...s.bullets]),
  ]
    .join(" ")
    .toLowerCase();
  if (/\b(goal|gol|scor|match|maç|futbol|soccer)\b/i.test(textBlob)) {
    prompts.push("Gol anına git");
    prompts.push("Jump to the goal moment");
  }

  const seen = new Set<string>();
  const uniq = prompts.filter((p) => {
    if (seen.has(p)) return false;
    seen.add(p);
    return true;
  });

  if (uniq.length < 3) {
    uniq.push(
      "What is this video mainly about?",
      "Özeti bir cümlede söyle",
    );
  }

  return uniq.slice(0, 8);
}

export function VideoAssistantChat({
  videoId,
  videoTitle,
  analysis,
  canSeek,
  onSeek,
  formatSecondsAsMmSs,
}: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const quickPrompts = useMemo(() => buildQuickPrompts(analysis), [analysis]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  const send = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text || busy) return;
      setBusy(true);
      setError(null);
      const prior = messagesRef.current;
      setMessages((m) => [...m, { role: "user", content: text }]);
      setInput("");
      try {
        const res = await fetch("/api/ai/video-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            videoId,
            videoTitle,
            message: text,
            history: prior,
            context: buildVideoChatContext(analysis),
          }),
        });
        const data: unknown = await res.json().catch(() => ({}));
        if (!res.ok) {
          const err =
            typeof (data as { error?: string }).error === "string"
              ? (data as { error: string }).error
              : "Request failed";
          throw new Error(err);
        }
        const d = data as {
          reply?: string;
          seekToSec?: number | null;
          parseWarning?: string;
        };
        const reply =
          typeof d.reply === "string" && d.reply.trim()
            ? d.reply.trim()
            : "No reply.";
        let seekNote = "";
        if (
          typeof d.seekToSec === "number" &&
          Number.isFinite(d.seekToSec) &&
          canSeek
        ) {
          onSeek(d.seekToSec);
          seekNote = `\n\n— Jumped to ${formatSecondsAsMmSs(d.seekToSec)} in the player.`;
        } else if (
          typeof d.seekToSec === "number" &&
          Number.isFinite(d.seekToSec) &&
          !canSeek
        ) {
          seekNote =
            "\n\n— (Interactive player required to jump — use Retry if embed is simple.)";
        }
        const warn =
          typeof d.parseWarning === "string" ? `\n\n(${d.parseWarning})` : "";
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            content: `${reply}${seekNote}${warn}`,
          },
        ]);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Chat failed");
        setMessages((m) => m.slice(0, -1));
      } finally {
        setBusy(false);
      }
    },
    [analysis, canSeek, formatSecondsAsMmSs, onSeek, videoId, videoTitle],
  );

  return (
    <section
      className="overflow-hidden rounded-xl border border-line bg-gradient-to-b from-accent/[0.07] to-canvas/80 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]"
      aria-label="Video AI chat"
    >
      <div className="border-b border-line/80 bg-raised/40 px-3.5 py-3">
        <div className="flex items-start gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/20 text-accent ring-1 ring-accent/30">
            <Sparkles className="h-4 w-4" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold tracking-tight text-foreground">
              Video AI chat
            </h3>
            <p className="mt-0.5 text-[11px] leading-snug text-muted">
              This video only — ask in Turkish or English. Say where to go (hype
              moment, goal, segment, chorus…) and the player can{" "}
              <span className="text-foreground/90">seek</span> when the
              interactive player is on.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3 p-3.5 pt-3">
        <div className="flex flex-wrap gap-1.5">
          {quickPrompts.map((q) => (
            <button
              key={q}
              type="button"
              disabled={busy}
              onClick={() => void send(q)}
              className="rounded-full border border-line/90 bg-raised/90 px-2.5 py-1 text-[10px] font-medium leading-tight text-muted transition hover:border-accent/40 hover:bg-surface hover:text-foreground disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>

        <div
          ref={scrollRef}
          className="max-h-[min(16rem,40vh)] space-y-2 overflow-y-auto rounded-lg border border-line/80 bg-canvas/60 p-2.5 [scrollbar-gutter:stable]"
          aria-label="Video assistant messages"
        >
          {messages.length === 0 ? (
            <div className="flex gap-2 rounded-lg border border-dashed border-line/60 bg-surface/40 px-2.5 py-3 text-[11px] text-muted">
              <MessageCircle
                className="mt-0.5 h-4 w-4 shrink-0 text-accent/80"
                aria-hidden
              />
              <p className="leading-relaxed">
                Ask anything about <span className="font-medium text-foreground/90">this</span>{" "}
                video — summaries, moments, or “jump to…”.
              </p>
            </div>
          ) : (
            messages.map((m, i) => (
              <div
                key={i}
                className={`rounded-lg px-2.5 py-2 text-[13px] leading-relaxed ${
                  m.role === "user"
                    ? "ml-1 border border-accent/25 bg-accent/[0.08] text-foreground"
                    : "mr-1 border border-line/70 bg-surface/95 text-muted"
                }`}
              >
                <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted/90">
                  {m.role === "user" ? "You" : "Assistant"}
                </span>
                <p className="whitespace-pre-wrap">{m.content}</p>
              </div>
            ))
          )}
        </div>

        {error ? (
          <p className="text-[11px] text-red-400" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex gap-2">
          <label className="sr-only" htmlFor="vidsum-video-chat-input">
            Message to video assistant
          </label>
          <input
            id="vidsum-video-chat-input"
            type="text"
            value={input}
            disabled={busy}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send(input);
              }
            }}
            placeholder={
              busy
                ? "Waiting…"
                : "e.g. Gol anına git · Jump to the drop · 3. segmente git"
            }
            className="min-w-0 flex-1 rounded-lg border border-line bg-canvas px-3 py-2.5 text-sm text-foreground placeholder:text-muted/55 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent disabled:opacity-60"
            autoComplete="off"
          />
          <button
            type="button"
            disabled={busy || !input.trim()}
            onClick={() => void send(input)}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-accent/45 bg-accent/15 px-3 py-2.5 text-sm font-semibold text-accent transition hover:bg-accent/25 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send className="h-4 w-4" aria-hidden />
            Send
          </button>
        </div>
      </div>
    </section>
  );
}
