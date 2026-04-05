"use client";

import { signInWithGoogle } from "@/lib/auth/google-oauth";

type Props = {
  /** Path after OAuth (e.g. `/settings/billing?plan=navigator`). */
  returnTo: string;
};

export function SignInForBillingButton({ returnTo }: Props) {
  return (
    <button
      type="button"
      onClick={() => void signInWithGoogle(returnTo)}
      className="w-full rounded-lg border border-gray-600 bg-zinc-800 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700"
    >
      Sign in to pay with Stripe
    </button>
  );
}
