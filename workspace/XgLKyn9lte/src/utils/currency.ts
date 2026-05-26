export const parseCurrencyInput = (raw: string): number => {
  const cleaned = raw.replace(/rp/gi, "").replace(/\./g, "").replace(/,/g, "").replace(/[^\d-]/g, "");
  const n = Number(cleaned || "0");
  return Number.isFinite(n) ? n : 0;
};
export const formatIDR = (n: number) => `Rp${Math.round(n).toLocaleString("id-ID")}`;