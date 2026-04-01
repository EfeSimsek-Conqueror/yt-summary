/**
 * Supadata API key — read at runtime only.
 * Env names are built from string concat so Webpack/Turbopack DefinePlugin cannot
 * replace `process.env.SUPADATA_API_KEY` with `undefined` when the variable
 * exists only on the host (e.g. Railway) and was missing during `next build`.
 *
 * @see https://nextjs.org/docs/app/building-your-application/configuring/environment-variables
 */
const NAME_PRIMARY = "SUP" + "ADATA" + "_API_" + "KEY";
const NAME_ALT = "SUP" + "ADATA" + "_" + "KEY";

export function readSupadataApiKey(): string | undefined {
  const env = globalThis.process?.env;
  if (!env) return undefined;
  const a = env[NAME_PRIMARY];
  const b = env[NAME_ALT];
  if (typeof a === "string" && a.trim()) return a.trim();
  if (typeof b === "string" && b.trim()) return b.trim();
  return undefined;
}
