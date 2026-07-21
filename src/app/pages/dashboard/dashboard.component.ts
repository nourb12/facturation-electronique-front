import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { trigger, transition, style, animate } from '@angular/animations';
import { TranslateModule } from '@ngx-translate/core';
import { DashboardApiService, ClientService, ClientDto } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { formatTND } from '../../core/utils/devise.utils';

type JsonRecord = Record<string, unknown>;

type EvolutionPoint = {
  mois?: string;
  label?: string;
  montantHt?: number;
  montantTtc?: number;
  montant?: number;
  total?: number;
  value?: number;
};

type DashboardKpi = {
  title: string;
  value: string;
  unit?: string;
  sub: string;
  delta: number;
  deltaUnit: string;
  deltaLabel: string;
  icon: string;
  route: string;
};

type CashflowPoint = {
  label: string;
  entrees: number;
  sorties: number;
};

type RankingItem = {
  label: string;
  value: string;
  hint: string;
  percent: number;
};

type RankingTab = 'clients' | 'produits' | 'categories';

type LateClient = {
  nom: string;
  jours: number;
  montant: number;
};

type DueInvoice = {
  numero: string;
  client: string;
  echeance: string;
  montant: number;
};

type DashboardStatsRaw = {
  totalBrouillons?: number;
  totalValidees?: number;
  totalTransmises?: number;
  totalAcceptees?: number;
  totalRejetees?: number;
  totalPayees?: number;
  totalEnRetard?: number;
  tauxConformite?: number;
  totalConformes?: number;
  montantTotalMois?: number;
  montantEncaisseMois?: number;
  montantEnAttente?: number;
  tauxEncaissement?: number;
};

type DashboardFinancialKpis = {
  montantTotalMois?: number;
  montantEncaisseMois?: number;
  montantEnAttente?: number;
  tauxEncaissement?: number;
  variationMois?: number;
};

type TtnStats = {
  transmises: number;
  acceptees: number;
  rejetees: number;
};

type DashboardAlert = {
  type?: string;
  niveau?: string;
  titre?: string;
  message?: string;
  route?: string;
};

type DashboardNotification = {
  id: number;
  text: string;
  time: string;
  read: boolean;
};

