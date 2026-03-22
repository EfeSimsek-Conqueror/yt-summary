import Link from "next/link";

export default function AuthCodeErrorPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-canvas px-6 text-center">
      <h1 className="text-lg font-semibold">Sign-in could not be completed</h1>
      <p className="max-w-sm text-sm text-muted">
        Something went wrong while processing the OAuth code. Check your Supabase
        and Google redirect URL settings.
      </p>
      <Link
        href="/"
        className="text-sm font-medium text-accent hover:underline"
      >
        Back to home
      </Link>
    </div>
  );
}
