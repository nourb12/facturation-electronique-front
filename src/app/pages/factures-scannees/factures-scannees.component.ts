import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { catchError, of } from 'rxjs';

import { TransactionApiService } from '../../core/services/transaction-api.service';
import { SignatureApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { TransactionDto } from '../../core/models/transaction.model';

type UiTypeFilter = 'All' | string;

@Component({
  selector: 'app-factures-scannees',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, DecimalPipe, DatePipe],
  templateUrl: './factures-scannees.component.html',
  styleUrls: ['./factures-scannees.component.scss'],
})
export class FacturesScanneesComponent implements OnInit {
  private readonly api = inject(TransactionApiService);
  private readonly signatureSvc = inject(SignatureApiService);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);

  readonly Math = Math;

  loading = signal(true);
  actionLoading = signal<string | null>(null);

  rows = signal<TransactionDto[]>([]);
  total = signal(0);
  page = signal(1);
  readonly parPage = 20;

  search = signal('');
  typeFilter = signal<UiTypeFilter>('All');

  readonly typeOptions = computed(() => {
    const set = new Set<string>();
    for (const t of this.rows()) {
      const v = (t.documentType ?? '').trim();
      if (v) set.add(v);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  });

  readonly visibleRows = computed(() => {
    const q = this.search().trim().toLowerCase();
    const type = this.typeFilter();

    return this.rows().filter((t) => {
      if (type !== 'All' && (t.documentType ?? '') !== type) return false;
      if (!q) return true;
      const hay = [
        t.libelle,
        t.tiersNom ?? '',
        t.documentType ?? '',
        t.date ?? '',
        t.documentLie?.fileName ?? '',
      ].join(' ').toLowerCase();
      return hay.includes(q);
    });
  });

  ngOnInit(): void {
    this.load();
  }

  load() {
    this.loading.set(true);
    const query = {
      page: this.page(),
      parPage: this.parPage,
      source: 'MobileApp' as const,
      recherche: this.search() || undefined,
    };

    this.api.pendingReview(query).pipe(
      catchError(() =>
        of({
          items: [],
          total: 0,
          page: this.page(),
          parPage: this.parPage,
        })
      )
    ).subscribe({
      next: (res) => {
        this.rows.set(res.items ?? []);
        this.total.set(res.total ?? 0);
        this.loading.set(false);
      },
      error: () => {
        this.rows.set([]);
        this.total.set(0);
        this.loading.set(false);
      },
    });
  }

  onFilterChange() {
    // Keep server paging stable; client-side filtering is applied in visibleRows().
    // When the user searches, reload to leverage server-side search if supported.
    this.page.set(1);
    this.load();
  }

  prevPage() {
    if (this.page() <= 1) return;
    this.page.update((p) => p - 1);
    this.load();
  }

  nextPage() {
    const next = this.page() + 1;
    const maxPage = Math.max(1, Math.ceil((this.total() || 0) / this.parPage));
    if (next > maxPage) return;
    this.page.set(next);
    this.load();
  }

  openDocument(t: TransactionDto) {
    const url = t.documentLie?.url;
    if (!url) return;
    window.open(url, '_blank', 'noopener');
  }

  isImageDocument(t: TransactionDto): boolean {
    const url = (t.documentLie?.url ?? '').toLowerCase();
    const type = (t.documentLie?.contentType ?? '').toLowerCase();
    return type.startsWith('image/')
      || url.endsWith('.png')
      || url.endsWith('.jpg')
      || url.endsWith('.jpeg')
      || url.endsWith('.webp');
  }

  isPdfDocument(t: TransactionDto): boolean {
    const url = (t.documentLie?.url ?? '').toLowerCase();
    const type = (t.documentLie?.contentType ?? '').toLowerCase();
    return type.includes('pdf') || url.endsWith('.pdf');
  }

  canSign(t: TransactionDto): boolean {
    return !!t.factureId;
  }

  signer(t: TransactionDto) {
    if (!t.factureId || this.actionLoading()) return;
    this.actionLoading.set(t.id);
    this.signatureSvc.demander(t.factureId).subscribe({
      next: (sig) => {
        this.actionLoading.set(null);
        if (sig?.statut === 'Signee') this.toast.success(this.translate.instant('SCANNED_INVOICES.ACTIONS.SIGN') + ' OK');
        else this.toast.info(this.translate.instant('SCANNED_INVOICES.ACTIONS.SIGN') + ' : ' + (sig?.messageErreur ?? ''));
      },
      error: (err) => {
        this.actionLoading.set(null);
        this.toast.error(err?.error?.message ?? 'Erreur signature.');
      },
    });
  }

  confirmer(t: TransactionDto) {
    if (this.actionLoading()) return;
    this.actionLoading.set(t.id);
    this.api.approveExpense(t.id).subscribe({
      next: () => {
        this.actionLoading.set(null);
        this.toast.success(this.translate.instant('SCANNED_INVOICES.ACTIONS.CONFIRM'));
        this.load();
      },
      error: (err) => {
        this.actionLoading.set(null);
        this.toast.error(err?.error?.message ?? 'Erreur validation.');
      },
    });
  }

  formatAmount(v: number): string {
    return new Intl.NumberFormat('fr-TN', { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(v ?? 0);
  }

  formatConfidence(v?: number | null): string {
    const n = typeof v === 'number' ? v : 0;
    return `${Math.round(n * 100)}%`;
  }
}