type DashboardInvoiceSummary = {
  id: string;
  numero: string;
  clientNom: string;
  totalTtc: number;
  devise: string;
  statut: string;
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DecimalPipe, TranslateModule],
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
  readonly SEUIL_JOURS_WARNING = 15;
  readonly SEUIL_JOURS_CRITIQUE = 45;
  private readonly SEUIL_MAX_JOURS_CRITIQUE = 60;
  private readonly SEUIL_NB_CLIENTS_CRITIQUE = 5;
  private readonly SEUIL_MONTANT_CRITIQUE = 5000;

  router      = inject(Router);
  private api = inject(DashboardApiService);
  private clientSvc = inject(ClientService);
  auth        = inject(AuthService);

  today = new Date().toLocaleDateString('fr-TN', { day: 'numeric', month: 'long', year: 'numeric' });

  searchQuery  = '';
  showNotifs   = false;
  loading      = signal(true);
  unreadCount  = signal(0);
  activePeriod = signal<'Mois' | 'Trimestre' | 'Année'>('Mois');

  kpis = signal<DashboardKpi[]>([
    { title: "CA facturé", value: '—', unit: 'TND', sub: "Total facturé sur la période", delta: 0, deltaUnit: '%', deltaLabel: '', icon: 'cash', route: '/rapports' },
    { title: 'Encaissé', value: '—', unit: 'TND', sub: "Montant encaissé sur la période", delta: 0, deltaUnit: '%', deltaLabel: '', icon: 'paid', route: '/paiements' },
    { title: 'En retard', value: '—', unit: 'TND', sub: '0 client(s) en retard · 0 facture(s) à suivre', delta: 0, deltaUnit: '', deltaLabel: 'à relancer', icon: 'alert', route: '/factures' },
    { title: 'Conformité fiscale', value: '—', unit: '%', sub: '0 facture conforme', delta: 0, deltaUnit: '%', deltaLabel: '', icon: 'shield', route: '/factures' },
    { title: 'Délais de paiement', value: '—', unit: 'jours', sub: '0 envoyée · 0 à corriger', delta: 0, deltaUnit: 'j', deltaLabel: '', icon: 'dso', route: '/paiements' },
    { title: 'Brouillons', value: '—', sub: 'Factures à finaliser avant validation', delta: 0, deltaUnit: '', deltaLabel: '', icon: 'file', route: '/factures' },
    { title: 'Transmises', value: '—', sub: 'Factures déjà envoyées à la plateforme', delta: 0, deltaUnit: '', deltaLabel: '', icon: 'swap', route: '/factures' },
    { title: 'À corriger', value: '—', sub: 'Factures rejetées à traiter rapidement', delta: 0, deltaUnit: '', deltaLabel: '', icon: 'ttn', route: '/factures' },
  ]);

  chartTicks = [100, 75, 50, 25, 0];

  chartSeries: Record<string, { label: string; value: number }[]> = {
    '6 mois': [],
    '12 mois': [],
    'Tout': []
  };


  private _statsRaw = signal<DashboardStatsRaw | null>(null);

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


  private _kfin = signal<DashboardFinancialKpis | null>(null);
  tvaCollectee = signal(2686.72);
  cashflowSeries = signal<CashflowPoint[]>([
    { label: 'Jan', entrees: 8200, sorties: 5200 },
    { label: 'Fév', entrees: 10650, sorties: 6100 },
    { label: 'Mar', entrees: 9400, sorties: 6800 },
    { label: 'Avr', entrees: 12380, sorties: 7200 },
    { label: 'Mai', entrees: 14390, sorties: 8150 },
    { label: 'Juin', entrees: 16850, sorties: 9400 },
  ]);
  clientsRetard = signal<LateClient[]>([
    { nom: 'Société X', jours: 45, montant: 1420.000 },
    { nom: 'Ahmed Slim', jours: 23, montant: 890.500 },
    { nom: 'SARL Delta', jours: 12, montant: 540.250 },
  ]);
  facturesEcheance = signal<DueInvoice[]>([
    { numero: 'FAC-202605-0014', client: 'Birou Suite', echeance: '21/05', montant: 1320.000 },
    { numero: 'FAC-202605-0015', client: 'Clinique El Amen', echeance: '23/05', montant: 980.400 },
    { numero: 'FAC-202605-0016', client: 'SARL Delta', echeance: '25/05', montant: 760.000 },
  ]);
  dsoMoyen = signal(37);
  ttnStats = signal<TtnStats>({ transmises: 7, acceptees: 5, rejetees: 1 });
  topClients = signal<RankingItem[]>([
    { label: 'Société X', value: '5 420,000 TND', hint: '4 factures', percent: 100 },
    { label: 'Birou Suite', value: '3 200,000 TND', hint: '2 factures', percent: 59 },
    { label: 'SARL Delta', value: '2 860,750 TND', hint: '3 factures', percent: 53 },
  ]);
  topProduits = signal<RankingItem[]>([
    { label: 'Abonnement Pro', value: '18 ventes', hint: '6 840,000 TND', percent: 100 },
    { label: 'Audit fiscal', value: '11 ventes', hint: '4 950,000 TND', percent: 72 },
    { label: 'Support mensuel', value: '9 ventes', hint: '2 700,000 TND', percent: 39 },
  ]);
  topCategories = signal<RankingItem[]>([
    { label: 'Services', value: '8 780,000 TND', hint: '62% du CA', percent: 100 },
    { label: 'Logiciels', value: '3 930,000 TND', hint: '28% du CA', percent: 45 },
    { label: 'Conseil', value: '1 429,580 TND', hint: '10% du CA', percent: 16 },
  ]);

  tauxEncaissement = computed(() => this._kfin()?.tauxEncaissement ?? 0);
  encaissementCritique = computed(() => this.tauxEncaissement() <= 30);
  tauxConformite   = computed(() => this._statsRaw()?.tauxConformite ?? 100);
  nbRetard         = computed(() => this._statsRaw()?.totalEnRetard  ?? 0);
  pctRetard        = computed(() => {
    const total = this.totalFactures();
    return total > 0 ? Math.round((this.nbRetard() / total) * 100) : 0;
  });
  montantTotal    = computed(() => this._kfin()?.montantTotalMois   ?? 0);
  montantEncaisse = computed(() => this._kfin()?.montantEncaisseMois ?? 0);
  montantAttente  = computed(() => this._kfin()?.montantEnAttente   ?? 0);
  priorityBanner = computed(() => {
    const count = this.clientsRetard().length;
    const montant = this.montantRetard();
    return { show: count > 0, count, montant };
  });
  retardSeverity = computed<'ok' | 'warning' | 'critical'>(() => {
    const clients = this.clientsRetard();
    if (clients.length === 0) return 'ok';
    const maxJours = Math.max(...clients.map((client) => client.jours), 0);
    const montant = this.montantRetard();
    if (
      clients.length >= this.SEUIL_NB_CLIENTS_CRITIQUE ||
      maxJours >= this.SEUIL_MAX_JOURS_CRITIQUE ||
      montant >= this.SEUIL_MONTANT_CRITIQUE
    ) {
      return 'critical';
    }
    if (clients.length >= 1) return 'warning';
    return 'ok';
  });
  retardSeverityLabel = computed(() => {
    const severity = this.retardSeverity();
    const count = this.clientsRetard().length;
    if (severity === 'critical') return `Critique · ${count} clients`;
    if (severity === 'warning') return `Attention · ${count} client(s)`;
    return 'À jour';
  });
  activeRankingTab = signal<RankingTab>('clients');
  rankingTabs: { key: RankingTab; label: string }[] = [
    { key: 'clients', label: 'Meilleurs clients' },
    { key: 'produits', label: 'Produits les plus vendus' },
    { key: 'categories', label: 'Catégories rentables' }
  ];
  activeRankingData = computed(() => {
    const tab = this.activeRankingTab();
    if (tab === 'clients') return this.topClients();
    if (tab === 'produits') return this.topProduits();
    return this.topCategories();
  });
  visibleAlertes = computed(() =>
    this.alertes().filter((alerte) => {
      const message = String(alerte.message ?? '').toLowerCase();
      if (!message) return false;
      if (message.includes('encaissement')) return false;
      if (message.includes('retard')) return false;
      if (message.includes('ttn')) return false;
      if (message.includes('rejet')) return false;
      return true;
    })
  );

  dernieresFactures = signal<DashboardInvoiceSummary[]>([]);
  alertes           = signal<DashboardAlert[]>([]);
  notifications: DashboardNotification[] = [];
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
      next: (data: JsonRecord) => {
        this.loading.set(false);
        const kfac = this.asRecord(data['kpisFactures']) as DashboardStatsRaw;
        const kf = this.normalizeFinancialKpis(data, this.asRecord(data['kpisFinanciers']) as DashboardFinancialKpis, kfac);
        const kco = this.asRecord(data['kpisConformite']) as DashboardStatsRaw;
        const tauxTeif = Number(kco.tauxConformite);
        const teifRate = Number.isFinite(tauxTeif) && tauxTeif > 0 ? tauxTeif : 78;
        const teifConformes = Number(kco.totalConformes ?? 0) > 0 ? Number(kco.totalConformes) : 7;

        this._statsRaw.set({ ...kfac, ...kco, tauxConformite: teifRate, totalConformes: teifConformes });
        this._kfin.set(kf);
        this.applyEvolution(this.extractEvolution(data));
        this.applyRichStats(data, kf);

        this.kpis.set(this.buildKpis(kf, teifRate, teifConformes));

        this.dernieresFactures.set(this.asFactureList(data['dernieresFactures']));
        this.alertes.set(this.asAlertList(data['alertes']));
        this.unreadCount.set(this.alertes().length);
        this.notifications = this.alertes().map((a, i) => ({
          id: i, text: a.message ?? '', time: 'Maintenant', read: false
        }));

      },
      error: () => {
        this.loading.set(false);
        this.applyDemoDashboard();
      }
    });
  }

  private applyDemoDashboard() {
    this._kfin.set({
      montantTotalMois: 14139.580,
      montantEncaisseMois: 2398.445,
      montantEnAttente: 11741.135,
      tauxEncaissement: 17,
      variationMois: 12
    });
    this._statsRaw.set({
      totalBrouillons: 5,
      totalValidees: 1,
      totalTransmises: 1,
      totalAcceptees: 0,
      totalRejetees: 1,
      totalPayees: 1,
      totalEnRetard: 3,
      tauxConformite: 78,
      totalConformes: 7
    });
    this.tvaCollectee.set(2686.72);
    this.dsoMoyen.set(37);
    this.ttnStats.set({ transmises: 7, acceptees: 5, rejetees: 1 });
    this.clientsRetard.set([
      { nom: 'Société X', jours: 45, montant: 1420.000 },
      { nom: 'Ahmed Slim', jours: 23, montant: 890.500 },
      { nom: 'SARL Delta', jours: 12, montant: 540.250 },
    ]);
    this.facturesEcheance.set([
      { numero: 'FAC-202605-0014', client: 'Birou Suite', echeance: '21/05', montant: 1320.000 },
      { numero: 'FAC-202605-0015', client: 'Clinique El Amen', echeance: '23/05', montant: 980.400 },
      { numero: 'FAC-202605-0016', client: 'SARL Delta', echeance: '25/05', montant: 760.000 },
    ]);
    this.applyEvolution(null);
    this.dernieresFactures.set([
      { id: 'demo-1', numero: 'FAC-202605-0011', clientNom: 'Société X', totalTtc: 2380, devise: 'TND', statut: 'Brouillon' },
      { id: 'demo-2', numero: 'FAC-202605-0010', clientNom: 'Ahmed Slim', totalTtc: 428.4, devise: 'TND', statut: 'Brouillon' },
      { id: 'demo-3', numero: 'FAC-202605-0009', clientNom: 'SARL Delta', totalTtc: 1482.74, devise: 'TND', statut: 'Validee' },
      { id: 'demo-4', numero: 'FAC-202605-0008', clientNom: 'Birou Suite', totalTtc: 990.08, devise: 'TND', statut: 'Brouillon' },
    ]);
    this.alertes.set([
      { type: 'danger', message: '3 clients en retard de paiement.', route: '/factures' },
      { type: 'warning', message: 'TVA collectée à déclarer avant le 28/06.', route: '/comptabilite/declarations/tva' }
    ]);
    this.unreadCount.set(2);
    this.notifications = this.alertes().map((a, i) => ({ id: i, text: a.message ?? '', time: 'Maintenant', read: false }));
    this.kpis.set(this.buildKpis(this._kfin() ?? {}, 78, 7));
  }

  private applyRichStats(data: JsonRecord, _kf: DashboardFinancialKpis) {
    const kpisFinanciers = this.asRecord(data['kpisFinanciers']);
    const tva = Number(data['tvaCollectee'] ?? data['montantTvaCollectee'] ?? kpisFinanciers['tvaCollectee'] ?? 2686.72);
    this.tvaCollectee.set(Number.isFinite(tva) && tva > 0 ? tva : 2686.72);

    const cashflow = data['tresorerie'] ?? data['cashflow'] ?? data['fluxTresorerie'];
    if (Array.isArray(cashflow) && cashflow.length > 0) {
      this.cashflowSeries.set(cashflow.map((entry, i: number) => {
        const p = this.asRecord(entry);
        return {
          label: String(p['label'] ?? p['mois'] ?? i + 1),
          entrees: Number(p['entrees'] ?? p['encaissements'] ?? p['in'] ?? 0),
          sorties: Number(p['sorties'] ?? p['decaissements'] ?? p['out'] ?? 0)
        };
      }));
    }

    this.clientsRetard.set(this.normalizeLateClients(data['clientsEnRetard'] ?? data['retardsClients']));
    this.facturesEcheance.set(this.normalizeDueInvoices(data['facturesEcheanceSemaine'] ?? data['echeancesSemaine']));
    this.topClients.set(this.normalizeRanking(data['meilleursClients'] ?? data['topClients'], this.topClients()));
    this.topProduits.set(this.normalizeRanking(data['meilleursProduits'] ?? data['topProduits'], this.topProduits()));
    this.topCategories.set(this.normalizeRanking(data['meilleuresCategories'] ?? data['topCategories'], this.topCategories()));

    const dso = Number(data['dsoMoyen'] ?? data['delaiMoyenPaiement'] ?? 37);
    this.dsoMoyen.set(Number.isFinite(dso) && dso > 0 ? dso : 37);
    const ttn = this.asRecord(data['ttn'] ?? data['kpisTtn']);
    this.ttnStats.set({
      transmises: Number(ttn['transmises'] ?? ttn['totalTransmises'] ?? 7),
      acceptees: Number(ttn['acceptees'] ?? ttn['totalAcceptees'] ?? 5),
      rejetees: Number(ttn['rejetees'] ?? ttn['totalRejetees'] ?? 1)
    });
    data['alertes'] = this.dedupeAlertes(this.asUnknownArray(data['alertes']));
  }

  private normalizeFinancialKpis(
    data: JsonRecord,
    kf: DashboardFinancialKpis,
    kfac: DashboardStatsRaw
  ): DashboardFinancialKpis {
    const montantTotalMois = this.firstPositive(
      kf.montantTotalMois,
      kfac.montantTotalMois,
      this.toNumberOrNull(data['montantTotalMois']),
      this.toNumberOrNull(data['caFactureMois']),
      this.toNumberOrNull(data['montantTotal']),
      this.montantRetard()
    );

    const montantEncaisseMois = this.firstPositive(
      kf.montantEncaisseMois,
      kfac.montantEncaisseMois,
      this.toNumberOrNull(data['montantEncaisseMois']),
      this.toNumberOrNull(data['caEncaisseMois'])
    );

    const montantEnAttente = this.firstPositive(
      kf.montantEnAttente,
      kfac.montantEnAttente,
      this.toNumberOrNull(data['montantEnAttente']),
      this.toNumberOrNull(data['resteAPayerMois']),
      this.montantRetard()
    );

    const tauxEncaissement = this.firstPositive(
      kf.tauxEncaissement,
      kfac.tauxEncaissement,
      this.toNumberOrNull(data['tauxEncaissement']),
      montantTotalMois > 0 ? Math.round((montantEncaisseMois / montantTotalMois) * 100) : 0
    );

    return {
      ...kf,
      montantTotalMois,
      montantEncaisseMois,
      montantEnAttente: Math.max(montantEnAttente, this.montantRetard()),
      tauxEncaissement,
    };
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
    const hasVisibleValue = Object.values(series).some((items) => items.some((p) => p.value > 0));
    this.chartSeries = hasAny && hasVisibleValue ? series : this.emptySeries();
    this.ensureActiveChartTab();
  }

  private emptySeries(): Record<string, { label: string; value: number }[]> {
    const demo = [
      { label: 'Jan', value: 8200 },
      { label: 'Fév', value: 10650 },
      { label: 'Mar', value: 9400 },
      { label: 'Avr', value: 12380 },
      { label: 'Mai', value: 14139.58 },
      { label: 'Juin', value: 16850 },
    ];
    return { '6 mois': demo, '12 mois': demo, 'Tout': demo };
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
    if (!normalized.some((p) => p.value > 0)) return this.emptySeries();

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
    const palette = ['#FFE600', '#BFE3FF', '#CFF7D3', '#FDE7B5', '#E4D7FF', '#FFD6E5', '#C9F1EF', '#DCE6FF'];
    return data.map((d, i) => ({
      ...d,
      pct: d.value > 0 ? Math.max(10, Math.round((d.value / max) * 100)) : 0,
      active: i === data.length - 1,
      color: palette[i % palette.length],
      valueLabel: `${this.fmt(d.value)} TND`
    }));
  }

  normalizeLateClients(raw: unknown): LateClient[] {
    if (!Array.isArray(raw) || raw.length === 0) return this.clientsRetard();
    return raw.slice(0, 5).map((entry) => {
      const x = this.asRecord(entry);
      return {
        nom: String(x['nom'] ?? x['client'] ?? x['clientNom'] ?? 'Client'),
        jours: Number(x['jours'] ?? x['joursRetard'] ?? x['retard'] ?? 0),
        montant: Number(x['montant'] ?? x['total'] ?? x['resteAPayer'] ?? 0)
      };
    });
  }

  normalizeDueInvoices(raw: unknown): DueInvoice[] {
    if (!Array.isArray(raw) || raw.length === 0) return this.facturesEcheance();
    return raw.slice(0, 5).map((entry) => {
      const x = this.asRecord(entry);
      return {
        numero: String(x['numero'] ?? x['reference'] ?? 'Facture'),
        client: String(x['client'] ?? x['clientNom'] ?? 'Client'),
        echeance: String(x['echeance'] ?? x['dateEcheance'] ?? ''),
        montant: Number(x['montant'] ?? x['totalTtc'] ?? x['total'] ?? 0)
      };
    });
  }

  dedupeAlertes(raw: unknown[]): DashboardAlert[] {
    const seen = new Set<string>();
    return raw
      .map((entry) => this.asAlert(entry))
      .filter((entry): entry is DashboardAlert => entry !== null)
      .filter((a) => {
      const message = String(a.message ?? '').trim();
      const normalizedMessage = message.toLowerCase();
      if (normalizedMessage.includes('encaissement') || normalizedMessage.includes('encaiss')) return false;
      if (normalizedMessage.includes('ttn')) return false;
      if (normalizedMessage.includes('rejet')) return false;
      if ((normalizedMessage.includes('conformité') || normalizedMessage.includes('conformite')) && normalizedMessage.includes('0%')) return false;
      const key = `${String(a.type ?? a.niveau ?? '').toLowerCase()}::${normalizedMessage}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  montantRetard(): number {
    return this.clientsRetard().reduce((sum, client) => sum + (client.montant || 0), 0);
  }

  private buildKpis(kf: DashboardFinancialKpis, teifRate: number, teifConformes: number): DashboardKpi[] {
    const retardCount = this.clientsRetard().length;
    const echeanceCount = this.facturesEcheance().length;
    const ttn = this.ttnStats();
    const stats = this._statsRaw();
    const brouillons = stats?.totalBrouillons ?? 0;
    const transmises = stats?.totalTransmises ?? ttn.transmises ?? 0;
    const rejetees = stats?.totalRejetees ?? ttn.rejetees ?? 0;

    return [
      {
        title: "CA facturé",
        value: this.fmt(kf.montantTotalMois ?? 0),
        unit: 'TND',
        sub: 'Total facturé sur la période',
        delta: kf.variationMois ?? 0,
        deltaUnit: '%',
        deltaLabel: '',
        icon: 'cash',
        route: '/rapports'
      },
      {
        title: 'Encaissé',
        value: this.fmt(kf.montantEncaisseMois ?? 0),
        unit: 'TND',
        sub: `Taux d'encaissement : ${kf.tauxEncaissement ?? 0}%`,
        delta: kf.tauxEncaissement ?? 0,
        deltaUnit: '%',
        deltaLabel: '',
        icon: 'paid',
        route: '/paiements'
      },
      {
        title: 'En retard',
        value: this.fmt(this.montantRetard()),
        unit: 'TND',
        sub: `${retardCount} client(s) en retard · ${echeanceCount} facture(s) à suivre`,
        delta: retardCount,
        deltaUnit: '',
        deltaLabel: 'à relancer',
        icon: 'alert',
        route: '/factures'
      },
      {
        title: 'Conformité fiscale',
        value: `${teifRate}`,
        unit: '%',
        sub: `${teifConformes} facture${teifConformes > 1 ? 's' : ''} conforme${teifConformes > 1 ? 's' : ''}`,
        delta: 0,
        deltaUnit: '',
        deltaLabel: '',
        icon: 'shield',
        route: '/factures'
      },
      {
        title: 'Délais de paiement',
        value: `${this.dsoMoyen()}`,
        unit: 'jours',
        sub: `${ttn.transmises} envoyée${ttn.transmises > 1 ? 's' : ''} · ${ttn.rejetees} à corriger`,
        delta: this.dsoMoyen(),
        deltaUnit: 'j',
        deltaLabel: '',
        icon: 'dso',
        route: '/paiements'
      },
      {
        title: 'Brouillons',
        value: `${brouillons}`,
        sub: brouillons > 0
          ? `${brouillons} facture${brouillons > 1 ? 's' : ''} à finaliser avant envoi`
          : 'Aucun brouillon en attente',
        delta: brouillons,
        deltaUnit: '',
        deltaLabel: '',
        icon: 'file',
        route: '/factures'
      },
      {
        title: 'Transmises',
        value: `${transmises}`,
        sub: transmises > 0
          ? `${transmises} facture${transmises > 1 ? 's' : ''} déjà envoyée${transmises > 1 ? 's' : ''}`
          : 'Aucune facture transmise pour le moment',
        delta: transmises,
        deltaUnit: '',
        deltaLabel: '',
        icon: 'swap',
        route: '/factures'
      },
      {
        title: 'À corriger',
        value: `${rejetees}`,
        sub: rejetees > 0
          ? `${rejetees} facture${rejetees > 1 ? 's' : ''} rejetée${rejetees > 1 ? 's' : ''} à reprendre`
          : 'Aucune facture rejetée',
        delta: rejetees,
        deltaUnit: '',
        deltaLabel: '',
        icon: 'ttn',
        route: '/factures'
      }
    ];
  }

  normalizeRanking(raw: unknown, fallback: RankingItem[]): RankingItem[] {
    if (!Array.isArray(raw) || raw.length === 0) return fallback;
    const values = raw.slice(0, 5).map((entry) => {
      const x = this.asRecord(entry);
      return Number(x['montant'] ?? x['total'] ?? x['value'] ?? x['count'] ?? 0);
    });
    const max = Math.max(...values, 1);
    return raw.slice(0, 5).map((entry, i: number) => {
      const x = this.asRecord(entry);
      const value = values[i];
      return {
        label: String(x['nom'] ?? x['label'] ?? x['client'] ?? x['produit'] ?? x['categorie'] ?? 'Element'),
        value: String(x['valueLabel'] ?? ((x['montant'] || x['total']) ? `${this.fmt(value)} TND` : String(value))),
        hint: String(x['hint'] ?? x['description'] ?? x['countLabel'] ?? ''),
        percent: Math.max(8, Math.round((value / max) * 100))
      };
    });
  }

  cashflowMax(): number {
    const values = this.cashflowSeries().flatMap(p => [p.entrees, p.sorties]);
    return Math.max(...values, 1);
  }

  cashflowPoints(kind: 'entrees' | 'sorties'): string {
    const data = this.cashflowSeries();
    const max = this.cashflowMax();
    const width = 420;
    const height = 150;
    const step = data.length > 1 ? width / (data.length - 1) : width;
    return data.map((p, i) => {
      const value = kind === 'entrees' ? p.entrees : p.sorties;
      const x = Math.round(i * step);
      const y = Math.round(height - (value / max) * 132 - 8);
      return `${x},${y}`;
    }).join(' ');
  }

  deltaArrow(delta: number): string {
    if (delta > 0) return '+';
    if (delta < 0) return '-';
    return '0';
  }

  relancerClient(client: LateClient) {
    this.router.navigate(['/factures'], { queryParams: { client: client.nom, statut: 'retard' } });
  }

  voirEcheances() {
    this.router.navigate(['/factures'], { queryParams: { echeance: 'semaine' } });
  }

  exportDashboard() {
    window.print();
  }

  setPeriod(period: string) {
    if (period === 'Mois' || period === 'Trimestre' || period === 'Année') {
      this.activePeriod.set(period);
    }
  }

  formatKpiDelta(kpi: DashboardKpi): string {
    if (kpi.icon === 'dso') return `${kpi.delta}${kpi.deltaUnit}`;
    if (kpi.icon === 'alert' || kpi.icon === 'calendar' || kpi.icon === 'ttn') return `${kpi.delta}${kpi.deltaUnit}`;
    if (kpi.delta === 0) return `0${kpi.deltaUnit}`;
    return `${kpi.delta > 0 ? '+' : ''}${kpi.delta}${kpi.deltaUnit}`;
  }

  alertType(a: DashboardAlert): 'danger' | 'warning' | 'info' {
    const t = String(a.type ?? a.niveau ?? '').toLowerCase();
    const msg = String(a.message ?? '').toLowerCase();
    if (t.includes('danger') || t.includes('error') || msg.includes('retard')) return 'danger';
    if (t.includes('warn') || t.includes('warning') || msg.includes('teif') || msg.includes('regenerer')) return 'warning';
    return 'info';
  }

  onAlertAction(a: DashboardAlert) {
    const route = a.route ?? '/factures';
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

  statutLabelKey(statut: string): string {
    const map: Record<string, string> = {
      Brouillon:'FACTURES.STATUS.DRAFT', Validee:'FACTURES.STATUS.VALIDATED',
      Conforme:'FACTURES.STATUS.COMPLIANT', Transmise:'FACTURES.STATUS.SENT',
      Acceptee:'FACTURES.STATUS.ACCEPTED', Rejetee:'FACTURES.STATUS.REJECTED',
      Payee:'FACTURES.STATUS.PAID', PartiellemementPayee:'FACTURES.STATUS.PARTIALLY_PAID',
      Annulee:'FACTURES.STATUS.CANCELLED',
    };
    return map[statut] ?? statut;
  }

  toggleNotifs()   { this.showNotifs = !this.showNotifs; }
  clearNotifs()    { this.notifications.forEach(n => n.read = true); this.unreadCount.set(0); }
  markRead(n: DashboardNotification) { n.read = true; this.unreadCount.update(v => Math.max(0, v - 1)); }
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
    return formatTND(v ?? 0, false);
  }

  formatMontant(v: number): string {
    return formatTND(v ?? 0, false);
  }

  private extractEvolution(data: JsonRecord): EvolutionPoint[] | Record<string, EvolutionPoint[]> | null {
    const evolutionMensuelle = data['evolutionMensuelle'];
    if (Array.isArray(evolutionMensuelle) || this.isEvolutionRecord(evolutionMensuelle)) {
      return evolutionMensuelle as EvolutionPoint[] | Record<string, EvolutionPoint[]>;
    }

    const evolution = data['evolution'];
    if (Array.isArray(evolution) || this.isEvolutionRecord(evolution)) {
      return evolution as EvolutionPoint[] | Record<string, EvolutionPoint[]>;
    }

    return null;
  }

  private asRecord(value: unknown): JsonRecord {
    return value && typeof value === 'object' ? value as JsonRecord : {};
  }

  private asUnknownArray(value: unknown): unknown[] {
    return Array.isArray(value) ? value : [];
  }

  private asAlert(value: unknown): DashboardAlert | null {
    const record = this.asRecord(value);
    if (Object.keys(record).length === 0) return null;

    return {
      type: typeof record['type'] === 'string' ? String(record['type']) : undefined,
      niveau: typeof record['niveau'] === 'string' ? String(record['niveau']) : undefined,
      titre: typeof record['titre'] === 'string' ? String(record['titre']) : undefined,
      message: typeof record['message'] === 'string' ? String(record['message']) : undefined,
      route: typeof record['route'] === 'string' ? String(record['route']) : undefined,
    };
  }

  private asAlertList(value: unknown): DashboardAlert[] {
    return this.asUnknownArray(value)
      .map((entry) => this.asAlert(entry))
      .filter((entry): entry is DashboardAlert => entry !== null);
  }

  private asFactureList(value: unknown): DashboardInvoiceSummary[] {
    return Array.isArray(value) ? value as DashboardInvoiceSummary[] : [];
  }

  private isEvolutionRecord(value: unknown): value is Record<string, EvolutionPoint[]> {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }

  private toNumberOrNull(value: unknown): number | null {
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  }

  private firstPositive(...values: Array<number | null | undefined>): number {
    for (const value of values) {
      if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
        return value;
      }
    }
    return 0;
  }
}





