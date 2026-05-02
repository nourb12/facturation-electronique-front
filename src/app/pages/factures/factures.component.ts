import {
  Component, OnInit, signal, computed, inject
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { trigger, transition, style, animate } from '@angular/animations';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import {
  FactureApiService, ListeFacturesDto,
  StatistiquesFacturesDto, ClientService, ClientDto,
  ProduitApiService, ProduitDto,
  TeifApiService, PaiementApiService, SignatureApiService,
  TtnApiService, PersonnalisationApiService, EntrepriseApiService
} from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';

export interface LigneFactureDraft {
  id: string; produitId: string; designation: string; description: string;
  unite: string; quantite: number; prixUnitaire: number;
  tauxRemise: number; tauxTva: number;
  montantHt: number; montantTva: number; montantTtc: number;
}

export interface SectionDraft {
  id: string; titre: string; lignes: LigneFactureDraft[];
}

export interface FactureDraft {
  id?: string; numero?: string; clientId: string;
  typeFacture: string; typeVente: string; devise: string;
  dateEmission: string; dateEcheance: string;
  textLibre: string; titre: string; description: string; notes: string;
  sections: SectionDraft[];
  remiseGlobale: number; timbreFiscal: boolean;
  afficherMfClient: boolean; afficherIban: boolean;
  activerRetenue: boolean; tauxRetenue: number;
  modePaiement: string; delaiPaiement: number;
  conditionsPaiement: string; etablissement: string;
  iban: string; bic: string; reference: string;
}

type ViewMode = 'list' | 'create' | 'edit' | 'detail';

@Component({
  selector: 'app-factures',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, DatePipe],
  templateUrl: './factures.component.html',
  styleUrls: ['./factures.component.scss'],
  animations: [
    trigger('pageIn', [transition(':enter', [
      style({ opacity: 0, transform: 'translateY(8px)' }),
      animate('380ms cubic-bezier(.16,1,.3,1)', style({ opacity: 1, transform: 'translateY(0)' }))
    ])]),
    trigger('slideUp', [transition(':enter', [
      style({ opacity: 0, transform: 'translateY(16px)' }),
      animate('300ms cubic-bezier(.16,1,.3,1)', style({ opacity: 1, transform: 'translateY(0)' }))
    ])]),
    trigger('fadeIn', [
      transition(':enter', [style({ opacity: 0 }), animate('200ms ease', style({ opacity: 1 }))]),
      transition(':leave', [animate('150ms ease', style({ opacity: 0 }))])
    ]),
    trigger('modalIn', [transition(':enter', [
      style({ opacity: 0, transform: 'scale(.95) translateY(10px)' }),
      animate('300ms cubic-bezier(.16,1,.3,1)', style({ opacity: 1, transform: 'scale(1) translateY(0)' }))
    ])]),
    trigger('rowIn', [transition(':enter', [
      style({ opacity: 0, transform: 'translateX(-8px)' }),
      animate('250ms ease', style({ opacity: 1, transform: 'translateX(0)' }))
    ])])
  ]
})
export class FacturesComponent implements OnInit {

  private factureSvc    = inject(FactureApiService);
  private clientSvc     = inject(ClientService);
  private produitSvc    = inject(ProduitApiService);
  private teifSvc       = inject(TeifApiService);
  private paiementSvc   = inject(PaiementApiService);
  private signatureSvc  = inject(SignatureApiService);
  private ttnSvc        = inject(TtnApiService);
  private personnSvc    = inject(PersonnalisationApiService);
  private entrepriseSvc = inject(EntrepriseApiService);
  private authSvc       = inject(AuthService);
  private toast         = inject(ToastService);
  private translate     = inject(TranslateService);

  view = signal<ViewMode>('list');

  loading       = signal(true);
  saving        = signal(false);
  pdfLoading    = signal(false);
  actionLoading = signal(false);
  teifLoading   = signal(false);

  factures    = signal<any[]>([]);
  total       = signal(0);
  stats       = signal<StatistiquesFacturesDto | null>(null);
  clients     = signal<ClientDto[]>([]);
  produits    = signal<ProduitDto[]>([]);
  personnalisation = signal<any>(null);
  entreprise  = signal<any>(null);

  searchQuery  = '';
  activeStatut = 'all';
  currentPage  = signal(1);
  parPage      = 20;

  selectedFacture = signal<any | null>(null);

  showHistoriqueModal = signal(false);
  historiqueFacture   = signal<any[]>([]);
  historiqueLoading   = signal(false);

  showPaiementModal = signal(false);
  paiementForm = {
    montant: 0, mode: 'Virement',
    datePaiement: new Date().toISOString().substring(0, 10),
    reference: '', banque: ''
  };

