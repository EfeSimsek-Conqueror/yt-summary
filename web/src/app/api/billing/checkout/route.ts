import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getOrCreateStripeCustomerId } from "@/lib/billing/stripe-customer";
import { getStripePriceIdForPaidPlan } from "@/lib/billing/stripe-plans";
import { getStripe } from "@/lib/billing/stripe-server";

export const runtime = "nodejs";

const bodySchema = z.object({
  planId: z.enum(["navigator", "captain"]),
});

/**
 * POST /api/billing/checkout — Stripe Checkout (subscription). Redirect URL in JSON.
 */
export async function POST(request: NextRequest) {
  const stripe = getStripe();
  const service = createServiceClient();
  if (!stripe || !service) {
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

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const priceId = getStripePriceIdForPaidPlan(parsed.data.planId);
  if (!priceId) {
    return NextResponse.json(
      { error: "Stripe price ID not configured for this plan" },
      { status: 503 },
    );
  }

  try {
    const customerId = await getOrCreateStripeCustomerId(service, user, stripe);
    const origin = request.nextUrl.origin;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: user.id,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/settings/billing?checkout=success`,
      cancel_url: `${origin}/settings/billing?checkout=canceled`,
      metadata: {
        supabase_user_id: user.id,
      },
      subscription_data: {
        metadata: {
          supabase_user_id: user.id,
        },
      },
      allow_promotion_codes: true,
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "Checkout session missing URL" },
        { status: 502 },
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Checkout failed";
    console.error("[billing/checkout]", e);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
