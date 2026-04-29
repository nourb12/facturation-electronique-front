import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { trigger, transition, style, animate } from '@angular/animations';
import { DashboardApiService, ClientService, ClientDto } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { TransactionApiService } from '../../core/services/transaction-api.service';


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
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DecimalPipe],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  animations: [
    trigger('pageIn', [transition(':enter', [
      style({ opacity: 0, transform: 'translateY(8px)' }),
      animate('400ms cubic-bezier(.16,1,.3,1)', style({ opacity: 1, transform: 'translateY(0)' }))
    ])]),
    trigger('fadeIn', [
      transition(':enter', [style({ opacity: 0 }), animate('200ms ease', style({ opacity: 1 }))]),
      transition(':leave', [animate('150ms ease', style({ opacity: 0 }))])
    ])
  ]
})
export class DashboardComponent implements OnInit {

  router      = inject(Router);
  private api = inject(DashboardApiService);
  private clientSvc = inject(ClientService);
  private txApi = inject(TransactionApiService);
  auth        = inject(AuthService);

  today = new Date().toLocaleDateString('fr-TN', { day: 'numeric', month: 'long', year: 'numeric' });

  searchQuery  = '';
  showNotifs   = false;
  loading      = signal(true);
  unreadCount  = signal(0);

  kpis = signal([
    { title: "Chiffre d'affaires", value: '—', sub: "Taux d'encaissement : 0%", delta: 0, deltaUnit: '%', deltaLabel: 'ce mois', icon: 'cash', route: '/rapports' },
    { title: 'Factures émises', value: '—', sub: '0 acceptées', delta: 0, deltaUnit: '', deltaLabel: 'ce mois', icon: 'file', route: '/factures' },
    { title: 'Impayés', value: '—', sub: '0 en retard', delta: 0, deltaUnit: '', deltaLabel: 'en attente', icon: 'alert', route: '/factures' },
    { title: 'Conformité TEIF', value: '—', sub: '0 conformes', delta: 0, deltaUnit: '%', deltaLabel: 'objectif', icon: 'shield', route: '/factures' },
    { title: 'Transactions', value: '—', sub: '0 non justifiées', delta: 0, deltaUnit: '', deltaLabel: 'ce mois', icon: 'swap', route: '/transactions' },
  ]);

  chartTicks = [100, 75, 50, 25, 0];

  chartSeries: Record<string, { label: string; value: number }[]> = {
    '6 mois': [],
    '12 mois': [],
    'Tout': []
  };


  private _statsRaw = signal<any>(null);

  donutSegments = computed(() => {
    const s = this._statsRaw();
    if (!s) return this.defaultDonut();

    const data = [
      { label: 'Brouillons', count: s.totalBrouillons ?? 0, color: '#555555' },
      { label: 'Validées',   count: s.totalValidees   ?? 0, color: '#3B82F6' },
      { label: 'Transmises', count: s.totalTransmises ?? 0, color: '#F59E0B' },
      { label: 'Acceptées',  count: s.totalAcceptees  ?? 0, color: '#22C55E' },
      { label: 'Rejetées',   count: s.totalRejetees   ?? 0, color: '#EF4444' },
      { label: 'Payées',     count: s.totalPayees     ?? 0, color: '#FFE600' },
    ].filter(d => d.count > 0);

    const total = data.reduce((s, d) => s + d.count, 0) || 1;
    const circumference = 2 * Math.PI * 46; // r=46
    let offset = 0;

    return data.map(d => {
      const dash = (d.count / total) * circumference;
      const gap  = circumference - dash;
      const seg  = { ...d, dash: `${dash} ${gap}`, offset: -offset };
      offset += dash;
      return seg;
    });
  });

  totalFactures = computed(() => {
    const s = this._statsRaw();
    if (!s) return 0;
    return (s.totalBrouillons ?? 0) + (s.totalValidees ?? 0) +
           (s.totalTransmises ?? 0) + (s.totalAcceptees ?? 0) +
           (s.totalRejetees ?? 0)   + (s.totalPayees ?? 0);
  });

  private defaultDonut() {
    return [
      { label: 'Aucune donnée', count: 1, color: '#333', dash: '289 0', offset: 0 }
    ];
  }


  private _kfin = signal<any>(null);

