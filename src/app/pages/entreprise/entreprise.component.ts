import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { trigger, transition, style, animate } from '@angular/animations';
import { EntrepriseApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { EntrepriseLogicService } from './entreprise-logic.service';

export type SignatureType = 'digiToken' | 'certificatFichier' | 'clePrivee' | null;

@Component({
  selector: 'app-entreprise',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './entreprise.component.html',
  styleUrls: ['./entreprise.component.scss'],
  animations: [
    trigger('pageIn', [transition(':enter', [
      style({ opacity: 0, transform: 'translateY(8px)' }),
      animate('380ms cubic-bezier(.16,1,.3,1)', style({ opacity: 1, transform: 'translateY(0)' }))
    ])]),
    trigger('fadeIn', [
      transition(':enter', [style({ opacity: 0 }), animate('200ms ease', style({ opacity: 1 }))]),
      transition(':leave', [animate('150ms ease', style({ opacity: 0 }))])
    ]),
    trigger('slideDown', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-8px)', maxHeight: '0px' }),
        animate('280ms cubic-bezier(.16,1,.3,1)', style({ opacity: 1, transform: 'translateY(0)', maxHeight: '600px' }))
      ]),
      transition(':leave', [
        animate('200ms ease', style({ opacity: 0, transform: 'translateY(-4px)', maxHeight: '0px' }))
      ])
    ])
  ]
})
export class EntrepriseComponent implements OnInit {
  private svc = inject(EntrepriseApiService);
  private auth = inject(AuthService);
  private toast = inject(ToastService);
  private logic = inject(EntrepriseLogicService);

  loading = signal(true);
  saving = signal(false);
  saved = false;

  steps = [
    { key: 'identite', label: 'Identite', title: "Identite de l'entreprise", subtitle: 'Renseignez les informations de base', required: ['raisonSociale', 'forme', 'activiteCode'] },
    { key: 'coordonnees', label: 'Coordonnees', title: 'Coordonnees professionnelles', subtitle: 'Contacts et localisation', required: ['adresse', 'gouvernorat', 'telephone', 'email'] },
    { key: 'fiscal', label: 'Fiscal', title: 'Informations fiscales', subtitle: 'Elements obligatoires TEIF', required: ['matriculeFiscal', 'regimeTVA', 'tauxTVAPrincipal'] },
    { key: 'teif', label: 'Conformite TEIF', title: 'Conformite TEIF', subtitle: 'Activez les criteres requis', required: [] }
  ];

  activeStepIndex = 0;
  stepAttempted = false;

  formes = ['SARL', 'SA', 'SUARL', 'SAS', 'SNC'];
  activitesCodes = ['6201Z', '6920Z', '6910Z', '4711A', '4120A'];
  gouvernorats = ['Tunis', 'Ariana', 'Ben Arous', 'Sousse', 'Sfax', 'Nabeul'];
  regimesTVA = ['Regime reel', 'Regime forfaitaire', 'Exonere'];

  entreprise: any = {
    raisonSociale: '',
    nomCommercial: '',
    forme: 'SARL',
    capital: '',
    dateCreation: '',
    activiteCode: this.activitesCodes[0],
    adresse: '',
    codePostal: '',
    gouvernorat: this.gouvernorats[0],
    pays: 'Tunisie',
    telephone: '',
    fax: '',
    email: '',
    siteWeb: '',
    matriculeFiscal: '',
    numRNE: '',
    regimeTVA: this.regimesTVA[0],
    tauxTVAPrincipal: 19,
    teifSignature: false,
    teifArchivage: true,
    teifHorodatage: true,
    teifSandbox: false,
    teifSurveille: false
  };

  // ─── TEIF Signature ───────────────────────────────────────────────
  signatureType: SignatureType = null;
  expandedTeifItem: string | null = null;

  // DigiToken
  digiTokenPin = '';
  digiTokenConnected = false;
  digiTokenConnecting = false;

  // Certificat fichier
  certFileName: string | null = null;
  certFileData: string | null = null;
  certPassword = '';
  certValidating = false;
  certValidated = false;
  certExpiry: string | null = null;

  // Cle privee RSA
  clePriveeFileName: string | null = null;
  clePriveeData: string | null = null;
  certRsaFileName: string | null = null;
  certRsaData: string | null = null;
  rsaValidated = false;

  // Archivage
  archivageActive = true; // automatique

  // Tests TEIF
  sandboxRunning = false;
  sandboxResult: 'success' | 'error' | null = null;
  sandboxLog: string[] = [];

  // Surveillance
  surveillanceEmail = '';
  surveillanceEmailConfirmed = false;
  surveillanceAlerts = {
    rejet: true,
    expiration: true,
    erreurEnvoi: false
  };

