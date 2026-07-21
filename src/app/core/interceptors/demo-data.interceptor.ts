import { HttpErrorResponse, HttpHeaders, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { balanceNct, COMPTES, JOURNAUX } from '../constants/pcg.constants';

type JsonObject = Record<string, any>;

type DemoDb = {
  entreprise: JsonObject;
  personnalisation: { id: string; entrepriseId: string; donnees: JsonObject; creeLe: string; modifieLe: string };
  clients: any[];
  categories: any[];
  produits: any[];
  factures: any[];
  paiements: any[];
  users: any[];
  taxes: any[];
  parametresFiscaux: any[];
  transactions: any[];
  demoRequests: any[];
  kycRequests: any[];
  auditLogs: any[];
  adminEntreprises: any[];
};

let DB: DemoDb | null = null;
let seq = 0;

function uid(prefix: string): string {
  seq += 1;
  return `${prefix}-${seq}`;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function iso(d: Date): string {
  return d.toISOString();
}

function toNum(v: string | null, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function toBool(v: string | null): boolean | undefined {
  if (v === null) return undefined;
  const s = String(v).trim().toLowerCase();
  if (['true', '1', 'yes', 'oui', 'y'].includes(s)) return true;
  if (['false', '0', 'no', 'non', 'n'].includes(s)) return false;
  return undefined;
}

function clone<T>(x: T): T {
  return JSON.parse(JSON.stringify(x));
}

function ok(body: any, headers?: HttpHeaders) {
  return of(new HttpResponse({ status: 200, body, headers }));
}

function okBlob(body: Blob, contentType: string, fileName?: string) {
  let headers = new HttpHeaders({ 'Content-Type': contentType });
  if (fileName) {
    headers = headers.set('Content-Disposition', `attachment; filename=\"${fileName}\"`);
  }
  return ok(body, headers);
}

function notFound(message: string) {
  return of(new HttpResponse({ status: 404, body: { message } }));
}

function conflict(body: JsonObject) {
  return throwError(() => new HttpErrorResponse({
    status: 409,
    statusText: 'Conflict',
    error: body
  }));
}

function parseApiUrl(fullUrl: string, apiBase: string) {
  const trimmedBase = apiBase.replace(/\/+$/, '');
  let rest = fullUrl.startsWith(trimmedBase) ? fullUrl.slice(trimmedBase.length) : fullUrl;
  if (!rest.startsWith('/')) rest = '/' + rest;
  const [path, queryString] = rest.split('?');
  const query = new URLSearchParams(queryString ?? '');
  return { path: path || '/', query };
}

function paginate<T>(items: T[], page: number, parPage: number) {
  const safeParPage = Math.max(1, Math.min(500, parPage || 20));
  const safePage = Math.max(1, page || 1);
  const start = (safePage - 1) * safeParPage;
  const slice = items.slice(start, start + safeParPage);
  return { items: slice, total: items.length, page: safePage, parPage: safeParPage };
}

function computeFactureTotals(lignes: any[]) {
  const ttc = (lignes ?? []).reduce((s, l) => s + Number(l?.montantTtc ?? 0), 0);
  const tva = (lignes ?? []).reduce((s, l) => s + Number(l?.montantTva ?? 0), 0);
  const ht = (lignes ?? []).reduce((s, l) => s + Number(l?.montantHt ?? 0), 0);
  return {
    totalHt: +ht.toFixed(3),
    totalTva: +tva.toFixed(3),
    totalTtc: +ttc.toFixed(3),
  };
}

function normalizeDocType(type: any): string {
  const value = String(type ?? 'Facture').trim();
  if (value === 'Proforma') return 'Devis';
  return value || 'Facture';
}

function docPrefix(type: string): string {
  if (type === 'Avoir') return 'AV';
  if (type === 'Devis') return 'DEV';
  if (type === 'Facture achat') return 'ACH';
  return 'FAC';
}

function round3(v: number): number {
  return +Number(v || 0).toFixed(3);
}

function activeFiscalParams(db: DemoDb) {
  return db.parametresFiscaux.filter((p: any) => p.estActif !== false);
}

function applyFiscalParams(db: DemoDb, doc: any) {
  const type = normalizeDocType(doc.typeFacture);
  const lines = doc.lignes ?? [];
  const totals = computeFactureTotals(lines);
  const params = activeFiscalParams(db);
  const timbre = params.find((p: any) =>
    String(p.libelle ?? '').toLowerCase().includes('timbre') &&
    (!Array.isArray(p.documentsCibles) || p.documentsCibles.length === 0 || p.documentsCibles.includes(type))
  );
  const rs = params.find((p: any) =>
    p.inclureRetenueSource ||
    String(p.libelle ?? '').toLowerCase().includes('retenue')
  );

  const timbreFiscal = !!(doc.timbreFiscal ?? (type === 'Facture' && totals.totalTtc >= 1000 && timbre));
  const montantTimbre = timbreFiscal ? Number(timbre?.valeur ?? 1) : 0;
  const appliquerRS = !!(doc.appliquerRS ?? doc.activerRetenue ?? false);
  const tauxRS = Number(doc.tauxRS ?? doc.tauxRetenue ?? (appliquerRS ? rs?.valeur : 0) ?? 0);
  const baseRS = appliquerRS ? Number(doc.baseRS ?? totals.totalHt) : 0;
  const montantRS = appliquerRS ? round3(baseRS * tauxRS / 100) : 0;
  const totalTtc = round3(totals.totalTtc + montantTimbre);
  const netAPayer = round3(Math.max(0, totalTtc - montantRS));

  Object.assign(doc, {
    ...totals,
    totalTtc,
    timbreFiscal,
    montantTimbre,
    appliquerRS,
    activerRetenue: appliquerRS,
    tauxRS,
    tauxRetenue: tauxRS,
    baseRS,
    montantRS,
    netAPayer,
    montantRestant: round3(Math.max(0, netAPayer - Number(doc.montantPaye ?? 0))),
  });
  return doc;
}

function pushHistory(doc: any, action: string, details?: string) {
  doc.historique = [
    ...(Array.isArray(doc.historique) ? doc.historique : []),
    { id: uid('HIS'), action, utilisateurNom: 'Demo', dateAction: iso(new Date()), details },
  ];
}

function refreshPaymentStatus(facture: any) {
  const due = Number(facture.netAPayer ?? facture.totalTtc ?? 0);
  const paid = Number(facture.montantPaye ?? 0);
  facture.montantRestant = round3(Math.max(0, due - paid));
  if (facture.montantRestant <= 0.001 && due > 0) {
    facture.statut = 'Payee';
  } else if (paid > 0) {
    facture.statut = 'PartiellementPayee';
  }
  facture.estEnRetard = facture.montantRestant > 0.001 && new Date(facture.dateEcheance).getTime() < Date.now();
}

function createAccountingEntries(kind: string, amount: number, vat: number, clientAccount: string, revenueAccount: string) {
  const ht = round3(Number(amount ?? 0) - Number(vat ?? 0));
  return [
    { compte: clientAccount, sens: kind === 'Avoir' ? 'credit' : 'debit', montant: round3(amount), libelle: kind === 'Avoir' ? 'Solde client diminue' : 'Creance client' },
    { compte: revenueAccount, sens: kind === 'Avoir' ? 'debit' : 'credit', montant: ht, libelle: kind === 'Avoir' ? 'Annulation produit' : 'Produit facture' },
    { compte: COMPTES.TVA_COLLECTEE, sens: kind === 'Avoir' ? 'debit' : 'credit', montant: round3(vat), libelle: kind === 'Avoir' ? 'TVA collectee annulee' : 'TVA collectee' },
  ].filter(e => e.montant > 0);
}

function createTransactionForDocument(db: DemoDb, doc: any, reason: string) {
  const type = doc.typeFacture === 'Facture achat' ? 'Sortie' : 'Entree';
  const transaction = {
    id: uid('TRX'),
    date: doc.dateEmission ?? iso(new Date()),
    libelle: `${reason} ${doc.numero}`,
    description: `${doc.typeFacture} liee automatiquement`,
    tiersId: doc.clientId,
    tiersNom: doc.clientNom,
    tiersType: type === 'Entree' ? 'Client' : 'Fournisseur',
    categorieId: type === 'Entree' ? 'TRCAT-1' : 'TRCAT-2',
    categorieNom: type === 'Entree' ? 'Ventes' : 'Achats',
    type,
    statut: doc.typeFacture === 'Facture achat' ? 'EnAttente' : 'Justifiee',
    statutJustificatif: 'Present',
    montant: Number(doc.netAPayer ?? doc.totalTtc ?? 0),
    devise: doc.devise ?? 'TND',
    compte: type === 'Entree' ? COMPTES.CLIENTS : COMPTES.FOURNISSEURS,
    documentLie: { id: uid('DOC'), fileName: `${doc.numero}.pdf`, contentType: 'application/pdf', sizeBytes: 0, url: '/EY.png' },
    factureId: doc.id,
    ecritures: createAccountingEntries(doc.typeFacture, Number(doc.netAPayer ?? doc.totalTtc ?? 0), Number(doc.totalTva ?? 0), type === 'Entree' ? COMPTES.CLIENTS : COMPTES.FOURNISSEURS, type === 'Entree' ? COMPTES.VENTES_MARCHANDISES : COMPTES.ACHATS_MARCHANDISES),
    splits: [],
    comments: [],
    activities: [{ id: uid('ACT'), authorName: 'Systeme', action: reason, description: 'Transaction generee depuis le cycle facture', createdAt: iso(new Date()) }],
    creeLe: iso(new Date()),
    modifieLe: iso(new Date()),
  };
  db.transactions.unshift(transaction);
  return transaction;
}

function computeStats(db: DemoDb) {
  const factures = db.factures.filter((f: any) => f.typeFacture === 'Facture');
  const by = (statut: string) => factures.filter((f: any) => f.statut === statut).length;
  const moisCourant = new Date().toISOString().slice(0, 7); // YYYY-MM
  const facturesMois = factures.filter((f: any) => String(f.dateEmission ?? '').slice(0, 7) === moisCourant);

  const montantTotalMois = facturesMois.reduce((s: number, f: any) => s + Number(f.totalTtc ?? 0), 0);
  const montantEncaisseMois = facturesMois.reduce((s: number, f: any) => s + Number(f.montantPaye ?? 0), 0);
  const montantEnAttente = Math.max(0, montantTotalMois - montantEncaisseMois);
  const totalConformes = by('Conforme');
  const tauxConformite = factures.length ? Math.round((totalConformes / factures.length) * 100) : 0;

  return {
    totalBrouillons: by('Brouillon'),
    totalValidees: by('Validee'),
    totalTransmises: by('Transmise'),
    totalAcceptees: by('Acceptee'),
    totalRejetees: by('Rejetee'),
    totalPayees: by('Payee'),
    totalEnRetard: factures.filter((f: any) => !!f.estEnRetard).length,
    montantTotalMois: Math.round(montantTotalMois),
    montantEncaisseMois: Math.round(montantEncaisseMois),
    montantEnAttente: Math.round(montantEnAttente),
    tauxConformite,
  };
}

function monthLabel(d: Date): string {
  const fr = ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aout', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${fr[d.getMonth()]} ${d.getFullYear()}`;
}

function pdfEscape(s: string): string {
  return String(s).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function buildSimplePdf(lines: string[]): Blob {
  const eol = '\r\n';
  const encoder = new TextEncoder();
  const safeLines = (lines?.length ? lines : ['Demo PDF']).slice(0, 18).map(l => String(l).slice(0, 120));

  const streamLines: string[] = [
    'BT',
    '/F1 20 Tf',
    '72 720 Td',
  ];
  for (const line of safeLines) {
    streamLines.push(`(${pdfEscape(line)}) Tj`);
    streamLines.push('0 -26 Td');
  }
  streamLines.push('ET');

  const streamData = streamLines.join(eol); // no trailing EOL -> the EOL before endstream is not counted in /Length
  const streamLen = encoder.encode(streamData).length;

  const objects: Array<{ id: number; content: string }> = [
    { id: 1, content: `<< /Type /Catalog /Pages 2 0 R >>` },
    { id: 2, content: `<< /Type /Pages /Kids [3 0 R] /Count 1 >>` },
    {
      id: 3,
      content: `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>`,
    },
    {
      id: 4,
      content: `<< /Length ${streamLen} >>${eol}stream${eol}${streamData}${eol}endstream`,
    },
    { id: 5, content: `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>` },
  ];

  let pdf = `%PDF-1.4${eol}`;
  const offsets: number[] = [0];

  for (const obj of objects) {
    offsets[obj.id] = encoder.encode(pdf).length;
    pdf += `${obj.id} 0 obj${eol}${obj.content}${eol}endobj${eol}`;
  }

  const xrefOffset = encoder.encode(pdf).length;
  const size = objects.length + 1;

  pdf += `xref${eol}`;
  pdf += `0 ${size}${eol}`;
  pdf += `0000000000 65535 f${eol}`;

  for (let i = 1; i < size; i++) {
    const off = offsets[i] ?? 0;
    pdf += `${String(off).padStart(10, '0')} 00000 n${eol}`;
  }

  pdf += `trailer${eol}`;
  pdf += `<< /Size ${size} /Root 1 0 R >>${eol}`;
  pdf += `startxref${eol}`;
  pdf += `${xrefOffset}${eol}`;
  pdf += `%%EOF${eol}`;

  return new Blob([encoder.encode(pdf)], { type: 'application/pdf' });
}

function buildXmlForFacture(f: any): string {
  const num = f?.numero ?? 'FAC-DEMO';
  const total = Number(f?.totalTtc ?? 0).toFixed(3);
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<TeifInvoice version="${f?.versionTeif ?? 'v1.8.8'}">`,
    `  <Number>${num}</Number>`,
    `  <IssueDate>${String(f?.dateEmission ?? '').slice(0, 10)}</IssueDate>`,
    `  <Customer>${(f?.clientNom ?? '').replace(/[<>&]/g, '')}</Customer>`,
    `  <TotalTTC currency="${f?.devise ?? 'TND'}">${total}</TotalTTC>`,
    `</TeifInvoice>`,
  ].join('\n');
}

function ensureDb(): DemoDb {
  if (DB) return DB;

  const now = new Date();
  const isoNow = iso(now);
  const entrepriseId = 'ENT-1';

  const categories = [
    { id: 'CAT-1', nom: 'Services', description: 'Prestations & Conseil', estActive: true, nbProduits: 0, entrepriseId, creeLe: '2026-01-02' },
    { id: 'CAT-2', nom: 'Logiciels', description: 'Licences & SaaS', estActive: true, nbProduits: 0, entrepriseId, creeLe: '2026-01-02' },
    { id: 'CAT-3', nom: 'Materiel', description: 'Equipements informatiques', estActive: true, nbProduits: 0, entrepriseId, creeLe: '2026-01-05' },
    { id: 'CAT-4', nom: 'Abonnements', description: 'Forfaits mensuels', estActive: true, nbProduits: 0, entrepriseId, creeLe: '2026-01-12' },
    { id: 'CAT-5', nom: 'Formation', description: 'Sessions & ateliers', estActive: true, nbProduits: 0, entrepriseId, creeLe: '2026-02-01' },
    { id: 'CAT-6', nom: 'Frais', description: 'Frais et divers', estActive: true, nbProduits: 0, entrepriseId, creeLe: '2026-02-18' },
  ];

  const clients = [
    { id: 'CL-1', nom: 'STE GreenTech', email: 'contact@greentech.tn', typeClient: 'Entreprise', matriculeFiscal: '1234567A/B/C/000', adresse: 'Rue du Lac', ville: 'Tunis', codePostal: '1053', pays: 'TN', telephone: '+216 20 111 222', estActif: true, creeLe: '2026-01-12', modifieLe: '2026-03-01', entrepriseId },
    { id: 'CL-2', nom: 'Banque BIAT', email: 'achats@biat.com', typeClient: 'Entreprise', matriculeFiscal: '7654321B/C/D/000', adresse: 'Lac 2', ville: 'Tunis', codePostal: '1053', pays: 'TN', telephone: '+216 71 123 456', estActif: true, creeLe: '2026-02-02', modifieLe: '2026-03-03', entrepriseId },
    { id: 'CL-3', nom: 'Societe OneTel', email: 'billing@onetel.tn', typeClient: 'Entreprise', matriculeFiscal: '2468135E/F/G/000', adresse: 'Centre Ville', ville: 'Sousse', codePostal: '4000', pays: 'TN', telephone: '+216 73 555 444', estActif: true, creeLe: '2026-02-18', modifieLe: '2026-03-10', entrepriseId },
    { id: 'CL-4', nom: 'SARL MedCare', email: 'contact@medcare.tn', typeClient: 'Entreprise', matriculeFiscal: '1357924H/I/J/000', adresse: 'Ariana', ville: 'Ariana', codePostal: '2080', pays: 'TN', telephone: '+216 26 310 210', estActif: true, creeLe: '2026-01-21', modifieLe: '2026-03-14', entrepriseId },
    { id: 'CL-5', nom: 'ABC Distribution', email: 'ap@abc.tn', typeClient: 'Entreprise', matriculeFiscal: '9876543X/Y/Z/000', adresse: 'Zone Industrielle', ville: 'Sfax', codePostal: '3000', pays: 'TN', telephone: '+216 74 222 333', estActif: true, creeLe: '2026-01-09', modifieLe: '2026-03-22', entrepriseId },
    { id: 'CL-6', nom: 'Maison du Papier', email: 'commande@papier.tn', typeClient: 'Entreprise', matriculeFiscal: '1122334K/L/M/000', adresse: 'Ben Arous', ville: 'Ben Arous', codePostal: '2013', pays: 'TN', telephone: '+216 55 100 101', estActif: true, creeLe: '2026-02-05', modifieLe: '2026-03-27', entrepriseId },
    { id: 'CL-7', nom: 'Client Particulier', email: 'particulier@example.com', typeClient: 'Particulier', matriculeFiscal: undefined, adresse: 'Tunis', ville: 'Tunis', codePostal: '1002', pays: 'TN', telephone: '+216 22 000 111', estActif: true, creeLe: '2026-03-02', modifieLe: '2026-03-02', entrepriseId },
  ];

  const produits = [
    { id: 'PR-1', code: 'SRV-AUDIT', libelle: 'Audit conformite TEIF', description: 'Forfait audit complet', prixUnitaire: 2800, tauxTva: 19, unite: 'Forfait', type: 'Service', estActif: true, categorieId: 'CAT-1', categorieNom: 'Services', entrepriseId, creeLe: '2026-02-10', modifieLe: '2026-03-10' },
    { id: 'PR-2', code: 'LIC-ERP', libelle: 'Licence ERP Cloud (annuelle)', description: 'Licence annuelle', prixUnitaire: 7200, tauxTva: 19, unite: 'Licence', type: 'Produit', estActif: true, categorieId: 'CAT-2', categorieNom: 'Logiciels', entrepriseId, creeLe: '2026-01-05', modifieLe: '2026-02-28' },
    { id: 'PR-3', code: 'SRV-SUP', libelle: 'Support Premium (mensuel)', description: 'Support + SLA 4h', prixUnitaire: 450, tauxTva: 19, unite: 'Mois', type: 'Service', estActif: true, categorieId: 'CAT-4', categorieNom: 'Abonnements', entrepriseId, creeLe: '2026-01-08', modifieLe: '2026-03-01' },
    { id: 'PR-4', code: 'MAT-SCN', libelle: 'Scanner A4', description: 'Scanner de bureau', prixUnitaire: 390, tauxTva: 19, unite: 'U', type: 'Produit', estActif: true, categorieId: 'CAT-3', categorieNom: 'Materiel', entrepriseId, creeLe: '2026-02-11', modifieLe: '2026-03-11' },
    { id: 'PR-5', code: 'FRM-TEIF', libelle: 'Formation TEIF (1 jour)', description: 'Formation pour equipe comptable', prixUnitaire: 1200, tauxTva: 19, unite: 'Jour', type: 'Service', estActif: true, categorieId: 'CAT-5', categorieNom: 'Formation', entrepriseId, creeLe: '2026-02-03', modifieLe: '2026-03-12' },
    { id: 'PR-6', code: 'SRV-IMP', libelle: 'Implementation & Parametrage', description: 'Mise en place initiale', prixUnitaire: 3500, tauxTva: 19, unite: 'Forfait', type: 'Service', estActif: true, categorieId: 'CAT-1', categorieNom: 'Services', entrepriseId, creeLe: '2026-01-15', modifieLe: '2026-03-02' },
  ];

  const users = [
    { id: 'USR-1', prenom: 'Demo', nom: 'SuperAdmin', email: 'demo.admin@eyinvoice.tn', role: 'SuperAdmin', statut: 'Actif', entrepriseId: null, derniereConnexion: isoNow, deuxFAActif: true, alerteConnexion: true },
    { id: 'USR-2', prenom: 'Ines', nom: 'Trabelsi', email: 'ines@entreprise.tn', role: 'ResponsableFinancier', statut: 'Actif', entrepriseId, derniereConnexion: '2026-04-29T08:10:00', deuxFAActif: true, alerteConnexion: false },
    { id: 'USR-3', prenom: 'Nour', nom: 'Ben Ali', email: 'nour@entreprise.tn', role: 'Admin', statut: 'Actif', entrepriseId, derniereConnexion: '2026-04-28T17:40:00', deuxFAActif: false, alerteConnexion: true },
  ];

  const taxes = [
    { id: 'TX-TVA-0', entrepriseId, titre: 'TVA 0%', taux: 0, type: 'Tva', codeTEIF: 'Z', dateEffet: '2026-01-01', estActif: true, nombreUtilisations: 0, description: 'Exonération / export', creeLe: '2026-01-01', modifieLe: '2026-01-01' },
    { id: 'TX-TVA-7', entrepriseId, titre: 'TVA 7%', taux: 7, type: 'Tva', codeTEIF: 'S', dateEffet: '2026-01-01', estActif: true, nombreUtilisations: 2, description: 'Taux réduit', creeLe: '2026-01-01', modifieLe: '2026-01-01' },
    { id: 'TX-TVA-13', entrepriseId, titre: 'TVA 13%', taux: 13, type: 'Tva', codeTEIF: 'S', dateEffet: '2026-01-01', estActif: true, nombreUtilisations: 1, description: 'Taux intermédiaire', creeLe: '2026-01-01', modifieLe: '2026-01-01' },
    { id: 'TX-TVA-19', entrepriseId, titre: 'TVA 19%', taux: 19, type: 'Tva', codeTEIF: 'S', dateEffet: '2026-01-01', estActif: true, nombreUtilisations: 4, description: 'Taux normal', creeLe: '2026-01-01', modifieLe: '2026-01-01' },
    { id: 'TX-2', entrepriseId, titre: 'FODEC 1%', taux: 1, type: 'Fodec', codeTEIF: 'O', dateEffet: '2026-01-01', estActif: true, nombreUtilisations: 0, description: 'FODEC', creeLe: '2026-01-01', modifieLe: '2026-01-01' },
    { id: 'TX-3', entrepriseId, titre: 'Droit de consommation 10%', taux: 10, type: 'DroitConsommation', codeTEIF: 'O', dateEffet: '2026-01-01', estActif: false, nombreUtilisations: 0, description: 'Droit', creeLe: '2026-01-01', modifieLe: '2026-01-01' },
  ];

  const parametresFiscaux = [
    { id: 'PF-1', entrepriseId, libelle: 'Timbre fiscal', valeur: 1, type: 'Fixe', signe: 'Positif', ordreCalcul: 'ApresTva', utilisation: 'Auto', codeDGI: 'TF-001', typeFournisseur: 'Tous', seuilMinimum: 1000, dateEffet: '2026-01-01', inclureRetenueSource: false, inclureRS: false, documentsCibles: ['Facture'], nombreUtilisations: 6, estActif: true, creeLe: '2026-01-02', modifieLe: '2026-03-01' },
    { id: 'PF-2', entrepriseId, libelle: 'Retenue à la source 1,5%', valeur: 1.5, type: 'Pourcentage', signe: 'Negatif', ordreCalcul: 'AvantTva', utilisation: 'Manuel', codeDGI: 'RS-1.5-SERVICES', typeFournisseur: 'PersonneMorale', seuilMinimum: 1000, dateEffet: '2026-01-01', inclureRetenueSource: true, inclureRS: true, documentsCibles: ['Facture', 'Avoir'], nombreUtilisations: 8, estActif: true, creeLe: '2026-01-02', modifieLe: '2026-03-01' },
    { id: 'PF-3', entrepriseId, libelle: 'Retenue à la source 3%', valeur: 3, type: 'Pourcentage', signe: 'Negatif', ordreCalcul: 'AvantTva', utilisation: 'Auto', codeDGI: 'RS-3-MARCHES', typeFournisseur: 'Tous', seuilMinimum: 1000, dateEffet: '2026-02-01', inclureRetenueSource: true, inclureRS: true, documentsCibles: ['Facture', 'FactureFournisseur'], nombreUtilisations: 2, estActif: true, creeLe: '2026-02-01', modifieLe: '2026-03-01' },
    { id: 'PF-4', entrepriseId, libelle: 'Frais fixe dossier fiscal', valeur: 30, type: 'Fixe', signe: 'Positif', ordreCalcul: 'ApresTva', utilisation: 'Manuel', codeDGI: 'FRAIS-DOSSIER-30', typeFournisseur: 'Tous', seuilMinimum: null, dateEffet: '2026-03-15', inclureRetenueSource: false, inclureRS: false, documentsCibles: ['Facture', 'BonCommande'], nombreUtilisations: 0, estActif: false, creeLe: '2026-03-15', modifieLe: '2026-03-20' },
  ];

  // Factures / Devis / Avoirs
  const statuts = ['Brouillon', 'Validee', 'Conforme', 'Transmise', 'Acceptee', 'Rejetee', 'Payee'] as const;
  const factures: any[] = [];
  const baseDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 5));

  function addFacture(i: number, typeFacture: string) {
    const client = clients[i % clients.length];
    const statut = statuts[i % statuts.length];
    const dateEmission = new Date(baseDate.getTime() + i * 24 * 3600 * 1000 * 2);
    const dateEcheance = new Date(dateEmission.getTime() + 30 * 24 * 3600 * 1000);
    const produit = produits[i % produits.length];

    const qte = 1 + (i % 4);
    const brut = qte * Number(produit.prixUnitaire);
    const ht = brut;
    const tva = ht * (Number(produit.tauxTva) / 100);
    const ttc = ht + tva;

    const lignes = [
      {
        id: uid('LIG'),
        ordre: 1,
        designation: produit.libelle,
        description: produit.description,
        unite: produit.unite,
        quantite: qte,
        prixUnitaire: produit.prixUnitaire,
        tauxRemise: 0,
        tauxTva: produit.tauxTva,
        montantHt: +ht.toFixed(3),
        montantRemise: 0,
        montantTva: +tva.toFixed(3),
        montantTtc: +ttc.toFixed(3),
        produitId: produit.id,
      },
    ];

    const totals = computeFactureTotals(lignes);
    const estPayee = statut === 'Payee';
    const datePaiement = estPayee ? new Date(dateEmission.getTime() + 8 * 24 * 3600 * 1000) : null;
    const nowDate = new Date();
    const estEnRetard = !estPayee && dateEcheance.getTime() < nowDate.getTime() && (statut === 'Transmise' || statut === 'Acceptee');

    const id = uid('FAC');
    const docType = normalizeDocType(typeFacture);
    const numeroPrefix = docPrefix(docType);

    const facture = {
      id,
      numero: `${numeroPrefix}-${dateEmission.getUTCFullYear()}-${String(1000 + i).slice(-4)}`,
      clientId: client.id,
      clientNom: client.nom,
      clientMatriculeFiscal: client.matriculeFiscal,
      reference: i % 5 === 0 ? `PO-${dateEmission.getUTCFullYear()}-${100 + i}` : '',
      statut,
      typeFacture: docType,
      typeVente: 'Local',
      modePaiement: ['Virement', 'Cheque', 'Especes'][i % 3],
      devise: 'TND',
      dateEmission: iso(dateEmission),
      dateEcheance: iso(dateEcheance),
      datePaiement: datePaiement ? iso(datePaiement) : null,
      ...totals,
      montantPaye: estPayee ? totals.totalTtc : 0,
      montantRestant: estPayee ? 0 : totals.totalTtc,
      estEnRetard,
      notes: i % 7 === 0 ? 'Merci pour votre confiance.' : '',
      conditionsPaiement: '30 jours',
      xmlGenere: statut === 'Conforme' || statut === 'Transmise' || statut === 'Acceptee' || statut === 'Payee',
      versionTeif: 'v1.8.8',
      lignes,
      historique: [],
      textLibre: '',
      titre: '',
      description: '',
      remiseGlobale: 0,
      timbreFiscal: i % 9 === 0,
      afficherMfClient: true,
      afficherIban: false,
      activerRetenue: i % 11 === 0,
      tauxRetenue: 1.5,
      delaiPaiement: 30,
      etablissement: 'BIAT - Tunis',
      iban: 'TN59 1000 0000 0000 0000 0000',
      bic: 'BIATTNTT',
      creeLe: isoNow,
      modifieLe: isoNow,
    };

    applyFiscalParams({ parametresFiscaux } as DemoDb, facture);
    refreshPaymentStatus(facture);
    factures.push(facture);
  }

  // Seed more "Facture" docs, plus separate Avoir/Proforma/Devis for their pages.
  for (let i = 0; i < 60; i++) addFacture(i, 'Facture');
  for (let i = 60; i < 80; i++) addFacture(i, 'Devis');
  for (let i = 80; i < 95; i++) addFacture(i, 'Avoir');
  for (let i = 95; i < 110; i++) addFacture(i, 'Devis');

  // Paiements derived from paid invoices.
  const paiements: any[] = factures
    .filter(f => f.typeFacture === 'Facture' && f.statut === 'Payee')
    .slice(0, 30)
    .map((f, idx) => ({
      id: uid('PAY'),
      factureId: f.id,
      factureNumero: f.numero,
      montant: f.totalTtc,
      devise: f.devise,
      mode: f.modePaiement,
      reference: `VIR-${String(10000 + idx)}`,
      banque: 'BIAT',
      datePaiement: f.datePaiement ?? f.dateEmission,
      creeLe: isoNow,
    }));

  // Transactions: mix of entries and expenses.
  const transactions: any[] = [];
  const transactionCategories = [
    { id: 'TRCAT-1', nom: 'Ventes', type: 'Entree' },
    { id: 'TRCAT-2', nom: 'Achats', type: 'Sortie' },
    { id: 'TRCAT-3', nom: 'Salaires', type: 'Sortie' },
    { id: 'TRCAT-4', nom: 'Frais bancaires', type: 'Sortie' },
    { id: 'TRCAT-5', nom: 'Marketing', type: 'Sortie' },
  ];

  for (let i = 0; i < 120; i++) {
    const d = new Date(baseDate.getTime() + i * 24 * 3600 * 1000);
    const cat = transactionCategories[i % transactionCategories.length];
    const type = cat.type;
    const statut = (['NonJustifiee', 'EnAttente', 'Justifiee'] as const)[i % 3];
    const montant = type === 'Entree' ? 100 + (i % 15) * 80 : 50 + (i % 18) * 55;
    const relatedInvoice = i % 6 === 0 ? factures.find(f => f.typeFacture === 'Facture') : null;
    transactions.push({
      id: uid('TRX'),
      date: iso(d),
      libelle: type === 'Entree' ? `Encaissement ${cat.nom}` : `Depense ${cat.nom}`,
      description: i % 5 === 0 ? 'Piece justificative a completer' : null,
      tiersId: null,
      tiersNom: i % 4 === 0 ? (type === 'Entree' ? clients[i % clients.length].nom : 'Fournisseur Demo') : null,
      tiersType: i % 4 === 0 ? (type === 'Entree' ? 'Client' : 'Fournisseur') : null,
      categorieId: cat.id,
      categorieNom: cat.nom,
      type,
      statut,
      statutJustificatif: statut === 'Justifiee' ? 'Present' : (i % 2 === 0 ? 'Facultatif' : 'Perdu'),
      montant,
      devise: 'TND',
      compte: type === 'Entree' ? '512000' : '401000',
      documentLie: null,
      factureId: relatedInvoice?.id ?? null,
      splits: [],
      comments: [],
      creeLe: isoNow,
      modifieLe: isoNow,
    });
  }

  for (let i = 0; i < 8; i++) {
    const fournisseur = ['STE Fournitures Plus', 'Bureau Services TN', 'Logistique Sahel', 'Cloud Tunisie'][i % 4];
    const date = new Date(now.getTime() - i * 3 * 864e5);
    const montant = 240 + i * 135.5;
    const tva = round3(montant * 0.19 / 1.19);
    transactions.unshift({
      id: uid('OCR'),
      entrepriseId,
      source: 'MobileApp',
      date: iso(date),
      libelle: `OCR facture fournisseur ${fournisseur}`,
      description: 'Document scanne depuis mobile, pret a creer facture achat et transaction',
      tiersId: null,
      tiersNom: fournisseur,
      tiersType: 'Fournisseur',
      fournisseurId: null,
      fournisseurMatriculeFiscal: `MF-${1000 + i}/A/M/000`,
      documentType: i % 3 === 0 ? 'Bon de livraison' : 'Facture achat',
      ocrOverallConfidence: i % 4 === 0 ? 0.68 : 0.91,
      categorieId: 'TRCAT-2',
      categorieNom: 'Achats',
      type: 'Sortie',
      statut: i % 4 === 0 ? 'EnAttente' : 'NonJustifiee',
      statutJustificatif: 'Present',
      montant: round3(montant),
      devise: 'TND',
      compte: '401000',
      documentLie: { id: uid('DOC'), fileName: `scan-${i + 1}.jpg`, contentType: 'image/jpeg', sizeBytes: 420000 + i * 1000, url: '/EY.png' },
      factureId: null,
      reviewFields: [
        { key: 'supplierName', label: 'Fournisseur', value: fournisseur, confidence: 0.94, required: true, requiresReview: false },
        { key: 'invoiceDate', label: 'Date facture', value: date.toISOString().slice(0, 10), confidence: 0.89, required: true, requiresReview: false },
        { key: 'totalTtc', label: 'Total TTC', value: String(round3(montant)), confidence: 0.92, required: true, requiresReview: false },
        { key: 'vatAmount', label: 'TVA deductible', value: String(tva), confidence: 0.87, required: true, requiresReview: i % 4 === 0 },
      ],
      missingFieldKeys: i % 4 === 0 ? ['vatAmount'] : [],
      allocations: [{ id: uid('ALL'), categoryName: 'Achats', percentage: 100, amount: round3(montant) }],
      comments: [],
      activities: [{ id: uid('ACT'), authorName: 'OCR', action: 'Extraction', description: 'Champs extraits automatiquement', createdAt: iso(date) }],
      bankMatch: null,
      accountingPeriodLabel: monthLabel(date),
      recoverableVatAmount: tva,
      recoverableVatRate: 19,
      creeLe: iso(date),
      modifieLe: iso(date),
    });
  }

  const entreprise = {
    id: entrepriseId,
    raisonSociale: 'Entreprise Alpha SARL',
    nomCommercial: 'Alpha',
    forme: 'SARL',
    capital: '50 000',
    dateCreation: '2021-04-12',
    activiteCode: '6201Z',
    adresse: '10 Rue du Lac',
    codePostal: '1053',
    gouvernorat: 'Tunis',
    pays: 'Tunisie',
    telephone: '+216 71 000 111',
    fax: '',
    email: 'contact@alpha.tn',
    siteWeb: 'https://alpha.tn',
    matriculeFiscal: '1234567A/B/C/000',
    numRNE: 'TN-2021-000123',
    regimeTVA: 'Regime reel',
    tauxTVAPrincipal: 19,
    teifSignature: true,
    teifArchivage: true,
    teifHorodatage: false,
    teifSandbox: true,
    teifSurveille: false,
    logoUrl: '/EY.png',
  };

  const personnalisationDonnees = {
    pdf: {
      logoUrl: '/EY.png',
      options: {
        showLogo: true,
      },
    },
  };

  const demoRequests = [
    {
      id: '3c8f9eb6-8f8b-4b2f-b32e-7e6f4ae1f001',
      firstName: 'Ahmed',
      lastName: 'Ben Salem',
      email: 'ahmed.bensalem@example.com',
      company: 'TechCorp Tunisia',
      phone: '+216 20 123 456',
      message: 'Interesse par une demo complete de la plateforme',
      preferredDate: '2026-05-15',
      preferredTime: '10:00',
      status: 'pending',
      createdAt: '2026-04-29T14:30:00',
    },
    {
      id: '3c8f9eb6-8f8b-4b2f-b32e-7e6f4ae1f002',
      firstName: 'Fatma',
      lastName: 'Trabelsi',
      email: 'f.trabelsi@innovate.tn',
      company: 'Innovate Solutions',
      phone: '+216 98 765 432',
      message: "Besoin d'une presentation pour notre equipe comptable",
      preferredDate: '2026-05-10',
      preferredTime: '14:00',
      status: 'confirmed',
      createdAt: '2026-04-28T09:15:00',
    },
    {
      id: '3c8f9eb6-8f8b-4b2f-b32e-7e6f4ae1f003',
      firstName: 'Mohamed',
      lastName: 'Gharbi',
      email: 'mohamed.gharbi@startup.tn',
      company: 'StartUp Innovante',
      phone: '+216 55 444 333',
      preferredDate: '2026-05-05',
      preferredTime: '11:00',
      status: 'completed',
      createdAt: '2026-04-20T16:45:00',
    }
  ];

  const kycRequests = [
    {
      id: 'KYC-1',
      raisonSociale: 'SOLARIS INDUSTRIES',
      matriculeFiscal: '8765432Z/Y/X/000',
      formeJuridique: 'SA',
      nomEntreprise: 'SOLARIS',
      adresse: 'Zone industrielle, Tunis',
      gouvernorat: 'Tunis',
      codePostal: '1002',
      devisePrincipale: 'TND',
      siteWeb: 'https://solaris.tn',
      email: 'contact@solaris.tn',
      telephone: '+216 71 555 000',
      telEntreprise: '+216 71 555 001',
      respPrenom: 'Sami',
      respNom: 'Jebali',
      respEmail: 's.jebali@solaris.tn',
      respFonction: 'DAF',
      statut: 'EnAttente',
      score: 72,
      decision: 'RevisionManuelle',
      flags: [
        { code: 'MF_MISMATCH', message: 'Matricule fiscal: divergence OCR/Formulaire', severity: 'Warning' },
        { code: 'RIB_MISSING', message: 'RIB non fourni', severity: 'Error' },
      ],
      scoreBreakdown: [],
      comparisons: [],
      ocr: { ocrSuccess: true, confidenceScore: 0.82, typeDocument: 'Registre commerce', kycScore: 72 },
      createdAt: '2026-04-26T10:15:00',
      documents: {
        registreCommerce: 'assets/codex-preview/demande-acces-visual-demo.html',
        patente: 'assets/codex-preview/demande-acces-visual-demo.html',
        cinResponsable: 'assets/codex-preview/demande-acces-visual-demo.html',
        rib: 'assets/codex-preview/demande-acces-visual-demo.html',
      },
    },
    {
      id: 'KYC-2',
      raisonSociale: 'MEDCARE SARL',
      matriculeFiscal: '1357924H/I/J/000',
      formeJuridique: 'SARL',
      nomEntreprise: 'MEDCARE',
      adresse: 'Ariana',
      gouvernorat: 'Ariana',
      codePostal: '2080',
      devisePrincipale: 'TND',
      siteWeb: 'https://medcare.tn',
      email: 'admin@medcare.tn',
      telephone: '+216 26 310 210',
      telEntreprise: '+216 26 310 211',
      respPrenom: 'Nadia',
      respNom: 'Mansour',
      respEmail: 'n.mansour@medcare.tn',
      respFonction: 'Gerante',
      statut: 'Accepte',
      score: 91,
      decision: 'AutoApprovalCandidate',
      flags: [],
      scoreBreakdown: [],
      comparisons: [],
      ocr: { ocrSuccess: true, confidenceScore: 0.93, typeDocument: 'Patente', kycScore: 91 },
      createdAt: '2026-04-18T09:00:00',
      documents: {
        registreCommerce: 'assets/codex-preview/demande-acces-visual-demo.html',
        patente: 'assets/codex-preview/demande-acces-visual-demo.html',
        cinResponsable: 'assets/codex-preview/demande-acces-visual-demo.html',
        rib: 'assets/codex-preview/demande-acces-visual-demo.html',
      },
    }
  ];

  const auditLogs = Array.from({ length: 28 }).map((_, i) => {
    const d = new Date(now.getTime() - i * 6 * 3600 * 1000);
    return {
      date: iso(d),
      utilisateur: i % 3 === 0 ? 'demo.admin@eyinvoice.tn' : 'ines@entreprise.tn',
      action: ['Connexion', 'Export Excel', 'Mise a jour facture', 'Creation client'][i % 4],
      ressource: ['Auth', 'Factures', 'Clients', 'Rapports'][i % 4],
      ip: `197.0.0.${10 + i}`,
      succes: i % 11 !== 0,
    };
  });

  const adminEntreprises = [
    { id: 'ENT-1', raisonSociale: 'Entreprise Alpha SARL', matriculeFiscal: '1234567A/B/C/000', ville: 'Tunis', nbUtilisateurs: 8, nbFactures: 420, estActive: true },
    { id: 'ENT-2', raisonSociale: 'Startup Beta', matriculeFiscal: '2233445D/E/F/000', ville: 'Sousse', nbUtilisateurs: 4, nbFactures: 120, estActive: true },
    { id: 'ENT-3', raisonSociale: 'Gamma Trading', matriculeFiscal: '3344556G/H/I/000', ville: 'Sfax', nbUtilisateurs: 2, nbFactures: 44, estActive: false },
  ];

  categories.forEach(c => {
    c.nbProduits = produits.filter(p => p.categorieId === c.id).length;
  });

  DB = {
    entreprise,
    personnalisation: { id: 'PERS-1', entrepriseId, donnees: personnalisationDonnees, creeLe: '2026-02-01', modifieLe: isoNow },
    clients,
    categories,
    produits,
    factures,
    paiements,
    users,
    taxes,
    parametresFiscaux,
    transactions,
    demoRequests,
    kycRequests,
    auditLogs,
    adminEntreprises,
  };

  return DB;
}

function listFactures(db: DemoDb, query: URLSearchParams) {
  const page = toNum(query.get('page'), 1);
  const parPage = toNum(query.get('parPage'), 20);
  const requestedType = query.get('typeFacture')?.trim() || 'Facture';
  const typeFacture = normalizeDocType(requestedType);
  const statut = query.get('statut')?.trim() || '';
  const recherche = query.get('recherche')?.trim().toLowerCase() || '';
  const clientId = query.get('clientId')?.trim() || '';
  const dateDebut = query.get('dateDebut')?.trim() || '';
  const dateFin = query.get('dateFin')?.trim() || '';

  let items = db.factures.filter((f: any) => (typeFacture ? normalizeDocType(f.typeFacture) === typeFacture : true));
  if (statut) items = items.filter((f: any) => f.statut === statut);
  if (clientId) items = items.filter((f: any) => f.clientId === clientId);
  if (dateDebut) items = items.filter((f: any) => String(f.dateEmission ?? '').slice(0, 10) >= dateDebut);
  if (dateFin) items = items.filter((f: any) => String(f.dateEmission ?? '').slice(0, 10) <= dateFin);
  if (recherche) items = items.filter((f: any) =>
    String(f.numero ?? '').toLowerCase().includes(recherche) ||
    String(f.clientNom ?? '').toLowerCase().includes(recherche) ||
    String(f.reference ?? '').toLowerCase().includes(recherche)
  );

  items = items.slice().sort((a: any, b: any) => String(b.dateEmission).localeCompare(String(a.dateEmission)));
  return paginate(items, page, parPage);
}

function listClients(db: DemoDb, query: URLSearchParams) {
  const page = toNum(query.get('page'), 1);
  const parPage = toNum(query.get('parPage'), 20);
  const actifSeulement = toBool(query.get('actifSeulement'));

  let items = db.clients.map((c: any) => {
    const docs = db.factures.filter((f: any) => f.clientId === c.id);
    const solde = docs.reduce((s: number, f: any) => s + (normalizeDocType(f.typeFacture) === 'Avoir' ? -1 : 1) * Number(f.montantRestant ?? 0), 0);
    const retards = docs.filter((f: any) => f.estEnRetard).length;
    return {
      ...c,
      solde: round3(solde),
      nbFactures: docs.filter((f: any) => normalizeDocType(f.typeFacture) === 'Facture').length,
      nbRetards: retards,
      risqueRetard: retards >= 2 ? 'Eleve' : retards === 1 ? 'Moyen' : 'Faible',
      dernierPaiement: db.paiements.filter((p: any) => docs.some((f: any) => f.id === p.factureId)).sort((a: any, b: any) => String(b.datePaiement).localeCompare(String(a.datePaiement)))[0]?.datePaiement ?? null,
    };
  });
  if (actifSeulement === true) items = items.filter((c: any) => c.estActif !== false);
  if (actifSeulement === false) items = items.filter((c: any) => c.estActif === false);
  items.sort((a: any, b: any) => a.nom.localeCompare(b.nom));

  return paginate(items, page, parPage);
}

function listProduits(db: DemoDb, query: URLSearchParams) {
  const page = toNum(query.get('page'), 1);
  const parPage = toNum(query.get('parPage'), 20);
  const categorieId = query.get('categorieId')?.trim() || '';
  const actifSeulement = toBool(query.get('actifSeulement'));

  let items = db.produits.slice();
  if (categorieId) items = items.filter((p: any) => p.categorieId === categorieId);
  if (actifSeulement === true) items = items.filter((p: any) => p.estActif !== false);
  if (actifSeulement === false) items = items.filter((p: any) => p.estActif === false);
  items.sort((a: any, b: any) => a.libelle.localeCompare(b.libelle));

  return paginate(items, page, parPage);
}

function computeTransactionCounters(items: any[]) {
  const sum = (statut: string) => {
    const rows = items.filter((t: any) => t.statut === statut);
    return {
      count: rows.length,
      montant: rows.reduce((s: number, t: any) => s + Number(t.montant ?? 0), 0),
    };
  };
  const non = sum('NonJustifiee');
  const en = sum('EnAttente');
  const jus = sum('Justifiee');
  return {
    nonJustifieeCount: non.count,
    nonJustifieeMontant: non.montant,
    enAttenteCount: en.count,
    enAttenteMontant: en.montant,
    justifieeCount: jus.count,
    justifieeMontant: jus.montant,
  };
}

function listTransactions(db: DemoDb, query: URLSearchParams) {
  const page = toNum(query.get('page'), 1);
  const parPage = toNum(query.get('parPage'), 20);
  const recherche = query.get('recherche')?.trim().toLowerCase() || '';
  const statut = query.get('statut')?.trim() || '';
  const type = query.get('type')?.trim() || '';
  const dateDebut = query.get('dateDebut')?.trim() || '';
  const dateFin = query.get('dateFin')?.trim() || '';

  let items = db.transactions.slice();
  if (recherche) {
    items = items.filter((t: any) =>
      String(t.libelle ?? '').toLowerCase().includes(recherche) ||
      String(t.tiersNom ?? '').toLowerCase().includes(recherche) ||
      String(t.categorieNom ?? '').toLowerCase().includes(recherche)
    );
  }
  if (statut) items = items.filter((t: any) => t.statut === statut);
  if (type) items = items.filter((t: any) => t.type === type);
  if (dateDebut) items = items.filter((t: any) => String(t.date ?? '').slice(0, 10) >= dateDebut);
  if (dateFin) items = items.filter((t: any) => String(t.date ?? '').slice(0, 10) <= dateFin);

  items.sort((a: any, b: any) => String(b.date).localeCompare(String(a.date)));
  return paginate(items, page, parPage);
}

function summarizeTransactionsByCategory(items: any[]) {
  const map = new Map<string, any>();
  for (const t of items) {
    const key = `${t.type}|${t.categorieId ?? ''}|${t.categorieNom ?? ''}`;
    const prev = map.get(key) ?? { categorieId: t.categorieId ?? '', categorieNom: t.categorieNom ?? '', type: t.type, count: 0, montant: 0 };
    prev.count += 1;
    prev.montant += Number(t.montant ?? 0);
    map.set(key, prev);
  }
  return Array.from(map.values()).sort((a, b) => b.montant - a.montant);
}

function tunisianChartOfAccounts() {
  return [
    { numero: '101000', intitule: 'Capital social', classe: '1', nature: 'Capitaux propres', usage: 'Ouverture et mouvements du capital' },
    { numero: '128000', intitule: 'Résultat de l’exercice', classe: '1', nature: 'Capitaux propres', usage: 'Affectation du résultat après clôture' },
    { numero: '164000', intitule: 'Emprunts auprès des établissements de crédit', classe: '1', nature: 'Financement', usage: 'Crédits moyen et long terme' },
    { numero: '168000', intitule: 'Autres emprunts et dettes assimilées', classe: '1', nature: 'Financement', usage: 'Dettes financières diverses' },
    { numero: '213000', intitule: 'Constructions', classe: '2', nature: 'Immobilisations', usage: 'Amortissement usuel 5%' },
    { numero: '213500', intitule: 'Logiciels', classe: '2', nature: 'Immobilisations', usage: 'Applications métier et licences' },
    { numero: '218100', intitule: 'Agencements et aménagements', classe: '2', nature: 'Immobilisations', usage: 'Aménagements bureaux et locaux' },
    { numero: '218200', intitule: 'Matériel de transport', classe: '2', nature: 'Immobilisations', usage: 'Amortissement usuel 20%' },
    { numero: '218300', intitule: 'Matériel informatique', classe: '2', nature: 'Immobilisations', usage: 'Amortissement usuel 33%' },
    { numero: '281830', intitule: 'Amortissements matériel informatique', classe: '2', nature: 'Amortissement', usage: 'Dotations et VNC' },
    { numero: '301000', intitule: 'Stocks de marchandises', classe: '3', nature: 'Stocks', usage: 'Inventaire marchandises' },
    { numero: '355000', intitule: 'Stocks de produits finis', classe: '3', nature: 'Stocks', usage: 'Inventaire production' },
    { numero: '401000', intitule: 'Fournisseurs', classe: '4', nature: 'Tiers', usage: 'Factures d’achat et OCR mobile' },
    { numero: '403000', intitule: 'Fournisseurs effets à payer', classe: '4', nature: 'Tiers', usage: 'Effets fournisseurs' },
    { numero: '411000', intitule: 'Clients', classe: '4', nature: 'Tiers', usage: 'Factures, avoirs et lettrage' },
    { numero: '413000', intitule: 'Clients effets à recevoir', classe: '4', nature: 'Tiers', usage: 'Effets clients' },
    { numero: '421000', intitule: 'Personnel rémunérations dues', classe: '4', nature: 'Social', usage: 'Paie mensuelle' },
    { numero: '431000', intitule: 'CNSS à payer', classe: '4', nature: 'Social', usage: 'Cotisations sociales trimestrielles' },
    { numero: '436600', intitule: 'TVA déductible', classe: '4', nature: 'Fiscalité', usage: 'TVA achats déductible' },
    { numero: '436700', intitule: 'TVA collectée', classe: '4', nature: 'Fiscalité', usage: 'TVA ventes 19%, 13%, 7%' },
    { numero: '437100', intitule: 'Retenue à la source 1,5%', classe: '4', nature: 'Fiscalité', usage: 'Marchés et prestations soumises' },
    { numero: '437200', intitule: 'Retenue à la source 5%', classe: '4', nature: 'Fiscalité', usage: 'Honoraires et loyers selon cas' },
    { numero: '438200', intitule: 'Timbre fiscal', classe: '4', nature: 'Fiscalité', usage: '1 TND sur factures concernées' },
    { numero: '438600', intitule: 'FODEC à payer', classe: '4', nature: 'Fiscalité', usage: 'Taxe FODEC 1%' },
    { numero: '438800', intitule: 'TCL à payer', classe: '4', nature: 'Fiscalité', usage: 'Taxe collectivités locales 0,2%' },
    { numero: '441000', intitule: 'État subventions à recevoir', classe: '4', nature: 'Fiscalité', usage: 'Créances sur l’État' },
    { numero: '448600', intitule: 'Charges à payer', classe: '4', nature: 'Régularisation', usage: 'Cut-off et clôture' },
    { numero: '531000', intitule: 'Caisse', classe: '5', nature: 'Trésorerie', usage: 'Encaissements espèces' },
    { numero: '532000', intitule: 'Banques', classe: '5', nature: 'Trésorerie', usage: 'Rapprochement bancaire' },
    { numero: '581000', intitule: 'Virements internes', classe: '5', nature: 'Trésorerie', usage: 'Transferts banque/caisse' },
    { numero: '607000', intitule: 'Achats de marchandises', classe: '6', nature: 'Charges', usage: 'Achats fournisseurs' },
    { numero: '611000', intitule: 'Sous-traitance générale', classe: '6', nature: 'Charges', usage: 'Prestations sous-traitées' },
    { numero: '613000', intitule: 'Locations', classe: '6', nature: 'Charges', usage: 'Loyers et baux' },
    { numero: '622000', intitule: 'Rémunérations intermédiaires', classe: '6', nature: 'Charges', usage: 'Honoraires et commissions' },
    { numero: '627000', intitule: 'Services bancaires', classe: '6', nature: 'Charges', usage: 'Frais bancaires' },
    { numero: '634000', intitule: 'Impôts et taxes', classe: '6', nature: 'Charges', usage: 'Taxes non récupérables' },
    { numero: '638500', intitule: 'FODEC charge', classe: '6', nature: 'Charges', usage: 'Constatation FODEC' },
    { numero: '638600', intitule: 'TCL charge', classe: '6', nature: 'Charges', usage: 'Constatation TCL' },
    { numero: '641100', intitule: 'Salaires et appointements', classe: '6', nature: 'Charges', usage: 'Paie mensuelle' },
    { numero: '681100', intitule: 'Dotations aux amortissements', classe: '6', nature: 'Charges', usage: 'Clôture immobilisations' },
    { numero: '701000', intitule: 'Ventes de produits finis', classe: '7', nature: 'Produits', usage: 'Vente de biens' },
    { numero: '706000', intitule: 'Prestations de services', classe: '7', nature: 'Produits', usage: 'Services et honoraires' },
    { numero: '707000', intitule: 'Ventes de marchandises', classe: '7', nature: 'Produits', usage: 'Facturation client' },
    { numero: '709000', intitule: 'Rabais remises ristournes accordés', classe: '7', nature: 'Produits', usage: 'Réductions commerciales' },
    { numero: '752000', intitule: 'Produits financiers', classe: '7', nature: 'Produits', usage: 'Intérêts et gains financiers' },
  ];
}

function fiscalCalendar() {
  return [
    { code: 'D15', echeance: '28/mois', label: 'Déclaration mensuelle D15', detail: 'TVA, FODEC, TCL et timbre fiscal du mois précédent.' },
    { code: 'RS41', echeance: '28/mois', label: 'Retenue à la source - Modèle 41', detail: 'RS 1,5%, 3%, 5%, 10%, 15% et non-résidents.' },
    { code: 'CNSS', echeance: '15/trim.', label: 'CNSS trimestrielle', detail: 'Masse salariale et cotisations sociales.' },
    { code: 'AC1', echeance: '25 juin', label: '1er acompte provisionnel IS', detail: 'Acompte sur impôt société selon résultat précédent.' },
    { code: 'AC2', echeance: '25 sept.', label: '2e acompte provisionnel IS', detail: 'Suivi trésorerie et validation responsable.' },
    { code: 'AC3', echeance: '25 déc.', label: '3e acompte provisionnel IS', detail: 'Dernier acompte avant arrêté annuel.' },
    { code: 'EMP', echeance: '25 fév.', label: 'Déclaration employeur', detail: 'État annuel des salaires et retenues.' },
    { code: 'IS', echeance: '25 avr./mai', label: 'Déclaration annuelle IS', detail: 'SARL au 25 avril, SA au 25 mai.' },
  ];
}

function buildComptabilite(db: DemoDb) {
  const facturesVente = db.factures.filter((f: any) => normalizeDocType(f.typeFacture) === 'Facture');
  const facturesAchat = db.factures.filter((f: any) => normalizeDocType(f.typeFacture) === 'Facture achat');
  const avoirs = db.factures.filter((f: any) => normalizeDocType(f.typeFacture) === 'Avoir');
  const debitClient = facturesVente.reduce((s: number, f: any) => s + Number(f.netAPayer ?? f.totalTtc ?? 0), 0);
  const creditClient = facturesVente.reduce((s: number, f: any) => s + Number(f.montantPaye ?? 0), 0) + avoirs.reduce((s: number, f: any) => s + Number(f.netAPayer ?? f.totalTtc ?? 0), 0);
  const tvaCollectee = facturesVente.reduce((s: number, f: any) => s + Number(f.totalTva ?? 0), 0);
  const tvaDeductible = facturesAchat.reduce((s: number, f: any) => s + Number(f.totalTva ?? 0), 0);
  const rsAReverser = facturesVente.reduce((s: number, f: any) => s + Number(f.montantRS ?? 0), 0);
  const achats = facturesAchat.reduce((s: number, f: any) => s + Number(f.totalHt ?? 0), 0);
  const ventesHt = facturesVente.reduce((s: number, f: any) => s + Number(f.totalHt ?? 0), 0) - avoirs.reduce((s: number, f: any) => s + Number(f.totalHt ?? 0), 0);
  const tresorerie = db.paiements.reduce((s: number, p: any) => s + Number(p.montant ?? 0), 0);
  const planComptable = tunisianChartOfAccounts();

  const ecritures = db.transactions.slice(0, 26).flatMap((t: any, index: number) => {
    const piece = t.factureId ? (db.factures.find((f: any) => f.id === t.factureId)?.numero ?? t.id) : t.id;
    const journal = t.type === 'Entree' ? JOURNAUX.VENTES : (t.categorieNom === 'Frais bancaires' ? JOURNAUX.BANQUE : JOURNAUX.ACHATS);
    const debit = t.type === 'Entree' ? Number(t.montant ?? 0) : 0;
    const credit = t.type === 'Sortie' ? Number(t.montant ?? 0) : 0;
    return [{
      id: `EC-${index}-1`,
      date: t.date,
      journal,
      piece,
      compte: t.compte ?? (t.type === 'Entree' ? COMPTES.CLIENTS : COMPTES.FOURNISSEURS),
      libelle: t.libelle,
      tiers: t.tiersNom,
      debit: round3(debit),
      credit: round3(credit),
      statut: t.statut === 'Justifiee' ? 'Validée' : 'À contrôler',
    }];
  });

  const factureAvecRs = facturesVente.find((f: any) => Number(f.montantRS ?? 0) > 0);
  if (factureAvecRs) {
    const montantRS = round3(Number(factureAvecRs.montantRS ?? 0));
    ecritures.push(
      {
        id: 'EC-RS-1',
        date: factureAvecRs.dateEmission,
        journal: JOURNAUX.VENTES,
        piece: factureAvecRs.numero,
        compte: COMPTES.RS_A_REVERSER,
        libelle: 'RS à reverser constatée',
        tiers: factureAvecRs.clientNom,
        debit: montantRS,
        credit: 0,
        statut: 'Validée',
      },
      {
        id: 'EC-RS-2',
        date: factureAvecRs.dateEmission,
        journal: JOURNAUX.VENTES,
        piece: factureAvecRs.numero,
        compte: COMPTES.CLIENTS,
        libelle: 'Correction créance client RS',
        tiers: factureAvecRs.clientNom,
        debit: 0,
        credit: montantRS,
        statut: 'Validée',
      }
    );
  }

  const balance = [
    balanceNct(COMPTES.FOURNISSEURS, 'Fournisseurs', round3(achats * .25), round3(achats)),
    balanceNct(COMPTES.CLIENTS, 'Clients', round3(debitClient), round3(creditClient)),
    balanceNct(COMPTES.TVA_DEDUCTIBLE, 'TVA déductible', round3(tvaDeductible), 0),
    balanceNct(COMPTES.TVA_COLLECTEE, 'TVA collectée', 0, round3(tvaCollectee)),
    balanceNct(COMPTES.RS_A_REVERSER, 'Retenue à la source à reverser', 0, round3(rsAReverser)),
    balanceNct(COMPTES.BANQUE, 'Banques', round3(tresorerie), round3(achats * .35)),
    balanceNct(COMPTES.ACHATS_MARCHANDISES, 'Achats', round3(achats), 0),
    balanceNct(COMPTES.VENTES_MARCHANDISES, 'Ventes', 0, round3(ventesHt)),
  ];

  const journaux = [
    { code: JOURNAUX.VENTES, label: 'Journal ventes', role: 'Factures clients, avoirs, TVA collectée et TEIF', total: ventesHt + tvaCollectee, nbPieces: facturesVente.length + avoirs.length, controle: 'Numérotation continue' },
    { code: JOURNAUX.ACHATS, label: 'Journal achats', role: 'Factures fournisseurs, OCR mobile, TVA déductible', total: achats + tvaDeductible, nbPieces: facturesAchat.length, controle: 'Pièces attachées' },
    { code: JOURNAUX.BANQUE, label: 'Journal banque', role: 'Paiements, lettrage, rapprochement bancaire', total: tresorerie, nbPieces: db.paiements.length, controle: 'Rapprochement mensuel' },
    { code: JOURNAUX.CAISSE, label: 'Journal caisse', role: 'Espèces avec contrôle plafond légal B2B', total: db.paiements.filter((p: any) => String(p.modePaiement).includes('Espece')).reduce((s: number, p: any) => s + Number(p.montant ?? 0), 0), nbPieces: 2, controle: 'Plafond 5 000 TND' },
    { code: JOURNAUX.OD, label: 'Opérations diverses', role: 'Salaires, provisions, OD fiscales', total: 18450, nbPieces: 11, controle: 'Validation comptable' },
    { code: 'AM', label: 'Amortissements', role: 'Dotations et suivi VNC des immobilisations', total: 9400, nbPieces: 6, controle: 'Inventaire annuel' },
  ];

  const actifs = [
    { id: 'A1', label: 'Serveur comptable et sauvegarde', famille: 'Matériel informatique', compte: '218300', taux: 33, acquisition: 12400, dotation: 4092, vnc: 8308, statut: 'En service' },
    { id: 'A2', label: 'Véhicule commercial', famille: 'Transport', compte: '218200', taux: 20, acquisition: 58000, dotation: 11600, vnc: 46400, statut: 'En service' },
    { id: 'A3', label: 'Aménagement bureau', famille: 'Agencements', compte: '218100', taux: 10, acquisition: 21500, dotation: 2150, vnc: 19350, statut: 'En service' },
    { id: 'A4', label: 'Logiciels métier', famille: 'Logiciels', compte: '213500', taux: 33, acquisition: 8900, dotation: 2937, vnc: 5963, statut: 'En service' },
  ];

  const etats = [
    { code: 'BILAN', icon: 'ti-layout-board-split', label: 'Bilan NCT', description: 'Actifs, capitaux propres et passifs selon présentation tunisienne.', norme: 'NCT 01' },
    { code: 'RESULTAT', icon: 'ti-report-money', label: 'État de résultat par nature', description: 'Produits, charges, résultat d’exploitation, financier et net.', norme: 'NCT 01' },
    { code: 'CASH', icon: 'ti-arrows-exchange', label: 'Flux de trésorerie', description: 'Exploitation, investissement, financement et variation nette.', norme: 'NCT 07' },
    { code: 'NOTES', icon: 'ti-notes', label: 'Notes aux états financiers', description: 'Méthodes comptables, immobilisations, dettes, engagements.', norme: 'NCT 01' },
    { code: 'D15', icon: 'ti-file-percent', label: 'Déclaration mensuelle D15', description: 'TVA, timbre fiscal, FODEC, TCL et autres taxes dues.', norme: 'DGI Tunisie' },
    { code: 'RS41', icon: 'ti-receipt-tax', label: 'Déclaration RS Modèle 41', description: 'Retenues à la source par tiers, nature et taux légal.', norme: 'DGI Tunisie' },
  ];

  const exercices = [
    { code: 'OPEN', label: 'Ouverture exercice 2026', detail: 'Report à nouveau, reprise balance et verrouillage N-1.', statut: 'Validé' },
    { code: 'INV', label: 'Inventaire annuel', detail: 'Stocks, immobilisations, clients douteux, provisions et cut-off.', statut: 'En cours' },
    { code: 'FISC', label: 'Liasse fiscale', detail: 'D15, RS, IS, annexes et contrôles de cohérence.', statut: 'À préparer' },
    { code: 'CLOSE', label: 'Clôture et résultat', detail: 'Extournes, écritures de clôture, résultat et archivage.', statut: 'À venir' },
  ];

  const analytique = [
    { code: 'VENTE', label: 'Ventes B2B', description: 'Marge par documents clients et familles articles.', produits: ventesHt * .62, charges: achats * .34, marge: 48 },
    { code: 'SERV', label: 'Services', description: 'Prestations récurrentes, support et maintenance.', produits: ventesHt * .28, charges: achats * .18, marge: 61 },
    { code: 'ADMIN', label: 'Administration', description: 'Frais généraux, banques, loyers et salaires.', produits: ventesHt * .10, charges: achats * .48, marge: 18 },
    { code: 'EXPORT', label: 'Export', description: 'Opérations exonérées ou taux zéro à contrôler.', produits: ventesHt * .16, charges: achats * .09, marge: 55 },
  ];

  return {
    kpis: [
      { key: 'resultat', label: 'Résultat estimé', value: round3(ventesHt - achats), type: 'money', hint: 'Produits classe 7 - charges classe 6', icon: 'ti-chart-bar', tone: 'yellow' },
      { key: 'tva', label: 'TVA nette due', value: round3(Math.max(0, tvaCollectee - tvaDeductible)), type: 'money', hint: 'Collectée - déductible', icon: 'ti-receipt-tax', tone: 'blue' },
      { key: 'rs', label: 'RS à reverser', value: round3(rsAReverser), type: 'money', hint: 'Avant le 28/06 · Modèle 41', icon: 'ti-receipt-tax', tone: 'orange' },
      { key: 'ecritures', label: 'Écritures', value: ecritures.length, hint: 'Générées front/back demo', icon: 'ti-file-pencil', tone: 'green' },
    ],
    alertes: [
      { code: 'TVA', level: 'warning', icon: 'ti-alert-triangle', title: 'Déclaration mensuelle à préparer', text: 'Contrôler TVA, FODEC, TCL et timbre fiscal avant dépôt D15.', deadline: '28/mois' },
      { code: 'RS', level: 'danger', icon: 'ti-shield-exclamation', title: 'Retenues à la source', text: 'Générer le récapitulatif modèle 41 par fournisseur et nature de paiement.', deadline: '28/mois' },
      { code: 'TEIF', level: 'info', icon: 'ti-file-check', title: 'Chaîne facture connectée', text: 'Factures, avoirs, paiements et OCR mobile alimentent les écritures comptables.', deadline: 'Temps réel' },
    ],
    calendrierFiscal: fiscalCalendar(),
    planComptable,
    ecritures,
    journaux,
    balance,
    grandLivre: balance.map((b, i) => ({ id: `GL-${i}`, compte: b.compte, intitule: b.intitule, mouvement: i % 2 ? 'Mouvements banque et lettrage' : 'Mouvements facture et fiscalité', solde: b.soldeDebiteur || b.soldeCrediteur })),
    actifs,
    etats,
    exercices,
    analytique,
  };
}

function buildTresorerie(db: DemoDb) {
  const compta = buildComptabilite(db);
  const compte = (numero: string) => compta.balance.find((row: any) => row.compte === numero);
  const soldeCompte = (numero: string) => {
    const row: any = compte(numero);
    return round3(Number(row?.soldeDebiteur || 0) - Number(row?.soldeCrediteur || 0));
  };
  const factures = db.factures.filter((f: any) =>
    normalizeDocType(f.typeFacture) === 'Facture' &&
    Number(f.montantRestant ?? f.netAPayer ?? f.totalTtc ?? 0) > 0
  );
  const today = new Date();
  const in30 = new Date(today.getTime() + 30 * 86_400_000);
  const encaissements30j = factures
    .filter((f: any) => new Date(f.dateEcheance).getTime() <= in30.getTime())
    .reduce((sum: number, f: any) => sum + Number(f.montantRestant ?? 0), 0);
  const tva = Number(compta.kpis.find((k: any) => k.key === 'tva')?.value || 0);
  const rs = Number(compta.kpis.find((k: any) => k.key === 'rs')?.value || 0);
  const charges = compta.balance
    .filter((row: any) => String(row.compte).startsWith('6'))
    .reduce((sum: number, row: any) => sum + Number(row.debit || 0), 0) / 4;
  const weeks = Array.from({ length: 8 }, (_, index) => {
    const start = new Date(today.getTime() + index * 7 * 86_400_000);
    const end = new Date(start.getTime() + 6 * 86_400_000);
    const encaissements = factures
      .filter((f: any) => {
        const due = new Date(f.dateEcheance).getTime();
        return due >= start.getTime() && due <= end.getTime();
      })
      .reduce((sum: number, f: any) => sum + Number(f.montantRestant ?? 0), 0);
    const decaissements = index === 1 ? tva + rs : index % 3 === 0 ? charges : charges * .45;
    return {
      label: `S${index + 1}`,
      debut: iso(start).slice(0, 10),
      fin: iso(end).slice(0, 10),
      encaissements: round3(encaissements),
      decaissements: round3(decaissements),
      net: round3(encaissements - decaissements),
    };
  });
  return {
    soldeBanque: soldeCompte(COMPTES.BANQUE),
    soldeCaisse: soldeCompte(COMPTES.CAISSE),
    encaissements30j: round3(encaissements30j),
    decaissements30j: round3(tva + rs + charges),
    tvaDue: tva,
    rsAReverser: rs,
    facturesEnRetard: factures.filter((f: any) => new Date(f.dateEcheance).getTime() < today.getTime()).length,
    flux: weeks,
    alertes: [
      { code: 'TVA', level: tva > 0 ? 'danger' : 'success', label: 'TVA à payer', montant: round3(tva), echeance: '28/06/2026' },
      { code: 'RS', level: rs > 0 ? 'warning' : 'success', label: 'RS à reverser', montant: round3(rs), echeance: '28/06/2026' },
      { code: 'RETARD', level: 'danger', label: 'Factures en retard', montant: factures.filter((f: any) => f.estEnRetard).length, echeance: 'Immédiat' },
    ],
  };
}

function buildDashboard(db: DemoDb) {
  const stats = computeStats(db);
  const fin = {
    montantTotalMois: stats.montantTotalMois,
    montantEncaisseMois: stats.montantEncaisseMois,
    montantEnAttente: stats.montantEnAttente,
    tauxEncaissement: stats.montantTotalMois ? Math.round((stats.montantEncaisseMois / stats.montantTotalMois) * 100) : 0,
  };
  const conformite = { tauxConformite: stats.tauxConformite, totalConformes: db.factures.filter((f: any) => f.statut === 'Conforme').length };

  const now = new Date();
  const evo = Array.from({ length: 6 }).map((_, idx) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (5 - idx), 1));
    const label = monthLabel(d);
    const month = String(d.toISOString().slice(0, 7));
    const total = db.factures
      .filter((f: any) => f.typeFacture === 'Facture' && String(f.dateEmission ?? '').slice(0, 7) === month)
      .reduce((s: number, f: any) => s + Number(f.totalTtc ?? 0), 0);
    return { mois: label, montantTtc: Math.round(total) };
  });

  const dernieresFactures = db.factures
    .filter((f: any) => f.typeFacture === 'Facture')
    .slice()
    .sort((a: any, b: any) => String(b.dateEmission).localeCompare(String(a.dateEmission)))
    .slice(0, 6)
    .map((f: any) => ({ id: f.id, numero: f.numero, clientNom: f.clientNom, totalTtc: f.totalTtc, devise: f.devise, statut: f.statut }));

  const alertes: any[] = [];
  const retards = db.factures.filter((f: any) => f.typeFacture === 'Facture' && f.estEnRetard).length;
  if (retards) alertes.push({ type: 'retard', message: `${retards} factures en retard de paiement.` });
  const aRegenerer = db.factures.filter((f: any) => f.typeFacture === 'Facture' && !f.xmlGenere && (f.statut === 'Validee' || f.statut === 'Transmise')).length;
  if (aRegenerer) alertes.push({ type: 'conformite', message: `${aRegenerer} factures a generer au format TEIF.` });

  return {
    evolutionMensuelle: evo,
    kpisFinanciers: fin,
    kpisFactures: { totalMois: stats.totalValidees + stats.totalPayees + stats.totalTransmises + stats.totalAcceptees + stats.totalRejetees + stats.totalBrouillons, ...stats },
    kpisConformite: conformite,
    dernieresFactures,
    alertes,
  };
}

function buildDashboardAdmin(db: DemoDb) {
  const d = buildDashboard(db);
  return {
    ...d,
    totalEntreprises: db.adminEntreprises.length,
    totalUtilisateurs: 18,
    totalFacturesPlateforme: 540,
    facturesEnRetard: db.factures.filter((f: any) => f.typeFacture === 'Facture' && f.estEnRetard).length,
    entreprises: db.adminEntreprises.map(e => ({ id: e.id, nom: e.raisonSociale, nbUtilisateurs: e.nbUtilisateurs, nbFactures: e.nbFactures })),
  };
}

function isLocalDemoSession(): boolean {
  try {
    return (localStorage.getItem('ey_access_token') ?? '').startsWith('local_demo_');
  } catch {
    return false;
  }
}

export const demoDataInterceptor: HttpInterceptorFn = (req, next) => {
  if (!environment.demoMode && !isLocalDemoSession()) return next(req);

  const apiBase = environment.apiUrl.replace(/\/+$/, '');
  const isApi = req.url.startsWith(apiBase);
  if (!isApi) return next(req);

  const db = ensureDb();
  const method = req.method.toUpperCase();
  const { path, query } = parseApiUrl(req.url, apiBase);

  // ---------------- Dashboard ----------------
  if (method === 'GET' && path === '/dashboard') return ok(buildDashboard(db));
  if (method === 'GET' && path === '/dashboard/admin') return ok(buildDashboardAdmin(db));

  // ---------------- Comptabilite ----------------
  if (method === 'GET' && path === '/comptabilite/dashboard') return ok(buildComptabilite(db));
  if (method === 'GET' && path.startsWith('/comptabilite/')) {
    const compta = buildComptabilite(db);
    const map: Record<string, any> = {
      '/comptabilite/plan-comptable': compta.planComptable,
      '/comptabilite/ecritures': compta.ecritures,
      '/comptabilite/journaux': compta.journaux,
      '/comptabilite/balance': compta.balance,
      '/comptabilite/grand-livre': compta.grandLivre,
      '/comptabilite/actifs': compta.actifs,
      '/comptabilite/etats': compta.etats,
      '/comptabilite/exercices': compta.exercices,
      '/comptabilite/analytique': compta.analytique,
      '/comptabilite/calendrier-fiscal': compta.calendrierFiscal,
      '/comptabilite/tresorerie': buildTresorerie(db),
    };
    if (path in map) return ok(map[path]);
  }

  // ---------------- Auth ----------------
  if (method === 'POST' && path === '/auth/login') {
    const email = String((req.body as any)?.email ?? '').toLowerCase();
    const adminConsole = !!(req.body as any)?.adminConsole;
    const utilisateur = db.users.find(u => u.email.toLowerCase() === email) ?? db.users[2];
    if (adminConsole && utilisateur.role === 'SuperAdmin') return ok({ utilisateurId: utilisateur.id });
    const expires = new Date(Date.now() + 8 * 3600 * 1000).toISOString();
    return ok({
      accessToken: 'demo_access_token',
      refreshToken: 'demo_refresh_token',
      expireA: expires,
      utilisateur,
    });
  }
  if (method === 'POST' && path === '/auth/2fa/login') {
    const utilisateurId = (req.body as any)?.utilisateurId ?? db.users[2].id;
    const utilisateur = db.users.find(u => u.id === utilisateurId) ?? db.users[2];
    const expires = new Date(Date.now() + 8 * 3600 * 1000).toISOString();
    return ok({ accessToken: 'demo_access_token', refreshToken: 'demo_refresh_token', expireA: expires, utilisateur });
  }
  if (method === 'POST' && path === '/auth/register') {
    const body = (req.body as any) ?? {};
    const created = {
      id: uid('USR'),
      prenom: body.prenom ?? 'Nouveau',
      nom: body.nom ?? 'Utilisateur',
      email: body.email ?? `user${seq}@demo.tn`,
      role: 'Admin',
      statut: 'Actif',
      deuxFAActif: false,
      entrepriseId: db.entreprise['id'],
      derniereConnexion: iso(new Date()),
    };
    db.users.unshift(created);
    const expires = new Date(Date.now() + 8 * 3600 * 1000).toISOString();
    return ok({ accessToken: 'demo_access_token', refreshToken: 'demo_refresh_token', expireA: expires, utilisateur: created });
  }
  if (method === 'POST' && path === '/auth/refresh') {
    const utilisateur = db.users[2];
    const expires = new Date(Date.now() + 8 * 3600 * 1000).toISOString();
    return ok({ accessToken: 'demo_access_token', refreshToken: 'demo_refresh_token', expireA: expires, utilisateur });
  }
  if (method === 'POST' && path === '/auth/refresh-token-entreprise') {
    const utilisateur = db.users[2];
    const expires = new Date(Date.now() + 8 * 3600 * 1000).toISOString();
    return ok({ accessToken: 'demo_access_token', refreshToken: 'demo_refresh_token', expireA: expires, utilisateur });
  }
  if (method === 'POST' && path === '/auth/logout') return ok({ message: 'OK (demo)' });
  if (method === 'POST' && path === '/auth/mot-de-passe-oublie') return ok({ message: 'OTP envoye (demo)' });
  if (method === 'POST' && path === '/auth/verifier-otp') return ok({ message: 'OTP verifie (demo)' });
  if (method === 'POST' && path === '/auth/reinitialiser-mot-de-passe') return ok({ message: 'Mot de passe mis a jour (demo)' });
  if (method === 'POST' && path === '/auth/2fa/activer') {
    const secret = 'JBSWY3DPEHPK3PXP';
    const qrCodeUri = `otpauth://totp/EY%20Invoice:demo.admin@eyinvoice.tn?secret=${secret}&issuer=EY%20Invoice`;
    return ok({ secret, qrCodeUri });
  }
  if (method === 'POST' && path === '/auth/2fa/confirmer') return ok({ message: '2FA active (demo)' });
  if (method === 'DELETE' && path === '/auth/2fa') return ok({ message: '2FA desactive (demo)' });
  if (method === 'POST' && path === '/auth/changer-mot-de-passe') return ok({ message: 'Mot de passe modifie (demo)' });

  // ---------------- Factures ----------------
  if (method === 'GET' && path === '/factures/statistiques') return ok(computeStats(db));
  if (method === 'GET' && path === '/factures') return ok(listFactures(db, query));
  {
    const m = path.match(/^\/factures\/([^/]+)$/);
    if (method === 'GET' && m) {
      const found = db.factures.find((f: any) => f.id === m[1]);
      return found ? ok(clone(found)) : notFound('Facture introuvable (demo)');
    }
  }
  {
    const m = path.match(/^\/factures\/([^/]+)\/historique$/);
    if (method === 'GET' && m) {
      const found = db.factures.find((f: any) => f.id === m[1]);
      if (!found) return ok([]);
      const base = [
        { id: uid('HIS'), action: 'Creation', utilisateurNom: 'Systeme', dateAction: found.creeLe, details: 'Document cree' },
      ];
      const extra = Array.isArray(found.historique) ? found.historique : [];
      return ok([...base, ...extra]);
    }
  }
  {
    const m = path.match(/^\/factures\/([^/]+)\/pdf$/);
    if (method === 'GET' && m) {
      const found = db.factures.find((f: any) => f.id === m[1]);
      const num = found?.numero ?? 'FAC-DEMO';
      const client = found?.clientNom ?? 'Client';
      const blob = buildSimplePdf([`EY Invoice Portal - DEMO`, `Invoice: ${num}`, `Client: ${client}`, `Total TTC: ${Number(found?.totalTtc ?? 0).toFixed(3)} TND`]);
      return okBlob(blob, 'application/pdf', `${num}.pdf`);
    }
  }
  if (method === 'POST' && path === '/factures') {
    const body = (req.body as any) ?? {};
    const client = db.clients.find((c: any) => c.id === body.clientId) ?? db.clients[0];
    const typeFacture = normalizeDocType(body.typeFacture);
    const factureOrigine = body.factureOrigineId
      ? db.factures.find((f: any) => f.id === body.factureOrigineId && normalizeDocType(f.typeFacture) === 'Facture' && f.statut !== 'Brouillon')
      : null;
    if (typeFacture === 'Avoir' && body.factureOrigineId && !factureOrigine) {
      return notFound('Un avoir doit referencer une facture validee (demo)');
    }
    const lignesIn = Array.isArray(body.lignes) ? body.lignes : [];
    const lignes = lignesIn.map((l: any, idx: number) => {
      const quantite = Number(l.quantite ?? 1);
      const prixUnitaire = Number(l.prixUnitaire ?? 0);
      const tauxRemise = Number(l.tauxRemise ?? 0);
      const brut = quantite * prixUnitaire;
      const remise = brut * (tauxRemise / 100);
      const ht = brut - remise;
      const tauxTva = Number(l.tauxTva ?? 19);
      const tva = ht * (tauxTva / 100);
      const ttc = ht + tva;
      return {
        id: uid('LIG'),
        ordre: idx + 1,
        designation: l.designation ?? 'Article',
        description: l.description ?? '',
        unite: l.unite ?? 'U',
        quantite,
        prixUnitaire,
        tauxRemise,
        tauxTva,
        montantHt: +ht.toFixed(3),
        montantRemise: +remise.toFixed(3),
        montantTva: +tva.toFixed(3),
        montantTtc: +ttc.toFixed(3),
        produitId: l.produitId ?? undefined,
      };
    });

    const totals = computeFactureTotals(lignes);
    const id = uid('FAC');
    const num = `${docPrefix(typeFacture)}-${new Date().getFullYear()}-${String(10000 + seq).slice(-5)}`;
    const dateEmission = iso(new Date());
    const dateEcheance = body.dateEcheance ? iso(new Date(body.dateEcheance)) : iso(new Date(Date.now() + 30 * 24 * 3600 * 1000));

    const created = {
      id,
      numero: num,
      clientId: client.id,
      clientNom: client.nom,
      clientMatriculeFiscal: client.matriculeFiscal,
      factureOrigineId: factureOrigine?.id ?? body.factureOrigineId ?? undefined,
      factureOrigineNumero: factureOrigine?.numero ?? undefined,
      reference: body.reference ?? '',
      statut: 'Brouillon',
      typeFacture,
      typeVente: body.typeVente ?? 'Local',
      modePaiement: body.modePaiement ?? 'Virement',
      devise: body.devise ?? 'TND',
      dateEmission,
      dateEcheance,
      datePaiement: null,
      ...totals,
      appliquerRS: !!body.appliquerRS,
      codeRS: body.codeRS,
      tauxRS: Number(body.tauxRS ?? 0),
      baseRS: Number(body.baseRS ?? 0),
      montantRS: Number(body.montantRS ?? 0),
      netAPayer: Number(body.netAPayer ?? totals.totalTtc),
      montantPaye: 0,
      montantRestant: Number(body.netAPayer ?? totals.totalTtc),
      estEnRetard: false,
      notes: body.notes ?? '',
      conditionsPaiement: body.conditionsPaiement ?? '30 jours',
      xmlGenere: false,
      versionTeif: 'v1.8.8',
      lignes,
      historique: [{ id: uid('HIS'), action: 'Creation', utilisateurNom: 'Demo', dateAction: iso(new Date()), details: factureOrigine ? `Lie a ${factureOrigine.numero}` : undefined }],
      creeLe: iso(new Date()),
      modifieLe: iso(new Date()),
    };

    applyFiscalParams(db, created);
    db.factures.unshift(created);
    if (typeFacture === 'Avoir' && factureOrigine) {
      factureOrigine.montantRestant = round3(Math.max(0, Number(factureOrigine.montantRestant ?? factureOrigine.netAPayer ?? factureOrigine.totalTtc ?? 0) - Number(created.netAPayer ?? created.totalTtc ?? 0)));
      factureOrigine.totalAvoirs = round3(Number(factureOrigine.totalAvoirs ?? 0) + Number(created.netAPayer ?? created.totalTtc ?? 0));
      pushHistory(factureOrigine, 'Avoir', `Avoir ${created.numero} rattache a la facture`);
    }
    if (typeFacture !== 'Devis') createTransactionForDocument(db, created, typeFacture === 'Avoir' ? 'Avoir comptabilise' : 'Document cree');
    return ok(created);
  }
  {
    const m = path.match(/^\/factures\/([^/]+)$/);
    if (method === 'PUT' && m) {
      const id = m[1];
      const existing = db.factures.find((f: any) => f.id === id);
      if (!existing) return notFound('Facture introuvable (demo)');
      Object.assign(existing, req.body ?? {}, { modifieLe: iso(new Date()) });
      if (Array.isArray(existing.lignes)) applyFiscalParams(db, existing);
      return ok(existing);
    }
  }
  {
    const m = path.match(/^\/factures\/([^/]+)\/convertir-facture$/);
    if (method === 'POST' && m) {
      const devis = db.factures.find((f: any) => f.id === m[1] && normalizeDocType(f.typeFacture) === 'Devis');
      if (!devis) return notFound('Devis introuvable ou deja converti (demo)');
      const body = (req.body as any) ?? {};
      const created = clone(devis);
      created.id = uid('FAC');
      created.numero = `${docPrefix('Facture')}-${new Date().getFullYear()}-${String(10000 + seq).slice(-5)}`;
      created.typeFacture = 'Facture';
      created.devisOrigineId = devis.id;
      created.devisOrigineNumero = devis.numero;
      created.reference = body.reference ?? devis.reference ?? '';
      created.dateEmission = iso(new Date());
      created.dateEcheance = body.dateEcheance ? iso(new Date(body.dateEcheance)) : devis.dateEcheance;
      created.statut = 'Brouillon';
      created.xmlGenere = false;
      created.montantPaye = 0;
      created.creeLe = iso(new Date());
      created.modifieLe = iso(new Date());
      created.historique = [];
      applyFiscalParams(db, created);
      pushHistory(created, 'Conversion devis', `Facture generee depuis ${devis.numero}`);
      devis.statut = 'Acceptee';
      devis.factureGenereeId = created.id;
      devis.factureGenereeNumero = created.numero;
      pushHistory(devis, 'Conversion facture', `Facture ${created.numero} creee depuis le devis accepte`);
      db.factures.unshift(created);
      createTransactionForDocument(db, created, 'Facture creee depuis devis');
      return ok(created);
    }
  }
  {
    const m = path.match(/^\/factures\/([^/]+)\/valider$/);
    if (method === 'POST' && m) {
      const existing = db.factures.find((f: any) => f.id === m[1]);
      if (!existing) return notFound('Facture introuvable (demo)');
      existing.statut = 'Validee';
      existing.modifieLe = iso(new Date());
      pushHistory(existing, 'Validation');
      if (normalizeDocType(existing.typeFacture) !== 'Devis' && !db.transactions.some((t: any) => t.factureId === existing.id)) {
        createTransactionForDocument(db, existing, 'Document valide');
      }
      return ok(existing);
    }
  }
  {
    const m = path.match(/^\/factures\/([^/]+)\/soumettre-validation-fiscale$/);
    if (method === 'POST' && m) {
      const existing = db.factures.find((f: any) => f.id === m[1]);
      if (!existing) return notFound('Facture introuvable (demo)');
      existing.xmlGenere = true;
      existing.versionTeif = existing.versionTeif ?? 'v1.8.8';
      existing._xmlContent = existing._xmlContent ?? buildXmlForFacture(existing);
      existing.hashIntegrite = existing.hashIntegrite ?? `SIM-HASH-${existing.id}`;
      existing.workflowTeif = {
        ...(existing.workflowTeif ?? {}),
        xml: 'Genere',
        signature: existing.signatureId ? 'Signee' : (existing.workflowTeif?.signature ?? 'A signer'),
        ttn: 'En attente admin'
      };
      existing.echangeStatut = 'En attente admin';
      existing.validationFiscale = {
        statut: 'EnAttenteAdmin',
        date: iso(new Date()),
        erreurs: []
      };
      existing.statut = 'EnAttenteAdmin';
      existing.modifieLe = iso(new Date());
      pushHistory(existing, 'Soumission fiscale', 'Facture envoyee a l admin fiscal en simulation');
      return ok(existing);
    }
  }
  {
    const m = path.match(/^\/factures\/([^/]+)\/remettre-brouillon$/);
    if (method === 'POST' && m) {
      const existing = db.factures.find((f: any) => f.id === m[1]);
      if (!existing) return notFound('Facture introuvable (demo)');
      existing.statut = 'Brouillon';
      existing.modifieLe = iso(new Date());
      return ok(existing);
    }
  }
  {
    const m = path.match(/^\/factures\/([^/]+)\/rejeter$/);
    if (method === 'POST' && m) {
      const existing = db.factures.find((f: any) => f.id === m[1]);
      if (!existing) return notFound('Facture introuvable (demo)');
      existing.statut = 'Rejetee';
      existing.modifieLe = iso(new Date());
      const motif = (req.body as any)?.motif ?? 'Motif (demo)';
      existing.historique = [...(existing.historique ?? []), { id: uid('HIS'), action: 'Rejet', utilisateurNom: 'Demo', dateAction: iso(new Date()), details: String(motif) }];
      return ok(existing);
    }
  }
  {
    const m = path.match(/^\/factures\/([^/]+)\/annuler$/);
    if (method === 'POST' && m) {
      const existing = db.factures.find((f: any) => f.id === m[1]);
      if (!existing) return notFound('Facture introuvable (demo)');
      existing.statut = 'Annulee';
      existing.modifieLe = iso(new Date());
      return ok(existing);
    }
  }

  // ---------------- TEIF ----------------
  {
    const m = path.match(/^\/teif\/([^/]+)\/generer-xml$/);
    if (method === 'POST' && m) {
      const facture = db.factures.find((f: any) => f.id === m[1]);
      if (!facture) return notFound('Facture introuvable (demo)');
      facture.xmlGenere = true;
      facture.versionTeif = facture.versionTeif ?? 'v1.8.8';
      const xmlContent = buildXmlForFacture(facture);
      facture._xmlContent = xmlContent;
      return ok({
        factureId: facture.id,
        numero: facture.numero,
        xmlContent,
        hashIntegrite: `DEMO-HASH-${facture.id}`,
        versionTeif: facture.versionTeif,
        genereA: iso(new Date()),
      });
    }
  }
  {
    const m = path.match(/^\/teif\/([^/]+)\/valider$/);
    if (method === 'POST' && m) {
      const facture = db.factures.find((f: any) => f.id === m[1]);
      if (!facture) return notFound('Facture introuvable (demo)');
      const conforme = facture.statut !== 'Rejetee';
      return ok({
        factureId: facture.id,
        estConforme: conforme,
        erreurs: conforme ? [] : [{ code: 'TEIF001', message: 'Erreur de schema (demo)', champ: 'TotalTTC', severite: 'Error' }],
        valideeA: iso(new Date()),
      });
    }
  }
  {
    const m = path.match(/^\/teif\/([^/]+)\/marquer-conforme$/);
    if (method === 'POST' && m) {
      const facture = db.factures.find((f: any) => f.id === m[1]);
      if (!facture) return notFound('Facture introuvable (demo)');
      facture.statut = 'Conforme';
      facture.workflowTeif = { xml: 'Genere', signature: facture.workflowTeif?.signature ?? 'A signer', ttn: facture.workflowTeif?.ttn ?? 'Pret' };
      facture.modifieLe = iso(new Date());
      pushHistory(facture, 'Validation TEIF', 'XML conforme et pret pour signature');
      return ok(facture);
    }
  }
  {
    const m = path.match(/^\/teif\/([^/]+)\/generer-xml\/fichier$/);
    if (method === 'GET' && m) {
      const facture = db.factures.find((f: any) => f.id === m[1]);
      const xml = facture?._xmlContent ?? buildXmlForFacture(facture);
      const blob = new Blob([xml], { type: 'application/xml' });
      return okBlob(blob, 'application/xml', `${facture?.numero ?? 'TEIF'}.xml`);
    }
  }

  // ---------------- Paiements ----------------
  if (method === 'GET' && path === '/paiements') {
    const page = toNum(query.get('page'), 1);
    const parPage = toNum(query.get('parPage'), 20);
    const list = db.paiements.slice().sort((a: any, b: any) => String(b.datePaiement).localeCompare(String(a.datePaiement)));
    const paged = paginate(list, page, parPage);
    const totalPaye = list.reduce((s: number, p: any) => s + Number(p.montant ?? 0), 0);
    return ok({ ...paged, totalPaye: +totalPaye.toFixed(3) });
  }
  {
    const m = path.match(/^\/paiements\/facture\/([^/]+)$/);
    if (method === 'GET' && m) {
      const factureId = m[1];
      return ok(db.paiements.filter((p: any) => p.factureId === factureId));
    }
  }
  if (method === 'POST' && path === '/paiements') {
    const body = (req.body as any) ?? {};
    const allocationsIn = Array.isArray(body.allocations) && body.allocations.length
      ? body.allocations
      : [{ factureId: body.factureId, montant: body.montant }];
    const primary = db.factures.find((f: any) => f.id === allocationsIn[0]?.factureId);
    const paiement = {
      id: uid('PAY'),
      factureId: allocationsIn[0]?.factureId,
      factureNumero: primary?.numero ?? body.factureNumero ?? 'FAC-DEMO',
      montant: round3(Number(body.montant ?? allocationsIn.reduce((s: number, a: any) => s + Number(a.montant ?? 0), 0))),
      devise: body.devise ?? primary?.devise ?? 'TND',
      mode: body.mode ?? body.modePaiement ?? 'Virement',
      reference: body.reference ?? '',
      banque: body.banque ?? '',
      datePaiement: body.datePaiement ? iso(new Date(body.datePaiement)) : iso(new Date()),
      allocations: [] as any[],
      ecritures: [] as any[],
      creeLe: iso(new Date()),
    };
    db.paiements.unshift(paiement);
    for (const allocation of allocationsIn) {
      const facture = db.factures.find((f: any) => f.id === allocation.factureId);
      if (!facture) continue;
      const amount = round3(Number(allocation.montant ?? 0));
      facture.montantPaye = round3(Number(facture.montantPaye ?? 0) + amount);
      refreshPaymentStatus(facture);
      if (facture.statut === 'Payee') facture.datePaiement = paiement.datePaiement;
      facture.modifieLe = iso(new Date());
      facture.lettrageId = paiement.id;
      pushHistory(facture, 'Lettrage paiement', `Paiement ${paiement.reference || paiement.id}: ${amount.toFixed(3)} ${paiement.devise}`);
      paiement.allocations.push({
        factureId: facture.id,
        factureNumero: facture.numero,
        montant: amount,
        resteApresPaiement: facture.montantRestant,
        statutFacture: facture.statut,
      });
      paiement.ecritures.push(
        { compte: COMPTES.BANQUE, sens: 'debit', montant: amount, libelle: `Encaissement ${facture.numero}` },
        { compte: COMPTES.CLIENTS, sens: 'credit', montant: amount, libelle: `Lettrage client ${facture.clientNom}` },
      );
      const trx = {
        id: uid('TRX'),
        date: paiement.datePaiement,
        libelle: `Paiement ${facture.numero}`,
        description: `Lettrage automatique paiement ${paiement.id}`,
        tiersId: facture.clientId,
        tiersNom: facture.clientNom,
        tiersType: 'Client',
        categorieId: 'TRCAT-1',
        categorieNom: 'Encaissements',
        type: 'Entree',
        statut: 'Justifiee',
        statutJustificatif: 'Present',
        montant: amount,
        devise: paiement.devise,
        compte: COMPTES.BANQUE,
        documentLie: null,
        factureId: facture.id,
        paiementId: paiement.id,
        ecritures: paiement.ecritures.slice(-2),
        splits: [],
        comments: [],
        activities: [{ id: uid('ACT'), authorName: 'Systeme', action: 'Lettrage', description: `Paiement affecte a ${facture.numero}`, createdAt: iso(new Date()) }],
        creeLe: iso(new Date()),
        modifieLe: iso(new Date()),
      }
      db.transactions.unshift(trx);
    }
    return ok({ message: 'OK (demo)', paiement });
  }

  // ---------------- Clients ----------------
  if (method === 'GET' && path === '/clients') return ok(listClients(db, query));
  if (method === 'GET' && path === '/clients/rechercher') {
    const terme = query.get('terme')?.toLowerCase().trim() || '';
    const res = terme
      ? db.clients.filter((c: any) => c.nom.toLowerCase().includes(terme) || (c.email ?? '').toLowerCase().includes(terme)).slice(0, 15)
      : db.clients.slice(0, 15);
    return ok(res);
  }
  {
    const m = path.match(/^\/clients\/([^/]+)$/);
    if (method === 'GET' && m) {
      const found = db.clients.find((c: any) => c.id === m[1]);
      return found ? ok(clone(found)) : notFound('Client introuvable (demo)');
    }
    if (method === 'PUT' && m) {
      const found = db.clients.find((c: any) => c.id === m[1]);
      if (!found) return notFound('Client introuvable (demo)');
      Object.assign(found, req.body ?? {}, { modifieLe: iso(new Date()) });
      return ok(found);
    }
    if (method === 'POST' && m) {
      const suffix = path.split('/').slice(-1)[0];
      const id = m[1];
      const found = db.clients.find((c: any) => c.id === id);
      if (!found) return notFound('Client introuvable (demo)');
      if (suffix === 'desactiver') found.estActif = false;
      if (suffix === 'reactiver') found.estActif = true;
      found.modifieLe = iso(new Date());
      return ok({ message: 'OK (demo)' });
    }
  }
  if (method === 'POST' && path === '/clients') {
    const body = (req.body as any) ?? {};
    const created = {
      id: uid('CL'),
      nom: body.nom ?? 'Nouveau client',
      email: body.email ?? `client${seq}@demo.tn`,
      typeClient: body.typeClient ?? 'Entreprise',
      matriculeFiscal: body.matriculeFiscal,
      adresse: body.adresse,
      ville: body.ville,
      codePostal: body.codePostal,
      pays: body.pays ?? 'TN',
      telephone: body.telephone,
      estActif: true,
      creeLe: iso(new Date()),
      modifieLe: iso(new Date()),
      entrepriseId: db.entreprise['id'],
    };
    db.clients.unshift(created);
    return ok(created);
  }

  // ---------------- Produits & Categories ----------------
  if (method === 'GET' && path === '/produits') return ok(listProduits(db, query));
  if (method === 'GET' && path === '/produits/rechercher') {
    const terme = query.get('terme')?.toLowerCase().trim() || '';
    const res = terme
      ? db.produits.filter((p: any) => p.libelle.toLowerCase().includes(terme) || (p.code ?? '').toLowerCase().includes(terme)).slice(0, 20)
      : db.produits.slice(0, 20);
    return ok(res);
  }
  {
    const m = path.match(/^\/produits\/([^/]+)$/);
    if (method === 'GET' && m) {
      const found = db.produits.find((p: any) => p.id === m[1]);
      return found ? ok(clone(found)) : notFound('Produit introuvable (demo)');
    }
    if (method === 'PUT' && m) {
      const found = db.produits.find((p: any) => p.id === m[1]);
      if (!found) return notFound('Produit introuvable (demo)');
      Object.assign(found, req.body ?? {}, { modifieLe: iso(new Date()) });
      return ok(found);
    }
    if (method === 'POST' && m) {
      const suffix = path.split('/').slice(-1)[0];
      const found = db.produits.find((p: any) => p.id === m[1]);
      if (!found) return notFound('Produit introuvable (demo)');
      if (suffix === 'desactiver') found.estActif = false;
      if (suffix === 'reactiver') found.estActif = true;
      found.modifieLe = iso(new Date());
      return ok({ message: 'OK (demo)' });
    }
  }
  if (method === 'POST' && path === '/produits') {
    const body = (req.body as any) ?? {};
    const cat = db.categories.find((c: any) => c.id === body.categorieId) ?? db.categories[0];
    const created = {
      id: uid('PR'),
      code: body.code ?? `PR-${String(1000 + seq).slice(-4)}`,
      libelle: body.libelle ?? 'Nouveau produit',
      description: body.description ?? '',
      prixUnitaire: Number(body.prixUnitaire ?? 0),
      tauxTva: Number(body.tauxTva ?? 19),
      unite: body.unite ?? 'U',
      type: body.type ?? 'Service',
      estActif: true,
      categorieId: cat?.id,
      categorieNom: cat?.nom,
      entrepriseId: db.entreprise['id'],
      creeLe: iso(new Date()),
      modifieLe: iso(new Date()),
    };
    db.produits.unshift(created);
    return ok(created);
  }

  if (method === 'GET' && path === '/categories') return ok(db.categories.map(c => ({ ...c })));
  if (method === 'POST' && path === '/categories') {
    const body = (req.body as any) ?? {};
    const created = {
      id: uid('CAT'),
      nom: body.nom ?? 'Nouvelle categorie',
      description: body.description ?? '',
      estActive: true,
      nbProduits: 0,
      entrepriseId: db.entreprise['id'],
      creeLe: iso(new Date()),
    };
    db.categories.unshift(created);
    return ok(created);
  }
  {
    const m = path.match(/^\/categories\/([^/]+)$/);
    if (method === 'PUT' && m) {
      const found = db.categories.find((c: any) => c.id === m[1]);
      if (!found) return notFound('Categorie introuvable (demo)');
      Object.assign(found, req.body ?? {});
      return ok(found);
    }
    if (method === 'POST' && path.endsWith('/desactiver') && m) {
      const found = db.categories.find((c: any) => c.id === m[1]);
      if (!found) return notFound('Categorie introuvable (demo)');
      found.estActive = false;
      return ok({ message: 'OK (demo)' });
    }
  }

  // ---------------- Utilisateurs ----------------
  if (method === 'GET' && path === '/utilisateurs') return ok(db.users.map(u => ({ ...u })));
  {
    const m = path.match(/^\/utilisateurs\/([^/]+)$/);
    if (method === 'GET' && m) {
      const u = db.users.find(x => x.id === m[1]);
      return u ? ok(clone(u)) : notFound('Utilisateur introuvable (demo)');
    }
    if (method === 'PUT' && m) {
      const u = db.users.find(x => x.id === m[1]);
      if (!u) return notFound('Utilisateur introuvable (demo)');
      Object.assign(u, req.body ?? {});
      return ok(u);
    }
    if (method === 'DELETE' && m) {
      db.users = db.users.filter(x => x.id !== m[1]);
      return ok({ message: 'OK (demo)' });
    }
    if (method === 'POST' && path.endsWith('/suspendre') && m) {
      const u = db.users.find(x => x.id === m[1]);
      if (u) u.statut = 'Suspendu';
      return ok({ message: 'OK (demo)' });
    }
    if (method === 'POST' && path.endsWith('/reactiver') && m) {
      const u = db.users.find(x => x.id === m[1]);
      if (u) u.statut = 'Actif';
      return ok({ message: 'OK (demo)' });
    }
    if (method === 'POST' && path.endsWith('/changer-mot-de-passe') && m) {
      return ok({ message: 'OK (demo)' });
    }
    if (method === 'GET' && path.endsWith('/sessions') && m) {
      const sessions = [
        { id: 'S-1', appareil: 'Chrome (Windows)', ip: '197.0.0.10', userAgent: 'Mozilla/5.0', creeLe: iso(new Date(Date.now() - 7 * 864e5)), derniereActivite: iso(new Date()), estCourante: true },
        { id: 'S-2', appareil: 'Mobile (Android)', ip: '197.0.0.11', userAgent: 'Mozilla/5.0', creeLe: iso(new Date(Date.now() - 14 * 864e5)), derniereActivite: iso(new Date(Date.now() - 2 * 864e5)), estCourante: false },
      ];
      return ok(sessions);
    }
  }
  {
    const m = path.match(/^\/utilisateurs\/([^/]+)\/sessions\/([^/]+)$/);
    if (method === 'DELETE' && m) return ok({ message: 'OK (demo)' });
  }
  if (method === 'DELETE' && path.match(/^\/utilisateurs\/([^/]+)\/sessions$/)) return ok({ message: 'OK (demo)' });
  if (method === 'POST' && path === '/utilisateurs') {
    const body = (req.body as any) ?? {};
    const created = {
      id: uid('USR'),
      prenom: body.prenom ?? 'Prenom',
      nom: body.nom ?? 'Nom',
      email: body.email ?? `user${seq}@demo.tn`,
      role: body.role ?? 'ResponsableFinancier',
      statut: 'Actif',
      deuxFAActif: false,
      entrepriseId: db.entreprise['id'],
      derniereConnexion: iso(new Date()),
    };
    db.users.unshift(created);
    return ok(created);
  }

  // ---------------- Entreprise & Personnalisation ----------------
  if (method === 'GET' && path === '/entreprises') return ok(db.adminEntreprises.map(e => ({ id: e.id, nom: e.raisonSociale, matriculeFiscal: e.matriculeFiscal })));
  {
    const m = path.match(/^\/entreprises\/([^/]+)$/);
    if (method === 'GET' && m) return ok(m[1] === db.entreprise['id'] ? clone(db.entreprise) : { id: m[1], nom: 'Entreprise', matriculeFiscal: '' });
    if (method === 'PUT' && m) {
      if (m[1] === db.entreprise['id']) Object.assign(db.entreprise, req.body ?? {});
      return ok({ message: 'OK (demo)' });
    }
  }
  {
    const m = path.match(/^\/entreprises\/([^/]+)\/teif$/);
    if (method === 'PUT' && m) return ok({ message: 'OK (demo)' });
  }

  if (method === 'GET' && path === '/personnalisation') return ok(clone(db.personnalisation));
  if (method === 'PUT' && path === '/personnalisation') {
    const body = (req.body as any) ?? {};
    db.personnalisation = { ...db.personnalisation, donnees: body.donnees ?? body, modifieLe: iso(new Date()) };
    return ok(clone(db.personnalisation));
  }

  // ---------------- Taxes & Parametres fiscaux ----------------
  if (method === 'GET' && path === '/taxes') {
    const search = String(query.get('search') ?? '').trim().toLowerCase();
    const type = String(query.get('type') ?? '').trim();
    const actifRaw = query.get('estActif');
    const estActif = actifRaw === null ? null : toBool(actifRaw);
    const items = db.taxes.filter((t: any) => {
      const matchesSearch = !search || String(t.titre ?? '').toLowerCase().includes(search);
      const matchesType = !type || type === 'Tous' || String(t.type ?? '') === type;
      const matchesActif = estActif === null || estActif === undefined || Boolean(t.estActif ?? true) === estActif;
      return matchesSearch && matchesType && matchesActif;
    });
    return ok(items.map(t => ({ ...t })));
  }
  if (method === 'POST' && path === '/taxes') {
    const body = (req.body as any) ?? {};
    const created = {
      id: uid('TX'),
      entrepriseId: db.entreprise['id'],
      titre: body.titre ?? 'Taxe',
      taux: Number(body.taux ?? 0),
      type: body.type ?? 'Tva',
      codeTEIF: body.codeTEIF ?? body.codeTeif ?? 'S',
      dateEffet: body.dateEffet ?? iso(new Date()).slice(0, 10),
      estActif: body.estActif ?? true,
      nombreUtilisations: 0,
      description: body.description,
      creeLe: iso(new Date()),
      modifieLe: iso(new Date())
    };
    db.taxes.unshift(created);
    return ok(created);
  }
  {
    const m = path.match(/^\/taxes\/([^/]+)\/toggle-actif$/);
    if (method === 'PUT' && m) {
      const t = db.taxes.find(x => x.id === m[1]);
      if (!t) return notFound('Taxe introuvable (demo)');
      t.estActif = !(t.estActif ?? true);
      t.modifieLe = iso(new Date());
      return ok({ ...t });
    }
  }
  {
    const m = path.match(/^\/taxes\/([^/]+)\/utilisations$/);
    if (method === 'GET' && m) {
      const t = db.taxes.find(x => x.id === m[1]);
      if (!t) return notFound('Taxe introuvable (demo)');
      const count = Number(t.nombreUtilisations ?? 0);
      return ok({ taxeId: t.id, nombreUtilisations: count, peutSupprimer: count === 0 });
    }
  }
  {
    const m = path.match(/^\/taxes\/([^/]+)$/);
    if (method === 'PUT' && m) {
      const t = db.taxes.find(x => x.id === m[1]);
      if (!t) return notFound('Taxe introuvable (demo)');
      Object.assign(t, req.body ?? {}, { modifieLe: iso(new Date()) });
      return ok(t);
    }
    if (method === 'DELETE' && m) {
      const t = db.taxes.find(x => x.id === m[1]);
      const count = Number(t?.nombreUtilisations ?? 0);
      if (count > 0) {
        return conflict({
          message: `Suppression impossible : cette taxe est utilisée dans ${count} facture(s).`,
          nombreUtilisations: count
        });
      }
      db.taxes = db.taxes.filter(x => x.id !== m[1]);
      return ok({ message: 'OK (demo)' });
    }
  }

  if (method === 'GET' && path === '/parametres-fiscaux') {
    const search = String(query.get('search') ?? '').trim().toLowerCase();
    const type = query.get('type');
    const utilisation = query.get('utilisation');
    const estActif = toBool(query.get('estActif'));
    const typeFournisseur = query.get('typeFournisseur');
    const dateDebut = query.get('dateDebut');
    const dateFin = query.get('dateFin');
    let rows = db.parametresFiscaux.map(p => ({ ...p }));
    if (search) {
      rows = rows.filter(p =>
        String(p.libelle ?? '').toLowerCase().includes(search) ||
        String(p.codeDGI ?? '').toLowerCase().includes(search)
      );
    }
    if (type) rows = rows.filter(p => String(p.type ?? '') === type);
    if (utilisation) rows = rows.filter(p => String(p.utilisation ?? '') === utilisation);
    if (estActif !== undefined) rows = rows.filter(p => !!p.estActif === estActif);
    if (typeFournisseur) rows = rows.filter(p => String(p.typeFournisseur ?? 'Tous') === typeFournisseur || String(p.typeFournisseur ?? 'Tous') === 'Tous');
    if (dateDebut) rows = rows.filter(p => String(p.dateEffet ?? '').slice(0, 10) >= dateDebut);
    if (dateFin) rows = rows.filter(p => String(p.dateEffet ?? '').slice(0, 10) <= dateFin);
    return ok(rows);
  }
  if (method === 'POST' && path === '/parametres-fiscaux') {
    const body = (req.body as any) ?? {};
    const created = {
      id: uid('PF'),
      entrepriseId: db.entreprise['id'],
      libelle: body.libelle ?? 'Paramètre fiscal',
      valeur: Number(body.valeur ?? 0),
      type: body.type ?? 'Pourcentage',
      signe: body.signe ?? 'Positif',
      ordreCalcul: body.ordreCalcul ?? 'AvantTva',
      utilisation: body.utilisation ?? 'Manuel',
      codeDGI: body.codeDGI ?? body.codeDgi ?? '',
      typeFournisseur: body.typeFournisseur ?? 'Tous',
      seuilMinimum: body.seuilMinimum ?? null,
      dateEffet: body.dateEffet ?? todayIso(),
      inclureRetenueSource: !!(body.inclureRetenueSource ?? body.inclureRS),
      inclureRS: !!(body.inclureRS ?? body.inclureRetenueSource),
      documentsCibles: body.documentsCibles ?? [],
      nombreUtilisations: 0,
      estActif: body.estActif ?? true,
      creeLe: iso(new Date()),
      modifieLe: iso(new Date()),
    };
    db.parametresFiscaux.unshift(created);
    return ok(created);
  }
  {
    const m = path.match(/^\/parametres-fiscaux\/([^/]+)\/toggle-actif$/);
    if (method === 'PUT' && m) {
      const p = db.parametresFiscaux.find(x => x.id === m[1]);
      if (!p) return notFound('Paramètre fiscal introuvable (demo)');
      p.estActif = !(p.estActif ?? true);
      p.modifieLe = iso(new Date());
      return ok({ ...p });
    }
  }
  {
    const m = path.match(/^\/parametres-fiscaux\/([^/]+)\/utilisations$/);
    if (method === 'GET' && m) {
      const p = db.parametresFiscaux.find(x => x.id === m[1]);
      if (!p) return notFound('Paramètre fiscal introuvable (demo)');
      const count = Number(p.nombreUtilisations ?? 0);
      return ok({ parametreFiscalId: p.id, nombreUtilisations: count, peutSupprimer: count === 0 });
    }
  }
  {
    const m = path.match(/^\/parametres-fiscaux\/([^/]+)$/);
    if (method === 'PUT' && m) {
      const p = db.parametresFiscaux.find(x => x.id === m[1]);
      if (!p) return notFound('Paramètre fiscal introuvable (demo)');
      const body = (req.body as any) ?? {};
      Object.assign(p, body, {
        inclureRetenueSource: !!(body.inclureRetenueSource ?? body.inclureRS ?? p.inclureRetenueSource),
        inclureRS: !!(body.inclureRS ?? body.inclureRetenueSource ?? p.inclureRS),
        modifieLe: iso(new Date())
      });
      return ok({ ...p });
    }
    if (method === 'DELETE' && m) {
      const p = db.parametresFiscaux.find(x => x.id === m[1]);
      const count = Number(p?.nombreUtilisations ?? 0);
      if (count > 0) {
        return conflict({
          message: `Suppression impossible : ce paramètre fiscal est utilisé dans ${count} facture(s).`,
          nombreUtilisations: count
        });
      }
      db.parametresFiscaux = db.parametresFiscaux.filter(x => x.id !== m[1]);
      return ok({ message: 'OK (demo)' });
    }
  }

  // ---------------- Rapports ----------------
  if (method === 'GET' && path === '/rapports/tva-par-taux') {
    const map = new Map<number, any>();
    db.factures
      .filter((f: any) => ['Facture', 'Avoir', 'Facture achat'].includes(normalizeDocType(f.typeFacture)))
      .forEach((f: any) => (f.lignes ?? []).forEach((l: any) => {
        const taux = Number(l.tauxTva ?? 0);
        const sign = normalizeDocType(f.typeFacture) === 'Avoir' ? -1 : 1;
        const prev = map.get(taux) ?? { tauxTva: taux, baseHt: 0, montantTva: 0, montantTtc: 0, tvaCollectee: 0, tvaDeductible: 0 };
        prev.baseHt += sign * Number(l.montantHt ?? 0);
        prev.montantTva += sign * Number(l.montantTva ?? 0);
        prev.montantTtc += sign * Number(l.montantTtc ?? 0);
        if (normalizeDocType(f.typeFacture) === 'Facture achat') prev.tvaDeductible += Number(l.montantTva ?? 0);
        else prev.tvaCollectee += sign * Number(l.montantTva ?? 0);
        map.set(taux, prev);
      }));
    const rows = Array.from(map.values()).map((r: any) => ({
      ...r,
      baseHt: round3(r.baseHt),
      montantTva: round3(r.montantTva),
      montantTtc: round3(r.montantTtc),
      tvaCollectee: round3(r.tvaCollectee),
      tvaDeductible: round3(r.tvaDeductible),
      tvaNette: round3(r.tvaCollectee - r.tvaDeductible),
    })).sort((a, b) => b.tauxTva - a.tauxTva);
    return ok(rows);
  }
  if (method === 'GET' && path === '/rapports/delais-paiement') {
    const rows = db.clients.slice(0, 6).map((c: any, idx: number) => ({
      clientId: c.id,
      clientNom: c.nom,
      nbFactures: 6 + idx,
      delaiMoyenJours: 12 + idx * 3,
    }));
    return ok(rows);
  }
  if (method === 'GET' && path === '/rapports/recap-mensuel') {
    const now = new Date();
    const rows = Array.from({ length: 6 }).map((_, i) => {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (5 - i), 1));
      const month = d.toISOString().slice(0, 7);
      const list = db.factures.filter((f: any) => ['Facture', 'Avoir', 'Facture achat'].includes(normalizeDocType(f.typeFacture)) && String(f.dateEmission).slice(0, 7) === month);
      const signed = (f: any, field: string) => (normalizeDocType(f.typeFacture) === 'Avoir' ? -1 : 1) * Number(f[field] ?? 0);
      const totalTtc = list.reduce((s: number, f: any) => s + signed(f, 'totalTtc'), 0);
      const totalHt = list.reduce((s: number, f: any) => s + signed(f, 'totalHt'), 0);
      const totalTva = list.reduce((s: number, f: any) => s + signed(f, 'totalTva'), 0);
      const montantPaye = db.paiements.filter((p: any) => String(p.datePaiement).slice(0, 7) === month).reduce((s: number, p: any) => s + Number(p.montant ?? 0), 0);
      const montantImpaye = Math.max(0, totalTtc - montantPaye);
      const tauxRecouvrement = totalTtc ? Math.round((montantPaye / totalTtc) * 100) : 0;
      const totalAvoirs = list.filter((f: any) => normalizeDocType(f.typeFacture) === 'Avoir').reduce((s: number, f: any) => s + Number(f.totalTtc ?? 0), 0);
      const transactions = db.transactions.filter((t: any) => String(t.date).slice(0, 7) === month).reduce((s: number, t: any) => s + (t.type === 'Entree' ? 1 : -1) * Number(t.montant ?? 0), 0);
      return { mois: monthLabel(d), nbFactures: list.length, totalHt: round3(totalHt), totalTva: round3(totalTva), totalTtc: round3(totalTtc), montantPaye: round3(montantPaye), montantImpaye: round3(montantImpaye), tauxRecouvrement, totalAvoirs: round3(totalAvoirs), soldeTransactions: round3(transactions) };
    });
    return ok(rows);
  }

  // ---------------- OCR / Expenses ----------------
  if (method === 'GET' && path === '/expenses/pending-review') {
    const page = toNum(query.get('page'), 1);
    const parPage = toNum(query.get('parPage'), 20);
    const recherche = query.get('recherche')?.trim().toLowerCase() || '';
    let items = db.transactions.filter((t: any) => t.source === 'MobileApp' || t.documentType);
    if (recherche) {
      items = items.filter((t: any) =>
        String(t.libelle ?? '').toLowerCase().includes(recherche) ||
        String(t.tiersNom ?? '').toLowerCase().includes(recherche) ||
        String(t.documentType ?? '').toLowerCase().includes(recherche)
      );
    }
    items.sort((a: any, b: any) => String(b.date).localeCompare(String(a.date)));
    return ok(paginate(items, page, parPage));
  }
  {
    const m = path.match(/^\/expenses\/([^/]+)$/);
    if (method === 'GET' && m) {
      const t = db.transactions.find((x: any) => x.id === m[1]);
      return t ? ok(clone(t)) : notFound('Transaction OCR introuvable (demo)');
    }
  }
  {
    const m = path.match(/^\/expenses\/([^/]+)\/receipt-review$/);
    if (method === 'PUT' && m) {
      const t = db.transactions.find((x: any) => x.id === m[1]);
      if (!t) return notFound('Transaction OCR introuvable (demo)');
      const b = (req.body as any) ?? {};
      t.reviewFields = Array.isArray(b.fields) ? b.fields : t.reviewFields;
      t.libelle = b.libelle ?? t.libelle;
      t.date = b.date ? iso(new Date(b.date)) : t.date;
      t.montant = b.montant == null ? t.montant : Number(b.montant);
      t.tiersNom = b.tiersNom ?? t.tiersNom;
      t.fournisseurId = b.fournisseurId ?? t.fournisseurId;
      t.fournisseurMatriculeFiscal = b.fournisseurMatriculeFiscal ?? t.fournisseurMatriculeFiscal;
      t.missingFieldKeys = [];
      t.statut = 'EnAttente';
      t.modifieLe = iso(new Date());
      return ok(t);
    }
  }
  {
    const m = path.match(/^\/expenses\/([^/]+)\/categorize$/);
    if (method === 'PUT' && m) {
      const t = db.transactions.find((x: any) => x.id === m[1]);
      if (!t) return notFound('Transaction OCR introuvable (demo)');
      const b = (req.body as any) ?? {};
      t.categorieNom = b.categorieNom ?? t.categorieNom;
      t.allocations = b.allocations ?? t.allocations;
      t.accountingPeriodLabel = b.accountingPeriodLabel ?? t.accountingPeriodLabel;
      t.recoverableVatAmount = b.recoverableVatAmount ?? t.recoverableVatAmount;
      t.recoverableVatRate = b.recoverableVatRate ?? t.recoverableVatRate;
      t.modifieLe = iso(new Date());
      return ok(t);
    }
  }
  {
    const m = path.match(/^\/expenses\/([^/]+)\/approve$/);
    if (method === 'PUT' && m) {
      const t = db.transactions.find((x: any) => x.id === m[1]);
      if (!t) return notFound('Transaction OCR introuvable (demo)');
      const client = db.clients.find((c: any) => c.nom === t.tiersNom) ?? db.clients[0];
      const totalTtc = Number(t.montant ?? 0);
      const tauxTva = Number(t.recoverableVatRate ?? 19);
      const ht = round3(totalTtc / (1 + tauxTva / 100));
      const factureAchat = {
        id: uid('FAC'),
        numero: `${docPrefix('Facture achat')}-${new Date().getFullYear()}-${String(10000 + seq).slice(-5)}`,
        clientId: client.id,
        clientNom: t.tiersNom ?? client.nom,
        clientMatriculeFiscal: t.fournisseurMatriculeFiscal,
        reference: t.documentLie?.fileName ?? '',
        statut: 'Validee',
        typeFacture: 'Facture achat',
        typeVente: 'Achat',
        modePaiement: 'Virement',
        devise: t.devise ?? 'TND',
        dateEmission: t.date,
        dateEcheance: iso(new Date(new Date(t.date).getTime() + 30 * 864e5)),
        datePaiement: null,
        lignes: [{
          id: uid('LIG'),
          ordre: 1,
          designation: t.libelle,
          description: 'Cree depuis validation OCR',
          unite: 'U',
          quantite: 1,
          prixUnitaire: ht,
          tauxRemise: 0,
          tauxTva,
          montantHt: ht,
          montantRemise: 0,
          montantTva: round3(totalTtc - ht),
          montantTtc: round3(totalTtc),
        }],
        montantPaye: 0,
        montantRestant: totalTtc,
        estEnRetard: false,
        notes: 'Piece creee automatiquement depuis OCR.',
        xmlGenere: false,
        historique: [],
        creeLe: iso(new Date()),
        modifieLe: iso(new Date()),
      };
      applyFiscalParams(db, factureAchat);
      pushHistory(factureAchat, 'Validation OCR', `Transaction ${t.id} enrichie et liee`);
      db.factures.unshift(factureAchat);
      t.factureId = factureAchat.id;
      t.statut = 'Justifiee';
      t.statutJustificatif = 'Present';
      t.compte = COMPTES.FOURNISSEURS;
      t.ecritures = [
        { compte: COMPTES.ACHATS_MARCHANDISES, sens: 'debit', montant: ht, libelle: 'Achat HT' },
        { compte: COMPTES.TVA_DEDUCTIBLE, sens: 'debit', montant: round3(totalTtc - ht), libelle: 'TVA deductible' },
        { compte: COMPTES.FOURNISSEURS, sens: 'credit', montant: round3(totalTtc), libelle: `Dette fournisseur ${t.tiersNom ?? ''}` },
      ];
      t.activities = [...(t.activities ?? []), { id: uid('ACT'), authorName: 'Systeme', action: 'Validation OCR', description: `Facture achat ${factureAchat.numero} creee`, createdAt: iso(new Date()) }];
      t.modifieLe = iso(new Date());
      return ok(t);
    }
  }
  {
    const m = path.match(/^\/expenses\/([^/]+)\/comments$/);
    if (method === 'POST' && m) {
      const t = db.transactions.find((x: any) => x.id === m[1]);
      if (!t) return notFound('Transaction OCR introuvable (demo)');
      t.comments = [...(t.comments ?? []), { id: uid('COM'), authorName: 'Demo', message: (req.body as any)?.message ?? '', createdAt: iso(new Date()) }];
      return ok(t);
    }
  }
  if (method === 'GET' && path === '/fournisseurs/search') {
    const term = query.get('term')?.toLowerCase() ?? '';
    const names = Array.from(new Set(db.transactions.map((t: any) => t.tiersNom).filter(Boolean)));
    return ok(names.filter((n: any) => String(n).toLowerCase().includes(term)).slice(0, 8).map((n: any, i: number) => ({
      id: `FOU-${i + 1}`, nom: n, matriculeFiscal: `MF-${1000 + i}/A/M/000`, adresse: 'Tunisie', iban: null, score: 0.8, exact: i === 0,
    })));
  }
  if (method === 'POST' && path === '/fournisseurs/match-or-create') {
    const b = (req.body as any) ?? {};
    return ok({ matched: !!b.nom, autoSelected: true, created: !!b.createIfMissing, matchType: 'demo', fournisseurId: b.selectedSupplierId ?? uid('FOU'), displayName: b.nom ?? 'Fournisseur', matriculeFiscal: b.matriculeFiscal ?? null, candidates: [] });
  }

  // ---------------- Transactions ----------------
  if (method === 'GET' && path === '/transactions') return ok(listTransactions(db, query));
  if (method === 'GET' && path === '/transactions/counters') {
    const list = listTransactions(db, query).items;
    return ok(computeTransactionCounters(list));
  }
  if (method === 'GET' && path === '/transactions/summary/categories') {
    const all = listTransactions(db, query).items;
    return ok(summarizeTransactionsByCategory(all));
  }
  {
    const m = path.match(/^\/transactions\/([^/]+)$/);
    if (method === 'GET' && m) {
      const t = db.transactions.find(x => x.id === m[1]);
      return t ? ok(clone(t)) : notFound('Transaction introuvable (demo)');
    }
    if (method === 'PUT' && m) {
      const t = db.transactions.find(x => x.id === m[1]);
      if (!t) return notFound('Transaction introuvable (demo)');
      Object.assign(t, req.body ?? {}, { modifieLe: iso(new Date()) });
      return ok(t);
    }
    if (method === 'DELETE' && m) {
      db.transactions = db.transactions.filter(x => x.id !== m[1]);
      return ok({ message: 'OK (demo)' });
    }
  }
  if (method === 'POST' && path === '/transactions') {
    const b = (req.body as any) ?? {};
    const mapType = (v: any) => (v === 0 ? 'Entree' : v === 1 ? 'Sortie' : (v === 'Entree' || v === 'Sortie' ? v : 'Sortie'));
    const created = {
      id: uid('TRX'),
      date: b.date ? iso(new Date(b.date)) : iso(new Date()),
      libelle: b.libelle ?? 'Transaction',
      description: b.description ?? null,
      tiersId: null,
      tiersNom: b.tiersNom ?? null,
      tiersType: b.tiersNom ? (mapType(b.type) === 'Entree' ? 'Client' : 'Fournisseur') : null,
      categorieId: null,
      categorieNom: b.categorieNom ?? null,
      type: mapType(b.type),
      statut: 'NonJustifiee',
      statutJustificatif: null,
      montant: Number(b.montant ?? 0),
      devise: b.devise ?? 'TND',
      compte: b.compte ?? null,
      documentLie: null,
      factureId: b.factureId ?? null,
      splits: [],
      comments: [],
      creeLe: iso(new Date()),
      modifieLe: iso(new Date()),
    };
    db.transactions.unshift(created);
    return ok(created);
  }
  {
    const m = path.match(/^\/transactions\/([^/]+)\/receipt$/);
    if (method === 'POST' && m) {
      const t = db.transactions.find(x => x.id === m[1]);
      if (!t) return notFound('Transaction introuvable (demo)');
      let fileName = 'receipt.pdf';
      let contentType = 'application/pdf';
      let sizeBytes = 0;
      if (req.body instanceof FormData) {
        const file = req.body.get('file') as any;
        if (file && typeof file.name === 'string') fileName = file.name;
        if (file && typeof file.type === 'string' && file.type) contentType = file.type;
        if (file && typeof file.size === 'number') sizeBytes = file.size;
      }
      t.documentLie = { id: uid('DOC'), fileName, contentType, sizeBytes, url: '/EY.png' };
      t.statutJustificatif = 'Present';
      t.modifieLe = iso(new Date());
      return ok(t);
    }
  }
  {
    const m = path.match(/^\/transactions\/([^/]+)\/link-invoice$/);
    if (method === 'POST' && m) {
      const t = db.transactions.find(x => x.id === m[1]);
      if (!t) return notFound('Transaction introuvable (demo)');
      t.factureId = (req.body as any)?.invoiceId ?? null;
      t.modifieLe = iso(new Date());
      return ok(t);
    }
  }
  if (method === 'GET' && path === '/transactions/export/csv') {
    const list = listTransactions(db, query).items;
    const rows = [
      ['Date', 'Type', 'Statut', 'Categorie', 'Libelle', 'Montant', 'Devise'],
      ...list.map((t: any) => [
        String(t.date).slice(0, 10),
        t.type,
        t.statut,
        t.categorieNom ?? '',
        (t.libelle ?? '').replace(/,/g, ' '),
        t.montant,
        t.devise,
      ]),
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    return okBlob(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), 'text/csv', `transactions-${todayIso()}.xlsx`);
  }
  if (method === 'GET' && path === '/transactions/export/pdf') {
    const list = listTransactions(db, query).items.slice(0, 12);
    const blob = buildSimplePdf([
      'Transactions (DEMO)',
      ...list.map((t: any) => `${String(t.date).slice(0, 10)} - ${t.type} - ${t.libelle} - ${t.montant} ${t.devise}`),
    ]);
    return okBlob(blob, 'application/pdf', `transactions-${todayIso()}.pdf`);
  }

  // ---------------- Signature & TTN (stubs) ----------------
  if (method === 'POST' && path === '/signatures/demander') {
    const factureId = (req.body as any)?.factureId;
    const facture = db.factures.find((f: any) => f.id === factureId);
    if (facture) {
      facture.signatureId = uid('SIG');
      facture.workflowTeif = { ...(facture.workflowTeif ?? {}), xml: facture.xmlGenere ? 'Genere' : 'A generer', signature: 'Signee', ttn: 'Pret' };
      pushHistory(facture, 'Signature', 'Facture signee electroniquement');
    }
    return ok({ signatureId: facture?.signatureId ?? uid('SIG'), statut: 'Signee' });
  }
  {
    const m = path.match(/^\/signatures\/facture\/([^/]+)$/);
    if (method === 'GET' && m) return ok({ factureId: m[1], statut: 'EnAttente', signatureId: `SIG-${m[1]}` });
  }
  {
    const m = path.match(/^\/signatures\/([^/]+)\/relancer$/);
    if (method === 'POST' && m) return ok({ message: 'OK (demo)' });
  }

  if (method === 'POST' && path === '/ttn/envoyer') {
    const factureId = (req.body as any)?.factureId;
    const f = db.factures.find((x: any) => x.id === factureId);
    if (f) {
      f.statut = 'Transmise';
      f.workflowTeif = { ...(f.workflowTeif ?? {}), xml: f.xmlGenere ? 'Genere' : 'A generer', signature: f.signatureId ? 'Signee' : 'A signer', ttn: 'Transmise' };
      f.modifieLe = iso(new Date());
      pushHistory(f, 'Transmission TTN', 'Facture transmise au circuit fiscal');
    }
    return ok({ echangeId: uid('ECH'), statut: 'Transmise' });
  }
  {
    const m = path.match(/^\/ttn\/facture\/([^/]+)$/);
    if (method === 'GET' && m) {
      const f = db.factures.find((x: any) => x.id === m[1]);
      return ok({ factureId: m[1], statut: f?.workflowTeif?.ttn ?? 'NonTransmise', workflow: f?.workflowTeif ?? null });
    }
  }
  {
    const m = path.match(/^\/ttn\/([^/]+)\/simuler\/([^/]+)$/);
    if (method === 'POST' && m) return ok({ message: 'OK (demo)', echangeId: m[1], scenario: m[2] });
  }
  {
    const m = path.match(/^\/ttn\/([^/]+)\/relancer$/);
    if (method === 'POST' && m) return ok({ message: 'OK (demo)' });
  }

  // ---------------- Calendrier ----------------
  if (method === 'GET' && path === '/calendrier/events') {
    const events: any[] = [];
    const now = new Date();
    db.factures
      .filter((f: any) => normalizeDocType(f.typeFacture) === 'Facture' && f.montantRestant > 0)
      .slice(0, 80)
      .forEach((f: any) => {
        const echeance = String(f.dateEcheance ?? '').slice(0, 10);
        events.push({
          id: `INV-${f.id}`,
          title: `Echeance ${f.numero}`,
          date: echeance,
          type: new Date(echeance).getTime() < now.getTime() ? 'overdue' : 'invoice',
          linkedClientName: f.clientNom,
          linkedAmount: f.montantRestant ?? f.netAPayer ?? f.totalTtc,
          reminderMinutes: 1440,
        });
        if (new Date(echeance).getTime() < now.getTime()) {
          const reminder = new Date(echeance);
          reminder.setDate(reminder.getDate() + 7);
          events.push({
            id: `REL-${f.id}`,
            title: `Relance impayee ${f.numero}`,
            date: reminder.toISOString().slice(0, 10),
            type: 'overdue',
            linkedClientName: f.clientNom,
            linkedAmount: f.montantRestant,
          });
        }
      });
    for (let i = 0; i < 6; i++) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + i, 28));
      events.push({ id: `RS-${i}`, title: `Declaration RS ${monthLabel(d)}`, date: d.toISOString().slice(0, 10), type: 'fiscal', startTime: '09:00' });
      const tva = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + i, 15));
      events.push({ id: `TVA-${i}`, title: `Declaration TVA ${monthLabel(tva)}`, date: tva.toISOString().slice(0, 10), type: 'fiscal', startTime: '09:00' });
    }
    return ok(events);
  }
  if (method === 'GET' && path === '/calendrier/tasks') {
    const tasks = db.factures
      .filter((f: any) => normalizeDocType(f.typeFacture) === 'Facture' && f.estEnRetard)
      .slice(0, 20)
      .map((f: any, i: number) => ({
        id: `TASK-${f.id}`,
        title: `Relancer ${f.clientNom} pour ${f.numero}`,
        date: new Date(Date.now() + i * 864e5).toISOString().slice(0, 10),
        done: false,
        priority: 'high',
      }));
    return ok(tasks);
  }
  if (method === 'POST' && path === '/calendrier/events') {
    const b = (req.body as any) ?? {};
    return ok({ id: uid('CAL'), ...b });
  }
  if (method === 'POST' && path === '/calendrier/tasks') {
    const b = (req.body as any) ?? {};
    return ok({ id: uid('TASK'), done: false, priority: b.priority ?? 'normal', ...b });
  }
  if (method === 'PATCH' && path.match(/^\/calendrier\/tasks\/([^/]+)$/)) return ok({ id: path.split('/').pop(), done: (req.body as any)?.done ?? true, title: 'Tache', date: todayIso(), priority: 'normal' });
  if (method === 'DELETE' && path.match(/^\/calendrier\/(events|tasks)\/([^/]+)$/)) return ok({ message: 'OK (demo)' });

  // ---------------- Admin ----------------
  if (method === 'GET' && path === '/admin/audit') return ok(db.auditLogs.map(x => ({ ...x })));
  if (method === 'GET' && path === '/admin/entreprises') return ok(db.adminEntreprises.map(x => ({ ...x })));
  {
    const m = path.match(/^\/admin\/entreprises\/([^/]+)\/statut$/);
    if (method === 'PATCH' && m) {
      const e = db.adminEntreprises.find(x => x.id === m[1]);
      if (e) e.estActive = !!(req.body as any)?.estActive;
      return ok({ message: 'OK (demo)' });
    }
  }
  if (method === 'GET' && path === '/admin/factures') {
    const list = db.factures
      .filter((f: any) => f.typeFacture === 'Facture')
      .slice(0, 120)
      .map((f: any) => ({
        id: f.id,
        entrepriseId: db.entreprise['id'],
        numero: f.numero,
        entrepriseNom: db.entreprise['raisonSociale'],
        clientNom: f.clientNom,
        clientEmail: f.clientEmail,
        dateEmission: f.dateEmission,
        totalTTC: f.totalTtc,
        statut: f.statut,
        xmlGenere: !!f.xmlGenere,
        hashIntegrite: f.hashIntegrite,
        versionTeif: f.versionTeif,
        signatureStatut: f.signatureStatut ?? f.workflowTeif?.signature,
        echangeStatut: f.echangeStatut ?? f.workflowTeif?.ttn,
        validationFiscale: f.validationFiscale,
      }));
    return ok(list);
  }
  {
    const m = path.match(/^\/admin\/factures\/([^/]+)\/xml$/);
    if (method === 'GET' && m) {
      const f = db.factures.find((x: any) => x.id === m[1]);
      if (!f) return notFound('Facture introuvable (demo)');
      f.xmlGenere = true;
      f.versionTeif = f.versionTeif ?? 'v1.8.8';
      f._xmlContent = f._xmlContent ?? buildXmlForFacture(f);
      f.hashIntegrite = f.hashIntegrite ?? `SIM-HASH-${f.id}`;
      f.modifieLe = iso(new Date());
      return ok({
        factureId: f.id,
        numero: f.numero,
        xmlContent: f._xmlContent,
        hashIntegrite: f.hashIntegrite,
        versionTeif: f.versionTeif,
        genereA: iso(new Date())
      });
    }
  }
  {
    const m = path.match(/^\/admin\/factures\/([^/]+)\/valider-v0$/);
    if (method === 'POST' && m) {
      const f = db.factures.find((x: any) => x.id === m[1]);
      if (!f) return notFound('Facture introuvable (demo)');
      f.xmlGenere = true;
      f.versionTeif = f.versionTeif ?? 'v1.8.8';
      f._xmlContent = f._xmlContent ?? buildXmlForFacture(f);
      f.hashIntegrite = f.hashIntegrite ?? `SIM-HASH-${f.id}`;
      f.statut = 'Conforme';
      f.workflowTeif = { ...(f.workflowTeif ?? {}), xml: 'Genere', signature: f.workflowTeif?.signature ?? 'A signer', ttn: 'Pret' };
      f.echangeStatut = 'Pret';
      f.modifieLe = iso(new Date());
      pushHistory(f, 'Validation fiscale v0', 'Champs fiscaux et XML TEIF controles en simulation');
      return ok({ message: 'Facture validee v0.', facture: f });
    }
  }
  {
    const m = path.match(/^\/admin\/factures\/([^/]+)\/envoyer-ttn$/);
    if (method === 'POST' && m) {
      const f = db.factures.find((x: any) => x.id === m[1]);
      if (!f) return notFound('Facture introuvable (demo)');
      f.statut = 'Transmise';
      f.echangeStatut = 'Transmise simulation';
      f.workflowTeif = { ...(f.workflowTeif ?? {}), xml: f.xmlGenere ? 'Genere' : 'A generer', signature: f.signatureId ? 'Signee' : 'A signer', ttn: 'Transmise' };
      f.validationFiscale = {
        statut: 'Transmise',
        reference: `SIM-TN-${Date.now()}`,
        date: iso(new Date()),
        erreurs: []
      };
      f.modifieLe = iso(new Date());
      pushHistory(f, 'Transmission fiscale', 'Facture transmise en simulation');
      return ok({ message: 'Facture transmise en simulation.', facture: f });
    }
  }
  {
    const m = path.match(/^\/admin\/factures\/([^/]+)\/validation-fiscale\/accepter$/);
    if (method === 'POST' && m) {
      const f = db.factures.find((x: any) => x.id === m[1]);
      if (!f) return notFound('Facture introuvable (demo)');
      const erreurs = [
        !f.numero ? 'Numero facture manquant' : '',
        !db.entreprise?.['raisonSociale'] ? 'Entreprise manquante' : '',
        !f.clientNom ? 'Client manquant' : '',
        Number(f.totalTtc) <= 0 ? 'Montant TTC invalide' : '',
        !f.xmlGenere ? 'XML TEIF manquant' : ''
      ].filter(Boolean);

      if (erreurs.length) {
        f.statut = 'Rejetee';
        f.echangeStatut = 'Non transmise';
        f.validationFiscale = {
          statut: 'Rejetee',
          commentaire: 'Controle admin refuse en simulation.',
          erreurs,
          date: iso(new Date())
        };
        f.modifieLe = iso(new Date());
        pushHistory(f, 'Rejet fiscal', erreurs.join(', '));
        return ok({ message: 'Facture rejetee: champs fiscaux incomplets.', facture: f, erreurs });
      }

      f.statut = 'Transmise';
      f.echangeStatut = 'Transmise simulation';
      f.workflowTeif = { ...(f.workflowTeif ?? {}), xml: 'Genere', signature: f.signatureId ? 'Signee' : (f.workflowTeif?.signature ?? 'A signer'), ttn: 'Transmise' };
      f.validationFiscale = {
        statut: 'Transmise',
        reference: `SIM-TN-${Date.now()}`,
        commentaire: 'Validation admin simulee.',
        erreurs: [],
        date: iso(new Date())
      };
      f.modifieLe = iso(new Date());
      pushHistory(f, 'Validation fiscale', 'Admin a marque la facture transmise en simulation');
      return ok({ message: 'Facture marquee transmise.', facture: f });
    }
  }
  {
    const m = path.match(/^\/admin\/factures\/([^/]+)\/validation-fiscale\/rejeter$/);
    if (method === 'POST' && m) {
      const f = db.factures.find((x: any) => x.id === m[1]);
      if (!f) return notFound('Facture introuvable (demo)');
      const motif = (req.body as any)?.motif ?? 'Correction demandee par l admin fiscal.';
      f.statut = 'Rejetee';
      f.echangeStatut = 'Non transmise';
      f.validationFiscale = {
        statut: 'Rejetee',
        commentaire: String(motif),
        erreurs: [String(motif)],
        date: iso(new Date())
      };
      f.modifieLe = iso(new Date());
      pushHistory(f, 'Rejet fiscal', String(motif));
      return ok({ message: 'Facture rejetee pour correction.', facture: f });
    }
  }
  if (method === 'GET' && path === '/admin/demandes-kyc') return ok(db.kycRequests.map(x => ({ ...x })));
  {
    const m = path.match(/^\/admin\/demandes-kyc\/([^/]+)$/);
    if (method === 'GET' && m) {
      const found = db.kycRequests.find(x => x.id === m[1]);
      return found ? ok(clone(found)) : notFound('Dossier KYC introuvable (demo)');
    }
  }
  {
    const m = path.match(/^\/admin\/demandes-kyc\/([^/]+)\/accepter$/);
    if (method === 'POST' && m) {
      const found = db.kycRequests.find(x => x.id === m[1]);
      if (found) found.statut = 'Accepte';
      return ok({ message: 'OK (demo)' });
    }
  }
  {
    const m = path.match(/^\/admin\/demandes-kyc\/([^/]+)\/refuser$/);
    if (method === 'POST' && m) {
      const found = db.kycRequests.find(x => x.id === m[1]);
      if (found) found.statut = 'Refuse';
      return ok({ message: 'OK (demo)' });
    }
  }
  {
    const m = path.match(/^\/admin\/demandes-kyc\/([^/]+)\/demander-corrections$/);
    if (method === 'POST' && m) return ok({ message: 'OK (demo)' });
  }

  // ---------------- Demo booking ----------------
  if (method === 'POST' && path === '/demo/book') {
    const body = (req.body as any) ?? {};
    const created = {
      id: uid('DEMO'),
      firstName: body.firstName ?? 'Prenom',
      lastName: body.lastName ?? 'Nom',
      email: body.email ?? `demo${seq}@example.com`,
      company: body.company ?? 'Entreprise',
      phone: body.phone ?? '',
      message: body.message ?? '',
      preferredDate: body.preferredDate ?? todayIso(),
      preferredTime: body.preferredTime ?? '10:00',
      status: 'pending',
      createdAt: iso(new Date()),
    };
    db.demoRequests.unshift(created);
    return ok({ message: 'OK (demo)', request: created });
  }
  if (method === 'GET' && path === '/demo/requests') return ok(db.demoRequests.map(x => ({ ...x })));
  {
    const m = path.match(/^\/demo\/requests\/([^/]+)\/status$/);
    if (method === 'PATCH' && m) {
      const r = db.demoRequests.find(x => x.id === m[1]);
      if (r) r.status = (req.body as any)?.status ?? r.status;
      return ok({ message: 'OK (demo)' });
    }
  }

  // ---------------- Fallback ----------------
  if (['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    return ok({ message: `OK (demo stub)`, path, method });
  }

  return next(req);
};
