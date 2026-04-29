import {
  Component, signal, computed, inject, OnDestroy, HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { trigger, transition, style, animate, state } from '@angular/animations';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { environment } from '../../../../environments/environment';
import { StepIndicatorComponent } from './step-indicator/step-indicator.component';

export interface DemandeAccesForm {
  // Étape 1 - Entreprise
  raisonSociale:    string;
  matriculeFiscal:  string;
  formeJuridique:   string;
  nomEntreprise:    string;
  adresse:          string;
  gouvernorat:      string;
  codePostal:       string;
  siteWeb:          string;
  telEntreprise:    string;
  devisePrincipale: string;
  logoPreview:      string | null;
  logoFileName:     string | null;
  // Étape 2 - Responsable
  respPrenom:       string;
  respNom:          string;
  respFonction:     string;
  respFonctionAutre: string;
  respEmail:        string;
  respTel:          string;
}

export interface DocumentItem {
  key: 'registreCommerce' | 'patente' | 'cinResponsable' | 'rib';
  labelKey: string;
  descriptionKey: string;
  required: boolean;
  file: File | null;
  preview: string | null;
  error: string | null;
  loading: boolean;
}

interface SelectOption {
  value: string;
  labelKey: string;
}

export interface WizardStep {
  id: 1 | 2 | 3;
  label: string;
  icon: string;
  desc: string;
}

type Step = 'form' | 'confirmation';

// Champs requis par étape
const STEP1_FIELDS: (keyof DemandeAccesForm)[] = [
  'raisonSociale', 'matriculeFiscal', 'formeJuridique', 'nomEntreprise',
  'adresse', 'gouvernorat', 'codePostal', 'telEntreprise'
];
const STEP2_FIELDS: (keyof DemandeAccesForm)[] = [
  'respPrenom', 'respNom', 'respFonction', 'respEmail', 'respTel'
];

const DRAFT_KEY = 'da_draft_form';

const API_ERROR_FIELD_MAP: Record<string, keyof DemandeAccesForm | 'documents'> = {
  RaisonSociale: 'raisonSociale',
  MatriculeFiscal: 'matriculeFiscal',
  Email: 'respEmail',
  Telephone: 'respTel',
  FormeJuridique: 'formeJuridique',
  NomEntreprise: 'nomEntreprise',
  Adresse: 'adresse',
  Gouvernorat: 'gouvernorat',
  CodePostal: 'codePostal',
  TelEntreprise: 'telEntreprise',
  RespPrenom: 'respPrenom',
  RespNom: 'respNom',
  RespFonction: 'respFonction',
  RespFonctionAutre: 'respFonctionAutre',
  RespEmail: 'respEmail',
  RespTel: 'respTel',
  RegistreCommerce: 'documents',
  Patente: 'documents',
  CinResponsable: 'documents',
  Rib: 'documents',
};

@Component({
  selector: 'app-demande-acces',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, StepIndicatorComponent, TranslatePipe],
  templateUrl: './demande-acces.component.html',
  styleUrls: ['./demande-acces.component.scss'],
  host: { 'attr.data-theme': 'light' },
  animations: [
    trigger('pageIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(16px)' }),
        animate('420ms cubic-bezier(.16,1,.3,1)', style({ opacity: 1, transform: 'none' }))
      ])
    ]),
    trigger('slideUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('340ms cubic-bezier(.16,1,.3,1)', style({ opacity: 1, transform: 'none' }))
      ])
    ]),
    trigger('confirmIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(.94) translateY(20px)' }),
        animate('460ms cubic-bezier(.16,1,.3,1)', style({ opacity: 1, transform: 'none' }))
      ])
    ]),
    trigger('fieldShake', [
      state('idle',  style({ transform: 'translateX(0)' })),
      state('error', style({ transform: 'translateX(0)' })),
      transition('* => error', [
        animate('60ms',  style({ transform: 'translateX(-6px)' })),
        animate('60ms',  style({ transform: 'translateX(6px)' })),
        animate('60ms',  style({ transform: 'translateX(-4px)' })),
        animate('60ms',  style({ transform: 'translateX(0)' }))
      ])
    ])
  ]
})
export class DemandeAccesComponent implements OnDestroy {
  private router = inject(Router);
  private http   = inject(HttpClient);
  private translate = inject(TranslateService);

  step         = signal<Step>('form');
  currentStep  = signal<1 | 2 | 3>(1);

