export type TransactionStatus = 'Justifiee' | 'NonJustifiee' | 'EnAttente';
export type TransactionType = 'Entree' | 'Sortie';

export type ReceiptStatus = 'Facultatif' | 'Perdu' | 'Present';

export interface TransactionDocumentDto {
  id: string;
  fileName: string;
  contentType?: string;
  sizeBytes?: number;
  url?: string;
}

export interface TransactionSplitDto {
  categoryId: string;
  categoryName: string;
  percent: number; // 0..100
}

export interface TransactionCommentDto {
  id: string;
  authorName: string;
  createdAt: string;
  message: string;
}

export interface TransactionDto {
  id: string;
  date: string; // ISO
  libelle: string;
  description?: string | null;

  tiersId?: string | null;
  tiersNom?: string | null;
  tiersType?: 'Client' | 'Fournisseur' | null;

  categorieId?: string | null;
  categorieNom?: string | null;

  type: TransactionType;
  statut: TransactionStatus;
  statutJustificatif: ReceiptStatus | null;
  montant: number;
  devise: string;

  compte?: string | null;
  documentLie?: TransactionDocumentDto | null;
  factureId?: string | null;

  splits?: TransactionSplitDto[];
  comments?: TransactionCommentDto[];

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
