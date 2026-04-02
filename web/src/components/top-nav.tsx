import Link from "next/link";
import { Video } from "lucide-react";
import { AuthControls } from "./auth-controls";

export function TopNav() {
  return (
    <header
      className="sticky top-0 z-[200] flex h-14 min-w-0 shrink-0 items-center justify-between overflow-x-hidden border-b border-gray-800 bg-zinc-950 px-6"
      aria-label="Top navigation"
    >
      <Link
        href="/dashboard/discover"
        className="flex items-center gap-2 transition-opacity hover:opacity-90"
      >
        <div
          className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600"
          aria-hidden
        >
          <Video className="h-4 w-4 text-white" />
        </div>
        <span className="text-[17px] font-semibold tracking-tight text-white">
          VidSum
        </span>
      </Link>
      <div className="flex items-center gap-4">
        <AuthControls />
      </div>
    </header>
  );
}