  readonly steps: WizardStep[] = [
    { id: 1, label: 'AUTH.ACCESS_REQUEST.STEPS.STEP1.LABEL', icon: '1', desc: 'AUTH.ACCESS_REQUEST.STEPS.STEP1.DESC' },
    { id: 2, label: 'AUTH.ACCESS_REQUEST.STEPS.STEP2.LABEL', icon: '2', desc: 'AUTH.ACCESS_REQUEST.STEPS.STEP2.DESC' },
    { id: 3, label: 'AUTH.ACCESS_REQUEST.STEPS.STEP3.LABEL', icon: '3', desc: 'AUTH.ACCESS_REQUEST.STEPS.STEP3.DESC' },
  ];
  stepProgressPct = computed(() => Math.round((this.currentStep() / this.steps.length) * 100));
  submitting   = signal(false);
  errors       = signal<Record<string, string>>({});
  dragTarget   = signal<string | null>(null);
  shakeField   = signal<string | null>(null);
  confirmationRef = '';
  matriculeFocused = signal(false);
  draftSavedAt = signal<Date | null>(null);
  draftAvailable = signal(false);
  copySuccess = signal(false);
  private documentsVersion = signal(0);

  form: DemandeAccesForm = {
    raisonSociale:   '',
    matriculeFiscal: '',
    formeJuridique:  '',
    nomEntreprise:   '',
    adresse:         '',
    gouvernorat:     '',
    codePostal:      '',
    siteWeb:         '',
    telEntreprise:   '',
    devisePrincipale:'TND',
    logoPreview:     null,
    logoFileName:    null,
    respPrenom:      '',
    respNom:         '',
    respFonction:    '',
    respFonctionAutre: '',
    respEmail:       '',
    respTel:         '',
  };

  logoFile: File | null = null;

  private draftTimer: ReturnType<typeof setTimeout> | null = null;
  private lastSavedDraft = '';
  private pendingDraft: Partial<DemandeAccesForm> | null = null;
  private langVersion = signal(0);
  private langChangeSub = this.translate.onLangChange.subscribe(() => {
    this.langVersion.update(v => v + 1);
    this.touchDocuments();
    this.copySuccess.set(false);
  });

  constructor() {
    this.prepareDraft();
  }

  ngOnDestroy(): void {
    if (this.draftTimer) clearTimeout(this.draftTimer);
    this.langChangeSub.unsubscribe();
  }

  // DRAFT (auto-save)
  private getDraftStorage(): Storage | null {
    try {
      return sessionStorage;
    } catch {
      return null;
    }
  }

  private saveDraft(): void {
    try {
      const storage = this.getDraftStorage();
      if (!storage) return;
      const { logoPreview, logoFileName, ...toSave } = this.form;
      const payload = JSON.stringify(toSave);
      if (payload === this.lastSavedDraft) return;
      storage.setItem(DRAFT_KEY, payload);
      this.lastSavedDraft = payload;
      this.draftSavedAt.set(new Date());
    } catch { /* quota depasse ou prive */ }
  }

  private prepareDraft(): void {
    try {
      const storage = this.getDraftStorage();
      let raw = storage?.getItem(DRAFT_KEY) ?? null;

      if (!raw) {
        raw = localStorage.getItem(DRAFT_KEY);
        if (raw && storage) storage.setItem(DRAFT_KEY, raw);
      }

      try { localStorage.removeItem(DRAFT_KEY); } catch { /* legacy cleanup */ }

      if (!raw) return;

      const saved = JSON.parse(raw);
      if (!saved || typeof saved !== 'object' || Array.isArray(saved)) {
        this.clearDraft();
        return;
      }

      this.pendingDraft = saved;
      this.draftAvailable.set(true);
    } catch { /* corrompu */ }
  }

  restoreStoredDraft(): void {
    if (!this.pendingDraft) return;
    Object.assign(this.form, this.pendingDraft);
    this.lastSavedDraft = JSON.stringify(this.pendingDraft);
    this.pendingDraft = null;
    this.draftAvailable.set(false);
    this.draftSavedAt.set(null);
  }

  discardStoredDraft(): void {
    this.pendingDraft = null;
    this.draftAvailable.set(false);
    this.clearDraft();
  }

  private clearDraft(): void {
    try { this.getDraftStorage()?.removeItem(DRAFT_KEY); } catch { /* */ }
    try { localStorage.removeItem(DRAFT_KEY); } catch { /* legacy cleanup */ }
    this.pendingDraft = null;
    this.draftAvailable.set(false);
    this.lastSavedDraft = '';
    this.draftSavedAt.set(null);
  }

  // ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚Â DONNÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â°ES ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢Ãƒâ€šÃ‚Â
  readonly formesJuridiques: SelectOption[] = [
    { value: 'SARL', labelKey: 'AUTH.ACCESS_REQUEST.OPTIONS.LEGAL_FORMS.SARL' },
    { value: 'SA', labelKey: 'AUTH.ACCESS_REQUEST.OPTIONS.LEGAL_FORMS.SA' },
    { value: 'SUARL', labelKey: 'AUTH.ACCESS_REQUEST.OPTIONS.LEGAL_FORMS.SUARL' },
    { value: 'EI - Entrepreneur individuel', labelKey: 'AUTH.ACCESS_REQUEST.OPTIONS.LEGAL_FORMS.EI' },
    { value: 'SNC', labelKey: 'AUTH.ACCESS_REQUEST.OPTIONS.LEGAL_FORMS.SNC' },
    { value: 'Association', labelKey: 'AUTH.ACCESS_REQUEST.OPTIONS.LEGAL_FORMS.ASSOCIATION' },
    { value: 'Groupement', labelKey: 'AUTH.ACCESS_REQUEST.OPTIONS.LEGAL_FORMS.GROUPEMENT' },
    { value: 'Autre', labelKey: 'AUTH.ACCESS_REQUEST.OPTIONS.LEGAL_FORMS.OTHER' },
  ];
  readonly gouvernorats: SelectOption[] = [
    { value: 'Tunis', labelKey: 'AUTH.ACCESS_REQUEST.OPTIONS.GOVERNORATES.TUNIS' },
    { value: 'Ariana', labelKey: 'AUTH.ACCESS_REQUEST.OPTIONS.GOVERNORATES.ARIANA' },
    { value: 'Ben Arous', labelKey: 'AUTH.ACCESS_REQUEST.OPTIONS.GOVERNORATES.BEN_AROUS' },
    { value: 'Manouba', labelKey: 'AUTH.ACCESS_REQUEST.OPTIONS.GOVERNORATES.MANOUBA' },
    { value: 'Nabeul', labelKey: 'AUTH.ACCESS_REQUEST.OPTIONS.GOVERNORATES.NABEUL' },
    { value: 'Zaghouan', labelKey: 'AUTH.ACCESS_REQUEST.OPTIONS.GOVERNORATES.ZAGHOUAN' },
    { value: 'Bizerte', labelKey: 'AUTH.ACCESS_REQUEST.OPTIONS.GOVERNORATES.BIZERTE' },
    { value: 'Beja', labelKey: 'AUTH.ACCESS_REQUEST.OPTIONS.GOVERNORATES.BEJA' },
    { value: 'Jendouba', labelKey: 'AUTH.ACCESS_REQUEST.OPTIONS.GOVERNORATES.JENDOUBA' },
    { value: 'Le Kef', labelKey: 'AUTH.ACCESS_REQUEST.OPTIONS.GOVERNORATES.KEF' },
    { value: 'Siliana', labelKey: 'AUTH.ACCESS_REQUEST.OPTIONS.GOVERNORATES.SILIANA' },
    { value: 'Sousse', labelKey: 'AUTH.ACCESS_REQUEST.OPTIONS.GOVERNORATES.SOUSSE' },
    { value: 'Monastir', labelKey: 'AUTH.ACCESS_REQUEST.OPTIONS.GOVERNORATES.MONASTIR' },
    { value: 'Mahdia', labelKey: 'AUTH.ACCESS_REQUEST.OPTIONS.GOVERNORATES.MAHDIA' },
    { value: 'Sfax', labelKey: 'AUTH.ACCESS_REQUEST.OPTIONS.GOVERNORATES.SFAX' },
    { value: 'Kairouan', labelKey: 'AUTH.ACCESS_REQUEST.OPTIONS.GOVERNORATES.KAIROUAN' },
    { value: 'Kasserine', labelKey: 'AUTH.ACCESS_REQUEST.OPTIONS.GOVERNORATES.KASSERINE' },
    { value: 'Sidi Bouzid', labelKey: 'AUTH.ACCESS_REQUEST.OPTIONS.GOVERNORATES.SIDI_BOUZID' },
    { value: 'Gabes', labelKey: 'AUTH.ACCESS_REQUEST.OPTIONS.GOVERNORATES.GABES' },
    { value: 'Medenine', labelKey: 'AUTH.ACCESS_REQUEST.OPTIONS.GOVERNORATES.MEDENINE' },
    { value: 'Tataouine', labelKey: 'AUTH.ACCESS_REQUEST.OPTIONS.GOVERNORATES.TATAOUINE' },
    { value: 'Gafsa', labelKey: 'AUTH.ACCESS_REQUEST.OPTIONS.GOVERNORATES.GAFSA' },
    { value: 'Tozeur', labelKey: 'AUTH.ACCESS_REQUEST.OPTIONS.GOVERNORATES.TOZEUR' },
    { value: 'Kebili', labelKey: 'AUTH.ACCESS_REQUEST.OPTIONS.GOVERNORATES.KEBILI' },
  ];

  readonly devises = [
    'TND', 'EUR', 'USD', 'GBP', 'MAD', 'DZD',
  ];

  readonly fonctions: SelectOption[] = [
    { value: 'Directeur General (DG)', labelKey: 'AUTH.ACCESS_REQUEST.OPTIONS.ROLES.DG' },
    { value: 'Directeur Financier (DAF)', labelKey: 'AUTH.ACCESS_REQUEST.OPTIONS.ROLES.DAF' },
    { value: 'Responsable Comptabilite', labelKey: 'AUTH.ACCESS_REQUEST.OPTIONS.ROLES.ACCOUNTING_MANAGER' },
    { value: 'Gerant', labelKey: 'AUTH.ACCESS_REQUEST.OPTIONS.ROLES.MANAGER' },
    { value: 'PDG', labelKey: 'AUTH.ACCESS_REQUEST.OPTIONS.ROLES.CEO' },
    { value: 'Responsable Administratif et Financier', labelKey: 'AUTH.ACCESS_REQUEST.OPTIONS.ROLES.ADMIN_FINANCE_MANAGER' },
    { value: 'Fondateur / Co-fondateur', labelKey: 'AUTH.ACCESS_REQUEST.OPTIONS.ROLES.FOUNDER' },
    { value: 'Autre', labelKey: 'AUTH.ACCESS_REQUEST.OPTIONS.ROLES.OTHER' },
  ];

