import Link from "next/link";
import {
  BarChart3,
  Check,
  Clock,
  LayoutDashboard,
  ListTree,
  Play,
  Sparkles,
  TrendingUp,
  Users,
  Video,
  Zap,
} from "lucide-react";

/** Sample UI panels — horizontal showcase of the app flow */
function AppShowcaseMarquee() {
  const slides = [
    {
      title: "Subscription feed",
      subtitle: "Latest videos from your channels",
      icon: LayoutDashboard,
      accent: "from-blue-600/30 to-indigo-600/20",
      body: (
        <div className="mt-3 space-y-2">
          <div className="flex h-9 items-center gap-2 rounded-lg border border-gray-700/80 bg-black/40 px-3">
            <div className="h-2 w-2 rounded-full bg-gray-500" />
            <div className="h-2 flex-1 rounded bg-gray-700/80" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="aspect-video rounded-md bg-gradient-to-br from-gray-700/50 to-gray-900/80 ring-1 ring-gray-700/50"
              />
            ))}
          </div>
        </div>
      ),
    },
    {
      title: "Player + analysis",
      subtitle: "Video and AI on one screen",
      icon: Play,
      accent: "from-violet-600/30 to-purple-600/20",
      body: (
        <div className="mt-3 flex gap-2">
          <div className="relative flex-1 overflow-hidden rounded-lg bg-black/50 ring-1 ring-gray-700/60">
            <div className="flex aspect-video items-center justify-center bg-gradient-to-br from-zinc-800 to-black">
              <Play className="h-10 w-10 fill-white/90 text-white/90" />
            </div>
          </div>
          <div className="flex w-[38%] flex-col gap-1.5">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-6 rounded bg-gray-800/90 ring-1 ring-gray-700/50"
                style={{ width: `${70 + i * 8}%` }}
              />
            ))}
          </div>
        </div>
      ),
    },
    {
      title: "Timestamped segments",
      subtitle: "Tap a segment to jump in the video",
      icon: ListTree,
      accent: "from-emerald-600/25 to-teal-600/15",
      body: (
        <div className="mt-3 space-y-2">
          {[
            ["00:12", "Intro"],
            ["02:40", "Main idea"],
            ["08:15", "Summary"],
          ].map(([t, label]) => (
            <div
              key={t}
              className="flex items-center gap-2 rounded-lg border border-gray-700/60 bg-black/35 px-2.5 py-2"
            >
              <span className="rounded bg-blue-600/25 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-blue-300">
                {t}
              </span>
              <span className="truncate text-xs text-gray-300">{label}</span>
            </div>
          ))}
        </div>
      ),
    },
    {
      title: "Summary & takeaways",
      subtitle: "Key points with AI",
      icon: Sparkles,
      accent: "from-amber-600/25 to-orange-600/15",
      body: (
        <div className="mt-3 space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {[1, 2, 3].map((i) => (
              <span
                key={i}
                className="rounded-full border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-[10px] text-blue-200/95"
              >
                {["Summary", "Tone", "Topic"][i - 1]}
              </span>
            ))}
          </div>
          <div className="space-y-1.5 pl-1">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-2 text-[11px] text-gray-400">
                <span className="text-blue-400/90">•</span>
                <span className="h-2 flex-1 rounded bg-gray-700/70" />
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      title: "Sentiment & hype",
      subtitle: "Highlights",
      icon: Zap,
      accent: "from-fuchsia-600/25 to-pink-600/15",
      body: (
        <div className="mt-3 rounded-lg border border-fuchsia-500/25 bg-fuchsia-950/20 p-2.5">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-fuchsia-200/90">
            Peak moments
          </p>
          <div className="flex gap-2">
            <div className="h-2 w-12 rounded-full bg-fuchsia-500/30" />
            <div className="h-2 flex-1 rounded-full bg-gray-700/80" />
          </div>
          <div className="mt-2 text-[11px] leading-snug text-gray-400">
            Chorus, drops, or the most exciting clips…
          </div>
        </div>
      ),
    },
  ] as const;

  function slideRow(keySuffix: string) {
    return (
      <div className="flex w-max gap-5 pr-5">
        {slides.map((slide) => {
          const Icon = slide.icon;
          return (
            <article
              key={`${slide.title}-${keySuffix}`}
              className="w-[min(85vw,380px)] shrink-0 overflow-hidden rounded-2xl border border-gray-800 bg-zinc-950/95 shadow-2xl shadow-black/50 ring-1 ring-white/5"
            >
              <div
                className={`bg-gradient-to-br px-4 pb-3 pt-3.5 ${slide.accent}`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-black/35 ring-1 ring-white/10">
                    <Icon className="h-5 w-5 text-white/95" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-white">
                      {slide.title}
                    </h3>
                    <p className="text-[11px] text-gray-400">{slide.subtitle}</p>
                  </div>
                </div>
              </div>
              <div className="border-t border-gray-800/80 p-4">{slide.body}</div>
            </article>
          );
        })}
      </div>
    );
  }

  return (
    <div className="relative mt-16">
      <p className="mb-4 text-center text-sm text-gray-500">
        Example screens from the app — auto-scrolling
      </p>
      <div className="relative overflow-hidden py-4">
        <div
          className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-black to-transparent md:w-24"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-black to-transparent md:w-24"
          aria-hidden
        />
        <div className="flex w-max motion-safe:animate-landing-marquee motion-safe:hover:[animation-play-state:paused]">
          {slideRow("a")}
          {slideRow("b")}
        </div>
      </div>
    </div>
  );
}