  private _draft = signal<FactureDraft>(this.draftVide());
  draft = this._draft.asReadonly();

  showClientModal  = signal(false);
  showProduitModal = signal(false);
  newClient = this.clientVide();
  pendingSectionForProduit: SectionDraft | null = null;
  pendingLigneForProduit: LigneFactureDraft | null = null;
  newProduit = {
    libelle: '', description: '', prixUnitaire: 0, tauxTva: 19,
    unite: 'U', type: 'Service', devise: 'TND', quantiteDefaut: 1
  };

  rechercheClient = '';
  showClientDropdown = signal(false);

  readonly statuts = [
    { key: 'all',       labelKey: 'FACTURES.FILTERS.ALL',       count: 0 },
    { key: 'Brouillon', labelKey: 'FACTURES.FILTERS.DRAFT',     count: 0 },
    { key: 'Validee',   labelKey: 'FACTURES.FILTERS.VALIDATED', count: 0 },
    { key: 'Conforme',  labelKey: 'FACTURES.FILTERS.COMPLIANT', count: 0 },
    { key: 'Transmise', labelKey: 'FACTURES.FILTERS.SENT',      count: 0 },
    { key: 'Acceptee',  labelKey: 'FACTURES.FILTERS.ACCEPTED',  count: 0 },
    { key: 'Rejetee',   labelKey: 'FACTURES.FILTERS.REJECTED',  count: 0 },
    { key: 'Payee',     labelKey: 'FACTURES.FILTERS.PAID',      count: 0 },
  ];

  readonly typeFactureOptions = [
    { value: 'Facture',  labelKey: 'INVOICE.TYPE.INVOICE' },
    { value: 'Avoir',    labelKey: 'INVOICE.TYPE.CREDIT_NOTE' },
    { value: 'Proforma', labelKey: 'INVOICE.TYPE.PROFORMA' },
    { value: 'Devis',    labelKey: 'INVOICE.TYPE.QUOTE' },
  ] as const;

  readonly modePaiementOptions = [
    { value: 'Virement',      labelKey: 'INVOICE.PAYMENT_MODES.BANK_TRANSFER' },
    { value: 'Cheque',        labelKey: 'INVOICE.PAYMENT_MODES.CHECK' },
    { value: 'Especes',       labelKey: 'INVOICE.PAYMENT_MODES.CASH' },
    { value: 'CarteBancaire', labelKey: 'INVOICE.PAYMENT_MODES.CARD' },
    { value: 'Traite',        labelKey: 'INVOICE.PAYMENT_MODES.BILL_OF_EXCHANGE' },
  ] as const;

  readonly gouvernorats = [
    'Ariana','Béja','Ben Arous','Bizerte','Gabès','Gafsa','Jendouba',
    'Kairouan','Kasserine','Kébili','Kef','Mahdia','Manouba','Médenine',
    'Monastir','Nabeul','Sfax','Sidi Bouzid','Siliana','Sousse','Tataouine',
    'Tozeur','Tunis','Zaghouan'
  ];

  filteredFactures = computed(() => {
    let list = this.factures();
    const q = this.searchQuery.toLowerCase();
    if (q) list = list.filter(f =>
      f.numero?.toLowerCase().includes(q) ||
      f.clientNom?.toLowerCase().includes(q) ||
      (f.reference ?? '').toLowerCase().includes(q)
    );
    return list;
  });

  clientSelectionne = computed(() =>
    this.clients().find(c => c.id === this._draft().clientId) ?? null
  );

  logoFactureUrl = computed(() => {
    const pdf = this.personnalisation()?.pdf;
    if (pdf?.options?.showLogo === false) return '';
    return pdf?.logoUrl || this.entreprise()?.logoUrl || '';
  });

  clientsFiltres = computed(() => {
    const q = this.rechercheClient.toLowerCase().trim();
    if (!q) return this.clients().slice(0, 10);
    return this.clients().filter(c =>
      c.nom.toLowerCase().includes(q) ||
      (c.matriculeFiscal ?? '').toLowerCase().includes(q) ||
      (c.email ?? '').toLowerCase().includes(q)
    ).slice(0, 8);
  });

  totalHt = computed(() =>
    this._draft().sections.flatMap(s => s.lignes).reduce((a, l) => a + l.montantHt, 0)
  );

  totalHtApresRemise = computed(() =>
    this.totalHt() - (this._draft().remiseGlobale ?? 0)
  );

  totalTva = computed(() => {
    const ratio = this.totalHt() > 0 ? this.totalHtApresRemise() / this.totalHt() : 1;
    return this._draft().sections.flatMap(s => s.lignes)
      .reduce((a, l) => a + l.montantTva * ratio, 0);
  });

