import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { animate, style, transition, trigger } from '@angular/animations';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { TransactionApiService } from '../../core/services/transaction-api.service';
import {
  DocumentSource,
  ReceiptStatus,
  ReviewFieldDto,
  SupplierCandidateDto,
  SupplierMatchResultDto,
  TransactionActivityDto,
  TransactionAllocationDto,
  TransactionBankSuggestionDto,
  TransactionCategorySummaryDto,
  TransactionCountersDto,
  TransactionDto,
  TransactionStatus,
  TransactionType,
} from '../../core/models/transaction.model';

type UiTab = 'all' | 'category';
type UiStatus = TransactionStatus | 'All';
type UiType = TransactionType | 'All';
type PeriodPreset = 'Month' | 'Quarter' | 'Year' | 'Custom';
type DetailTab = 'receipt' | 'analytics' | 'matching' | 'comments' | 'activities';

type ReceiptReviewDraft = {
  libelle: string;
  date: string;
  montant: number;
  tiersNom: string;
  fournisseurId: string | null;
  fournisseurMatriculeFiscal: string;
  fields: ReviewFieldDto[];
};

type AnalyticsDraft = {
  categorieNom: string;
  allocations: TransactionAllocationDto[];
  accountingPeriodLabel: string;
  recoverableVatAmount: number | null;
  recoverableVatRate: number | null;
};

type BankMatchDraft = {
  status: string;
  reference: string;
  date: string;
  amount: number | null;
  counterparty: string;
};

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function startOfQuarter(d: Date): Date {
  const q = Math.floor(d.getMonth() / 3) * 3;
  return new Date(d.getFullYear(), q, 1);
}
function startOfYear(d: Date): Date {
  return new Date(d.getFullYear(), 0, 1);
}
function toIsoDate(d: Date): string {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
    .toISOString()
    .slice(0, 10);
}
function sumAmount(items: TransactionDto[]): number {
  return items.reduce((s, t) => s + (t?.montant ?? 0), 0);
}

const ZERO_COUNTERS: TransactionCountersDto = {
  nonJustifieeCount: 0,
  nonJustifieeMontant: 0,
  enAttenteCount: 0,
  enAttenteMontant: 0,
  justifieeCount: 0,
  justifieeMontant: 0,
};

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TranslateModule, DecimalPipe, DatePipe],
  templateUrl: './transactions.component.html',
  styleUrls: ['./transactions.component.scss'],
  animations: [
    trigger('pageIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(8px)' }),
        animate('400ms cubic-bezier(.16,1,.3,1)', style({ opacity: 1, transform: 'translateY(0)' })),
      ]),
    ]),
    trigger('fadeIn', [
      transition(':enter', [style({ opacity: 0 }), animate('200ms ease', style({ opacity: 1 }))]),
      transition(':leave', [animate('150ms ease', style({ opacity: 0 }))]),
    ]),
    trigger('rowIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(-8px)' }),
        animate('250ms ease', style({ opacity: 1, transform: 'translateX(0)' })),
      ]),
    ]),
  ],
})
export class TransactionsComponent implements OnInit {
  private readonly api = inject(TransactionApiService);
  private readonly translate = inject(TranslateService);

  readonly Math = Math;
  readonly receiptStatusOptions: ReceiptStatus[] = ['Facultatif', 'Perdu', 'Present'];

  activeTab = signal<UiTab>('all');
  loading = signal(true);
  showExportMenu = signal(false);

  transactions = signal<TransactionDto[]>([]);
  total = signal(0);
  page = signal(1);
  readonly parPage = 20;

  counters = signal<TransactionCountersDto>(ZERO_COUNTERS);
  categorySummary = signal<TransactionCategorySummaryDto[]>([]);

  search = signal('');
  status = signal<UiStatus>('All');
  type = signal<UiType>('All');
  period = signal<PeriodPreset>('Month');
  from = signal<string>('');
  to = signal<string>('');

  selectedIds = signal<string[]>([]);
  selectedCount = computed(() => this.selectedIds().length);
  allVisibleSelected = computed(() => {
    const ids = new Set(this.selectedIds());
    const list = this.visibleRows();
    return list.length > 0 && list.every((t) => ids.has(t.id));
  });

