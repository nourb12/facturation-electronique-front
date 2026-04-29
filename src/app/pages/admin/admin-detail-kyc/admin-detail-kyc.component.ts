import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { environment } from '../../../../environments/environment';

const API = environment.apiUrl;

export type StatutDemande = 'EnAttente' | 'Accepte' | 'Refuse';

export interface KycFlag {
  code: string;
  message: string;
  severity: 'Critical' | 'Error' | 'Warning' | 'Info';
}

export interface KycBreakdownItem {
  key: string;
  label: string;
  points: number;
  maxPoints: number;
  ok: boolean;
  reason?: string | null;
}

export interface KycComparisonItem {
  key: string;
  label: string;
  formValue?: string | null;
  ocrValue?: string | null;
  available: boolean;
  matched: boolean;
  critical: boolean;
}

export interface KycOcrData {
  ocrSuccess: boolean;
  confidenceScore: number;
  typeDocument?: string | null;
  matriculeFiscalExtrait?: string | null;
  raisonSocialeExtraite?: string | null;
  nomGerantExtrait?: string | null;
  nomExtrait?: string | null;
  prenomExtrait?: string | null;
  cinExtrait?: string | null;
  formeJuridiqueExtraite?: string | null;
  adresseExtraite?: string | null;
  texteBrut?: string | null;
  erreurMessage?: string | null;
  statutRegistre?: string | null;
  nombreCinDetectes?: number | null;
}

export interface DemandeKyc {
  id: string;
  raisonSociale: string;
  matriculeFiscal: string;
  formeJuridique: string;
  nomEntreprise: string;
  adresse: string;
  gouvernorat: string;
  codePostal: string;
  devisePrincipale: string;
  siteWeb: string;
  email: string;
  telephone: string;
  telEntreprise: string;
  respPrenom: string;
  respNom: string;
  respEmail: string;
  respFonction: string;
  statut: StatutDemande;
  score: number;
  decision: 'AutoApprovalCandidate' | 'RevisionManuelle' | 'RejetAutomatique';
  flags: KycFlag[];
  scoreBreakdown: KycBreakdownItem[];
  comparisons: KycComparisonItem[];
  ocr?: KycOcrData | null;
  createdAt: string;
  documents: {
    registreCommerce?: string;
    patente?: string;
    cinResponsable?: string;
    rib?: string;
  };
}