  totalTtc = computed(() => {
    let ttc = this.totalHtApresRemise() + this.totalTva();
    if (this._draft().timbreFiscal) ttc += 1;
    if (this._draft().activerRetenue && this._draft().tauxRetenue)
      ttc -= this.retenueAmount();
    return ttc;
  });

  retenueAmount = computed(() =>
    this.totalHtApresRemise() * ((this._draft().tauxRetenue ?? 0) / 100)
  );

  groupesTva = computed(() => {
    const map = new Map<number, { baseHt: number; montantTva: number }>();
    const ratio = this.totalHt() > 0 ? this.totalHtApresRemise() / this.totalHt() : 1;
    this._draft().sections.flatMap(s => s.lignes).forEach(l => {
      const ex = map.get(l.tauxTva) ?? { baseHt: 0, montantTva: 0 };
      map.set(l.tauxTva, { baseHt: ex.baseHt + l.montantHt * ratio, montantTva: ex.montantTva + l.montantTva * ratio });
    });
    return Array.from(map.entries()).map(([taux, v]) => ({ taux, ...v }));
  });

  get totalPages() { return Math.ceil(this.total() / this.parPage); }

  ngOnInit() {
    this.loadAll();
    this.chargerEntreprise();
    this.chargerPersonnalisation();
  }

  private loadAll() {
    this.loading.set(true);
    const params: any = { page: this.currentPage(), parPage: this.parPage };
    if (this.activeStatut !== 'all') params['statut']    = this.activeStatut;
    if (this.searchQuery.trim())     params['recherche'] = this.searchQuery.trim();

    this.factureSvc.lister(params).subscribe({
      next: (res: ListeFacturesDto) => {
        this.factures.set(res.items);
        this.total.set(res.total);
        this.loading.set(false);
        this.updateStatutCounts();
      },
      error: () => this.loading.set(false)
    });
    this.factureSvc.statistiques().subscribe({ next: s => this.stats.set(s) });
    this.clientSvc.lister(1, 500, true).subscribe({ next: res => this.clients.set(res.items) });
    this.produitSvc.lister(1, 500, undefined, true).subscribe({ next: res => this.produits.set(res.items) });
  }

  private chargerEntreprise() {
    const eid = this.authSvc.entrepriseId;
    if (!eid) return;
    this.entrepriseSvc.obtenirParId(eid).subscribe({ next: e => this.entreprise.set(e), error: () => {} });
  }

  private chargerPersonnalisation() {
    this.personnSvc.obtenir().subscribe({
      next: p => {
        this.personnalisation.set(p?.donnees ?? null);
        this._draft.update(d => this.appliquerPersonnalisationAuDraft(d));
      },
      error: () => {}
    });
  }

  private updateStatutCounts() {
    const all = this.factures();
    this.statuts[0].count = all.length;
    this.statuts.slice(1).forEach(s => { s.count = all.filter(f => f.statut === s.key).length; });
  }

  setStatut(key: string) { this.activeStatut = key; this.currentPage.set(1); this.loadAll(); }
  onSearch() { this.currentPage.set(1); this.loadAll(); }
  pagePrecedente() { if (this.currentPage() > 1) { this.currentPage.update(p => p - 1); this.loadAll(); } }
  pageSuivante() { if (this.currentPage() < this.totalPages) { this.currentPage.update(p => p + 1); this.loadAll(); } }
  toggleSelectAll(ev: Event) {
    const checked = (ev.target as HTMLInputElement).checked;
    this.factures.update(list => list.map(f => ({ ...f, _selected: checked })));
  }

  ouvrirCreation() {
    this._draft.set(this.draftVide());
    this.rechercheClient = '';
    this.view.set('create');
  }

