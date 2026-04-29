import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { trigger, transition, style, animate } from '@angular/animations';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { TransactionApiService } from '../../core/services/transaction-api.service';
import {
  ReceiptStatus,
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
  // YYYY-MM-DD
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

  activeTab = signal<UiTab>('all');
  loading = signal(true);

  showExportMenu = signal(false);

  // Data
  transactions = signal<TransactionDto[]>([]);
  total = signal(0);
  page = signal(1);
  readonly parPage = 20;

  counters = signal<TransactionCountersDto>(ZERO_COUNTERS);
  categorySummary = signal<TransactionCategorySummaryDto[]>([]);

  // Filters
  search = signal('');
  status = signal<UiStatus>('All');
  type = signal<UiType>('All');
  period = signal<PeriodPreset>('Month');
  from = signal<string>(''); // YYYY-MM-DD
  to = signal<string>('');   // YYYY-MM-DD

  // Selection / bulk
  selectedIds = signal<string[]>([]);
  selectedCount = computed(() => this.selectedIds().length);
  allVisibleSelected = computed(() => {
    const ids = new Set(this.selectedIds());
    const list = this.visibleRows();
    return list.length > 0 && list.every((t) => ids.has(t.id));
  });

  // Detail modal
  showDetail = signal(false);
  detailTab = signal<'receipt' | 'analytics' | 'comments'>('receipt');
  activeTransaction = signal<TransactionDto | null>(null);

  // Create modal (simple but useful)
  showCreate = signal(false);
  createMode = signal<'one' | 'recurrent'>('one');
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

  // Receipt upload
  receiptDragging = signal(false);
  receiptStatusOptions: ReceiptStatus[] = ['Facultatif', 'Perdu', 'Present'];

  // Derived list (server already filters, but we still keep a safety filter on client)
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

        if (counters) this.counters.set(counters);
        else this.counters.set(this.computeCountersFromList(list.items ?? []));

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

  // Bulk selection helpers
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

  // Click row
  openDetail(t: TransactionDto) {
    this.activeTransaction.set(t);
    this.detailTab.set('receipt');
    this.showDetail.set(true);
  }
  closeDetail() {
    this.showDetail.set(false);
    this.activeTransaction.set(null);
  }

  // Create
  openCreate() {
    this.createMode.set('one');
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
    this.api.creer(f).pipe(catchError((e) => { this.createSaving.set(false); return of(null); })).subscribe({
      next: (created) => {
        this.createSaving.set(false);
        this.showCreate.set(false);
        if (created) this.load();
      }
    });
  }

  setCreateField<K extends keyof TransactionDto>(key: K, value: TransactionDto[K]) {
    this.createForm.update((v) => ({ ...v, [key]: value } as any));
  }

  // Receipt actions
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
      }
    });
  }

  setReceiptStatus(value: ReceiptStatus | null) {
    const t = this.activeTransaction();
    if (!t) return;
    const nextStatut: TransactionStatus =
      value
        ? 'Justifiee'
        : (t.documentLie || t.factureId) ? 'Justifiee' : 'NonJustifiee';

    const next = { ...t, statutJustificatif: value, statut: nextStatut };
    this.activeTransaction.set(next);
    this.api.mettreAJour(t.id, { statutJustificatif: value, statut: nextStatut } as any)
      .pipe(catchError(() => of(null)))
      .subscribe({
      next: (updated) => { if (updated) this.patchTransaction(updated); }
    });
  }

  // Exports
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

  // UI helpers
  statusClass(s: TransactionStatus): string {
    if (s === 'Justifiee') return 'ok';
    if (s === 'EnAttente') return 'warn';
    return 'err';
  }

  typeClass(t: TransactionType): string {
    return t === 'Entree' ? 'ok' : 'warn';
  }

  trStatusLabel(s: UiStatus) {
    if (s === 'All') return this.translate.instant('TRANSACTIONS.FILTERS.ALL');
    return this.translate.instant(`TRANSACTIONS.STATUS.${s.toUpperCase()}`);
  }

  trTypeLabel(t: UiType) {
    if (t === 'All') return this.translate.instant('TRANSACTIONS.FILTERS.ALL');
    return this.translate.instant(`TRANSACTIONS.TYPE.${t.toUpperCase()}`);
  }

  formatAmount(v: number): string {
    return new Intl.NumberFormat('fr-TN', { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(v ?? 0);
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

  private patchTransaction(next: TransactionDto) {
    // Update active transaction + list row in-place
    this.activeTransaction.set(next);
    this.transactions.update((list) => list.map((t) => (t.id === next.id ? next : t)));
  }
}
