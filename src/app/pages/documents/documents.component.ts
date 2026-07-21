import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Data, RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import {
  DocumentsApiService,
  EntrepriseApiService,
  ParametreFiscalApiService,
  PersonnalisationApiService
} from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';

type DocumentKey =
  | 'devis'
  | 'bon_commande'
  | 'bon_livraison'
  | 'facture'
  | 'recu_paiement'
  | 'avoir'
  | 'proforma'
  | 'bon_sortie'
  | 'paiement_emis'
  | 'ordre_fabrication';

type DocumentStatus =
  | 'Brouillon'
  | 'Envoyé'
  | 'Accepté'
  | 'Refusé'
  | 'Expiré'
  | 'Converti'
  | 'Reçu'
  | 'Confirmé'
  | 'En cours'
  | 'Livré'
  | 'Annulé'
  | 'Préparé'
  | 'Expédié'
  | 'Litige'
  | 'Émise'
  | 'Payée'
  | 'Retard'
  | 'Avoir'
  | 'Émis'
  | 'Appliqué'
  | 'Généré';

interface DocumentTypeConfig {
  key: DocumentKey;
  label: string;
  prefix: string;
  description: string;
  icon: string;
  color: string;
  statuses: DocumentStatus[];
  createRoute?: string;
  editRoute?: string;
  next?: {
    key: DocumentKey;
    from: DocumentStatus[];
    label: string;
  };
}

interface BusinessDocument {
  id: string;
  type: DocumentKey;
  numero: string;
  client: string;
  total: number;
  statut: DocumentStatus;
  date: string;
  echeance?: string;
  linkedTo?: string;
  convertedTo?: string;
  history: string[];
  montantPaye?: number;
  montantRestant?: number;
  xmlGenere?: boolean;
}

interface DocumentLineDraft {
  produitId?: string;
  designation: string;
  description: string;
  quantite: number;
  unite: string;
  prixUnitaire: number;
  tauxRemise: number;
  tauxTva: number;
}

interface DocumentEditorDraft {
  id?: string;
  type: DocumentKey;
  typeVente: string;
  numero: string;
  client: string;
  clientCode: string;
  date: string;
  echeance: string;
  linkedTo: string;
  statut: DocumentStatus;
  devise: string;
  modePaiement: string;
  delaiPaiement: number;
  textLibre: string;
  titre: string;
  description: string;
  notes: string;
  conditionsPaiement: string;
  remiseGlobale: number;
  timbreFiscal: boolean;
  afficherMfClient: boolean;
  afficherIban: boolean;
  activerRetenue: boolean;
  tauxRetenue: number;
  etablissement: string;
  iban: string;
  bic: string;
  reference: string;
  lignes: DocumentLineDraft[];
}

interface DocumentClientOption {
  id: string;
  nom: string;
  matriculeFiscal: string;
  adresse: string;
  email?: string;
}

interface DocumentProduitOption {
  id: string;
  code: string;
  libelle: string;
  description: string;
  prixUnitaire: number;
  tauxTva: number;
  unite: string;
}

interface MetricCard {
  label: string;
  value: string | number;
  hint: string;
  icon: string;
  color: string;
}

const TYPES: DocumentTypeConfig[] = [
  {
    key: 'devis',
    label: 'Devis',
    prefix: 'DEV',
    description: 'Offres commerciales',
    icon: 'ti ti-file-description',
    color: '#3B82F6',
    statuses: ['Brouillon', 'Envoyé', 'Accepté', 'Refusé', 'Expiré', 'Converti'],
    createRoute: '/devis',
    editRoute: '/devis',
    next: { key: 'bon_commande', from: ['Accepté'], label: 'Convertir en bon de commande' }
  },
  {
    key: 'bon_commande',
    label: 'Bon de commande',
    prefix: 'BC',
    description: 'Commandes validées',
    icon: 'ti ti-clipboard-list',
    color: '#22C55E',
    statuses: ['Reçu', 'Confirmé', 'En cours', 'Livré', 'Annulé'],
    editRoute: '/documents',
    next: { key: 'bon_livraison', from: ['Confirmé', 'En cours'], label: 'Générer bon de livraison' }
  },
  {
    key: 'bon_livraison',
    label: 'Bon de livraison',
    prefix: 'BL',
    description: 'Preuves de livraison',
    icon: 'ti ti-truck',
    color: '#F59E0B',
    statuses: ['Préparé', 'Expédié', 'Livré', 'Litige'],
    editRoute: '/documents',
    next: { key: 'facture', from: ['Livré'], label: 'Facturer' }
  },
  {
    key: 'facture',
    label: 'Facture',
    prefix: 'FAC',
    description: 'Documents fiscaux',
    icon: 'ti ti-file-invoice',
    color: '#111827',
    statuses: ['Brouillon', 'Émise', 'Envoyé', 'Payée', 'Retard', 'Avoir'],
    createRoute: '/factures',
    editRoute: '/factures',
    next: { key: 'recu_paiement', from: ['Payée'], label: 'Générer reçu' }
  },
  {
    key: 'recu_paiement',
    label: 'Reçu de paiement',
    prefix: 'REC',
    description: 'Encaissements clients',
    icon: 'ti ti-receipt',
    color: '#10B981',
    statuses: ['Généré', 'Envoyé'],
    createRoute: '/paiements',
    editRoute: '/paiements',
    next: { key: 'avoir', from: ['Généré', 'Envoyé'], label: 'Créer avoir si problème' }
  },
  {
    key: 'avoir',
    label: 'Avoir',
    prefix: 'AVO',
    description: 'Corrections et annulations',
    icon: 'ti ti-file-minus',
    color: '#EF4444',
    statuses: ['Brouillon', 'Émis', 'Appliqué'],
    createRoute: '/avoirs',
    editRoute: '/avoirs'
  },
  {
    key: 'proforma',
    label: 'Facture proforma',
    prefix: 'PRO',
    description: 'Factures préparatoires',
    icon: 'ti ti-file-text',
    color: '#8B5CF6',
    statuses: ['Brouillon', 'Envoyé', 'Accepté', 'Expiré'],
    createRoute: '/factures',
    editRoute: '/factures',
    next: { key: 'facture', from: ['Accepté'], label: 'Convertir en facture' }
  },
  {
    key: 'bon_sortie',
    label: 'Bon de sortie',
    prefix: 'EV',
    description: 'Sorties de stock',
    icon: 'ti ti-arrow-bar-up',
    color: '#0EA5E9',
    statuses: ['Préparé', 'Expédié', 'Livré', 'Annulé'],
    editRoute: '/documents'
  },
  {
    key: 'paiement_emis',
    label: 'Paiement émis',
    prefix: 'PAY-P',
    description: 'Décaissements fournisseurs',
    icon: 'ti ti-cash-banknote',
    color: '#EC4899',
    statuses: ['Brouillon', 'Émis', 'Appliqué'],
    editRoute: '/paiements'
  },
  {
    key: 'ordre_fabrication',
    label: 'Ordre de fabrication',
    prefix: 'OF',
    description: 'Production interne',
    icon: 'ti ti-tool',
    color: '#F97316',
    statuses: ['Brouillon', 'Confirmé', 'En cours', 'Livré', 'Annulé'],
    editRoute: '/documents',
    next: { key: 'bon_sortie', from: ['Confirmé', 'En cours'], label: 'Générer bon de sortie' }
  }
];

