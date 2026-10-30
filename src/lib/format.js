export function formatKsh(value) {
  return `KSh ${Math.round(Number(value) || 0).toLocaleString("en-KE")}`;
}

export function percentOff(price, compareAt) {
  if (!compareAt || compareAt <= price) return 0;
  return Math.round(((compareAt - price) / compareAt) * 100);
}