  showDetail = signal(false);
  detailLoading = signal(false);
  detailSaving = signal(false);
  detailTab = signal<DetailTab>('receipt');
  activeTransaction = signal<TransactionDto | null>(null);
  receiptDraft = signal<ReceiptReviewDraft | null>(null);
  analyticsDraft = signal<AnalyticsDraft | null>(null);
  bankDraft = signal<BankMatchDraft | null>(null);
  commentDraft = signal('');
  supplierMatch = signal<SupplierMatchResultDto | null>(null);
  supplierMatchLoading = signal(false);

  showCreate = signal(false);
  createSaving = signal(false);
  createForm = signal<Partial<TransactionDto>>({
    date: toIsoDate(new Date()),
    type: 'Sortie',
    statut: 'NonJustifiee',
    statutJustificatif: null,
    montant: 0,
    devise: 'TND',
    libelle: '',
  });

  receiptDragging = signal(false);

  visibleRows = computed(() => {
    const q = this.search().trim().toLowerCase();
    const st = this.status();
    const ty = this.type();
    return this.transactions().filter((t) => {
      if (st !== 'All' && t.statut !== st) return false;
      if (ty !== 'All' && t.type !== ty) return false;
      if (!q) return true;
      const hay = `${t.libelle ?? ''} ${t.tiersNom ?? ''} ${t.categorieNom ?? ''}`.toLowerCase();
      return hay.includes(q);
    });
  });

  ngOnInit(): void {
    this.resetPeriodDates();
    this.load();
  }

  toggleExportMenu() {
    this.showExportMenu.update((v) => !v);
  }

  closeExportMenu() {
    this.showExportMenu.set(false);
  }

  setTab(tab: UiTab) {
    this.activeTab.set(tab);
    if (tab === 'category' && this.categorySummary().length === 0) {
      this.loadCategorySummary();
    }
  }

  resetPeriodDates() {
    const now = new Date();
    const p = this.period();
    const start =
      p === 'Quarter' ? startOfQuarter(now) :
      p === 'Year' ? startOfYear(now) :
      p === 'Custom' ? null :
      startOfMonth(now);

    if (start) this.from.set(toIsoDate(start));
    if (p !== 'Custom') this.to.set(toIsoDate(now));
  }

  onPeriodChange(next: PeriodPreset) {
    this.period.set(next);
    this.resetPeriodDates();
    this.page.set(1);
    this.load();
  }

  onFilterChange() {
    this.page.set(1);
    this.load();
  }

  setStatusFilter(next: UiStatus) {
    this.status.set(next);
    this.onFilterChange();
  }

