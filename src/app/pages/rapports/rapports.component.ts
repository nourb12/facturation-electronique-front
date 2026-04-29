import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { trigger, transition, style, animate } from '@angular/animations';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import {
  DashboardApiService,
  FactureApiService,
  StatistiquesFacturesDto,
  RapportsApiService,
  TvaParTauxDto,
  DelaiPaiementClientDto,
  RecapMensuelDto
} from '../../core/services/api.service';

type EvolutionPoint = {
  mois?: string;
  label?: string;
  montantHt?: number;
  montantTtc?: number;
  montant?: number;
  total?: number;
  value?: number;
};

@Component({
  selector: 'app-rapports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './rapports.component.html',
  styleUrls: ['./rapports.component.scss'],
  animations: [
    trigger('pageIn', [transition(':enter', [
      style({ opacity: 0, transform: 'translateY(8px)' }),
      animate('380ms cubic-bezier(.16,1,.3,1)', style({ opacity: 1, transform: 'translateY(0)' }))
    ])]),
    trigger('fadeIn', [
      transition(':enter', [style({ opacity: 0 }), animate('200ms ease', style({ opacity: 1 }))]),
      transition(':leave', [animate('150ms ease', style({ opacity: 0 }))])
    ])
  ]
})
export class RapportsComponent implements OnInit {
  private dashSvc    = inject(DashboardApiService);
  private factureSvc = inject(FactureApiService);
  private rapportSvc = inject(RapportsApiService);

  loading    = signal(true);
  stats      = signal<StatistiquesFacturesDto | null>(null);
  dashboard  = signal<any>(null);
  tvaBrut    = signal<TvaParTauxDto[]>([]);
  delaisBrut = signal<DelaiPaiementClientDto[]>([]);
  recapBrut  = signal<RecapMensuelDto[]>([]);
  toast: string | null = null;

  currentMonthLabel = new Date().toLocaleDateString('fr-TN', { month: 'long', year: 'numeric' });

  periods = ['7 jours', '30 jours', '90 jours', '12 mois'];
  activePeriod = '30 jours';

  kpis = computed(() => {
    const s = this.stats();
    const d = this.dashboard();
    const kf = d?.kpisFinanciers ?? null;
    const kfac = d?.kpisFactures ?? null;

    const montantTotal = kf?.montantTotalMois ?? s?.montantTotalMois;
    const tauxEncaissement = kf?.tauxEncaissement;
    const totalRejetees = kfac?.totalRejetees ?? s?.totalRejetees;

    const tva = this.tvaBrut();
    const hasTva = tva.length > 0;
    const totalTva = tva.reduce((acc, r) => acc + (r.montantTva ?? 0), 0);

    const delaiMoyen = this.computeDelaiMoyen(this.delaisBrut());

    return [
      {
        label: 'CA mensuel',
        val: montantTotal !== undefined && montantTotal !== null ? `${this.formatMontant(montantTotal)} TND` : '—',
        sub: tauxEncaissement !== undefined && tauxEncaissement !== null
          ? `Taux d'encaissement : ${tauxEncaissement}%`
          : 'Données indisponibles',
        color: montantTotal !== undefined && montantTotal !== null ? 'ok' : 'muted'
      },
      {
        label: 'TVA collectée',
        val: hasTva ? `${this.formatMontant(totalTva)} TND` : '—',
        sub: hasTva ? 'Total sur la période' : 'Données indisponibles',
        color: hasTva ? 'ok' : 'muted'
      },
      {
        label: 'Factures rejetées',
        val: totalRejetees !== undefined && totalRejetees !== null ? String(totalRejetees) : '—',
        sub: totalRejetees !== undefined && totalRejetees !== null ? 'Total sur la période' : 'Données indisponibles',
        color: totalRejetees !== undefined && totalRejetees !== null ? 'warn' : 'muted'
      },
      {
        label: 'Délai moyen',
        val: delaiMoyen !== null ? `${delaiMoyen} j` : '—',
        sub: delaiMoyen !== null ? 'Moyenne pondérée' : 'Données indisponibles',
        color: delaiMoyen !== null ? (delaiMoyen > 30 ? 'warn' : 'ok') : 'muted'
      }
    ];
  });

  caData = computed(() => {
    const evo = this.getEvolutionMensuelle();
    if (!Array.isArray(evo) || evo.length === 0) return [];

    const normalized = this.normalizeEvolution(evo);
    if (normalized.length === 0) return [];

    const slice = normalized.slice(-5);
    const max = Math.max(...slice.map(d => d.value), 1);

    return slice.map((d, i) => ({
      label: d.label,
      val: this.formatCompact(d.value),
      pct: Math.round((d.value / max) * 100),
      current: i === slice.length - 1
    }));
  });

