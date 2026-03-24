import type {
  AnalysisContentKind,
  AnalysisPayload,
} from "@/lib/types";

type Props = {
  canEmbed: boolean;
  analysis: AnalysisPayload | null;
  preAnalysisHint: string;
  summaryPanelScrollable: boolean;
  spoilersRevealed: boolean;
  onRevealSpoilers: () => void;
  activeHypeIdx: number;
  canJump: boolean;
  canSeekEmbed: boolean;
  seekTo: (sec: number) => void;
  formatSecondsAsMmSs: (sec: number) => string;
  needsFictionSpoilerGate: (
    kind: AnalysisContentKind,
    hasSpoilers: boolean,
  ) => boolean;
};

export function YoutubeSummaryTakeawaysPanel({
  canEmbed,
  analysis,
  preAnalysisHint,
  summaryPanelScrollable,
  spoilersRevealed,
  onRevealSpoilers,
  activeHypeIdx,
  canJump,
  canSeekEmbed,
  seekTo,
  formatSecondsAsMmSs,
  needsFictionSpoilerGate,
}: Props) {
  return (
    <>
      <h2 className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-muted">
        {canEmbed ? "Summary & takeaways" : "Transcript preview"}
      </h2>
      <div
        className={`relative min-h-0 flex-1 text-sm leading-relaxed ${
          summaryPanelScrollable
            ? "overflow-y-auto pr-1"
            : "max-h-[140px] overflow-hidden"
        }`}
      >
        {!analysis ? (
          <>
            <p className="whitespace-pre-wrap text-muted">{preAnalysisHint}</p>
            {!summaryPanelScrollable ? (
              <div
                className="pointer-events-none absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-surface to-transparent"
                aria-hidden
              />
            ) : null}
          </>
        ) : (
          <div className="space-y-4 text-muted">
            {analysis.hasSpoilers &&
            !needsFictionSpoilerGate(
              analysis.contentKind,
              analysis.hasSpoilers,
            ) ? (
              <p className="rounded-md border border-amber-500/35 bg-amber-500/10 px-2.5 py-1.5 text-xs text-amber-100/95">
                May contain spoilers for story or gameplay reveals.
              </p>
            ) : null}

            {analysis.keyPoints.length > 0 ? (
              <div>
                <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
                  Key points
                </h3>
                <ul className="list-disc space-y-1.5 pl-5">
                  {analysis.keyPoints.map((k, i) => (
                    <li key={i}>{k}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {analysis.hypeMoments.length > 0 ? (
              <div className="rounded-lg border border-fuchsia-500/30 bg-fuchsia-950/20 p-3">
                <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-fuchsia-200/95">
                  Hype & peak moments
                </h3>
                <p className="mb-2.5 text-[11px] leading-snug text-muted">
                  Drops, chorus hits, and big energy spikes—tap the underlined
                  times to jump in the player.
                </p>
                <ul className="space-y-2">
                  {analysis.hypeMoments.map((h, i) => {
                    const active = i === activeHypeIdx;
                    const canSeek = canJump;
                    const endSec = h.endSec;
                    return (
                      <li key={i}>
                        <div
                          className={`rounded-md border-y border-r border-line border-l-4 border-l-fuchsia-500 py-2 pl-3 pr-2 text-left text-sm transition ${
                            active
                              ? "bg-fuchsia-950/45 ring-2 ring-fuchsia-400/50 ring-offset-2 ring-offset-surface"
                              : ""
                          }`}
                        >
                          <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-1">
                            <button
                              type="button"
                              disabled={!canSeek}
                              onClick={() => seekTo(h.startSec)}
                              className={`rounded px-1.5 py-0.5 text-left font-bold text-fuchsia-300 underline decoration-fuchsia-500/60 underline-offset-2 transition hover:bg-fuchsia-500/15 hover:decoration-fuchsia-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-fuchsia-400 ${
                                !canSeek
                                  ? "cursor-not-allowed opacity-50 no-underline"
                                  : "cursor-pointer"
                              }`}
                              title={
                                !canSeekEmbed
                                  ? "YouTube embed required"
                                  : `Jump to ${formatSecondsAsMmSs(h.startSec)}`
                              }
                              aria-label={`Seek to ${formatSecondsAsMmSs(h.startSec)}`}
                            >
                              {formatSecondsAsMmSs(h.startSec)}
                            </button>
                            {endSec !== undefined ? (
                              <>
                                <span className="text-muted" aria-hidden>
                                  –
                                </span>
                                <button
                                  type="button"
                                  disabled={!canSeek}
                                  onClick={() => seekTo(endSec)}
                                  className={`rounded px-1.5 py-0.5 text-left font-bold text-fuchsia-300 underline decoration-fuchsia-500/60 underline-offset-2 transition hover:bg-fuchsia-500/15 hover:decoration-fuchsia-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-fuchsia-400 ${
                                    !canSeek
                                      ? "cursor-not-allowed opacity-50 no-underline"
                                      : "cursor-pointer"
                                  }`}
                                  title={
                                    !canSeekEmbed
                                      ? "YouTube embed required"
                                      : `Jump to ${formatSecondsAsMmSs(endSec)}`
                                  }
                                  aria-label={`Seek to ${formatSecondsAsMmSs(endSec)}`}
                                >
                                  {formatSecondsAsMmSs(endSec)}
                                </button>
                              </>
                            ) : null}
                          </div>
                          {h.label ? (
                            <p className="mt-1.5 text-[13px] font-medium leading-snug text-foreground">
                              {h.label}
                            </p>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}

            {needsFictionSpoilerGate(
              analysis.contentKind,
              analysis.hasSpoilers,
            ) && !spoilersRevealed ? (
              <div className="rounded-lg border border-amber-500/45 bg-amber-950/35 p-4">
                <p className="mb-1 text-sm font-semibold text-amber-100">
                  Spoilers ahead
                </p>
                <p className="mb-4 text-xs leading-relaxed text-amber-100/88">
                  This looks like a TV, film, or fiction recap. The full summary
                  and revelation list can spoil twists and endings.
                </p>
                <button
                  type="button"
                  onClick={onRevealSpoilers}
                  className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-500"
                >
                  Show summary & spoilers
                </button>
              </div>
            ) : (
              <>
                <p className="whitespace-pre-wrap">
                  {analysis.summaryDetailed}
                </p>
                {analysis.revelations.length > 0 ? (
                  <div className="border-t border-line pt-4">
                    <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
                      Spoilers & revelations
                    </h3>
                    <ul className="list-disc space-y-1.5 pl-5">
                      {analysis.revelations.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
}
