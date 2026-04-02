import Link from "next/link";
import { ArrowLeft, Video } from "lucide-react";
import { SettingsNav } from "@/components/settings/settings-nav";

type Props = {
  children: React.ReactNode;
};

export function SettingsShell({ children }: Props) {
  return (
    <div className="min-h-full bg-gradient-to-b from-black via-gray-900 to-black">
      <div className="mx-auto max-w-3xl px-5 pb-16 pt-6 sm:px-7 lg:px-8 lg:pt-8">
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="mb-6 inline-flex items-center gap-2 text-sm text-gray-400 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to dashboard
          </Link>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-purple-500/25">
              <Video className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1
                className="text-3xl font-bold tracking-tight md:text-4xl"
                style={{
                  background:
                    "linear-gradient(90deg, #ffffff, #a78bfa, #ec4899, #f59e0b, #ffffff)",
                  backgroundSize: "200% auto",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Settings
              </h1>
              <p className="mt-1 text-sm text-gray-400">
                Your profile and subscription in one place.
              </p>
            </div>
          </div>
        </div>

        <SettingsNav />
        {children}
      </div>
    </div>
  );
}
