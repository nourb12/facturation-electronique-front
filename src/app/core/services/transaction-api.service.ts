import { Injectable } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { map } from 'rxjs/operators';

import { ApiService } from './api.service';
import {
  DocumentSource,
  ReceiptStatus,
  ReviewFieldDto,
  SupplierCandidateDto,
  SupplierMatchResultDto,
  TransactionActivityDto,
  TransactionAllocationDto,
  TransactionBankMatchDto,
  TransactionBankSuggestionDto,
  TransactionCategorySummaryDto,
  TransactionCommentDto,
  TransactionCountersDto,
  TransactionDto,
  TransactionListDto,
  TransactionStatus,
  TransactionType,
} from '../models/transaction.model';

export type TransactionListQuery = {
  page?: number;
  parPage?: number;
  dateDebut?: string;
  dateFin?: string;
  statut?: TransactionStatus;
  type?: TransactionType;
  categorieId?: string;
  tiersId?: string;
  recherche?: string;
  source?: DocumentSource;
};

export type ReceiptReviewPayload = {
  libelle?: string | null;
  date?: string | null;
  montant?: number | null;
  tiersNom?: string | null;
  fournisseurId?: string | null;
  fournisseurMatriculeFiscal?: string | null;
  fields: Array<{ key: string; value?: string | null }>;
};

export type CategorizeExpensePayload = {
  categorieNom?: string | null;
  allocations: Array<{
    categoryName: string;
    percentage: number;
    amount: number;
  }>;
  accountingPeriodLabel?: string | null;
  recoverableVatAmount?: number | null;
  recoverableVatRate?: number | null;
};

export type BankMatchPayload = {
  status?: string | null;
  reference?: string | null;
  date?: string | null;
  amount?: number | null;
  counterparty?: string | null;
};

function buildParams(q: Record<string, unknown>): HttpParams {
  let p = new HttpParams();
  Object.entries(q).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return;
    p = p.set(k, String(v));
  });
  return p;
}

const TYPE_TO_INT: Record<TransactionType, number> = { Entree: 0, Sortie: 1 };
const STATUS_TO_INT: Record<TransactionStatus, number> = {
  NonJustifiee: 0,
  EnAttente: 1,
  Justifiee: 2,
};
const RECEIPT_TO_INT: Record<ReceiptStatus, number> = {
  Facultatif: 0,
  Perdu: 1,
  Present: 2,
};

const INT_TO_TYPE: Record<number, TransactionType> = { 0: 'Entree', 1: 'Sortie' };
const INT_TO_STATUS: Record<number, TransactionStatus> = {
  0: 'NonJustifiee',
  1: 'EnAttente',
  2: 'Justifiee',
};
const INT_TO_RECEIPT: Record<number, ReceiptStatus> = {
  0: 'Facultatif',
  1: 'Perdu',
  2: 'Present',
};
const INT_TO_SOURCE: Record<number, DocumentSource> = { 0: 'Web', 1: 'MobileApp' };

function normalizeType(v: unknown): TransactionType {
  if (typeof v === 'string' && (v === 'Entree' || v === 'Sortie')) return v;
  if (typeof v === 'number') return INT_TO_TYPE[v] ?? 'Sortie';
  return 'Sortie';
}

function normalizeStatus(v: unknown): TransactionStatus {
  if (typeof v === 'string' && (v === 'NonJustifiee' || v === 'EnAttente' || v === 'Justifiee')) return v;
  if (typeof v === 'number') return INT_TO_STATUS[v] ?? 'NonJustifiee';
  return 'NonJustifiee';
}

function normalizeReceipt(v: unknown): ReceiptStatus | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'string' && (v === 'Facultatif' || v === 'Perdu' || v === 'Present')) return v;
  if (typeof v === 'number') return INT_TO_RECEIPT[v] ?? null;
  return null;
}

function normalizeSource(v: unknown): DocumentSource | null {
  if (typeof v === 'string' && (v === 'Web' || v === 'MobileApp')) return v;
  if (typeof v === 'number') return INT_TO_SOURCE[v] ?? null;
  return null;
}

function normalizeReviewField(raw: any): ReviewFieldDto {
  return {
    key: String(raw?.key ?? ''),
    label: String(raw?.label ?? ''),
    value: raw?.value?.toString() ?? '',
    confidence: Number(raw?.confidence ?? 0),
    required: raw?.required === true || raw?.requiredField === true,
    requiresReview: raw?.requiresReview === true,
  };
}

