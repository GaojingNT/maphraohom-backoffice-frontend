export function parseIds(raw: string | string[] | undefined): number[] {
  const value = Array.isArray(raw) ? raw.join(",") : (raw ?? "");
  return value
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isInteger(n) && n > 0);
}