  documents: DocumentItem[] = [
    {
      key: 'registreCommerce',
      labelKey: 'AUTH.ACCESS_REQUEST.DOCS.ITEMS.REGISTRE_COMMERCE.LABEL',
      descriptionKey: 'AUTH.ACCESS_REQUEST.DOCS.ITEMS.REGISTRE_COMMERCE.DESC',
      required: true, file: null, preview: null, error: null, loading: false
    },
    {
      key: 'patente',
      labelKey: 'AUTH.ACCESS_REQUEST.DOCS.ITEMS.PATENTE.LABEL',
      descriptionKey: 'AUTH.ACCESS_REQUEST.DOCS.ITEMS.PATENTE.DESC',
      required: true, file: null, preview: null, error: null, loading: false
    },
    {
      key: 'cinResponsable',
      labelKey: 'AUTH.ACCESS_REQUEST.DOCS.ITEMS.CIN_RESPONSABLE.LABEL',
      descriptionKey: 'AUTH.ACCESS_REQUEST.DOCS.ITEMS.CIN_RESPONSABLE.DESC',
      required: true, file: null, preview: null, error: null, loading: false
    },
    {
      key: 'rib',
      labelKey: 'AUTH.ACCESS_REQUEST.DOCS.ITEMS.RIB.LABEL',
      descriptionKey: 'AUTH.ACCESS_REQUEST.DOCS.ITEMS.RIB.DESC',
      required: true, file: null, preview: null, error: null, loading: false
    }
  ];

  uploadedCount = computed(() => { this.documentsVersion(); return this.documents.filter(d => d.file !== null).length; });
  requiredCount = computed(() => { this.documentsVersion(); return this.documents.filter(d => d.required && d.file !== null).length; });
  totalRequired = computed(() => { this.documentsVersion(); return this.documents.filter(d => d.required).length; });
  progressPct   = computed(() =>
    this.totalRequired() ? Math.round((this.requiredCount() / this.totalRequired()) * 100) : 0
  );
  missingRequiredDocs = computed(() => { this.documentsVersion(); return this.documents.filter(d => d.required && !d.file); });
  canSubmit = computed(() => { this.documentsVersion(); return !this.submitting() && this.missingRequiredDocs().length === 0; });
  submitBlockMessage = computed(() => {
    this.langVersion();
    if (this.submitting()) return this.t('AUTH.ACCESS_REQUEST.DOCS.SUBMITTING');
    const missing = this.missingRequiredDocs();
    if (!missing.length) return '';
    return this.t('AUTH.ACCESS_REQUEST.DOCS.SUBMIT_HELP', {
      documents: missing.map(d => this.docLabel(d.key)).join(', ')
    });
  });

  isFieldValid(field: keyof DemandeAccesForm): boolean {
    if (this.errors()[field]) return false;

    const value = this.form[field];
    const text = typeof value === 'string' ? value.trim() : '';

    switch (field) {
      case 'nomEntreprise':
      case 'raisonSociale':
      case 'respFonctionAutre':
        return text.length > 2;
      case 'matriculeFiscal':
        return text.length === 16;
      case 'formeJuridique':
      case 'gouvernorat':
      case 'respFonction':
        return !!text;
      case 'adresse':
        return text.length > 5;
      case 'codePostal':
        return text.length === 4;
      case 'siteWeb':
        return text.length > 0;
      case 'telEntreprise':
      case 'respTel':
        return text.length >= 8;
      case 'respPrenom':
      case 'respNom':
        return text.length > 1;
      case 'respEmail':
        return text.length > 0;
      default:
        return false;
    }
  }

  // Navigation stepper
  goToStep(n: 1 | 2 | 3): void {
    const current = this.currentStep();
    if (n === current) return;

    if (n > current) {
      for (let step = current; step < n; step++) {
        if (!this.validateStep(step as 1 | 2 | 3)) return;
      }
    }

    this.currentStep.set(n);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Validation
  /** Validation d'un seul champ */
  validateField(key: string): void {
    const e: Record<string, string> = {};
    this.runFieldValidation(key, this.form, e);
    this.errors.update(prev => {
      const next = { ...prev };
      if (e[key]) {
        next[key] = e[key];
      } else {
        delete next[key];
      }
      return next;
    });
  }

  /** Validation de toute l'étape */
  private validateStep(step: 1 | 2 | 3): boolean {
    const e: Record<string, string> = {};
    const fields = step === 1 ? STEP1_FIELDS : step === 2 ? STEP2_FIELDS : [];
    for (const key of fields) {
      this.runFieldValidation(key, this.form, e);
    }
    if (step === 2 && this.form.respFonction === 'Autre') {
      this.runFieldValidation('respFonctionAutre', this.form, e);
    }
    this.errors.set({ ...this.errors(), ...e });

    if (Object.keys(e).length > 0) {
      const firstKey = Object.keys(e)[0];
      this.shakeField.set(firstKey);
      setTimeout(() => this.shakeField.set(null), 400);
      // Scroll vers le premier champ en erreur
      setTimeout(() => {
        const el = document.getElementById(firstKey);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.focus();
        }
      }, 50);
      return false;
    }
    return true;
  }

