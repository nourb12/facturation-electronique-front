/**
 * Formate un montant en dinar tunisien avec trois decimales.
 * Le TND est exprime en millimes dans les ecrans metier.
 */
export function formatTND(montant: number, afficherSymbole = true): string {
  const formatted = new Intl.NumberFormat('fr-TN', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(Number.isFinite(montant) ? montant : 0);

  return afficherSymbole ? `${formatted} TND` : formatted;
}

/**
 * Formate un montant selon la devise, avec TND comme devise principale.
 */
export function formatDevise(montant: number, devise = 'TND'): string {
  const code = devise || 'TND';
  const decimales = code === 'TND' ? 3 : 2;
  const formatted = new Intl.NumberFormat('fr-TN', {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  }).format(Number.isFinite(montant) ? montant : 0);

  const symboles: Record<string, string> = {
    TND: 'TND',
    EUR: 'EUR',
    USD: 'USD',
  };

  return `${formatted} ${symboles[code] ?? code}`;
}