  // ─── TEIF Items ────────────────────────────────────────────────────
  teifItems = [
    { key: 'teifSignature',  label: 'Signature numerique', detail: 'Certificat DGI valide',            icon: 'certificate' },
    { key: 'teifArchivage',  label: 'Archivage legal',     detail: '10 ans de conservation',           icon: 'archive' },
    { key: 'teifHorodatage', label: 'Horodatage',          detail: 'Serveur de temps qualifie',        icon: 'clock' },
    { key: 'teifSandbox',    label: 'Tests TEIF',          detail: 'Envoi reussi en pre-production',   icon: 'send' },
    { key: 'teifSurveille',  label: 'Surveillance',        detail: 'Alertes de rejet configurees',     icon: 'bell' }
  ];

  fieldErrors: Record<string, string> = {};
  fieldTouched: Record<string, boolean> = {};
  activiteLabel = '';
  formeSuggestion: string | null = null;

  teifScore = 0;
  teifDash = 0;
  teifLevelLabel = 'Partiel';
  teifLevelClass = 'level-partiel';
  teifStatusMessage = '';
  teifRecommendations: string[] = [];
  teifColor = '#FFE600';
  scorePulse = false;
  statusPulse = false;

  ngOnInit() {
    const id = this.auth.entrepriseId;
    if (!id) {
      this.loading.set(false);
      this.refreshDerived();
      return;
    }
    this.svc.obtenirParId(id).subscribe({
      next: (e) => {
        const tel = e.telephone ?? e.tel ?? '';
        this.entreprise = { ...this.entreprise, ...e, telephone: tel };
        this.loading.set(false);
        this.refreshDerived();
      },
      error: () => this.loading.set(false)
    });
  }

  refreshDerived() {
    this.activiteLabel = this.logic.getActiviteLabel(this.entreprise.activiteCode);
    this.formeSuggestion = this.logic.detectFormeSuggestion(this.entreprise.raisonSociale, this.entreprise.forme);
    this.refreshValidation();
    this.updateTeifMeta();
  }

  onFieldChange(field?: string) {
    if (field === 'activiteCode') this.activiteLabel = this.logic.getActiviteLabel(this.entreprise.activiteCode);
    if (field === 'forme' || field === 'raisonSociale') {
      this.formeSuggestion = this.logic.detectFormeSuggestion(this.entreprise.raisonSociale, this.entreprise.forme);
    }
    this.refreshValidation();
    this.updateTeifMeta();
  }

  markTouched(field: string) { this.fieldTouched[field] = true; this.refreshValidation(); }
  fieldError(field: string): string { return this.fieldErrors[field] ?? ''; }
  showError(field: string): boolean { return !!this.fieldErrors[field] && (this.fieldTouched[field] || this.stepAttempted); }
  isFieldValid(field: string): boolean {
    const val = this.entreprise?.[field];
    if (val === undefined || val === null) return false;
    if (typeof val === 'string' && val.trim().length === 0) return false;
    return !this.fieldErrors[field];
  }

  refreshValidation() {
    const errors: Record<string, string> = {};
    const checks: Array<[string, () => string | null]> = [
      ['raisonSociale', () => this.logic.validateRequired(this.entreprise.raisonSociale, 'Raison sociale')],
      ['forme',         () => this.logic.validateRequired(this.entreprise.forme, 'Forme juridique')],
      ['activiteCode',  () => this.logic.validateRequired(this.entreprise.activiteCode, 'Code activite')],
      ['adresse',       () => this.logic.validateRequired(this.entreprise.adresse, 'Adresse')],
      ['gouvernorat',   () => this.logic.validateRequired(this.entreprise.gouvernorat, 'Gouvernorat')],
      ['telephone',     () => this.logic.validateTelephone(this.entreprise.telephone)],
      ['email',         () => this.logic.validateEmail(this.entreprise.email)],
      ['matriculeFiscal',() => this.logic.validateMatriculeFiscal(this.entreprise.matriculeFiscal)],
      ['regimeTVA',     () => this.logic.validateRequired(this.entreprise.regimeTVA, 'Regime TVA')],
      ['tauxTVAPrincipal',() => this.logic.validateRequired(this.entreprise.tauxTVAPrincipal, 'Taux TVA')],
    ];
    for (const [f, fn] of checks) { const e = fn(); if (e) errors[f] = e; }
    this.fieldErrors = errors;
  }

