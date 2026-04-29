import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { environment } from '../../../../environments/environment';

const API = environment.apiUrl;

export type StatutDemande = 'EnAttente' | 'Accepte' | 'Refuse';
export type KycFlagSeverity = 'Critical' | 'Error' | 'Warning' | 'Info';

export interface KycFlag {
  code: string;
  message: string;
  severity: KycFlagSeverity | string;
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
  dateCreationExtraite?: string | null;
  kycScore?: number;
  texteBrut?: string | null;
  erreurMessage?: string | null;
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
  decision?: string;
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
    logo?: string;
  };
}

@Component({
  selector: 'app-admin-demandes-kyc',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-demandes-kyc.component.html',
  styleUrls: ['./admin-demandes-kyc.component.scss']
})
export class AdminDemandesKycComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  readonly demandes = signal<DemandeKyc[]>([]);
  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);
  readonly query = signal('');
  readonly filterStatut = signal<StatutDemande | 'Tous'>('Tous');

  readonly filtered = computed(() => {
    let list = this.demandes();
    const statut = this.filterStatut();

    if (statut !== 'Tous') {
      list = list.filter(demande => demande.statut === statut);
    }

    const query = this.query().toLowerCase().trim();
    if (query) {
      list = list.filter(demande =>
        demande.raisonSociale.toLowerCase().includes(query) ||
        demande.matriculeFiscal.toLowerCase().includes(query) ||
        demande.email.toLowerCase().includes(query)
      );
    }

    return list;
  });

  readonly stats = computed(() => {
    const all = this.demandes();
    return {
      total: all.length,
      enAttente: all.filter(d => d.statut === 'EnAttente').length,
      acceptes: all.filter(d => d.statut === 'Accepte').length,
      refuses: all.filter(d => d.statut === 'Refuse').length
    };
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.loadError.set(null);

    this.http.get<DemandeKyc[]>(`${API}/admin/demandes-kyc`).subscribe({
      next: data => {
        this.demandes.set(data || []);
        this.loading.set(false);
      },
      error: error => {
        this.demandes.set([]);
        if (error?.status === 0) {
          this.loadError.set('API indisponible. Démarrez le backend sur http://localhost:5051.');
        } else {
          this.loadError.set(error?.error?.message || 'Impossible de charger les demandes KYC depuis le backend.');
        }
        this.loading.set(false);
      }
    });
  }

  goDetail(id: string): void {
    this.router.navigate(['/admin/demandes-kyc', id]);
  }

  setFilter(filter: StatutDemande | 'Tous'): void {
    this.filterStatut.set(filter);
  }

  updateQuery(value: string): void {
    this.query.set(value);
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

  statutLabel(statut: StatutDemande): string {
    if (statut === 'Accepte') {
      return 'Acceptée';
    }
    if (statut === 'Refuse') {
      return 'Refusée';
    }
    return 'En attente';
  }

  decisionLabel(decision?: string | null): string {
    switch (decision) {
      case 'AutoApprovalCandidate':
        return 'Validation rapide';
      case 'RevisionManuelle':
        return 'Révision manuelle';
      case 'RejetAutomatique':
        return 'Risque élevé';
      default:
        return 'À analyser';
    }
  }

  flagLabel(flag: KycFlag): string {
    if (flag?.message?.trim()) {
      return flag.message.trim();
    }

    const code = flag?.code || '';
    if (!code) {
      return '';
    }

    const label = code.replace(/_/g, ' ');
    return label.charAt(0).toUpperCase() + label.slice(1);
  }

  dashArrayValue(score: number): string {
    const radius = 16;
    const circumference = 2 * Math.PI * radius;
    const clamped = Math.max(0, Math.min(100, score));
    const filled = (clamped / 100) * circumference;
    return `${filled} ${circumference}`;
  }

  initiales(demande: DemandeKyc): string {
    return ((demande.raisonSociale || demande.nomEntreprise || 'EY').charAt(0) || 'E').toUpperCase();
  }

  formatDate(iso: string): string {
    if (!iso) {
      return '—';
    }

    return new Date(iso).toLocaleDateString('fr-TN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }
}