function normalizeAllocation(raw: any): TransactionAllocationDto {
  return {
    id: String(raw?.id ?? crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)),
    categoryName: String(raw?.categoryName ?? ''),
    percentage: Number(raw?.percentage ?? 0),
    amount: Number(raw?.amount ?? 0),
  };
}

function normalizeComment(raw: any): TransactionCommentDto {
  return {
    id: String(raw?.id ?? ''),
    authorId: raw?.authorId?.toString() ?? null,
    authorName: String(raw?.authorName ?? ''),
    message: String(raw?.message ?? ''),
    createdAt: String(raw?.createdAt ?? new Date().toISOString()),
  };
}

function normalizeActivity(raw: any): TransactionActivityDto {
  return {
    id: String(raw?.id ?? ''),
    authorId: raw?.authorId?.toString() ?? null,
    authorName: raw?.authorName?.toString() ?? null,
    action: String(raw?.action ?? ''),
    description: String(raw?.description ?? ''),
    createdAt: String(raw?.createdAt ?? new Date().toISOString()),
  };
}

function normalizeBankSuggestion(raw: any): TransactionBankSuggestionDto {
  return {
    label: String(raw?.label ?? ''),
    matchType: String(raw?.matchType ?? ''),
    date: String(raw?.date ?? ''),
    amount: Number(raw?.amount ?? 0),
    counterparty: raw?.counterparty?.toString() ?? null,
  };
}

function normalizeBankMatch(raw: any): TransactionBankMatchDto | null {
  if (!raw) return null;
  return {
    status: raw?.status?.toString() ?? null,
    reference: raw?.reference?.toString() ?? null,
    date: raw?.date?.toString() ?? null,
    amount: raw?.amount == null ? null : Number(raw.amount),
    counterparty: raw?.counterparty?.toString() ?? null,
    suggestions: Array.isArray(raw?.suggestions)
      ? raw.suggestions.map(normalizeBankSuggestion)
      : [],
  };
}

function normalizeSupplierCandidate(raw: any): SupplierCandidateDto {
  return {
    id: String(raw?.id ?? ''),
    nom: String(raw?.nom ?? raw?.name ?? ''),
    matriculeFiscal: raw?.matriculeFiscal?.toString() ?? null,
    adresse: raw?.adresse?.toString() ?? null,
    iban: raw?.iban?.toString() ?? null,
    score: Number(raw?.score ?? 0),
    exact: raw?.exact === true,
  };
}

function normalizeTransaction(raw: any): TransactionDto {
  return {
    ...raw,
    entrepriseId: raw?.entrepriseId?.toString() ?? undefined,
    source: normalizeSource(raw?.source),
    fournisseurId: raw?.fournisseurId?.toString() ?? null,
    fournisseurMatriculeFiscal: raw?.fournisseurMatriculeFiscal?.toString() ?? null,
    documentType: raw?.documentType?.toString() ?? null,
    ocrOverallConfidence: raw?.ocrOverallConfidence == null ? null : Number(raw.ocrOverallConfidence),
    type: normalizeType(raw?.type),
    statut: normalizeStatus(raw?.statut),
    statutJustificatif: normalizeReceipt(raw?.statutJustificatif),
    montant: Number(raw?.montant ?? 0),
    reviewFields: Array.isArray(raw?.reviewFields) ? raw.reviewFields.map(normalizeReviewField) : [],
    missingFieldKeys: Array.isArray(raw?.missingFieldKeys) ? raw.missingFieldKeys.map((x: any) => String(x)) : [],
    allocations: Array.isArray(raw?.allocations) ? raw.allocations.map(normalizeAllocation) : [],
    comments: Array.isArray(raw?.comments) ? raw.comments.map(normalizeComment) : [],
    activities: Array.isArray(raw?.activities) ? raw.activities.map(normalizeActivity) : [],
    bankMatch: normalizeBankMatch(raw?.bankMatch),
    accountingPeriodLabel: raw?.accountingPeriodLabel?.toString() ?? null,
    recoverableVatAmount: raw?.recoverableVatAmount == null ? null : Number(raw.recoverableVatAmount),
    recoverableVatRate: raw?.recoverableVatRate == null ? null : Number(raw.recoverableVatRate),
    documentLie: raw?.documentLie
      ? {
          fileName: String(raw.documentLie.fileName ?? 'document'),
          contentType: raw.documentLie.contentType?.toString() ?? null,
          sizeBytes: raw.documentLie.sizeBytes == null ? null : Number(raw.documentLie.sizeBytes),
          url: raw.documentLie.url?.toString() ?? null,
        }
      : null,
  } as TransactionDto;
}

