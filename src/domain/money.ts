export function toSatang(baht: number): number {
  if (!Number.isFinite(baht)) return 0;
  return Math.round(baht * 100);
}

export function fromSatang(satang: number): number {
  if (!Number.isFinite(satang)) return 0;
  return Math.round(satang) / 100;
}

export function roundBaht(baht: number): number {
  return fromSatang(toSatang(baht));
}

export function multiplyBaht(unitBaht: number, quantity: number): number {
  return fromSatang(toSatang(unitBaht) * quantity);
}