  ouvrirEdition(f: any) {
    this.factureSvc.obtenirParId(f.id).subscribe({
      next: (detail: any) => {
        const sections: SectionDraft[] = [{
          id: this.uid(), titre: 'Section 1',
          lignes: (detail.lignes ?? []).map((l: any) => ({
            id: this.uid(), produitId: l.produitId ?? '', designation: l.designation ?? '',
            description: l.description ?? '', unite: l.unite ?? 'U',
            quantite: l.quantite ?? 1, prixUnitaire: l.prixUnitaire ?? 0,
            tauxRemise: l.tauxRemise ?? 0, tauxTva: l.tauxTva ?? 19,
            montantHt: l.montantHt ?? 0, montantTva: l.montantTva ?? 0, montantTtc: l.montantTtc ?? 0,
          }))
        }];
        this._draft.set(this.appliquerPersonnalisationAuDraft({
          id: detail.id, numero: detail.numero, clientId: detail.clientId,
          typeFacture: detail.typeFacture ?? 'Facture', typeVente: detail.typeVente ?? '',
          devise: detail.devise ?? 'TND',
          dateEmission: detail.dateEmission?.substring(0, 10) ?? this.today(),
          dateEcheance: detail.dateEcheance?.substring(0, 10) ?? this.defaultEcheance(),
          textLibre: detail.textLibre ?? '', titre: detail.titre ?? '',
          description: detail.description ?? '', notes: detail.notes ?? '',
          sections, remiseGlobale: detail.remiseGlobale ?? 0,
          timbreFiscal: detail.timbreFiscal ?? false, afficherMfClient: detail.afficherMfClient ?? true,
          afficherIban: detail.afficherIban ?? false, activerRetenue: detail.activerRetenue ?? false,
          tauxRetenue: detail.tauxRetenue ?? 0, modePaiement: detail.modePaiement ?? 'Virement',
          delaiPaiement: detail.delaiPaiement ?? 30,
          conditionsPaiement: detail.conditionsPaiement ?? '',
          etablissement: detail.etablissement ?? '', iban: detail.iban ?? '',
          bic: detail.bic ?? '', reference: detail.reference ?? '',
        }));
        this.rechercheClient = this.clients().find(c => c.id === detail.clientId)?.nom ?? '';
        this.view.set('edit');
      },
      error: () => this.toast.error('Impossible de charger la facture.')
    });
  }

  ouvrirDetail(f: any) { this.selectedFacture.set(f); this.view.set('detail'); }
  retourListe() { this.view.set('list'); this.selectedFacture.set(null); this.loadAll(); }

  rechercherClients() { this.showClientDropdown.set(true); }

  selectionnerClient(c: ClientDto) {
    this._draft.update(d => ({ ...d, clientId: c.id }));
    this.rechercheClient = c.nom;
    this.showClientDropdown.set(false);
  }

  changerClient() {
    this._draft.update(d => ({ ...d, clientId: '' }));
    this.rechercheClient = '';
    this.showClientDropdown.set(true);
  }

  ouvrirCreationClient() {
    this.newClient = this.clientVide();
    this.showClientModal.set(true);
    this.showClientDropdown.set(false);
  }

  fermerModalClient() { this.showClientModal.set(false); }

  creerClient() {
    if (!this.newClient.nom || this.saving()) return;
    this.saving.set(true);
    const req: any = {
      nom: this.newClient.nom, email: this.newClient.email,
      typeClient: this.newClient.typeClient,
      matriculeFiscal: this.newClient.matriculeFiscal || undefined,
      adresse: this.newClient.adresse || undefined,
      ville: this.newClient.gouvernorat || undefined,
      codePostal: this.newClient.codePostal || undefined,
      telephone: this.newClient.telephone || undefined,
      pays: 'TN',
    };
    this.clientSvc.creer(req).subscribe({
      next: (c) => {
        this.saving.set(false);
        this.clients.update(list => [c, ...list]);
        this.selectionnerClient(c);
        this.fermerModalClient();
        this.toast.success('Client créé avec succès.');
      },
      error: (err) => { this.saving.set(false); this.toast.error(err?.error?.message ?? 'Erreur création client.'); }
    });
  }

  ajouterSection() {
    this._draft.update(d => ({
      ...d,
      sections: [...d.sections, { id: this.uid(), titre: `Section ${d.sections.length + 1}`, lignes: [this.nouvelleLigne()] }]
    }));
  }

  supprimerSection(index: number) {
    this._draft.update(d => {
      if (d.sections.length <= 1) return d;
      return { ...d, sections: d.sections.filter((_, i) => i !== index) };
    });
  }

  ajouterLigne(section: SectionDraft) {
    section.lignes = [...section.lignes, this.nouvelleLigne()];
    this._draft.update(d => ({ ...d }));
  }

  supprimerLigne(section: SectionDraft, index: number) {
    if (section.lignes.length <= 1) return;
    section.lignes = section.lignes.filter((_, i) => i !== index);
    this._draft.update(d => ({ ...d }));
  }

  onProduitChangeSec(section: SectionDraft, ligne: LigneFactureDraft, produitId: string) {
    if (produitId === '__new__') {
      ligne.produitId = '';
      this.pendingSectionForProduit = section;
      this.pendingLigneForProduit   = ligne;
      this.newProduit = { libelle: '', description: '', prixUnitaire: 0, tauxTva: 19, unite: 'U', type: 'Service', devise: 'TND', quantiteDefaut: 1 };
      this.showProduitModal.set(true);
      return;
    }
    const p = this.produits().find(pr => pr.id === produitId);
    if (p) {
      ligne.designation = p.libelle; ligne.prixUnitaire = p.prixUnitaire;
      ligne.tauxTva = p.tauxTva; ligne.unite = p.unite;
    }
    this.recalcLigne(ligne);
    this._draft.update(d => ({ ...d }));
  }

