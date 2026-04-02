"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/settings", label: "Account" },
  { href: "/settings/billing", label: "Plan & billing" },
] as const;

export function SettingsNav() {
  const pathname = usePathname();

  return (
    <nav
      className="mb-8 flex gap-1 rounded-xl border border-gray-800/80 bg-zinc-950/60 p-1 backdrop-blur-sm"
      aria-label="Settings sections"
    >
      {tabs.map(({ href, label }) => {
        const active =
          href === "/settings"
            ? pathname === "/settings"
            : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={`relative flex-1 rounded-lg px-4 py-2.5 text-center text-sm font-medium transition ${
              active
                ? "bg-gradient-to-r from-purple-600/40 to-pink-600/30 text-white shadow-inner shadow-purple-500/20"
                : "text-gray-400 hover:bg-zinc-900/80 hover:text-white"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