  /** Validation complète avant submit */
  private validateAll(): boolean {
    const e: Record<string, string> = {};
    for (const key of [...STEP1_FIELDS, ...STEP2_FIELDS]) {
      this.runFieldValidation(key, this.form, e);
    }
    if (this.form.respFonction === 'Autre') {
      this.runFieldValidation('respFonctionAutre', this.form, e);
    }
    // Documents obligatoires
    const missing = this.documents.filter(d => d.required && !d.file);
    if (missing.length > 0) {
      e['documents'] = this.t('AUTH.ACCESS_REQUEST.DOCS.MISSING_ERROR', {
        documents: missing.map(d => this.docLabel(d.key)).join(', ')
      });
    }
    this.errors.set(e);
    if (Object.keys(e).length > 0) {
      const firstKey = Object.keys(e)[0];
      this.shakeField.set(firstKey);
      setTimeout(() => this.shakeField.set(null), 400);
      return false;
    }
    return true;
  }

  isMatriculeFiscalValid(value = this.form.matriculeFiscal): boolean {
    const normalized = value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    return /^[0-9]{7}[A-Z]([A-Z]{2}[0-9]{3})?$/.test(normalized);
  }

  /** Règles de validation par champ */
  private runFieldValidation(key: string, form: DemandeAccesForm, e: Record<string, string>): void {
    switch (key) {
      case 'raisonSociale':
        if (!form.raisonSociale.trim())
          e['raisonSociale'] = this.t('AUTH.ACCESS_REQUEST.VALIDATION.RAISON_SOCIALE_REQUIRED');
        break;

      case 'matriculeFiscal': {
        const mf = form.matriculeFiscal.trim();
        if (!mf)
          e['matriculeFiscal'] = this.t('AUTH.ACCESS_REQUEST.VALIDATION.MATRICULE_REQUIRED');
        else if (!this.isMatriculeFiscalValid(mf))
          e['matriculeFiscal'] = this.t('AUTH.ACCESS_REQUEST.VALIDATION.MATRICULE_INVALID');
        break;
      }

      case 'formeJuridique':
        if (!form.formeJuridique)
          e['formeJuridique'] = this.t('AUTH.ACCESS_REQUEST.VALIDATION.LEGAL_FORM_REQUIRED');
        break;

      case 'nomEntreprise':
        if (form.nomEntreprise.trim().length < 3)
          e['nomEntreprise'] = this.t('AUTH.ACCESS_REQUEST.VALIDATION.COMPANY_NAME_REQUIRED');
        break;

      case 'adresse':
        if (form.adresse.trim().length < 6)
          e['adresse'] = this.t('AUTH.ACCESS_REQUEST.VALIDATION.ADDRESS_REQUIRED');
        break;

      case 'gouvernorat':
        if (!form.gouvernorat)
          e['gouvernorat'] = this.t('AUTH.ACCESS_REQUEST.VALIDATION.GOVERNORATE_REQUIRED');
        break;

      case 'codePostal':
        if (!/^\d{4}$/.test(form.codePostal.trim()))
          e['codePostal'] = this.t('AUTH.ACCESS_REQUEST.VALIDATION.POSTAL_CODE_INVALID');
        break;

      case 'siteWeb':
        if (form.siteWeb.trim() && !/^(https:\/\/)[a-z0-9.-]+\.[a-z]{2,}/i.test(form.siteWeb.trim()))
          e['siteWeb'] = this.t('AUTH.ACCESS_REQUEST.VALIDATION.WEBSITE_INVALID');
        break;

      case 'telEntreprise':
        if (this.phoneLen(form.telEntreprise) < 8)
          e['telEntreprise'] = this.t('AUTH.ACCESS_REQUEST.VALIDATION.COMPANY_PHONE_REQUIRED');
        break;

      case 'respPrenom':
        if (!form.respPrenom.trim())
          e['respPrenom'] = this.t('AUTH.ACCESS_REQUEST.VALIDATION.FIRST_NAME_REQUIRED');
        else if (form.respPrenom.trim().length < 2)
          e['respPrenom'] = this.t('AUTH.ACCESS_REQUEST.VALIDATION.FIRST_NAME_LENGTH');
        else if (!/^[a-zA-Z\u00C0-\u00FF\s\-']+$/.test(form.respPrenom.trim()))
          e['respPrenom'] = this.t('AUTH.ACCESS_REQUEST.VALIDATION.FIRST_NAME_ALPHA');
        break;

      case 'respNom':
        if (!form.respNom.trim())
          e['respNom'] = this.t('AUTH.ACCESS_REQUEST.VALIDATION.LAST_NAME_REQUIRED');
        else if (form.respNom.trim().length < 2)
          e['respNom'] = this.t('AUTH.ACCESS_REQUEST.VALIDATION.LAST_NAME_LENGTH');
        else if (!/^[a-zA-Z\u00C0-\u00FF\s\-']+$/.test(form.respNom.trim()))
          e['respNom'] = this.t('AUTH.ACCESS_REQUEST.VALIDATION.LAST_NAME_ALPHA');
        break;

      case 'respFonction':
        if (!form.respFonction)
          e['respFonction'] = this.t('AUTH.ACCESS_REQUEST.VALIDATION.RESP_ROLE_REQUIRED');
        break;

      case 'respFonctionAutre':
        if (form.respFonction === 'Autre' && form.respFonctionAutre.trim().length < 2)
          e['respFonctionAutre'] = this.t('AUTH.ACCESS_REQUEST.VALIDATION.RESP_ROLE_OTHER_REQUIRED');
        break;

      case 'respEmail':
        if (!form.respEmail.trim())
          e['respEmail'] = this.t('AUTH.ACCESS_REQUEST.VALIDATION.RESP_EMAIL_REQUIRED');
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.respEmail))
          e['respEmail'] = this.t('AUTH.ACCESS_REQUEST.VALIDATION.RESP_EMAIL_INVALID');
        break;

      case 'respTel':
        if (this.phoneLen(form.respTel) < 8)
          e['respTel'] = this.t('AUTH.ACCESS_REQUEST.VALIDATION.RESP_PHONE_REQUIRED');
        break;
    }
  }
  // Input handlers

  /** Empêche la saisie de lettres dans les champs numériques */
  onNumericInput(event: Event, key: string): void {
    const input = event.target as HTMLInputElement;
    const cleaned = input.value.replace(/\D/g, '');
    if (input.value !== cleaned) {
      input.value = cleaned;
      (this.form as any)[key] = cleaned;
    }
    this.validateField(key);
  }

  /** Empêche la saisie de chiffres dans les champs de nom/prénom */
  onAlphaInput(event: Event, key: string): void {
    const input = event.target as HTMLInputElement;
    const cleaned = input.value.replace(/[0-9]/g, '');
    if (input.value !== cleaned) {
      input.value = cleaned;
      (this.form as any)[key] = cleaned;
    }
    this.validateField(key);
  }

  /** Matricule fiscal : force majuscule pour les lettres */
  onMatriculeFiscalInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const upped = input.value.toUpperCase();
    if (input.value !== upped) {
      input.value = upped;
      this.form.matriculeFiscal = upped;
    }
    this.validateField('matriculeFiscal');
  }

  onMatriculeFocus(): void {
    this.matriculeFocused.set(true);
  }

  onMatriculeBlur(): void {
    this.matriculeFocused.set(false);
    this.validateField('matriculeFiscal');
  }

  clearError(key: string): void {
    this.errors.update(e => {
      const n = { ...e }; delete n[key]; return n;
    });
  }

  // Fichiers / documents
  onFileSelect(event: Event, doc: DocumentItem): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.attachFile(doc, file);
  }

