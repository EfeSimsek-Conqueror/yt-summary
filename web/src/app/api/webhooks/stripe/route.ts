import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { createServiceClient } from "@/lib/supabase/service";
import {
  applyMonthlyCreditsForPlan,
  markSubscriptionCanceled,
  planIdFromSubscription,
  upsertBillingSubscriptionRow,
  userIdFromStripeSubscription,
} from "@/lib/billing/stripe-sync";
import { getStripe } from "@/lib/billing/stripe-server";
import { planIdFromStripePriceId } from "@/lib/billing/stripe-plans";

export const runtime = "nodejs";

/**
 * POST /api/webhooks/stripe — Stripe webhooks (subscription + invoice).
 * Configure in Stripe Dashboard → Webhooks → endpoint URL + signing secret.
 */
export async function POST(request: NextRequest) {
  const stripe = getStripe();
  const whSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  const service = createServiceClient();

  if (!stripe || !whSecret || !service) {
    console.error("[webhooks/stripe] missing STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, or SUPABASE_SERVICE_ROLE_KEY");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const rawBody = await request.text();
  const sig = request.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, whSecret);
  } catch (e) {
    console.warn("[webhooks/stripe] signature verify failed", e);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== "subscription") break;
        const userId =
          session.client_reference_id ||
          (session.metadata?.supabase_user_id as string | undefined);
        const customerId =
          typeof session.customer === "string"
            ? session.customer
            : session.customer?.id;
        const subId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id;
        if (!userId || !customerId || !subId) {
          console.warn("[webhooks/stripe] checkout.session.completed missing ids");
          break;
        }

        await service.from("stripe_customers").upsert(
          {
            user_id: userId,
            stripe_customer_id: customerId,
          },
          { onConflict: "user_id" },
        );

        const sub = await stripe.subscriptions.retrieve(subId);
        const planId = planIdFromSubscription(sub);
        if (planId && planId !== "scout") {
          await upsertBillingSubscriptionRow(service, userId, sub, planId);
        }
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const subRef = invoice.subscription;
        if (!subRef) break;
        const subId = typeof subRef === "string" ? subRef : subRef.id;
        const sub = await stripe.subscriptions.retrieve(subId);
        let userId = userIdFromStripeSubscription(sub);
        if (!userId) {
          const custId =
            typeof invoice.customer === "string"
              ? invoice.customer
              : invoice.customer?.id;
          if (custId) {
            const { data } = await service
              .from("stripe_customers")
              .select("user_id")
              .eq("stripe_customer_id", custId)
              .maybeSingle();
            if (data?.user_id) userId = data.user_id as string;
          }
        }
        if (!userId) {
          console.warn("[webhooks/stripe] invoice.paid could not resolve user");
          break;
        }

        const priceId = sub.items.data[0]?.price?.id;
        const planId = priceId ? planIdFromStripePriceId(priceId) : null;
        if (!planId || planId === "scout") break;

        await upsertBillingSubscriptionRow(service, userId, sub, planId);
        await applyMonthlyCreditsForPlan(service, userId, planId);
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = userIdFromStripeSubscription(sub);
        if (!userId) break;
        if (sub.status === "canceled" || sub.status === "unpaid") {
          await markSubscriptionCanceled(service, userId);
          break;
        }
        const planId = planIdFromSubscription(sub);
        if (!planId) break;
        await upsertBillingSubscriptionRow(service, userId, sub, planId);
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = userIdFromStripeSubscription(sub);
        if (!userId) break;
        await markSubscriptionCanceled(service, userId);
        break;
      }

      default:
        break;
    }
  } catch (e) {
    console.error("[webhooks/stripe] handler error", event.type, e);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
