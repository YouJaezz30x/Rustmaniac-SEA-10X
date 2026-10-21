import type { DurationKey } from "./brand";

export const STORE_CURRENCY = (process.env.NEXT_PUBLIC_STORE_CURRENCY ?? "usd").toLowerCase();

export function vipPriceCents(
  pkg: { priceMonth: number; priceThree: number; pricePerm: number },
  duration: DurationKey
): number {
  switch (duration) {
    case "ONE_MONTH":
      return pkg.priceMonth;
    case "THREE_MONTHS":
      return pkg.priceThree;
    case "PERMANENT":
      return pkg.pricePerm;
    default:
      return pkg.priceMonth;
  }
}

export function formatMoney(cents: number, currency: string = STORE_CURRENCY): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}
