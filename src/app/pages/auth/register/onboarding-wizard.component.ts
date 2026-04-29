import {
  Component, OnInit, OnDestroy,
  signal, computed, inject,
  PLATFORM_ID, Inject
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { trigger, transition, style, animate } from '@angular/animations';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { OnboardingStateService } from '../../../core/services/onboarding-state.service';
import { AuthService, RegisterRequest } from '../../../core/services/auth.service';

export interface WizardStep {
  id:    number;
  label: string;
  icon:  string;
  desc:  string;
}

export interface Category {
  key: string;
  nameKey?: string;
  descKey?: string;
  customName?: string;
  customDesc?: string;
}

interface SelectOption {
  value: string;
  labelKey: string;
}

export interface WizardForm {
  prenom:            string;
  nom:               string;
  email:             string;
  password:          string;
  confirmPassword:   string;
  telephone:         string;
  cgu:               boolean;
  matriculeFiscal:   string;
  formeJuridique:    string;
  raisonSociale:     string;
  nomEntreprise:     string;
  adresse:           string;
  gouvernorat:       string;
  codePostal:        string;   // FIX: champ ajouté
  siteWeb:           string;
  devisePrincipale:  string;
  telEntreprise:     string;
  respPrenom:        string;
  respNom:           string;
  respFonction:      string;
  respFonctionAutre: string;
  respTel:           string;
  respEmail:         string;
  cin:               string;
  logoPreview?:      string | null;
  logoFileName?:     string | null;  // FIX: nom du fichier pour l'affichage
}

const stepAnim = trigger('stepAnim', [
  transition('* => forward', [
    style({ opacity: 0, transform: 'translateY(20px)', filter: 'blur(6px)' }),
    animate('380ms cubic-bezier(.16,1,.3,1)',
      style({ opacity: 1, transform: 'translateY(0)', filter: 'blur(0)' }))
  ]),
  transition('* => backward', [
    style({ opacity: 0, transform: 'translateY(-20px)', filter: 'blur(6px)' }),
    animate('380ms cubic-bezier(.16,1,.3,1)',
      style({ opacity: 1, transform: 'translateY(0)', filter: 'blur(0)' }))
  ]),
]);

const cardPop = trigger('cardPop', [
  transition(':enter', [
    style({ opacity: 0, transform: 'scale(.96) translateY(12px)' }),
    animate('500ms cubic-bezier(.16,1,.3,1)',
      style({ opacity: 1, transform: 'scale(1) translateY(0)' }))
  ])
]);

const fadeUp = trigger('fadeUp', [
  transition(':enter', [
    style({ opacity: 0, transform: 'translateY(16px)', filter: 'blur(4px)' }),
    animate('440ms cubic-bezier(.16,1,.3,1)',
      style({ opacity: 1, transform: 'translateY(0)', filter: 'blur(0)' }))
  ])
]);

const tagAnim = trigger('tagAnim', [
  transition(':enter', [
    style({ opacity: 0, transform: 'scale(.8)' }),
    animate('220ms cubic-bezier(.16,1,.3,1)',
      style({ opacity: 1, transform: 'scale(1)' }))
  ]),
  transition(':leave', [
    animate('160ms ease', style({ opacity: 0, transform: 'scale(.8)' }))
  ])
]);

@Component({
  selector:    'app-onboarding-wizard',
  standalone:  true,
  imports:     [CommonModule, FormsModule, RouterLink, TranslatePipe],
  host:        { class: 'wizard-host' },
  templateUrl: './onboarding-wizard.component.html',
  styleUrls:   ['./onboarding-wizard.component.scss'],
  animations:  [stepAnim, cardPop, fadeUp, tagAnim]
})
export class OnboardingWizardComponent implements OnInit, OnDestroy {
  private translate = inject(TranslateService);
  private langChangeSub = this.translate.onLangChange.subscribe(() => {
    this.langVersion.update((value) => value + 1);
    this.refresh();
  });

  currentStep = signal<number>(1);
  animDir     = signal<'forward' | 'backward'>('forward');
  private langVersion = signal(0);

  form: WizardForm = {
    prenom: '', nom: '', email: '', password: '', confirmPassword: '',
    telephone: '', cgu: false,
    matriculeFiscal: '', formeJuridique: '', raisonSociale: '',
    nomEntreprise: '', adresse: '', gouvernorat: '',
    codePostal: '',          // FIX: initialisé
    siteWeb: '',
    devisePrincipale: 'TND',
    telEntreprise: '',
    respPrenom: '', respNom: '', respFonction: '',
    respFonctionAutre: '', respTel: '', respEmail: '', cin: '',
    logoPreview: null,
    logoFileName: null,
  };

  private errors: Record<string, string> = {};
  private errorMsgSignal = signal<string | null>(null);
  private loadingSignal  = signal(false);

  private _tick = signal(0);
  refresh(): void { this._tick.update(n => n + 1); this.saveState(); }

    readonly steps: WizardStep[] = [
    { id: 1, label: 'AUTH.ONBOARDING.STEPS.STEP1.LABEL', icon: '1', desc: 'AUTH.ONBOARDING.STEPS.STEP1.DESC' },
    { id: 2, label: 'AUTH.ONBOARDING.STEPS.STEP2.LABEL', icon: '2', desc: 'AUTH.ONBOARDING.STEPS.STEP2.DESC' },
    { id: 3, label: 'AUTH.ONBOARDING.STEPS.STEP3.LABEL', icon: '3', desc: 'AUTH.ONBOARDING.STEPS.STEP3.DESC' },
    { id: 4, label: 'AUTH.ONBOARDING.STEPS.STEP4.LABEL', icon: '4', desc: 'AUTH.ONBOARDING.STEPS.STEP4.DESC' },
  ];

  progressPct = computed(() => Math.round((this.currentStep() / this.steps.length) * 100));

  // -- Computed carte live ---------------------------------------------------
  cardInitials = computed(() => {
    this._tick();
    const r = this.form.raisonSociale.trim();
    const p = this.form.prenom.trim();
    if (r.length > 1) return r.slice(0, 2).toUpperCase();
    if (p.length > 0) return (p[0] + (this.form.nom[0] ?? '')).toUpperCase();
    return 'EY';
  });

  cardRS       = computed(() => { this._tick(); return this.form.raisonSociale.trim() || this.t('AUTH.ONBOARDING.CARD.DEFAULT_COMPANY'); });
  cardForme    = computed(() => { this._tick(); return this.optionLabel(this.formesJuridiques, this.form.formeJuridique) || this.t('AUTH.ONBOARDING.CARD.EMPTY'); });
  cardMF       = computed(() => { this._tick(); return this.form.matriculeFiscal.trim() || this.t('AUTH.ONBOARDING.CARD.EMPTY'); });
  cardCodePostal = computed(() => { this._tick(); return this.form.codePostal.trim() || this.t('AUTH.ONBOARDING.CARD.EMPTY'); });
  cardResp     = computed(() => {
    this._tick();
    const rp = this.form.respPrenom.trim();
    const rn = this.form.respNom.trim();
    if (rp || rn) return `${rp} ${rn}`.trim();
    const fp = this.form.prenom.trim();
    const fn = this.form.nom.trim();
    return fp ? `${fp} ${fn}`.trim() : '-';
  });
  cardFonction = computed(() => {
    this._tick();
    if (this.form.respFonction === 'Autre' && this.form.respFonctionAutre.trim()) {
      return this.form.respFonctionAutre.trim();
    }
    return this.optionLabel(this.fonctions, this.form.respFonction) || this.t('AUTH.ONBOARDING.CARD.EMPTY');
  });
  cardGouv     = computed(() => { this._tick(); return this.optionLabel(this.gouvernorats, this.form.gouvernorat) || this.t('AUTH.ONBOARDING.CARD.EMPTY'); });
  cardCats     = computed(() => this.selectedCats());
  cardHasLogo  = computed(() => { this._tick(); return !!this.form.logoPreview; });

  cardCompletePct = computed(() => {
    this._tick();
    const fields = [
      this.form.prenom, this.form.nom, this.form.email,
      this.form.matriculeFiscal, this.form.raisonSociale,
      this.form.formeJuridique, this.form.gouvernorat,
      this.form.codePostal,                           // FIX: inclus dans score
      this.form.devisePrincipale,
      this.form.respPrenom || this.form.prenom,
      this.form.respFonction,
    ];
    const filled = fields.filter(f => f && f.trim().length > 0).length;
    const cats   = Math.min(this.selectedCats().length, 2);
    return Math.round(((filled + cats) / (fields.length + 2)) * 100);
  });

  // -- Mot de passe ----------------------------------------------------------
  showPassword     = signal(false);
  private showConfPassword = signal(false);
  passwordStrength = signal<0 | 1 | 2 | 3 | 4>(0);

  pwLabel = computed(() => {
    const map = [
      '',
      this.t('PW_STRENGTH.WEAK'),
      this.t('PW_STRENGTH.MEDIUM'),
      this.t('PW_STRENGTH.STRONG'),
      this.t('PW_STRENGTH.VERY_STRONG')
    ];
    return this.form.password.length === 0 ? '' : map[this.passwordStrength()];
  });
  pwColor = computed(() => {
    const map = ['', '#EF4444', '#F59E0B', '#22C55E', '#22C55E'];
    return map[this.passwordStrength()];
  });

  // -- Validité des étapes ---------------------------------------------------
  step1Valid = signal(false);
  step2Valid = signal(false);
  step3Valid = signal(false);

  // -- Catégories ------------------------------------------------------------
    readonly predefinedCats: Category[] = [
    { key: 'info',       nameKey: 'AUTH.ONBOARDING.CATALOG.CATEGORIES.INFO.NAME',       descKey: 'AUTH.ONBOARDING.CATALOG.CATEGORIES.INFO.DESC' },
    { key: 'conseil',    nameKey: 'AUTH.ONBOARDING.CATALOG.CATEGORIES.CONSEIL.NAME',    descKey: 'AUTH.ONBOARDING.CATALOG.CATEGORIES.CONSEIL.DESC' },
    { key: 'fourniture', nameKey: 'AUTH.ONBOARDING.CATALOG.CATEGORIES.FOURNITURE.NAME', descKey: 'AUTH.ONBOARDING.CATALOG.CATEGORIES.FOURNITURE.DESC' },
    { key: 'formation',  nameKey: 'AUTH.ONBOARDING.CATALOG.CATEGORIES.FORMATION.NAME',  descKey: 'AUTH.ONBOARDING.CATALOG.CATEGORIES.FORMATION.DESC' },
    { key: 'btp',        nameKey: 'AUTH.ONBOARDING.CATALOG.CATEGORIES.BTP.NAME',        descKey: 'AUTH.ONBOARDING.CATALOG.CATEGORIES.BTP.DESC' },
    { key: 'transport',  nameKey: 'AUTH.ONBOARDING.CATALOG.CATEGORIES.TRANSPORT.NAME',  descKey: 'AUTH.ONBOARDING.CATALOG.CATEGORIES.TRANSPORT.DESC' },
    { key: 'agro',       nameKey: 'AUTH.ONBOARDING.CATALOG.CATEGORIES.AGRO.NAME',       descKey: 'AUTH.ONBOARDING.CATALOG.CATEGORIES.AGRO.DESC' },
    { key: 'sante',      nameKey: 'AUTH.ONBOARDING.CATALOG.CATEGORIES.SANTE.NAME',      descKey: 'AUTH.ONBOARDING.CATALOG.CATEGORIES.SANTE.DESC' },
    { key: 'marketing',  nameKey: 'AUTH.ONBOARDING.CATALOG.CATEGORIES.MARKETING.NAME',  descKey: 'AUTH.ONBOARDING.CATALOG.CATEGORIES.MARKETING.DESC' },
  ];
  selectedCats  = signal<Category[]>([]);
  customCatName = '';
  private _customIdx = 0;

  // -- Listes de référence ---------------------------------------------------
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

  // -- Redirection succés ----------------------------------------------------
  readonly redirectDelay = 3000;
  redirectCountdown = signal<number>(Math.ceil(this.redirectDelay / 1000));
  private _successTimer: ReturnType<typeof setTimeout> | null = null;
  private _countdownInterval: ReturnType<typeof setInterval> | null = null;

  private readonly STORAGE_KEY = 'ey-onboarding-wizard';

  // -- Session storage -------------------------------------------------------
  private saveState(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const payload = {
      form: { ...this.form, logoPreview: null, logoFileName: null }, // ne pas persister les blobs
      currentStep: this.currentStep(),
      selectedCats: this.selectedCats(),
      customCatName: this.customCatName,
    };
    sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(payload));
  }

  private restoreState(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const raw = sessionStorage.getItem(this.STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      if (parsed?.form) Object.assign(this.form, parsed.form);
      if (typeof parsed?.currentStep === 'number') this.currentStep.set(parsed.currentStep);
      if (Array.isArray(parsed?.selectedCats))     this.selectedCats.set(parsed.selectedCats);
      if (typeof parsed?.customCatName === 'string') this.customCatName = parsed.customCatName;
    } catch { /* ignore corrupted state */ }
  }

  private clearState(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    sessionStorage.removeItem(this.STORAGE_KEY);
  }

  constructor(
    private router: Router,
    private onboardingState: OnboardingStateService,
    private auth: AuthService,
    @Inject(PLATFORM_ID) private platformId: object
  ) {}

  ngOnInit(): void {
    this.restoreState();

    const pre = this.onboardingState.state();
    if (!this.form.prenom.trim() && pre.prenom?.trim()) {
      this.form.prenom = pre.prenom; this.form.nom = pre.nom;
    }
    if (!this.form.respPrenom.trim() && pre.respPrenom?.trim()) {
      this.form.respPrenom = pre.respPrenom;
      this.form.respNom    = pre.respNom;
      this.form.respFonction = pre.respFonction;
    }
    this.validateStep1();
    this.validateStep2();
    this.validateStep3();
    this.refresh();
    this.onboardingState.reset();
  }

  ngOnDestroy(): void {
    this.saveState();
    this._clearTimers();
    this.langChangeSub.unsubscribe();
    document.body.style.overflow = '';
  }

  // -- Navigation ------------------------------------------------------------
  nextStep(): void {
    if (this.currentStep() >= 5) return;
    this.animDir.set('forward');
    this.currentStep.update(s => s + 1);
    this.saveState();
  }
  prevStep(): void {
    if (this.currentStep() <= 1) return;
    this.animDir.set('backward');
    this.currentStep.update(s => s - 1);
    this.saveState();
  }

  // -- Soumission finale -----------------------------------------------------
  finishOnboarding(): void {
    if (this.selectedCats().length < 2 || this.loading()) return;

    this.errorMsgSignal.set(null);

    const req: RegisterRequest = {
      prenom:                  this.form.prenom.trim(),
      nom:                     this.form.nom.trim(),
      email:                   this.form.email.trim().toLowerCase(),
      motDePasse:              this.form.password,
      confirmationMotDePasse:  this.form.confirmPassword,
      nomEntreprise:           (this.form.raisonSociale || this.form.nomEntreprise).trim(),
      matriculeFiscal:         this.form.matriculeFiscal.trim(),
      adresse:                this.form.adresse.trim(),
      ville:                  this.form.gouvernorat.trim(),
      telephone:              this.form.telEntreprise.trim(),
      codePostal:             this.form.codePostal.trim(),
      siteWeb:                this.form.siteWeb.trim(),
      devisePrincipale:       this.form.devisePrincipale.trim(),
    };

    this.loadingSignal.set(true);

    this.auth.register(req).subscribe({
      next: () => {
        this.loadingSignal.set(false);
        this.clearState();
        this.animDir.set('forward');
        this.currentStep.set(5);
        this.redirectCountdown.set(Math.ceil(this.redirectDelay / 1000));

        if (isPlatformBrowser(this.platformId)) {
          this._countdownInterval = setInterval(() => {
            this.redirectCountdown.update(n => Math.max(0, n - 1));
          }, 1000);

          this._successTimer = setTimeout(() => {
            this._clearTimers();
            this._navigateToDashboard();
          }, this.redirectDelay);
        }
      },
      error: (err: any) => {
        this.loadingSignal.set(false);
        this.errorMsgSignal.set(
          err?.error?.message ??
          err?.message ??
          'Impossible de créer le compte. Merci de vérifier vos informations.'
        );
      }
    });
  }

  goToDashboardNow(): void {
    this._clearTimers();
    this._navigateToDashboard();
  }

  private _navigateToDashboard(): void {
    this.router.navigate(['/dashboard'], {
      replaceUrl: true,
      state: {
        justRegistered: true,
        prenom:        this.form.prenom,
        nom:           this.form.nom,
        raisonSociale: this.form.raisonSociale || this.form.nomEntreprise,
        categories:    this.selectedCats(),
      }
    });
  }

  private _clearTimers(): void {
    if (this._successTimer)     { clearTimeout(this._successTimer);     this._successTimer = null; }
    if (this._countdownInterval){ clearInterval(this._countdownInterval); this._countdownInterval = null; }
  }

  // -------------------------------------------------------------------------
  // VALIDATION éTAPE 1
  // -------------------------------------------------------------------------
  validateStep1(): void {
    const { prenom, nom, email, password, confirmPassword, telephone, cgu } = this.form;
    const pwScore = this.updatePasswordState();
    this.step1Valid.set(
      prenom.trim().length > 1 &&
      nom.trim().length > 1 &&
      this.isEmailValid() &&
      password.length >= 8 &&
      pwScore >= 3 &&
      confirmPassword === password &&
      this.phoneLen(telephone) >= 8 &&
      cgu
    );
    this.refresh();
  }

  // -------------------------------------------------------------------------
  // VALIDATION éTAPE 2 — FIX: codePostal inclus
  // -------------------------------------------------------------------------
  validateStep2(): void {
    const {
      matriculeFiscal, formeJuridique, raisonSociale, nomEntreprise,
      adresse, gouvernorat, codePostal, telEntreprise, devisePrincipale
    } = this.form;
    this.step2Valid.set(
      this.isMatriculeFiscalValid(matriculeFiscal) &&
      !!formeJuridique &&
      raisonSociale.trim().length > 2 &&
      nomEntreprise.trim().length > 2 &&
      adresse.trim().length > 5 &&
      !!gouvernorat &&
      /^\d{4}$/.test(codePostal.trim()) &&     // FIX: 4 chiffres (code postal tunisien)
      this.isSiteWebValid() &&
      devisePrincipale.trim().length === 3 &&
      this.phoneLen(telEntreprise) >= 8
    );
    this.refresh();
  }

  // -------------------------------------------------------------------------
  // VALIDATION éTAPE 3
  // -------------------------------------------------------------------------
  validateStep3(): void {
    const { respPrenom, respNom, respFonction, respTel, respFonctionAutre } = this.form;
    this.step3Valid.set(
      respPrenom.trim().length > 1 &&
      respNom.trim().length > 1 &&
      !!respFonction &&
      (respFonction !== 'Autre' || respFonctionAutre.trim().length > 2) &&
      this.phoneLen(respTel) >= 8
    );
    this.refresh();
  }

  // -- Utilitaires -----------------------------------------------------------
  isEmailValid(): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.form.email);
  }

    isSiteWebValid(): boolean {
    const v = this.form.siteWeb.trim();
    return !v || /^(https?:\/\/)?[a-z0-9.-]+\.[a-z]{2,}/i.test(v);
  }

  phoneLen(value: string): number { return (value ?? '').replace(/\s/g, '').length; }

  private calcPasswordStrength(pw: string): 0 | 1 | 2 | 3 | 4 {
    let s = 0;
    if (pw.length >= 8)           s++;
    if (/[A-Z]/.test(pw))         s++;
    if (/[0-9]/.test(pw))         s++;
    if (/[^A-Za-z0-9]/.test(pw))  s++;
    return s as 0 | 1 | 2 | 3 | 4;
  }

  private updatePasswordState(): 0 | 1 | 2 | 3 | 4 {
    const pw = this.form.password ?? '';
    const score = this.calcPasswordStrength(pw);
    this.passwordStrength.set(score);
    if (!pw.length)     { this.clearError('password'); return score; }
    if (pw.length < 8)    this.setError('password', this.t('AUTH.ONBOARDING.VALIDATION.PASSWORD_MIN'));
    else if (score < 3)   this.setError('password', this.t('AUTH.ONBOARDING.VALIDATION.PASSWORD_WEAK'));
    else                  this.clearError('password');
    return score;
  }

  // FIX: onPasswordChange appelle validateStep1 pour que le bouton se débloque
  onPasswordChange(): void {
    this.validateConfirmPassword();
    this.validateStep1();
  }

  togglePassword():     void { this.showPassword.update(v => !v); }
  get isPwdVisible():   boolean { return this.showPassword(); }
  toggleConfPassword(): void { this.showConfPassword.update(v => !v); }
  get isConfPwdVisible(): boolean { return this.showConfPassword(); }

  hasError(field: string): boolean { return !!this.errors[field]; }
  getError(field: string): string  { return this.errors[field] ?? ''; }
  errorMsg():  string | null { return this.errorMsgSignal(); }
  loading():   boolean       { return this.loadingSignal(); }

  private clearError(field: string) { delete this.errors[field]; }
  private setError(field: string, msg: string) { this.errors[field] = msg; }

  // -- Validateurs champ par champ -------------------------------------------
  validatePrenom(): void {
    this.form.prenom.trim().length > 1
      ? this.clearError('prenom')
      : this.setError('prenom', this.t('AUTH.ONBOARDING.VALIDATION.FIRST_NAME_REQUIRED'));
    this.validateStep1();
  }
  validateNom(): void {
    this.form.nom.trim().length > 1
      ? this.clearError('nom')
      : this.setError('nom', this.t('AUTH.ONBOARDING.VALIDATION.LAST_NAME_REQUIRED'));
    this.validateStep1();
  }
  validateEmail(): void {
    this.isEmailValid()
      ? this.clearError('email')
      : this.setError('email', this.t('AUTH.ONBOARDING.VALIDATION.EMAIL_INVALID'));
    this.validateStep1();
  }
  validateTelephone(): void {
    this.phoneLen(this.form.telephone) >= 8
      ? this.clearError('telephone')
      : this.setError('telephone', this.t('AUTH.ONBOARDING.VALIDATION.PHONE_INVALID'));
    this.validateStep1();
  }
  validateConfirmPassword(): void {
    if (!this.form.password) { this.clearError('confirmPassword'); return; }
    if (!this.form.confirmPassword)
      this.setError('confirmPassword', this.t('AUTH.ONBOARDING.VALIDATION.CONFIRM_PASSWORD_REQUIRED'));
    else if (this.form.confirmPassword !== this.form.password)
      this.setError('confirmPassword', this.t('AUTH.ONBOARDING.VALIDATION.CONFIRM_PASSWORD_MISMATCH'));
    else
      this.clearError('confirmPassword');
    // NE PAS rappeler validateStep1 ici — déjà géré par onPasswordChange
  }

  validateMatriculeFiscal(): void {
    this.isMatriculeFiscalValid()
      ? this.clearError('matriculeFiscal')
      : this.setError('matriculeFiscal', this.t('AUTH.ACCESS_REQUEST.VALIDATION.MATRICULE_INVALID'));
    this.validateStep2();
  }

  isMatriculeFiscalValid(value = this.form.matriculeFiscal): boolean {
    const normalized = value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    return /^[0-9]{7}[A-Z]([A-Z]{2}[0-9]{3})?$/.test(normalized);
  }
  validateFormeJuridique(): void {
    this.form.formeJuridique
      ? this.clearError('formeJuridique')
      : this.setError('formeJuridique', this.t('AUTH.ACCESS_REQUEST.VALIDATION.LEGAL_FORM_REQUIRED'));
    this.validateStep2();
  }
  validateRaisonSociale(): void {
    this.form.raisonSociale.trim().length > 2
      ? this.clearError('raisonSociale')
      : this.setError('raisonSociale', this.t('AUTH.ACCESS_REQUEST.VALIDATION.RAISON_SOCIALE_REQUIRED'));
    this.validateStep2();
  }
  validateNomEntreprise(): void {
    this.form.nomEntreprise.trim().length > 2
      ? this.clearError('nomEntreprise')
      : this.setError('nomEntreprise', this.t('AUTH.ACCESS_REQUEST.VALIDATION.COMPANY_NAME_REQUIRED'));
    this.validateStep2();
  }
  validateAdresse(): void {
    this.form.adresse.trim().length > 5
      ? this.clearError('adresse')
      : this.setError('adresse', this.t('AUTH.ACCESS_REQUEST.VALIDATION.ADDRESS_REQUIRED'));
    this.validateStep2();
  }
  validateGouvernorat(): void {
    this.form.gouvernorat
      ? this.clearError('gouvernorat')
      : this.setError('gouvernorat', this.t('AUTH.ACCESS_REQUEST.VALIDATION.GOVERNORATE_REQUIRED'));
    this.validateStep2();
  }

  // FIX: nouveau validateur code postal (4 chiffres tunisiens)
  validateCodePostal(): void {
    /^\d{4}$/.test(this.form.codePostal.trim())
      ? this.clearError('codePostal')
      : this.setError('codePostal', this.t('AUTH.ACCESS_REQUEST.VALIDATION.POSTAL_CODE_INVALID'));
    this.validateStep2();
  }

  validateSiteWeb(): void {
    this.isSiteWebValid()
      ? this.clearError('siteWeb')
      : this.setError('siteWeb', this.t('AUTH.ACCESS_REQUEST.VALIDATION.WEBSITE_INVALID'));
    this.validateStep2();
  }

  validateDevisePrincipale(): void {
    this.form.devisePrincipale.trim().length === 3
      ? this.clearError('devisePrincipale')
      : this.setError('devisePrincipale', this.t('AUTH.ONBOARDING.VALIDATION.CURRENCY_REQUIRED'));
    this.validateStep2();
  }

  validateTelEntreprise(): void {
    this.phoneLen(this.form.telEntreprise) >= 8
      ? this.clearError('telEntreprise')
      : this.setError('telEntreprise', this.t('AUTH.ACCESS_REQUEST.VALIDATION.COMPANY_PHONE_REQUIRED'));
    this.validateStep2();
  }
  validateRespPrenom(): void {
    this.form.respPrenom.trim().length > 1
      ? this.clearError('respPrenom')
      : this.setError('respPrenom', this.t('AUTH.ACCESS_REQUEST.VALIDATION.FIRST_NAME_REQUIRED'));
    this.validateStep3();
  }
  validateRespNom(): void {
    this.form.respNom.trim().length > 1
      ? this.clearError('respNom')
      : this.setError('respNom', this.t('AUTH.ACCESS_REQUEST.VALIDATION.LAST_NAME_REQUIRED'));
    this.validateStep3();
  }
  validateRespFonction(): void {
    if (!this.form.respFonction) {
      this.setError('respFonction', this.t('AUTH.ACCESS_REQUEST.VALIDATION.RESP_ROLE_REQUIRED'));
      this.clearError('respFonctionAutre');
    } else {
      this.clearError('respFonction');
      if (this.form.respFonction === 'Autre') {
        this.form.respFonctionAutre.trim().length > 2
          ? this.clearError('respFonctionAutre')
          : this.setError('respFonctionAutre', this.t('AUTH.ACCESS_REQUEST.VALIDATION.RESP_ROLE_OTHER_REQUIRED'));
      } else {
        this.clearError('respFonctionAutre');
      }
    }
    this.validateStep3();
  }
  validateFonctionAutre(): void {
    if (this.form.respFonction === 'Autre') {
      this.form.respFonctionAutre.trim().length > 2
        ? this.clearError('respFonctionAutre')
        : this.setError('respFonctionAutre', this.t('AUTH.ACCESS_REQUEST.VALIDATION.RESP_ROLE_OTHER_REQUIRED'));
    } else {
      this.clearError('respFonctionAutre');
    }
    this.validateStep3();
  }
  validateRespTel(): void {
    this.phoneLen(this.form.respTel) >= 8
      ? this.clearError('respTel')
      : this.setError('respTel', this.t('AUTH.ACCESS_REQUEST.VALIDATION.RESP_PHONE_REQUIRED'));
    this.validateStep3();
  }

  // -- Logo ------------------------------------------------------------------
  onLogoChange(evt: Event): void {
    const input = evt.target as HTMLInputElement;
    const file  = input.files?.[0];
    if (!file) return;

    // Validation : image, max 2 Mo
    if (!file.type.startsWith('image/')) {
      this.setError('logo', this.t('AUTH.ACCESS_REQUEST.LOGO.ERRORS.IMAGE_REQUIRED'));
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      this.setError('logo', this.t('AUTH.ACCESS_REQUEST.LOGO.ERRORS.SIZE'));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      this.form.logoPreview  = reader.result as string;
      this.form.logoFileName = file.name;
      this.clearError('logo');
      this.refresh();
    };
    reader.onerror = () => this.setError('logo', this.t('AUTH.ACCESS_REQUEST.LOGO.ERRORS.READ_FAILED'));
    reader.readAsDataURL(file);
  }

  removeLogo(): void {
    this.form.logoPreview  = null;
    this.form.logoFileName = null;
    this.refresh();
  }

  // -- Catégories ------------------------------------------------------------
  isCatSelected(key: string): boolean { return this.selectedCats().some(c => c.key === key); }
  toggleCat(cat: Category): void {
    this.isCatSelected(cat.key)
      ? this.selectedCats.update(list => list.filter(c => c.key !== cat.key))
      : this.selectedCats.update(list => [...list, cat]);
  }
  addCustomCat(): void {
    const name = this.customCatName.trim();
    if (!name) return;
    const key = 'custom_' + (++this._customIdx);
    if (!this.selectedCats().some(c => this.categoryName(c).toLowerCase() === name.toLowerCase())) {
      this.selectedCats.update(list => [...list, {
        key,
        customName: name,
        customDesc: this.t('AUTH.ONBOARDING.CATALOG.CUSTOM_DESC'),
      }]);
    }
    this.customCatName = '';
  }
  removeCat(key: string): void {
    this.selectedCats.update(list => list.filter(c => c.key !== key));
  }

  categoryName(cat: Category): string {
    return cat.customName ?? (cat.nameKey ? this.t(cat.nameKey) : cat.key);
  }

  categoryDesc(cat: Category): string {
    return cat.customDesc ?? (cat.descKey ? this.t(cat.descKey) : '');
  }

  optionLabel(options: SelectOption[], value: string): string {
    if (!value) return '';
    const option = options.find((entry) => entry.value === value);
    return option ? this.t(option.labelKey) : value;
  }

  t(key: string, params?: Record<string, unknown>): string {
    this.langVersion();
    return this.translate.instant(key, params);
  }
}