function normalizeList(raw: any): TransactionListDto {
  const items = Array.isArray(raw?.items) ? raw.items.map(normalizeTransaction) : [];
  return {
    items,
    total: Number(raw?.total ?? items.length),
    page: Number(raw?.page ?? 1),
    parPage: Number(raw?.parPage ?? items.length ?? 20),
  };
}

function normalizeCategorySummaryRow(raw: any): TransactionCategorySummaryDto {
  return {
    categorieId: String(raw?.categorieId ?? ''),
    categorieNom: String(raw?.categorieNom ?? ''),
    type: normalizeType(raw?.type),
    count: Number(raw?.count ?? 0),
    montant: Number(raw?.montant ?? 0),
  };
}

function normalizeCreatePayload(req: Partial<TransactionDto>): Record<string, unknown> {
  return {
    date: req.date,
    libelle: req.libelle,
    montant: req.montant,
    type: typeof req.type === 'string' ? TYPE_TO_INT[req.type] : req.type,
    devise: req.devise,
    tiersNom: req.tiersNom,
    categorieNom: req.categorieNom,
    description: req.description,
    compte: req.compte,
    factureId: req.factureId,
  };
}

function normalizeUpdatePayload(req: Partial<TransactionDto>): Record<string, unknown> {
  return {
    date: req.date,
    libelle: req.libelle,
    montant: req.montant,
    type: typeof req.type === 'string' ? TYPE_TO_INT[req.type] : req.type,
    devise: req.devise,
    tiersNom: req.tiersNom,
    categorieNom: req.categorieNom,
    description: req.description,
    compte: req.compte,
    factureId: req.factureId,
    statut: typeof req.statut === 'string' ? STATUS_TO_INT[req.statut] : req.statut,
    statutJustificatif:
      req.statutJustificatif == null
        ? req.statutJustificatif
        : typeof req.statutJustificatif === 'string'
          ? RECEIPT_TO_INT[req.statutJustificatif]
          : req.statutJustificatif,
  };
}

@Injectable({ providedIn: 'root' })
export class TransactionApiService extends ApiService {
  private readonly transactionsUrl = `${this.base}/transactions`;
  private readonly expensesUrl = `${this.base}/expenses`;
  private readonly suppliersUrl = `${this.base}/fournisseurs`;

  lister(query: TransactionListQuery = {}) {
    const params = buildParams(query as any);
    return this.http
      .get<TransactionListDto>(this.transactionsUrl, { params })
      .pipe(map(normalizeList));
  }

  pendingReview(query: TransactionListQuery = {}) {
    const params = buildParams(query as any);
    return this.http
      .get<TransactionListDto>(`${this.expensesUrl}/pending-review`, { params })
      .pipe(map(normalizeList));
  }

  counters(query: Omit<TransactionListQuery, 'page' | 'parPage'> = {}) {
    const params = buildParams(query as any);
    return this.http.get<TransactionCountersDto>(`${this.transactionsUrl}/counters`, { params });
  }

  summaryByCategory(query: Omit<TransactionListQuery, 'page' | 'parPage'> = {}) {
    const params = buildParams(query as any);
    return this.http
      .get<TransactionCategorySummaryDto[]>(`${this.transactionsUrl}/summary/categories`, { params })
      .pipe(map((rows: any) => (Array.isArray(rows) ? rows.map(normalizeCategorySummaryRow) : [])));
  }

  obtenirParId(id: string) {
    return this.http
      .get<TransactionDto>(`${this.transactionsUrl}/${id}`)
      .pipe(map((x: any) => normalizeTransaction(x)));
  }

  expenseDetail(id: string) {
    return this.http
      .get<TransactionDto>(`${this.expensesUrl}/${id}`)
      .pipe(map((x: any) => normalizeTransaction(x)));
  }

