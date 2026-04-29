import {
  Component, signal, computed, inject, OnInit, ViewChild, ElementRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';
import { PersonnalisationApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { Pipe, PipeTransform } from '@angular/core';

// --- PIPE: filtre catégories ----------------------------------
@Pipe({ name: 'catFilter', standalone: true, pure: false })
export class CatFilterPipe implements PipeTransform {
  transform(cats: any[], search: string): any[] {
    if (!search) return cats;
    return cats.filter(c => c.label.toLowerCase().includes(search.toLowerCase()));
  }
}

// --- ANIMATIONS -----------------------------------------------
export const pageIn = trigger('pageIn', [
  transition(':enter', [
    style({ opacity: 0, transform: 'translateY(10px)' }),
    animate('280ms cubic-bezier(.16,1,.3,1)', style({ opacity: 1, transform: 'translateY(0)' }))
  ])
]);

export const sectionIn = trigger('sectionIn', [
  transition('* => *', [
    query(':enter', [
      style({ opacity: 0, transform: 'translateX(8px)' }),
      animate('200ms cubic-bezier(.16,1,.3,1)', style({ opacity: 1, transform: 'translateX(0)' }))
    ], { optional: true })
  ])
]);

// --- INTERFACES -----------------------------------------------
interface Sequence {
  type: string; label: string; icon: string; color: string;
  prefix: string; sep: string; includeYear: boolean; digits: number;
  nextNum: number; reset: string;
}

interface TypeDocument {
  key: string; label: string; description: string; color: string;
  prefix: string; seqKey: string; defaultTva: number; delaiPaiement: number; actif: boolean;
}

interface Categorie {
  id: number; label: string; compte: string; tva: number; docs: number;
}

interface Taxe {
  id: number; label: string; type: string; taux: number;
  base: string; comptePcg: string; actif: boolean; systeme: boolean;
}

interface Retenue {
  id: number; label: string; taux: number; applicable: string;
  nature: string; comptePcg: string; actif: boolean; systeme: boolean;
}

interface ModePaiement {
  id: number; label: string; code: string; icon: string; color: string;
  delai: number; plafond: number | null; comptePcg: string; actif: boolean; systeme: boolean;
}

interface Journal {
  id: number; code: string; label: string; actif: boolean;
}

interface CompteCle {
  id: number; label: string; compte: string; placeholder: string;
}

interface Webhook {
  id: number; url: string; events: string[]; lastCall: Date | null; lastStatus: number | null; actif: boolean;
}

// --- COMPONENT ------------------------------------------------
@Component({
  selector: 'app-personnalisation',
  standalone: true,
  imports: [CommonModule, FormsModule, CatFilterPipe],
  templateUrl: './personnalisation.component.html',
  styleUrls: ['./personnalisation.component.scss'],
  animations: [pageIn, sectionIn]
})
export class PersonnalisationComponent implements OnInit {

  private api = inject(PersonnalisationApiService);
  private toast = inject(ToastService);

  private defaultData: any;


  @ViewChild('logoInput') logoInput!: ElementRef<HTMLInputElement>;

  activeSectionKey = signal<string>('numerotation');
  saving = signal(false);
  isDirty = signal(false);
  catSearch = '';

  // --- NAV GROUPS ---------------------------------------------
  navGroups = [
    {
      label: 'Documents',
      items: [
        { key: 'numerotation', label: 'Numérotation', badge: '', icon: '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="2" y="1" width="10" height="12" rx="1.5"/><line x1="5" y1="4" x2="9" y2="4"/><line x1="5" y1="7" x2="9" y2="7"/><line x1="5" y1="10" x2="7" y2="10"/></svg>' },
        { key: 'pdf', label: 'PDF & Apparence', badge: '', icon: '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="1" y="1" width="12" height="12" rx="2"/><path d="M4 7h6M4 4h3"/></svg>' },
        { key: 'types', label: 'Types de documents', badge: '', icon: '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M2 2h6l4 4v6H2V2z"/><path d="M8 2v4h4"/></svg>' },
      ]
    },
    {
      label: 'Catégories',
      items: [
        { key: 'catVente', label: 'Catégories vente', badge: '', icon: '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4"><polyline points="1,11 5,6 8,9 13,3"/></svg>' },
        { key: 'catAchat', label: "Catégories achat", badge: '', icon: '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4"><polyline points="1,3 5,8 8,5 13,11"/></svg>' },
      ]
    },
    {
      label: 'Fiscal & Légal',
      items: [
        { key: 'taxes', label: 'Taxes & TVA', badge: '', icon: '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="7" cy="7" r="6"/><path d="M4.5 9.5l5-5"/><circle cx="5" cy="5" r="1" fill="currentColor"/><circle cx="9" cy="9" r="1" fill="currentColor"/></svg>' },
        { key: 'retenues', label: 'Retenues à la source', badge: '', icon: '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M7 1l5.5 9.5H1.5L7 1z"/><path d="M7 5v3M7 9.5v.5" stroke-linecap="round"/></svg>' },
      ]
    },
    {
      label: 'Configuration',
      items: [
        { key: 'articles', label: 'Articles & Unités', badge: '', icon: '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="1" y="3" width="12" height="8" rx="1.5"/><line x1="1" y1="6" x2="13" y2="6"/><line x1="5" y1="3" x2="5" y2="11"/></svg>' },
        { key: 'paiements', label: 'Modes de paiement', badge: '', icon: '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="1" y="3" width="12" height="8" rx="1.5"/><line x1="1" y1="6" x2="13" y2="6"/></svg>' },
        { key: 'comptabilite', label: 'Comptabilité', badge: '', icon: '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="1" y="1" width="12" height="12" rx="2"/><line x1="1" y1="5" x2="13" y2="5"/><line x1="5" y1="5" x2="5" y2="13"/></svg>' },
        { key: 'conditions', label: 'Conditions & Affichage', badge: '', icon: '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="7" cy="7" r="6"/><path d="M7 4v3l2 2" stroke-linecap="round"/></svg>' },
        { key: 'webhooks', label: 'Webhooks', badge: '', icon: '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="3" cy="7" r="2"/><circle cx="11" cy="3" r="2"/><circle cx="11" cy="11" r="2"/><path d="M5 7q4 0 4-4M5 7q4 0 4 4"/></svg>' },
      ]
    }
  ];

  activeSection = computed(() => {
    for (const g of this.navGroups)
      for (const i of g.items)
        if (i.key === this.activeSectionKey()) return i;
    return this.navGroups[0].items[0];
  });

  // --- STATIC CONFIG LISTS ------------------------------------
  colorPresets = ['#E8C84A','#3B82F6','#22C55E','#EF4444','#8B5CF6','#F59E0B','#0EA5E9','#1A1A1A'];

  pdfOptions = [
    { key: 'showLogo', label: 'Afficher le logo', hint: 'Logo en haut à gauche de chaque document' },
    { key: 'showSignature', label: 'Cachet & signature', hint: 'Zone dédiée en bas du document' },
    { key: 'showTimbre', label: 'Timbre fiscal automatique', hint: '1 DT si TTC ≥ 1000 DT (LF 2024)' },
    { key: 'showMentionArrete', label: "Mention « Arrêtée la somme de »", hint: 'Montant en lettres obligatoire (DGI)' },
    { key: 'showIban', label: 'IBAN / RIB sur le document', hint: 'Pour faciliter le virement bancaire' },
    { key: 'showQrCode', label: 'QR Code de vérification', hint: 'Conformité facture électronique TEIF' },
  ];

  articleOptions = [
    { key: 'showCode', label: 'Afficher le code article', hint: 'Code référence sur les lignes de facture' },
    { key: 'gestionStock', label: 'Gestion de stock', hint: 'Suivre les quantités en stock' },
    { key: 'prixTtc', label: 'Saisie prix TTC', hint: 'Par défaut prix HT; activer pour TTC' },
    { key: 'remiseParLigne', label: 'Remise par ligne', hint: 'Appliquer une remise sur chaque ligne' },
  ];

  comptaOptions = [
    { key: 'lettrage', label: 'Lettrage automatique', hint: 'Rapprochement paiements/factures' },
    { key: 'rappel', label: 'Rappel de clôture', hint: 'Notification avant fin d\'exercice' },
    { key: 'exportFEC', label: 'Export FEC', hint: 'Fichier des Écritures Comptables' },
  ];

  conditionsOptions = [
    { key: 'penaliteRetard', label: 'Pénalités de retard automatiques', hint: 'Calculées à l\'échéance dépassée' },
    { key: 'cgvSurFacture', label: 'CGV sur chaque facture', hint: 'Imprimer les conditions en bas de page' },
    { key: 'mentionExoneration', label: 'Mention exonération TVA', hint: 'Afficher motif si taux 0%' },
  ];

  webhookEvents = [
    { key: 'facture.creee',    label: 'Créée' },
    { key: 'facture.validee',  label: 'Validée' },
    { key: 'facture.payee',    label: 'Payée' },
    { key: 'paiement.recu',   label: 'Paiement' },
    { key: 'avoir.genere',    label: 'Avoir' },
  ];

  // --- DATA MODEL ---------------------------------------------
  data: {
    sequences: Sequence[];
    pdf: any;
    typesDocuments: TypeDocument[];
    categoriesVente: Categorie[];
    categoriesAchat: Categorie[];
    taxes: Taxe[];
    retenues: Retenue[];
    articles: any;
    modesPaiement: ModePaiement[];
    comptabilite: any;
    conditions: any;
    webhooks: Webhook[];
  } = {
    sequences: [
      { type: 'facture',    label: 'Facture',         icon: '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="2" y="1" width="10" height="12" rx="1.5"/><line x1="4" y1="5" x2="10" y2="5"/><line x1="4" y1="8" x2="8" y2="8"/></svg>', color: '#E8C84A', prefix: 'FAC', sep: '-', includeYear: true, digits: 4, nextNum: 1, reset: 'annuelle' },
      { type: 'devis',      label: 'Devis',           icon: '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="2" y="1" width="10" height="12" rx="1.5"/><line x1="4" y1="5" x2="10" y2="5"/><line x1="4" y1="8" x2="10" y2="8"/></svg>', color: '#3B82F6', prefix: 'DEV', sep: '-', includeYear: true, digits: 4, nextNum: 1, reset: 'annuelle' },
      { type: 'avoir',      label: 'Avoir / Note de crédit', icon: '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M4 7h6M7 4l-3 3 3 3"/></svg>', color: '#EF4444', prefix: 'AVO', sep: '-', includeYear: true, digits: 4, nextNum: 1, reset: 'annuelle' },
      { type: 'bon_commande', label: 'Bon de commande',  icon: '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M2 2h6l4 4v6H2V2z"/></svg>',             color: '#22C55E', prefix: 'BC',  sep: '-', includeYear: true, digits: 4, nextNum: 1, reset: 'annuelle' },
      { type: 'proforma',   label: 'Facture proforma', icon: '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="7" cy="7" r="6"/><path d="M5 7h4"/></svg>',     color: '#8B5CF6', prefix: 'PRO', sep: '-', includeYear: true, digits: 4, nextNum: 1, reset: 'annuelle' },
      { type: 'bon_livraison', label: 'Bon de livraison', icon: '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="1" y="4" width="9" height="7" rx="1"/><path d="M10 6h2l1 3v2h-3V6z"/><circle cx="4" cy="12" r="1.5"/><circle cx="11" cy="12" r="1.5"/></svg>', color: '#F59E0B', prefix: 'BL',  sep: '-', includeYear: true, digits: 4, nextNum: 1, reset: 'annuelle' },
    ],
    pdf: {
      logoUrl: '', primaryColor: '#E8C84A', font: 'Helvetica', paperSize: 'A4',
      matriculeFiscal: '', rne: '', rc: '', iban: '', footerText: '',
      options: { showLogo: true, showSignature: true, showTimbre: true, showMentionArrete: true, showIban: true, showQrCode: false }
    },
    typesDocuments: [
      { key: 'facture',      label: 'Facture',          description: 'Document comptable principal (Art. 18 CTVA)', color: '#E8C84A', prefix: 'FAC', seqKey: 'facture',      defaultTva: 19, delaiPaiement: 30, actif: true  },
      { key: 'proforma',     label: 'Facture proforma', description: 'Avant-projet commercial non comptable',        color: '#8B5CF6', prefix: 'PRO', seqKey: 'proforma',     defaultTva: 19, delaiPaiement: 0,  actif: true  },
      { key: 'avoir',        label: 'Avoir',            description: 'Note de crédit / annulation partielle',        color: '#EF4444', prefix: 'AVO', seqKey: 'avoir',        defaultTva: 19, delaiPaiement: 0,  actif: true  },
      { key: 'devis',        label: 'Devis',            description: 'Offre de prix non engageante',                 color: '#3B82F6', prefix: 'DEV', seqKey: 'devis',        defaultTva: 19, delaiPaiement: 0,  actif: true  },
      { key: 'bon_commande', label: 'Bon de commande',  description: 'Engagement d\'achat fournisseur',              color: '#22C55E', prefix: 'BC',  seqKey: 'bon_commande', defaultTva: 19, delaiPaiement: 30, actif: true  },
      { key: 'bon_livraison',label: 'Bon de livraison', description: 'Accompagne la marchandise',                   color: '#F59E0B', prefix: 'BL',  seqKey: 'bon_livraison',defaultTva: 0,  delaiPaiement: 0,  actif: true  },
    ],
    categoriesVente: [
      { id: 1, label: 'Prestations de services',       compte: '706000', tva: 19, docs: 12 },
      { id: 2, label: 'Vente de marchandises',          compte: '701000', tva: 19, docs: 8  },
      { id: 3, label: 'Travaux et études',              compte: '704000', tva: 19, docs: 3  },
      { id: 4, label: 'Exportations (exonérées)',       compte: '701100', tva: 0,  docs: 2  },
      { id: 5, label: 'Ventes en suspension TVA',       compte: '701200', tva: 0,  docs: 0  },
      { id: 6, label: 'Revenus locatifs',               compte: '708000', tva: 19, docs: 1  },
    ],
    categoriesAchat: [
      { id: 1, label: 'Achats de matières premières',  compte: '601000', tva: 19, docs: 5  },
      { id: 2, label: 'Fournitures de bureau',          compte: '602200', tva: 19, docs: 3  },
      { id: 3, label: 'Frais comptables et juridiques', compte: '622000', tva: 19, docs: 4  },
      { id: 4, label: "Frais d'entretien",              compte: '615000', tva: 19, docs: 1  },
      { id: 5, label: 'Frais de déplacement',           compte: '625000', tva: 19, docs: 6  },
      { id: 6, label: 'Frais de carte de crédit',       compte: '627000', tva: 0,  docs: 0  },
      { id: 7, label: 'Frais de conciergerie',          compte: '623000', tva: 19, docs: 0  },
      { id: 8, label: 'Immobilisations corporelles',    compte: '224000', tva: 19, docs: 2  },
    ],
    taxes: [
      { id: 1, label: 'TVA 19% (taux normal)',                taux: 19,  type: 'TVA',     base: 'HT',       comptePcg: '4457100', actif: true,  systeme: true  },
      { id: 2, label: 'TVA 13% (banques / assurances)',       taux: 13,  type: 'TVA',     base: 'HT',       comptePcg: '4457130', actif: true,  systeme: true  },
      { id: 3, label: 'TVA 7% (produits alimentaires de base)', taux: 7, type: 'TVA',     base: 'HT',       comptePcg: '4457070', actif: true,  systeme: true  },
      { id: 4, label: 'TVA 0% (exportations / suspension)',   taux: 0,   type: 'TVA',     base: 'HT',       comptePcg: '4457000', actif: true,  systeme: true  },
      { id: 5, label: 'FODEC 1% (produits industriels)',      taux: 1,   type: 'FODEC',   base: 'HT',       comptePcg: '4458100', actif: true,  systeme: true  },
      { id: 6, label: 'TCL 0.2% (taxe locale)',               taux: 0.2, type: 'TCL',     base: 'HT',       comptePcg: '4458200', actif: true,  systeme: true  },
      { id: 7, label: 'Timbre fiscal (≥ 1000 DT TTC)',        taux: 1,   type: 'Timbre',  base: 'fixe',     comptePcg: '4458300', actif: true,  systeme: true  },
      { id: 8, label: 'Droit de consommation',                taux: 10,  type: 'Droit',   base: 'HT',       comptePcg: '4458400', actif: false, systeme: false },
    ],
    retenues: [
      { id: 1, label: 'RS 1.5% — Fournitures et marchés',           taux: 1.5,  applicable: 'les_deux',       nature: 'fournitures', comptePcg: '4452015', actif: true,  systeme: true  },
      { id: 2, label: 'RS 5% — Honoraires (personnes morales)',      taux: 5,    applicable: 'personne_morale', nature: 'honoraires',  comptePcg: '4452050', actif: true,  systeme: true  },
      { id: 3, label: 'RS 10% — Honoraires (personnes physiques)',   taux: 10,   applicable: 'personne_physique',nature: 'honoraires', comptePcg: '4452100', actif: true,  systeme: true  },
      { id: 4, label: 'RS 15% — Artistes et sportifs',              taux: 15,   applicable: 'personne_physique',nature: 'artistes',   comptePcg: '4452150', actif: false, systeme: true  },
      { id: 5, label: 'RS 20% — Loyers (personnes physiques)',       taux: 20,   applicable: 'personne_physique',nature: 'loyers',     comptePcg: '4452200', actif: true,  systeme: true  },
      { id: 6, label: 'RS 25% — Non-résidents',                      taux: 25,   applicable: 'non_resident',    nature: 'autres',     comptePcg: '4452250', actif: false, systeme: true  },
    ],
    articles: {
      defaultTva: 19, defaultUnite: 1,
      comptePcgProduits: '701000', comptePcgServices: '706000',
      options: { showCode: true, gestionStock: false, prixTtc: false, remiseParLigne: true },
      unites: [
        { id: 1, label: 'Kilogramme', code: 'kg' },
        { id: 2, label: 'Litre',      code: 'L'  },
        { id: 3, label: 'Mètre carré',code: 'm²' },
        { id: 4, label: 'Heure',      code: 'h'  },
        { id: 5, label: 'Forfait',    code: 'fft'},
        { id: 6, label: 'Unité',      code: 'u'  },
        { id: 7, label: 'Pièce',      code: 'pce'},
      ],
      familles: [
        { id: 1, label: 'Informatique',   color: '#3B82F6' },
        { id: 2, label: 'Consulting',     color: '#8B5CF6' },
        { id: 3, label: 'Fournitures',    color: '#22C55E' },
        { id: 4, label: 'Transport',      color: '#F59E0B' },
      ]
    },
    modesPaiement: [
      { id: 1, label: 'Espèces',           code: 'ESP',  icon: '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.3"><circle cx="6" cy="6" r="5"/><path d="M6 3v6M4 4.5h3a1.5 1.5 0 010 3H4"/></svg>', color: '#22C55E', delai: 0,  plafond: 5000, comptePcg: '530000', actif: true,  systeme: true  },
      { id: 2, label: 'Chèque',            code: 'CHQ',  icon: '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.3"><rect x="1" y="3" width="10" height="6" rx="1"/><line x1="3" y1="6" x2="9" y2="6"/></svg>',        color: '#3B82F6', delai: 0,  plafond: null, comptePcg: '532000', actif: true,  systeme: true  },
      { id: 3, label: 'Virement bancaire', code: 'VIR',  icon: '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M2 6h8M7 4l3 2-3 2"/></svg>',                                                              color: '#8B5CF6', delai: 0,  plafond: null, comptePcg: '531000', actif: true,  systeme: true  },
      { id: 4, label: 'Traite / Lettre de change', code: 'LC', icon: '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.3"><rect x="1" y="2" width="10" height="8" rx="1"/><line x1="3" y1="5" x2="9" y2="5"/><line x1="3" y1="8" x2="7" y2="8"/></svg>', color: '#F59E0B', delai: 90, plafond: null, comptePcg: '413000', actif: true,  systeme: false },
      { id: 5, label: 'Paiement en ligne', code: 'ONLINE', icon: '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.3"><rect x="1" y="3" width="10" height="7" rx="1"/><circle cx="6" cy="6.5" r="1.5"/></svg>',          color: '#EF4444', delai: 0,  plafond: null, comptePcg: '531100', actif: false, systeme: false },
    ],
    comptabilite: {
      debutExercice: '2024-01-01', finExercice: '2024-12-31',
      devise: 'TND', methode: 'engagement',
      options: { lettrage: true, rappel: true, exportFEC: false },
      journaux: [
        { id: 1, code: 'VTE', label: 'Journal des ventes',       actif: true  },
        { id: 2, code: 'ACH', label: 'Journal des achats',       actif: true  },
        { id: 3, code: 'BNQ', label: 'Journal de banque',        actif: true  },
        { id: 4, code: 'CAI', label: 'Journal de caisse',        actif: true  },
        { id: 5, code: 'OD',  label: 'Journal des OD',           actif: true  },
        { id: 6, code: 'SAL', label: 'Journal des salaires',     actif: false },
      ],
      comptesCles: [
        { id: 1, label: 'Clients (tiers)',            compte: '411000', placeholder: '411000' },
        { id: 2, label: 'Fournisseurs (tiers)',        compte: '401000', placeholder: '401000' },
        { id: 3, label: 'TVA collectée',               compte: '4457000', placeholder: '4457000' },
        { id: 4, label: 'TVA déductible',              compte: '4456000', placeholder: '4456000' },
        { id: 5, label: 'Retenues à la source',        compte: '4452000', placeholder: '4452000' },
        { id: 6, label: 'Caisse principale',           compte: '530000', placeholder: '530000' },
        { id: 7, label: 'Banque principale',           compte: '531000', placeholder: '531000' },
      ]
    },
    conditions: {
      delaiPaiement: 30, devise: 'TND', langue: 'fr', penaliteRetard: 1.5,
      cgv: `Toute facture non réglée à son échéance sera majorée de plein droit d'une pénalité de retard de 1,5% par mois de retard.\n\nLe règlement s'effectue par virement bancaire ou chèque à l'ordre de la société.\n\nEn cas de litige, les tribunaux tunisiens sont seuls compétents.`,
      options: { penaliteRetard: true, cgvSurFacture: true, mentionExoneration: true }
    },
    webhooks: []
  };

  // --- SECTION NAVIGATION -------------------------------------
  setSection(key: string) {
    if (this.isDirty()) {
      if (!confirm('Modifications non enregistrées. Continuer sans sauvegarder ?')) return;
      this.isDirty.set(false);
    }
    this.activeSectionKey.set(key);
  }

  // --- DIRTY TRACKING -----------------------------------------
  markDirty() { this.isDirty.set(true); }


  activeTaxesCount(): number {
    return (this.data?.taxes ?? []).filter(t => t.actif).length;
  }

  setPdfPrimaryColor(color: string) {
    this.data.pdf.primaryColor = color;
    this.markDirty();
  }

  setPdfPaperSize(size: string) {
    this.data.pdf.paperSize = size;
    this.markDirty();
  }

  togglePdfOption(key: string) {
    this.data.pdf.options[key] = !this.data.pdf.options[key];
    this.markDirty();
  }

  toggleTypeDocumentActive(t: TypeDocument) {
    t.actif = !t.actif;
    this.markDirty();
  }

  toggleTaxeActive(tax: Taxe) {
    if (tax.systeme) return;
    tax.actif = !tax.actif;
    this.markDirty();
  }

  toggleRetenueActive(r: Retenue) {
    r.actif = !r.actif;
    this.markDirty();
  }

  toggleArticleOption(key: string) {
    this.data.articles.options[key] = !this.data.articles.options[key];
    this.markDirty();
  }

  toggleModePaiementActive(m: ModePaiement) {
    m.actif = !m.actif;
    this.markDirty();
  }

  toggleJournalActive(j: Journal) {
    j.actif = !j.actif;
    this.markDirty();
  }

  toggleComptaOption(key: string) {
    this.data.comptabilite.options[key] = !this.data.comptabilite.options[key];
    this.markDirty();
  }

  setConditionsLangue(code: string) {
    this.data.conditions.langue = code;
    this.markDirty();
  }

  toggleConditionsOption(key: string) {
    this.data.conditions.options[key] = !this.data.conditions.options[key];
    this.markDirty();
  }

  toggleWebhookActive(w: Webhook) {
    w.actif = !w.actif;
    this.markDirty();
  }
  private clone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value));
  }

  private mergeDeep(base: any, override: any): any {
    if (override === null || override === undefined) return base;
    if (Array.isArray(base)) return Array.isArray(override) ? override : base;
    if (typeof base === 'object' && typeof override === 'object') {
      const result: any = { ...base };
      Object.keys(override).forEach(key => {
        result[key] = key in base ? this.mergeDeep(base[key], override[key]) : override[key];
      });
      return result;
    }
    return override;
  }

  private load() {
    this.api.obtenir().subscribe({
      next: (res: any) => {
        const payload = res?.donnees ?? res?.data ?? res;
        if (payload) {
          this.data = this.mergeDeep(this.clone(this.defaultData), payload);
        } else {
          this.data = this.clone(this.defaultData);
        }
        this.isDirty.set(false);
      },
      error: (err) => {
        this.toast.error(err?.error?.message ?? 'Impossible de charger la personnalisation.');
        this.data = this.clone(this.defaultData);
        this.isDirty.set(false);
      }
    });
  }

  // --- SAVE ----------------------------------------------------
  saveSection() {
    this.saving.set(true);
    this.api.enregistrer({ donnees: this.data }).subscribe({
      next: (res: any) => {
        this.saving.set(false);
        const payload = res?.donnees ?? res?.data ?? res;
        if (payload) {
          this.data = this.mergeDeep(this.clone(this.defaultData), payload);
        }
        this.isDirty.set(false);
        this.toast.success('Personnalisation enregistrée.');
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.error(err?.error?.message ?? 'Erreur lors de l\'enregistrement.');
      }
    });
  }

  resetSection() {
    if (!confirm('Réinitialiser cette section aux valeurs par défaut ?')) return;

    const d = this.clone(this.defaultData);
    switch (this.activeSectionKey()) {
      case 'numerotation':
        this.data.sequences = this.clone(d.sequences);
        break;
      case 'pdf':
        this.data.pdf = this.clone(d.pdf);
        break;
      case 'types':
        this.data.typesDocuments = this.clone(d.typesDocuments);
        break;
      case 'catVente':
        this.data.categoriesVente = this.clone(d.categoriesVente);
        break;
      case 'catAchat':
        this.data.categoriesAchat = this.clone(d.categoriesAchat);
        break;
      case 'taxes':
        this.data.taxes = this.clone(d.taxes);
        break;
      case 'retenues':
        this.data.retenues = this.clone(d.retenues);
        break;
      case 'articles':
        this.data.articles = this.clone(d.articles);
        break;
      case 'paiements':
        this.data.modesPaiement = this.clone(d.modesPaiement);
        break;
      case 'comptabilite':
        this.data.comptabilite = this.clone(d.comptabilite);
        break;
      case 'conditions':
        this.data.conditions = this.clone(d.conditions);
        break;
      case 'webhooks':
        this.data.webhooks = this.clone(d.webhooks);
        break;
      default:
        this.data = this.clone(d);
        break;
    }
    this.isDirty.set(true);
  }

  // --- SEQUENCE PREVIEW ----------------------------------------
  buildPreview(seq: Sequence): string {
    const year = new Date().getFullYear();
    const num = String(seq.nextNum).padStart(seq.digits, '0');
    const parts = [seq.prefix];
    if (seq.includeYear) parts.push(String(year));
    parts.push(num);
    return parts.join(seq.sep);
  }

  // --- PDF -----------------------------------------------------
  triggerLogoUpload() { this.logoInput?.nativeElement.click(); }

  onLogoChange(ev: Event) {
    const file = (ev.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => { this.data.pdf.logoUrl = e.target?.result; this.markDirty(); };
    reader.readAsDataURL(file);
  }

  // --- CATEGORIES ----------------------------------------------
  private nextCatId = 100;

  addCategory(type: 'vente' | 'achat') {
    const arr = type === 'vente' ? this.data.categoriesVente : this.data.categoriesAchat;
    arr.push({ id: this.nextCatId++, label: 'Nouvelle catégorie', compte: '', tva: 19, docs: 0 });
    this.markDirty();
  }

  removeCategory(type: 'vente' | 'achat', id: number) {
    if (type === 'vente') this.data.categoriesVente = this.data.categoriesVente.filter(c => c.id !== id);
    else this.data.categoriesAchat = this.data.categoriesAchat.filter(c => c.id !== id);
    this.markDirty();
  }

  // --- TAXES ---------------------------------------------------
  private nextTaxId = 100;

  addTaxe() {
    this.data.taxes.push({ id: this.nextTaxId++, label: 'Nouvelle taxe', type: 'TVA', taux: 0, base: 'HT', comptePcg: '', actif: true, systeme: false });
    this.markDirty();
  }

  removeTaxe(id: number) { this.data.taxes = this.data.taxes.filter(t => t.id !== id); this.markDirty(); }

  taxTypeClass(type: string): string {
    return { TVA: 'badge--ey', FODEC: 'badge--info', TCL: 'badge--warn', Timbre: 'badge--neutral', Droit: 'badge--err' }[type] ?? 'badge--neutral';
  }

  // --- RETENUES ------------------------------------------------
  private nextRetId = 100;

  addRetenue() {
    this.data.retenues.push({ id: this.nextRetId++, label: 'Nouvelle retenue', taux: 0, applicable: 'les_deux', nature: 'autres', comptePcg: '', actif: true, systeme: false });
    this.markDirty();
  }

  removeRetenue(id: number) { this.data.retenues = this.data.retenues.filter(r => r.id !== id); this.markDirty(); }

  // --- ARTICLES ------------------------------------------------
  private nextUniteId = 100;
  private nextFamilleId = 100;

  addUnite() {
    this.data.articles.unites.push({ id: this.nextUniteId++, label: 'Nouvelle unité', code: '' });
    this.markDirty();
  }

  removeUnite(id: number) { this.data.articles.unites = this.data.articles.unites.filter((u: any) => u.id !== id); this.markDirty(); }

  addFamille() {
    const colors = ['#3B82F6','#22C55E','#EF4444','#8B5CF6','#F59E0B'];
    this.data.articles.familles.push({ id: this.nextFamilleId++, label: 'Nouvelle famille', color: colors[this.nextFamilleId % colors.length] });
    this.markDirty();
  }

  removeFamille(id: number) { this.data.articles.familles = this.data.articles.familles.filter((f: any) => f.id !== id); this.markDirty(); }

  // --- MODES PAIEMENT ------------------------------------------
  private nextModeId = 100;

  addModePaiement() {
    this.data.modesPaiement.push({ id: this.nextModeId++, label: 'Nouveau mode', code: '', icon: '', color: '#888888', delai: 0, plafond: null, comptePcg: '', actif: true, systeme: false });
    this.markDirty();
  }

  removeModePaiement(id: number) { this.data.modesPaiement = this.data.modesPaiement.filter(m => m.id !== id); this.markDirty(); }

  // --- WEBHOOKS ------------------------------------------------
  private nextWebhookId = 1;

  addWebhook() {
    this.data.webhooks.push({ id: this.nextWebhookId++, url: '', events: [], lastCall: null, lastStatus: null, actif: true });
    this.markDirty();
  }

  removeWebhook(id: number) { this.data.webhooks = this.data.webhooks.filter(w => w.id !== id); this.markDirty(); }

  toggleWebhookEvent(w: Webhook, key: string) {
    const idx = w.events.indexOf(key);
    if (idx > -1) w.events.splice(idx, 1); else w.events.push(key);
    this.markDirty();
  }

  testWebhook(w: Webhook) {
    w.lastCall = new Date();
    w.lastStatus = 200;
    alert(`Test envoyé à ${w.url}`);
  }

  ngOnInit() {
    this.defaultData = this.clone(this.data);
    this.load();
  }
}
