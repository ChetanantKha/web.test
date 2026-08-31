export function computePayout(rateType: "fixed" | "percent", rateValue: number, price: number) {
  if (rateType === "fixed") return rateValue;
  return Math.round(((price * rateValue) / 100) * 100) / 100;
}
