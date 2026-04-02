import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";

export async function getOrCreateStripeCustomerId(
  service: SupabaseClient,
  user: { id: string; email?: string | null },
  stripe: Stripe,
): Promise<string> {
  const { data: row } = await service
    .from("stripe_customers")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (row?.stripe_customer_id) {
    return row.stripe_customer_id as string;
  }

  const customer = await stripe.customers.create({
    email: user.email ?? undefined,
    metadata: { supabase_user_id: user.id },
  });

  const { error } = await service.from("stripe_customers").upsert(
    {
      user_id: user.id,
      stripe_customer_id: customer.id,
    },
    { onConflict: "user_id" },
  );
  if (error) throw error;
  return customer.id;
}