const DEMO_DOCUMENTS: BusinessDocument[] = [
  {
    id: 'demo-dev-1',
    type: 'devis',
    numero: 'DEV-2026-0001',
    client: 'Société Atlas Services',
    total: 2380,
    statut: 'Accepté',
    date: '2026-05-12',
    echeance: '2026-06-12',
    convertedTo: 'BC-2026-0001',
    history: ['DEV-2026-0001 créé', 'Envoyé au client', 'Accepté par Société Atlas Services', 'Converti en BC-2026-0001']
  },
  {
    id: 'demo-dev-2',
    type: 'devis',
    numero: 'DEV-2026-0002',
    client: 'Birou Suite',
    total: 3200,
    statut: 'Envoyé',
    date: '2026-05-14',
    echeance: '2026-05-28',
    history: ['DEV-2026-0002 créé', 'Envoyé au client', 'En attente de validation']
  },
  {
    id: 'demo-bc-1',
    type: 'bon_commande',
    numero: 'BC-2026-0001',
    client: 'Société Atlas Services',
    total: 2380,
    statut: 'Confirmé',
    date: '2026-05-13',
    linkedTo: 'DEV-2026-0001',
    convertedTo: 'BL-2026-0001',
    history: ['Créé depuis DEV-2026-0001', 'Commande confirmée', 'Converti en BL-2026-0001']
  },
  {
    id: 'demo-bc-2',
    type: 'bon_commande',
    numero: 'BC-2026-0002',
    client: 'SARL Delta',
    total: 1840.5,
    statut: 'En cours',
    date: '2026-05-15',
    linkedTo: 'DEV-2026-0003',
    history: ['Créé depuis DEV-2026-0003', 'Validation achat en cours']
  },
  {
    id: 'demo-bl-1',
    type: 'bon_livraison',
    numero: 'BL-2026-0001',
    client: 'Société Atlas Services',
    total: 2380,
    statut: 'Livré',
    date: '2026-05-14',
    linkedTo: 'BC-2026-0001',
    convertedTo: 'FAC-2026-0001',
    history: ['Créé depuis BC-2026-0001', 'Préparé', 'Expédié', 'Livré', 'Facturé en FAC-2026-0001']
  },
  {
    id: 'demo-bl-2',
    type: 'bon_livraison',
    numero: 'BL-2026-0002',
    client: 'Birou Suite',
    total: 960,
    statut: 'Expédié',
    date: '2026-05-16',
    linkedTo: 'BC-2026-0003',
    history: ['Créé depuis BC-2026-0003', 'Préparé', 'Expédié']
  },
  {
    id: 'demo-fac-1',
    type: 'facture',
    numero: 'FAC-2026-0001',
    client: 'Société Atlas Services',
    total: 2380,
    statut: 'Payée',
    date: '2026-05-16',
    echeance: '2026-06-15',
    linkedTo: 'BL-2026-0001',
    convertedTo: 'REC-2026-0001',
    history: ['Créée depuis BL-2026-0001', 'Émise', 'Envoyée au client', 'Paiement reçu', 'Reçu REC-2026-0001 généré']
  },
  {
    id: 'demo-fac-2',
    type: 'facture',
    numero: 'FAC-2026-0002',
    client: 'Technologies & logiciels',
    total: 1469.75,
    statut: 'Émise',
    date: '2026-05-17',
    linkedTo: 'PRO-2026-0001',
    history: ['Créée depuis PRO-2026-0001', 'Émise', 'En attente TEIF']
  },
  {
    id: 'demo-rec-1',
    type: 'recu_paiement',
    numero: 'REC-2026-0001',
    client: 'Société Atlas Services',
    total: 2380,
    statut: 'Envoyé',
    date: '2026-05-17',
    linkedTo: 'FAC-2026-0001',
    history: ['Paiement enregistré sur FAC-2026-0001', 'Reçu généré', 'Reçu envoyé au client']
  },
  {
    id: 'demo-rec-2',
    type: 'recu_paiement',
    numero: 'REC-2026-0002',
    client: 'Clinique El Amen',
    total: 640,
    statut: 'Généré',
    date: '2026-05-16',
    linkedTo: 'FAC-2026-0005',
    history: ['Paiement partiel enregistré', 'Reçu généré']
  },
  {
    id: 'demo-avo-1',
    type: 'avoir',
    numero: 'AVO-2026-0001',
    client: 'Société Atlas Services',
    total: 180,
    statut: 'Émis',
    date: '2026-05-17',
    linkedTo: 'FAC-2026-0001',
    history: ['Avoir créé depuis FAC-2026-0001', 'Correction remise commerciale', 'Avoir émis au client']
  },
  {
    id: 'demo-avo-2',
    type: 'avoir',
    numero: 'AVO-2026-0002',
    client: 'SARL Delta',
    total: 95,
    statut: 'Brouillon',
    date: '2026-05-15',
    linkedTo: 'FAC-2026-0007',
    history: ['Avoir préparé depuis FAC-2026-0007', 'En attente validation']
  },
  {
    id: 'demo-pro-1',
    type: 'proforma',
    numero: 'PRO-2026-0001',
    client: 'Technologies & logiciels',
    total: 1469.75,
    statut: 'Accepté',
    date: '2026-05-10',
    convertedTo: 'FAC-2026-0002',
    history: ['Facture proforma créée', 'Envoyée', 'Acceptée', 'Convertie en FAC-2026-0002']
  },
  {
    id: 'demo-pro-2',
    type: 'proforma',
    numero: 'PRO-2026-0002',
    client: 'Nour Consulting',
    total: 720,
    statut: 'Envoyé',
    date: '2026-05-16',
    history: ['Facture proforma créée', 'Envoyée au client']
  },
  {
    id: 'demo-bs-1',
    type: 'bon_sortie',
    numero: 'EV-2026-0001',
    client: 'Dépôt Central',
    total: 520,
    statut: 'Livré',
    date: '2026-05-13',
    linkedTo: 'OF-2026-0001',
    history: ['Sortie préparée depuis OF-2026-0001', 'Sortie stock validée', 'Livré à l’atelier']
  },
  {
    id: 'demo-bs-2',
    type: 'bon_sortie',
    numero: 'EV-2026-0002',
    client: 'Atelier Nord',
    total: 310,
    statut: 'Préparé',
    date: '2026-05-17',
    history: ['Bon de sortie créé', 'Préparation stock en cours']
  },
  {
    id: 'demo-payp-1',
    type: 'paiement_emis',
    numero: 'PAY-P-2026-00001',
    client: 'Fournisseur Global Tech',
    total: 1850,
    statut: 'Émis',
    date: '2026-05-16',
    linkedTo: 'FAC-F-2026-0012',
    history: ['Paiement fournisseur préparé', 'Validé finance', 'Émis par virement']
  },
  {
    id: 'demo-payp-2',
    type: 'paiement_emis',
    numero: 'PAY-P-2026-00002',
    client: 'Imprimerie Carthage',
    total: 430,
    statut: 'Appliqué',
    date: '2026-05-11',
    linkedTo: 'FAC-F-2026-0009',
    history: ['Paiement émis', 'Justificatif attaché', 'Lettré avec facture fournisseur']
  },
  {
    id: 'demo-of-1',
    type: 'ordre_fabrication',
    numero: 'OF-2026-0001',
    client: 'Atelier Nord',
    total: 1640,
    statut: 'En cours',
    date: '2026-05-15',
    convertedTo: 'EV-2026-0001',
    history: ['Ordre de fabrication créé', 'Matières réservées', 'Production lancée', 'Bon de sortie EV-2026-0001 généré']
  },
  {
    id: 'demo-of-2',
    type: 'ordre_fabrication',
    numero: 'OF-2026-0002',
    client: 'Ligne Packaging',
    total: 920,
    statut: 'Confirmé',
    date: '2026-05-17',
    history: ['Ordre créé', 'Capacité atelier confirmée']
  }
];

const STATUS_IN_PROGRESS = ['Envoyé', 'Reçu', 'Préparé', 'Émise', 'Généré', 'En cours', 'Expédié'];
const STATUS_POSITIVE = ['Accepté', 'Confirmé', 'Livré', 'Payée', 'Appliqué', 'Converti', 'Émis'];
const STATUS_RISK = ['Refusé', 'Expiré', 'Annulé', 'Litige', 'Retard'];

const TEMPLATE_SLUGS: Record<DocumentKey, string> = {
  devis: 'devis',
  bon_commande: 'bon-commande',
  bon_livraison: 'bon-livraison',
  facture: 'facture',
  recu_paiement: 'paiement',
  avoir: 'avoir',
  proforma: 'facture-proforma',
  bon_sortie: 'bon-sortie',
  paiement_emis: 'paiement-emis',
  ordre_fabrication: 'ordre-fabrication'
};

@Component({
  selector: 'app-documents',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './documents.component.html',
  styleUrls: ['./documents.component.scss']
})
export class DocumentsComponent {
  private readonly api = inject(DocumentsApiService);
  private readonly personnSvc = inject(PersonnalisationApiService);
  private readonly entrepriseSvc = inject(EntrepriseApiService);
  private readonly paramFiscalSvc = inject(ParametreFiscalApiService);
  private readonly authSvc = inject(AuthService);
  private readonly route = inject(ActivatedRoute);

  readonly types = TYPES;
  private readonly venteTypeKeys = new Set<DocumentKey>([
    'devis',
    'bon_commande',
    'bon_livraison',
    'facture',
    'recu_paiement',
    'avoir',
    'proforma',
    'bon_sortie'
  ]);
  private readonly achatTypeKeys = new Set<DocumentKey>([
    'bon_commande',
    'bon_livraison',
    'paiement_emis',
    'ordre_fabrication'
  ]);
  readonly modePaiementOptions = ['Virement', 'Cheque', 'Especes', 'CarteBancaire', 'Traite'];
  readonly clients: DocumentClientOption[] = [
    { id: 'atlas', nom: 'Societe Atlas Services', matriculeFiscal: '8172634A', adresse: '14 Rue du Lac, Tunis', email: 'contact@atlas.tn' },
    { id: 'direction', nom: 'Direction regionale Equipements', matriculeFiscal: '1045829M', adresse: 'Avenue Habib Bourguiba, Sousse', email: 'finance@dre.tn' },
    { id: 'ines', nom: 'Ines Mansouri', matriculeFiscal: 'CIN-08264513', adresse: 'Route de la Marsa, Tunis', email: 'ines@example.tn' },
    { id: 'atelier', nom: 'Atelier Nord', matriculeFiscal: '1298844N', adresse: 'Zone industrielle, Bizerte', email: 'atelier@nord.tn' }
  ];
  readonly produits: DocumentProduitOption[] = [
    { id: 'svc-setup', code: 'SERV-001', libelle: 'Parametrage initial', description: 'Activation et accompagnement de demarrage', prixUnitaire: 1250, tauxTva: 19, unite: 'Forfait' },
    { id: 'dev-web', code: 'DEV-002', libelle: 'Developpement specifique', description: 'Travaux de developpement et integration', prixUnitaire: 850, tauxTva: 19, unite: 'Jour' },
    { id: 'support', code: 'SUP-003', libelle: 'Support technique', description: 'Assistance et maintenance', prixUnitaire: 120, tauxTva: 19, unite: 'Heure' },
    { id: 'stock', code: 'ART-004', libelle: 'Article stock', description: 'Produit commercialise', prixUnitaire: 95, tauxTva: 19, unite: 'U' }
  ];

  loading = signal(true);
  view = signal<'list' | 'editor'>('list');
  selectedType = signal<DocumentKey>('devis');
  businessFlow = signal<'vente' | 'achat' | 'general'>('general');
  routePageTitle = signal('');
  search = signal('');
  statusFilter = signal<'Tous' | DocumentStatus>('Tous');
  documents = signal<BusinessDocument[]>(DEMO_DOCUMENTS);
  selectedDocument = signal<BusinessDocument | null>(null);
  editorDraft = signal<DocumentEditorDraft | null>(null);
  templateHtml = signal('');
  personnalisation = signal<any>(null);
  entreprise = signal<any>(null);
  parametresFiscaux = signal<any[]>([]);
  showXmlModal = signal(false);
  xmlPreview = signal('');
  pdfLoading = signal(false);
  rechercheClient = '';
  showClientDropdown = signal(false);

