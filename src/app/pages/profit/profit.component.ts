import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FactureApiService, FactureDto } from '../../core/services/api.service';

type ProfitView = 'documents' | 'deals';
type ProfitPeriod = 'mois' | 'trimestre' | 'annee' | 'tout';
type RiskLevel = 'ok' | 'watch' | 'risk';

interface ProfitRow {
  id: string;
  numero: string;
  client: string;
  deal: string;
  date: string;
  statut: string;
  devise: string;
  revenue: number;
  tax: number;
  withholding: number;
  directCost: number;
  variableCost: number;
  fixedCost: number;
  totalCost: number;
  grossMargin: number;
  netProfit: number;
  marginRate: number;
  risk: RiskLevel;
}

interface DealRow {
  key: string;
  label: string;
  client: string;
  documents: number;
  revenue: number;
  tax: number;
  totalCost: number;
  netProfit: number;
  marginRate: number;
  risk: RiskLevel;
}

const DEMO_PROFIT_FACTURES: FactureDto[] = [
  {
    id: 'PROFIT-1', numero: 'FAC-2026-1180', clientId: 'CL-1', clientNom: 'STE GreenTech',
    clientMatriculeFiscal: '1234567A/B/C/000', reference: 'DEAL-GREEN-ERP', statut: 'Payee',
    typeFacture: 'Facture', modePaiement: 'Virement', devise: 'TND',
    dateEmission: '2026-05-03T09:00:00', dateEcheance: '2026-06-02T09:00:00', datePaiement: '2026-05-10T09:00:00',
    totalHt: 18600, totalTva: 3534, totalTtc: 22135, appliquerRS: true, codeRS: 'RS-1.5', tauxRS: 1.5,
    baseRS: 18600, montantRS: 279, netAPayer: 21856, montantPaye: 21856, montantRestant: 0,
    estEnRetard: false, xmlGenere: true, versionTeif: 'v1.8.8', lignes: [], historique: [], creeLe: '2026-05-03', modifieLe: '2026-05-10'
  },
  {
    id: 'PROFIT-2', numero: 'FAC-2026-1181', clientId: 'CL-2', clientNom: 'Banque BIAT',
    clientMatriculeFiscal: '7654321B/C/D/000', reference: 'DEAL-BIAT-SUPPORT', statut: 'Acceptee',
    typeFacture: 'Facture', modePaiement: 'Virement', devise: 'TND',
    dateEmission: '2026-05-06T09:00:00', dateEcheance: '2026-06-05T09:00:00',
    totalHt: 9200, totalTva: 1748, totalTtc: 10948, appliquerRS: false, tauxRS: 0,
    baseRS: 0, montantRS: 0, netAPayer: 10948, montantPaye: 0, montantRestant: 10948,
    estEnRetard: false, xmlGenere: true, versionTeif: 'v1.8.8', lignes: [], historique: [], creeLe: '2026-05-06', modifieLe: '2026-05-06'
  },
  {
    id: 'PROFIT-3', numero: 'FAC-2026-1182', clientId: 'CL-3', clientNom: 'Societe OneTel',
    clientMatriculeFiscal: '2468135E/F/G/000', reference: 'DEAL-ONETEL-OCR', statut: 'Transmise',
    typeFacture: 'Facture', modePaiement: 'Cheque', devise: 'TND',
    dateEmission: '2026-05-09T09:00:00', dateEcheance: '2026-06-08T09:00:00',
    totalHt: 5400, totalTva: 1026, totalTtc: 6426, appliquerRS: false, tauxRS: 0,
    baseRS: 0, montantRS: 0, netAPayer: 6426, montantPaye: 0, montantRestant: 6426,
    estEnRetard: false, xmlGenere: true, versionTeif: 'v1.8.8', lignes: [], historique: [], creeLe: '2026-05-09', modifieLe: '2026-05-09'
  },
  {
    id: 'PROFIT-4', numero: 'FAC-2026-1183', clientId: 'CL-4', clientNom: 'SARL MedCare',
    clientMatriculeFiscal: '1357924H/I/J/000', reference: 'DEAL-MEDCARE-TEIF', statut: 'Validee',
    typeFacture: 'Facture', modePaiement: 'Virement', devise: 'TND',
    dateEmission: '2026-05-12T09:00:00', dateEcheance: '2026-06-11T09:00:00',
    totalHt: 3180, totalTva: 604.2, totalTtc: 3784.2, appliquerRS: true, codeRS: 'RS-1.5', tauxRS: 1.5,
    baseRS: 3180, montantRS: 47.7, netAPayer: 3736.5, montantPaye: 0, montantRestant: 3736.5,
    estEnRetard: false, xmlGenere: false, lignes: [], historique: [], creeLe: '2026-05-12', modifieLe: '2026-05-12'
  }
];

