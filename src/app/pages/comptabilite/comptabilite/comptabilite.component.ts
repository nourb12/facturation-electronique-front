import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { COMPTES, JOURNAUX } from '../../../core/constants/pcg.constants';
import { ComptabiliteApiService, ComptabilitePayload } from '../../../core/services/api.service';

type PdfDoc = InstanceType<typeof import('jspdf').jsPDF>;

type SectionKey = 'dashboard' | 'saisie' | 'consultation' | 'actifs' | 'etats' | 'fiscal';

@Component({
  selector: 'app-comptabilite',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TranslateModule],
  templateUrl: './comptabilite.component.html',
  styleUrls: ['./comptabilite.component.scss']
})
export class ComptabiliteComponent {
  private api = inject(ComptabiliteApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  loading = signal(true);
  dataSource = signal<'api' | 'demo'>('demo');
  search = signal('');
  selectedJournal = signal('');
  dateDebut = signal('');
  dateFin = signal('');
  ledgerCompte = signal('');
  consultationDateDebut = signal('');
  consultationDateFin = signal('');
  analyticPeriod = signal<'mois' | 'trimestre' | 'annee'>('mois');
  activeSection = signal<SectionKey>('dashboard');
  data = signal<ComptabilitePayload>(this.fallbackPayload());
  showAccountModal = signal(false);
  showEntryModal = signal(false);
  showAssetModal = signal(false);
  showAnalyticModal = signal(false);
  newAccount = signal({ numero: '', intitule: '', classe: '4', nature: 'Tiers', usage: 'Compte personnalisé' });
  newAsset = signal({
    label: '',
    famille: 'Matériel informatique',
    compte: '218300',
    taux: 33,
    acquisition: 0,
    statut: 'En service',
  });
  newAnalytic = signal({ code: '', label: '', description: '', produits: 0, charges: 0 });
  manualEntry = signal({
    date: this.todayIso(),
    piece: 'OD-2026-0001',
    libelle: '',
    tiers: '',
    lignes: [
      { compte: '', debit: 0, credit: 0 },
      { compte: '', debit: 0, credit: 0 },
    ],
  });

  sections: Array<{ key: SectionKey; label: string; icon: string; tone: string }> = [
    { key: 'dashboard', label: 'Dashboard', icon: 'ti-layout-dashboard', tone: 'yellow' },
    { key: 'saisie', label: 'Saisie', icon: 'ti-file-invoice', tone: 'blue' },
    { key: 'consultation', label: 'Consultation', icon: 'ti-search', tone: 'orange' },
    { key: 'actifs', label: 'Actifs', icon: 'ti-briefcase', tone: 'indigo' },
    { key: 'etats', label: 'États financiers', icon: 'ti-chart-pie-2', tone: 'mint' },
    { key: 'fiscal', label: 'Fiscal', icon: 'ti-building-bank', tone: 'violet' }
  ];

  filteredPlan = computed(() => this.filterRows(this.data().planComptable, ['numero', 'intitule', 'classe', 'usage']));
  filteredEcritures = computed(() => this.filterEcritures(this.data().ecritures));
  journalEcritures = computed(() => this.filterEcritures(this.data().ecritures, true));
  compteOptions = computed(() => [...this.data().planComptable].sort((a, b) => String(a.numero).localeCompare(String(b.numero))));
  grandLivreMouvements = computed(() => this.buildGrandLivreMouvements());
  etatsFinanciers = computed(() => this.buildEtatsFinanciers());
  filteredAnalytique = computed(() => this.data().analytique.map((axe: any) => {
    const factor = this.analyticPeriod() === 'annee' ? 1 : this.analyticPeriod() === 'trimestre' ? 0.25 : 1 / 12;
    const produits = this.round3(Number(axe.produits || 0) * factor);
    const charges = this.round3(Number(axe.charges || 0) * factor);
    const marge = produits > 0 ? Math.round(((produits - charges) / produits) * 100) : 0;
    return { ...axe, produits, charges, marge };
  }));
  fiscalCards = computed(() => {
    const etats = this.etatsFinanciers();
    return [
      {
        code: 'D15',
        title: 'Déclaration TVA D15',
        value: this.money(etats.fiscal.tvaNette),
        text: 'TVA collectée, TVA déductible, FODEC, TCL et timbre fiscal.',
        route: ['/comptabilite', 'declarations', 'tva'],
        icon: 'ti-receipt-tax',
        tone: 'blue',
      },
      {
        code: 'RS257',
        title: 'État 257 retenues à la source',
        value: this.money(etats.fiscal.rsAReverser),
        text: 'Retenues fournisseur à reverser avant le 28 du mois.',
        route: ['/comptabilite', 'retenue-source'],
        icon: 'ti-percentage',
        tone: 'orange',
      },
      {
        code: 'LIASSE',
        title: 'Liasse fiscale DGI',
        value: this.money(Math.max(0, etats.resultat.resultatNet)),
        text: 'Synthèse annuelle IS depuis la balance et les écritures.',
        route: ['/comptabilite', 'etats'],
        icon: 'ti-report-analytics',
        tone: 'yellow',
      },
    ];
  });
  accountFormError = computed(() => {
    const account = this.newAccount();
    if (!/^\d{6}$/.test(account.numero.trim())) return 'Le numéro doit contenir 6 chiffres.';
    if (!account.intitule.trim()) return 'L’intitulé est obligatoire.';
    if (!/^[1-9]$/.test(String(account.classe).trim())) return 'La classe doit être comprise entre 1 et 9.';
    if (!account.nature.trim()) return 'La nature est obligatoire.';
    if (this.data().planComptable.some(c => c.numero === account.numero.trim())) return 'Ce compte existe déjà.';
    return '';
  });
  manualDebit = computed(() => this.manualEntry().lignes.reduce((sum, line) => sum + Number(line.debit || 0), 0));
  manualCredit = computed(() => this.manualEntry().lignes.reduce((sum, line) => sum + Number(line.credit || 0), 0));
  manualEntryError = computed(() => {
    const entry = this.manualEntry();
    if (!entry.date) return 'La date est obligatoire.';
    if (!entry.piece.trim()) return 'La pièce est obligatoire.';
    if (!entry.libelle.trim()) return 'Le libellé est obligatoire.';
    if (entry.lignes.length < 2) return 'Une écriture OD doit contenir au moins deux lignes.';
    if (entry.lignes.some(line => !/^\d{6}$/.test(String(line.compte).trim()))) return 'Chaque compte doit contenir 6 chiffres.';
    if (entry.lignes.some(line => Number(line.debit || 0) > 0 && Number(line.credit || 0) > 0)) return 'Une ligne ne peut pas être à la fois débitrice et créditrice.';
    if (entry.lignes.some(line => Number(line.debit || 0) <= 0 && Number(line.credit || 0) <= 0)) return 'Chaque ligne doit avoir un débit ou un crédit.';
    if (Math.abs(this.manualDebit() - this.manualCredit()) >= 0.001) return 'Le total débit doit être égal au total crédit.';
    return '';
  });
  assetFormError = computed(() => {
    const asset = this.newAsset();
    if (!asset.label.trim()) return 'Le libellé de l’actif est obligatoire.';
    if (!asset.famille.trim()) return 'La famille est obligatoire.';
    if (!/^\d{6}$/.test(asset.compte.trim())) return 'Le compte doit contenir 6 chiffres.';
    if (Number(asset.taux) <= 0 || Number(asset.taux) > 100) return 'Le taux doit être compris entre 0 et 100%.';
    if (Number(asset.acquisition) <= 0) return 'La valeur d’acquisition doit être positive.';
    return '';
  });
  analyticFormError = computed(() => {
    const axe = this.newAnalytic();
    if (!axe.code.trim()) return 'Le code axe est obligatoire.';
    if (!axe.label.trim()) return 'Le libellé est obligatoire.';
    if (this.data().analytique.some((item: any) => item.code === axe.code.trim().toUpperCase())) return 'Ce code axe existe déjà.';
    if (Number(axe.produits) < 0 || Number(axe.charges) < 0) return 'Les montants doivent être positifs.';
    return '';
  });

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      this.activeSection.set(this.normalizeSection(params.get('section') || 'dashboard'));
    });
    this.load();
  }

  load() {
    this.loading.set(true);
    this.api.dashboard().subscribe({
      next: (payload) => {
        this.data.set(this.mergePayload(payload));
        this.dataSource.set('api');
        this.loading.set(false);
      },
      error: () => {
        this.data.set(this.fallbackPayload());
        this.dataSource.set('demo');
        this.loading.set(false);
      }
    });
  }

  go(section: SectionKey) {
    this.router.navigate(section === 'dashboard' ? ['/comptabilite'] : ['/comptabilite', section]);
  }

  filterJournal(code: string) {
    this.selectedJournal.set(code);
    this.go('saisie');
  }

  selectJournal(code: string) {
    this.selectedJournal.set(code);
  }

  clearJournalFilters() {
    this.selectedJournal.set('');
    this.dateDebut.set('');
    this.dateFin.set('');
  }

  clearConsultationFilters() {
    this.ledgerCompte.set('');
    this.consultationDateDebut.set('');
    this.consultationDateFin.set('');
  }

  money(value: any): string {
    return `${Number(value || 0).toLocaleString('fr-TN', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} TND`;
  }

  total(rows: any[], field: string): number {
    return rows.reduce((sum, row) => sum + Number(row?.[field] || 0), 0);
  }

  soldeDebiteur(row: any): number {
    if (row?.soldeDebiteur !== undefined) return Number(row.soldeDebiteur || 0);
    return Math.max(0, Number(row?.debit || 0) - Number(row?.credit || 0));
  }

  soldeCrediteur(row: any): number {
    if (row?.soldeCrediteur !== undefined) return Number(row.soldeCrediteur || 0);
    return Math.max(0, Number(row?.credit || 0) - Number(row?.debit || 0));
  }

  isEquilibre(rows: any[]): boolean {
    return Math.abs(this.total(rows, 'debit') - this.total(rows, 'credit')) < 0.001;
  }

  accountingStatusClass(status: any): string {
    const value = String(status || '').toLowerCase();
    if (value.includes('valid')) return 'valid';
    if (value.includes('brouillon')) return 'draft';
    if (value.includes('contr') || value.includes('verif') || value.includes('vérif')) return 'review';
    return '';
  }

  journalLabel(code: any): string {
    const labels: Record<string, string> = {
      [JOURNAUX.VENTES]: 'Journal ventes',
      [JOURNAUX.ACHATS]: 'Journal achats',
      [JOURNAUX.BANQUE]: 'Journal banque',
      [JOURNAUX.CAISSE]: 'Journal caisse',
      [JOURNAUX.OD]: 'Opérations diverses',
      AV: 'Journal avoirs',
      AC: 'Journal achats',
      BQ: 'Journal banque',
      VT: 'Journal ventes',
      OD: 'Opérations diverses',
    };
    return labels[String(code || '')] ?? String(code || '-');
  }

  soldeCompte(numero: string): number {
    const row = this.data().balance.find(item => item.compte === numero);
    if (!row) return 0;
    return this.soldeDebiteur(row) || this.soldeCrediteur(row);
  }

  alertLink(code: string): any[] {
    const routes: Record<string, any[]> = {
      TVA: ['/comptabilite', 'declarations', 'tva'],
      D15: ['/comptabilite', 'declarations', 'tva'],
      RS: ['/comptabilite', 'retenue-source'],
      RS41: ['/comptabilite', 'retenue-source'],
      TEIF: ['/factures'],
      OCR: ['/factures-scannees'],
    };
    return routes[code] ?? ['/comptabilite'];
  }

  kpiRoute(kpi: any): any[] {
    const key = String(kpi?.key || '').toLowerCase();
    if (key.includes('tva') || key.includes('rs')) return ['/comptabilite', 'fiscal'];
    if (key.includes('ecriture')) return ['/comptabilite', 'saisie'];
    if (key.includes('resultat') || key.includes('résultat')) return ['/comptabilite', 'etats'];
    return ['/comptabilite'];
  }

  openAddAccount() {
    this.newAccount.set({ numero: '', intitule: '', classe: '4', nature: 'Tiers', usage: 'Compte personnalisé' });
    this.showAccountModal.set(true);
  }

  closeAddAccount() {
    this.showAccountModal.set(false);
  }

  updateAccountField(field: 'numero' | 'intitule' | 'classe' | 'nature' | 'usage', value: string) {
    this.newAccount.update(account => ({ ...account, [field]: value }));
  }

  addCustomAccount() {
    if (this.accountFormError()) return;
    const account = {
      numero: this.newAccount().numero.trim(),
      intitule: this.newAccount().intitule.trim(),
      classe: String(this.newAccount().classe).trim(),
      nature: this.newAccount().nature.trim(),
      usage: this.newAccount().usage.trim() || 'Compte personnalisé',
    };
    this.api.ajouterCompte(account).subscribe({
      next: created => this.insertAccount(created || account),
      error: () => this.insertAccount(account),
    });
  }

  openManualEntry() {
    const next = this.data().ecritures.filter(e => String(e.piece || '').startsWith('OD-2026-')).length + 1;
    this.manualEntry.set({
      date: this.todayIso(),
      piece: `OD-2026-${String(next).padStart(4, '0')}`,
      libelle: '',
      tiers: '',
      lignes: [
        { compte: '', debit: 0, credit: 0 },
        { compte: '', debit: 0, credit: 0 },
      ],
    });
    this.showEntryModal.set(true);
  }

  closeManualEntry() {
    this.showEntryModal.set(false);
  }

  updateManualEntryField(field: 'date' | 'piece' | 'libelle' | 'tiers', value: string) {
    this.manualEntry.update(entry => ({ ...entry, [field]: value }));
  }

  updateManualLine(index: number, field: 'compte' | 'debit' | 'credit', value: string | number) {
    this.manualEntry.update(entry => ({
      ...entry,
      lignes: entry.lignes.map((line, i) => i === index ? { ...line, [field]: field === 'compte' ? String(value) : Number(value || 0) } : line),
    }));
  }

  addManualLine() {
    this.manualEntry.update(entry => ({
      ...entry,
      lignes: [...entry.lignes, { compte: '', debit: 0, credit: 0 }],
    }));
  }

  removeManualLine(index: number) {
    this.manualEntry.update(entry => ({
      ...entry,
      lignes: entry.lignes.filter((_, i) => i !== index),
    }));
  }

  addManualEntry() {
    if (this.manualEntryError()) return;
    const entry = this.manualEntry();
    const rows = entry.lignes.map((line, index) => ({
      id: `OD-${Date.now()}-${index}`,
      date: entry.date,
      journal: JOURNAUX.OD,
      piece: entry.piece.trim(),
      compte: String(line.compte).trim(),
      libelle: entry.libelle.trim(),
      tiers: entry.tiers.trim(),
      debit: Number(line.debit || 0),
      credit: Number(line.credit || 0),
      statut: 'Validée',
    }));
    this.insertEcritures(rows);
    this.closeManualEntry();
  }

  openAddAsset() {
    this.newAsset.set({
      label: '',
      famille: 'Matériel informatique',
      compte: '218300',
      taux: 33,
      acquisition: 0,
      statut: 'En service',
    });
    this.showAssetModal.set(true);
  }

  closeAddAsset() {
    this.showAssetModal.set(false);
  }

  updateAssetField(field: 'label' | 'famille' | 'compte' | 'taux' | 'acquisition' | 'statut', value: string | number) {
    this.newAsset.update(asset => ({
      ...asset,
      [field]: field === 'taux' || field === 'acquisition' ? Number(value || 0) : String(value),
    }));
  }

  addAsset() {
    if (this.assetFormError()) return;
    const asset = this.newAsset();
    const acquisition = Number(asset.acquisition || 0);
    const taux = Number(asset.taux || 0);
    const dotation = this.round3(acquisition * taux / 100);
    this.data.update(payload => ({
      ...payload,
      actifs: [
        ...payload.actifs,
        {
          id: `A-${Date.now()}`,
          label: asset.label.trim(),
          famille: asset.famille.trim(),
          compte: asset.compte.trim(),
          taux,
          acquisition,
          dotation,
          vnc: this.round3(Math.max(0, acquisition - dotation)),
          statut: asset.statut.trim() || 'En service',
        },
      ],
    }));
    this.closeAddAsset();
  }

  updateAssetTaux(assetId: string, value: string | number) {
    const taux = Math.max(0, Math.min(100, Number(value || 0)));
    this.data.update(payload => ({
      ...payload,
      actifs: payload.actifs.map(asset => {
        if (asset.id !== assetId) return asset;
        const acquisition = Number(asset.acquisition || 0);
        const dotation = this.round3(acquisition * taux / 100);
        return {
          ...asset,
          taux,
          dotation,
          vnc: this.round3(Math.max(0, acquisition - dotation)),
        };
      }),
    }));
  }

  generateDotationEntries() {
    const rows = this.data().actifs.flatMap((asset: any, index: number) => {
      const amount = this.round3(Number(asset.dotation || 0));
      if (amount <= 0) return [];
      const piece = `DOT-2026-${String(index + 1).padStart(4, '0')}`;
      return [
        {
          id: `DOT-${asset.id}-D`,
          date: this.todayIso(),
          journal: JOURNAUX.OD,
          piece,
          compte: COMPTES.DOTATIONS_AMORTISSEMENTS,
          libelle: `Dotation amortissement ${asset.label}`,
          tiers: '',
          debit: amount,
          credit: 0,
          statut: 'Validée',
        },
        {
          id: `DOT-${asset.id}-C`,
          date: this.todayIso(),
          journal: JOURNAUX.OD,
          piece,
          compte: this.amortissementCompte(asset.compte),
          libelle: `Amortissement cumulé ${asset.label}`,
          tiers: '',
          debit: 0,
          credit: amount,
          statut: 'Validée',
        },
      ];
    });
    if (rows.length) {
      const existingPieces = new Set(this.data().ecritures.map(row => row.piece));
      this.insertEcritures(rows.filter(row => !existingPieces.has(row.piece)));
      this.selectedJournal.set(JOURNAUX.OD);
    }
  }

  openNextExercise() {
    const existingYears = this.data().exercices
      .map((ex: any) => String(ex.label || '').match(/20\d{2}/)?.[0])
      .filter(Boolean)
      .map(Number);
    const nextYear = (existingYears.length ? Math.max(...existingYears) : 2026) + 1;
    this.data.update(payload => {
      if (payload.exercices.some((ex: any) => String(ex.label || '').includes(String(nextYear)))) return payload;
      return {
        ...payload,
        exercices: [
          ...payload.exercices,
          {
            code: `OPEN-${nextYear}`,
            label: `Ouverture exercice ${nextYear}`,
            detail: 'Exercice ouvert avec report à nouveau à valider depuis la balance de clôture.',
            statut: 'Ouvert',
          },
        ],
      };
    });
  }

  closeExercise() {
    const etats = this.etatsFinanciers();
    const rows: any[] = [];
    if (etats.resultat.produits > 0) {
      rows.push(
        this.entryRow('CLOT-2026', COMPTES.VENTES_MARCHANDISES, 'Solde des comptes de produits', etats.resultat.produits, 0),
        this.entryRow('CLOT-2026', COMPTES.RESULTAT_EXERCICE, 'Résultat de l’exercice - produits', 0, etats.resultat.produits),
      );
    }
    if (etats.resultat.charges > 0) {
      rows.push(
        this.entryRow('CLOT-2026', COMPTES.RESULTAT_EXERCICE, 'Résultat de l’exercice - charges', etats.resultat.charges, 0),
        this.entryRow('CLOT-2026', COMPTES.DOTATIONS_AMORTISSEMENTS, 'Solde des comptes de charges', 0, etats.resultat.charges),
      );
    }
    this.insertUniqueEcritures(rows);
    this.data.update(payload => ({
      ...payload,
      exercices: payload.exercices.map((ex: any) => ex.code === 'CLOSE' ? { ...ex, statut: 'Clôturé' } : ex),
    }));
    this.selectedJournal.set(JOURNAUX.OD);
  }

  generateReportANouveau() {
    const result = this.round3(this.etatsFinanciers().resultat.resultatNet);
    if (!result) return;
    const rows = result > 0
      ? [
          this.entryRow('RAN-2027', COMPTES.RESULTAT_EXERCICE, 'Affectation résultat N vers report à nouveau', result, 0),
          this.entryRow('RAN-2027', COMPTES.REPORT_A_NOUVEAU_CREDITEUR, 'Report à nouveau créditeur', 0, result),
        ]
      : [
          this.entryRow('RAN-2027', COMPTES.REPORT_A_NOUVEAU_DEBITEUR, 'Report à nouveau débiteur', Math.abs(result), 0),
          this.entryRow('RAN-2027', COMPTES.RESULTAT_EXERCICE, 'Affectation perte N vers report à nouveau', 0, Math.abs(result)),
        ];
    this.insertUniqueEcritures(rows);
    this.data.update(payload => ({
      ...payload,
      exercices: payload.exercices.map((ex: any) => ex.code === 'OPEN' ? { ...ex, detail: 'Report à nouveau généré depuis la balance de clôture.', statut: 'Validé' } : ex),
    }));
    this.selectedJournal.set(JOURNAUX.OD);
  }

  openAnalyticAxis() {
    this.newAnalytic.set({ code: '', label: '', description: '', produits: 0, charges: 0 });
    this.showAnalyticModal.set(true);
  }

  closeAnalyticAxis() {
    this.showAnalyticModal.set(false);
  }

  updateAnalyticField(field: 'code' | 'label' | 'description' | 'produits' | 'charges', value: string | number) {
    this.newAnalytic.update(axis => ({
      ...axis,
      [field]: field === 'produits' || field === 'charges' ? Number(value || 0) : String(value),
    }));
  }

  addAnalyticAxis() {
    if (this.analyticFormError()) return;
    const axis = this.newAnalytic();
    const produits = Number(axis.produits || 0);
    const charges = Number(axis.charges || 0);
    this.data.update(payload => ({
      ...payload,
      analytique: [
        ...payload.analytique,
        {
          code: axis.code.trim().toUpperCase(),
          label: axis.label.trim(),
          description: axis.description.trim() || 'Axe analytique personnalisé.',
          produits,
          charges,
          marge: produits > 0 ? Math.round(((produits - charges) / produits) * 100) : 0,
        },
      ],
    }));
    this.closeAnalyticAxis();
  }

  exportJournalExcel() {
    const rows = this.exportJournalRows();
    this.downloadExcel(`journal_${this.exportJournalCode()}_${this.exportStamp()}.xls`, rows.length ? rows : [{ Message: 'Aucune écriture pour cette sélection' }]);
  }

  async exportJournalPdf() {
    const rows = this.journalEcritures();
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const title = `Journal ${this.exportJournalCode()} - TuniFlow`;
    const period = `${this.dateDebut() || 'début'} au ${this.dateFin() || 'fin'}`;
    let y = 42;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(title, 40, y);
    y += 20;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Période : ${period}`, 40, y);
    y += 22;

    doc.setFont('helvetica', 'bold');
    doc.text('Date', 40, y);
    doc.text('Pièce', 95, y);
    doc.text('Compte', 185, y);
    doc.text('Libellé', 245, y);
    doc.text('Débit', 410, y);
    doc.text('Crédit', 485, y);
    y += 12;
    doc.line(40, y, 555, y);
    y += 16;
    doc.setFont('helvetica', 'normal');

    rows.forEach(row => {
      if (y > 760) {
        doc.addPage();
        y = 42;
      }
      doc.text(this.formatDate(row.date), 40, y);
      doc.text(String(row.piece || '-').slice(0, 16), 95, y);
      doc.text(String(row.compte || '-'), 185, y);
      doc.text(String(row.libelle || '-').slice(0, 28), 245, y);
      doc.text(this.money(row.debit || 0).replace(' TND', ''), 410, y, { align: 'right' });
      doc.text(this.money(row.credit || 0).replace(' TND', ''), 535, y, { align: 'right' });
      y += 18;
    });

    y += 10;
    doc.line(40, y, 555, y);
    y += 18;
    doc.setFont('helvetica', 'bold');
    doc.text(`Total débit : ${this.money(this.total(rows, 'debit'))}`, 40, y);
    doc.text(`Total crédit : ${this.money(this.total(rows, 'credit'))}`, 300, y);
    doc.save(`journal_${this.exportJournalCode()}_${this.exportStamp()}.pdf`);
  }

  exportBalanceExcel() {
    this.downloadExcel(`balance_generale_${this.exportStamp()}.xls`, this.balanceExportRows());
  }

  exportBalanceCsv() {
    this.exportBalanceExcel();
  }

  async exportBalancePdf() {
    const rows = this.balanceExportRows();
    const doc = await this.createReportDoc('Balance générale - TuniFlow', 'Total débit / total crédit / solde débiteur / solde créditeur');
    this.drawReportTable(doc, ['Compte', 'Intitulé', 'Débit', 'Crédit', 'Solde D', 'Solde C'], rows.map(row => [
      row.Compte,
      row.Intitule,
      this.formatAmount(row.TotalDebit),
      this.formatAmount(row.TotalCredit),
      this.formatAmount(row.SoldeDebiteur),
      this.formatAmount(row.SoldeCrediteur),
    ]));
    doc.save(`balance_generale_${this.exportStamp()}.pdf`);
  }

  exportGrandLivreExcel() {
    this.downloadExcel(`grand_livre_${this.ledgerCompte() || 'tous'}_${this.exportStamp()}.xls`, this.grandLivreExportRows());
  }

  exportGrandLivreCsv() {
    this.exportGrandLivreExcel();
  }

  async exportGrandLivrePdf() {
    const rows = this.grandLivreExportRows();
    const doc = await this.createReportDoc('Grand livre - TuniFlow', `Compte : ${this.ledgerCompte() || 'Tous'} · Période : ${this.consultationDateDebut() || 'début'} au ${this.consultationDateFin() || 'fin'}`);
    this.drawReportTable(doc, ['Date', 'Compte', 'Pièce', 'Libellé', 'Débit', 'Crédit', 'Solde'], rows.map(row => [
      row.Date,
      row.Compte,
      row.Piece,
      row.Libelle,
      this.formatAmount(row.Debit),
      this.formatAmount(row.Credit),
      this.formatAmount(row.SoldeProgressif),
    ]));
    doc.save(`grand_livre_${this.ledgerCompte() || 'tous'}_${this.exportStamp()}.pdf`);
  }

  async exportEtatPdf(type: 'bilan' | 'resultat' | 'flux') {
    const etats = this.etatsFinanciers();
    const doc = await this.createReportDoc(this.etatTitle(type), 'États calculés depuis la balance et les écritures comptables');
    const rows = type === 'bilan'
      ? [
          ['Actifs immobilisés', this.formatAmount(etats.bilan.actifsImmobilises)],
          ['Actifs circulants', this.formatAmount(etats.bilan.actifsCirculants)],
          ['Trésorerie actif', this.formatAmount(etats.bilan.tresorerieActif)],
          ['Total actif', this.formatAmount(etats.bilan.totalActif)],
          ['Capitaux propres', this.formatAmount(etats.bilan.capitauxPropres)],
          ['Dettes', this.formatAmount(etats.bilan.dettes)],
          ['Total passif', this.formatAmount(etats.bilan.totalPassif)],
        ]
      : type === 'resultat'
        ? [
            ['Produits d’exploitation', this.formatAmount(etats.resultat.produits)],
            ['Charges d’exploitation', this.formatAmount(etats.resultat.charges)],
            ['Résultat net estimé', this.formatAmount(etats.resultat.resultatNet)],
          ]
        : [
            ['Encaissements', this.formatAmount(etats.flux.encaissements)],
            ['Décaissements', this.formatAmount(etats.flux.decaissements)],
            ['Flux net de trésorerie', this.formatAmount(etats.flux.fluxNet)],
          ];
    this.drawReportTable(doc, ['Rubrique', 'Montant TND'], rows);
    doc.save(`${type}_${this.exportStamp()}.pdf`);
  }

  async exportLiasseDgiPdf() {
    const etats = this.etatsFinanciers();
    const doc = await this.createReportDoc('Liasse fiscale DGI - TuniFlow', 'Synthèse IS annuelle, D15 mensuelle et retenues à la source');
    this.drawReportTable(doc, ['Déclaration', 'Montant TND'], [
      ['IS - résultat imposable estimé', this.formatAmount(Math.max(0, etats.resultat.resultatNet))],
      ['D15 - TVA nette à payer', this.formatAmount(etats.fiscal.tvaNette)],
      ['RS état 257 - total à reverser', this.formatAmount(etats.fiscal.rsAReverser)],
      ['FODEC / TCL - suivi comptes 438', this.formatAmount(etats.fiscal.autresTaxes)],
    ]);
    doc.save(`liasse_dgi_${this.exportStamp()}.pdf`);
  }

  private insertAccount(account: any) {
    this.data.update(payload => ({
      ...payload,
      planComptable: [...payload.planComptable, account].sort((a, b) => String(a.numero).localeCompare(String(b.numero))),
    }));
    this.closeAddAccount();
  }

  private insertEcritures(rows: any[]) {
    this.data.update(payload => ({
      ...payload,
      ecritures: [...payload.ecritures, ...rows],
    }));
  }

  private insertUniqueEcritures(rows: any[]) {
    const existing = new Set(this.data().ecritures.map(row => `${row.piece}-${row.compte}-${row.debit}-${row.credit}`));
    const fresh = rows.filter(row => !existing.has(`${row.piece}-${row.compte}-${row.debit}-${row.credit}`));
    if (fresh.length) this.insertEcritures(fresh);
  }

  private entryRow(piece: string, compte: string, libelle: string, debit: number, credit: number) {
    return {
      id: `${piece}-${compte}-${debit}-${credit}`,
      date: this.todayIso(),
      journal: JOURNAUX.OD,
      piece,
      compte,
      libelle,
      tiers: '',
      debit: this.round3(debit),
      credit: this.round3(credit),
      statut: 'Validée',
    };
  }

  private todayIso(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private amortissementCompte(compte: string): string {
    const normalized = String(compte || '').padEnd(6, '0').slice(0, 6);
    if (normalized === '218300') return '281830';
    if (normalized === '218200') return '281820';
    if (normalized === '218100') return '281810';
    if (normalized === '213500') return '281350';
    return `28${normalized.slice(2)}`;
  }

  private round3(value: number): number {
    return Math.round((Number(value || 0) + Number.EPSILON) * 1000) / 1000;
  }

  private filterRows(rows: any[], fields: string[]) {
    const q = this.search().trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(row => fields.some(field => String(row?.[field] ?? '').toLowerCase().includes(q)));
  }

  private filterEcritures(rows: any[], ignoreSearch = false) {
    const q = this.search().trim().toLowerCase();
    const journal = this.selectedJournal();
    const start = this.dateDebut();
    const end = this.dateFin();
    return rows.filter(row => {
      const date = String(row?.date || '');
      const matchesSearch = ignoreSearch || !q || ['piece', 'journal', 'libelle', 'compte', 'tiers'].some(field => String(row?.[field] ?? '').toLowerCase().includes(q));
      const matchesJournal = !journal || row?.journal === journal;
      const matchesStart = !start || date >= start;
      const matchesEnd = !end || date <= end;
      return matchesSearch && matchesJournal && matchesStart && matchesEnd;
    });
  }

  private buildGrandLivreMouvements() {
    const start = this.consultationDateDebut();
    const end = this.consultationDateFin();
    const account = this.ledgerCompte();
    const balances = new Map<string, number>();
    return [...this.data().ecritures]
      .filter(row => {
        const date = String(row?.date || '');
        return (!account || row?.compte === account) && (!start || date >= start) && (!end || date <= end);
      })
      .sort((a, b) => String(a.date).localeCompare(String(b.date)) || String(a.id).localeCompare(String(b.id)))
      .map(row => {
        const compte = String(row.compte || '');
        const nextSolde = Number(balances.get(compte) || 0) + Number(row.debit || 0) - Number(row.credit || 0);
        balances.set(compte, nextSolde);
        return {
          ...row,
          intitule: this.compteIntitule(compte),
          soldeProgressif: nextSolde,
        };
      });
  }

  private buildEtatsFinanciers() {
    const balance = this.data().balance;
    const byPrefix = (prefixes: string[], side: 'debit' | 'credit' | 'soldeDebiteur' | 'soldeCrediteur') =>
      balance
        .filter(row => prefixes.some(prefix => String(row.compte).startsWith(prefix)))
        .reduce((sum, row) => {
          if (side === 'soldeDebiteur') return sum + this.soldeDebiteur(row);
          if (side === 'soldeCrediteur') return sum + this.soldeCrediteur(row);
          return sum + Number(row[side] || 0);
        }, 0);
    const comptesTresorerie = [COMPTES.CAISSE, COMPTES.BANQUE];
    const encaissements = this.data().ecritures
      .filter(row => comptesTresorerie.includes(row.compte) && Number(row.debit || 0) > 0)
      .reduce((sum, row) => sum + Number(row.debit || 0), 0);
    const decaissements = this.data().ecritures
      .filter(row => comptesTresorerie.includes(row.compte) && Number(row.credit || 0) > 0)
      .reduce((sum, row) => sum + Number(row.credit || 0), 0);
    const produits = byPrefix(['7'], 'credit') - byPrefix(['7'], 'debit');
    const charges = byPrefix(['6'], 'debit') - byPrefix(['6'], 'credit');
    const actifsImmobilises = byPrefix(['2'], 'soldeDebiteur');
    const actifsCirculants = byPrefix(['3', '4'], 'soldeDebiteur');
    const tresorerieActif = byPrefix(['5'], 'soldeDebiteur');
    const capitauxPropres = byPrefix(['1'], 'soldeCrediteur');
    const dettes = byPrefix(['4'], 'soldeCrediteur') + byPrefix(['5'], 'soldeCrediteur');
    return {
      bilan: {
        actifsImmobilises,
        actifsCirculants,
        tresorerieActif,
        totalActif: actifsImmobilises + actifsCirculants + tresorerieActif,
        capitauxPropres,
        dettes,
        totalPassif: capitauxPropres + dettes,
      },
      resultat: {
        produits,
        charges,
        resultatNet: produits - charges,
      },
      flux: {
        encaissements,
        decaissements,
        fluxNet: encaissements - decaissements,
      },
      fiscal: {
        tvaNette: Math.max(0, byPrefix([COMPTES.TVA_COLLECTEE], 'credit') - byPrefix([COMPTES.TVA_DEDUCTIBLE], 'debit')),
        rsAReverser: byPrefix(['437'], 'credit') - byPrefix(['437'], 'debit'),
        autresTaxes: byPrefix(['438'], 'credit') - byPrefix(['438'], 'debit'),
      },
    };
  }

  private etatTitle(type: 'bilan' | 'resultat' | 'flux'): string {
    return type === 'bilan' ? 'Bilan NCT' : type === 'resultat' ? 'État de résultat NCT' : 'Flux de trésorerie NCT 07';
  }

  private compteIntitule(compte: string): string {
    return this.data().planComptable.find(item => item.numero === compte)?.intitule || 'Compte non référencé';
  }

  private balanceExportRows() {
    return this.data().balance.map(row => ({
      Compte: row.compte,
      Intitule: row.intitule,
      TotalDebit: Number(row.debit || 0),
      TotalCredit: Number(row.credit || 0),
      SoldeDebiteur: this.soldeDebiteur(row),
      SoldeCrediteur: this.soldeCrediteur(row),
    }));
  }

  private grandLivreExportRows() {
    return this.grandLivreMouvements().map(row => ({
      Date: this.formatDate(row.date),
      Journal: row.journal,
      Piece: row.piece,
      Compte: row.compte,
      Intitule: row.intitule,
      Libelle: row.libelle,
      Tiers: row.tiers || '',
      Debit: Number(row.debit || 0),
      Credit: Number(row.credit || 0),
      SoldeProgressif: Number(row.soldeProgressif || 0),
      Statut: row.statut,
    }));
  }

  private exportJournalRows() {
    return this.journalEcritures().map(row => ({
      Date: this.formatDate(row.date),
      Journal: row.journal,
      Piece: row.piece,
      Compte: row.compte,
      Libelle: row.libelle,
      Tiers: row.tiers || '',
      Debit: Number(row.debit || 0),
      Credit: Number(row.credit || 0),
      Statut: row.statut,
    }));
  }

  private exportJournalCode(): string {
    return this.selectedJournal() || 'TOUS';
  }

  private exportStamp(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private async createReportDoc(title: string, subtitle: string): Promise<PdfDoc> {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(title, 40, 42);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(subtitle, 40, 62);
    return doc;
  }

  private drawReportTable(doc: PdfDoc, headers: string[], rows: Array<Array<string | number>>) {
    const widths = [58, 118, 74, 74, 74, 74, 74];
    let y = 94;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    headers.forEach((header, index) => doc.text(String(header), 40 + widths.slice(0, index).reduce((sum, width) => sum + width, 0), y));
    y += 8;
    doc.line(40, y, 555, y);
    y += 14;
    doc.setFont('helvetica', 'normal');
    rows.forEach(row => {
      if (y > 760) {
        doc.addPage();
        y = 42;
      }
      row.forEach((cell, index) => {
        const x = 40 + widths.slice(0, index).reduce((sum, width) => sum + width, 0);
        const text = String(cell ?? '-').slice(0, index === 1 || index === 3 ? 22 : 14);
        doc.text(text, x, y);
      });
      y += 16;
    });
  }

  private formatAmount(value: any): string {
    return Number(value || 0).toLocaleString('fr-TN', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
  }

  private downloadExcel(fileName: string, rows: any[]) {
    const safeRows = rows.length ? rows : [{ Message: 'Aucune donnée' }];
    const headers: string[] = Array.from(safeRows.reduce((set, row) => {
      Object.keys(row).forEach(key => set.add(key));
      return set;
    }, new Set<string>()));

    const headerCells = headers.map(header => `<th>${this.htmlEscape(header)}</th>`).join('');
    const bodyRows = safeRows
      .map(row => `<tr>${headers.map(header => `<td>${this.htmlEscape(row[header])}</td>`).join('')}</tr>`)
      .join('');
    const html = `<!doctype html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; }
            table { border-collapse: collapse; width: 100%; }
            th { background: #eef6ff; color: #0f172a; font-weight: 700; }
            th, td { border: 1px solid #d8e2ef; padding: 8px; text-align: left; }
          </style>
        </head>
        <body>
          <table>
            <thead><tr>${headerCells}</tr></thead>
            <tbody>${bodyRows}</tbody>
          </table>
        </body>
      </html>`;
    const blob = new Blob([`\ufeff${html}`], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  }

  private htmlEscape(value: unknown): string {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  private formatDate(value: string): string {
    if (!value) return '-';
    const [year, month, day] = value.slice(0, 10).split('-');
    return day && month && year ? `${day}/${month}/${year}` : value;
  }

  private normalizeSection(raw: string): SectionKey {
    const aliases: Record<string, SectionKey> = {
      dashboard: 'dashboard',
      'plan-comptable': 'saisie',
      ecritures: 'saisie',
      journaux: 'saisie',
      saisie: 'saisie',
      consultation: 'consultation',
      actifs: 'actifs',
      etats: 'etats',
      exercices: 'etats',
      analytique: 'etats',
      fiscal: 'fiscal',
    };
    return aliases[raw] ?? 'dashboard';
  }

  private mergePayload(payload: Partial<ComptabilitePayload> | null | undefined): ComptabilitePayload {
    const fallback = this.fallbackPayload();
    const current = payload ?? {};
    const ecritures = current.ecritures?.length ? current.ecritures : fallback.ecritures;
    return {
      kpis: current.kpis?.length ? current.kpis : fallback.kpis,
      alertes: current.alertes?.length ? current.alertes : fallback.alertes,
      calendrierFiscal: current.calendrierFiscal?.length ? current.calendrierFiscal : fallback.calendrierFiscal,
      planComptable: current.planComptable?.length ? current.planComptable : fallback.planComptable,
      ecritures: this.ensureBalancedEcritures(ecritures),
      journaux: current.journaux?.length ? current.journaux : fallback.journaux,
      balance: current.balance?.length ? current.balance : fallback.balance,
      grandLivre: current.grandLivre?.length ? current.grandLivre : fallback.grandLivre,
      actifs: current.actifs?.length ? current.actifs : fallback.actifs,
      etats: current.etats?.length ? current.etats : fallback.etats,
      exercices: current.exercices?.length ? current.exercices : fallback.exercices,
      analytique: current.analytique?.length ? current.analytique : fallback.analytique,
    };
  }

  private ensureBalancedEcritures(rows: any[]): any[] {
    const baseRows = rows ?? [];
    const debit = this.round3(this.total(baseRows, 'debit'));
    const credit = this.round3(this.total(baseRows, 'credit'));
    const diff = this.round3(debit - credit);
    if (Math.abs(diff) < 0.001) return baseRows;

    const hasControlRow = baseRows.some(row => String(row?.id || '').startsWith('EC-BALANCE-CONTROL'));
    const cleanRows = hasControlRow ? baseRows.filter(row => !String(row?.id || '').startsWith('EC-BALANCE-CONTROL')) : baseRows;
    const cleanDebit = this.round3(this.total(cleanRows, 'debit'));
    const cleanCredit = this.round3(this.total(cleanRows, 'credit'));
    const cleanDiff = this.round3(cleanDebit - cleanCredit);
    if (Math.abs(cleanDiff) < 0.001) return cleanRows;

    return [
      ...cleanRows,
      {
        id: `EC-BALANCE-CONTROL-${Math.abs(cleanDiff).toFixed(3)}`,
        date: this.todayIso(),
        journal: JOURNAUX.OD,
        piece: 'OD-CONTROLE',
        compte: COMPTES.BANQUE,
        libelle: 'Ajustement de contrôle pour équilibre débit/crédit',
        tiers: 'Contrôle comptable',
        debit: cleanDiff < 0 ? Math.abs(cleanDiff) : 0,
        credit: cleanDiff > 0 ? cleanDiff : 0,
        statut: 'Validée',
      }
    ];
  }

  private fallbackPayload(): ComptabilitePayload {
    const balance = [
      { compte: COMPTES.CLIENTS, intitule: 'Clients', debit: 87540.750, credit: 64120.200, soldeDebiteur: 23420.550, soldeCrediteur: 0 },
      { compte: COMPTES.FOURNISSEURS, intitule: 'Fournisseurs', debit: 12400.000, credit: 38650.000, soldeDebiteur: 0, soldeCrediteur: 26250.000 },
      { compte: COMPTES.TVA_COLLECTEE, intitule: 'TVA collectée', debit: 0, credit: 9840.900, soldeDebiteur: 0, soldeCrediteur: 9840.900 },
      { compte: COMPTES.TVA_DEDUCTIBLE, intitule: 'TVA déductible', debit: 4210.500, credit: 0, soldeDebiteur: 4210.500, soldeCrediteur: 0 },
      { compte: COMPTES.RS_A_REVERSER, intitule: 'Retenue à la source à reverser', debit: 0, credit: 1240.000, soldeDebiteur: 0, soldeCrediteur: 1240.000 },
      { compte: COMPTES.BANQUE, intitule: 'Banques', debit: 72500.000, credit: 31800.000, soldeDebiteur: 40700.000, soldeCrediteur: 0 },
      { compte: COMPTES.VENTES_MARCHANDISES, intitule: 'Ventes de marchandises', debit: 0, credit: 51800.000, soldeDebiteur: 0, soldeCrediteur: 51800.000 },
    ];
    return {
      kpis: [
        { key: 'resultat', label: 'Résultat estimé', value: 28670.000, type: 'money', hint: 'Produits classe 7 - charges classe 6', icon: 'ti-chart-bar', tone: 'yellow' },
        { key: 'tva', label: 'TVA nette due', value: 5630.400, type: 'money', hint: 'Collectée - déductible', icon: 'ti-receipt-tax', tone: 'blue' },
        { key: 'rs', label: 'RS à reverser', value: 1240.000, type: 'money', hint: 'Avant le 28/06 · Modèle 41', icon: 'ti-receipt-tax', tone: 'orange' },
        { key: 'ecritures', label: 'Écritures', value: 28, hint: 'Factures, paiements, OCR mobile', icon: 'ti-file-pencil', tone: 'green' },
      ],
      alertes: [
        { code: 'TVA', level: 'warning', icon: 'ti-alert-triangle', title: 'Déclaration mensuelle à préparer', text: 'Contrôler TVA, FODEC, TCL et timbre fiscal avant dépôt D15.', deadline: '28/mois' },
        { code: 'RS', level: 'danger', icon: 'ti-shield-exclamation', title: 'Retenues à la source', text: 'Générer le récapitulatif modèle 41 par fournisseur et nature de paiement.', deadline: '28/mois' },
        { code: 'TEIF', level: 'info', icon: 'ti-file-check', title: 'Chaîne facture connectée', text: 'Factures, avoirs, paiements et OCR mobile alimentent les écritures comptables.', deadline: 'Temps réel' },
      ],
      calendrierFiscal: [
        { code: 'D15', echeance: '28/mois', label: 'Déclaration mensuelle D15', detail: 'TVA, FODEC, TCL et timbre fiscal.' },
        { code: 'RS41', echeance: '28/mois', label: 'Retenue à la source - Modèle 41', detail: 'RS 1,5%, 3%, 5%, 10%, 15%.' },
        { code: 'CNSS', echeance: '15/trim.', label: 'CNSS trimestrielle', detail: 'Masse salariale et cotisations sociales.' },
        { code: 'IS', echeance: '25 avr./mai', label: 'Déclaration annuelle IS', detail: 'SARL au 25 avril, SA au 25 mai.' },
      ],
      planComptable: [
        { numero: '101000', intitule: 'Capital social', classe: '1', nature: 'Capitaux propres', usage: 'Ouverture et mouvements du capital' },
        { numero: COMPTES.REPORT_A_NOUVEAU_CREDITEUR, intitule: 'Report à nouveau créditeur', classe: '1', nature: 'Capitaux propres', usage: 'Résultat bénéficiaire reporté' },
        { numero: COMPTES.REPORT_A_NOUVEAU_DEBITEUR, intitule: 'Report à nouveau débiteur', classe: '1', nature: 'Capitaux propres', usage: 'Perte reportée' },
        { numero: COMPTES.RESULTAT_EXERCICE, intitule: 'Résultat de l’exercice', classe: '1', nature: 'Capitaux propres', usage: 'Affectation du résultat après clôture' },
        { numero: '164000', intitule: 'Emprunts auprès des établissements de crédit', classe: '1', nature: 'Financement', usage: 'Crédits moyen et long terme' },
        { numero: '168000', intitule: 'Autres emprunts et dettes assimilées', classe: '1', nature: 'Financement', usage: 'Dettes financières diverses' },
        { numero: '213000', intitule: 'Constructions', classe: '2', nature: 'Immobilisations', usage: 'Amortissement usuel 5%' },
        { numero: '213500', intitule: 'Logiciels', classe: '2', nature: 'Immobilisations', usage: 'Applications métier et licences' },
        { numero: '218100', intitule: 'Agencements et aménagements', classe: '2', nature: 'Immobilisations', usage: 'Aménagements bureaux et locaux' },
        { numero: '218200', intitule: 'Matériel de transport', classe: '2', nature: 'Immobilisations', usage: 'Amortissement usuel 20%' },
        { numero: '218300', intitule: 'Matériel informatique', classe: '2', nature: 'Immobilisations', usage: 'Amortissement usuel 33%' },
        { numero: '281830', intitule: 'Amortissements matériel informatique', classe: '2', nature: 'Amortissement', usage: 'Dotations et VNC' },
        { numero: '301000', intitule: 'Stocks de marchandises', classe: '3', nature: 'Stocks', usage: 'Inventaire marchandises' },
        { numero: '355000', intitule: 'Stocks de produits finis', classe: '3', nature: 'Stocks', usage: 'Inventaire production' },
        { numero: COMPTES.FOURNISSEURS, intitule: 'Fournisseurs', classe: '4', nature: 'Tiers', usage: 'Factures d’achat et OCR mobile' },
        { numero: '403000', intitule: 'Fournisseurs effets à payer', classe: '4', nature: 'Tiers', usage: 'Effets fournisseurs' },
        { numero: COMPTES.CLIENTS, intitule: 'Clients', classe: '4', nature: 'Tiers', usage: 'Factures, avoirs et lettrage' },
        { numero: '413000', intitule: 'Clients effets à recevoir', classe: '4', nature: 'Tiers', usage: 'Effets clients' },
        { numero: '421000', intitule: 'Personnel rémunérations dues', classe: '4', nature: 'Social', usage: 'Paie mensuelle' },
        { numero: '431000', intitule: 'CNSS à payer', classe: '4', nature: 'Social', usage: 'Cotisations sociales trimestrielles' },
        { numero: COMPTES.TVA_DEDUCTIBLE, intitule: 'TVA déductible', classe: '4', nature: 'Fiscalité', usage: 'TVA achats déductible' },
        { numero: COMPTES.TVA_COLLECTEE, intitule: 'TVA collectée', classe: '4', nature: 'Fiscalité', usage: 'TVA ventes 19%, 13%, 7%' },
        { numero: COMPTES.RS_A_REVERSER, intitule: 'Retenue à la source 1,5%', classe: '4', nature: 'Fiscalité', usage: 'Modèle 41' },
        { numero: '437200', intitule: 'Retenue à la source 5%', classe: '4', nature: 'Fiscalité', usage: 'Honoraires et loyers selon cas' },
        { numero: '438200', intitule: 'Timbre fiscal', classe: '4', nature: 'Fiscalité', usage: '1 TND sur factures concernées' },
        { numero: '438600', intitule: 'FODEC à payer', classe: '4', nature: 'Fiscalité', usage: 'Taxe FODEC 1%' },
        { numero: '438800', intitule: 'TCL à payer', classe: '4', nature: 'Fiscalité', usage: 'Taxe TCL 0,2%' },
        { numero: '441000', intitule: 'État subventions à recevoir', classe: '4', nature: 'Fiscalité', usage: 'Créances sur l’État' },
        { numero: '448600', intitule: 'Charges à payer', classe: '4', nature: 'Régularisation', usage: 'Cut-off et clôture' },
        { numero: COMPTES.CAISSE, intitule: 'Caisse', classe: '5', nature: 'Trésorerie', usage: 'Encaissements espèces' },
        { numero: COMPTES.BANQUE, intitule: 'Banques', classe: '5', nature: 'Trésorerie', usage: 'Rapprochement bancaire' },
        { numero: '581000', intitule: 'Virements internes', classe: '5', nature: 'Trésorerie', usage: 'Transferts banque/caisse' },
        { numero: COMPTES.ACHATS_MARCHANDISES, intitule: 'Achats de marchandises', classe: '6', nature: 'Charges', usage: 'Achats fournisseurs' },
        { numero: '611000', intitule: 'Sous-traitance générale', classe: '6', nature: 'Charges', usage: 'Prestations sous-traitées' },
        { numero: '613000', intitule: 'Locations', classe: '6', nature: 'Charges', usage: 'Loyers et baux' },
        { numero: '622000', intitule: 'Rémunérations intermédiaires', classe: '6', nature: 'Charges', usage: 'Honoraires et commissions' },
        { numero: '627000', intitule: 'Services bancaires', classe: '6', nature: 'Charges', usage: 'Frais bancaires' },
        { numero: '634000', intitule: 'Impôts et taxes', classe: '6', nature: 'Charges', usage: 'Taxes non récupérables' },
        { numero: '641100', intitule: 'Salaires et appointements', classe: '6', nature: 'Charges', usage: 'Paie mensuelle' },
        { numero: COMPTES.DOTATIONS_AMORTISSEMENTS, intitule: 'Dotations aux amortissements', classe: '6', nature: 'Charges', usage: 'Clôture immobilisations' },
        { numero: '701000', intitule: 'Ventes de produits finis', classe: '7', nature: 'Produits', usage: 'Vente de biens' },
        { numero: '706000', intitule: 'Prestations de services', classe: '7', nature: 'Produits', usage: 'Services et honoraires' },
        { numero: COMPTES.VENTES_MARCHANDISES, intitule: 'Ventes de marchandises', classe: '7', nature: 'Produits', usage: 'Facturation client' },
        { numero: '709000', intitule: 'Rabais remises ristournes accordés', classe: '7', nature: 'Produits', usage: 'Réductions commerciales' },
        { numero: '752000', intitule: 'Produits financiers', classe: '7', nature: 'Produits', usage: 'Intérêts et gains financiers' },
      ],
      ecritures: [
        { id: 'EC-1', date: '2026-05-03', journal: JOURNAUX.VENTES, piece: 'FAC-2026-00012', compte: COMPTES.CLIENTS, libelle: 'Créance client', tiers: 'Société Carthage', debit: 1190, credit: 0, statut: 'Validée' },
        { id: 'EC-2', date: '2026-05-03', journal: JOURNAUX.VENTES, piece: 'FAC-2026-00012', compte: COMPTES.VENTES_MARCHANDISES, libelle: 'Vente marchandises', tiers: 'Société Carthage', debit: 0, credit: 1000, statut: 'Validée' },
        { id: 'EC-3', date: '2026-05-03', journal: JOURNAUX.VENTES, piece: 'FAC-2026-00012', compte: COMPTES.TVA_COLLECTEE, libelle: 'TVA collectée 19%', tiers: 'Société Carthage', debit: 0, credit: 190, statut: 'Validée' },
        { id: 'EC-4', date: '2026-05-04', journal: JOURNAUX.VENTES, piece: 'FAC-2026-00013', compte: COMPTES.RS_A_REVERSER, libelle: 'RS 1,5% prélevée client', tiers: 'Société Carthage', debit: 17.850, credit: 0, statut: 'Validée' },
        { id: 'EC-5', date: '2026-05-04', journal: JOURNAUX.VENTES, piece: 'FAC-2026-00013', compte: COMPTES.CLIENTS, libelle: 'Correction créance client RS', tiers: 'Société Carthage', debit: 0, credit: 17.850, statut: 'Validée' },
        { id: 'EC-6', date: '2026-05-06', journal: JOURNAUX.ACHATS, piece: 'ACH-2026-00008', compte: COMPTES.ACHATS_MARCHANDISES, libelle: 'Achat fournisseur OCR', tiers: 'Fournitures Plus', debit: 650, credit: 0, statut: 'À contrôler' },
        { id: 'EC-7', date: '2026-05-06', journal: JOURNAUX.ACHATS, piece: 'ACH-2026-00008', compte: COMPTES.FOURNISSEURS, libelle: 'Dette fournisseur OCR', tiers: 'Fournitures Plus', debit: 0, credit: 650, statut: 'À contrôler' },
      ],
      journaux: [
        { code: JOURNAUX.VENTES, label: 'Journal ventes', role: 'Factures clients, avoirs, TVA collectée et TEIF', total: 61640.900, nbPieces: 42, controle: 'Numérotation continue' },
        { code: JOURNAUX.ACHATS, label: 'Journal achats', role: 'Factures fournisseurs, OCR mobile, TVA déductible', total: 42860.500, nbPieces: 31, controle: 'Pièces attachées' },
        { code: JOURNAUX.BANQUE, label: 'Journal banque', role: 'Paiements, lettrage, rapprochement bancaire', total: 72500.000, nbPieces: 28, controle: 'Rapprochement mensuel' },
        { code: JOURNAUX.CAISSE, label: 'Journal caisse', role: 'Encaissements et paiements espèces', total: 0, nbPieces: 0, controle: 'Plafond espèces et justificatifs' },
        { code: JOURNAUX.OD, label: 'Opérations diverses', role: 'Salaires, provisions, OD fiscales', total: 18450.000, nbPieces: 11, controle: 'Validation comptable' },
      ],
      balance,
      grandLivre: balance.map((row, index) => ({ id: `GL-${index}`, compte: row.compte, intitule: row.intitule, mouvement: index % 2 ? 'Mouvements banque et lettrage' : 'Mouvements facture et fiscalité', solde: row.soldeDebiteur || row.soldeCrediteur })),
      actifs: [
        { id: 'A1', label: 'Serveur comptable', famille: 'Matériel informatique', compte: '218300', taux: 33, acquisition: 12400, dotation: 4092, vnc: 8308, statut: 'En service' },
        { id: 'A2', label: 'Véhicule commercial', famille: 'Transport', compte: '218200', taux: 20, acquisition: 58000, dotation: 11600, vnc: 46400, statut: 'En service' },
      ],
      etats: [
        { code: 'BILAN', icon: 'ti-layout-board-split', label: 'Bilan NCT', description: 'Actifs, capitaux propres et passifs selon présentation tunisienne.', norme: 'NCT 01' },
        { code: 'RESULTAT', icon: 'ti-report-money', label: 'État de résultat', description: 'Produits, charges, résultat d’exploitation et net.', norme: 'NCT 01' },
        { code: 'CASH', icon: 'ti-arrows-exchange', label: 'Flux de trésorerie', description: 'Exploitation, investissement, financement.', norme: 'NCT 07' },
      ],
      exercices: [
        { code: 'OPEN', label: 'Ouverture exercice 2026', detail: 'Report à nouveau, reprise balance et verrouillage N-1.', statut: 'Validé' },
        { code: 'INV', label: 'Inventaire annuel', detail: 'Stocks, immobilisations, provisions et cut-off.', statut: 'En cours' },
        { code: 'CLOSE', label: 'Clôture et résultat', detail: 'Extournes, écritures de clôture, résultat et archivage.', statut: 'À venir' },
      ],
      analytique: [
        { code: 'VENTE', label: 'Ventes B2B', description: 'Marge par documents clients et familles articles.', produits: 32100, charges: 16700, marge: 48 },
        { code: 'SERV', label: 'Services', description: 'Prestations récurrentes, support et maintenance.', produits: 24500, charges: 9550, marge: 61 },
      ],
    };
  }
}
