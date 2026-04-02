import type { PlanId } from "@/lib/billing/plans";

/** Active paid subscription → Navigator/Captain; otherwise Scout. */
export function effectivePlanIdFromSubscriptionRow(
  row: { plan_id: string; status: string } | null,
): PlanId {
  if (!row) return "scout";
  if (row.status !== "active" && row.status !== "trialing") return "scout";
  if (row.plan_id === "navigator" || row.plan_id === "captain") {
    return row.plan_id;
  }
  return "scout";
}
