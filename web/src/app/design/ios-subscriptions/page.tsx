/**
 * Static mock of VidSum iOS “Abonelikler” for Figma html-to-design capture.
 * Route: /design/ios-subscriptions
 */
export default function IosSubscriptionsDesignPage() {
  const rows = [
    { name: "Hiddenreaction", thumb: "HR" },
    { name: "Family Feud", thumb: "FF" },
    { name: "Lip Sync Battle", thumb: "LS" },
  ];

  return (
    <div className="mx-auto min-h-screen max-w-[430px] bg-black font-sans text-white">
      {/* Status bar placeholder */}
      <div className="flex items-center justify-between px-6 pt-3 text-[13px] text-white/90">
        <span>12:14</span>
        <div className="flex items-center gap-1">
          <span className="text-[11px]">●●●●</span>
          <span className="text-[11px]">100%</span>
        </div>
      </div>

      <div className="px-4 pt-2">
        <h1 className="text-[34px] font-bold leading-tight tracking-tight">
          Abonelikler
        </h1>
      </div>

      {/* Searchable-style row (iOS .searchable) */}
      <div className="px-4 pt-3">
        <div className="flex items-center gap-2 rounded-xl bg-[#1C1C1E] px-3 py-2.5">
          <svg
            className="h-4 w-4 shrink-0 text-[#8E8E93]"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z"
            />
          </svg>
          <span className="text-[17px] text-[#8E8E93]">Kanallarda ara</span>
        </div>
      </div>

      {/* Inset grouped list */}
      <div className="px-4 pt-4">
        <div className="overflow-hidden rounded-[10px] bg-[#1C1C1E]">
          {rows.map((row, i) => (
            <div
              key={row.name}
              className={`flex items-center gap-3 px-4 py-3 ${
                i > 0 ? "border-t border-black/40" : ""
              }`}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-zinc-700 text-xs font-semibold text-white/90">
                {row.thumb}
              </div>
              <span className="min-w-0 flex-1 text-[17px] leading-snug">
                {row.name}
              </span>
              <span className="text-[#8E8E93]">›</span>
            </div>
          ))}
        </div>
      </div>

      <p className="px-4 pt-6 text-center text-[11px] text-zinc-600">
        VidSum iOS — tasarım referansı (Figma capture)
      </p>
    </div>
  );
}
