export function formatNumber(value: number) {
  return new Intl.NumberFormat('fr-TN').format(value);
}

export function formatCompactNumber(value: number) {
  return new Intl.NumberFormat('fr-TN', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('fr-TN', {
    style: 'currency',
    currency: 'TND',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}
