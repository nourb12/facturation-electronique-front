export type TransactionStatus = 'Justifiee' | 'NonJustifiee' | 'EnAttente';
export type TransactionType = 'Entree' | 'Sortie';
export type DocumentSource = 'Web' | 'MobileApp';
export type ReceiptStatus = 'Facultatif' | 'Perdu' | 'Present';

export interface TransactionDocumentDto {
  fileName: string;
  contentType?: string | null;
  sizeBytes?: number | null;
  url?: string | null;
}

export interface ReviewFieldDto {
  key: string;
  label: string;
  value?: string | null;
  confidence: number;
  required: boolean;
  requiresReview: boolean;
}

export interface TransactionAllocationDto {
  id: string;
  categoryName: string;
  percentage: number;
  amount: number;
}

export interface TransactionCommentDto {
  id: string;
  authorId?: string | null;
  authorName: string;
  message: string;
  createdAt: string;
}

export interface TransactionActivityDto {
  id: string;
  authorId?: string | null;
  authorName?: string | null;
  action: string;
  description: string;
  createdAt: string;
}

export interface TransactionBankSuggestionDto {
  label: string;
  matchType: string;
  date: string;
  amount: number;
  counterparty?: string | null;
}

export interface TransactionBankMatchDto {
  status?: string | null;
  reference?: string | null;
  date?: string | null;
  amount?: number | null;
  counterparty?: string | null;
  suggestions: TransactionBankSuggestionDto[];
}

export interface SupplierCandidateDto {
  id: string;
  nom: string;
  matriculeFiscal?: string | null;
  adresse?: string | null;
  iban?: string | null;
  score: number;
  exact: boolean;
}

export interface SupplierMatchResultDto {
  matched: boolean;
  autoSelected: boolean;
  created: boolean;
  matchType: string;
  fournisseurId?: string | null;
  displayName?: string | null;
  matriculeFiscal?: string | null;
  candidates: SupplierCandidateDto[];
}

export interface TransactionDto {
  id: string;
  entrepriseId?: string;
  date: string;
  libelle: string;
  description?: string | null;
  tiersNom?: string | null;
  categorieNom?: string | null;
  source?: DocumentSource | null;
  fournisseurId?: string | null;
  fournisseurMatriculeFiscal?: string | null;
  documentType?: string | null;
  ocrOverallConfidence?: number | null;
  type: TransactionType;
  statut: TransactionStatus;
  statutJustificatif: ReceiptStatus | null;
  montant: number;
  devise: string;
  compte?: string | null;
  factureId?: string | null;
  documentLie?: TransactionDocumentDto | null;
  reviewFields: ReviewFieldDto[];
  missingFieldKeys: string[];
  allocations: TransactionAllocationDto[];
  comments: TransactionCommentDto[];
  activities: TransactionActivityDto[];
  bankMatch?: TransactionBankMatchDto | null;
  accountingPeriodLabel?: string | null;
  recoverableVatAmount?: number | null;
  recoverableVatRate?: number | null;
  creeLe: string;
  modifieLe: string;
}

export interface TransactionListDto {
  items: TransactionDto[];
  total: number;
  page: number;
  parPage: number;
}

export interface TransactionCountersDto {
  nonJustifieeCount: number;
  nonJustifieeMontant: number;
  enAttenteCount: number;
  enAttenteMontant: number;
  justifieeCount: number;
  justifieeMontant: number;
}

export interface TransactionCategorySummaryDto {
  categorieId: string;
  categorieNom: string;
  type: TransactionType;
  count: number;
  montant: number;
}
