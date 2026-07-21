export type KanbanColonne = 'todo' | 'doing' | 'done';
export type KanbanPriorite = 'haute' | 'moyenne' | 'basse';
export type KanbanCategorie = 'facture' | 'tva' | 'rs' | 'client' | 'rapport' | 'paiement';

export interface KanbanCarte {
  id: string;
  titre: string;
  description?: string;
  categorie: KanbanCategorie;
  priorite: KanbanPriorite;
  echeance?: string;
  assigneIdx: number[];
  colonne: KanbanColonne;
  creeLe: string;
}

export const CATEGORIES: Record<KanbanCategorie, { label: string; color: string; bg: string }> = {
  facture: { label: 'Facture', color: '#1d4ed8', bg: '#dbeafe' },
  tva: { label: 'TVA', color: '#6d28d9', bg: '#ede9fe' },
  rs: { label: 'Retenue source', color: '#92400e', bg: '#fef3c7' },
  client: { label: 'Client', color: '#047857', bg: '#d1fae5' },
  rapport: { label: 'Rapport', color: '#b91c1c', bg: '#fee2e2' },
  paiement: { label: 'Paiement', color: '#0f766e', bg: '#ccfbf1' },
};

export const PRIORITES: Record<KanbanPriorite, { label: string; color: string }> = {
  haute: { label: 'Haute', color: '#dc2626' },
  moyenne: { label: 'Moyenne', color: '#d97706' },
  basse: { label: 'Basse', color: '#16a34a' },
};

export const AVATARS = [
  { initiales: 'AH', bg: '#dbeafe', color: '#1d4ed8' },
  { initiales: 'FM', bg: '#d1fae5', color: '#047857' },
  { initiales: 'MB', bg: '#fef3c7', color: '#92400e' },
  { initiales: 'SC', bg: '#ede9fe', color: '#6d28d9' },
];

let seq = 0;
function uid(): string {
  seq += 1;
  return `k${Date.now()}${seq}`;
}

export function defaultCartes(): KanbanCarte[] {
  const now = new Date().toISOString();
  return [
    {
      id: uid(),
      colonne: 'todo',
      titre: 'Déclaration TVA mensuelle',
      description: 'Préparer la D15, contrôler TVA collectée et déductible avant dépôt.',
      categorie: 'tva',
      priorite: 'haute',
      echeance: '2026-05-28',
      assigneIdx: [0, 2],
      creeLe: now,
    },
    {
      id: uid(),
      colonne: 'todo',
      titre: 'Bordereau retenue à la source',
      description: 'Vérifier les retenues fournisseurs et préparer le bordereau mensuel.',
      categorie: 'rs',
      priorite: 'haute',
      echeance: '2026-05-28',
      assigneIdx: [1],
      creeLe: now,
    },
    {
      id: uid(),
      colonne: 'todo',
      titre: 'Relance client Gamma SARL',
      description: 'Facture FAC-2026-0042 impayée depuis 35 jours.',
      categorie: 'client',
      priorite: 'moyenne',
      echeance: '2026-05-20',
      assigneIdx: [0, 3],
      creeLe: now,
    },
    {
      id: uid(),
      colonne: 'todo',
      titre: 'Rapport chiffre d affaires mai',
      description: 'Synthèse commerciale et comptable pour la direction.',
      categorie: 'rapport',
      priorite: 'basse',
      echeance: '2026-05-31',
      assigneIdx: [2],
      creeLe: now,
    },
    {
      id: uid(),
      colonne: 'doing',
      titre: 'Rapprochement bancaire mai',
      description: 'Réconcilier les transactions banque avec les écritures comptables.',
      categorie: 'paiement',
      priorite: 'haute',
      echeance: '2026-05-18',
      assigneIdx: [1, 2],
      creeLe: now,
    },
    {
      id: uid(),
      colonne: 'doing',
      titre: 'Conversion devis en factures',
      description: 'Trois devis acceptés à convertir en factures définitives.',
      categorie: 'facture',
      priorite: 'moyenne',
      echeance: '2026-05-17',
      assigneIdx: [0],
      creeLe: now,
    },
    {
      id: uid(),
      colonne: 'doing',
      titre: 'Mise à jour plan comptable',
      description: 'Ajouter les sous-comptes liés aux nouveaux produits SaaS.',
      categorie: 'rapport',
      priorite: 'basse',
      echeance: '2026-05-22',
      assigneIdx: [3],
      creeLe: now,
    },
    {
      id: uid(),
      colonne: 'done',
      titre: 'Clôture exercice 2025',
      description: 'Bilan et compte de résultat validés par l expert-comptable.',
      categorie: 'rapport',
      priorite: 'haute',
      echeance: '2026-04-30',
      assigneIdx: [0, 1, 2],
      creeLe: now,
    },
    {
      id: uid(),
      colonne: 'done',
      titre: 'Paiement fournisseurs avril',
      description: 'Douze fournisseurs réglés, total 48 200 TND.',
      categorie: 'paiement',
      priorite: 'moyenne',
      echeance: '2026-04-25',
      assigneIdx: [1],
      creeLe: now,
    },
    {
      id: uid(),
      colonne: 'done',
      titre: 'Déclaration TVA avril 2026',
      description: 'D15 soumise et payée à la DGI.',
      categorie: 'tva',
      priorite: 'haute',
      echeance: '2026-04-28',
      assigneIdx: [0],
      creeLe: now,
    },
    {
      id: uid(),
      colonne: 'done',
      titre: 'Import transactions banque avril',
      description: '482 lignes importées et catégorisées.',
      categorie: 'paiement',
      priorite: 'basse',
      echeance: '2026-04-15',
      assigneIdx: [2, 3],
      creeLe: now,
    },
  ];
}