  tauxEncaissement = computed(() => this._kfin()?.tauxEncaissement ?? 0);
  tauxConformite   = computed(() => this._statsRaw()?.tauxConformite ?? 100);
  nbRetard         = computed(() => this._statsRaw()?.totalEnRetard  ?? 0);
  pctRetard        = computed(() => {
    const total = this.totalFactures();
    return total > 0 ? Math.round((this.nbRetard() / total) * 100) : 0;
  });
  montantTotal    = computed(() => this._kfin()?.montantTotalMois   ?? 0);
  montantEncaisse = computed(() => this._kfin()?.montantEncaisseMois ?? 0);
  montantAttente  = computed(() => this._kfin()?.montantEnAttente   ?? 0);

  dernieresFactures = signal<any[]>([]);
  alertes           = signal<any[]>([]);
  notifications: any[] = [];
  activeChartTab = '6 mois';
  chartTabs = ['6 mois', '12 mois', 'Tout'];
  showInvoiceModal = false;
  invoiceSaving = signal(false);
  invoiceValid = signal(false);
  invoiceErrors: Record<string, string> = {};

  clientsList = signal<ClientDto[]>([]);

  invoiceForm = {
    numero: '',
    dateEmission: '',
    clientId: '',
    clientMatriculeFiscal: '',
    typeFacture: 'Vente',
    modePaiement: 'Virement',
    totalHt: '',
    totalTva: '',
    timbreFiscal: '',
    totalTtc: '',
    dateEcheance: '',
    reference: '',
    note: ''
  };

  readonly invoiceTypes = ['Vente', 'Avoir'];
  readonly paymentModes = ['Virement', 'Espèces', 'Chèque', 'Carte', 'Autre'];

  ngOnInit() { this.loadDashboard(); }

  loadDashboard() {
    this.loading.set(true);
    this.api.obtenirDashboard().subscribe({
      next: (data: any) => {
        this.loading.set(false);
        const kf  = data.kpisFinanciers   ?? {};
        const kfac = data.kpisFactures    ?? {};
        const kco  = data.kpisConformite  ?? {};

        this._statsRaw.set({ ...kfac, ...kco });
        this._kfin.set(kf);
        this.applyEvolution(data?.evolutionMensuelle ?? data?.evolution ?? null);

        this.kpis.set([
          {
            title: "Chiffre d'affaires",
            value: `${this.fmt(kf.montantTotalMois)} TND`,
            sub: `Taux d'encaissement : ${kf.tauxEncaissement ?? 0}%`,
            delta: kf.variationMois ?? 0,
            deltaUnit: '%',
            deltaLabel: 'ce mois',
            icon: 'cash',
            route: '/rapports'
          },
          {
            title: 'Factures émises',
            value: String(kfac.totalMois ?? 0),
            sub: `${kfac.totalAcceptees ?? 0} acceptées`,
            delta: kfac.totalMois ?? 0,
            deltaUnit: '',
            deltaLabel: 'ce mois',
            icon: 'file',
            route: '/factures'
          },
          {
            title: 'Impayés',
            value: `${this.fmt(kf.montantEnAttente)} TND`,
            sub: `${kfac.totalEnRetard ?? 0} en retard`,
            delta: -(kfac.totalEnRetard ?? 0),
            deltaUnit: '',
            deltaLabel: 'en attente',
            icon: 'alert',
            route: '/factures'
          },
          {
            title: 'Conformité TEIF',
            value: `${kco.tauxConformite ?? 100}%`,
            sub: `${kco.totalConformes ?? 0} conformes`,
            delta: kco.tauxConformite ?? 100,
            deltaUnit: '%',
            deltaLabel: 'objectif',
            icon: 'shield',
            route: '/factures'
          },
          {
            title: 'Transactions',
            value: '—',
            sub: '0 non justifiées',
            delta: 0,
            deltaUnit: '',
            deltaLabel: 'ce mois',
            icon: 'swap',
            route: '/transactions'
          },
        ]);

        this.dernieresFactures.set(data.dernieresFactures ?? []);
        this.alertes.set(data.alertes ?? []);
        this.unreadCount.set((data.alertes ?? []).length);
        this.notifications = (data.alertes ?? []).map((a: any, i: number) => ({
          id: i, text: a.message, time: 'Maintenant', read: false
        }));

        // Load a lightweight KPI for the current month transactions (non justifiées).
        this.updateTransactionsKpi();
      },
      error: () => this.loading.set(false)
    });
  }

