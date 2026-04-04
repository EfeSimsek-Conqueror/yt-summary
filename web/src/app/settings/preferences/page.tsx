"use client";

import { useEffect, useState } from "react";
import { Globe, Loader2, Play, ShieldAlert, FileText } from "lucide-react";
import {
  useUserPreferences,
  type UserPreferences,
} from "@/hooks/use-user-preferences";

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "tr", label: "Turkce" },
  { code: "de", label: "Deutsch" },
  { code: "es", label: "Espanol" },
  { code: "fr", label: "Francais" },
  { code: "ja", label: "Japanese" },
  { code: "ko", label: "Korean" },
  { code: "pt", label: "Portugues" },
  { code: "zh", label: "Chinese" },
  { code: "ar", label: "Arabic" },
  { code: "ru", label: "Russian" },
  { code: "hi", label: "Hindi" },
  { code: "it", label: "Italiano" },
] as const;

function Toggle({
  on,
  onToggle,
  disabled,
}: {
  on: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={onToggle}
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-500 ${
        on ? "bg-purple-500" : "bg-zinc-700"
      } ${disabled ? "opacity-50" : "cursor-pointer"}`}
    >
      <span
        className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
          on ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

export default function PreferencesPage() {
  const { prefs, loading, update } = useUserPreferences();
  const [local, setLocal] = useState<UserPreferences>(prefs);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setLocal(prefs);
  }, [prefs]);

  const dirty =
    local.analysis_language !== prefs.analysis_language ||
    local.auto_analyze !== prefs.auto_analyze ||
    local.spoiler_protection !== prefs.spoiler_protection ||
    local.default_summary_view !== prefs.default_summary_view;

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    await update(local);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading preferences…
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-purple-300/80">
          Preferences
        </p>
        <p className="mt-1 text-sm text-gray-400">
          Customize how VidSum analyzes and displays videos.
        </p>
      </header>

      <section className="divide-y divide-gray-800/60 overflow-hidden rounded-2xl border border-gray-700/50 bg-gradient-to-br from-gray-800/40 to-gray-950/80">
        {/* Language */}
        <div className="flex items-start gap-4 p-5">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-900 ring-1 ring-gray-800">
            <Globe className="h-4 w-4 text-gray-400" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-white">Analysis language</p>
            <p className="mt-0.5 text-xs text-gray-500">
              Summaries, segments, and key points will be written in this
              language.
            </p>
          </div>
          <select
            value={local.analysis_language}
            onChange={(e) =>
              setLocal((p) => ({ ...p, analysis_language: e.target.value }))
            }
            className="rounded-lg border border-gray-700 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
        </div>

        {/* Auto-analyze */}
        <div className="flex items-start gap-4 p-5">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-900 ring-1 ring-gray-800">
            <Play className="h-4 w-4 text-gray-400" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-white">Auto-analyze</p>
            <p className="mt-0.5 text-xs text-gray-500">
              Automatically run AI analysis when you open a video page.
            </p>
          </div>
          <Toggle
            on={local.auto_analyze}
            onToggle={() =>
              setLocal((p) => ({ ...p, auto_analyze: !p.auto_analyze }))
            }
          />
        </div>

        {/* Spoiler protection */}
        <div className="flex items-start gap-4 p-5">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-900 ring-1 ring-gray-800">
            <ShieldAlert className="h-4 w-4 text-gray-400" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-white">Spoiler protection</p>
            <p className="mt-0.5 text-xs text-gray-500">
              Blur summary content when the AI detects plot spoilers or endings.
            </p>
          </div>
          <Toggle
            on={local.spoiler_protection}
            onToggle={() =>
              setLocal((p) => ({
                ...p,
                spoiler_protection: !p.spoiler_protection,
              }))
            }
          />
        </div>

        {/* Default summary view */}
        <div className="flex items-start gap-4 p-5">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-900 ring-1 ring-gray-800">
            <FileText className="h-4 w-4 text-gray-400" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-white">
              Default summary view
            </p>
            <p className="mt-0.5 text-xs text-gray-500">
              Which summary length to show first when analysis completes.
            </p>
          </div>
          <div className="flex gap-3">
            {(["short", "detailed"] as const).map((v) => (
              <label
                key={v}
                className="flex cursor-pointer items-center gap-1.5 text-sm"
              >
                <input
                  type="radio"
                  name="summary_view"
                  value={v}
                  checked={local.default_summary_view === v}
                  onChange={() =>
                    setLocal((p) => ({ ...p, default_summary_view: v }))
                  }
                  className="accent-purple-500"
                />
                <span className="capitalize text-gray-300">{v}</span>
              </label>
            ))}
          </div>
        </div>
      </section>

      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={!dirty || saving}
          onClick={() => void handleSave()}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-purple-500/25 transition hover:shadow-purple-500/40 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Save preferences
        </button>
        {saved ? (
          <span className="text-sm font-medium text-emerald-400">Saved</span>
        ) : null}
      </div>
    </div>
  );
}
