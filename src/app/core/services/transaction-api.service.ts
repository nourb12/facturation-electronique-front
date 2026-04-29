import { Injectable } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { ApiService } from './api.service';
import { map } from 'rxjs/operators';
import {
  TransactionCategorySummaryDto,
  TransactionCountersDto,
  TransactionDto,
  TransactionListDto,
  TransactionStatus,
  TransactionType,
  ReceiptStatus,
} from '../models/transaction.model';

export type TransactionListQuery = {
  page?: number;
  parPage?: number;
  dateDebut?: string; // YYYY-MM-DD
  dateFin?: string;   // YYYY-MM-DD
  statut?: TransactionStatus;
  type?: TransactionType;
  categorieId?: string;
  tiersId?: string;
  recherche?: string;
};

function buildParams(q: Record<string, unknown>): HttpParams {
  let p = new HttpParams();
  Object.entries(q).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return;
    p = p.set(k, String(v));
  });
  return p;
}

// Backend (.NET / System.Text.Json) serializes enums as numbers by default.
// We normalize incoming/outgoing payloads so the UI can keep working with string literals.
const TYPE_TO_INT: Record<TransactionType, number> = { Entree: 0, Sortie: 1 };
const STATUS_TO_INT: Record<TransactionStatus, number> = { NonJustifiee: 0, EnAttente: 1, Justifiee: 2 };
const RECEIPT_TO_INT: Record<ReceiptStatus, number> = { Facultatif: 0, Perdu: 1, Present: 2 };

const INT_TO_TYPE: Record<number, TransactionType> = { 0: 'Entree', 1: 'Sortie' };
const INT_TO_STATUS: Record<number, TransactionStatus> = { 0: 'NonJustifiee', 1: 'EnAttente', 2: 'Justifiee' };
const INT_TO_RECEIPT: Record<number, ReceiptStatus> = { 0: 'Facultatif', 1: 'Perdu', 2: 'Present' };

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

function normalizeTransaction(raw: any): TransactionDto {
  return {
    ...raw,
    type: normalizeType(raw?.type),
    statut: normalizeStatus(raw?.statut),
    statutJustificatif: normalizeReceipt(raw?.statutJustificatif),
  } as TransactionDto;
}

function normalizeList(raw: any): TransactionListDto {
  const items = Array.isArray(raw?.items) ? raw.items.map(normalizeTransaction) : [];
  return {
    ...raw,
    items,
    total: Number(raw?.total ?? items.length ?? 0),
    page: Number(raw?.page ?? 1),
    parPage: Number(raw?.parPage ?? items.length ?? 20),
  } as TransactionListDto;
}

function normalizeCategorySummaryRow(raw: any): TransactionCategorySummaryDto {
  return {
    ...raw,
    type: normalizeType(raw?.type),
    count: Number(raw?.count ?? 0),
    montant: Number(raw?.montant ?? 0),
  } as TransactionCategorySummaryDto;
}

function toTypeInt(v: unknown): number | undefined {
  if (typeof v === 'number') return v;
  if (typeof v === 'string' && (v === 'Entree' || v === 'Sortie')) return TYPE_TO_INT[v];
  return undefined;
}

function toStatusInt(v: unknown): number | undefined {
  if (typeof v === 'number') return v;
  if (typeof v === 'string' && (v === 'NonJustifiee' || v === 'EnAttente' || v === 'Justifiee')) return STATUS_TO_INT[v];
  return undefined;
}

function toReceiptInt(v: unknown): number | null | undefined {
  if (v === null) return null;
  if (v === undefined) return undefined;
  if (typeof v === 'number') return v;
  if (typeof v === 'string' && (v === 'Facultatif' || v === 'Perdu' || v === 'Present')) return RECEIPT_TO_INT[v];
  return undefined;
}

function normalizeCreatePayload(req: Partial<TransactionDto>): Record<string, unknown> {
  // Keep only fields accepted by the backend Create DTO. Extra fields are ignored server-side,
  // but stripping them here makes debugging easier and avoids accidental enum string payloads.
  return {
    date: req.date,
    libelle: req.libelle,
    montant: req.montant,
    type: toTypeInt(req.type),
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
    type: toTypeInt(req.type),
    devise: req.devise,
    tiersNom: req.tiersNom,
    categorieNom: req.categorieNom,
    description: req.description,
    compte: req.compte,
    factureId: req.factureId,
    statut: toStatusInt(req.statut),
    statutJustificatif: toReceiptInt(req.statutJustificatif as any),
  };
}

@Injectable({ providedIn: 'root' })
export class TransactionApiService extends ApiService {
  private url = `${this.base}/transactions`;

  lister(query: TransactionListQuery = {}) {
    const params = buildParams(query as any);
    return this.http.get<TransactionListDto>(this.url, { params }).pipe(map(normalizeList));
  }

  counters(query: Omit<TransactionListQuery, 'page' | 'parPage'> = {}) {
    const params = buildParams(query as any);
    return this.http.get<TransactionCountersDto>(`${this.url}/counters`, { params });
  }

  summaryByCategory(query: Omit<TransactionListQuery, 'page' | 'parPage'> = {}) {
    const params = buildParams(query as any);
    return this.http.get<TransactionCategorySummaryDto[]>(`${this.url}/summary/categories`, { params })
      .pipe(map((rows: any) => (Array.isArray(rows) ? rows.map(normalizeCategorySummaryRow) : [])));
  }

  obtenirParId(id: string) {
    return this.http.get<TransactionDto>(`${this.url}/${id}`).pipe(map((x: any) => normalizeTransaction(x)));
  }

  creer(req: Partial<TransactionDto>) {
    return this.http.post<TransactionDto>(this.url, normalizeCreatePayload(req)).pipe(map((x: any) => normalizeTransaction(x)));
  }

  mettreAJour(id: string, req: Partial<TransactionDto>) {
    return this.http.put<TransactionDto>(`${this.url}/${id}`, normalizeUpdatePayload(req)).pipe(map((x: any) => normalizeTransaction(x)));
  }

  supprimer(id: string) {
    return this.http.delete(`${this.url}/${id}`);
  }

  uploadReceipt(transactionId: string, file: File) {
    const fd = new FormData();
    fd.append('file', file, file.name);
    return this.http.post<TransactionDto>(`${this.url}/${transactionId}/receipt`, fd).pipe(map((x: any) => normalizeTransaction(x)));
  }

  linkInvoice(transactionId: string, invoiceId: string) {
    return this.http.post<TransactionDto>(`${this.url}/${transactionId}/link-invoice`, { invoiceId }).pipe(map((x: any) => normalizeTransaction(x)));
  }

  exportCsv(query: Omit<TransactionListQuery, 'page' | 'parPage'> = {}) {
    const params = buildParams(query as any);
    return this.http.get(`${this.url}/export/csv`, { params, responseType: 'blob' });
  }

  exportPdf(query: Omit<TransactionListQuery, 'page' | 'parPage'> = {}) {
    const params = buildParams(query as any);
    return this.http.get(`${this.url}/export/pdf`, { params, responseType: 'blob' });
  }
}
