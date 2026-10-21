import type { DurationKey } from "./brand";

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

export function formatUsd(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}