  activeType = computed(() => this.types.find(t => t.key === this.selectedType()) ?? this.types[0]);
  visibleTypes = computed(() => {
    if (this.businessFlow() === 'vente') {
      return this.types.filter(type => this.venteTypeKeys.has(type.key));
    }
    if (this.businessFlow() === 'achat') {
      return this.types.filter(type => this.achatTypeKeys.has(type.key));
    }
    return this.types;
  });
  pageTitle = computed(() => this.routePageTitle() || (
    this.businessFlow() === 'achat' ? 'Documents achats' :
    this.businessFlow() === 'vente' ? 'Documents ventes' :
    'Documents commerciaux'
  ));
  pageSubtitle = computed(() => {
    if (this.businessFlow() === 'achat') {
      return 'Suivi des achats, fournisseurs, réceptions, décaissements et justificatifs.';
    }
    if (this.businessFlow() === 'vente') {
      return 'Suivi des ventes, devis, commandes, livraisons, factures et encaissements.';
    }
    return 'Tableau de pilotage par type de document, suivi des conversions et traçabilité complète.';
  });
  statuses = computed(() => ['Tous', ...this.activeType().statuses] as Array<'Tous' | DocumentStatus>);
  isInvoiceTable = computed(() => this.selectedType() === 'facture');
  logoFactureUrl = computed(() => {
    const pdf = this.personnalisation()?.pdf;
    if (pdf?.options?.showLogo === false) return '';
    return pdf?.logoUrl || this.entreprise()?.logoUrl || '';
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
  docAccent = computed(() => this.personnalisation()?.pdf?.primaryColor || this.activeType().color);
  footerText = computed(() => this.personnalisation()?.pdf?.footerText || '');
  clientSelectionne = computed(() => {
    const draft = this.editorDraft();
    if (!draft) return null;
    return this.clients.find(c => c.nom === draft.client || c.matriculeFiscal === draft.clientCode) ?? null;
  });
  clientsFiltres = computed(() => {
    const q = this.rechercheClient.trim().toLowerCase();
    const source = q
      ? this.clients.filter(c => `${c.nom} ${c.matriculeFiscal} ${c.email ?? ''}`.toLowerCase().includes(q))
      : this.clients;
    return source.slice(0, 8);
  });
  groupesTva = computed(() => {
    const map = new Map<number, { baseHt: number; montantTva: number }>();
    for (const line of this.editorDraft()?.lignes ?? []) {
      const current = map.get(line.tauxTva) ?? { baseHt: 0, montantTva: 0 };
      map.set(line.tauxTva, {
        baseHt: current.baseHt + this.lineHt(line),
        montantTva: current.montantTva + this.lineTva(line)
      });
    }
    return Array.from(map.entries()).map(([taux, values]) => ({ taux, ...values }));
  });

  visibleDocuments = computed(() => {
    const type = this.selectedType();
    const q = this.search().trim().toLowerCase();
    const status = this.statusFilter();

    return this.documents().filter(doc => {
      if (doc.type !== type) return false;
      if (status !== 'Tous' && doc.statut !== status) return false;
      if (!q) return true;
      return `${doc.numero} ${doc.client} ${doc.statut} ${doc.linkedTo ?? ''}`.toLowerCase().includes(q);
    });
  });

  metrics = computed<MetricCard[]>(() => {
    const docs = this.documents().filter(d => d.type === this.selectedType());
    const active = this.activeType();
    const total = docs.length;
    const amount = docs.reduce((sum, doc) => sum + doc.total, 0);
    const primary = docs.filter(d => STATUS_IN_PROGRESS.includes(d.statut)).length;
    const positive = docs.filter(d => STATUS_POSITIVE.includes(d.statut)).length;
    const risk = docs.filter(d => STATUS_RISK.includes(d.statut)).length;
    return [
      { label: 'Documents', value: total, hint: active.label, icon: 'ti ti-files', color: active.color },
      { label: 'En cours', value: primary, hint: 'À suivre', icon: 'ti ti-progress', color: '#F59E0B' },
      { label: 'Validés', value: positive, hint: 'Flux avançable', icon: 'ti ti-circle-check', color: '#22C55E' },
      { label: 'Risque', value: risk, hint: 'À traiter', icon: 'ti ti-alert-triangle', color: '#EF4444' },
      { label: 'Total TTC', value: this.money(amount), hint: 'Montant cumulé', icon: 'ti ti-cash', color: '#8B5CF6' }
    ];
  });

  constructor() {
    this.route.data.subscribe(data => this.applyRouteContext(data));
    this.load();
    this.chargerEntreprise();
    this.chargerPersonnalisation();
    this.chargerParametresFiscaux();
  }

  private applyRouteContext(data: Data): void {
    const documentType = data['documentType'] as DocumentKey | undefined;
    if (documentType && this.types.some(type => type.key === documentType)) {
      this.selectType(documentType);
    }
    const flow = data['businessFlow'] === 'achat' || data['businessFlow'] === 'vente' ? data['businessFlow'] : 'general';
    this.businessFlow.set(flow);
    this.routePageTitle.set(typeof data['pageTitle'] === 'string' ? data['pageTitle'] : '');
  }

  load() {
    this.loading.set(true);
    this.api.dashboard().pipe(
      catchError(() => of({ documents: this.loadCachedDocuments() }))
    ).subscribe({
      next: payload => {
        const docs = this.ensureCompleteDocuments(this.normalizeDocuments(payload.documents));
        this.documents.set(docs);
        this.persist();
        this.loading.set(false);
      },
      error: () => {
        this.documents.set(this.ensureCompleteDocuments(this.loadCachedDocuments()));
        this.loading.set(false);
      }
    });
  }

  private chargerEntreprise() {
    const id = this.authSvc.entrepriseId;
    if (!id) return;
    this.entrepriseSvc.obtenirParId(id).subscribe({
      next: entreprise => this.entreprise.set(entreprise),
      error: () => {}
    });
  }

  private chargerPersonnalisation() {
    this.personnSvc.obtenir().subscribe({
      next: personnalisation => {
        this.personnalisation.set(personnalisation?.donnees ?? null);
        this.editorDraft.update(draft => draft ? this.appliquerPersonnalisationAuDraft(draft) : draft);
      },
      error: () => {}
    });
  }

  private chargerParametresFiscaux() {
    this.paramFiscalSvc.lister().subscribe({
      next: params => {
        this.parametresFiscaux.set(params ?? []);
        this.editorDraft.update(draft => draft ? this.appliquerParametreRsAuDraft(draft) : draft);
      },
      error: () => {}
    });
  }

  selectType(key: DocumentKey) {
    this.selectedType.set(key);
    this.statusFilter.set('Tous');
    this.selectedDocument.set(null);
  }

  selectDocument(doc: BusinessDocument) {
    this.selectedDocument.set(doc);
  }

  openCreateEditor(key: DocumentKey = this.selectedType()) {
    const type = this.types.find(t => t.key === key) ?? this.activeType();
    const today = new Date();
    const due = new Date(today);
    due.setDate(today.getDate() + 30);
    this.selectedType.set(type.key);
    const defaults = this.documentDefaults(type.key);
    this.editorDraft.set(this.appliquerPersonnalisationAuDraft({
      type: type.key,
      typeVente: defaults.typeVente,
      numero: this.nextNumero(type),
      client: '',
      clientCode: '',
      date: today.toISOString().slice(0, 10),
      echeance: due.toISOString().slice(0, 10),
      linkedTo: '',
      statut: type.statuses[0],
      devise: 'TND',
      modePaiement: 'Virement',
      delaiPaiement: 30,
      textLibre: defaults.textLibre,
      titre: defaults.titre,
      description: defaults.description,
      notes: '',
      conditionsPaiement: defaults.conditionsPaiement,
      remiseGlobale: 0,
      timbreFiscal: type.key === 'facture' || type.key === 'avoir',
      afficherMfClient: true,
      afficherIban: false,
      activerRetenue: type.key === 'facture',
      tauxRetenue: type.key === 'facture' ? 1.5 : 0,
      etablissement: '',
      iban: '',
      bic: '',
      reference: '',
      lignes: [this.defaultLine(type.key)]
    }));
    this.rechercheClient = '';
    this.loadTemplate(type.key);
    this.view.set('editor');
  }

  openEditEditor(doc: BusinessDocument) {
    this.selectedType.set(doc.type);
    this.selectedDocument.set(doc);
    const defaults = this.documentDefaults(doc.type);
    this.editorDraft.set(this.appliquerPersonnalisationAuDraft({
      id: doc.id,
      type: doc.type,
      typeVente: defaults.typeVente,
      numero: doc.numero,
      client: doc.client,
      clientCode: '8172634A',
      date: doc.date,
      echeance: doc.echeance ?? doc.date,
      linkedTo: doc.linkedTo ?? '',
      statut: doc.statut,
      devise: 'TND',
      modePaiement: 'Virement',
      delaiPaiement: 30,
      textLibre: defaults.textLibre,
      titre: defaults.titre,
      description: defaults.description,
      notes: doc.history.join('\n'),
      conditionsPaiement: defaults.conditionsPaiement,
      remiseGlobale: 0,
      timbreFiscal: doc.type === 'facture' || doc.type === 'avoir',
      afficherMfClient: true,
      afficherIban: false,
      activerRetenue: doc.type === 'facture',
      tauxRetenue: doc.type === 'facture' ? 1.5 : 0,
      etablissement: '',
      iban: '',
      bic: '',
      reference: doc.numero,
      lignes: [this.lineFromDocument(doc)]
    }));
    this.rechercheClient = doc.client;
    this.loadTemplate(doc.type);
    this.view.set('editor');
  }

  closeEditor() {
    this.view.set('list');
    this.editorDraft.set(null);
  }

  editRoute(doc: BusinessDocument): string {
    const cfg = this.types.find(t => t.key === doc.type);
    if (this.invoiceEditorType(doc.type)) return '/factures';
    return cfg?.editRoute ?? '/documents';
  }

  createRoute(): string | null {
    if (this.invoiceEditorType(this.activeType().key)) return '/factures';
    return this.activeType().createRoute ?? this.activeType().editRoute ?? null;
  }

  createQueryParams(): Record<string, string> | null {
    const type = this.invoiceEditorType(this.activeType().key);
    return type ? { action: 'create', type } : null;
  }

  editQueryParams(doc: BusinessDocument): Record<string, string> {
    const type = this.invoiceEditorType(doc.type);
    const backendId = this.backendFactureId(doc.id);
    if (backendId) return { action: 'edit', id: backendId, type: type ?? 'Facture' };
    return { action: 'create', type: type ?? this.activeType().label, source: doc.numero };
  }

  updateDraft(patch: Partial<DocumentEditorDraft>) {
    this.editorDraft.update(current => current ? { ...current, ...patch } : current);
  }

  updateDraftType(key: DocumentKey) {
    const cfg = this.types.find(t => t.key === key) ?? this.activeType();
    const defaults = this.documentDefaults(key);
    this.selectedType.set(key);
    this.editorDraft.update(current => current ? {
      ...current,
      type: key,
      typeVente: defaults.typeVente,
      textLibre: defaults.textLibre,
      titre: defaults.titre,
      description: defaults.description,
      conditionsPaiement: defaults.conditionsPaiement,
      timbreFiscal: key === 'facture' || key === 'avoir',
      activerRetenue: key === 'facture',
      tauxRetenue: key === 'facture' ? (current.tauxRetenue || 1.5) : 0,
      statut: cfg.statuses.includes(current.statut) ? current.statut : cfg.statuses[0],
      numero: current.id ? current.numero : this.nextNumero(cfg)
    } : current);
    this.loadTemplate(key);
  }

  rechercherClients() {
    this.showClientDropdown.set(true);
  }

  selectionnerClient(client: DocumentClientOption) {
    this.rechercheClient = client.nom;
    this.editorDraft.update(current => current ? {
      ...current,
      client: client.nom,
      clientCode: client.matriculeFiscal
    } : current);
    this.showClientDropdown.set(false);
  }

  changerClient() {
    this.editorDraft.update(current => current ? { ...current, client: '', clientCode: '' } : current);
    this.rechercheClient = '';
    this.showClientDropdown.set(true);
  }

  onProduitChange(line: DocumentLineDraft, produitId: string) {
    const produit = this.produits.find(p => p.id === produitId);
    if (!produit) return;
    Object.assign(line, {
      produitId: produit.id,
      designation: produit.libelle,
      description: produit.description,
      prixUnitaire: produit.prixUnitaire,
      tauxTva: produit.tauxTva,
      unite: produit.unite
    });
    this.editorDraft.update(current => current ? { ...current } : current);
  }

  onDelaiChange(jours: number | string) {
    const value = Number(jours) || 0;
    const base = new Date(this.editorDraft()?.date ?? new Date().toISOString());
    base.setDate(base.getDate() + value);
    this.updateDraft({
      delaiPaiement: value,
      echeance: base.toISOString().slice(0, 10),
      conditionsPaiement: this.buildDefaultConditions(value, this.editorDraft()?.type ?? this.selectedType())
    });
  }

  retenueAmount(draft = this.editorDraft()): number {
    return draft?.activerRetenue ? this.editorTotalHt(draft) * (Number(draft.tauxRetenue || 0) / 100) : 0;
  }

  netAPayer(draft = this.editorDraft()): number {
    return Math.max(0, this.editorTotalTtc(draft) - this.retenueAmount(draft));
  }

  updateLine(index: number, patch: Partial<DocumentLineDraft>) {
    this.editorDraft.update(current => {
      if (!current) return current;
      return { ...current, lignes: current.lignes.map((line, i) => i === index ? { ...line, ...patch } : line) };
    });
  }

  addLine() {
    const type = this.editorDraft()?.type ?? this.selectedType();
    this.editorDraft.update(current => current ? { ...current, lignes: [...current.lignes, this.defaultLine(type)] } : current);
  }

  removeLine(index: number) {
    this.editorDraft.update(current => {
      if (!current || current.lignes.length <= 1) return current;
      return { ...current, lignes: current.lignes.filter((_, i) => i !== index) };
    });
  }

  saveEditor(finalize = false) {
    const draft = this.editorDraft()!;
    if (!draft) return;
    const finalStatus = finalize ? this.nextManualStatusForType(draft.type, draft.statut) ?? draft.statut : draft.statut;
    const total = this.editorTotalTtc(draft);
    const doc: BusinessDocument = {
      id: draft.id ?? crypto.randomUUID(),
      type: draft.type,
      numero: draft.numero,
      client: draft.client,
      total,
      statut: finalStatus,
      date: draft.date,
      echeance: draft.echeance,
      linkedTo: draft.linkedTo || undefined,
      history: draft.notes.trim()
        ? [
          ...draft.notes.split('\n').map(line => line.trim()).filter(Boolean),
          ...(finalize && finalStatus !== draft.statut ? [`Statut change : ${draft.statut} -> ${finalStatus}`] : [])
        ]
        : [
          `${draft.numero} modifie depuis l'editeur documents`,
          ...(finalize && finalStatus !== draft.statut ? [`Statut change : ${draft.statut} -> ${finalStatus}`] : [])
        ],
      montantPaye: this.isPaidStatus(finalStatus) ? total : 0,
      montantRestant: this.isPaidStatus(finalStatus) ? 0 : total,
      xmlGenere: this.isTransmittedStatus(finalStatus)
    };

    this.documents.update(items => {
      const exists = items.some(item => item.id === doc.id);
      return exists ? items.map(item => item.id === doc.id ? doc : item) : [doc, ...items];
    });
    this.persist();
    this.selectedType.set(draft.type);
    this.selectedDocument.set(doc);
    this.closeEditor();
  }

  ouvrirApercuXml() {
    this.xmlPreview.set(this.buildXmlPreview());
    this.showXmlModal.set(true);
  }

  fermerApercuXml() {
    this.showXmlModal.set(false);
  }

  telechargerXmlPreview() {
    const draft = this.editorDraft();
    const numero = draft?.numero || 'document-brouillon';
    const blob = new Blob([this.xmlPreview() || this.buildXmlPreview()], { type: 'application/xml;charset=utf-8' });
    this.telechargerBlob(blob, `${numero}_TEIF_preview.xml`);
  }

  async copierXml() {
    await navigator.clipboard.writeText(this.xmlPreview() || this.buildXmlPreview());
  }

  async exporterPdf() {
    const draft = this.editorDraft();
    const page = document.querySelector('.document-editor .facture-doc') as HTMLElement | null;
    if (!draft || !page || this.pdfLoading()) return;

    this.pdfLoading.set(true);
    try {
      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF('p', 'pt', 'a4');
      await new Promise<void>(resolve => {
        pdf.html(page, {
          x: 18,
          y: 18,
          width: 559,
          windowWidth: page.scrollWidth,
          callback: () => resolve()
        });
      });
      pdf.save(`${draft.numero || 'document'}.pdf`);
    } finally {
      this.pdfLoading.set(false);
    }
  }

  actionLabel(doc: BusinessDocument): string | null {
    const cfg = this.types.find(t => t.key === doc.type);
    if (!cfg?.next) return null;
    if (doc.convertedTo) return `Converti vers ${doc.convertedTo}`;
    return cfg.next.from.includes(doc.statut) ? cfg.next.label : null;
  }

  cycleButtonLabel(doc: BusinessDocument): string | null {
    const target = this.cycleTargetType(doc);
    if (!target) return null;
    return target.prefix;
  }

  cycleTitle(doc: BusinessDocument): string {
    const target = this.cycleTargetType(doc);
    if (!target) return 'Aucun cycle disponible';
    if (doc.convertedTo) return `Ouvrir ${doc.convertedTo}`;
    const cfg = this.types.find(t => t.key === doc.type);
    return cfg?.next?.label ?? `Convertir en ${target.label}`;
  }

  handleCycle(doc: BusinessDocument) {
    if (doc.convertedTo) {
      this.openConvertedDocument(doc);
      return;
    }
    this.convert(doc);
  }

  canConvert(doc: BusinessDocument): boolean {
    const cfg = this.types.find(t => t.key === doc.type);
    return !!cfg?.next && cfg.next.from.includes(doc.statut) && !doc.convertedTo;
  }

  canAdvanceStatus(doc: BusinessDocument): boolean {
    return !!this.nextManualStatus(doc);
  }

  nextStatusLabel(doc: BusinessDocument): string {
    return this.nextManualStatus(doc) ?? doc.statut;
  }

  advanceStatus(doc: BusinessDocument) {
    const next = this.nextManualStatus(doc);
    if (!next) return;
    const updated = {
      ...doc,
      statut: next,
      montantPaye: this.isPaidStatus(next) ? doc.total : doc.montantPaye,
      montantRestant: this.isPaidStatus(next) ? 0 : doc.montantRestant,
      xmlGenere: this.isTransmittedStatus(next) || doc.xmlGenere,
      history: [...doc.history, `Statut change : ${doc.statut} -> ${next}`]
    };
    this.documents.update(items => items.map(item => item.id === doc.id ? updated : item));
    if (this.selectedDocument()?.id === doc.id) this.selectedDocument.set(updated);
    this.persist();
  }

  private nextManualStatus(doc: BusinessDocument): DocumentStatus | null {
    return this.nextManualStatusForType(doc.type, doc.statut);
  }

  private nextManualStatusForType(type: DocumentKey, current: DocumentStatus): DocumentStatus | null {
    if (current !== 'Brouillon') return null;
    const cfg = this.types.find(t => t.key === type);
    return cfg?.statuses.find(status => status !== 'Brouillon') ?? null;
  }

  convert(doc: BusinessDocument) {
    if (!this.canConvert(doc)) return;

    if (!doc.id.startsWith('demo-')) {
      this.api.convertir(doc.id).pipe(catchError(() => of(null))).subscribe(created => {
        if (created) {
          const next = this.normalizeDocuments([created])[0];
          this.documents.update(items => items.map(item =>
            item.id === doc.id
              ? { ...item, statut: item.type === 'devis' ? 'Converti' : item.statut, convertedTo: next.numero, history: [...item.history, `Converti vers ${next.numero}`] }
              : item
          ).concat(next));
          this.persist();
          this.selectType(next.type);
          this.selectedDocument.set(next);
          return;
        }
        this.convertLocally(doc);
      });
      return;
    }

    this.convertLocally(doc);
  }

  private cycleTargetType(doc: BusinessDocument): DocumentTypeConfig | null {
    const cfg = this.types.find(t => t.key === doc.type);
    if (!cfg?.next) return null;
    return this.types.find(t => t.key === cfg.next!.key) ?? null;
  }

  private openConvertedDocument(doc: BusinessDocument) {
    const converted = this.documents().find(item => item.numero === doc.convertedTo);
    if (converted) {
      this.selectType(converted.type);
      this.selectedDocument.set(converted);
      return;
    }

    const target = this.cycleTargetType(doc);
    if (target) this.selectType(target.key);
  }

  remove(doc: BusinessDocument) {
    this.documents.update(items => items.filter(item => item.id !== doc.id));
    if (this.selectedDocument()?.id === doc.id) this.selectedDocument.set(null);
    this.persist();
  }

  statusClass(status: DocumentStatus): string {
    if (STATUS_POSITIVE.includes(status)) return 'ok';
    if (STATUS_RISK.includes(status)) return 'danger';
    if (['Brouillon', 'Préparé', 'Généré'].includes(status)) return 'muted';
    return 'warn';
  }

  money(value: number): string {
    return `${new Intl.NumberFormat('fr-TN', { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(value)} TND`;
  }

  paymentLabel(doc: BusinessDocument): string {
    return this.isPaid(doc) ? 'Payée' : 'Non payée';
  }

  paymentClass(doc: BusinessDocument): string {
    return this.isPaid(doc) ? 'ok' : 'muted';
  }

  transmissionLabel(doc: BusinessDocument): string {
    return this.isTransmitted(doc) ? 'Transmis' : 'Non transmis';
  }

  transmissionClass(doc: BusinessDocument): string {
    return this.isTransmitted(doc) ? 'ok' : 'danger';
  }

  templateName(type: DocumentKey = this.editorDraft()?.type ?? this.selectedType()): string {
    return `${TEMPLATE_SLUGS[type]}-standard.html`;
  }

  editorTotalHt(draft = this.editorDraft()): number {
    return Math.max(0, (draft?.lignes.reduce((sum, line) => sum + this.lineHt(line), 0) ?? 0) - Number(draft?.remiseGlobale || 0));
  }

  editorTotalTva(draft = this.editorDraft()): number {
    return draft?.lignes.reduce((sum, line) => sum + this.lineTva(line), 0) ?? 0;
  }

  editorTotalTtc(draft = this.editorDraft()): number {
    return this.editorTotalHt(draft) + this.editorTotalTva(draft);
  }

  lineHt(line: DocumentLineDraft): number {
    const brut = Number(line.quantite || 0) * Number(line.prixUnitaire || 0);
    return brut - brut * (Number(line.tauxRemise || 0) / 100);
  }

  lineTva(line: DocumentLineDraft): number {
    return this.lineHt(line) * (Number(line.tauxTva || 0) / 100);
  }

  previewHtml(): string {
    const draft = this.editorDraft()!;
    if (!draft) return '';
    const type = this.types.find(t => t.key === draft.type) ?? this.activeType();
    return this.renderTemplatePreview(this.templateHtml(), draft, type);

    /*
    return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <style>${css}
    body{min-height:auto;padding:18px;background:#f8fafc;align-items:flex-start}
    .invoice{box-shadow:0 16px 40px rgba(15,23,42,.12)}
    .item-name span{display:block;margin-top:4px;color:#6b7280;font-size:11px}
    .live-template-tag{position:fixed;right:14px;bottom:12px;background:#111827;color:#fff;border-radius:999px;padding:6px 10px;font:700 10px/1 sans-serif;opacity:.75}
  </style>
</head>
<body>
  <div class="invoice">
    <div class="header">
      <div>
        <div class="logo">Tuni<span>Flow</span></div>
        <div style="margin-top:12px;color:#666;font-size:13px">Technologies & logiciels<br>MF : 1734567ABM000<br>Tel : 55897711</div>
      </div>
      <div class="invoice-info">
        <div class="invoice-title">${this.escapeHtml(type.label)}</div>
        <div class="invoice-number">N° ${this.escapeHtml(draft.numero)}</div>
        <div class="invoice-date">Emission : ${this.formatDate(draft.date)}</div>
        <div class="invoice-date">Echeance : ${this.formatDate(draft.echeance)}</div>
      </div>
    </div>
    <div class="parties">
      <div class="party">
        <div class="party-title">Emetteur</div>
        <div class="party-name">Technologies & logiciels</div>
        <div class="party-detail">MF : 1734567ABM000</div>
      </div>
      <div class="party">
        <div class="party-title">Client</div>
        <div class="party-name">${this.escapeHtml(draft.client)}</div>
        <div class="party-detail">MF : ${this.escapeHtml(draft.clientCode || '-')}</div>
      </div>
    </div>
    ${draft.linkedTo ? `<div style="margin-bottom:18px;color:#666;font-size:12px">Origine : ${this.escapeHtml(draft.linkedTo)}</div>` : ''}
    <h3 style="margin-bottom:14px;color:#111827">${this.escapeHtml(draft.titre || type.label)}</h3>
    <table class="items-table">
      <thead><tr><th>Designation</th><th>Qte</th><th>PU HT</th><th>TVA</th><th>Total HT</th><th>Total TTC</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="totals">
      <div class="total-row"><span>Total HT</span><span>${this.formatNumber(this.editorTotalHt(draft))} ${this.escapeHtml(draft.devise)}</span></div>
      <div class="total-row"><span>Total TVA</span><span>${this.formatNumber(this.editorTotalTva(draft))} ${this.escapeHtml(draft.devise)}</span></div>
      <div class="total-final"><span>Total TTC</span><span>${this.formatNumber(this.editorTotalTtc(draft))} ${this.escapeHtml(draft.devise)}</span></div>
    </div>
    <div style="clear:both;margin-top:34px;color:#666;font-size:12px;white-space:pre-line">${this.escapeHtml(draft.notes)}</div>
  </div>
  <div class="live-template-tag">${this.escapeHtml(this.templateName(draft.type))}</div>
</body>
</html>`;
*/
  }

  private convertLocally(doc: BusinessDocument) {
    const cfg = this.types.find(t => t.key === doc.type);
    if (!cfg?.next) return;
    const target = this.types.find(t => t.key === cfg.next!.key);
    if (!target) return;
    const numero = this.nextNumero(target);
    const nextDoc: BusinessDocument = {
      id: crypto.randomUUID(),
      type: target.key,
      numero,
      client: doc.client,
      total: doc.total,
      statut: target.statuses[0],
      date: new Date().toISOString().slice(0, 10),
      linkedTo: doc.numero,
      history: [`Créé depuis ${doc.numero}`, 'Données héritées automatiquement']
    };

    this.documents.update(items => items.map(item =>
      item.id === doc.id
        ? { ...item, statut: item.type === 'devis' ? 'Converti' : item.statut, convertedTo: numero, history: [...item.history, `Converti vers ${numero}`] }
        : item
    ).concat(nextDoc));
    this.persist();
    this.selectType(target.key);
    this.selectedDocument.set(nextDoc);
  }

  private loadTemplate(type: DocumentKey) {
    fetch(`/templates/${this.templateName(type)}`)
      .then(response => response.ok ? response.text() : '')
      .then(html => this.templateHtml.set(html || this.fallbackTemplateHtml()))
      .catch(() => this.templateHtml.set(this.fallbackTemplateHtml()));
  }

  private renderTemplatePreview(html: string, draft: DocumentEditorDraft, type: DocumentTypeConfig): string {
    const doc = new DOMParser().parseFromString(html || this.fallbackTemplateHtml(), 'text/html');
    this.setText(doc, '.invoice-title', draft.titre || type.label);
    this.setText(doc, '.invoice-number', `N° ${draft.numero}`);

    const dates = Array.from(doc.querySelectorAll<HTMLElement>('.invoice-date'));
    if (dates[0]) dates[0].textContent = `Date : ${this.formatDate(draft.date)}`;
    if (dates[1]) dates[1].textContent = `${this.dueDateLabel(type.key)} : ${this.formatDate(draft.echeance)}`;

    const parties = Array.from(doc.querySelectorAll<HTMLElement>('.party'));
    const clientParty = parties[1] ?? parties[0];
    if (clientParty) {
      const clientTitle = clientParty.querySelector<HTMLElement>('.party-title');
      const clientName = clientParty.querySelector<HTMLElement>('.party-name');
      const clientDetails = clientParty.querySelector<HTMLElement>('.party-details, .party-detail, .party-code');
      if (clientTitle) clientTitle.textContent = this.clientPartyLabel(type.key);
      if (clientName) clientName.textContent = draft.client || 'Client';
      if (clientDetails) {
        clientDetails.textContent = `${draft.clientCode || '-'}${draft.linkedTo ? `\nOrigine : ${draft.linkedTo}` : ''}`;
        clientDetails.style.whiteSpace = 'pre-line';
      }
    }

    this.replaceTemplateRows(doc, draft, type);
    this.replaceTemplateTotals(doc, draft);
    this.replaceTemplateFooter(doc, draft);
    this.injectPreviewStyles(doc, draft);

    return `<!DOCTYPE html>\n${doc.documentElement.outerHTML}`;
  }

  private replaceTemplateRows(doc: Document, draft: DocumentEditorDraft, type: DocumentTypeConfig) {
    const table = doc.querySelector('table');
    const tbody = table?.querySelector('tbody');
    if (!table || !tbody) return;

    const headers = Array.from(table.querySelectorAll('thead th')).map(th => th.textContent?.trim() || '');
    const columns = headers.length ? headers : ['Designation', 'TVA', 'PU HT', 'Quantite', 'Total HT'];
    tbody.innerHTML = '';

    draft.lignes.forEach((line, index) => {
      const tr = doc.createElement('tr');
      columns.forEach(header => {
        const td = doc.createElement('td');
        const value = this.valueForTemplateColumn(header, line, index, type);
        if (this.isDesignationColumn(header)) {
          td.className = 'item-name';
          td.textContent = line.designation || value;
          if (line.description) {
            const detail = doc.createElement('span');
            detail.textContent = line.description;
            td.appendChild(detail);
          }
        } else {
          td.textContent = value;
        }
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
  }

  private replaceTemplateTotals(doc: Document, draft: DocumentEditorDraft) {
    const totals = doc.querySelector<HTMLElement>('.totals');
    if (!totals) return;
    totals.innerHTML = '';

    const rows = [
      ['Total HT', `${this.formatNumber(this.editorTotalHt(draft))} ${draft.devise}`, 'subtotal'],
      ['TVA', `${this.formatNumber(this.editorTotalTva(draft))} ${draft.devise}`, 'tax'],
      ['Total TTC', `${this.formatNumber(this.editorTotalTtc(draft))} ${draft.devise}`, 'grand-total']
    ];

    rows.forEach(([label, value, className]) => {
      const row = doc.createElement('div');
      row.className = `total-row ${className}`;
      const labelSpan = doc.createElement('span');
      const valueSpan = doc.createElement('span');
      labelSpan.textContent = label;
      valueSpan.textContent = value;
      row.append(labelSpan, valueSpan);
      totals.appendChild(row);
    });
  }

  private replaceTemplateFooter(doc: Document, draft: DocumentEditorDraft) {
    const footer = doc.querySelector<HTMLElement>('.footer');
    if (!footer || !draft.notes.trim()) return;
    const title = footer.querySelector('.footer-title')?.cloneNode(true);
    footer.textContent = '';
    if (title) footer.appendChild(title);
    const notes = doc.createElement('div');
    notes.textContent = draft.notes;
    notes.style.whiteSpace = 'pre-line';
    footer.appendChild(notes);
  }

  private injectPreviewStyles(doc: Document, draft: DocumentEditorDraft) {
    const style = doc.createElement('style');
    style.textContent = `
      html, body { margin: 0 !important; min-height: auto !important; background: #f8fafc !important; }
      body { padding: 18px !important; overflow: auto !important; align-items: flex-start !important; justify-content: center !important; }
      .invoice { margin: 0 auto !important; box-shadow: 0 16px 40px rgba(15, 23, 42, .12) !important; }
      .item-name span { display: block; margin-top: 4px; color: #6b7280; font-size: 11px; font-weight: 400; }
      .live-template-tag { position: fixed; right: 14px; bottom: 12px; z-index: 1000; background: #111827; color: #fff; border-radius: 999px; padding: 6px 10px; font: 700 10px/1 sans-serif; opacity: .72; }
    `;
    doc.head.appendChild(style);

    const tag = doc.createElement('div');
    tag.className = 'live-template-tag';
    tag.textContent = this.templateName(draft.type);
    doc.body.appendChild(tag);
  }

  private valueForTemplateColumn(header: string, line: DocumentLineDraft, index: number, type: DocumentTypeConfig): string {
    const normalized = this.normalizeText(header);
    if (normalized.includes('ref')) return `${type.prefix}-${String(index + 1).padStart(3, '0')}`;
    if (this.isDesignationColumn(header)) return line.designation;
    if (normalized.includes('tax') || normalized.includes('tva')) return `TVA ${this.formatRate(line.tauxTva)}%`;
    if (normalized.includes('quant') || normalized.includes('qte')) return `${this.formatNumber(line.quantite)} ${line.unite}`;
    if (normalized.includes('unite')) return line.unite;
    if (normalized.includes('p.u') || normalized.includes('pu') || normalized.includes('prix unitaire')) return this.formatNumber(line.prixUnitaire);
    if (normalized.includes('ttc')) return this.formatNumber(this.lineHt(line) + this.lineTva(line));
    if (normalized.includes('prix') || normalized.includes('montant') || normalized.includes('total')) return this.formatNumber(this.lineHt(line));
    return '';
  }

  private isDesignationColumn(header: string): boolean {
    const normalized = this.normalizeText(header);
    return normalized.includes('article')
      || normalized.includes('designation')
      || normalized.includes('produit')
      || normalized.includes('service')
      || normalized.includes('operation')
      || normalized.includes('description');
  }

  private setText(doc: Document, selector: string, value: string) {
    const element = doc.querySelector<HTMLElement>(selector);
    if (element) element.textContent = value;
  }

  private dueDateLabel(type: DocumentKey): string {
    if (type === 'bon_livraison' || type === 'bon_sortie') return 'Livraison';
    if (type === 'bon_commande') return 'Livraison souhaitée';
    if (type === 'ordre_fabrication') return 'Fin prévue';
    return 'Échéance';
  }

  private clientPartyLabel(type: DocumentKey): string {
    return ['bon_commande', 'paiement_emis', 'ordre_fabrication'].includes(type) ? 'Fournisseur :' : 'Client :';
  }

  private fallbackTemplateHtml(): string {
    return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <style>
    *{box-sizing:border-box} body{font-family:Segoe UI,Tahoma,sans-serif;display:flex;justify-content:center;background:#fff;padding:20px}
    .invoice{width:210mm;min-height:297mm;background:#fff;padding:40px}
    .header{display:flex;justify-content:space-between;border-bottom:3px solid #e8c84a;padding-bottom:20px;margin-bottom:34px}
    .logo,.invoice-title{font-size:28px;font-weight:900}.logo span{color:#e8c84a}
    .invoice-info{text-align:right}.invoice-number,.invoice-date{color:#666;font-size:12px;margin-top:5px}
    .parties{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:30px}
    .party{background:#f8f9fa;padding:18px;border-radius:8px;border-left:4px solid #e8c84a}
    .party-title{font-size:11px;text-transform:uppercase;color:#777;font-weight:800;margin-bottom:8px}
    .party-name{font-weight:800}.party-details{color:#666;font-size:12px;margin-top:5px}
    table{width:100%;border-collapse:collapse} th{background:#f3f4f6;text-align:left;font-size:11px;padding:10px}td{border-bottom:1px solid #e5e7eb;padding:10px;font-size:12px}
    .totals{width:320px;margin:28px 0 0 auto}.total-row{display:flex;justify-content:space-between;padding:7px 0}.grand-total{border-top:2px solid #111827;font-weight:900}
  </style>
</head>
<body>
  <div class="invoice">
    <div class="header"><div class="logo">Tuni<span>Flow</span></div><div class="invoice-info"><div class="invoice-title">Document</div><div class="invoice-number"></div><div class="invoice-date"></div><div class="invoice-date"></div></div></div>
    <div class="parties"><div class="party"><div class="party-title">Émetteur :</div><div class="party-name">Technologies & logiciels</div><div class="party-details">MF : 1734567ABM000</div></div><div class="party"><div class="party-title">Client :</div><div class="party-name"></div><div class="party-details"></div></div></div>
    <table><thead><tr><th>Désignation</th><th>TVA</th><th>P.U.</th><th>Quantité</th><th>Prix</th></tr></thead><tbody></tbody></table>
    <div class="totals"></div>
    <div class="footer"><div class="footer-title">Notes</div></div>
  </div>
</body>
</html>`;
  }

  documentLabel(type: DocumentKey = this.editorDraft()?.type ?? this.selectedType()): string {
    return this.types.find(t => t.key === type)?.label ?? 'Document';
  }

  partyLabel(type: DocumentKey = this.editorDraft()?.type ?? this.selectedType()): string {
    if (type === 'bon_commande' || type === 'paiement_emis') return 'Fournisseur';
    if (type === 'ordre_fabrication') return 'Atelier / Destinataire';
    return 'Client ou Clientele';
  }

  sectionDefaultTitle(type: DocumentKey = this.editorDraft()?.type ?? this.selectedType()): string {
    if (type === 'bon_livraison' || type === 'bon_sortie') return 'Articles livres';
    if (type === 'ordre_fabrication') return 'Operations de fabrication';
    if (type === 'recu_paiement' || type === 'paiement_emis') return 'Reglement';
    return 'Section 1';
  }

  montantEnLettres(): string {
    const amount = this.netAPayer();
    if (!amount) return 'Zero dinar';
    return `${this.formatNumber(amount)} dinars tunisiens`;
  }

  private documentDefaults(type: DocumentKey): Pick<DocumentEditorDraft, 'typeVente' | 'textLibre' | 'titre' | 'description' | 'conditionsPaiement'> {
    const label = this.types.find(t => t.key === type)?.label ?? 'Document';
    const commonPayment = 'Paiement par virement, cheque ou especes selon accord. Les montants sont exprimes en TND.';
    const map: Record<DocumentKey, Pick<DocumentEditorDraft, 'typeVente' | 'textLibre' | 'titre' | 'description' | 'conditionsPaiement'>> = {
      devis: {
        typeVente: 'Vente locale',
        textLibre: 'Ce devis est valable 30 jours a compter de sa date d emission.',
        titre: 'Proposition commerciale',
        description: 'Prix, delais et conditions soumis a acceptation du client.',
        conditionsPaiement: 'Devis non fiscal. La commande devient ferme apres acceptation et emission du bon de commande.'
      },
      bon_commande: {
        typeVente: 'Achat local',
        textLibre: 'Bon de commande emis sous reserve de disponibilite et confirmation fournisseur.',
        titre: 'Commande fournisseur',
        description: 'Articles ou services commandes.',
        conditionsPaiement: 'La livraison doit respecter les quantites, prix et delais mentionnes.'
      },
      bon_livraison: {
        typeVente: 'Livraison locale',
        textLibre: 'Marchandises remises au destinataire sous reserve de controle.',
        titre: 'Bon de livraison',
        description: 'Detail des articles livres.',
        conditionsPaiement: 'La signature du bon de livraison vaut accusé de reception des articles.'
      },
      facture: {
        typeVente: 'Vente locale',
        textLibre: '',
        titre: '',
        description: '',
        conditionsPaiement: commonPayment
      },
      recu_paiement: {
        typeVente: 'Encaissement client',
        textLibre: 'Recu delivre pour justificatif de paiement.',
        titre: 'Recu de paiement',
        description: 'Reglement recu du client.',
        conditionsPaiement: 'Ce recu confirme le paiement du montant indique.'
      },
      avoir: {
        typeVente: 'Correction facture',
        textLibre: 'Avoir etabli en correction ou annulation partielle.',
        titre: 'Avoir client',
        description: 'Montants a deduire ou a rembourser.',
        conditionsPaiement: 'A imputer sur une facture existante ou a rembourser selon accord.'
      },
      proforma: {
        typeVente: 'Vente locale',
        textLibre: 'Facture proforma non fiscale, emise a titre indicatif.',
        titre: 'Facture proforma',
        description: 'Simulation de facturation avant emission definitive.',
        conditionsPaiement: 'Document non comptable. La facture definitive sera emise apres validation.'
      },
      bon_sortie: {
        typeVente: 'Sortie stock',
        textLibre: 'Bon de sortie interne pour mouvement de stock.',
        titre: 'Sortie de stock',
        description: 'Articles sortis du depot ou de l atelier.',
        conditionsPaiement: 'Document de suivi interne sans valeur fiscale.'
      },
      paiement_emis: {
        typeVente: 'Decaissement fournisseur',
        textLibre: 'Paiement emis au profit du fournisseur.',
        titre: 'Paiement emis',
        description: 'Detail du reglement fournisseur.',
        conditionsPaiement: 'Le paiement est rattache aux references indiquees.'
      },
      ordre_fabrication: {
        typeVente: 'Production interne',
        textLibre: 'Ordre de fabrication destine a l atelier.',
        titre: 'Ordre de fabrication',
        description: 'Operations, composants et quantites a produire.',
        conditionsPaiement: 'Document interne de production et de tracabilite.'
      }
    };
    return map[type] ?? { typeVente: 'Vente locale', textLibre: '', titre: label, description: '', conditionsPaiement: commonPayment };
  }

  private appliquerPersonnalisationAuDraft(draft: DocumentEditorDraft): DocumentEditorDraft {
    const defaults = this.personnalisationDefaults(draft.date);
    return this.appliquerParametreRsAuDraft({
      ...draft,
      devise: draft.devise || defaults.devise,
      delaiPaiement: draft.delaiPaiement || defaults.delaiPaiement,
      echeance: draft.echeance || defaults.dateEcheance,
      modePaiement: draft.modePaiement || defaults.modePaiement,
      conditionsPaiement: draft.conditionsPaiement || defaults.conditionsPaiement,
      timbreFiscal: draft.timbreFiscal || defaults.timbreFiscal,
      afficherIban: draft.afficherIban || defaults.afficherIban,
      iban: draft.iban || defaults.iban
    });
  }

  private appliquerParametreRsAuDraft(draft: DocumentEditorDraft): DocumentEditorDraft {
    const rs = this.parametresFiscaux().find((p: any) =>
      p?.estActif !== false &&
      (p?.inclureRetenueSource || this.normalizeText(p?.libelle).includes('retenue'))
    );
    if (!rs || draft.type !== 'facture') return draft;
    if (draft.activerRetenue && draft.tauxRetenue) return draft;
    return {
      ...draft,
      activerRetenue: !!rs.inclureRetenueSource,
      tauxRetenue: Number(rs.valeur ?? draft.tauxRetenue ?? 0)
    };
  }

  private personnalisationDefaults(dateEmission: string) {
    const personnalisation = this.personnalisation() ?? {};
    const pdf = personnalisation.pdf ?? {};
    const conditions = personnalisation.conditions ?? {};
    const comptabilite = personnalisation.comptabilite ?? {};
    const delaiPaiement = this.parsePositiveNumber(conditions.delaiPaiement, 30);
    return {
      devise: comptabilite.devise || conditions.devise || 'TND',
      delaiPaiement,
      dateEcheance: this.computeDateEcheance(dateEmission, delaiPaiement),
      conditionsPaiement: this.defaultConditionsFromPersonnalisation(delaiPaiement),
      modePaiement: this.resolveDefaultModePaiement(),
      timbreFiscal: !!pdf?.options?.showTimbre,
      afficherIban: !!pdf?.options?.showIban,
      iban: typeof pdf?.iban === 'string' ? pdf.iban : ''
    };
  }

  private defaultConditionsFromPersonnalisation(delaiPaiement: number): string {
    const cgv = this.personnalisation()?.conditions?.cgv;
    if (typeof cgv === 'string' && cgv.trim()) return cgv.trim();
    return `Paiement sous ${delaiPaiement} jours`;
  }

  private resolveDefaultModePaiement(): string {
    const modes = this.personnalisation()?.modesPaiement ?? [];
    const active = modes.find((mode: any) => mode?.actif) ?? null;
    const code = String(active?.code ?? '').toUpperCase();
    const label = this.normalizeText(active?.label);
    if (code === 'ESP' || label.includes('espece')) return 'Especes';
    if (code === 'CHQ' || label.includes('cheque')) return 'Cheque';
    if (code === 'LC' || label.includes('traite') || label.includes('lettre')) return 'Traite';
    if (code === 'ONLINE' || label.includes('carte')) return 'CarteBancaire';
    return 'Virement';
  }

  private parsePositiveNumber(value: unknown, fallback: number): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
  }

  private computeDateEcheance(dateEmission: string, delaiPaiement: number): string {
    const date = new Date(dateEmission || new Date().toISOString());
    date.setDate(date.getDate() + delaiPaiement);
    return date.toISOString().slice(0, 10);
  }

  private buildXmlPreview(): string {
    const draft = this.editorDraft();
    const entreprise = this.entreprise();
    const escape = (value: unknown) => String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
    if (!draft) return '';
    const lignes = draft.lignes.map((line, index) => `
    <cac:InvoiceLine>
      <cbc:ID>${index + 1}</cbc:ID>
      <cbc:InvoicedQuantity unitCode="${escape(line.unite || 'U')}">${Number(line.quantite || 0).toFixed(3)}</cbc:InvoicedQuantity>
      <cbc:LineExtensionAmount currencyID="${escape(draft.devise)}">${this.lineHt(line).toFixed(3)}</cbc:LineExtensionAmount>
      <cac:Item><cbc:Name>${escape(line.designation || 'Ligne')}</cbc:Name><cbc:Description>${escape(line.description)}</cbc:Description></cac:Item>
      <cac:Price><cbc:PriceAmount currencyID="${escape(draft.devise)}">${Number(line.prixUnitaire || 0).toFixed(3)}</cbc:PriceAmount></cac:Price>
    </cac:InvoiceLine>`).join('');
    return `<?xml version="1.0" encoding="UTF-8"?>
<ubl:Invoice xmlns:ubl="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2" xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2" xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:CustomizationID>TEIF-SIMULATION-V0</cbc:CustomizationID>
  <cbc:ID>${escape(draft.numero)}</cbc:ID>
  <cbc:IssueDate>${escape(draft.date)}</cbc:IssueDate>
  <cbc:DueDate>${escape(draft.echeance)}</cbc:DueDate>
  <cbc:InvoiceTypeCode>${draft.type === 'avoir' ? '381' : '380'}</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>${escape(draft.devise)}</cbc:DocumentCurrencyCode>
  <cbc:Note>${escape(this.documentLabel(draft.type))}</cbc:Note>
  <cac:AccountingSupplierParty><cac:Party><cac:PartyName><cbc:Name>${escape(entreprise?.raisonSociale || entreprise?.nom || 'Entreprise')}</cbc:Name></cac:PartyName><cac:PartyTaxScheme><cbc:CompanyID>${escape(entreprise?.matriculeFiscal)}</cbc:CompanyID></cac:PartyTaxScheme></cac:Party></cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty><cac:Party><cac:PartyName><cbc:Name>${escape(draft.client || 'Client')}</cbc:Name></cac:PartyName><cac:PartyTaxScheme><cbc:CompanyID>${escape(draft.clientCode)}</cbc:CompanyID></cac:PartyTaxScheme></cac:Party></cac:AccountingCustomerParty>
${lignes}
  <cac:TaxTotal><cbc:TaxAmount currencyID="${escape(draft.devise)}">${this.editorTotalTva(draft).toFixed(3)}</cbc:TaxAmount></cac:TaxTotal>
  <cac:LegalMonetaryTotal><cbc:LineExtensionAmount currencyID="${escape(draft.devise)}">${this.editorTotalHt(draft).toFixed(3)}</cbc:LineExtensionAmount><cbc:TaxInclusiveAmount currencyID="${escape(draft.devise)}">${this.editorTotalTtc(draft).toFixed(3)}</cbc:TaxInclusiveAmount><cbc:PayableAmount currencyID="${escape(draft.devise)}">${this.netAPayer(draft).toFixed(3)}</cbc:PayableAmount></cac:LegalMonetaryTotal>
</ubl:Invoice>`;
  }

  private telechargerBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  private buildDefaultConditions(days: number, type: DocumentKey): string {
    if (type === 'devis') return `Ce devis est valable ${days || 30} jours a compter de sa date d emission.`;
    if (type === 'bon_livraison') return 'La signature confirme la reception des marchandises sous reserve de controle.';
    if (type === 'bon_commande') return 'Commande ferme selon les prix, quantites et delais indiques.';
    return days ? `Paiement a ${days} jours selon accord entre les parties.` : 'Paiement immediat.';
  }

  private extractCss(html: string): string {
    const match = html.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
    return match?.[1] ?? this.fallbackTemplateCss();
  }

  private fallbackTemplateCss(): string {
    return `
      *{box-sizing:border-box} body{font-family:Segoe UI,Tahoma,sans-serif;display:flex;justify-content:center}
      .invoice{width:210mm;min-height:297mm;background:#fff;padding:40px}
      .header{display:flex;justify-content:space-between;border-bottom:3px solid #e8c84a;padding-bottom:20px;margin-bottom:34px}
      .logo,.invoice-title{font-size:28px;font-weight:900}.logo span{color:#e8c84a}
      .invoice-info{text-align:right}.invoice-number,.invoice-date{color:#666;font-size:12px;margin-top:5px}
      .parties{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:30px}
      .party{background:#f8f9fa;padding:18px;border-radius:8px;border-left:4px solid #e8c84a}
      .party-title{font-size:11px;text-transform:uppercase;color:#777;font-weight:800;margin-bottom:8px}
      .party-name{font-weight:800}.party-detail{color:#666;font-size:12px;margin-top:5px}
      .items-table{width:100%;border-collapse:collapse}.items-table th{background:#f3f4f6;text-align:left;font-size:11px;padding:10px}.items-table td{border-bottom:1px solid #e5e7eb;padding:10px;font-size:12px}
      .totals{width:320px;margin:28px 0 0 auto}.total-row,.total-final{display:flex;justify-content:space-between;padding:7px 0}.total-final{border-top:2px solid #111827;font-weight:900}
    `;
  }

  private defaultLine(type: DocumentKey): DocumentLineDraft {
    const label = type === 'paiement_emis' || type === 'recu_paiement'
      ? 'Paiement facture'
      : type === 'ordre_fabrication'
        ? 'Operation de fabrication'
        : 'Prestation commerciale';
    return {
      produitId: '',
      designation: label,
      description: 'Description modifiable',
      quantite: 1,
      unite: 'U',
      prixUnitaire: 1000,
      tauxRemise: 0,
      tauxTva: type === 'paiement_emis' || type === 'recu_paiement' ? 0 : 19
    };
  }

  private lineFromDocument(doc: BusinessDocument): DocumentLineDraft {
    return {
      designation: this.types.find(t => t.key === doc.type)?.label ?? 'Document',
      description: doc.linkedTo ? `Origine ${doc.linkedTo}` : 'Ligne importee du flux documents',
      quantite: 1,
      unite: 'U',
      prixUnitaire: doc.total,
      tauxRemise: 0,
      tauxTva: 0
    };
  }

  private nextNumero(type: DocumentTypeConfig): string {
    const existing = this.documents().filter(doc => doc.type === type.key).length + 1;
    const digits = type.key === 'paiement_emis' ? 5 : 4;
    return `${type.prefix}-2026-${String(existing).padStart(digits, '0')}`;
  }

  private persist() {
    localStorage.setItem('tuniflow.documents.dashboard', JSON.stringify(this.documents()));
  }

  private loadCachedDocuments(): BusinessDocument[] {
    try {
      const raw = localStorage.getItem('tuniflow.documents.dashboard');
      const parsed = raw ? JSON.parse(raw) : null;
      return Array.isArray(parsed) && parsed.length ? this.normalizeDocuments(parsed) : DEMO_DOCUMENTS;
    } catch {
      return DEMO_DOCUMENTS;
    }
  }

  private ensureCompleteDocuments(items: BusinessDocument[]): BusinessDocument[] {
    const clean = items.length ? items : DEMO_DOCUMENTS;
    const byKey = new Map<DocumentKey, BusinessDocument[]>();
    for (const type of this.types) byKey.set(type.key, []);
    for (const doc of clean) byKey.get(doc.type)?.push(doc);

    const missing = DEMO_DOCUMENTS.filter(doc => (byKey.get(doc.type)?.length ?? 0) === 0);
    const merged = [...clean, ...missing];
    return merged.map(doc => ({ ...doc, type: this.inferTypeFromNumero(doc.numero) ?? doc.type }));
  }

  private normalizeDocuments(items: any[] | null | undefined): BusinessDocument[] {
    return (Array.isArray(items) ? items : []).map(item => {
      const numero = String(item.numero ?? '-');
      const type = this.inferTypeFromNumero(numero) ?? this.normalizeType(item.type);
      return {
        id: String(item.id ?? crypto.randomUUID()),
        type,
        numero,
        client: String(item.client ?? item.clientNom ?? item.tiers ?? 'Client'),
        total: Number(item.total ?? item.totalTtc ?? item.montant ?? 0),
        statut: this.normalizeStatus(item.statut),
        date: String(item.date ?? item.dateEmission ?? new Date().toISOString().slice(0, 10)).slice(0, 10),
        echeance: item.echeance ?? item.dateEcheance ? String(item.echeance ?? item.dateEcheance).slice(0, 10) : undefined,
        linkedTo: item.linkedTo ?? item.origine ?? item.referenceOrigine ?? undefined,
        convertedTo: item.convertedTo ?? undefined,
        history: Array.isArray(item.history) && item.history.length ? item.history.map(String) : [`${numero} importé`, 'Document disponible dans le tableau de pilotage']
      };
    });
  }

  private invoiceEditorType(key: DocumentKey): string | null {
    const map: Partial<Record<DocumentKey, string>> = {
      facture: 'Facture',
      avoir: 'Avoir',
      proforma: 'Proforma'
    };
    return map[key] ?? null;
  }

  private backendFactureId(id: string): string | null {
    const match = String(id).match(/^facture:([0-9a-f-]{36})$/i);
    return match?.[1] ?? null;
  }

  private isPaid(doc: BusinessDocument): boolean {
    const status = this.normalizeText(doc.statut);
    if (status.includes('payee') || status.includes('applique')) return true;
    if (doc.montantRestant != null) return doc.montantRestant <= 0.001;
    if (doc.montantPaye != null) return doc.montantPaye >= doc.total - 0.001;
    return false;
  }

  private isTransmitted(doc: BusinessDocument): boolean {
    const value = this.normalizeText(`${doc.statut} ${doc.history.join(' ')}`);
    return value.includes('transmis') || value.includes('ttn') || value.includes('accepte') || value.includes('refuse');
  }

  private normalizeText(value: unknown): string {
    return String(value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  private isPaidStatus(status: DocumentStatus): boolean {
    const text = this.normalizeText(status);
    return text.includes('payee') || text.includes('applique');
  }

  private isTransmittedStatus(status: DocumentStatus): boolean {
    const text = this.normalizeText(status);
    return text.includes('transmise') || text.includes('accepte') || text.includes('refuse');
  }

  private formatNumber(value: number): string {
    return new Intl.NumberFormat('fr-TN', { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(Number(value || 0));
  }

  private formatRate(value: number): string {
    return new Intl.NumberFormat('fr-TN', { maximumFractionDigits: 2 }).format(Number(value || 0));
  }

  private formatDate(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('fr-FR').format(date);
  }

  private escapeHtml(value: unknown): string {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  private normalizeType(value: any): DocumentKey {
    const key = String(value ?? '').trim() as DocumentKey;
    return this.types.some(t => t.key === key) ? key : 'facture';
  }

  private inferTypeFromNumero(numero: string): DocumentKey | null {
    const value = String(numero).toUpperCase();
    const sorted = [...this.types].sort((a, b) => b.prefix.length - a.prefix.length);
    return sorted.find(type => value.startsWith(`${type.prefix}-`) || value.startsWith(type.prefix))?.key ?? null;
  }

  private normalizeStatus(value: any): DocumentStatus {
    const status = String(value ?? '').trim();
    const all = new Set(this.types.flatMap(t => t.statuses));
    return all.has(status as DocumentStatus) ? status as DocumentStatus : 'En cours';
  }
}
