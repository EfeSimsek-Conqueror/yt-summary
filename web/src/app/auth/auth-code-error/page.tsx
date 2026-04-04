import Link from "next/link";

type Props = {
  searchParams: Promise<{
    reason?: string;
    error?: string;
    details?: string;
    code?: string;
  }>;
};

export default async function AuthCodeErrorPage({ searchParams }: Props) {
  const p = await searchParams;
  const reason = p.reason ? safeDecode(p.reason) : null;
  const details = p.details ? safeDecode(p.details) : null;
  const oauthError = p.error ?? null;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-canvas px-6 text-center">
      <h1 className="text-lg font-semibold">Sign-in could not be completed</h1>
      <p className="max-w-sm text-sm text-muted">
        Something went wrong while processing the OAuth code. Check the items
        below, then try again.
      </p>
      <ul className="max-w-md list-disc pl-5 text-left text-xs leading-relaxed text-muted">
        <li>
          Supabase → Authentication → URL Configuration: add your real app URL
          plus{" "}
          <code className="rounded bg-black/40 px-1 py-0.5 text-[0.7rem] text-foreground/90">
            /oauth/return
          </code>
          — for example{" "}
          <code className="rounded bg-black/40 px-1 py-0.5 text-[0.7rem] text-foreground/90">
            https://vidsum.ai/oauth/return
          </code>
          . Do not paste placeholders with{" "}
          <code className="text-[0.7rem]">&lt;angle brackets&gt;</code>; use the
          exact hostname users open (production or preview).
        </li>
        <li>
          Supabase Site URL must match the app origin you use in the browser
          (e.g. <code className="rounded bg-black/40 px-1 py-0.5 text-[0.7rem]">https://vidsum.ai</code>).
        </li>
        <li>
          Google Cloud → OAuth client for Supabase: authorized redirect URIs
          include{" "}
          <code className="rounded bg-black/40 px-1 py-0.5 text-[0.7rem]">
            https://&lt;project-ref&gt;.supabase.co/auth/v1/callback
          </code>
          .
        </li>
      </ul>
      {reason || details || oauthError ? (
        <div
          className="max-w-lg rounded-lg border border-line/80 bg-surface/30 px-3 py-2 text-left text-[11px] leading-snug text-muted"
          role="status"
        >
          {oauthError ? (
            <p>
              <span className="font-medium text-foreground/90">OAuth: </span>
              {oauthError}
            </p>
          ) : null}
          {reason ? (
            <p className={oauthError ? "mt-1" : ""}>
              <span className="font-medium text-foreground/90">Details: </span>
              {reason}
            </p>
          ) : null}
          {details ? (
            <p className="mt-1 text-muted/90">{details}</p>
          ) : null}
        </div>
      ) : null}
      <Link
        href="/"
        className="text-sm font-medium text-accent hover:underline"
      >
        Back to home
      </Link>
    </div>
  );
}

function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}
