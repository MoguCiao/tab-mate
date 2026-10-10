export function formatCurrency(amount: number, space: boolean = false): string {
  const parts = Math.abs(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const prefix = amount < 0 ? '-¥' : '¥';
  return space ? `${prefix} ${parts}` : `${prefix}${parts}`;
}

export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}
