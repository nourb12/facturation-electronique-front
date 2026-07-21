import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { COMPTES } from '../../../core/constants/pcg.constants';
import { ComptabiliteApiService, ComptabilitePayload } from '../../../core/services/api.service';

@Component({
  selector: 'app-retenue-source',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="fiscal-page">
      <header class="page-header">
        <div>
          <p class="eyebrow">Comptabilité fiscale</p>
          <h1>Bordereau retenue à la source</h1>
          <span>État 257 / modèle 41 à reverser avant le 28</span>
        </div>

        <nav class="header-actions">
          <a class="btn-secondary" routerLink="/comptabilite/etats">
            <i class="ti ti-report"></i>
            États
          </a>
          <button class="btn-secondary" type="button" (click)="exportPdf()">
            <i class="ti ti-file-type-pdf"></i>
            PDF état 257
          </button>
          <button class="btn-primary" type="button" (click)="paid.set(true)">
            <i class="ti ti-check"></i>
            Marquer reversée
          </button>
        </nav>
      </header>

      <div class="kpis">
        <article>
          <span>Total brut</span>
          <strong>{{ money(totalBrut()) }}</strong>
        </article>
        <article>
          <span>Total RS</span>
          <strong>{{ money(totalRs()) }}</strong>
        </article>
        <article>
          <span>Échéance</span>
          <strong>28/06/2026</strong>
        </article>
        <article [class.done]="paid()">
          <span>Statut</span>
          <strong>{{ paid() ? 'Reversée' : 'À reverser' }}</strong>
        </article>
      </div>

      <section class="panel">
        <div class="panel-head">
          <div>
            <h2>Détail fournisseur / client</h2>
            <p>Base imposable, taux appliqué et montant de retenue à reverser.</p>
          </div>
          <span>{{ rows().length }} lignes</span>
        </div>

        <div class="responsive-table">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Pièce</th>
                <th>Tiers</th>
                <th>Matricule fiscal</th>
                <th>Brut</th>
                <th>Taux</th>
                <th>RS</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let row of rows()">
                <td class="mono">{{ row.date }}</td>
                <td class="mono">{{ row.piece }}</td>
                <td>{{ row.tiers }}</td>
                <td class="mono">{{ row.matricule }}</td>
                <td class="money">{{ money(row.brut) }}</td>
                <td class="mono">{{ row.taux }}%</td>
                <td class="money">{{ money(row.rs) }}</td>
              </tr>
              <tr *ngIf="rows().length === 0">
                <td class="empty-cell" colspan="7">Aucune retenue à la source à reverser.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </section>
  `,
  styles: [`
    .fiscal-page {
      min-height: 100vh;
      padding: 28px 32px 40px;
      background: var(--bg-void);
      color: var(--tp);
      font-family: 'DM Sans', sans-serif;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      align-items: flex-start;
      margin-bottom: 20px;
      padding: 18px 20px;
      border: 1px solid var(--b1);
      border-radius: 16px;
      background: var(--bg-card);
      box-shadow: var(--shadow-sm);
    }

    .eyebrow {
      margin: 0 0 6px;
      color: var(--tt);
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: .08em;
    }

    h1 {
      margin: 0;
      color: var(--tp);
      font-size: 24px;
      font-weight: 800;
      letter-spacing: -.02em;
      line-height: 1.15;
    }

    .page-header span {
      display: block;
      margin-top: 8px;
      color: var(--ts);
      font-size: 13px;
      line-height: 1.5;
    }

    .header-actions,
    .panel-head {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }

    .btn-secondary,
    .btn-primary {
      min-height: 36px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 7px;
      padding: 0 13px;
      border-radius: 10px;
      font-family: 'DM Sans', sans-serif;
      font-size: 12.5px;
      font-weight: 700;
      text-decoration: none;
      cursor: pointer;
      transition: background .16s ease, border-color .16s ease, color .16s ease, transform .16s ease;
    }

    .btn-secondary {
      border: 1px solid var(--b1);
      background: var(--bg-card);
      color: var(--tp);
    }

    .btn-primary {
      border: 1px solid rgba(255, 230, 0, .55);
      background: #FFE600;
      color: #111827;
    }

    .btn-secondary:hover,
    .btn-primary:hover {
      transform: translateY(-1px);
      border-color: rgba(255, 230, 0, .45);
    }

    .kpis {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 14px;
      margin-bottom: 18px;
    }

    .kpis article,
    .panel {
      border: 1px solid var(--b1);
      border-radius: 16px;
      background: var(--bg-card);
      box-shadow: var(--shadow-sm);
    }

    .kpis article {
      padding: 16px 18px;
    }

    .kpis span {
      display: block;
      color: var(--ts);
      font-size: 12px;
      font-weight: 700;
    }

    .kpis strong {
      display: block;
      margin-top: 8px;
      color: var(--tp);
      font-family: var(--font-number);
      font-variant-numeric: tabular-nums;
      font-feature-settings: 'tnum' 1;
      font-size: 20px;
      font-weight: 700;
      line-height: 1.25;
    }

    .kpis article.done strong {
      color: #16A34A;
    }

    .panel {
      overflow: hidden;
    }

    .panel-head {
      justify-content: space-between;
      padding: 16px 18px;
      border-bottom: 1px solid var(--b0);
    }

    .panel h2 {
      margin: 0;
      color: var(--tp);
      font-size: 16px;
      font-weight: 800;
      letter-spacing: -.01em;
    }

    .panel-head p {
      margin: 4px 0 0;
      color: var(--ts);
      font-size: 12.5px;
      line-height: 1.45;
    }

    .panel-head > span {
      color: var(--ts);
      font-size: 12.5px;
      font-weight: 700;
    }

    .responsive-table {
      width: 100%;
      overflow: auto;
    }

    table {
      width: 100%;
      min-width: 860px;
      border-collapse: collapse;
    }

    th,
    td {
      padding: 13px 16px;
      border-bottom: 1px solid var(--b0);
      text-align: left;
      vertical-align: middle;
      font-size: 13px;
    }

    th {
      color: var(--ts);
      background: var(--bg-edge);
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: .06em;
    }

    th:not(:last-child),
    td:not(:last-child) {
      border-right: 1px solid var(--b0);
    }

    tbody tr:hover {
      background: var(--bg-ghost);
    }

    .mono {
      font-family: 'JetBrains Mono', monospace;
    }

    .money {
      font-family: var(--font-number);
      font-variant-numeric: tabular-nums;
      font-feature-settings: 'tnum' 1;
      text-align: right;
      white-space: nowrap;
      font-weight: 700;
    }

    .empty-cell {
      padding: 28px 16px;
      color: var(--ts);
      text-align: center;
    }

    @media (max-width: 900px) {
      .fiscal-page { padding: 20px 16px 32px; }
      .page-header { flex-direction: column; }
      .header-actions { width: 100%; }
      .btn-secondary, .btn-primary { flex: 1 1 auto; }
      .kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }

    @media (max-width: 560px) {
      .kpis { grid-template-columns: 1fr; }
    }
  `]
})
export class RetenueSourceComponent {
  private api = inject(ComptabiliteApiService);
  data = signal<Partial<ComptabilitePayload>>({});
  paid = signal(false);
  rows = computed(() => {
    const ecritures = this.data().ecritures ?? [];
    return ecritures
      .filter((e: any) => e.compte === COMPTES.RS_A_REVERSER)
      .map((e: any) => ({
        date: e.date,
        piece: e.piece,
        tiers: e.tiers || 'Tiers non renseigné',
        matricule: 'MF000000/A/M/000',
        brut: Number(e.debit || e.credit || 0) / 0.015,
        taux: 1.5,
        rs: Number(e.debit || e.credit || 0)
      }));
  });
  totalBrut = computed(() => this.rows().reduce((sum, row) => sum + row.brut, 0));
  totalRs = computed(() => this.rows().reduce((sum, row) => sum + row.rs, 0));

  ngOnInit() {
    this.api.dashboard().subscribe({
      next: data => this.data.set(data),
      error: () => this.data.set({ ecritures: [] })
    });
  }

  money(value: number) {
    return `${Number(value || 0).toLocaleString('fr-TN', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} TND`;
  }

  async exportPdf() {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text('Bordereau retenue à la source - État 257', 40, 44);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    let y = 82;
    this.rows().forEach(row => {
      doc.text(`${row.date} ${row.piece} ${row.tiers} RS ${this.money(row.rs)}`, 40, y);
      y += 18;
    });
    doc.setFont('helvetica', 'bold');
    doc.text(`Total RS à reverser : ${this.money(this.totalRs())}`, 40, y + 12);
    doc.save('bordereau_rs_etat_257.pdf');
  }
}