  onDrop(event: DragEvent, doc: DocumentItem): void {
    event.preventDefault();
    this.dragTarget.set(null);
    const file = event.dataTransfer?.files[0];
    if (file) this.attachFile(doc, file);
  }

  onDragOver(event: DragEvent, key: string): void {
    event.preventDefault();
    this.dragTarget.set(key);
  }

  onDragLeave(): void { this.dragTarget.set(null); }

  private attachFile(doc: DocumentItem, file: File): void {
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    doc.loading = false;

    if (!allowed.includes(file.type)) {
      doc.error = this.t('AUTH.ACCESS_REQUEST.DOCS.ERRORS.UNSUPPORTED_FORMAT');
      this.touchDocuments();
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      doc.error = this.t('AUTH.ACCESS_REQUEST.DOCS.ERRORS.FILE_TOO_LARGE');
      this.touchDocuments();
      return;
    }

    doc.file = file;
    doc.error = null;
    doc.loading = true;
    this.touchDocuments();

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = e => {
        doc.preview = (e.target as FileReader).result as string;
        doc.loading = false;
        this.touchDocuments();
      };
      reader.onerror = () => {
        doc.error = this.t('AUTH.ACCESS_REQUEST.DOCS.ERRORS.READ_FAILED');
        doc.loading = false;
        this.touchDocuments();
      };
      reader.readAsDataURL(file);
    } else {
      doc.preview = null;
      doc.loading = false;
      this.touchDocuments();
    }