  load() {
    this.loading.set(true);
    this.selectedIds.set([]);
    this.closeExportMenu();

    const statut = this.status();
    const type = this.type();

    const query = {
      page: this.page(),
      parPage: this.parPage,
      recherche: this.search(),
      statut: statut === 'All' ? undefined : statut,
      type: type === 'All' ? undefined : type,
      dateDebut: this.from(),
      dateFin: this.to(),
    } as const;

    forkJoin({
      list: this.api.lister(query).pipe(catchError(() => of({ items: [], total: 0, page: 1, parPage: this.parPage }))),
      counters: this.api.counters(query).pipe(catchError(() => of(null))),
    }).subscribe({
      next: ({ list, counters }) => {
        this.transactions.set(list.items ?? []);
        this.total.set(list.total ?? 0);
        this.counters.set(counters ?? this.computeCountersFromList(list.items ?? []));
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  loadCategorySummary() {
    const statut = this.status();
    const type = this.type();
    const query = {
      recherche: this.search(),
      statut: statut === 'All' ? undefined : statut,
      type: type === 'All' ? undefined : type,
      dateDebut: this.from(),
      dateFin: this.to(),
    } as const;

    this.api.summaryByCategory(query).pipe(catchError(() => of([]))).subscribe({
      next: (rows) => this.categorySummary.set(rows ?? []),
    });
  }

  changePage(p: number) {
    this.page.set(p);
    this.load();
  }

  toggleSelectAllVisible() {
    if (this.allVisibleSelected()) {
      this.selectedIds.set([]);
      return;
    }
    this.selectedIds.set(this.visibleRows().map((t) => t.id));
  }

  toggleSelected(id: string) {
    const cur = new Set(this.selectedIds());
    if (cur.has(id)) cur.delete(id);
    else cur.add(id);
    this.selectedIds.set([...cur]);
  }

  openDetail(t: TransactionDto) {
    this.showDetail.set(true);
    this.detailTab.set('receipt');
    this.detailLoading.set(true);
    this.activeTransaction.set(t);
    this.supplierMatch.set(null);
    this.commentDraft.set('');

    this.api.expenseDetail(t.id).pipe(catchError(() => of(t))).subscribe({
      next: (detail) => {
        this.patchTransaction(detail);
        this.initializeDetailDrafts(detail);
        this.detailLoading.set(false);
      },
      error: () => this.detailLoading.set(false),
    });
  }

  closeDetail() {
    this.showDetail.set(false);
    this.activeTransaction.set(null);
    this.receiptDraft.set(null);
    this.analyticsDraft.set(null);
    this.bankDraft.set(null);
    this.supplierMatch.set(null);
    this.commentDraft.set('');
  }

  openCreate() {
    this.createForm.set({
      date: toIsoDate(new Date()),
      type: 'Sortie',
      statut: 'NonJustifiee',
      statutJustificatif: null,
      montant: 0,
      devise: 'TND',
      libelle: '',
    });
    this.showCreate.set(true);
  }

  closeCreate() {
    this.showCreate.set(false);
  }

  saveCreate() {
    const f = this.createForm();
    if (!f.libelle || !String(f.libelle).trim()) return;
    this.createSaving.set(true);
    this.api.creer(f).pipe(catchError(() => of(null))).subscribe({
      next: (created) => {
        this.createSaving.set(false);
        this.showCreate.set(false);
        if (created) this.load();
      },
    });
  }

  setCreateField<K extends keyof TransactionDto>(key: K, value: TransactionDto[K]) {
    this.createForm.update((v) => ({ ...v, [key]: value }));
  }

  setAnalyticsField<K extends keyof AnalyticsDraft>(key: K, value: AnalyticsDraft[K]) {
    this.analyticsDraft.update((draft) => draft ? ({ ...draft, [key]: value }) : draft);
  }

  setBankField<K extends keyof BankMatchDraft>(key: K, value: BankMatchDraft[K]) {
    this.bankDraft.update((draft) => draft ? ({ ...draft, [key]: value }) : draft);
  }

  onReceiptDragOver(ev: DragEvent) {
    ev.preventDefault();
    this.receiptDragging.set(true);
  }

  onReceiptDragLeave(ev: DragEvent) {
    ev.preventDefault();
    this.receiptDragging.set(false);
  }

  onReceiptDrop(ev: DragEvent) {
    ev.preventDefault();
    this.receiptDragging.set(false);
    const file = ev.dataTransfer?.files?.[0];
    if (file) this.uploadReceipt(file);
  }

  onReceiptPicked(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (file) this.uploadReceipt(file);
  }

  uploadReceipt(file: File) {
    const t = this.activeTransaction();
    if (!t) return;
    this.api.uploadReceipt(t.id, file).pipe(catchError(() => of(null))).subscribe({
      next: (updated) => {
        if (!updated) return;
        this.patchTransaction(updated);
        this.initializeDetailDrafts(updated);
      },
    });
  }

  setReceiptStatus(value: ReceiptStatus | null) {
    const t = this.activeTransaction();
    if (!t) return;
    const nextStatut: TransactionStatus =
      value ? 'Justifiee' : (t.documentLie || t.factureId) ? 'Justifiee' : 'NonJustifiee';
    const next = { ...t, statutJustificatif: value, statut: nextStatut };
    this.activeTransaction.set(next);
    this.api.mettreAJour(t.id, { statutJustificatif: value, statut: nextStatut } as Partial<TransactionDto>)
      .pipe(catchError(() => of(null)))
      .subscribe({ next: (updated) => updated && this.patchTransaction(updated) });
  }

  setReceiptField<K extends keyof ReceiptReviewDraft>(key: K, value: ReceiptReviewDraft[K]) {
    this.receiptDraft.update((draft) => draft ? ({ ...draft, [key]: value }) : draft);
  }

  setReviewFieldValue(index: number, value: string) {
    this.receiptDraft.update((draft) => {
      if (!draft) return draft;
      const fields = draft.fields.map((field, fieldIndex) => {
        if (fieldIndex !== index) return field;
        return {
          ...field,
          value,
          requiresReview: field.required ? value.trim().length === 0 : false,
        };
      });
      return { ...draft, fields };
    });
  }

  saveReceiptReview() {
    const transaction = this.activeTransaction();
    const draft = this.receiptDraft();
    if (!transaction || !draft) return;
    this.detailSaving.set(true);
    this.api.saveReceiptReview(transaction.id, {
      libelle: draft.libelle,
      date: draft.date,
      montant: draft.montant,
      tiersNom: draft.tiersNom,
      fournisseurId: draft.fournisseurId,
      fournisseurMatriculeFiscal: draft.fournisseurMatriculeFiscal,
      fields: draft.fields.map((field) => ({ key: field.key, value: field.value ?? '' })),
    }).pipe(catchError(() => of(null))).subscribe({
      next: (updated) => {
        this.detailSaving.set(false);
        if (!updated) return;
        this.patchTransaction(updated);
        this.initializeDetailDrafts(updated);
        this.detailTab.set('analytics');
      },
      error: () => this.detailSaving.set(false),
    });
  }

  matchSupplier(createIfMissing = false, selected?: SupplierCandidateDto) {
    const draft = this.receiptDraft();
    if (!draft) return;

    if (selected) {
      this.receiptDraft.set({
        ...draft,
        tiersNom: selected.nom,
        fournisseurId: selected.id,
        fournisseurMatriculeFiscal: selected.matriculeFiscal ?? '',
      });
      this.supplierMatch.set({
        matched: true,
        autoSelected: false,
        created: false,
        matchType: 'selected',
        fournisseurId: selected.id,
        displayName: selected.nom,
        matriculeFiscal: selected.matriculeFiscal ?? null,
        candidates: [],
      });
      return;
    }

    this.supplierMatchLoading.set(true);
    this.api.matchOrCreateSupplier({
      nom: draft.tiersNom,
      matriculeFiscal: draft.fournisseurMatriculeFiscal,
      createIfMissing,
    }).pipe(catchError(() => of(null))).subscribe({
      next: (result) => {
        this.supplierMatchLoading.set(false);
        if (!result) return;
        this.supplierMatch.set(result);
        if (result.fournisseurId) {
          this.receiptDraft.update((current) => current ? ({
            ...current,
            fournisseurId: result.fournisseurId ?? null,
            tiersNom: result.displayName ?? current.tiersNom,
            fournisseurMatriculeFiscal: result.matriculeFiscal ?? current.fournisseurMatriculeFiscal,
          }) : current);
        }
      },
      error: () => this.supplierMatchLoading.set(false),
    });
  }

  addAllocation() {
    const draft = this.analyticsDraft();
    const transaction = this.activeTransaction();
    if (!draft || !transaction) return;
    const remainder = Math.max(0, 100 - draft.allocations.reduce((sum, item) => sum + item.percentage, 0));
    const percentage = draft.allocations.length === 0 ? 100 : remainder;
    const amount = transaction.montant * (percentage / 100);
    const next: TransactionAllocationDto = {
      id: crypto.randomUUID(),
      categoryName: '',
      percentage,
      amount,
    };
    this.analyticsDraft.set({ ...draft, allocations: [...draft.allocations, next] });
  }

  updateAllocation(index: number, patch: Partial<TransactionAllocationDto>) {
    const draft = this.analyticsDraft();
    const transaction = this.activeTransaction();
    if (!draft || !transaction) return;

    const allocations = draft.allocations.map((item, itemIndex) => {
      if (itemIndex !== index) return item;
      const next = { ...item, ...patch };
      if (patch.percentage != null) {
        next.amount = Number(((transaction.montant ?? 0) * (patch.percentage / 100)).toFixed(3));
      }
      if (patch.amount != null && transaction.montant > 0) {
        next.percentage = Number(((patch.amount / transaction.montant) * 100).toFixed(2));
      }
      return next;
    });
    this.analyticsDraft.set({ ...draft, allocations });
  }

  removeAllocation(index: number) {
    const draft = this.analyticsDraft();
    if (!draft) return;
    this.analyticsDraft.set({
      ...draft,
      allocations: draft.allocations.filter((_, itemIndex) => itemIndex !== index),
    });
  }

  allocationsTotalPercent(): number {
    return (this.analyticsDraft()?.allocations ?? []).reduce((sum, item) => sum + item.percentage, 0);
  }

  saveAnalytics() {
    const transaction = this.activeTransaction();
    const draft = this.analyticsDraft();
    if (!transaction || !draft) return;
    this.detailSaving.set(true);
    this.api.categorizeExpense(transaction.id, {
      categorieNom: draft.categorieNom,
      allocations: draft.allocations.map((item) => ({
        categoryName: item.categoryName,
        percentage: item.percentage,
        amount: item.amount,
      })),
      accountingPeriodLabel: draft.accountingPeriodLabel,
      recoverableVatAmount: draft.recoverableVatAmount,
      recoverableVatRate: draft.recoverableVatRate,
    }).pipe(catchError(() => of(null))).subscribe({
      next: (updated) => {
        this.detailSaving.set(false);
        if (!updated) return;
        this.patchTransaction(updated);
        this.initializeDetailDrafts(updated);
        this.detailTab.set('matching');
      },
      error: () => this.detailSaving.set(false),
    });
  }

  saveBankMatch() {
    const transaction = this.activeTransaction();
    const draft = this.bankDraft();
    if (!transaction || !draft) return;
    this.detailSaving.set(true);
    this.api.matchBank(transaction.id, draft).pipe(catchError(() => of(null))).subscribe({
      next: (updated) => {
        this.detailSaving.set(false);
        if (!updated) return;
        this.patchTransaction(updated);
        this.initializeDetailDrafts(updated);
      },
      error: () => this.detailSaving.set(false),
    });
  }

  addComment() {
    const transaction = this.activeTransaction();
    const message = this.commentDraft().trim();
    if (!transaction || !message) return;
    this.detailSaving.set(true);
    this.api.addExpenseComment(transaction.id, message).pipe(catchError(() => of(null))).subscribe({
      next: (updated) => {
        this.detailSaving.set(false);
        if (!updated) return;
        this.patchTransaction(updated);
        this.initializeDetailDrafts(updated);
        this.commentDraft.set('');
      },
      error: () => this.detailSaving.set(false),
    });
  }

  approveExpense() {
    const transaction = this.activeTransaction();
    if (!transaction) return;
    this.detailSaving.set(true);
    this.api.approveExpense(transaction.id).pipe(catchError(() => of(null))).subscribe({
      next: (updated) => {
        this.detailSaving.set(false);
        if (!updated) return;
        this.patchTransaction(updated);
        this.initializeDetailDrafts(updated);
      },
      error: () => this.detailSaving.set(false),
    });
  }

  reviewStateClass(t: TransactionDto): string {
    if (t.missingFieldKeys?.length) return 'err';
    if (t.statut === 'EnAttente') return 'warn';
    if (t.statut === 'Justifiee') return 'ok';
    return 'soft';
  }

  reviewStateLabel(t: TransactionDto): string {
    if (t.missingFieldKeys?.length) return this.translate.instant('TRANSACTIONS.REVIEW.REQUIRED');
    if (t.statut === 'EnAttente') return this.translate.instant('TRANSACTIONS.REVIEW.PENDING');
    if (t.statut === 'Justifiee') return this.translate.instant('TRANSACTIONS.REVIEW.APPROVED');
    return this.translate.instant('TRANSACTIONS.REVIEW.DRAFT');
  }

  fieldBadgeClass(field: ReviewFieldDto): string {
    if (field.required && !(field.value ?? '').trim()) return 'err';
    if (field.requiresReview) return 'warn';
    return 'ok';
  }

  fieldBadgeLabel(field: ReviewFieldDto): string {
    if (field.required && !(field.value ?? '').trim()) {
      return this.translate.instant('TRANSACTIONS.REVIEW.FIELD_REQUIRED');
    }
    if (field.requiresReview) {
      return this.translate.instant('TRANSACTIONS.REVIEW.FIELD_REVIEW');
    }
    return this.translate.instant('TRANSACTIONS.REVIEW.FIELD_RELIABLE');
  }

  sourceClass(source?: string | null): string {
    return source === 'MobileApp' ? 'info' : 'soft';
  }

  statusClass(s: TransactionStatus): string {
    if (s === 'Justifiee') return 'ok';
    if (s === 'EnAttente') return 'warn';
    return 'err';
  }

  typeClass(t: TransactionType): string {
    return t === 'Entree' ? 'ok' : 'warn';
  }

  isImageDocument(url?: string | null, contentType?: string | null): boolean {
    const lowerUrl = (url ?? '').toLowerCase();
    const lowerType = (contentType ?? '').toLowerCase();
    return lowerType.startsWith('image/')
      || lowerUrl.endsWith('.png')
      || lowerUrl.endsWith('.jpg')
      || lowerUrl.endsWith('.jpeg')
      || lowerUrl.endsWith('.webp');
  }

  isPdfDocument(url?: string | null, contentType?: string | null): boolean {
    const lowerUrl = (url ?? '').toLowerCase();
    const lowerType = (contentType ?? '').toLowerCase();
    return lowerType.includes('pdf') || lowerUrl.endsWith('.pdf');
  }

  buildBankSuggestions(t: TransactionDto | null): TransactionBankSuggestionDto[] {
    if (!t) return [];
    if (t.bankMatch?.suggestions?.length) return t.bankMatch.suggestions;
    return [
      {
        label: t.libelle,
        matchType: this.translate.instant('TRANSACTIONS.DETAIL.MATCHING.SUGGESTION_DEFAULT'),
        date: t.date,
        amount: -Math.abs(t.montant),
        counterparty: t.tiersNom ?? '',
      },
    ];
  }

  applyBankSuggestion(suggestion: TransactionBankSuggestionDto) {
    this.bankDraft.update((draft) => draft ? ({
      ...draft,
      status: suggestion.matchType,
      reference: suggestion.label,
      date: suggestion.date?.slice(0, 10) ?? draft.date,
      amount: suggestion.amount,
      counterparty: suggestion.counterparty ?? '',
    }) : draft);
  }

  formatAmount(v: number): string {
    return new Intl.NumberFormat('fr-TN', { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(v ?? 0);
  }

  exportCsv() {
    this.closeExportMenu();
    const q = this.buildExportQuery();
    this.api.exportCsv(q).pipe(catchError(() => of(null))).subscribe({
      next: (blob) => blob && this.downloadBlob(blob, 'transactions.csv'),
    });
  }

  exportPdf() {
    this.closeExportMenu();
    const q = this.buildExportQuery();
    this.api.exportPdf(q).pipe(catchError(() => of(null))).subscribe({
      next: (blob) => blob && this.downloadBlob(blob, 'journal-transactions.pdf'),
    });
  }

  private initializeDetailDrafts(transaction: TransactionDto) {
    this.receiptDraft.set({
      libelle: transaction.libelle,
      date: transaction.date?.slice(0, 10) ?? '',
      montant: transaction.montant,
      tiersNom: transaction.tiersNom ?? '',
      fournisseurId: transaction.fournisseurId ?? null,
      fournisseurMatriculeFiscal: transaction.fournisseurMatriculeFiscal ?? '',
      fields: transaction.reviewFields?.map((field) => ({ ...field })) ?? [],
    });

    this.analyticsDraft.set({
      categorieNom: transaction.categorieNom ?? '',
      allocations: transaction.allocations?.length
        ? transaction.allocations.map((item) => ({ ...item }))
        : transaction.categorieNom
          ? [{
              id: crypto.randomUUID(),
              categoryName: transaction.categorieNom,
              percentage: 100,
              amount: transaction.montant,
            }]
          : [],
      accountingPeriodLabel: transaction.accountingPeriodLabel ?? '',
      recoverableVatAmount: transaction.recoverableVatAmount ?? null,
      recoverableVatRate: transaction.recoverableVatRate ?? null,
    });

    this.bankDraft.set({
      status: transaction.bankMatch?.status ?? 'pending',
      reference: transaction.bankMatch?.reference ?? '',
      date: transaction.bankMatch?.date?.slice(0, 10) ?? transaction.date?.slice(0, 10) ?? '',
      amount: transaction.bankMatch?.amount ?? transaction.montant,
      counterparty: transaction.bankMatch?.counterparty ?? transaction.tiersNom ?? '',
    });
  }

  private patchTransaction(next: TransactionDto) {
    this.activeTransaction.set(next);
    this.transactions.update((list) => list.map((t) => (t.id === next.id ? next : t)));
  }

  private computeCountersFromList(items: TransactionDto[]): TransactionCountersDto {
    const unjustified = items.filter((x) => x.statut === 'NonJustifiee');
    const pending = items.filter((x) => x.statut === 'EnAttente');
    const justified = items.filter((x) => x.statut === 'Justifiee');
    return {
      nonJustifieeCount: unjustified.length,
      nonJustifieeMontant: sumAmount(unjustified),
      enAttenteCount: pending.length,
      enAttenteMontant: sumAmount(pending),
      justifieeCount: justified.length,
      justifieeMontant: sumAmount(justified),
    };
  }

  private buildExportQuery() {
    const statut = this.status();
    const type = this.type();
    return {
      recherche: this.search(),
      statut: statut === 'All' ? undefined : statut,
      type: type === 'All' ? undefined : type,
      dateDebut: this.from(),
      dateFin: this.to(),
    } as const;
  }

  private downloadBlob(blob: Blob, fileName: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  }
}
