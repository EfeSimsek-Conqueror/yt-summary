/**
 * Üretim Stripe erişimi (Checkout, Portal, webhooks). Cursor’daki Stripe MCP
 * aynı Stripe hesabını kullanır; MCP yalnızca IDE’de — runtime burayı çağıramaz.
 * Fiyat ID’leri: `cd web && npm run stripe:prices` (STRIPE_SECRET_KEY gerekli).
 */
import Stripe from "stripe";

let stripeSingleton: Stripe | null = null;

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) return null;
  if (!stripeSingleton) {
    stripeSingleton = new Stripe(key, {
      apiVersion: "2025-02-24.acacia",
      typescript: true,
    });
  }
  return stripeSingleton;
}