  updateTeifMeta() {
    const meta = this.logic.computeTeifMeta(this.teifItems, this.entreprise);
    if (meta.score !== this.teifScore) { this.scorePulse = true; setTimeout(() => this.scorePulse = false, 300); }
    if (meta.label !== this.teifLevelLabel) { this.statusPulse = true; setTimeout(() => this.statusPulse = false, 300); }
    this.teifScore = meta.score;
    this.teifColor = meta.color;
    this.teifDash = 2 * Math.PI * 32 * (1 - meta.score / 100);
    this.teifLevelLabel = meta.label;
    this.teifLevelClass = `level-${meta.level}`;
    this.teifStatusMessage = meta.message;
    this.teifRecommendations = meta.recommendations;
  }

  // ─── TEIF Accordion ───────────────────────────────────────────────
  toggleTeifItem(key: string) {
    this.expandedTeifItem = this.expandedTeifItem === key ? null : key;
  }

  // ─── Signature type selection ─────────────────────────────────────
  selectSignatureType(type: SignatureType) {
    this.signatureType = type;
    // Reset states
    this.digiTokenPin = ''; this.digiTokenConnected = false;
    this.certFileName = null; this.certPassword = ''; this.certValidated = false; this.certExpiry = null;
    this.clePriveeFileName = null; this.certRsaFileName = null; this.rsaValidated = false;
    this.entreprise.teifSignature = false;
    this.updateTeifMeta();
  }

  // ─── DigiToken ────────────────────────────────────────────────────
  connectDigiToken() {
    if (!this.digiTokenPin || this.digiTokenPin.length < 4) {
      this.toast.error('Le code PIN doit contenir au moins 4 caracteres.');
      return;
    }
    this.digiTokenConnecting = true;
    setTimeout(() => {
      this.digiTokenConnecting = false;
      this.digiTokenConnected = true;
      this.entreprise.teifSignature = true;
      this.updateTeifMeta();
      this.toast.success('DigiToken connecte avec succes.');
    }, 1800);
  }