  private updateTransactionsKpi() {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const dateDebut = start.toISOString().slice(0, 10); // YYYY-MM-DD
    const dateFin = now.toISOString().slice(0, 10);

    this.txApi.counters({ dateDebut, dateFin }).subscribe({
      next: (c) => {
        if (!c) return;
        this.kpis.update((list) => {
          const next = [...list];
          const idx = next.findIndex((x) => x.route === '/transactions');
          if (idx === -1) return next;
          next[idx] = {
            ...next[idx],
            value: `${this.fmt(c.nonJustifieeMontant)} TND`,
            sub: `${c.nonJustifieeCount} non justifiées`,
            delta: c.nonJustifieeCount,
            deltaUnit: '',
            deltaLabel: 'ce mois',
          };
          return next;
        });
      },
      error: () => {}
    });
  }

  private applyEvolution(raw: EvolutionPoint[] | Record<string, EvolutionPoint[]> | null) {
    if (!raw) {
      this.chartSeries = this.emptySeries();
      return;
    }

    if (Array.isArray(raw)) {
      this.chartSeries = this.seriesFromArray(raw);
      this.ensureActiveChartTab();
      return;
    }

    const keys = ['6 mois', '12 mois', 'Tout'] as const;
    const series: Record<string, { label: string; value: number }[]> = this.emptySeries();
    let hasAny = false;
    for (const key of keys) {
      const arr = raw[key];
      if (Array.isArray(arr)) {
        series[key] = this.normalizeSeries(arr);
        if (series[key].length > 0) hasAny = true;
      }
    }
    this.chartSeries = hasAny ? series : this.emptySeries();
    this.ensureActiveChartTab();
  }

  private emptySeries(): Record<string, { label: string; value: number }[]> {
    return { '6 mois': [], '12 mois': [], 'Tout': [] };
  }

  private normalizeSeries(points: EvolutionPoint[]): { label: string; value: number }[] {
    return points
      .map((p, i) => {
        const label = String(p.mois ?? p.label ?? '');
        const rawValue = p.montantTtc ?? p.montantHt ?? p.montant ?? p.total ?? p.value ?? 0;
        const value = Number(rawValue);
        return { label: label || String(i + 1), value: Number.isFinite(value) ? value : 0 };
      })
      .filter(p => p.label);
  }

  private seriesFromArray(points: EvolutionPoint[]): Record<string, { label: string; value: number }[]> {
    const normalized = this.normalizeSeries(points);
    if (normalized.length === 0) return this.emptySeries();

    const series12 = normalized.slice(-12);
    const series6 = normalized.slice(-6);
    const seriesTout = this.groupByYear(normalized);

    return {
      '6 mois': series6,
      '12 mois': series12,
      'Tout': seriesTout.length > 0 ? seriesTout : normalized
    };
  }

