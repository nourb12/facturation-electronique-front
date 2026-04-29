import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { of } from 'rxjs';
import { environment } from '../../../environments/environment';

const demoStats = {
  totalBrouillons: 4,
  totalValidees: 48,
  totalTransmises: 12,
  totalAcceptees: 36,
  totalRejetees: 3,
  totalPayees: 32,
  totalEnRetard: 5,
  montantTotalMois: 174000,
  montantEncaisseMois: 128000,
  montantEnAttente: 46000,
  tauxConformite: 92
};

const demoKpisFin = {
  montantTotalMois: 174000,
  montantEncaisseMois: 128000,
  montantEnAttente: 46000,
  tauxEncaissement: 74
};

const demoKpisConformite = {
  tauxConformite: 92,
  totalConformes: 138
};

const demoEvolutionMensuelle = [
  { mois: 'Oct 2025', montantTtc: 98000 },
  { mois: 'Nov 2025', montantTtc: 112000 },
  { mois: 'Déc 2025', montantTtc: 124000 },
  { mois: 'Jan 2026', montantTtc: 138000 },
  { mois: 'Fév 2026', montantTtc: 156000 },
  { mois: 'Mar 2026', montantTtc: 174000 },
];
const demoDernieresFactures = [
  { id: 'F-2026-001', numero: 'FAC-2026-001', clientNom: 'STE GreenTech', totalTtc: 12500.750, devise: 'TND', statut: 'Validee' },
  { id: 'F-2026-002', numero: 'FAC-2026-002', clientNom: 'Banque BIAT', totalTtc: 8420.000, devise: 'TND', statut: 'Transmise' },
  { id: 'F-2026-003', numero: 'FAC-2026-003', clientNom: 'Societe OneTel', totalTtc: 15600.300, devise: 'TND', statut: 'Payee' },
];

const demoAlertes = [
  { type: 'retard', message: '5 factures en retard de paiement (>15 jours).' },
  { type: 'conformite', message: '2 factures a regenerer au format TEIF.' },
];

const demoFactures = {
  items: demoDernieresFactures.map(f => ({
    ...f,
    clientId: 'CL-' + f.id,
    typeFacture: 'Vente',
    modePaiement: 'Virement',
    devise: 'TND',
    dateEmission: '2026-03-15',
    dateEcheance: '2026-04-14',
    datePaiement: f.statut === 'Payee' ? '2026-03-20' : null,
    totalHt: Number((f.totalTtc / 1.19).toFixed(3)),
    totalTva: Number((f.totalTtc - f.totalTtc / 1.19).toFixed(3)),
    totalTtc: f.totalTtc,
    montantPaye: f.statut === 'Payee' ? f.totalTtc : 0,
    montantRestant: f.statut === 'Payee' ? 0 : f.totalTtc,
    estEnRetard: f.statut === 'Transmise',
    notes: '',
    conditionsPaiement: '30 jours fin de mois',
    xmlGenere: true,
    versionTeif: 'v1.2',
    lignes: [],
    historique: [],
    creeLe: '2026-03-01',
    modifieLe: '2026-03-15'
  })),
  total: 3,
  page: 1,
  parPage: 20
};

const demoClients = {
  items: [
    { id: 'CL-1', nom: 'STE GreenTech', email: 'contact@greentech.tn', typeClient: 'Entreprise', matriculeFiscal: '1234567A/B/C/000', adresse: 'Tunis', ville: 'Tunis', codePostal: '1002', pays: 'TN', telephone: '+21620111222', estActif: true, creeLe: '2026-01-12', modifieLe: '2026-03-01', entrepriseId: 'ENT-1' },
    { id: 'CL-2', nom: 'Banque BIAT', email: 'achats@biat.com', typeClient: 'Entreprise', matriculeFiscal: '7654321B/C/D/000', adresse: 'Lac 2', ville: 'Tunis', codePostal: '1053', pays: 'TN', telephone: '+21671123456', estActif: true, creeLe: '2026-02-02', modifieLe: '2026-03-03', entrepriseId: 'ENT-1' },
  ],
  total: 2,
  page: 1,
  parPage: 20
};