    this.errors.update(e => {
      const n = { ...e };
      delete n['documents'];
      return n;
    });
    this.scheduleDraftSave();
  }

  removeFile(doc: DocumentItem): void {
    doc.file    = null;
    doc.preview = null;
    doc.error   = null;
    doc.loading = false;
    this.touchDocuments();
    this.scheduleDraftSave();
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
    return `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
  }

  getDoc(key: DocumentItem['key']): DocumentItem | undefined {
    return this.documents.find(d => d.key === key);
  }

  hasDoc(key: DocumentItem['key']): boolean {
    return !!this.getDoc(key)?.file;
  }

  docLabel(key: DocumentItem['key']): string {
    const doc = this.getDoc(key);
    return doc ? this.t(doc.labelKey) : key;
  }

  docDescription(key: DocumentItem['key']): string {
    const doc = this.getDoc(key);
    return doc ? this.t(doc.descriptionKey) : key;
  }

  // Logo
  onLogoChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.errors.update(e => ({ ...e, logo: this.t('AUTH.ACCESS_REQUEST.LOGO.ERRORS.IMAGE_REQUIRED') }));
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      this.errors.update(e => ({ ...e, logo: this.t('AUTH.ACCESS_REQUEST.LOGO.ERRORS.SIZE') }));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      this.logoFile = file;
      this.form.logoPreview  = reader.result as string;
      this.form.logoFileName = file.name;
      this.errors.update(e => { const n = { ...e }; delete n['logo']; return n; });
      this.scheduleDraftSave();
  };
    reader.onerror = () =>
      this.errors.update(e => ({ ...e, logo: this.t('AUTH.ACCESS_REQUEST.LOGO.ERRORS.READ_FAILED') }));
    reader.readAsDataURL(file);
  }

  removeLogo(): void {
    this.logoFile = null;
    this.form.logoPreview  = null;
    this.form.logoFileName = null;
    this.errors.update(e => { const n = { ...e }; delete n['logo']; return n; });
    this.scheduleDraftSave();
  }

  // Submit
  submit(): void {
    if (!this.canSubmit()) {
      this.markDocumentsAsRequired();
      return;
    }
    if (!this.validateAll()) return;
    this.errors.update(e => {
      const next = { ...e };
      delete next['submit'];
      return next;
    });
    this.submitting.set(true);

    const fd = new FormData();
    fd.append('raisonSociale',    this.form.raisonSociale);
    fd.append('matriculeFiscal',  this.form.matriculeFiscal);
    fd.append('formeJuridique',   this.form.formeJuridique);
    fd.append('nomEntreprise',    this.form.nomEntreprise);
    fd.append('adresse',          this.form.adresse);
    fd.append('gouvernorat',      this.form.gouvernorat);
    fd.append('codePostal',       this.form.codePostal);
    if (this.form.siteWeb.trim()) fd.append('siteWeb', this.form.siteWeb.trim());
    fd.append('telEntreprise',    this.form.telEntreprise);
    fd.append('devisePrincipale', this.form.devisePrincipale || 'TND');
    fd.append('email',            this.form.respEmail);
    fd.append('telephone',        this.form.respTel);
    fd.append('respEmail',        this.form.respEmail);
    fd.append('respPrenom',       this.form.respPrenom);
    fd.append('respNom',          this.form.respNom);
    fd.append('respFonction',     this.form.respFonction);
    fd.append('respTel',          this.form.respTel);
    if (this.form.respFonction === 'Autre' && this.form.respFonctionAutre.trim()) {
      fd.append('respFonctionAutre', this.form.respFonctionAutre);
    }
    if (this.logoFile) fd.append('logo', this.logoFile, this.logoFile.name);
    this.documents.forEach(d => {
      if (d.file) fd.append(d.key, d.file, d.file.name);
    });
    this.http.post<{ reference: string }>(`${environment.apiUrl}/auth/demande-acces`, fd).subscribe({
      next: (res) => {
        this.submitting.set(false);
        this.clearDraft();
        this.confirmationRef = res?.reference || `MZN-${this.form.matriculeFiscal.slice(0, 7).toUpperCase()}-${new Date().getFullYear()}`;
        this.step.set('confirmation');
      },
      error: (err) => {
        this.submitting.set(false);
        const validationMessage = this.applyApiValidationErrors(err?.error);
        const msg =
          validationMessage ||
          this.localize(err?.error?.message) ||
          this.localize(Array.isArray(err?.error?.errors) ? err.error.errors[0] : null) ||
          this.t('ERRORS.GENERIC');
        this.errors.update(e => ({ ...e, submit: msg }));
      }
    });
  }

  goToLogin(): void { this.router.navigate(['/login/entreprise']); }

  today(): string {
    return new Date().toLocaleDateString(this.localeForLang(), { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  copyReference(): void {
    if (!this.confirmationRef) return;
    navigator.clipboard.writeText(this.confirmationRef).then(() => {
      this.copySuccess.set(true);
      setTimeout(() => this.copySuccess.set(false), 2000);
    }).catch(() => {
      this.copySuccess.set(false);
    });
  }

  draftSavedLabel(): string {
    const date = this.draftSavedAt();
    if (!date) return '';
    return date.toLocaleTimeString(this.localeForLang(), { hour: '2-digit', minute: '2-digit' });
  }

  showMatriculeHint(): boolean {
    return this.matriculeFocused() || !!this.errors()['matriculeFiscal'];
  }

  canContinue(step: 1 | 2): boolean {
    if (this.submitting()) return false;
    const e: Record<string, string> = {};
    const fields = step === 1 ? STEP1_FIELDS : STEP2_FIELDS;
    for (const key of fields) {
      this.runFieldValidation(key, this.form, e);
    }
    if (step === 2 && this.form.respFonction === 'Autre') {
      this.runFieldValidation('respFonctionAutre', this.form, e);
    }
    return Object.keys(e).length === 0;
  }
  canDeactivate(): boolean {
    if (this.step() === 'confirmation') return true;
    if (!this.hasUnsavedChanges()) return true;
    return window.confirm(this.t('AUTH.ACCESS_REQUEST.UNSAVED_CHANGES'));
  }

  hasUnsavedChanges(): boolean {
    const { logoPreview, logoFileName, ...toSave } = this.form;
    const payload = JSON.stringify(toSave);
    const hasFiles = !!this.logoFile || this.documents.some(d => d.file);
    return hasFiles || payload !== this.lastSavedDraft;
  }

  private scheduleDraftSave(): void {
    if (this.draftTimer) clearTimeout(this.draftTimer);
    this.draftTimer = setTimeout(() => this.saveDraft(), 800);
  }
  @HostListener('input')
  @HostListener('change')
  onFormInteraction(): void {
    if (this.draftAvailable()) {
      this.discardStoredDraft();
    }
    this.scheduleDraftSave();
  }

  @HostListener('window:beforeunload', ['$event'])
  beforeUnload(event: BeforeUnloadEvent): void {
    if (this.hasUnsavedChanges()) {
      event.preventDefault();
      event.returnValue = '';
    }
  }


  // Utilitaires
  cardInitials(): string {
    const rs = this.form.raisonSociale.trim();
    if (rs.length >= 2) return rs.slice(0, 2).toUpperCase();
    const rsOne = rs.length === 1 ? rs : '';
    const nc = this.form.nomEntreprise.trim();
    if (rsOne || nc) return (rsOne + (nc[0] || '')).toUpperCase();
    const rp = this.form.respPrenom.trim();
    const rn = this.form.respNom.trim();
    if (rp || rn) return ((rp[0] || '') + (rn[0] || '')).toUpperCase();
    return 'EY';
  }

  displayRespFonction(): string {
    if (this.form.respFonction === 'Autre') {
      return this.form.respFonctionAutre.trim();
    }
    return this.form.respFonction.trim() || '';
  }

  private touchDocuments(): void {
    this.documentsVersion.update(v => v + 1);
  }

  private phoneLen(value: string): number {
    return (value || '').replace(/\s/g, '').length;
  }

  private markDocumentsAsRequired(): void {
    const missing = this.missingRequiredDocs();
    if (!missing.length) return;

    this.errors.update(prev => ({
      ...prev,
      documents: this.t('AUTH.ACCESS_REQUEST.DOCS.MISSING_ERROR', {
        documents: missing.map(d => this.docLabel(d.key)).join(', ')
      })
    }));

    setTimeout(() => {
      const el = document.getElementById('documents');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 50);
  }

  private applyApiValidationErrors(payload: any): string | null {
    const errors = payload?.errors;
    if (!errors || typeof errors !== 'object' || Array.isArray(errors)) {
      return null;
    }

    const next = { ...this.errors() };
    const documentMessages: string[] = [];
    let firstMessage: string | null = null;

    for (const [backendField, rawMessages] of Object.entries(errors as Record<string, unknown>)) {
      const messages = Array.isArray(rawMessages)
        ? rawMessages.filter((m): m is string => typeof m === 'string')
        : typeof rawMessages === 'string'
          ? [rawMessages]
          : [];

      if (!messages.length) continue;

      const first = this.localize(messages[0]) || messages[0];
      if (!firstMessage) firstMessage = first;

      const target = API_ERROR_FIELD_MAP[backendField];
      if (!target) continue;

      if (target === 'documents') {
        documentMessages.push(first);
      } else {
        next[target] = first;
      }
    }

    if (documentMessages.length) {
      next['documents'] = documentMessages[0];
    }

    this.errors.set(next);
    return firstMessage;
  }

  private t(key: string, params?: Record<string, unknown>): string {
    return this.translate.instant(key, params);
  }

  private localize(value: string | null | undefined, params?: Record<string, unknown>): string | null {
    if (!value) return null;
    return this.translate.instant(value, params);
  }

  private localeForLang(): string {
    switch (this.translate.currentLang) {
      case 'ar':
        return 'ar-TN';
      case 'en':
        return 'en-US';
      default:
        return 'fr-FR';
    }
  }
}