  tvaData = computed(() => {
    const raw = this.tvaBrut();
    if (!raw.length) return [] as { rate: string; pct: number; amount: string; color: string }[];

    const total = raw.reduce((acc, r) => acc + (r.montantTva ?? 0), 0);
    const colors = ['#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#6366f1'];

    return raw
      .slice()
      .sort((a, b) => (a.tauxTva ?? 0) - (b.tauxTva ?? 0))
      .map((r, i) => {
        const montant = r.montantTva ?? 0;
        const pct = total > 0 ? Math.round((montant / total) * 100) : 0;
        return {
          rate: this.formatRate(r.tauxTva),
          pct,
          amount: `${this.formatMontant(montant)} TND`,
          color: colors[i % colors.length]
        };
      });
  });

  statutData = computed(() => {
    const s = this.stats() ?? this.dashboard()?.kpisFactures;
    if (!s) return [] as { label: string; color: string; pct: number; count: number; amount: string }[];

    const rows = [
      { label: 'Brouillon', color: 'muted', count: s.totalBrouillons ?? 0 },
      { label: 'Validée', color: 'ok', count: s.totalValidees ?? 0 },
      { label: 'Transmise', color: 'info', count: s.totalTransmises ?? 0 },
      { label: 'Payée', color: 'ok', count: s.totalPayees ?? 0 },
      { label: 'Rejetée', color: 'warn', count: s.totalRejetees ?? 0 }
    ];

    const total = rows.reduce((acc, r) => acc + r.count, 0);
    if (total === 0) return [] as { label: string; color: string; pct: number; count: number; amount: string }[];

    return rows.map(r => ({
      ...r,
      pct: Math.round((r.count / total) * 100),
      amount: '—'
    }));
  });

  delayData = computed(() => {
    const raw = this.delaisBrut();
    if (!raw.length) return [] as { client: string; init: string; days: number; pct: number; color: string }[];

    const colors = ['#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#6366f1'];
    const max = Math.max(...raw.map(d => d.delaiMoyenJours ?? 0), 1);

    return raw
      .slice()
      .sort((a, b) => (b.delaiMoyenJours ?? 0) - (a.delaiMoyenJours ?? 0))
      .map((d, i) => {
        const days = Math.round((d.delaiMoyenJours ?? 0) * 10) / 10;
        const pct = Math.round(((d.delaiMoyenJours ?? 0) / max) * 100);
        return {
          client: d.clientNom ?? '-',
          init: this.initials(d.clientNom ?? '-'),
          days,
          pct,
          color: colors[i % colors.length]
        };
      });
  });

  recapData = computed(() => {
    const raw = this.recapBrut();
    if (!raw.length) return [] as { mois: string; nbFact: number; ht: string; tva: string; ttc: string; paye: string; impaye: string; taux: number; current: boolean }[];

    return raw.map((r, idx) => ({
      mois: r.mois,
      nbFact: r.nbFactures,
      ht: this.formatMontant(r.totalHt),
      tva: this.formatMontant(r.totalTva),
      ttc: this.formatMontant(r.totalTtc),
      paye: this.formatMontant(r.montantPaye),
      impaye: this.formatMontant(r.montantImpaye),
      taux: this.clampPercent(r.tauxRecouvrement),
      current: idx === raw.length - 1
    }));
  });

  ngOnInit() {
    this.factureSvc.statistiques().subscribe({
      next: s => { this.stats.set(s); this.loading.set(false); },
      error: ()  => this.loading.set(false)
    });
    this.dashSvc.obtenirDashboard().subscribe({
      next: d => this.dashboard.set(d)
    });

    this.chargerRapports();
  }

  changerPeriode(period: string) {
    if (this.activePeriod === period) return;
    this.activePeriod = period;
    this.chargerRapports();
  }

  get kpisFinanciers() { return this.dashboard()?.kpisFinanciers; }
  get kpisConformite() { return this.dashboard()?.kpisConformite; }

  formatMontant(v: number | undefined): string {
    if (v === undefined || v === null) return '—';
    return new Intl.NumberFormat('fr-TN', {
      minimumFractionDigits: 3, maximumFractionDigits: 3
    }).format(v);
  }