@Component({
  selector: 'app-profit',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, DecimalPipe],
  templateUrl: './profit.component.html',
  styleUrls: ['./profit.component.scss']
})
export class ProfitComponent implements OnInit {
  private factureSvc = inject(FactureApiService);

  loading = signal(true);
  error = signal<string | null>(null);
  factures = signal<FactureDto[]>([]);

  view = signal<ProfitView>('documents');
  period = signal<ProfitPeriod>('tout');
  search = signal('');

  directCostRate = signal(58);
  variableFeeRate = signal(4.5);
  fixedCostPerDocument = signal(35);
  warningMarginRate = signal(18);

  readonly presets = [
    { label: 'Service', direct: 38, variable: 4, fixed: 25 },
    { label: 'Négoce', direct: 68, variable: 3.5, fixed: 45 },
    { label: 'Projet', direct: 52, variable: 6, fixed: 120 }
  ];

  rows = computed<ProfitRow[]>(() => {
    const minDate = this.periodStart();
    const q = this.search().trim().toLowerCase();
    return this.factures()
      .filter(f => Number(f.totalHt ?? 0) > 0)
      .filter(f => !minDate || new Date(f.dateEmission) >= minDate)
      .filter(f => {
        if (!q) return true;
        return [
          f.numero,
          f.clientNom,
          f.reference,
          f.statut,
          f.typeFacture
        ].some(v => (v ?? '').toLowerCase().includes(q));
      })
      .map(f => this.toProfitRow(f))
      .sort((a, b) => b.netProfit - a.netProfit);
  });

  deals = computed<DealRow[]>(() => {
    const map = new Map<string, DealRow>();
    for (const row of this.rows()) {
      const key = `${row.client}::${row.deal}`;
      const existing = map.get(key) ?? {
        key,
        label: row.deal,
        client: row.client,
        documents: 0,
        revenue: 0,
        tax: 0,
        totalCost: 0,
        netProfit: 0,
        marginRate: 0,
        risk: 'ok' as RiskLevel
      };
      existing.documents += 1;
      existing.revenue += row.revenue;
      existing.tax += row.tax;
      existing.totalCost += row.totalCost;
      existing.netProfit += row.netProfit;
      existing.marginRate = existing.revenue > 0 ? existing.netProfit / existing.revenue * 100 : 0;
      existing.risk = this.riskFor(existing.marginRate, existing.netProfit);
      map.set(key, existing);
    }
    return Array.from(map.values()).sort((a, b) => b.netProfit - a.netProfit);
  });

  summary = computed(() => {
    const rows = this.rows();
    const revenue = this.sum(rows, 'revenue');
    const tax = this.sum(rows, 'tax');
    const withholding = this.sum(rows, 'withholding');
    const cost = this.sum(rows, 'totalCost');
    const netProfit = this.sum(rows, 'netProfit');
    const marginRate = revenue > 0 ? netProfit / revenue * 100 : 0;
    const riskCount = rows.filter(r => r.risk === 'risk').length;
    return {
      revenue,
      tax,
      withholding,
      cost,
      netProfit,
      marginRate,
      riskCount,
      documents: rows.length,
      breakEven: this.breakEvenRevenue()
    };
  });

  topClients = computed(() => {
    const map = new Map<string, { client: string; revenue: number; profit: number }>();
    for (const row of this.rows()) {
      const current = map.get(row.client) ?? { client: row.client, revenue: 0, profit: 0 };
      current.revenue += row.revenue;
      current.profit += row.netProfit;
      map.set(row.client, current);
    }
    return Array.from(map.values()).sort((a, b) => b.profit - a.profit).slice(0, 5);
  });

  ngOnInit(): void {
    this.loadFactures();
  }

  loadFactures(): void {
    this.loading.set(true);
    this.error.set(null);
    this.factureSvc.lister({ page: 1, parPage: 500 }).subscribe({
      next: res => {
        const items = res.items ?? [];
        const rentableItems = items.filter(f => Number(f.totalHt ?? 0) > 0);
        this.factures.set(rentableItems.length ? rentableItems : DEMO_PROFIT_FACTURES);
        this.loading.set(false);
      },
      error: () => {
        this.factures.set(DEMO_PROFIT_FACTURES);
        this.loading.set(false);
      }
    });
  }

