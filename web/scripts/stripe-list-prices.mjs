#!/usr/bin/env node
/**
 * Stripe Dashboard / Cursor Stripe MCP ile aynı hesabı kullanır: STRIPE_SECRET_KEY.
 *
 * Çalıştır (web klasöründen):
 *   node --env-file=.env.local ./scripts/stripe-list-prices.mjs
 *
 * Çıktıdaki price_... değerlerini Railway’de STRIPE_PRICE_ID_NAVIGATOR ve
 * STRIPE_PRICE_ID_CAPTAIN olarak ayarla.
 */
import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY?.trim();
if (!key) {
  console.error(
    "STRIPE_SECRET_KEY yok. Örnek: node --env-file=.env.local ./scripts/stripe-list-prices.mjs",
  );
  process.exit(1);
}

const stripe = new Stripe(key, {
  apiVersion: "2025-02-24.acacia",
});

const prices = await stripe.prices.list({
  active: true,
  expand: ["data.product"],
  limit: 100,
});

const monthly = prices.data.filter(
  (p) => p.recurring?.interval === "month",
);

console.log(
  "Aktif aylık fiyatlar (VidSum Navigator / Captain eşlemesi için):\n",
);
for (const p of monthly) {
  const prod = p.product;
  const name =
    typeof prod === "object" && prod && "name" in prod && prod.name
      ? prod.name
      : "(product)";
  const currency = (p.currency ?? "usd").toUpperCase();
  const amount =
    p.unit_amount != null ? (p.unit_amount / 100).toFixed(2) : "?";
  console.log(`  ${p.id}`);
  console.log(`    ürün: ${name}`);
  console.log(`    ${amount} ${currency} / ay\n`);
}

if (monthly.length === 0) {
  console.log(
    "(Aylık recurring price bulunamadı — Stripe Dashboard’da Product + Price oluştur.)",
  );
}