  formatCompact(v: number | undefined): string {
    if (v === undefined || v === null) return '—';
    const abs = Math.abs(v);
    if (abs >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace('.', ',')}M`;
    if (abs >= 1_000) return `${(v / 1_000).toFixed(1).replace('.', ',')}k`;
    return this.formatMontant(v);
  }

  exportCSV() {
    const s = this.stats();
    if (!s) return;
    const rows = [
      ['Métrique', 'Valeur'],
      ['Brouillons', s.totalBrouillons],
      ['Validées', s.totalValidees],
      ['Transmises', s.totalTransmises],
      ['Acceptées', s.totalAcceptees],
      ['Rejetées', s.totalRejetees],
      ['Payées', s.totalPayees],
      ['En retard', s.totalEnRetard],
      ['Montant total mois', s.montantTotalMois],
      ['Montant encaissé mois', s.montantEncaisseMois],
      ['Montant en attente', s.montantEnAttente],
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `rapport_factures_${this.exportStamp()}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  exportPDF() {
    const { kpiLines, evoLines, tvaLines, delayLines, recapLines, hasData } = this.buildExportLines();
    if (!hasData) {
      this.showToast('Aucune donnée à exporter.');
      return;
    }

    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const margin = 40;
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = margin;

    const ensureSpace = (needed: number) => {
      if (y + needed > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
    };

    const addWrappedLine = (line: string) => {
      const wrapped = doc.splitTextToSize(line, pageWidth - margin * 2);
      doc.text(wrapped, margin, y);
      y += wrapped.length * 12;
    };

    const addSection = (title: string, lines: string[]) => {
      ensureSpace(22);
      doc.setFontSize(12);
      doc.text(title, margin, y);
      y += 14;
      doc.setFontSize(10);

      if (lines.length === 0) {
        doc.setTextColor(140);
        addWrappedLine('Données indisponibles');
        doc.setTextColor(0);
        y += 4;
        return;
      }

      lines.forEach(line => {
        ensureSpace(12);
        addWrappedLine(line);
      });
      y += 6;
    };

    doc.setFontSize(16);
    doc.text('Rapport de facturation', margin, y);
    y += 18;
    doc.setFontSize(10);
    doc.setTextColor(90);
    doc.text(`Généré le ${this.exportDateLabel()} • Période ${this.activePeriod}`, margin, y);
    doc.setTextColor(0);
    y += 18;

    addSection('KPIs', kpiLines);
    addSection('Évolution du CA', evoLines);
    addSection('Répartition TVA', tvaLines);
    addSection('Délais de paiement', delayLines);
    addSection('Récapitulatif mensuel', recapLines);

    doc.save(`rapport_factures_${this.exportStamp()}.pdf`);
    this.showToast('Export PDF généré.');
  }

  exportExcel() {
    const rows = this.buildExportRows();
    if (!rows.hasData) {
      this.showToast('Aucune donnée à exporter.');
      return;
    }

    const wb = XLSX.utils.book_new();
    const kpiSheet = XLSX.utils.json_to_sheet(rows.kpis.length ? rows.kpis : [{ Indicateur: 'Données indisponibles' }]);
    XLSX.utils.book_append_sheet(wb, kpiSheet, 'KPIs');

    if (rows.evolution.length) {
      const evoSheet = XLSX.utils.json_to_sheet(rows.evolution);
      XLSX.utils.book_append_sheet(wb, evoSheet, 'Evolution CA');
    }

    if (rows.tva.length) {
      const tvaSheet = XLSX.utils.json_to_sheet(rows.tva);
      XLSX.utils.book_append_sheet(wb, tvaSheet, 'TVA');
    }

    if (rows.delais.length) {
      const delaiSheet = XLSX.utils.json_to_sheet(rows.delais);
      XLSX.utils.book_append_sheet(wb, delaiSheet, 'Delais paiement');
    }

    if (rows.recap.length) {
      const recapSheet = XLSX.utils.json_to_sheet(rows.recap);
      XLSX.utils.book_append_sheet(wb, recapSheet, 'Recap mensuel');
    }

    XLSX.writeFile(wb, `rapport_factures_${this.exportStamp()}.xlsx`);
    this.showToast('Export Excel généré.');
  }

  private showToast(msg: string) {
    this.toast = msg;
    setTimeout(() => this.toast = null, 2600);
  }

  private exportStamp(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private exportDateLabel(): string {
    return new Date().toLocaleDateString('fr-TN', { day: '2-digit', month: 'long', year: 'numeric' });
  }

  private buildExportLines() {
    const kpiLines = this.kpis().map(k => {
      const detail = k.sub && k.sub !== 'Données indisponibles' ? ` (${k.sub})` : '';
      return `${k.label} : ${k.val}${detail}`;
    });

    const evoLines = this.normalizeEvolution(this.getEvolutionMensuelle())
      .map(e => `${e.label} : ${this.formatMontant(e.value)} TND`);

    const tvaLines = this.tvaData().map(t => `Taux ${t.rate} : ${t.amount} (${t.pct}%)`);

    const delayLines = this.delayData().map(d => `${d.client} : ${d.days} j`);

    const recapLines = this.recapData().map(r =>
      `${r.mois} • HT ${r.ht} • TVA ${r.tva} • TTC ${r.ttc} • Payé ${r.paye} • Impayé ${r.impaye} • Taux ${r.taux}%`
    );

    const hasData = !!this.stats() || !!this.dashboard() ||
      evoLines.length > 0 || tvaLines.length > 0 || delayLines.length > 0 || recapLines.length > 0;

    return { kpiLines, evoLines, tvaLines, delayLines, recapLines, hasData };
  }

  private buildExportRows() {
    const kpis = this.kpis().map(k => ({
      Indicateur: k.label,
      Valeur: k.val,
      Detail: k.sub
    }));

    const evolution = this.normalizeEvolution(this.getEvolutionMensuelle())
      .map(e => ({
        Mois: e.label,
        Montant: e.value
      }));

    const tva = this.tvaData().map(t => ({
      Taux: t.rate,
      Pourcentage: t.pct,
      Montant: t.amount
    }));

    const delais = this.delayData().map(d => ({
      Client: d.client,
      'Delai moyen (jours)': d.days
    }));

    const recap = this.recapData().map(r => ({
      Mois: r.mois,
      'Nb factures': r.nbFact,
      HT: r.ht,
      TVA: r.tva,
      TTC: r.ttc,
      Paye: r.paye,
      Impaye: r.impaye,
      'Taux recouvrement (%)': r.taux
    }));

    const hasData = !!this.stats() || !!this.dashboard() ||
      evolution.length > 0 || tva.length > 0 || delais.length > 0 || recap.length > 0;

    return { kpis, evolution, tva, delais, recap, hasData };
  }

  private chargerRapports() {
    this.tvaBrut.set([]);
    this.delaisBrut.set([]);
    this.recapBrut.set([]);

    const { debut, fin } = this.periodToRange(this.activePeriod);
    const params = {
      dateDebut: this.toDateParam(debut),
      dateFin: this.toDateParam(fin)
    };

    this.rapportSvc.tvaParTaux(params).subscribe({
      next: data => this.tvaBrut.set(Array.isArray(data) ? data : []),
      error: () => this.tvaBrut.set([])
    });

    this.rapportSvc.delaisPaiement({ ...params, top: 5 }).subscribe({
      next: data => this.delaisBrut.set(Array.isArray(data) ? data : []),
      error: () => this.delaisBrut.set([])
    });

    this.rapportSvc.recapMensuel(params).subscribe({
      next: data => this.recapBrut.set(Array.isArray(data) ? data : []),
      error: () => this.recapBrut.set([])
    });
  }

  private periodToRange(period: string) {
    const now = new Date();
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let start = new Date(end);

    switch (period) {
      case '7 jours':
        start.setDate(end.getDate() - 6);
        break;
      case '30 jours':
        start.setDate(end.getDate() - 29);
        break;
      case '90 jours':
        start.setDate(end.getDate() - 89);
        break;
      case '12 mois': {
        start = new Date(end.getFullYear(), end.getMonth(), 1);
        start.setMonth(start.getMonth() - 11);
        break;
      }
      default:
        start.setDate(end.getDate() - 29);
        break;
    }

    return { debut: start, fin: end };
  }

  private toDateParam(date: Date): string {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  private computeDelaiMoyen(delais: DelaiPaiementClientDto[]): number | null {
    if (!delais.length) return null;

    const totalFactures = delais.reduce((acc, d) => acc + (d.nbFactures ?? 0), 0);
    if (totalFactures > 0) {
      const sum = delais.reduce((acc, d) => acc + (d.delaiMoyenJours ?? 0) * (d.nbFactures ?? 0), 0);
      return Math.round((sum / totalFactures) * 10) / 10;
    }

    const simpleAvg = delais.reduce((acc, d) => acc + (d.delaiMoyenJours ?? 0), 0) / delais.length;
    return Math.round(simpleAvg * 10) / 10;
  }

  private initials(name: string): string {
    const trimmed = name.trim();
    if (!trimmed) return '--';
    const parts = trimmed.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  private formatRate(rate: number | undefined) {
    if (rate === undefined || rate === null) return '—';
    return Number.isInteger(rate) ? `${rate}%` : `${rate.toFixed(1)}%`;
  }

  private clampPercent(value: number | undefined) {
    if (value === undefined || value === null || Number.isNaN(value)) return 0;
    return Math.min(100, Math.max(0, Math.round(value)));
  }

  private getEvolutionMensuelle(): EvolutionPoint[] {
    const d = this.dashboard();
    const evo = d?.evolutionMensuelle ?? d?.evolution ?? null;
    return Array.isArray(evo) ? evo : [];
  }

  private normalizeEvolution(points: EvolutionPoint[]) {
    return points
      .map((p, i) => {
        const label = String(p.mois ?? p.label ?? '');
        const rawValue = p.montantTtc ?? p.montantHt ?? p.montant ?? p.total ?? p.value ?? 0;
        const value = Number(rawValue);
        return { label: label || String(i + 1), value: Number.isFinite(value) ? value : 0 };
      })
      .filter(p => p.label);
  }
}