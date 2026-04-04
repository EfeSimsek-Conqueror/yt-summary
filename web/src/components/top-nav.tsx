import Link from "next/link";
import { AuthControls } from "./auth-controls";
import { VidSumWordmark } from "./vidsum-wordmark";

export function TopNav() {
  return (
    <header
      className="sticky top-0 z-[200] flex h-14 min-w-0 shrink-0 items-center justify-between border-b border-gray-800 bg-zinc-950 px-6"
      aria-label="Top navigation"
    >
      <Link
        href="/dashboard/discover"
        className="flex min-w-0 items-center transition-opacity hover:opacity-90"
      >
        <VidSumWordmark size="md" />
      </Link>
      <div className="flex items-center gap-4">
        <AuthControls />
      </div>
    </header>
  );
}
