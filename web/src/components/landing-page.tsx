import Link from "next/link";
import { VidSumWordmark } from "@/components/vidsum-wordmark";
import type { LandingSong } from "@/data/landing-coverflow-songs";
import { LandingCoverflowHero } from "@/components/landing/landing-coverflow-hero";
import { VynoraLanding } from "@/components/vynora-landing";

type Props = {
  songs: LandingSong[];
};

export function LandingPage({ songs }: Props) {
  return (
    <div className="min-h-screen bg-black text-white">
      <header className="fixed top-0 z-50 w-full border-b border-gray-800 bg-black/50 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex min-w-0 items-center">
            <VidSumWordmark size="lg" priority />
          </Link>
          <nav className="hidden gap-8 md:flex">
            <a
              href="#workflow"
              className="text-gray-300 transition-colors hover:text-white"
            >
              Workflow
            </a>
            <a
              href="#pricing"
              className="text-gray-300 transition-colors hover:text-white"
            >
              Pricing
            </a>
          </nav>
          <div className="flex gap-3">
            <Link
              href="/dashboard"
              className="rounded-lg border border-gray-700 bg-transparent px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800"
            >
              Sign in
            </Link>
            <Link
              href="/dashboard"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      <LandingCoverflowHero songs={songs} />
      <VynoraLanding songs={songs} />

      <footer className="border-t border-gray-800 bg-black px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 grid gap-8 md:grid-cols-4">
            <div>
              <div className="mb-4 flex items-center">
                <VidSumWordmark size="lg" />
              </div>
              <p className="text-sm text-gray-400">
                AI-powered YouTube analysis: segments, summaries, and takeaways.
              </p>
            </div>
            <div>
              <h4 className="mb-4 font-semibold">Product</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>
                  <a href="#workflow" className="transition hover:text-white">
                    Workflow
                  </a>
                </li>
                <li>
                  <a href="#pricing" className="transition hover:text-white">
                    Pricing
                  </a>
                </li>
                <li>
                  <Link href="/dashboard" className="transition hover:text-white">
                    Dashboard
                  </Link>
                </li>
                <li>
                  <Link
                    href="/settings/billing"
                    className="transition hover:text-white"
                  >
                    Plan &amp; billing
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4 font-semibold">Company</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>
                  <span className="text-gray-500">About</span>
                </li>
                <li>
                  <span className="text-gray-500">Blog</span>
                </li>
                <li>
                  <span className="text-gray-500">Careers</span>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4 font-semibold">Legal</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>
                  <span className="text-gray-500">Privacy</span>
                </li>
                <li>
                  <span className="text-gray-500">Terms</span>
                </li>
                <li>
                  <span className="text-gray-500">Contact</span>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-sm text-gray-400">
            <p>&copy; {new Date().getFullYear()} VidSum. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