export function LandingPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <header className="fixed top-0 z-50 w-full border-b border-gray-800 bg-black/50 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
              <Video className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-semibold">VidSum</span>
          </Link>
          <nav className="hidden gap-8 md:flex">
            <a
              href="#features"
              className="text-gray-300 transition-colors hover:text-white"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              className="text-gray-300 transition-colors hover:text-white"
            >
              How It Works
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
              Sign In
            </Link>
            <Link
              href="/dashboard"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      <section className="px-4 pb-20 pt-32 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-600/20 bg-blue-600/10 px-4 py-2">
              <Zap className="h-4 w-4 text-blue-400" />
              <span className="text-sm text-blue-400">AI-Powered YouTube Analysis</span>
            </div>
            <h1 className="mb-6 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-5xl font-bold text-transparent md:text-7xl">
              Analyze YouTube Videos in Seconds
            </h1>
            <p className="mx-auto mb-8 max-w-2xl text-xl text-gray-400">
              VidSum uses advanced AI to break down any YouTube video into
              detailed segments, giving you instant insights, timestamps, and
              summaries.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href="/dashboard"
                className="flex h-14 items-center justify-center rounded-lg bg-blue-600 px-8 text-lg font-medium text-white transition hover:bg-blue-700"
              >
                Start Analyzing Free
              </Link>
              <a
                href="#features"
                className="inline-flex h-14 items-center gap-2 rounded-lg bg-purple-600 px-8 text-lg font-medium text-white transition hover:bg-purple-700"
              >
                <Play className="h-5 w-5" />
                Watch Demo
              </a>
            </div>
          </div>

          <AppShowcaseMarquee />
        </div>
      </section>

      <section
        id="features"
        className="scroll-mt-24 bg-gradient-to-b from-black to-gray-900 px-4 py-20 sm:px-6 lg:px-8"
      >
        <div className="mx-auto max-w-7xl">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-4xl font-bold md:text-5xl">
              Powerful Features
            </h2>
            <p className="text-xl text-gray-400">
              Everything you need to understand YouTube content
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: BarChart3,
                title: "Smart Segmentation",
                body: "AI automatically breaks videos into meaningful segments with accurate timestamps.",
              },
              {
                icon: Clock,
                title: "Instant Analysis",
                body: "Get detailed breakdowns of video content in seconds, not hours.",
              },
              {
                icon: TrendingUp,
                title: "Sentiment Detection",
                body: "Understand the emotional tone and sentiment of each segment.",
              },
              {
                icon: Users,
                title: "Speaker Recognition",
                body: "Identify and track different speakers throughout the video.",
              },
              {
                icon: Play,
                title: "Interactive Player",
                body: "Jump to any segment instantly with our seamless video player integration.",
              },
              {
                icon: Zap,
                title: "Real-time Updates",
                body: "Stay updated with your favorite channels as new videos are published.",
              },
            ].map(({ icon: Icon, title, body }) => (
              <div
                key={title}
                className="rounded-xl border border-gray-800 bg-gray-900 p-6 transition-colors hover:border-blue-600/50"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-600/10">
                  <Icon className="h-6 w-6 text-blue-400" />
                </div>
                <h3 className="mb-2 text-xl font-semibold text-white">{title}</h3>
                <p className="text-gray-400">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        id="how-it-works"
        className="scroll-mt-24 bg-gray-900 px-4 py-20 sm:px-6 lg:px-8"
      >
        <div className="mx-auto max-w-7xl">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-4xl font-bold md:text-5xl">How It Works</h2>
            <p className="text-xl text-gray-400">Get started in three simple steps</p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                step: "1",
                title: "Paste YouTube URL",
                body: "Simply paste any YouTube video link into VidSum's search bar.",
              },
              {
                step: "2",
                title: "AI Analysis",
                body: "Our AI processes the video and creates detailed segments with timestamps.",
              },
              {
                step: "3",
                title: "Explore Insights",
                body: "Navigate through segments, view summaries, and extract key information.",
              },
            ].map(({ step, title, body }) => (
              <div key={step} className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-600 text-2xl font-bold">
                  {step}
                </div>
                <h3 className="mb-2 text-xl font-semibold">{title}</h3>
                <p className="text-gray-400">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        id="pricing"
        className="scroll-mt-24 bg-black px-4 py-20 sm:px-6 lg:px-8"
      >
        <div className="mx-auto max-w-7xl">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-4xl font-bold md:text-5xl">Simple Pricing</h2>
            <p className="text-xl text-gray-400">Choose the plan that works for you</p>
          </div>

          <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-3">
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-8">
              <h3 className="mb-2 text-2xl font-bold">Free</h3>
              <div className="mb-6">
                <span className="text-4xl font-bold">$0</span>
                <span className="text-gray-400">/month</span>
              </div>
              <ul className="mb-8 space-y-3">
                {["5 videos per month", "Basic segmentation", "Standard support"].map(
                  (t) => (
                    <li key={t} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-5 w-5 shrink-0 text-blue-400" />
                      <span className="text-gray-300">{t}</span>
                    </li>
                  ),
                )}
              </ul>
              <Link
                href="/dashboard"
                className="block w-full rounded-lg border border-gray-700 py-2.5 text-center font-medium transition hover:bg-gray-800"
              >
                Get Started
              </Link>
            </div>

            <div className="relative rounded-xl border border-blue-500 bg-gradient-to-b from-blue-600 to-blue-700 p-8">
              <div className="absolute right-0 top-0 rounded-bl-lg rounded-tr-lg bg-yellow-400 px-3 py-1 text-xs font-bold text-black">
                POPULAR
              </div>
              <h3 className="mb-2 text-2xl font-bold">Pro</h3>
              <div className="mb-6">
                <span className="text-4xl font-bold">$19</span>
                <span className="text-blue-100">/month</span>
              </div>
              <ul className="mb-8 space-y-3">
                {[
                  "100 videos per month",
                  "Advanced AI analysis",
                  "Sentiment detection",
                  "Priority support",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-5 w-5 shrink-0 text-white" />
                    <span className="text-white">{t}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/dashboard"
                className="block w-full rounded-lg bg-white py-2.5 text-center font-medium text-blue-600 transition hover:bg-gray-100"
              >
                Start Free Trial
              </Link>
            </div>

            <div className="rounded-xl border border-gray-800 bg-gray-900 p-8">
              <h3 className="mb-2 text-2xl font-bold">Enterprise</h3>
              <div className="mb-6">
                <span className="text-4xl font-bold">Custom</span>
              </div>
              <ul className="mb-8 space-y-3">
                {[
                  "Unlimited videos",
                  "API access",
                  "Custom integrations",
                  "Dedicated support",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-5 w-5 shrink-0 text-blue-400" />
                    <span className="text-gray-300">{t}</span>
                  </li>
                ))}
              </ul>
              <span className="block w-full cursor-default rounded-lg border border-gray-700 py-2.5 text-center font-medium text-gray-400">
                Contact Sales
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="mb-6 text-4xl font-bold md:text-5xl">
            Ready to Transform Your YouTube Experience?
          </h2>
          <p className="mb-8 text-xl text-blue-100">
            Join thousands of users who are already analyzing videos smarter and
            faster.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex h-14 items-center justify-center rounded-lg bg-white px-8 text-lg font-medium text-blue-600 transition hover:bg-gray-100"
          >
            Start Analyzing Now - It&apos;s Free
          </Link>
        </div>
      </section>

      <footer className="border-t border-gray-800 bg-black px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 grid gap-8 md:grid-cols-4">
            <div>
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
                  <Video className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-semibold">VidSum</span>
              </div>
              <p className="text-sm text-gray-400">
                AI-powered YouTube video analysis made simple.
              </p>
            </div>
            <div>
              <h4 className="mb-4 font-semibold">Product</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>
                  <a href="#features" className="transition hover:text-white">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#pricing" className="transition hover:text-white">
                    Pricing
                  </a>
                </li>
                <li>
                  <span className="text-gray-500">API</span>
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
