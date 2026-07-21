import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ComptabiliteApiService } from '../../../core/services/api.service';

type TresorerieFlux = {
  label: string;
  debut: string;
  fin: string;
  encaissements: number;
  decaissements: number;
  net: number;
};

type TresorerieAlerte = {
  code: string;
  level: 'success' | 'warning' | 'danger' | string;
  label: string;
  montant: number;
  echeance: string;
};

type TresoreriePayload = {
  soldeBanque: number;
  soldeCaisse: number;
  encaissements30j: number;
  decaissements30j: number;
  tvaDue: number;
  rsAReverser: number;
  facturesEnRetard: number;
  flux: TresorerieFlux[];
  alertes: TresorerieAlerte[];
};

@Component({
  selector: 'app-tresorerie',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './tresorerie.component.html',
  styleUrls: ['./tresorerie.component.scss'],
})
export class TresorerieComponent {
  private api = inject(ComptabiliteApiService);

  loading = signal(true);
  data = signal<TresoreriePayload>(this.fallback());

  soldeDisponible = computed(() => this.data().soldeBanque + this.data().soldeCaisse);
  soldeProjete30j = computed(() => this.soldeDisponible() + this.data().encaissements30j - this.data().decaissements30j);
  maxFlux = computed(() => Math.max(1, ...this.data().flux.flatMap(row => [row.encaissements, row.decaissements])));
  riskLevel = computed(() => {
    if (this.soldeProjete30j() < 0) return 'danger';
    if (this.data().tvaDue + this.data().rsAReverser > this.soldeDisponible() * .35) return 'warning';
    return 'success';
  });

  ngOnInit() {
    this.api.tresorerie().subscribe({
      next: data => {
        this.data.set({ ...this.fallback(), ...data });
        this.loading.set(false);
      },
      error: () => {
        this.data.set(this.fallback());
        this.loading.set(false);
      },
    });
  }

  money(value: number): string {
    return `${Number(value || 0).toLocaleString('fr-TN', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} TND`;
  }

  pct(value: number): number {
    return Math.max(2, Math.min(100, Math.round((Math.abs(value) / this.maxFlux()) * 100)));
  }

  formatDate(value: string): string {
    if (!value) return '-';
    const [year, month, day] = value.slice(0, 10).split('-');
    return day && month && year ? `${day}/${month}/${year}` : value;
  }

  async exportPdf() {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    let y = 44;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text('Dashboard trésorerie - TuniFlow', 40, y);
    y += 30;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    [
      ['Solde banque', this.money(this.data().soldeBanque)],
      ['Solde caisse', this.money(this.data().soldeCaisse)],
      ['Encaissements prévus 30j', this.money(this.data().encaissements30j)],
      ['Décaissements prévus 30j', this.money(this.data().decaissements30j)],
      ['Solde projeté 30j', this.money(this.soldeProjete30j())],
    ].forEach(([label, value]) => {
      doc.text(`${label} : ${value}`, 40, y);
      y += 18;
    });
    y += 12;
    doc.setFont('helvetica', 'bold');
    doc.text('Flux 8 prochaines semaines', 40, y);
    y += 20;
    doc.setFont('helvetica', 'normal');
    this.data().flux.forEach(row => {
      doc.text(`${row.label} (${this.formatDate(row.debut)}-${this.formatDate(row.fin)})  +${this.money(row.encaissements)}  -${this.money(row.decaissements)}  Net ${this.money(row.net)}`, 40, y);
      y += 16;
    });
    doc.save('dashboard_tresorerie.pdf');
  }

  private fallback(): TresoreriePayload {
    return {
      soldeBanque: 40700,
      soldeCaisse: 0,
      encaissements30j: 23420.55,
      decaissements30j: 9705.4,
      tvaDue: 5630.4,
      rsAReverser: 1240,
      facturesEnRetard: 3,
      flux: [
        { label: 'S1', debut: '2026-05-14', fin: '2026-05-20', encaissements: 8400, decaissements: 2200, net: 6200 },
        { label: 'S2', debut: '2026-05-21', fin: '2026-05-27', encaissements: 5200, decaissements: 6870.4, net: -1670.4 },
        { label: 'S3', debut: '2026-05-28', fin: '2026-06-03', encaissements: 6700, decaissements: 1240, net: 5460 },
        { label: 'S4', debut: '2026-06-04', fin: '2026-06-10', encaissements: 3000, decaissements: 1800, net: 1200 },
        { label: 'S5', debut: '2026-06-11', fin: '2026-06-17', encaissements: 9100, decaissements: 2600, net: 6500 },
        { label: 'S6', debut: '2026-06-18', fin: '2026-06-24', encaissements: 4700, decaissements: 3200, net: 1500 },
        { label: 'S7', debut: '2026-06-25', fin: '2026-07-01', encaissements: 6100, decaissements: 7200, net: -1100 },
        { label: 'S8', debut: '2026-07-02', fin: '2026-07-08', encaissements: 7600, decaissements: 2100, net: 5500 },
      ],
      alertes: [
        { code: 'TVA', level: 'danger', label: 'TVA à payer', montant: 5630.4, echeance: '28/06/2026' },
        { code: 'RS', level: 'warning', label: 'RS à reverser', montant: 1240, echeance: '28/06/2026' },
        { code: 'RETARD', level: 'danger', label: 'Factures en retard', montant: 3, echeance: 'Immédiat' },
      ],
    };
  }
}
