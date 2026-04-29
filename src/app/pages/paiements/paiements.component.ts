
import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { trigger, transition, style, animate } from '@angular/animations';
import { PaiementApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-paiements',
  standalone: true,
  imports: [CommonModule, FormsModule, DecimalPipe, DatePipe],
  templateUrl: './paiements.component.html',
  styleUrls: ['./paiements.component.scss'],
  animations: [
    trigger('pageIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(8px)' }),
        animate('400ms cubic-bezier(.16,1,.3,1)', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('200ms ease', style({ opacity: 1 }))
      ]),
      transition(':leave', [
        animate('150ms ease', style({ opacity: 0 }))
      ])
    ]),
    trigger('rowIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(-8px)' }),
        animate('250ms ease', style({ opacity: 1, transform: 'translateX(0)' }))
      ])
    ])
  ]
})
export class PaiementsComponent implements OnInit {

  private svc = inject(PaiementApiService);
  readonly Math = Math;

  loading   = signal(true);
  paiements = signal<any[]>([]);
  total     = signal(0);
  totalPaye = signal(0);
  page      = signal(1);
  parPage   = 20;
  searchQuery = '';


  get nbVirements() { return this.paiements().filter(p => p.mode === 'Virement').length; }
  get nbCheques()   { return this.paiements().filter(p => p.mode === 'Cheque').length; }
  get nbEspeces()   { return this.paiements().filter(p => p.mode === 'Especes').length; }

  filteredPaiements = computed(() => {
    const q = this.searchQuery.toLowerCase();
    if (!q) return this.paiements();
    return this.paiements().filter(p =>
      p.factureNumero?.toLowerCase().includes(q) ||
      (p.reference ?? '').toLowerCase().includes(q)
    );
  });

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.svc.listerTous(this.page(), this.parPage).subscribe({
      next: (res: any) => {
        this.paiements.set(res.items ?? []);
        this.total.set(res.total ?? 0);
        this.totalPaye.set(res.totalPaye ?? 0);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  changePage(p: number) {
    this.page.set(p);
    this.load();
  }

  getModeClass(mode: string): string {
    const map: Record<string, string> = {
      Virement     : 'ok',
      Cheque       : 'info',
      Especes      : 'warn',
      CarteBancaire: 'ey',
      Traite       : 'neutral'
    };
    return map[mode] ?? 'neutral';
  }

  formatMontant(v: number): string {
    return new Intl.NumberFormat('fr-TN', {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3
    }).format(v ?? 0);
  }

  exportCSV() {
    const rows = [['Facture', 'Montant', 'Devise', 'Mode', 'Reference', 'Banque', 'Date']];
    this.paiements().forEach(p => {
      rows.push([
        p.factureNumero,
        p.montant,
        p.devise,
        p.mode,
        p.reference ?? '',
        p.banque ?? '',
        p.datePaiement?.substring(0, 10)
      ]);
    });
    const csv  = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'paiements.csv';
    a.click();
    URL.revokeObjectURL(url);
  }
}