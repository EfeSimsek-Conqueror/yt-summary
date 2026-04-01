/**
 * Supadata API key — read at runtime only.
 * Env names use string concat so bundlers cannot inline a build-time `undefined`.
 * Also scans `process.env` entries (some hosts only populate the live map).
 *
 * @see https://nextjs.org/docs/app/building-your-application/configuring/environment-variables
 */
const NAME_PRIMARY = "SUP" + "ADATA" + "_API_" + "KEY";
const NAME_ALT = "SUP" + "ADATA" + "_" + "KEY";

function pickFromEnv(env: NodeJS.ProcessEnv): string | undefined {
  const a = env[NAME_PRIMARY];
  const b = env[NAME_ALT];
  if (typeof a === "string" && a.trim()) return a.trim();
  if (typeof b === "string" && b.trim()) return b.trim();

  for (const [k, v] of Object.entries(env)) {
    const key = k.trim().toUpperCase();
    if (
      (key === "SUPADATA_API_KEY" || key === "SUPADATA_KEY") &&
      typeof v === "string" &&
      v.trim()
    ) {
      return v.trim();
    }
  }
  return undefined;
}

export function readSupadataApiKey(): string | undefined {
  const env = globalThis.process?.env;
  if (!env) {
    console.warn("[supadata] process.env unavailable");
    return undefined;
  }

  const found = pickFromEnv(env);
  if (found) return found;

  const hint = Object.keys(env).filter(
    (k) =>
      k.toUpperCase().includes("SUPADATA") ||
      k.toUpperCase().includes("UPADATA"),
  );
  console.warn(
    "[supadata] SUPADATA_API_KEY missing.",
    hint.length > 0
      ? `Similar env names (check spelling): ${hint.join(", ")}`
      : "No SUPADATA* env keys — set SUPADATA_API_KEY on this Railway service and redeploy.",
  );
  return undefined;
}
