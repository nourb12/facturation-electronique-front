import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

type IaSection = 'dashboard' | 'retard' | 'fraude' | 'tresorerie';

interface ClientRisk {
  id: string;
  nom: string;
  secteur: string;
  nbRetards: number;
  nbFactures: number;
  montantMoyen: number;
  score: number;
  niveau: 'critique' | 'modere' | 'faible';
  dernierRetard: number;
  action: string;
}

interface FraudeAlert {
  id: string;
  ref: string;
  fournisseur: string;
  montant: number;
  type: 'fournisseur' | 'iban' | 'commande' | 'sequence' | 'fractionnement' | 'horaire' | 'ok';
  detail: string;
  statut: 'bloquee' | 'attention' | 'validee';
  date: string;
}

interface PaiementAttendu {
  client: string;
  echeance: string;
  montant: number;
  probabilite: number;
  score: number;
}

@Component({
  selector: 'app-ia',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ia.component.html',
  styleUrls: ['./ia.component.scss']
})
export class IaComponent {

  activeSection = signal<IaSection>('dashboard');
  search = signal('');
  selectedFraudeId = signal<string | null>(null);

  sections: Array<{ key: IaSection; label: string; icon: string }> = [
    { key: 'dashboard',   label: 'Vue générale',            icon: 'ti-brain'              },
    { key: 'retard',      label: 'Prédiction retard',       icon: 'ti-clock-exclamation'  },
    { key: 'fraude',      label: 'Détection fraude',        icon: 'ti-shield-exclamation' },
    { key: 'tresorerie',  label: 'Prévision trésorerie',    icon: 'ti-chart-line'         },
  ];

  readonly clients = signal<ClientRisk[]>([
    { id: '1', nom: 'Ahmed Slim',       secteur: 'Commerce',    nbRetards: 4, nbFactures: 5, montantMoyen: 1190,  score: 87, niveau: 'critique', dernierRetard: 23, action: 'Relance J-5 programmée'     },
    { id: '2', nom: 'SARL Delta',       secteur: 'Industrie',   nbRetards: 2, nbFactures: 4, montantMoyen: 2380,  score: 54, niveau: 'modere',   dernierRetard: 12, action: 'Surveiller échéance'         },
    { id: '3', nom: 'Société Carthage', secteur: 'Services',    nbRetards: 0, nbFactures: 6, montantMoyen: 4760,  score: 12, niveau: 'faible',   dernierRetard: 0,  action: 'Aucune action'               },
    { id: '4', nom: 'TechnoSup',        secteur: 'IT',          nbRetards: 3, nbFactures: 4, montantMoyen: 3570,  score: 74, niveau: 'critique', dernierRetard: 18, action: 'Relance J-3 programmée'      },
    { id: '5', nom: 'Groupe Medina',    secteur: 'Immobilier',  nbRetards: 1, nbFactures: 5, montantMoyen: 9520,  score: 38, niveau: 'modere',   dernierRetard: 7,  action: 'Alerte si pas de retour J+5' },
  ]);

  readonly alertesFraude = signal<FraudeAlert[]>([
    { id: 'f1', ref: 'FAC-2026-0034', fournisseur: 'Fournitures Plus', montant: 14280, type: 'iban',        detail: 'Coordonnées bancaires modifiées juste avant paiement, sans validation responsable.', statut: 'bloquee',  date: '16/05/2026' },
    { id: 'f2', ref: 'FAC-2026-0031', fournisseur: 'TechnoSup',        montant: 3570,  type: 'commande',    detail: 'Facture reçue sans bon de commande ni réception associée dans le dossier achat.',     statut: 'attention', date: '14/05/2026' },
    { id: 'f3', ref: 'FAC-2026-0029', fournisseur: 'Horizon SARL',     montant: 8950,  type: 'fournisseur', detail: 'Nouveau fournisseur utilisé pour une dépense élevée, sans historique ni validation KYC complète.', statut: 'bloquee', date: '13/05/2026' },
    { id: 'f4', ref: 'FAC-2026-0033', fournisseur: 'Société Carthage', montant: 4760,  type: 'ok',          detail: 'Fournisseur connu, facture reliée au dossier achat, coordonnées bancaires inchangées.', statut: 'validee', date: '15/05/2026' },
    { id: 'f5', ref: 'FAC-2026-0032', fournisseur: 'SARL Delta',       montant: 2380,  type: 'ok',          detail: 'Contrôles passés : fournisseur connu, justificatif présent, workflow de validation complet.', statut: 'validee', date: '15/05/2026' },
  ]);