  // ─── Certificat fichier ───────────────────────────────────────────
  onCertFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const file = input.files[0];
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['p12', 'pfx'].includes(ext ?? '')) {
      this.toast.error('Format invalide. Utilisez un fichier .p12 ou .pfx');
      return;
    }
    this.certFileName = file.name;
    const reader = new FileReader();
    reader.onload = (e) => { this.certFileData = e.target?.result as string; };
    reader.readAsDataURL(file);
  }

  validateCertificat() {
    if (!this.certFileName || !this.certPassword) {
      this.toast.error('Veuillez choisir un fichier et saisir le mot de passe.');
      return;
    }
    this.certValidating = true;
    setTimeout(() => {
      this.certValidating = false;
      this.certValidated = true;
      this.certExpiry = '12/03/2027';
      this.entreprise.teifSignature = true;
      this.updateTeifMeta();
      this.toast.success('Certificat valide. Expire le ' + this.certExpiry);
    }, 2000);
  }

  // ─── Cle privee RSA ───────────────────────────────────────────────
  onClePriveeSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    this.clePriveeFileName = input.files[0].name;
    this.checkRsaReady();
  }

  onCertRsaSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    this.certRsaFileName = input.files[0].name;
    this.checkRsaReady();
  }

  checkRsaReady() {
    if (this.clePriveeFileName && this.certRsaFileName) {
      setTimeout(() => {
        this.rsaValidated = true;
        this.entreprise.teifSignature = true;
        this.updateTeifMeta();
        this.toast.success('Paire de cles RSA validee.');
      }, 1500);
    }
  }

  // ─── Sandbox / Tests TEIF ─────────────────────────────────────────
  lancerTestSandbox() {
    if (this.sandboxRunning) return;
    this.sandboxRunning = true;
    this.sandboxResult = null;
    this.sandboxLog = [];
    const steps = [
      'Connexion au serveur DGI pre-production...',
      'Preparation de la facture test (FA-TEST-001)...',
      'Signature numerique appliquee...',
      'Horodatage enregistre...',
      'Envoi vers endpoint TEIF sandbox...',
      'Reponse recue de la DGI : ACCEPTE'
    ];
    let i = 0;
    const interval = setInterval(() => {
      if (i < steps.length) {
        this.sandboxLog = [...this.sandboxLog, steps[i]];
        i++;
      } else {
        clearInterval(interval);
        this.sandboxRunning = false;
        this.sandboxResult = 'success';
        this.entreprise.teifSandbox = true;
        this.updateTeifMeta();
        this.toast.success('Test TEIF reussi en pre-production.');
      }
    }, 600);
  }

  // ─── Surveillance ─────────────────────────────────────────────────
  confirmerSurveillance() {
    if (!this.surveillanceEmail || !this.surveillanceEmail.includes('@')) {
      this.toast.error('Email invalide.');
      return;
    }
    this.surveillanceEmailConfirmed = true;
    this.entreprise.teifSurveille = true;
    this.updateTeifMeta();
    this.toast.success('Alertes configurees sur ' + this.surveillanceEmail);
  }

  resetSurveillance() {
    this.surveillanceEmailConfirmed = false;
    this.surveillanceEmail = '';
    this.entreprise.teifSurveille = false;
    this.updateTeifMeta();
  }

  // ─── Navigation ───────────────────────────────────────────────────
  stepCompletion(index: number): number {
    if (index === this.steps.length - 1) return this.teifScore;
    const required = this.steps[index].required || [];
    if (!required.length) return 0;
    const ok = required.filter(f => this.isFieldValid(f)).length;
    return Math.round((ok / required.length) * 100);
  }

  get overallProgress(): number {
    const total = this.steps.reduce((sum, _, i) => sum + this.stepCompletion(i), 0);
    return Math.round(total / this.steps.length);
  }

  isStepValid(index: number): boolean {
    if (index === this.steps.length - 1) return true;
    return (this.steps[index].required || []).every(f => this.isFieldValid(f));
  }

  goToStep(index: number) {
    if (index === this.activeStepIndex) return;
    if (index <= this.activeStepIndex) { this.activeStepIndex = index; this.stepAttempted = false; return; }
    if (this.isStepValid(this.activeStepIndex)) { this.activeStepIndex = index; this.stepAttempted = false; }
    else this.stepAttempted = true;
  }

  nextStep() {
    this.stepAttempted = true;
    if (!this.isStepValid(this.activeStepIndex)) return;
    if (this.activeStepIndex === this.steps.length - 1) { this.save(); return; }
    this.activeStepIndex += 1;
    this.stepAttempted = false;
  }

  prevStep() {
    if (this.activeStepIndex === 0) return;
    this.activeStepIndex -= 1;
    this.stepAttempted = false;
  }

  onTeifToggle(key: string, value: boolean) {
    this.entreprise[key] = value;
    this.updateTeifMeta();
  }

  getEntrepriseValue(key: string) { return !!this.entreprise?.[key]; }

  private compactPayload(payload: Record<string, any>) {
    return Object.fromEntries(
      Object.entries(payload).filter(([, value]) => {
        if (value === undefined || value === null) return false;
        if (typeof value === 'string' && value.trim() === '') return false;
        return true;
      })
    );
  }

  private asText(value: any) {
    if (value === undefined || value === null) return undefined;
    return String(value);
  }

  private asNumber(value: any) {
    if (value === undefined || value === null || value === '') return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  private apiErrorMessage(err: any) {
    const body = err?.error;
    if (Array.isArray(body?.errors) && body.errors.length) return body.errors[0];
    if (body?.errors && typeof body.errors === 'object') {
      const first = Object.values(body.errors).flat()[0];
      if (typeof first === 'string') return first;
    }
    return body?.message ?? 'Erreur.';
  }

  save() {
    if (this.saving()) return;
    const id = this.auth.entrepriseId;
    if (!id) return;
    const payload = this.compactPayload({
      nom: this.entreprise.raisonSociale,
      raisonSociale: this.entreprise.raisonSociale,
      nomCommercial: this.entreprise.nomCommercial,
      forme: this.entreprise.forme,
      capital: this.asText(this.entreprise.capital),
      dateCreation: this.entreprise.dateCreation,
      activiteCode: this.entreprise.activiteCode,
      activiteLibelle: this.activiteLabel,
      adresse: this.entreprise.adresse,
      ville: this.entreprise.ville || this.entreprise.gouvernorat,
      codePostal: this.entreprise.codePostal,
      gouvernorat: this.entreprise.gouvernorat,
      pays: this.entreprise.pays,
      telephone: this.entreprise.telephone,
      tel: this.entreprise.telephone,
      fax: this.entreprise.fax,
      email: this.entreprise.email,
      siteWeb: this.entreprise.siteWeb,
      matriculeFiscal: this.entreprise.matriculeFiscal,
      numRNE: this.entreprise.numRNE,
      regimeTVA: this.entreprise.regimeTVA,
      tauxTVAPrincipal: this.asNumber(this.entreprise.tauxTVAPrincipal)
    });
    this.saving.set(true);
    this.svc.mettreAJour(id, payload).subscribe({
      next: (e) => {
        this.saving.set(false);
        this.entreprise = { ...this.entreprise, ...e, telephone: e.telephone ?? e.tel ?? this.entreprise.telephone };
        this.saved = true;
        setTimeout(() => this.saved = false, 2200);
        this.refreshDerived();
        this.toast.success('Informations mises a jour.');
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.error(this.apiErrorMessage(err));
      }
    });
  }
}
