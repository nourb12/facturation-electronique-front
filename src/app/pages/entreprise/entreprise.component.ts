import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { trigger, transition, style, animate } from '@angular/animations';
import { EntrepriseApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { EntrepriseLogicService } from './entreprise-logic.service';

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
    teifSignature: true,
    teifArchivage: true,
    teifHorodatage: false,
    teifSandbox: true,
    teifSurveille: false
  };

  teifItems = [
    { key: 'teifSignature', label: 'Signature numerique', detail: 'Certificat DGI valide' },
    { key: 'teifArchivage', label: 'Archivage legal', detail: '10 ans de conservation' },
    { key: 'teifHorodatage', label: 'Horodatage', detail: 'Serveur de temps qualifie' },
    { key: 'teifSandbox', label: 'Tests TEIF', detail: 'Envoi reussi en pre-production' },
    { key: 'teifSurveille', label: 'Surveillance', detail: 'Alertes de rejet configurees' }
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
    if (field === 'activiteCode') {
      this.activiteLabel = this.logic.getActiviteLabel(this.entreprise.activiteCode);
    }
    if (field === 'forme' || field === 'raisonSociale') {
      this.formeSuggestion = this.logic.detectFormeSuggestion(this.entreprise.raisonSociale, this.entreprise.forme);
    }
    this.refreshValidation();
    this.updateTeifMeta();
  }

  markTouched(field: string) {
    this.fieldTouched[field] = true;
    this.refreshValidation();
  }

  fieldError(field: string): string { return this.fieldErrors[field] ?? ''; }
  showError(field: string): boolean {
    return !!this.fieldErrors[field] && (this.fieldTouched[field] || this.stepAttempted);
  }
  isFieldValid(field: string): boolean {
    const val = this.entreprise?.[field];
    if (val === undefined || val === null) return false;
    if (typeof val === 'string' && val.trim().length === 0) return false;
    return !this.fieldErrors[field];
  }

  refreshValidation() {
    const errors: Record<string, string> = {};

    const rs = this.logic.validateRequired(this.entreprise.raisonSociale, 'Raison sociale');
    if (rs) errors['raisonSociale'] = rs;

    const forme = this.logic.validateRequired(this.entreprise.forme, 'Forme juridique');
    if (forme) errors['forme'] = forme;

    const act = this.logic.validateRequired(this.entreprise.activiteCode, 'Code activite');
    if (act) errors['activiteCode'] = act;

    const adr = this.logic.validateRequired(this.entreprise.adresse, 'Adresse');
    if (adr) errors['adresse'] = adr;

    const gov = this.logic.validateRequired(this.entreprise.gouvernorat, 'Gouvernorat');
    if (gov) errors['gouvernorat'] = gov;

    const tel = this.logic.validateTelephone(this.entreprise.telephone);
    if (tel) errors['telephone'] = tel;

    const email = this.logic.validateEmail(this.entreprise.email);
    if (email) errors['email'] = email;

    const mf = this.logic.validateMatriculeFiscal(this.entreprise.matriculeFiscal);
    if (mf) errors['matriculeFiscal'] = mf;

    const regime = this.logic.validateRequired(this.entreprise.regimeTVA, 'Regime TVA');
    if (regime) errors['regimeTVA'] = regime;

    const taux = this.logic.validateRequired(this.entreprise.tauxTVAPrincipal, 'Taux TVA');
    if (taux) errors['tauxTVAPrincipal'] = taux;

    this.fieldErrors = errors;
  }

  updateTeifMeta() {
    const meta = this.logic.computeTeifMeta(this.teifItems, this.entreprise);
    if (meta.score !== this.teifScore) {
      this.scorePulse = true;
      setTimeout(() => this.scorePulse = false, 300);
    }
    if (meta.label !== this.teifLevelLabel) {
      this.statusPulse = true;
      setTimeout(() => this.statusPulse = false, 300);
    }
    this.teifScore = meta.score;
    this.teifColor = meta.color;
    const circ = 2 * Math.PI * 32;
    this.teifDash = circ * (1 - meta.score / 100);
    this.teifLevelLabel = meta.label;
    this.teifLevelClass = `level-${meta.level}`;
    this.teifStatusMessage = meta.message;
    this.teifRecommendations = meta.recommendations;
  }

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
    const required = this.steps[index].required || [];
    return required.every(f => this.isFieldValid(f));
  }

  goToStep(index: number) {
    if (index === this.activeStepIndex) return;
    if (index <= this.activeStepIndex) {
      this.activeStepIndex = index;
      this.stepAttempted = false;
      return;
    }
    if (this.isStepValid(this.activeStepIndex)) {
      this.activeStepIndex = index;
      this.stepAttempted = false;
    } else {
      this.stepAttempted = true;
    }
  }

  nextStep() {
    this.stepAttempted = true;
    if (!this.isStepValid(this.activeStepIndex)) return;
    if (this.activeStepIndex === this.steps.length - 1) {
      this.save();
      return;
    }
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

  save() {
    if (this.saving()) return;
    const id = this.auth.entrepriseId;
    if (!id) return;

    const payload = {
      nom: this.entreprise.raisonSociale,
      raisonSociale: this.entreprise.raisonSociale,
      nomCommercial: this.entreprise.nomCommercial,
      forme: this.entreprise.forme,
      capital: this.entreprise.capital,
      dateCreation: this.entreprise.dateCreation,
      activiteCode: this.entreprise.activiteCode,
      activiteLibelle: this.activiteLabel,
      adresse: this.entreprise.adresse,
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
      tauxTVAPrincipal: this.entreprise.tauxTVAPrincipal,
      teifSignature: this.entreprise.teifSignature,
      teifArchivage: this.entreprise.teifArchivage,
      teifHorodatage: this.entreprise.teifHorodatage,
      teifSandbox: this.entreprise.teifSandbox,
      teifSurveille: this.entreprise.teifSurveille
    } as any;

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
        this.toast.error(err?.error?.message ?? 'Erreur.');
      }
    });
  }
}