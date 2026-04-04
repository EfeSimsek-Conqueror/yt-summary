"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CreditCard,
  Library,
  SlidersHorizontal,
  User,
} from "lucide-react";
import type { ReactNode } from "react";

const tabs: { href: string; label: string; icon: ReactNode }[] = [
  { href: "/settings", label: "Account", icon: <User className="h-4 w-4" /> },
  {
    href: "/settings/billing",
    label: "Plan & billing",
    icon: <CreditCard className="h-4 w-4" />,
  },
  {
    href: "/settings/preferences",
    label: "Preferences",
    icon: <SlidersHorizontal className="h-4 w-4" />,
  },
  {
    href: "/settings/playlists",
    label: "Library",
    icon: <Library className="h-4 w-4" />,
  },
];

export function SettingsNav() {
  const pathname = usePathname();

  return (
    <nav
      className="mb-8 flex gap-1 overflow-x-auto rounded-xl border border-gray-800/80 bg-zinc-950/60 p-1 backdrop-blur-sm"
      aria-label="Settings sections"
    >
      {tabs.map(({ href, label, icon }) => {
        const active =
          href === "/settings"
            ? pathname === "/settings"
            : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={`relative flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2.5 text-center text-sm font-medium transition ${
              active
                ? "bg-gradient-to-r from-purple-600/40 to-pink-600/30 text-white shadow-inner shadow-purple-500/20"
                : "text-gray-400 hover:bg-zinc-900/80 hover:text-white"
            }`}
          >
            {icon}
            <span className="hidden sm:inline">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
