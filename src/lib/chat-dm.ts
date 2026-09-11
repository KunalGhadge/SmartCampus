/** Stable DM thread id for two Firebase UIDs (order-independent). */
export function dmThreadId(uidA: string, uidB: string): string {
  const [a, b] = [uidA, uidB].sort();
  return `dm_${a}_${b}`;
}
