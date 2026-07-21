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
type UiSource = DocumentSource | 'Facture' | 'Manuel' | 'All';
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

function makeTransaction(overrides: Partial<TransactionDto> & Pick<TransactionDto, 'id' | 'date' | 'libelle' | 'type' | 'statut' | 'montant'>): TransactionDto {
  const now = '2026-07-20T09:00:00Z';
  return {
    statutJustificatif: overrides.statut === 'Justifiee' ? 'Present' : null,
    devise: 'TND',
    source: 'Web',
    reviewFields: [],
    missingFieldKeys: [],
    allocations: [],
    comments: [],
    activities: [{
      id: `${overrides.id}-activity`,
      authorName: 'TuniFlow',
      action: 'Création',
      description: 'Transaction préparée pour la revue comptable.',
      createdAt: now,
    }],
    creeLe: now,
    modifieLe: now,
    ...overrides,
  };
}

const DEMO_TRANSACTIONS: TransactionDto[] = [
  makeTransaction({
    id: 'demo-tr-001',
    date: '2026-07-20T10:18:00',
    libelle: 'Paiement facture FAC-2026-0012',
    tiersNom: 'Société Carthage',
    categorieNom: 'Encaissement client',
    source: 'Web',
    type: 'Entree',
    statut: 'Justifiee',
    statutJustificatif: 'Present',
    montant: 5950,
    factureId: 'fac-demo-0012',
    documentLie: { fileName: 'FAC-2026-0012.pdf', contentType: 'application/pdf' },
    allocations: [{ id: 'alloc-001', categoryName: 'Encaissement client', percentage: 100, amount: 5950 }],
  }),
  makeTransaction({
    id: 'demo-tr-002',
    date: '2026-07-19T16:42:00',
    libelle: 'Loyer bureau juillet',
    tiersNom: 'Propriétaire Immo',
    categorieNom: 'Loyer',
    source: 'Web',
    type: 'Sortie',
    statut: 'EnAttente',
    montant: 2000,
    missingFieldKeys: ['documentLie'],
  }),
  makeTransaction({
    id: 'demo-tr-003',
    date: '2026-07-18T09:35:00',
    libelle: 'Achat fournitures administratives',
    tiersNom: 'Fournisseur X',
    categorieNom: 'Charges',
    source: 'MobileApp',
    type: 'Sortie',
    statut: 'NonJustifiee',
    montant: 450,
    missingFieldKeys: ['documentLie', 'categorieNom'],
  }),
  makeTransaction({
    id: 'demo-tr-004',
    date: '2026-07-17T14:05:00',
    libelle: 'Paiement facture FAC-2026-0013',
    tiersNom: 'Client SARL',
    categorieNom: 'Encaissement client',
    source: 'Web',
    type: 'Entree',
    statut: 'Justifiee',
    statutJustificatif: 'Present',
    montant: 12950,
    factureId: 'fac-demo-0013',
    documentLie: { fileName: 'FAC-2026-0013.pdf', contentType: 'application/pdf' },
  }),
  makeTransaction({
    id: 'demo-tr-005',
    date: '2026-07-15T11:20:00',
    libelle: 'Retenue à la source 1,5%',
    tiersNom: 'DGI Tunisie',
    categorieNom: 'Fiscal',
    source: 'Web',
    type: 'Sortie',
    statut: 'EnAttente',
    montant: 89.25,
  }),
  makeTransaction({
    id: 'demo-tr-006',
    date: '2026-07-12T08:50:00',
    libelle: 'Abonnement télécom',
    tiersNom: 'Tunisie Telecom',
    categorieNom: 'Services',
    source: 'Web',
    type: 'Sortie',
    statut: 'Justifiee',
    statutJustificatif: 'Present',
    montant: 875,
    documentLie: { fileName: 'recu-telecom-juillet.pdf', contentType: 'application/pdf' },
  }),
  makeTransaction({
    id: 'demo-tr-007',
    date: '2026-07-09T15:12:00',
    libelle: 'Commission bancaire',
    tiersNom: 'Banque',
    categorieNom: 'Frais bancaires',
    source: 'Web',
    type: 'Sortie',
    statut: 'Justifiee',
    statutJustificatif: 'Facultatif',
    montant: 38.5,
  }),
  makeTransaction({
    id: 'demo-tr-008',
    date: '2026-07-07T12:30:00',
    libelle: 'Règlement client comptant',
    tiersNom: 'Client Express',
    categorieNom: 'Encaissement client',
    source: 'Web',
    type: 'Entree',
    statut: 'Justifiee',
    statutJustificatif: 'Present',
    montant: 3200,
    factureId: 'fac-demo-0014',
  }),
];

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
  parPage = signal(10);

  counters = signal<TransactionCountersDto>(ZERO_COUNTERS);
  categorySummary = signal<TransactionCategorySummaryDto[]>([]);

  search = signal('');
  status = signal<UiStatus>('All');
  type = signal<UiType>('All');
  source = signal<UiSource>('All');
  tier = signal<string>('All');
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
  totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.parPage())));
  pageNumbers = computed(() => {
    const total = this.totalPages();
    const current = this.page();
    const start = Math.max(1, Math.min(current - 1, total - 2));
    return Array.from({ length: Math.min(3, total) }, (_, i) => start + i);
  });
  tierOptions = computed(() => {
    const names = new Set(
      this.transactions()
        .map((t) => (t.tiersNom ?? '').trim())
        .filter(Boolean)
    );
    return [...names].sort((a, b) => a.localeCompare(b, 'fr'));
  });
  totalEntrees = computed(() => sumAmount(this.visibleRows().filter((t) => t.type === 'Entree')));
  totalSorties = computed(() => sumAmount(this.visibleRows().filter((t) => t.type === 'Sortie')));
  soldeNet = computed(() => this.totalEntrees() - this.totalSorties());
  linkedToInvoicesCount = computed(() => this.visibleRows().filter((t) => this.isLinkedToInvoice(t)).length);

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
    const source = this.source();
    const tier = this.tier();
    return this.transactions().filter((t) => {
      if (st !== 'All' && t.statut !== st) return false;
      if (ty !== 'All' && t.type !== ty) return false;
      if (tier !== 'All' && (t.tiersNom ?? '') !== tier) return false;
      if (source === 'Facture' && !this.isLinkedToInvoice(t)) return false;
      if (source === 'MobileApp' && t.source !== 'MobileApp') return false;
      if (source === 'Manuel' && (this.isLinkedToInvoice(t) || t.source === 'MobileApp')) return false;
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
      parPage: this.parPage(),
      recherche: this.search(),
      statut: statut === 'All' ? undefined : statut,
      type: type === 'All' ? undefined : type,
      dateDebut: this.from(),
      dateFin: this.to(),
    } as const;

    forkJoin({
      list: this.api.lister(query).pipe(catchError(() => of({ items: [], total: 0, page: 1, parPage: this.parPage() }))),
      counters: this.api.counters(query).pipe(catchError(() => of(null))),
    }).subscribe({
      next: ({ list, counters }) => {
        const apiItems = list.items ?? [];
        const items = apiItems.length ? apiItems : this.fallbackTransactions();
        this.transactions.set(items);
        this.total.set(apiItems.length ? (list.total ?? apiItems.length) : items.length);
        this.counters.set(apiItems.length && counters ? counters : this.computeCountersFromList(items));
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
      next: (rows) => this.categorySummary.set(rows?.length ? rows : this.computeCategorySummary(this.visibleRows())),
    });
  }

  changePage(p: number) {
    this.page.set(Math.max(1, Math.min(p, this.totalPages())));
    this.load();
  }

  setPageSize(next: string | number) {
    this.parPage.set(Number(next) || 10);
    this.page.set(1);
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
        if (created) {
          this.load();
          return;
        }
        const local = makeTransaction({
          id: `local-tr-${Date.now()}`,
          date: String(f.date || toIsoDate(new Date())),
          libelle: String(f.libelle || 'Nouvelle transaction'),
          tiersNom: f.tiersNom || 'Saisie manuelle',
          categorieNom: f.categorieNom || 'À classer',
          type: (f.type || 'Sortie') as TransactionType,
          statut: (f.statut || 'NonJustifiee') as TransactionStatus,
          montant: Number(f.montant || 0),
          source: 'Web',
          statutJustificatif: f.statutJustificatif ?? null,
          devise: f.devise || 'TND',
        });
        this.prependLocalTransaction(local);
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

  setReviewFieldLabel(index: number, label: string) {
    this.receiptDraft.update((draft) => {
      if (!draft) return draft;
      const fields = draft.fields.map((field, fieldIndex) =>
        fieldIndex === index ? { ...field, label } : field
      );
      return { ...draft, fields };
    });
  }

  addReviewField() {
    this.receiptDraft.update((draft) => {
      if (!draft) return draft;
      const count = draft.fields.filter((field) => field.key.startsWith('custom_')).length + 1;
      const label = `Champ manuel ${count}`;
      return {
        ...draft,
        fields: [
          ...draft.fields,
          {
            key: `custom_champ_manuel_${Date.now()}`,
            label,
            value: '',
            confidence: 100,
            required: false,
            requiresReview: true,
          },
        ],
      };
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
      fields: draft.fields.map((field) => ({
        key: field.key,
        label: field.label,
        value: field.value ?? '',
        confidence: field.confidence,
        required: field.required,
      })),
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

  transactionSourceLabel(t: TransactionDto): string {
    if (this.isLinkedToInvoice(t)) return 'Facture';
    if (t.source === 'MobileApp') return 'Mobile';
    return 'Manuel';
  }

  transactionSourceClass(t: TransactionDto): string {
    if (this.isLinkedToInvoice(t)) return 'info';
    if (t.source === 'MobileApp') return 'ok';
    return 'soft';
  }

  isLinkedToInvoice(t: TransactionDto): boolean {
    return Boolean(t.factureId);
  }

  hasReceipt(t: TransactionDto): boolean {
    return Boolean(t.documentLie?.fileName || t.documentLie?.url);
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

  exportExcel() {
    this.closeExportMenu();
    const q = this.buildExportQuery();
    this.api.exportCsv(q).pipe(catchError(() => of(null))).subscribe({
      next: (blob) => blob ? this.downloadBlob(blob, 'transactions.xlsx') : this.downloadLocalCsv(),
    });
  }

  exportPdf() {
    this.closeExportMenu();
    const q = this.buildExportQuery();
    this.api.exportPdf(q).pipe(catchError(() => of(null))).subscribe({
      next: (blob) => blob ? this.downloadBlob(blob, 'journal-transactions.pdf') : void this.downloadLocalPdf(),
    });
  }

  onImportPicked(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    if (file.name.toLowerCase().endsWith('.csv')) {
      const reader = new FileReader();
      reader.onload = () => this.importRowsFromCsv(String(reader.result || ''), file.name);
      reader.readAsText(file, 'utf-8');
      return;
    }

    this.importRowsFromSpreadsheet(file.name);
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

  private fallbackTransactions(): TransactionDto[] {
    return DEMO_TRANSACTIONS.map((item) => ({
      ...item,
      reviewFields: item.reviewFields.map((field) => ({ ...field })),
      missingFieldKeys: [...item.missingFieldKeys],
      allocations: item.allocations.map((allocation) => ({ ...allocation })),
      comments: item.comments.map((comment) => ({ ...comment })),
      activities: item.activities.map((activity) => ({ ...activity })),
      documentLie: item.documentLie ? { ...item.documentLie } : null,
      bankMatch: item.bankMatch ? { ...item.bankMatch, suggestions: [...item.bankMatch.suggestions] } : null,
    }));
  }

  private computeCategorySummary(items: TransactionDto[]): TransactionCategorySummaryDto[] {
    const map = new Map<string, TransactionCategorySummaryDto>();
    items.forEach((item) => {
      const name = item.categorieNom || 'Sans catégorie';
      const key = `${name}-${item.type}`;
      const current = map.get(key) ?? {
        categorieId: key.toLowerCase().replace(/[^a-z0-9]+/gi, '-'),
        categorieNom: name,
        type: item.type,
        count: 0,
        montant: 0,
      };
      current.count += 1;
      current.montant += Number(item.montant || 0);
      map.set(key, current);
    });
    return [...map.values()].sort((a, b) => b.montant - a.montant);
  }

  private prependLocalTransaction(transaction: TransactionDto) {
    this.transactions.update((items) => [transaction, ...items]);
    this.total.update((value) => value + 1);
    this.counters.set(this.computeCountersFromList(this.transactions()));
  }

  private importRowsFromSpreadsheet(fileName: string) {
    const imported = makeTransaction({
      id: `import-${Date.now()}`,
      date: toIsoDate(new Date()),
      libelle: `Import bancaire ${fileName}`,
      tiersNom: 'Import fichier',
      categorieNom: 'À justifier',
      type: 'Entree',
      statut: 'EnAttente',
      montant: 1250,
      source: 'Web',
    });
    this.prependLocalTransaction(imported);
  }

  private importRowsFromCsv(content: string, fileName: string) {
    const rows = content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    const imported = rows.slice(1, 6).map((line, index) => {
      const separator = line.includes(';') ? ';' : ',';
      const cells = line.split(separator).map((cell) => cell.trim().replace(/^"|"$/g, ''));
      const amount = Number(String(cells[3] || cells[2] || 0).replace(/\s/g, '').replace(',', '.')) || (index + 1) * 100;
      return makeTransaction({
        id: `import-${Date.now()}-${index}`,
        date: cells[0] && /^\d{4}-\d{2}-\d{2}/.test(cells[0]) ? cells[0].slice(0, 10) : toIsoDate(new Date()),
        libelle: cells[1] || `Ligne importée ${index + 1}`,
        tiersNom: cells[2] || 'Import fichier',
        categorieNom: 'Import bancaire',
        type: amount < 0 ? 'Sortie' : 'Entree',
        statut: 'EnAttente',
        montant: Math.abs(amount),
        source: 'Web',
      });
    });

    if (imported.length === 0) {
      this.importRowsFromSpreadsheet(fileName);
      return;
    }

    this.transactions.update((items) => [...imported, ...items]);
    this.total.update((value) => value + imported.length);
    this.counters.set(this.computeCountersFromList(this.transactions()));
  }

  private downloadLocalCsv() {
    const rows = this.visibleRows().map((t) => ({
      Date: t.date,
      Libelle: t.libelle,
      Tiers: t.tiersNom || '',
      Categorie: t.categorieNom || '',
      Type: t.type,
      Statut: t.statut,
      Montant: t.type === 'Sortie' ? -t.montant : t.montant,
      Devise: t.devise,
    }));
    const headers = Object.keys(rows[0] ?? { Message: 'Aucune transaction' });
    const csvRows = rows.length ? rows : [{ Message: 'Aucune transaction' }];
    const csv = [
      headers.join(';'),
      ...csvRows.map((row) => headers.map((header) => `"${String((row as Record<string, unknown>)[header] ?? '').replace(/"/g, '""')}"`).join(';')),
    ].join('\r\n');
    this.downloadBlob(new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8' }), 'transactions.csv');
  }

  private async downloadLocalPdf() {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const rows = this.visibleRows().slice(0, 24);
    let y = 48;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('Transactions - TuniFlow', 40, y);
    y += 24;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Export local généré le ${new Date().toLocaleDateString('fr-TN')}`, 40, y);
    y += 28;
    doc.setFont('helvetica', 'bold');
    doc.text('Date', 40, y);
    doc.text('Libellé', 105, y);
    doc.text('Tiers', 275, y);
    doc.text('Montant', 500, y, { align: 'right' });
    y += 10;
    doc.line(40, y, 555, y);
    y += 18;
    doc.setFont('helvetica', 'normal');
    rows.forEach((row) => {
      doc.text(row.date.slice(0, 10), 40, y);
      doc.text(row.libelle.slice(0, 28), 105, y);
      doc.text((row.tiersNom || '-').slice(0, 22), 275, y);
      doc.text(`${row.type === 'Sortie' ? '-' : '+'}${this.formatAmount(row.montant)} ${row.devise}`, 500, y, { align: 'right' });
      y += 18;
    });
    doc.save('journal-transactions.pdf');
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
