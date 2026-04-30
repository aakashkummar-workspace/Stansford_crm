// Indian-format money helpers, used both server- and client-side.

export const money = (n) => "₹" + Number(n).toLocaleString("en-IN");

export const moneyK = (n) => {
  if (n >= 10000000) return "₹" + (n / 10000000).toFixed(2) + "Cr";
  if (n >= 100000) return "₹" + (n / 100000).toFixed(2) + "L";
  if (n >= 1000) return "₹" + (n / 1000).toFixed(1) + "K";
  return "₹" + n;
};