  creer(req: Partial<TransactionDto>) {
    return this.http
      .post<TransactionDto>(this.transactionsUrl, normalizeCreatePayload(req))
      .pipe(map((x: any) => normalizeTransaction(x)));
  }

  mettreAJour(id: string, req: Partial<TransactionDto>) {
    return this.http
      .put<TransactionDto>(`${this.transactionsUrl}/${id}`, normalizeUpdatePayload(req))
      .pipe(map((x: any) => normalizeTransaction(x)));
  }

  supprimer(id: string) {
    return this.http.delete(`${this.transactionsUrl}/${id}`);
  }

  uploadReceipt(transactionId: string, file: File) {
    const fd = new FormData();
    fd.append('file', file, file.name);
    return this.http
      .post<TransactionDto>(`${this.transactionsUrl}/${transactionId}/receipt`, fd)
      .pipe(map((x: any) => normalizeTransaction(x)));
  }

  linkInvoice(transactionId: string, invoiceId: string) {
    return this.http
      .post<TransactionDto>(`${this.transactionsUrl}/${transactionId}/link-invoice`, { invoiceId })
      .pipe(map((x: any) => normalizeTransaction(x)));
  }

  saveReceiptReview(transactionId: string, payload: ReceiptReviewPayload) {
    return this.http
      .put<TransactionDto>(`${this.expensesUrl}/${transactionId}/receipt-review`, payload)
      .pipe(map((x: any) => normalizeTransaction(x)));
  }

  categorizeExpense(transactionId: string, payload: CategorizeExpensePayload) {
    return this.http
      .put<TransactionDto>(`${this.expensesUrl}/${transactionId}/categorize`, payload)
      .pipe(map((x: any) => normalizeTransaction(x)));
  }

  addExpenseComment(transactionId: string, message: string) {
    return this.http
      .post<TransactionDto>(`${this.expensesUrl}/${transactionId}/comments`, { message })
      .pipe(map((x: any) => normalizeTransaction(x)));
  }

  matchBank(transactionId: string, payload: BankMatchPayload) {
    return this.http
      .post<TransactionDto>(`${this.expensesUrl}/${transactionId}/match-bank`, payload)
      .pipe(map((x: any) => normalizeTransaction(x)));
  }

  approveExpense(transactionId: string, commentaire?: string | null) {
    return this.http
      .put<TransactionDto>(`${this.expensesUrl}/${transactionId}/approve`, { commentaire })
      .pipe(map((x: any) => normalizeTransaction(x)));
  }

  matchOrCreateSupplier(payload: {
    nom?: string | null;
    matriculeFiscal?: string | null;
    adresse?: string | null;
    iban?: string | null;
    createIfMissing?: boolean;
    selectedSupplierId?: string | null;
  }) {
    return this.http
      .post<SupplierMatchResultDto>(`${this.suppliersUrl}/match-or-create`, payload)
      .pipe(
        map((raw: any) => ({
          matched: raw?.matched === true,
          autoSelected: raw?.autoSelected === true,
          created: raw?.created === true,
          matchType: String(raw?.matchType ?? 'not-found'),
          fournisseurId: raw?.fournisseurId?.toString() ?? null,
          displayName: raw?.displayName?.toString() ?? null,
          matriculeFiscal: raw?.matriculeFiscal?.toString() ?? null,
          candidates: Array.isArray(raw?.candidates)
            ? raw.candidates.map(normalizeSupplierCandidate)
            : [],
        })),
      );
  }

  searchSuppliers(term: string) {
    const params = buildParams({ term });
    return this.http
      .get<SupplierCandidateDto[]>(`${this.suppliersUrl}/search`, { params })
      .pipe(
        map((rows: any) => (Array.isArray(rows) ? rows.map(normalizeSupplierCandidate) : [])),
      );
  }

  exportCsv(query: Omit<TransactionListQuery, 'page' | 'parPage'> = {}) {
    const params = buildParams(query as any);
    return this.http.get(`${this.transactionsUrl}/export/csv`, { params, responseType: 'blob' });
  }

  exportPdf(query: Omit<TransactionListQuery, 'page' | 'parPage'> = {}) {
    const params = buildParams(query as any);
    return this.http.get(`${this.transactionsUrl}/export/pdf`, { params, responseType: 'blob' });
  }
}