  readonly paiementsAttendus = signal<PaiementAttendu[]>([
    { client: 'Société Carthage', echeance: '24/05/2026', montant: 4760,  probabilite: 88, score: 12 },
    { client: 'Groupe Medina',    echeance: '28/05/2026', montant: 9520,  probabilite: 62, score: 38 },
    { client: 'SARL Delta',       echeance: '31/05/2026', montant: 2380,  probabilite: 46, score: 54 },
    { client: 'TechnoSup',        echeance: '03/06/2026', montant: 3570,  probabilite: 26, score: 74 },
    { client: 'Ahmed Slim',       echeance: '05/06/2026', montant: 1190,  probabilite: 13, score: 87 },
  ]);

  readonly tresoActuelle = signal(15420);
  readonly chargesMois    = signal(6200);
  readonly Math = Math;
  readonly sum = (total: number, paiement: PaiementAttendu) => total + paiement.montant;

  readonly tresoOptimiste = computed(() => {
    const total = this.paiementsAttendus().reduce((s, p) => s + p.montant, 0);
    return Math.round(this.tresoActuelle() + total - this.chargesMois());
  });

  readonly encaissementsRealistes = computed(() => {
    return Math.round(this.paiementsAttendus().reduce((s, p) => s + p.montant * (p.probabilite / 100), 0));
  });

  readonly tresoRealiste = computed(() => {
    return Math.round(this.tresoActuelle() + this.encaissementsRealistes() - this.chargesMois());
  });

  readonly tresoPessimiste = computed(() => Math.round(this.tresoActuelle() - this.chargesMois()));

  readonly kpis = computed(() => [
    { label: 'Factures analysées',     value: 47,   unit: '',   icon: 'ti-file-check',        tone: 'ok',   hint: '44 normales · 3 alertes'                          },
    { label: 'Alertes à vérifier',     value: 3,    unit: '',   icon: 'ti-shield-exclamation', tone: 'err',  hint: '2 bloquées · 1 en attention'                      },
    { label: 'Clients à risque',      value: 2,    unit: '',   icon: 'ti-user-exclamation',   tone: 'warn', hint: 'Score > 70% — relance auto active'                 },
    { label: 'Qualité des règles',    value: 78,   unit: '%',  icon: 'ti-adjustments-check',  tone: 'info', hint: "Contrôles ajustés avec les transactions enregistrées" },
  ]);

  readonly alertesDashboard = computed(() => [
    { level: 'danger', icon: 'ti-shield-x',     titre: '2 factures bloquées',                       detail: 'IBAN modifié et fournisseur inhabituel — validation manuelle requise' },
    { level: 'warning', icon: 'ti-clock-x',     titre: 'Ahmed Slim — risque retard 87%',           detail: 'Relance automatique programmée 5 jours avant l\'échéance du 05/06'    },
    { level: 'warning', icon: 'ti-clock-x',     titre: 'TechnoSup — risque retard 74%',            detail: 'Surveillance active — relance automatique J-3'                         },
    { level: 'info',    icon: 'ti-chart-line',  titre: `Trésorerie prévue J+30 : ${this.money(this.tresoRealiste())}`, detail: 'Scénario réaliste — basé sur les scores de paiement de vos clients' },
  ]);

  readonly selectedFraude = computed(() => {
    const id = this.selectedFraudeId();
    return this.alertesFraude().find(f => f.id === id) ?? null;
  });

  readonly fraudeStats = computed(() => ({
    total:    this.alertesFraude().length,
    bloquees: this.alertesFraude().filter(f => f.statut === 'bloquee').length,
    attention:this.alertesFraude().filter(f => f.statut === 'attention').length,
    validees: this.alertesFraude().filter(f => f.statut === 'validee').length,
  }));

  go(section: IaSection) { this.activeSection.set(section); }

  verifierFraude(alert: FraudeAlert): void {
    this.selectedFraudeId.set(alert.id);
  }

  scoreColor(score: number): string {
    if (score >= 70) return 'err';
    if (score >= 40) return 'warn';
    return 'ok';
  }

  niveauLabel(niveau: string): string {
    return { critique: 'Critique', modere: 'Modéré', faible: 'Faible' }[niveau] ?? niveau;
  }

  fraudeIcon(type: string): string {
    return {
      fournisseur: 'ti-building-store',
      iban: 'ti-credit-card',
      commande: 'ti-file-invoice',
      sequence: 'ti-list-numbers',
      fractionnement: 'ti-arrows-split',
      horaire: 'ti-clock-exclamation',
      ok: 'ti-check'
    }[type] ?? 'ti-alert-circle';
  }
  statutClass(statut: string): string {
    return { bloquee: 'err', attention: 'warn', validee: 'ok' }[statut] ?? '';
  }

  statutLabel(statut: string): string {
    return { bloquee: 'Bloquée', attention: 'À vérifier', validee: 'Validée' }[statut] ?? statut;
  }

  probaColor(prob: number): string {
    if (prob >= 70) return 'ok';
    if (prob >= 40) return 'warn';
    return 'err';
  }

  money(v: number): string {
    return new Intl.NumberFormat('fr-TN', { minimumFractionDigits: 3 }).format(v) + ' TND';
  }
}