@Component({
  selector: 'app-admin-detail-kyc',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-detail-kyc.component.html',
  styleUrls: ['./admin-detail-kyc.component.scss']
})
export class AdminDetailKycComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly apiRoot = API.replace(/\/api$/, '');

  readonly demande = signal<DemandeKyc | null>(null);
  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);
  readonly actionLoading = signal(false);
  readonly actionResult = signal<{ type: 'success' | 'error'; msg: string } | null>(null);

  readonly showRefusModal = signal(false);
  readonly showCorrectionsModal = signal(false);
  readonly correctionsLoading = signal(false);
  readonly correctionsSelection = signal<Set<string>>(new Set());

  readonly showDocViewer = signal(false);
  readonly docViewerUrl = signal<string>('');
  readonly docViewerSafeUrl = signal<SafeResourceUrl | null>(null);
  readonly docViewerLabel = signal('');
  readonly docViewerIsPdf = signal(false);

  motifRefus = '';
  correctionsMessage = '';
  private currentId = '';

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate(['/admin/demandes-kyc']);
      return;
    }

    this.currentId = id;
    this.load(id);
  }

  load(id: string): void {
    if (!id) {
      return;
    }

    this.loading.set(true);
    this.loadError.set(null);

    this.http.get<DemandeKyc>(`${API}/admin/demandes-kyc/${id}`).subscribe({
      next: demande => {
        this.demande.set(demande);
        this.loading.set(false);
      },
      error: error => {
        this.demande.set(null);
        this.loading.set(false);
        this.loadError.set(error?.error?.message || 'Impossible de charger le dossier KYC.');
      }
    });
  }

  retryLoad(): void {
    this.load(this.currentId);
  }

  accepter(): void {
    const demande = this.demande();
    if (!demande) {
      return;
    }

    this.actionLoading.set(true);

    this.http.post(`${API}/admin/demandes-kyc/${demande.id}/accepter`, {}).subscribe({
      next: () => {
        this.actionLoading.set(false);
        this.demande.update(previous => previous ? { ...previous, statut: 'Accepte' } : previous);
        this.showToast('success', "Demande acceptée. Email envoyé à l'entreprise.");
      },
      error: error => {
        this.actionLoading.set(false);
        this.showToast('error', error?.error?.message || "Erreur lors de l'acceptation.");
      }
    });
  }

  openRefusModal(): void {
    this.motifRefus = '';
    this.showRefusModal.set(true);
  }

  closeRefusModal(): void {
    this.showRefusModal.set(false);
  }

  confirmerRefus(): void {
    const demande = this.demande();
    if (!demande || !this.motifRefus.trim()) {
      return;
    }

    this.actionLoading.set(true);
    this.showRefusModal.set(false);

    this.http.post(`${API}/admin/demandes-kyc/${demande.id}/refuser`, { motif: this.motifRefus.trim() }).subscribe({
      next: () => {
        this.actionLoading.set(false);
        this.demande.update(previous => previous ? { ...previous, statut: 'Refuse' } : previous);
        this.showToast('success', 'Demande refusée. Motif envoyé par email.');
      },
      error: error => {
        this.actionLoading.set(false);
        this.showToast('error', error?.error?.message || 'Erreur lors du refus.');
      }
    });
  }

  openCorrectionsModal(): void {
    const preselected = new Set(
      (this.demande()?.flags || [])
        .filter(flag => flag.severity === 'Critical' || flag.severity === 'Error')
        .map(flag => flag.code)
    );

    this.correctionsSelection.set(preselected);
    this.correctionsMessage = '';
    this.showCorrectionsModal.set(true);
  }

  closeCorrectionsModal(): void {
    this.showCorrectionsModal.set(false);
  }

  toggleFlagSelection(code: string): void {
    this.correctionsSelection.update(selection => {
      const next = new Set(selection);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }
      return next;
    });
  }

  isFlagSelected(code: string): boolean {
    return this.correctionsSelection().has(code);
  }

  envoyerCorrections(): void {
    const demande = this.demande();
    const flagCodes = Array.from(this.correctionsSelection());

    if (!demande || !flagCodes.length) {
      return;
    }

    this.correctionsLoading.set(true);

    this.http.post(`${API}/admin/demandes-kyc/${demande.id}/demander-corrections`, {
      flagCodes,
      messageAdmin: this.correctionsMessage.trim() || null
    }).subscribe({
      next: () => {
        this.correctionsLoading.set(false);
        this.showCorrectionsModal.set(false);
        this.showToast('success', `Email de corrections envoyé (${flagCodes.length} point(s)).`);
      },
      error: error => {
        this.correctionsLoading.set(false);
        const message = error?.status === 404
          ? "L'action « Demander corrections » n'est pas encore disponible côté backend."
          : (error?.error?.message || "Erreur lors de l'envoi des corrections.");
        this.showToast('error', message);
      }
    });
  }

  openDocument(path: string, label: string, event?: Event): void {
    event?.stopPropagation();

    const cleanPath = path.replace(/^\/+/, '');
    const absoluteUrl = `${this.apiRoot}/${cleanPath}`;

    this.docViewerUrl.set(absoluteUrl);
    this.docViewerSafeUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(absoluteUrl));
    this.docViewerLabel.set(label);
    this.docViewerIsPdf.set(this.isPdf(path));
    this.showDocViewer.set(true);
  }

  closeDocViewer(): void {
    this.showDocViewer.set(false);
    this.docViewerUrl.set('');
    this.docViewerSafeUrl.set(null);
    this.docViewerLabel.set('');
    this.docViewerIsPdf.set(false);
  }

  goBack(): void {
    this.router.navigate(['/admin/demandes-kyc']);
  }

  flagColor(flag: KycFlag): string {
    switch (flag.severity) {
      case 'Critical':
        return 'flag--critical';
      case 'Error':
        return 'flag--err';
      case 'Warning':
        return 'flag--warn';
      default:
        return 'flag--info';
    }
  }

  flagLabel(flag: KycFlag): string {
    if (flag?.message?.trim()) {
      return flag.message.trim();
    }

    if (flag?.code?.trim()) {
      return this.formatFlagCode(flag.code);
    }

    return '—';
  }

  flagIcon(flag: KycFlag): string {
    switch (flag.severity) {
      case 'Critical':
        return 'Critique';
      case 'Error':
        return 'Erreur';
      case 'Warning':
        return 'Alerte';
      default:
        return 'Info';
    }
  }

  decisionLabel(): string {
    switch (this.demande()?.decision) {
      case 'AutoApprovalCandidate':
        return 'Approbation suggérée';
      case 'RejetAutomatique':
        return 'Rejet suggéré';
      default:
        return 'Révision manuelle';
    }
  }

  decisionClass(): string {
    switch (this.demande()?.decision) {
      case 'AutoApprovalCandidate':
        return 'badge--ok';
      case 'RejetAutomatique':
        return 'badge--err';
      default:
        return 'badge--warn';
    }
  }

  statutLabel(statut?: StatutDemande): string {
    switch (statut) {
      case 'Accepte':
        return 'Acceptée';
      case 'Refuse':
        return 'Refusée';
      default:
        return 'En attente';
    }
  }

  scoreClass(score: number): string {
    if (score >= 80) {
      return 'score--high';
    }
    if (score >= 50) {
      return 'score--mid';
    }
    return 'score--low';
  }

  scoreLabel(score: number): string {
    if (score >= 80) {
      return 'Fiable';
    }
    if (score >= 50) {
      return 'À vérifier';
    }
    return 'Suspect';
  }

  docEntries(): { key: string; label: string; path: string; fileName: string }[] {
    const demande = this.demande();
    if (!demande?.documents) {
      return [];
    }

    const labels: Record<string, string> = {
      registreCommerce: 'Registre de commerce',
      patente: 'Patente',
      cinResponsable: 'CIN responsable',
      rib: 'RIB bancaire'
    };

    return Object.entries(demande.documents)
      .filter(([, value]) => !!value)
      .map(([key, value]) => ({
        key,
        label: labels[key] || key,
        path: value!,
        fileName: value!.split('/').pop() || value!
      }));
  }

  isPdf(path: string): boolean {
    return path.toLowerCase().endsWith('.pdf');
  }

  ocrConfidencePercent(): number {
    return Math.round((this.demande()?.ocr?.confidenceScore || 0) * 100);
  }

  ocrStatusLabel(): string {
    const ocr = this.demande()?.ocr;
    if (!ocr) {
      return 'OCR non configuré';
    }
    if (!ocr.ocrSuccess) {
      return ocr.erreurMessage || 'OCR indisponible';
    }
    if (ocr.confidenceScore >= 0.6) {
      return 'OCR exploitable';
    }
    return 'OCR à confiance faible';
  }

  breakdownItems(): KycBreakdownItem[] {
    return this.demande()?.scoreBreakdown || [];
  }

  comparisonItems(): KycComparisonItem[] {
    return this.demande()?.comparisons || [];
  }

  comparisonClass(item: KycComparisonItem): string {
    if (!item.available) {
      return 'comparison--na';
    }
    return item.matched ? 'comparison--ok' : 'comparison--err';
  }

  comparisonLabel(item: KycComparisonItem): string {
    if (!item.available) {
      return 'Non comparé';
    }
    return item.matched ? 'Concordant' : 'Écart détecté';
  }

  displayValue(value?: string | null): string {
    return value?.trim() || '—';
  }

  formatDate(iso: string): string {
    if (!iso) {
      return '—';
    }

    return new Date(iso).toLocaleDateString('fr-TN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatFlagCode(code: string): string {
    return code.replace(/_/g, ' ').trim();
  }

  private showToast(type: 'success' | 'error', msg: string): void {
    this.actionResult.set({ type, msg });
    setTimeout(() => this.actionResult.set(null), 4000);
  }
}