  recalcLigne(ligne: LigneFactureDraft) {
    const brut = (ligne.quantite || 0) * (ligne.prixUnitaire || 0);
    const remise = brut * ((ligne.tauxRemise || 0) / 100);
    const ht = brut - remise;
    const tva = ht * ((ligne.tauxTva || 0) / 100);
    ligne.montantHt  = +ht.toFixed(3);
    ligne.montantTva = +tva.toFixed(3);
    ligne.montantTtc = +(ht + tva).toFixed(3);
    this._draft.update(d => ({ ...d }));
  }

  getSectionHt(section: SectionDraft): number {
    return section.lignes.reduce((a, l) => a + l.montantHt, 0);
  }
  getSectionTtc(section: SectionDraft): number {
    return section.lignes.reduce((a, l) => a + l.montantTtc, 0);
  }
  hasAnyRemise(): boolean {
    return this._draft().sections.flatMap(s => s.lignes).some(l => l.tauxRemise > 0);
  }

  creerProduit() {
    if (!this.newProduit.libelle || this.saving()) return;
    this.saving.set(true);
    const req = {
      code: this.newProduit.libelle.substring(0, 3).toUpperCase() + Date.now().toString().slice(-4),
      libelle: this.newProduit.libelle, description: this.newProduit.description || undefined,
      prixUnitaire: this.newProduit.prixUnitaire, tauxTva: this.newProduit.tauxTva,
      type: this.newProduit.type, unite: this.newProduit.unite,
    };
    this.produitSvc.creer(req).subscribe({
      next: (p) => {
        this.saving.set(false);
        this.produits.update(list => [p, ...list]);
        if (this.pendingLigneForProduit) {
          const ligne = this.pendingLigneForProduit;
          ligne.produitId = p.id; ligne.designation = p.libelle;
          ligne.prixUnitaire = p.prixUnitaire; ligne.tauxTva = p.tauxTva; ligne.unite = p.unite;
          this.recalcLigne(ligne);
          this.pendingLigneForProduit = null; this.pendingSectionForProduit = null;
        }
        this.showProduitModal.set(false);
        this.toast.success('Produit créé.');
      },
      error: (err) => { this.saving.set(false); this.toast.error(err?.error?.message ?? 'Erreur création produit.'); }
    });
  }

  onDelaiChange(jours: number) {
    const draft = this._draft();
    const previousDefault = this.buildDefaultConditions(draft.delaiPaiement || 30);
    const nextDefault = this.buildDefaultConditions(Number(jours) || 0);
    const d = new Date(this._draft().dateEmission);
    d.setDate(d.getDate() + Number(jours));
    this._draft.update(dr => ({
      ...dr,
      delaiPaiement: Number(jours),
      dateEcheance: d.toISOString().substring(0, 10),
      conditionsPaiement: !dr.conditionsPaiement || dr.conditionsPaiement === previousDefault
        ? nextDefault
        : dr.conditionsPaiement
    }));
  }

  sauvegarderBrouillon() { this.soumettre(true); }
  finaliser() { this.soumettre(false); }

  private soumettre(brouillon: boolean) {
    const d = this._draft();
    if (!d.clientId || this.saving()) return;
    this.saving.set(true);
    const lignes = d.sections.flatMap(s => s.lignes).map(l => ({
      designation: l.designation, quantite: l.quantite, prixUnitaire: l.prixUnitaire,
      tauxTva: l.tauxTva, tauxRemise: l.tauxRemise || 0, unite: l.unite,
      produitId: l.produitId || undefined, description: l.description || undefined,
    }));
    const req: any = {
      clientId: d.clientId, typeFacture: d.typeFacture, modePaiement: d.modePaiement,
      dateEcheance: new Date(d.dateEcheance).toISOString(),
      notes: d.notes || undefined, conditionsPaiement: d.conditionsPaiement || undefined,
      devise: d.devise, reference: d.reference || undefined, brouillon, lignes,
    };
    const obs = d.id ? this.factureSvc.mettreAJour(d.id, req) : this.factureSvc.creer(req);
    obs.subscribe({
      next: (f: any) => {
        if (brouillon) {
          this.saving.set(false);
          this.toast.success(`Brouillon ${f.numero} enregistr?.`);
          this.retourListe();
          return;
        }

        this.factureSvc.valider(f.id).subscribe({
          next: (validated) => {
            this.saving.set(false);
            this.toast.success(`Facture ${validated.numero} finalis?e.`);
            this.retourListe();
          },
          error: (err) => {
            this.saving.set(false);
            this.toast.error(err?.error?.message ?? 'Erreur validation.');
          }
        });
      },
      error: (err: any) => { this.saving.set(false); this.toast.error(err?.error?.message ?? 'Erreur sauvegarde.'); }
    });
  }

