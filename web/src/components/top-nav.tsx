import { AuthControls } from "./auth-controls";

export function TopNav() {
  return (
    <header
      className="flex h-14 shrink-0 items-center justify-between border-b border-line bg-surface px-6"
      aria-label="Top navigation"
    >
      <div className="flex items-center gap-2.5">
        <div
          className="h-7 w-7 rounded-md bg-gradient-to-br from-red-500 to-red-800"
          aria-hidden
        />
        <span className="text-[15px] font-bold tracking-tight">TubeSummary</span>
      </div>
      <div className="flex items-center gap-4">
        <AuthControls />
      </div>
    </header>
  );
}