  private groupByYear(series: { label: string; value: number }[]) {
    const yearRe = /\b(20\d{2})\b/;
    const grouped: Record<string, number> = {};
    let found = false;
    for (const s of series) {
      const match = String(s.label).match(yearRe);
      if (match) {
        found = true;
        grouped[match[1]] = (grouped[match[1]] ?? 0) + s.value;
      }
    }
    if (!found) return [];
    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([label, value]) => ({ label, value }));
  }

  private ensureActiveChartTab() {
    for (const tab of this.chartTabs) {
      if ((this.chartSeries[tab] ?? []).length > 0) {
        this.activeChartTab = tab;
        return;
      }
    }
    this.activeChartTab = this.chartTabs[0];
  }
  chartBars() {
    const data = this.chartSeries[this.activeChartTab] ?? this.chartSeries['6 mois'];
    const max = Math.max(...data.map(d => d.value), 1);
    return data.map((d, i) => ({
      ...d,
      pct: Math.round((d.value / max) * 100),
      active: i === data.length - 1,
      valueLabel: `${this.fmt(d.value)} TND`
    }));
  }

  alertType(a: any): 'danger' | 'warning' | 'info' {
    const t = String(a?.type ?? a?.niveau ?? '').toLowerCase();
    const msg = String(a?.message ?? '').toLowerCase();
    if (t.includes('danger') || t.includes('error') || msg.includes('retard')) return 'danger';
    if (t.includes('warn') || t.includes('warning') || msg.includes('teif') || msg.includes('regenerer')) return 'warning';
    return 'info';
  }

  onAlertAction(a: any) {
    const route = a?.route ?? '/factures';
    this.router.navigate([route]);
  }

  getStatutClass(statut: string): string {
    const map: Record<string, string> = {
      Brouillon: 'neutral', Validee: 'info', Conforme: 'info',
      Transmise: 'warn', Acceptee: 'ok', Rejetee: 'err',
      Payee: 'ok', PartiellemntPayee: 'warn', Annulee: 'neutral'
    };
    return map[statut] ?? 'neutral';
  }

  toggleNotifs()   { this.showNotifs = !this.showNotifs; }
  clearNotifs()    { this.notifications.forEach(n => n.read = true); this.unreadCount.set(0); }
  markRead(n: any) { n.read = true; this.unreadCount.update(v => Math.max(0, v - 1)); }
  loadClients() {
    this.clientSvc.lister(1, 100, true).subscribe({
      next: res => this.clientsList.set(res.items ?? []),
      error: () => this.clientsList.set([])
    });
  }

  openInvoiceModal() {
    this.showInvoiceModal = true;
    if (this.clientsList().length === 0) this.loadClients();
  }
  closeInvoiceModal() {
    this.showInvoiceModal = false;
    this.resetInvoiceForm();
  }

  resetInvoiceForm() {
    this.invoiceForm = {
      numero: '',
      dateEmission: '',
      clientId: '',
      clientMatriculeFiscal: '',
      typeFacture: 'Vente',
      modePaiement: 'Virement',
      totalHt: '',
      totalTva: '',
      timbreFiscal: '',
      totalTtc: '',
      dateEcheance: '',
      reference: '',
      note: ''
    };
    this.invoiceErrors = {};
    this.invoiceValid.set(false);
  }

  onClientChange() {
    const c = this.clientsList().find(x => x.id === this.invoiceForm.clientId);
    if (c?.matriculeFiscal) this.invoiceForm.clientMatriculeFiscal = c.matriculeFiscal;
    this.validateInvoice();
  }

  onAmountChange() {
    this.updateTotalTtc();
    this.validateInvoice();
  }

  updateTotalTtc() {
    const ht = this.toNumber(this.invoiceForm.totalHt);
    const tva = this.toNumber(this.invoiceForm.totalTva);
    const timbre = this.toNumber(this.invoiceForm.timbreFiscal);
    const ttc = ht + tva + timbre;
    this.invoiceForm.totalTtc = ttc > 0 ? ttc.toFixed(3) : '';
  }

  toNumber(v: string): number {
    if (!v) return 0;
    const n = Number(String(v).replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
  }

  validateInvoice(): boolean {
    this.updateTotalTtc();
    const errors: Record<string, string> = {};

    if (this.invoiceForm.numero.trim().length < 3) errors['numero'] = 'Numéro requis';
    if (!this.invoiceForm.dateEmission) errors['dateEmission'] = "Date d'émission requise";
    if (!this.invoiceForm.clientId) errors['clientId'] = 'Client requis';
    if (!this.isMatriculeFiscalValid(this.invoiceForm.clientMatriculeFiscal)) errors['clientMatriculeFiscal'] = 'Format matricule fiscal invalide';
    if (!this.invoiceForm.typeFacture) errors['typeFacture'] = 'Type requis';
    if (this.toNumber(this.invoiceForm.totalHt) <= 0) errors['totalHt'] = 'Total HT requis';
    if (this.invoiceForm.totalTva === '' || this.toNumber(this.invoiceForm.totalTva) < 0) errors['totalTva'] = 'TVA requise';
    if (this.toNumber(this.invoiceForm.totalTtc) <= 0) errors['totalTtc'] = 'Total TTC requis';

    this.invoiceErrors = errors;
    const ok = Object.keys(errors).length === 0;
    this.invoiceValid.set(ok);
    return ok;
  }

  isMatriculeFiscalValid(value: string): boolean {
    const normalized = value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    return /^[0-9]{7}[A-Z]([A-Z]{2}[0-9]{3})?$/.test(normalized);
  }

  hasInvError(field: string): boolean { return !!this.invoiceErrors[field]; }
  getInvError(field: string): string { return this.invoiceErrors[field] ?? ''; }

  saveInvoice() {
    if (!this.validateInvoice()) return;
    this.closeInvoiceModal();
  }

  fmt(v: number): string {
    if (!v) return '0';
    return new Intl.NumberFormat('fr-TN').format(Math.round(v));
  }

  formatMontant(v: number): string {
    return new Intl.NumberFormat('fr-TN', { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(v ?? 0);
  }
}