  draftAsFacture(): any {
    const d = this._draft();
    return { id: d.id ?? '', numero: d.numero ?? '', clientId: d.clientId,
      totalHt: this.totalHt(), totalTva: this.totalTva(), totalTtc: this.totalTtc(),
      montantRestant: 0, statut: 'Brouillon' };
  }

  valider(f: any) {
    if (this.actionLoading()) return;
    this.actionLoading.set(true);
    this.factureSvc.valider(f.id).subscribe({
      next: (updated) => {
        this.actionLoading.set(false);
        this.updateFacture(updated);
        this.toast.success(`Facture ${updated.numero} finalisée.`);
        if (this.view() === 'detail') this.retourListe();
      },
      error: (err) => { this.actionLoading.set(false); this.toast.error(err?.error?.message ?? 'Erreur validation.'); }
    });
  }

  genererXml(f: any) {
    this.teifLoading.set(true);
    this.teifSvc.genererXml(f.id).subscribe({
      next: (res) => {
        this.teifLoading.set(false);
        this.updateFacture({ ...f, xmlGenere: !!res.xmlContent, versionTeif: res.versionTeif });
        this.toast.success('XML TEIF généré.');
      },
      error: (err) => { this.teifLoading.set(false); this.toast.error(err?.error?.message ?? 'Erreur XML.'); }
    });
  }

  creerAvoirDepuisFacture(f: any) {
    if (!f || this.actionLoading()) return;
    this.actionLoading.set(true);
    this.factureSvc.obtenirParId(f.id).subscribe({
      next: (detail) => {
        const req = {
          clientId: detail.clientId, typeFacture: 'Avoir', factureOrigineId: detail.id,
          modePaiement: detail.modePaiement, dateEcheance: new Date(detail.dateEcheance).toISOString(),
          devise: detail.devise, lignes: detail.lignes.map((l: any) => ({
            designation: l.designation, quantite: l.quantite, prixUnitaire: l.prixUnitaire,
            tauxTva: l.tauxTva, tauxRemise: l.tauxRemise || 0, unite: l.unite,
          }))
        };
        this.factureSvc.creer(req).subscribe({
          next: (created) => {
            this.actionLoading.set(false);
            this.toast.success(`Avoir ${created.numero} créé depuis ${detail.numero}.`);
            this.retourListe();
          },
          error: (err) => { this.actionLoading.set(false); this.toast.error(err?.error?.message ?? 'Erreur avoir.'); }
        });
      },
      error: (err) => { this.actionLoading.set(false); this.toast.error(err?.error?.message ?? 'Erreur chargement.'); }
    });
  }

  ouvrirPaiement(f: any) {
    this.selectedFacture.set(f);
    this.paiementForm.montant = f.montantRestant ?? f.totalTtc ?? 0;
    this.paiementForm.datePaiement = new Date().toISOString().substring(0, 10);
    this.showPaiementModal.set(true);
  }

  enregistrerPaiement() {
    const f = this.selectedFacture();
    if (!f || this.saving()) return;
    this.saving.set(true);
    this.paiementSvc.enregistrer({
      factureId: f.id, montant: this.paiementForm.montant, mode: this.paiementForm.mode,
      datePaiement: new Date(this.paiementForm.datePaiement).toISOString(),
      reference: this.paiementForm.reference || undefined, banque: this.paiementForm.banque || undefined,
    }).subscribe({
      next: () => { this.saving.set(false); this.showPaiementModal.set(false); this.toast.success('Paiement enregistré.'); this.retourListe(); },
      error: (err) => { this.saving.set(false); this.toast.error(err?.error?.message ?? 'Erreur paiement.'); }
    });
  }

  telechargerPdf(f: any) {
    if (!f?.id || this.pdfLoading()) return;
    this.pdfLoading.set(true);
    this.factureSvc.telechargerPdf(f.id).subscribe({
      next: (blob: Blob) => {
        this.pdfLoading.set(false);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `${f.numero || 'facture'}.pdf`; a.click();
        URL.revokeObjectURL(url);
      },
      error: () => { this.pdfLoading.set(false); this.toast.error('Erreur PDF.'); }
    });
  }