  setPreset(preset: { direct: number; variable: number; fixed: number }): void {
    this.directCostRate.set(preset.direct);
    this.variableFeeRate.set(preset.variable);
    this.fixedCostPerDocument.set(preset.fixed);
  }

  exportCsv(): void {
    const rows = this.view() === 'documents'
      ? this.rows().map(r => ({
        Type: 'Document',
        Reference: r.numero,
        Client: r.client,
        Deal: r.deal,
        CA_HT: r.revenue,
        TVA: r.tax,
        Cout_Total: r.totalCost,
        Profit_Net: r.netProfit,
        Marge: `${r.marginRate.toFixed(2)}%`,
        Risque: r.risk
      }))
      : this.deals().map(r => ({
        Type: 'Deal',
        Reference: r.label,
        Client: r.client,
        Documents: r.documents,
        CA_HT: r.revenue,
        TVA: r.tax,
        Cout_Total: r.totalCost,
        Profit_Net: r.netProfit,
        Marge: `${r.marginRate.toFixed(2)}%`,
        Risque: r.risk
      }));

    const headers = Object.keys(rows[0] ?? { Reference: '', Client: '', CA_HT: '', Profit_Net: '' });
    const body = rows.map(row => headers.map(h => `"${String((row as any)[h] ?? '').replace(/"/g, '""')}"`).join(';'));
    const csv = [headers.join(';'), ...body].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `profit-${this.view()}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  money(value: number, devise = 'TND'): string {
    return new Intl.NumberFormat('fr-TN', {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3
    }).format(value || 0) + ` ${devise}`;
  }

  riskLabel(risk: RiskLevel): string {
    if (risk === 'risk') return 'À risque';
    if (risk === 'watch') return 'À surveiller';
    return 'Rentable';
  }

  private toProfitRow(f: FactureDto): ProfitRow {
    const revenue = Math.max(0, Number(f.totalHt ?? 0));
    const tax = Math.max(0, Number(f.totalTva ?? 0));
    const withholding = Math.max(0, Number(f.montantRS ?? 0));
    const directCost = revenue * this.directCostRate() / 100;
    const variableCost = revenue * this.variableFeeRate() / 100;
    const fixedCost = Math.max(0, this.fixedCostPerDocument());
    const totalCost = directCost + variableCost + fixedCost;
    const grossMargin = revenue - directCost;
    const netProfit = revenue - totalCost;
    const marginRate = revenue > 0 ? netProfit / revenue * 100 : 0;
    return {
      id: f.id,
      numero: f.numero,
      client: f.clientNom || 'Client non renseigné',
      deal: this.dealLabel(f),
      date: f.dateEmission,
      statut: f.statut,
      devise: f.devise || 'TND',
      revenue,
      tax,
      withholding,
      directCost,
      variableCost,
      fixedCost,
      totalCost,
      grossMargin,
      netProfit,
      marginRate,
      risk: this.riskFor(marginRate, netProfit)
    };
  }

  private dealLabel(f: FactureDto): string {
    if (f.reference?.trim()) return f.reference.trim();
    const d = new Date(f.dateEmission);
    const month = Number.isNaN(d.getTime()) ? 'période' : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    return `${f.clientNom || 'Deal'} / ${month}`;
  }

  private riskFor(marginRate: number, profit: number): RiskLevel {
    if (profit < 0 || marginRate < this.warningMarginRate() * .65) return 'risk';
    if (marginRate < this.warningMarginRate()) return 'watch';
    return 'ok';
  }

  private periodStart(): Date | null {
    const now = new Date();
    if (this.period() === 'tout') return null;
    if (this.period() === 'mois') return new Date(now.getFullYear(), now.getMonth(), 1);
    if (this.period() === 'trimestre') return new Date(now.getFullYear(), now.getMonth() - 2, 1);
    return new Date(now.getFullYear(), 0, 1);
  }

  private breakEvenRevenue(): number {
    const variableRatio = (this.directCostRate() + this.variableFeeRate()) / 100;
    return variableRatio >= 1 ? 0 : this.fixedCostPerDocument() / (1 - variableRatio);
  }

  private sum(rows: ProfitRow[], key: keyof Pick<ProfitRow, 'revenue' | 'tax' | 'withholding' | 'totalCost' | 'netProfit'>): number {
    return rows.reduce((acc, row) => acc + Number(row[key] ?? 0), 0);
  }
}
