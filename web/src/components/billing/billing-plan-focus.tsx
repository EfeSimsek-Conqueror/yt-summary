"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

/**
 * When URL contains `?plan=navigator` or `?plan=captain`, scrolls to the Stripe actions block.
 */
export function BillingPlanFocus() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const plan = searchParams.get("plan");
    if (plan !== "navigator" && plan !== "captain") return;
    const el = document.getElementById("stripe-billing-actions");
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [searchParams]);

  return null;
}
