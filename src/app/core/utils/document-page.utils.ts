export interface DocumentStatusItem {
  key: string;
  label: string;
  count: number;
}

export interface DocumentListParamsInput {
  page: number;
  parPage: number;
  typeFacture: string;
  activeStatut: string;
  searchQuery: string;
  filtreClientId: string;
  filtreDateDebut: string;
  filtreDateFin: string;
}

export function createDocumentStatuses(): DocumentStatusItem[] {
  return [
    { key: 'all', label: 'Toutes', count: 0 },
    { key: 'Brouillon', label: 'Brouillons', count: 0 },
    { key: 'Validee', label: 'Valid?es', count: 0 },
    { key: 'Conforme', label: 'Conformes', count: 0 },
    { key: 'Transmise', label: 'Transmises', count: 0 },
    { key: 'Acceptee', label: 'Accept?es', count: 0 },
    { key: 'Rejetee', label: 'Rejet?es', count: 0 },
    { key: 'Payee', label: 'Pay?es', count: 0 },
  ];
}

export function buildDocumentListParams(input: DocumentListParamsInput): Record<string, string | number> {
  const params: Record<string, string | number> = {
    page: input.page,
    parPage: input.parPage,
    typeFacture: input.typeFacture,
  };

  if (input.activeStatut !== 'all') params['statut'] = input.activeStatut;
  if (input.searchQuery.trim()) params['recherche'] = input.searchQuery.trim();
  if (input.filtreClientId) params['clientId'] = input.filtreClientId;
  if (input.filtreDateDebut) params['dateDebut'] = input.filtreDateDebut;
  if (input.filtreDateFin) params['dateFin'] = input.filtreDateFin;

  return params;
}

export function updateDocumentStatusCounts(
  statuts: DocumentStatusItem[],
  factures: Array<{ statut?: string | null }>
): void {
  statuts[0].count = factures.length;
  statuts.slice(1).forEach(statut => {
    statut.count = factures.filter(facture => facture.statut === statut.key).length;
  });
}