  telechargerXml(f: any) {
    this.teifSvc.telechargerXml(f.id).subscribe({
      next: (blob: Blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `${f.numero}_TEIF.xml`; a.click();
        URL.revokeObjectURL(url);
      },
      error: () => this.toast.error('Erreur téléchargement XML.')
    });
  }

  voirHistorique(f: any) {
    this.selectedFacture.set(f); this.historiqueFacture.set([]); this.historiqueLoading.set(true); this.showHistoriqueModal.set(true);
    this.factureSvc.obtenirHistorique(f.id).subscribe({
      next: (hist) => { this.historiqueLoading.set(false); this.historiqueFacture.set(hist); },
      error: () => { this.historiqueLoading.set(false); this.toast.error('Erreur historique.'); }
    });
  }

  exportCSV() {
    const rows = [['N° Facture','Client','Statut','Total HT','Total TTC','Devise','Date émission']];
    this.filteredFactures().forEach(f =>
      rows.push([f.numero, f.clientNom, f.statut, String(f.totalHt), String(f.totalTtc), f.devise, f.dateEmission?.substring(0, 10)])
    );
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'factures.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  montantEnLettres(): string {
    const n = this.totalTtc();
    const dinars = Math.floor(n);
    const millimes = Math.round((n - dinars) * 1000);
    const u = ['','un','deux','trois','quatre','cinq','six','sept','huit','neuf','dix','onze','douze','treize','quatorze','quinze','seize','dix-sept','dix-huit','dix-neuf'];
    const d = ['','','vingt','trente','quarante','cinquante','soixante','soixante-dix','quatre-vingt','quatre-vingt-dix'];
    const enL = (x: number): string => {
      if (x === 0) return 'zéro';
      if (x < 20) return u[x];
      if (x < 100) { const dz=Math.floor(x/10); const un=x%10; if(dz===7) return 'soixante-'+u[10+un]; if(dz===9) return 'quatre-vingt-'+(un>0?u[un]:'s'); return d[dz]+(un>0?'-'+u[un]:(dz===8?'s':'')); }
      if (x < 1000) { const c=Math.floor(x/100); const r=x%100; return (c>1?u[c]+' cent':'cent')+(r>0?' '+enL(r):(c>1?'s':'')); }
      const m=Math.floor(x/1000); const r=x%1000;
      return (m>1?enL(m)+' mille':'mille')+(r>0?' '+enL(r):'');
    };
    let res = enL(dinars) + ' dinar' + (dinars > 1 ? 's' : '');
    if (millimes > 0) res += ' et ' + enL(millimes) + ' millime' + (millimes > 1 ? 's' : '');
    return res.charAt(0).toUpperCase() + res.slice(1);
  }

  statutLabelKey(statut: string): string {
    const map: Record<string, string> = {
      Brouillon:'FACTURES.STATUS.DRAFT', Validee:'FACTURES.STATUS.VALIDATED',
      Conforme:'FACTURES.STATUS.COMPLIANT', Transmise:'FACTURES.STATUS.SENT',
      Acceptee:'FACTURES.STATUS.ACCEPTED', Rejetee:'FACTURES.STATUS.REJECTED',
      Payee:'FACTURES.STATUS.PAID', PartiellementPayee:'FACTURES.STATUS.PARTIALLY_PAID',
      Annulee:'FACTURES.STATUS.CANCELLED',
    };
    return map[statut] ?? statut;
  }

  getStatutClass(statut: string): string {
    const map: Record<string, string> = {
      Brouillon:'neutral', Validee:'info', Conforme:'info', Transmise:'warn',
      Acceptee:'ok', Rejetee:'err', Payee:'ok', PartiellementPayee:'warn', Annulee:'neutral'
    };
    return map[statut] ?? 'neutral';
  }

  private updateFacture(updated: any) {
    this.factures.update(list => list.map(f => f.id === updated.id ? updated : f));
    this.updateStatutCounts();
    if (this.selectedFacture()?.id === updated.id) this.selectedFacture.set(updated);
  }

  private draftVide(): FactureDraft {
    const defaults = this.getDraftDefaultsFromPersonnalisation(this.today());
    return {
      clientId:'', typeFacture:'Facture', typeVente:'', devise: defaults.devise,
      dateEmission: this.today(), dateEcheance: defaults.dateEcheance,
      textLibre:'', titre:'', description:'', notes:'',
      sections: [{ id: this.uid(), titre:'Section 1', lignes:[this.nouvelleLigne()] }],
      remiseGlobale:0, timbreFiscal: defaults.timbreFiscal, afficherMfClient:true, afficherIban: defaults.afficherIban,
      activerRetenue:false, tauxRetenue:0, modePaiement: defaults.modePaiement, delaiPaiement: defaults.delaiPaiement,
      conditionsPaiement: defaults.conditionsPaiement, etablissement:'', iban: defaults.iban, bic:'', reference:'',
    };
  }

