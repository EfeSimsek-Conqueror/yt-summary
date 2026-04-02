import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/billing/stripe-server";

export const runtime = "nodejs";

/**
 * POST /api/billing/portal — Stripe Customer Portal (manage subscription).
 */
export async function POST(request: NextRequest) {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      { error: "Billing is not configured on the server" },
      { status: 503 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: row } = await supabase
    .from("stripe_customers")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  const customerId = row?.stripe_customer_id as string | undefined;
  if (!customerId) {
    return NextResponse.json(
      { error: "No Stripe customer yet. Start a paid plan from Checkout first." },
      { status: 400 },
    );
  }

  try {
    const origin = request.nextUrl.origin;
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/settings/billing`,
    });
    return NextResponse.json({ url: session.url });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Portal failed";
    console.error("[billing/portal]", e);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
