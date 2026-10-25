export const money = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    cents / 100,
  );
export const hourlyEstimate = (minutes: number, rate: number) =>
  Math.floor((minutes * rate + 30) / 60);
export const hoursLabel = (minutes: number) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(
    minutes / 60,
  );
