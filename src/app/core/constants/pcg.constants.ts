export const COMPTES = {
  CAPITAL_SOCIAL: '101000',
  REPORT_A_NOUVEAU_CREDITEUR: '110000',
  REPORT_A_NOUVEAU_DEBITEUR: '119000',
  RESULTAT_EXERCICE: '128000',
  FOURNISSEURS: '401000',
  CLIENTS: '411000',
  TVA_DEDUCTIBLE: '436600',
  TVA_COLLECTEE: '436700',
  RS_A_REVERSER: '437100',
  CAISSE: '531000',
  BANQUE: '532000',
  ACHATS_MARCHANDISES: '607000',
  DOTATIONS_AMORTISSEMENTS: '681100',
  VENTES_MARCHANDISES: '707000',
} as const;

export const JOURNAUX = {
  VENTES: 'JV',
  ACHATS: 'JA',
  BANQUE: 'JB',
  CAISSE: 'JC',
  OD: 'JOD',
} as const;

export type ComptePcg = typeof COMPTES[keyof typeof COMPTES];
export type JournalCode = typeof JOURNAUX[keyof typeof JOURNAUX];

export function balanceNct(compte: string, intitule: string, debit: number, credit: number) {
  const delta = Number(debit || 0) - Number(credit || 0);
  return {
    compte,
    intitule,
    debit,
    credit,
    soldeDebiteur: Math.max(0, delta),
    soldeCrediteur: Math.max(0, -delta),
  };
}
