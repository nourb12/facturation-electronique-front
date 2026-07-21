import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { COMPTES } from '../../../../core/constants/pcg.constants';
import { ComptabiliteApiService, ComptabilitePayload } from '../../../../core/services/api.service';

@Component({
  selector: 'app-declarations-tva',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="fiscal-page">
      <header class="page-header">
        <div>
          <p class="eyebrow">Comptabilité fiscale</p>
          <h1>Déclaration TVA mensuelle</h1>
          <span>Échéance D15 avant le 28 du mois</span>
        </div>

        <nav class="header-actions">
          <a class="btn-secondary" routerLink="/comptabilite/etats">
            <i class="ti ti-report"></i>
            États
          </a>
          <button class="btn-secondary" type="button" (click)="exportPdf()">
            <i class="ti ti-file-type-pdf"></i>
            PDF DGI
          </button>
          <button class="btn-primary" type="button" (click)="markDeclared()">
            <i class="ti ti-check"></i>
            Marquer déclarée
          </button>
        </nav>
      </header>

      <div class="kpis">
        <article>
          <span>TVA collectée</span>
          <strong>{{ money(tva().collectee) }}</strong>
        </article>
        <article>
          <span>TVA déductible</span>
          <strong>{{ money(tva().deductible) }}</strong>
        </article>
        <article>
          <span>TVA nette</span>
          <strong>{{ money(tva().nette) }}</strong>
        </article>
        <article [class.done]="declared()">
          <span>Statut</span>
          <strong>{{ declared() ? 'Déclarée' : 'À déclarer' }}</strong>
        </article>
      </div>

      <section class="panel">
        <div class="panel-head">
          <div>
            <h2>TVA par taux</h2>
            <p>Base hors taxe et TVA collectée par taux applicable.</p>
          </div>
          <span>{{ tva().deadline }}</span>
        </div>

        <div class="responsive-table">
          <table>
            <thead>
              <tr>
                <th>Taux</th>
                <th>Base HT</th>
                <th>TVA collectée</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="mono">19%</td>
                <td class="money">{{ money(tva().base19) }}</td>
                <td class="money">{{ money(tva().collectee) }}</td>
              </tr>
              <tr>
                <td class="mono">13%</td>
                <td class="money">{{ money(0) }}</td>
                <td class="money">{{ money(0) }}</td>
              </tr>
              <tr>
                <td class="mono">7%</td>
                <td class="money">{{ money(0) }}</td>
                <td class="money">{{ money(0) }}</td>
              </tr>
              <tr>
                <td class="mono">0%</td>
                <td class="money">{{ money(0) }}</td>
                <td class="money">{{ money(0) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="panel">
        <div class="panel-head">
          <div>
            <h2>Historique</h2>
            <p>Suivi des déclarations mensuelles et de leur statut.</p>
          </div>
          <span>2026</span>
        </div>

        <div class="responsive-table">
          <table>
            <thead>
              <tr>
                <th>Période</th>
                <th>Montant</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Mai 2026</td>
                <td class="money">{{ money(tva().nette) }}</td>
                <td><span class="status-chip" [class.done]="declared()">{{ declared() ? 'Déclarée' : 'À déclarer' }}</span></td>
              </tr>
              <tr>
                <td>Avril 2026</td>
                <td class="money">{{ money(4820.400) }}</td>
                <td><span class="status-chip done">Payée</span></td>
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
      margin-bottom: 18px;
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
      min-width: 720px;
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

    .status-chip {
      display: inline-flex;
      align-items: center;
      min-height: 28px;
      padding: 0 10px;
      border-radius: 999px;
      background: rgba(245, 158, 11, .12);
      color: #B45309;
      font-size: 12px;
      font-weight: 800;
    }

    .status-chip.done {
      background: rgba(34, 197, 94, .12);
      color: #16A34A;
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
export class DeclarationsTvaComponent {
  private api = inject(ComptabiliteApiService);
  data = signal<Partial<ComptabilitePayload>>({});
  declared = signal(false);

  tva = computed(() => {
    const balance = this.data().balance ?? [];
    const collectee = Number(balance.find((b: any) => b.compte === COMPTES.TVA_COLLECTEE)?.credit || 0);
    const deductible = Number(balance.find((b: any) => b.compte === COMPTES.TVA_DEDUCTIBLE)?.debit || 0);
    return {
      collectee,
      deductible,
      nette: Math.max(0, collectee - deductible),
      base19: collectee / 0.19,
      deadline: '28/06/2026'
    };
  });

  ngOnInit() {
    this.api.dashboard().subscribe({
      next: data => this.data.set(data),
      error: () => this.data.set({ balance: [] })
    });
  }

  money(value: number) {
    return `${Number(value || 0).toLocaleString('fr-TN', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} TND`;
  }

  markDeclared() {
    this.declared.set(true);
  }

  async exportPdf() {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text('Déclaration TVA mensuelle D15', 40, 44);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text(`TVA collectée : ${this.money(this.tva().collectee)}`, 40, 82);
    doc.text(`TVA déductible : ${this.money(this.tva().deductible)}`, 40, 104);
    doc.text(`TVA nette à payer : ${this.money(this.tva().nette)}`, 40, 126);
    doc.text(`Échéance : ${this.tva().deadline}`, 40, 148);
    doc.save('declaration_tva_d15.pdf');
  }
}