  private appliquerPersonnalisationAuDraft(draft: FactureDraft): FactureDraft {
    const defaults = this.getDraftDefaultsFromPersonnalisation(draft.dateEmission || this.today());
    return {
      ...draft,
      devise: draft.devise || defaults.devise,
      dateEcheance: draft.dateEcheance || defaults.dateEcheance,
      delaiPaiement: draft.delaiPaiement || defaults.delaiPaiement,
      conditionsPaiement: draft.conditionsPaiement || defaults.conditionsPaiement,
      modePaiement: draft.modePaiement || defaults.modePaiement,
      timbreFiscal: draft.timbreFiscal || defaults.timbreFiscal,
      afficherIban: draft.afficherIban || defaults.afficherIban,
      iban: draft.iban || defaults.iban,
    };
  }

  private getDraftDefaultsFromPersonnalisation(dateEmission: string) {
    const personnalisation = this.personnalisation() ?? {};
    const pdf = personnalisation.pdf ?? {};
    const conditions = personnalisation.conditions ?? {};
    const comptabilite = personnalisation.comptabilite ?? {};
    const delaiPaiement = this.parsePositiveNumber(conditions.delaiPaiement, 30);

    return {
      devise: comptabilite.devise || conditions.devise || 'TND',
      delaiPaiement,
      dateEcheance: this.computeDateEcheance(dateEmission, delaiPaiement),
      conditionsPaiement: this.buildDefaultConditions(delaiPaiement),
      modePaiement: this.resolveDefaultModePaiement(),
      timbreFiscal: !!pdf?.options?.showTimbre,
      afficherIban: !!pdf?.options?.showIban,
      iban: typeof pdf?.iban === 'string' ? pdf.iban : '',
    };
  }

  private buildDefaultConditions(delaiPaiement: number): string {
    const cgv = this.personnalisation()?.conditions?.cgv;
    if (typeof cgv === 'string' && cgv.trim()) return cgv.trim();
    return `Paiement sous ${delaiPaiement} jours`;
  }

  private resolveDefaultModePaiement(): string {
    const modes = this.personnalisation()?.modesPaiement ?? [];
    const activeMode = modes.find((mode: any) => mode?.actif) ?? null;
    return this.toInvoiceMode(activeMode?.code, activeMode?.label);
  }

  private toInvoiceMode(code?: string, label?: string): string {
    const normalizedCode = String(code ?? '').toUpperCase();
    if (normalizedCode === 'ESP') return 'Especes';
    if (normalizedCode === 'CHQ') return 'Cheque';
    if (normalizedCode === 'LC') return 'Traite';
    if (normalizedCode === 'ONLINE') return 'CarteBancaire';
    if (normalizedCode === 'VIR') return 'Virement';

    const normalizedLabel = this.normalizeModeLabel(label);
    if (normalizedLabel.includes('espece')) return 'Especes';
    if (normalizedLabel.includes('cheque')) return 'Cheque';
    if (normalizedLabel.includes('traite') || normalizedLabel.includes('lettre')) return 'Traite';
    if (normalizedLabel.includes('carte') || normalizedLabel.includes('ligne')) return 'CarteBancaire';
    return 'Virement';
  }

  private normalizeModeLabel(value?: string): string {
    return String(value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  private parsePositiveNumber(value: unknown, fallback: number): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
  }

  private computeDateEcheance(dateEmission: string, delaiPaiement: number): string {
    const d = new Date(dateEmission || this.today());
    d.setDate(d.getDate() + delaiPaiement);
    return d.toISOString().substring(0, 10);
  }

  private nouvelleLigne(): LigneFactureDraft {
    return { id:this.uid(), produitId:'', designation:'', description:'', unite:'U',
      quantite:1, prixUnitaire:0, tauxRemise:0, tauxTva:19, montantHt:0, montantTva:0, montantTtc:0 };
  }

  private clientVide() {
    return { nom:'', typeClient:'B2B', matriculeFiscal:'', adresse:'', gouvernorat:'', codePostal:'', email:'', telephone:'', rne:'', siteWeb:'' };
  }

  private uid(): string { return Math.random().toString(36).slice(2, 10); }
  private today(): string { return new Date().toISOString().substring(0, 10); }
  private defaultEcheance(): string { const d=new Date(); d.setDate(d.getDate()+30); return d.toISOString().substring(0,10); }
}