const demoProduits = {
  items: [
    { id: 'PR-1', code: 'SRV-AUDIT', libelle: 'Audit conformite TEIF', description: 'Forfait audit', prixUnitaire: 2800, tauxTva: 19, unite: 'Forfait', type: 'Service', estActif: true, categorieId: 'CAT-1', categorieNom: 'Services & Conseil', entrepriseId: 'ENT-1', creeLe: '2026-02-10', modifieLe: '2026-03-10' },
    { id: 'PR-2', code: 'LIC-ERP', libelle: 'Licence ERP Cloud', description: 'Licence annuelle', prixUnitaire: 7200, tauxTva: 19, unite: 'Licence', type: 'Produit', estActif: true, categorieId: 'CAT-2', categorieNom: 'Produits informatiques', entrepriseId: 'ENT-1', creeLe: '2026-01-05', modifieLe: '2026-02-28' },
  ],
  total: 2,
  page: 1,
  parPage: 20
};

const demoCategories = [
  { id: 'CAT-1', nom: 'Services & Conseil', description: 'Prestations', estActive: true, nbProduits: 1, entrepriseId: 'ENT-1', creeLe: '2026-01-01' },
  { id: 'CAT-2', nom: 'Produits informatiques', description: 'Materiel et logiciels', estActive: true, nbProduits: 1, entrepriseId: 'ENT-1', creeLe: '2026-01-02' },
];

const demoUsers = [
  { id: 'USR-1', prenom: 'Nour', nom: 'Ben Ali', email: 'nour@entreprise.tn', role: 'Admin', statut: 'Actif', entrepriseId: 'ENT-1', derniereConnexion: '2026-03-24', deuxFAActif: false },
  { id: 'USR-2', prenom: 'Ines', nom: 'Trabelsi', email: 'ines@entreprise.tn', role: 'ResponsableFinancier', statut: 'Actif', entrepriseId: 'ENT-1', derniereConnexion: '2026-03-23', deuxFAActif: true },
];

const demoKpisFactures = {
  totalMois: 68,
  ...demoStats
};

const demoDashboard = {
  evolutionMensuelle: demoEvolutionMensuelle,
  kpisFinanciers: demoKpisFin,
  kpisFactures: demoKpisFactures,
  kpisConformite: demoKpisConformite,
  dernieresFactures: demoDernieresFactures,
  alertes: demoAlertes
};

const demoDashboardAdmin = {
  ...demoDashboard,
  entreprises: [
    { id: 'ENT-1', nom: 'Entreprise Alpha', nbUtilisateurs: 8, nbFactures: 420 },
    { id: 'ENT-2', nom: 'Startup Beta', nbUtilisateurs: 4, nbFactures: 120 },
  ]
};

export const demoDataInterceptor: HttpInterceptorFn = (req, next) => {
  if (!environment.demoMode) return next(req);

  const url = req.url;
  const method = req.method.toUpperCase();

  const response = (body: any) => of(new HttpResponse({ status: 200, body }));

  if (method === 'GET' && url.includes('/dashboard/admin')) return response(demoDashboardAdmin);
  if (method === 'GET' && url.includes('/dashboard')) return response(demoDashboard);
  if (method === 'GET' && url.includes('/factures/statistiques')) return response(demoStats);
  if (method === 'GET' && url.includes('/factures')) return response(demoFactures);
  if (method === 'GET' && url.includes('/clients')) return response(demoClients);
  if (method === 'GET' && url.includes('/produits')) return response(demoProduits);
  if (method === 'GET' && url.includes('/categories')) return response(demoCategories);
  if (method === 'GET' && url.includes('/utilisateurs')) return response(demoUsers);
  if (method === 'GET' && url.includes('/paiements')) return response({ items: [], total: 0, page: 1, parPage: 20 });
  if (method === 'GET' && url.includes('/entreprises')) return response([{ id: 'ENT-1', nom: 'Entreprise Alpha', matriculeFiscal: '1234567A/B/C/000' }]);

  if (['POST', 'PUT', 'DELETE'].includes(method) && url.includes(environment.apiUrl)) {
    return response({ message: 'OK (mode demo)' });
  }

  return next(req);
};

