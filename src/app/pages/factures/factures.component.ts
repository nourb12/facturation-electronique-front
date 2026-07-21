import {
  Component, OnInit, signal, computed, inject
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { trigger, transition, style, animate } from '@angular/animations';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import {
  FactureApiService, ListeFacturesDto,
  StatistiquesFacturesDto, ClientService, ClientDto,
  ProduitApiService, ProduitDto,
  TeifApiService, PaiementApiService, SignatureApiService,
  TtnApiService, PersonnalisationApiService, EntrepriseApiService,
  ParametreFiscalApiService
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
type SubmitMode = 'draft' | 'final';

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
  private paramFiscalSvc = inject(ParametreFiscalApiService);
  private authSvc       = inject(AuthService);
  private toast         = inject(ToastService);
  private translate     = inject(TranslateService);
  private route         = inject(ActivatedRoute);

  view = signal<ViewMode>('list');

  loading       = signal(true);
  saving        = signal(false);
  pdfLoading    = signal(false);
  actionLoading = signal(false);
  teifLoading   = signal(false);
  formError     = signal<string | null>(null);
  showXmlModal  = signal(false);
  xmlPreview    = signal('');

  factures    = signal<any[]>([]);
  total       = signal(0);
  stats       = signal<StatistiquesFacturesDto | null>(null);
  clients     = signal<ClientDto[]>([]);
  produits    = signal<ProduitDto[]>([]);
  personnalisation = signal<any>(null);
  entreprise  = signal<any>(null);
  parametresFiscaux = signal<any[]>([]);

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
    { key: 'EnAttenteAdmin', labelKey: 'En attente admin', count: 0 },
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
    return ttc;
  });

  signatureUrl = computed(() => {
    const pdf = this.personnalisation()?.pdf;
    if (pdf?.signatureActive === false || pdf?.options?.showSignature === false) return '';
    return pdf?.signatureUrl || pdf?.sigImageUrl || '';
  });

  cachetUrl = computed(() => {
    const pdf = this.personnalisation()?.pdf;
    if (pdf?.signatureActive === false || pdf?.options?.showSignature === false) return '';
    return pdf?.cachetUrl || '';
  });

  retenueAmount = computed(() =>
    this._draft().activerRetenue
      ? this.totalHtApresRemise() * ((this._draft().tauxRetenue ?? 0) / 100)
      : 0
  );

  netAPayer = computed(() =>
    Math.max(0, this.totalTtc() - this.retenueAmount())
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
    this.chargerParametresFiscaux();
    this.applyRouteIntent();
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

  private chargerParametresFiscaux() {
    this.paramFiscalSvc.lister().subscribe({
      next: params => {
        this.parametresFiscaux.set(params ?? []);
        this._draft.update(d => this.appliquerParametreRsAuDraft(d));
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

  ouvrirCreation(typeFacture = 'Facture') {
    this._draft.set({ ...this.draftVide(), typeFacture: this.safeTypeFacture(typeFacture) });
    this.formError.set(null);
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

  paiementLabel(f: any): string {
    return this.isFacturePayee(f) ? 'Payée' : 'Non payée';
  }

  paiementClass(f: any): string {
    return this.isFacturePayee(f) ? 'ok' : 'neutral';
  }

  transmissionTtnLabel(f: any): string {
    if (this.normalizeStatusText(f?.statut).includes('enattenteadmin')) return 'En attente admin';
    return this.isFactureTransmise(f) ? 'Transmis' : 'Non transmis';
  }

  transmissionTtnClass(f: any): string {
    if (this.normalizeStatusText(f?.statut).includes('enattenteadmin')) return 'warn';
    return this.isFactureTransmise(f) ? 'ok' : 'neutral';
  }

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

  sauvegarderBrouillon() { this.soumettre('draft'); }
  finaliser() { this.soumettre('final'); }

  private soumettre(mode: SubmitMode) {
    const d = this._draft();
    if (this.saving()) return;

    this.formError.set(null);
    const errors = mode === 'final' ? this.validateFinal(d) : this.validateDraft(d);
    if (errors.length) {
      const message = errors[0];
      this.formError.set(message);
      this.toast.error(message);
      return;
    }

    if (!d.clientId && mode === 'final') {
      const message = 'Client obligatoire pour valider la facture.';
      this.formError.set(message);
      this.toast.error(message);
      return;
    }

    if (!d.clientId) {
      this.creerClientBrouillonPuisSauver(mode);
      return;
    }

    this.saving.set(true);
    const lignesSource = this.normaliserLignesBrouillon(d);
    const lignes = lignesSource.map(l => ({
      designation: l.designation,
      quantite: l.quantite,
      prixUnitaire: l.prixUnitaire,
      tauxTva: l.tauxTva,
      tauxRemise: l.tauxRemise || 0,
      unite: l.unite || 'U',
      produitId: l.produitId || undefined,
      description: l.description || undefined,
    }));

    const req: any = {
      clientId: d.clientId,
      typeFacture: this.safeTypeFacture(d.typeFacture),
      modePaiement: this.safeModePaiement(d.modePaiement),
      dateEcheance: this.safeDateEcheance(d.dateEcheance),
      notes: d.notes || undefined,
      conditionsPaiement: d.conditionsPaiement || undefined,
      devise: (d.devise || 'TND').slice(0, 3).toUpperCase(),
      reference: d.reference || undefined,
      lignes,
      appliquerRS: d.activerRetenue,
      codeRS: d.activerRetenue ? this.codeRetenue(d.tauxRetenue) : undefined,
      tauxRS: d.activerRetenue ? d.tauxRetenue : 0,
      baseRS: d.activerRetenue ? this.totalHtApresRemise() : 0,
      montantRS: this.retenueAmount(),
      netAPayer: this.netAPayer(),
    };

    const obs = d.id ? this.factureSvc.mettreAJour(d.id, req) : this.factureSvc.creer(req);
    obs.subscribe({
      next: (f: any) => {
        if (mode === 'final') {
          this.factureSvc.valider(f.id).subscribe({
            next: (updated: any) => {
              this.saving.set(false);
              this.toast.success(`Facture ${updated.numero} validée. Elle est prête à être signée.`);
              this.retourListe();
            },
            error: (err: any) => {
              this.saving.set(false);
              const message = this.apiError(err, 'Facture enregistrée, mais validation impossible.');
              this.formError.set(message);
              this.toast.error(message);
            }
          });
          return;
        }

        this.saving.set(false);
        const message = mode === 'draft'
          ? `Brouillon ${f.numero} enregistré.`
          : `Facture ${f.numero} créée. En attente de validation admin.`;
        this.toast.success(message);
        this.retourListe();
      },
      error: (err: any) => {
        this.saving.set(false);
        const message = this.apiError(err, mode === 'draft' ? 'Brouillon non enregistré.' : 'Facture non créée.');
        this.formError.set(message);
        this.toast.error(message);
      }
    });
  }
  ouvrirApercuXml() {
    const xml = this.buildXmlPreview();
    this.xmlPreview.set(xml);
    this.showXmlModal.set(true);
  }

  fermerApercuXml() {
    this.showXmlModal.set(false);
  }

  async copierXml() {
    try {
      await navigator.clipboard.writeText(this.xmlPreview());
      this.toast.success('XML copié.');
    } catch {
      this.toast.error('Copie impossible depuis ce navigateur.');
    }
  }

  telechargerXmlPreview() {
    const numero = this._draft().numero || 'facture-brouillon';
    const blob = new Blob([this.xmlPreview()], { type: 'application/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${numero}_TEIF_preview.xml`;
    a.click();
    URL.revokeObjectURL(url);
  }

  private validateDraft(d: FactureDraft): string[] {
    const errors: string[] = [];
    if (d.dateEcheance && Number.isNaN(new Date(d.dateEcheance).getTime())) errors.push('Date invalide.');
    return errors;
  }

  private validateFinal(d: FactureDraft): string[] {
    const errors = this.validateDraft(d);
    const lignes = d.sections.flatMap(s => s.lignes);
    if (!d.clientId) errors.push('Client obligatoire.');
    if (!d.dateEmission || Number.isNaN(new Date(d.dateEmission).getTime())) errors.push('Date d’émission obligatoire.');
    if (!d.dateEcheance || Number.isNaN(new Date(d.dateEcheance).getTime())) errors.push('Date d’échéance obligatoire.');
    if (!lignes.length) errors.push('Au moins une ligne de facture est obligatoire.');
    if (lignes.some(l => !l.designation?.trim())) errors.push('Chaque ligne doit avoir une désignation.');
    if (lignes.some(l => Number(l.quantite) <= 0)) errors.push('Chaque ligne doit avoir une quantité positive.');
    if (lignes.some(l => Number(l.prixUnitaire) < 0)) errors.push('Le prix unitaire ne peut pas être négatif.');
    if (this.totalHtApresRemise() < 0) errors.push('La remise globale ne peut pas dépasser le total HT.');
    if (this.totalTtc() <= 0) errors.push('Le total TTC doit être supérieur à zéro.');
    return errors;
  }
  private creerClientBrouillonPuisSauver(mode: SubmitMode) {
    this.saving.set(true);
    const suffix = Date.now();
    this.clientSvc.creer({
      nom: 'Client brouillon',
      email: `brouillon-${suffix}@tuniflow.local`,
      typeClient: 'B2B',
      pays: 'TN'
    }).subscribe({
      next: client => {
        this.clients.update(list => [client, ...list]);
        this._draft.update(d => ({ ...d, clientId: client.id }));
        this.rechercheClient = client.nom;
        this.saving.set(false);
        this.soumettre(mode);
      },
      error: err => {
        this.saving.set(false);
        const message = this.apiError(err, 'Impossible de créer le client brouillon.');
        this.formError.set(message);
        this.toast.error(message);
      }
    });
  }

  private normaliserLignesBrouillon(d: FactureDraft): LigneFactureDraft[] {
    const lignes = d.sections.flatMap(s => s.lignes)
      .filter(l => String(l.designation || '').trim() || Number(l.prixUnitaire) > 0 || Number(l.quantite) > 0)
      .map(l => ({
        ...l,
        designation: String(l.designation || '').trim() || 'Ligne brouillon',
        quantite: Number(l.quantite) > 0 ? Number(l.quantite) : 1,
        prixUnitaire: Number(l.prixUnitaire) >= 0 ? Number(l.prixUnitaire) : 0,
        tauxTva: Number.isFinite(Number(l.tauxTva)) ? Number(l.tauxTva) : 19,
        unite: l.unite || 'U'
      }));

    return lignes.length ? lignes : [{
      ...this.nouvelleLigne(),
      designation: 'Ligne brouillon',
      quantite: 1,
      prixUnitaire: 0,
      tauxTva: 19,
      montantHt: 0,
      montantTva: 0,
      montantTtc: 0
    }];
  }

  private apiError(err: any, fallback: string): string {
    const body = err?.error;
    const validationErrors = body?.errors;
    if (validationErrors && typeof validationErrors === 'object') {
      const firstKey = Object.keys(validationErrors)[0];
      const firstValue = firstKey ? validationErrors[firstKey] : null;
      const raw = Array.isArray(firstValue) ? firstValue[0] : firstValue;
      return this.toFrenchApiMessage(String(raw || firstKey || fallback));
    }

    return this.toFrenchApiMessage(body?.message || body?.detail || body?.title || fallback);
  }

  private toFrenchApiMessage(message: string): string {
    const lower = message.toLowerCase();
    if (lower.includes('one or more validation')) return 'Données incomplètes.';
    if (lower.includes('client')) return 'Client invalide ou introuvable.';
    if (lower.includes('date') || lower.includes('échéance') || lower.includes('echeance')) return 'Date d’échéance invalide.';
    if (lower.includes('ligne')) return 'Ajoutez au moins une ligne.';
    if (lower.includes('designation') || lower.includes('désignation')) return 'Désignation de ligne manquante.';
    if (lower.includes('unite') || lower.includes('unité')) return 'Unité de ligne manquante.';
    return message || 'Action impossible.';
  }

  private safeDateEcheance(value: string): string {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const date = value ? new Date(value) : new Date(today);
    if (Number.isNaN(date.getTime()) || date < today) {
      const fallback = new Date(today);
      fallback.setDate(fallback.getDate() + 30);
      return fallback.toISOString();
    }
    return date.toISOString();
  }

  private applyRouteIntent() {
    const params = this.route.snapshot.queryParamMap;
    const action = params.get('action');
    const type = params.get('type') ?? 'Facture';

    if (action === 'create') {
      this.ouvrirCreation(type);
      return;
    }

    if (action === 'edit') {
      const id = params.get('id') ?? params.get('document');
      if (id) {
        this.ouvrirEdition({ id });
        return;
      }
      this.ouvrirCreation(type);
    }
  }

  private isFacturePayee(f: any): boolean {
    if (this.normalizeStatusText(f?.statut).includes('payee')) return true;
    const restant = Number(f?.montantRestant);
    if (Number.isFinite(restant)) return restant <= 0.001;
    const paye = Number(f?.montantPaye);
    const attendu = Number(f?.netAPayer ?? f?.totalTtc);
    return Number.isFinite(paye) && Number.isFinite(attendu) && attendu > 0 && paye >= attendu - 0.001;
  }

  private isFactureTransmise(f: any): boolean {
    const statut = this.normalizeStatusText(f?.statut);
    return ['transmise', 'acceptee', 'rejetee', 'payee', 'partiellementpayee', 'partiellemementpayee']
      .some(value => statut.includes(value));
  }

  private normalizeStatusText(value: unknown): string {
    return String(value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  private safeTypeFacture(value: string): string {
    return ['Facture', 'Avoir', 'Proforma'].includes(value) ? value : 'Facture';
  }

  private safeModePaiement(value: string): string {
    return ['Virement', 'Cheque', 'Especes', 'CarteBancaire', 'Traite'].includes(value) ? value : 'Virement';
  }
  private buildXmlPreview(): string {
    const d = this._draft();
    const client = this.clientSelectionne();
    const entreprise = this.entreprise();
    const escape = (value: unknown) => String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');

    const lignes = d.sections.flatMap(s => s.lignes).map((l, index) => `
    <cac:InvoiceLine>
      <cbc:ID>${index + 1}</cbc:ID>
      <cbc:InvoicedQuantity unitCode="${escape(l.unite || 'U')}">${Number(l.quantite || 0).toFixed(3)}</cbc:InvoicedQuantity>
      <cbc:LineExtensionAmount currencyID="${escape(d.devise)}">${Number(l.montantHt || 0).toFixed(3)}</cbc:LineExtensionAmount>
      <cac:Item>
        <cbc:Name>${escape(l.designation || 'Ligne brouillon')}</cbc:Name>
        <cbc:Description>${escape(l.description)}</cbc:Description>
        <cac:ClassifiedTaxCategory>
          <cbc:ID>S</cbc:ID>
          <cbc:Percent>${Number(l.tauxTva || 0).toFixed(1)}</cbc:Percent>
        </cac:ClassifiedTaxCategory>
      </cac:Item>
      <cac:Price>
        <cbc:PriceAmount currencyID="${escape(d.devise)}">${Number(l.prixUnitaire || 0).toFixed(3)}</cbc:PriceAmount>
      </cac:Price>
    </cac:InvoiceLine>`).join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<ubl:Invoice xmlns:ubl="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
             xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
             xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>TEIF-SIMULATION-V0</cbc:CustomizationID>
  <cbc:ID>${escape(d.numero || 'BROUILLON')}</cbc:ID>
  <cbc:IssueDate>${escape(d.dateEmission)}</cbc:IssueDate>
  <cbc:DueDate>${escape(d.dateEcheance)}</cbc:DueDate>
  <cbc:InvoiceTypeCode>${d.typeFacture === 'Avoir' ? '381' : '380'}</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>${escape(d.devise)}</cbc:DocumentCurrencyCode>
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyName><cbc:Name>${escape(entreprise?.raisonSociale || entreprise?.nom || 'Entreprise')}</cbc:Name></cac:PartyName>
      <cac:PartyTaxScheme><cbc:CompanyID>${escape(entreprise?.matriculeFiscal)}</cbc:CompanyID></cac:PartyTaxScheme>
    </cac:Party>
  </cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyName><cbc:Name>${escape(client?.nom || 'Client non sélectionné')}</cbc:Name></cac:PartyName>
      <cac:PartyTaxScheme><cbc:CompanyID>${escape(client?.matriculeFiscal)}</cbc:CompanyID></cac:PartyTaxScheme>
    </cac:Party>
  </cac:AccountingCustomerParty>${lignes}
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="${escape(d.devise)}">${this.totalTva().toFixed(3)}</cbc:TaxAmount>
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="${escape(d.devise)}">${this.totalHt().toFixed(3)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="${escape(d.devise)}">${this.totalHtApresRemise().toFixed(3)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="${escape(d.devise)}">${this.totalTtc().toFixed(3)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="${escape(d.devise)}">${this.netAPayer().toFixed(3)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
</ubl:Invoice>`;
  }

  draftAsFacture(): any {
    const d = this._draft();
    return { id: d.id ?? '', numero: d.numero ?? '', clientId: d.clientId,
      totalHt: this.totalHt(), totalTva: this.totalTva(), totalTtc: this.totalTtc(),
      appliquerRS: d.activerRetenue, tauxRS: d.tauxRetenue,
      montantRS: this.retenueAmount(), netAPayer: this.netAPayer(),
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

  soumettreValidationFiscale(f: any) {
    if (!f?.id || this.actionLoading()) return;
    this.actionLoading.set(true);
    this.factureSvc.soumettreValidationFiscale(f.id).subscribe({
      next: (updated) => {
        this.actionLoading.set(false);
        this.updateFacture(updated);
        this.toast.success('Facture envoyée à l’admin pour validation fiscale simulée.');
        if (this.view() === 'detail') this.selectedFacture.set(updated);
      },
      error: (err) => {
        this.actionLoading.set(false);
        this.toast.error(err?.error?.message ?? 'Soumission fiscale simulée impossible.');
      }
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
    this.paiementForm.montant = f.montantRestant ?? f.netAPayer ?? f.totalTtc ?? 0;
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

  exportExcel() {
    const rows = [['N° Facture','Client','Statut','Total HT','Total TTC','Devise','Date émission']];
    this.filteredFactures().forEach(f =>
      rows.push([f.numero, f.clientNom, f.statut, String(f.totalHt), String(f.totalTtc), f.devise, f.dateEmission?.substring(0, 10)])
    );
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'factures.xlsx'; a.click();
    URL.revokeObjectURL(url);
  }

  montantEnLettres(): string {
    const n = this.netAPayer();
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
      EnAttenteAdmin:'En attente admin',
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
      EnAttenteAdmin:'warn',
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
    return this.appliquerParametreRsAuDraft({
      clientId:'', typeFacture:'Facture', typeVente:'', devise: defaults.devise,
      dateEmission: this.today(), dateEcheance: defaults.dateEcheance,
      textLibre:'', titre:'', description:'', notes:'',
      sections: [{ id: this.uid(), titre:'Section 1', lignes:[this.nouvelleLigne()] }],
      remiseGlobale:0, timbreFiscal: defaults.timbreFiscal, afficherMfClient:true, afficherIban: defaults.afficherIban,
      activerRetenue:false, tauxRetenue:0, modePaiement: defaults.modePaiement, delaiPaiement: defaults.delaiPaiement,
      conditionsPaiement: defaults.conditionsPaiement, etablissement:'', iban: defaults.iban, bic:'', reference:'',
    });
  }

  private appliquerPersonnalisationAuDraft(draft: FactureDraft): FactureDraft {
    const defaults = this.getDraftDefaultsFromPersonnalisation(draft.dateEmission || this.today());
    return this.appliquerParametreRsAuDraft({
      ...draft,
      devise: draft.devise || defaults.devise,
      dateEcheance: draft.dateEcheance || defaults.dateEcheance,
      delaiPaiement: draft.delaiPaiement || defaults.delaiPaiement,
      conditionsPaiement: draft.conditionsPaiement || defaults.conditionsPaiement,
      modePaiement: draft.modePaiement || defaults.modePaiement,
      timbreFiscal: draft.timbreFiscal || defaults.timbreFiscal,
      afficherIban: draft.afficherIban || defaults.afficherIban,
      iban: draft.iban || defaults.iban,
    });
  }

  private appliquerParametreRsAuDraft(draft: FactureDraft): FactureDraft {
    const rs = this.parametresFiscaux().find((p: any) =>
      p?.estActif !== false &&
      (p?.inclureRetenueSource || String(p?.libelle ?? '').toLowerCase().includes('retenue'))
    );
    if (!rs) return draft;
    if (draft.activerRetenue && draft.tauxRetenue) return draft;
    return {
      ...draft,
      activerRetenue: !!rs.inclureRetenueSource,
      tauxRetenue: Number(rs.valeur ?? draft.tauxRetenue ?? 0),
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

  /** Determine le code fiscal RS tunisien transmis avec la facture. */
  private codeRetenue(taux: number): string {
    const normalized = Number(taux || 0).toString().replace('.', '_');
    return `RS_${normalized}`;
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
