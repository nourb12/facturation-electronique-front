import { HttpHeaders, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { of } from 'rxjs';
import { environment } from '../../../environments/environment';

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
    { id: 'USR-1', prenom: 'Demo', nom: 'SuperAdmin', email: 'demo.admin@eyinvoice.tn', role: 'SuperAdmin', statut: 'Actif', entrepriseId: null, derniereConnexion: isoNow, deuxFAActif: false, alerteConnexion: true },
    { id: 'USR-2', prenom: 'Ines', nom: 'Trabelsi', email: 'ines@entreprise.tn', role: 'ResponsableFinancier', statut: 'Actif', entrepriseId, derniereConnexion: '2026-04-29T08:10:00', deuxFAActif: true, alerteConnexion: false },
    { id: 'USR-3', prenom: 'Nour', nom: 'Ben Ali', email: 'nour@entreprise.tn', role: 'Admin', statut: 'Actif', entrepriseId, derniereConnexion: '2026-04-28T17:40:00', deuxFAActif: false, alerteConnexion: true },
  ];

  const taxes = [
    { id: 'TX-1', entrepriseId, titre: 'TVA 19%', taux: 19, type: 'Tva', description: 'Taux normal', creeLe: '2026-01-01', modifieLe: '2026-01-01' },
    { id: 'TX-2', entrepriseId, titre: 'FODEC 1%', taux: 1, type: 'Fodec', description: 'FODEC', creeLe: '2026-01-01', modifieLe: '2026-01-01' },
    { id: 'TX-3', entrepriseId, titre: 'Droit de consommation 10%', taux: 10, type: 'DroitConsommation', description: 'Droit', creeLe: '2026-01-01', modifieLe: '2026-01-01' },
  ];

  const parametresFiscaux = [
    { id: 'PF-1', entrepriseId, libelle: 'Timbre fiscal', valeur: 1, type: 'Fixe', signe: 'Positif', ordreCalcul: 'ApresTva', utilisation: 'Auto', inclureRetenueSource: false, documentsCibles: ['Facture'], estActif: true, creeLe: '2026-01-02', modifieLe: '2026-03-01' },
    { id: 'PF-2', entrepriseId, libelle: 'Retenue a la source (RS)', valeur: 1.5, type: 'Pourcentage', signe: 'Negatif', ordreCalcul: 'AvantTva', utilisation: 'Manuel', inclureRetenueSource: true, documentsCibles: ['Facture', "Facture d'avoir"], estActif: true, creeLe: '2026-01-02', modifieLe: '2026-03-01' },
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
    const numeroPrefix = typeFacture === 'Avoir' ? 'AV' : (typeFacture === 'Proforma' ? 'PF' : (typeFacture === 'Devis' ? 'DEV' : 'FAC'));

    const facture = {
      id,
      numero: `${numeroPrefix}-${dateEmission.getUTCFullYear()}-${String(1000 + i).slice(-4)}`,
      clientId: client.id,
      clientNom: client.nom,
      clientMatriculeFiscal: client.matriculeFiscal,
      reference: i % 5 === 0 ? `PO-${dateEmission.getUTCFullYear()}-${100 + i}` : '',
      statut,
      typeFacture,
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

    factures.push(facture);
  }

  // Seed more "Facture" docs, plus separate Avoir/Proforma/Devis for their pages.
  for (let i = 0; i < 60; i++) addFacture(i, 'Facture');
  for (let i = 60; i < 80; i++) addFacture(i, 'Proforma');
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
      action: ['Connexion', 'Export CSV', 'Mise a jour facture', 'Creation client'][i % 4],
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
  const typeFacture = query.get('typeFacture')?.trim() || 'Facture';
  const statut = query.get('statut')?.trim() || '';
  const recherche = query.get('recherche')?.trim().toLowerCase() || '';
  const clientId = query.get('clientId')?.trim() || '';
  const dateDebut = query.get('dateDebut')?.trim() || '';
  const dateFin = query.get('dateFin')?.trim() || '';

  let items = db.factures.filter((f: any) => (typeFacture ? f.typeFacture === typeFacture : true));
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

  let items = db.clients.slice();
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

export const demoDataInterceptor: HttpInterceptorFn = (req, next) => {
  if (!environment.demoMode) return next(req);

  const apiBase = environment.apiUrl.replace(/\/+$/, '');
  const isApi = req.url.startsWith(apiBase);
  if (!isApi) return next(req);

  const db = ensureDb();
  const method = req.method.toUpperCase();
  const { path, query } = parseApiUrl(req.url, apiBase);

  // ---------------- Dashboard ----------------
  if (method === 'GET' && path === '/dashboard') return ok(buildDashboard(db));
  if (method === 'GET' && path === '/dashboard/admin') return ok(buildDashboardAdmin(db));

  // ---------------- Auth ----------------
  if (method === 'POST' && path === '/auth/login') {
    const email = String((req.body as any)?.email ?? '').toLowerCase();
    const utilisateur = db.users.find(u => u.email.toLowerCase() === email) ?? db.users[2];
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
    const num = `FAC-${new Date().getFullYear()}-${String(10000 + seq).slice(-5)}`;
    const dateEmission = iso(new Date());
    const dateEcheance = body.dateEcheance ? iso(new Date(body.dateEcheance)) : iso(new Date(Date.now() + 30 * 24 * 3600 * 1000));

    const created = {
      id,
      numero: num,
      clientId: client.id,
      clientNom: client.nom,
      clientMatriculeFiscal: client.matriculeFiscal,
      factureOrigineId: body.factureOrigineId ?? undefined,
      reference: body.reference ?? '',
      statut: 'Brouillon',
      typeFacture: body.typeFacture ?? 'Facture',
      typeVente: body.typeVente ?? 'Local',
      modePaiement: body.modePaiement ?? 'Virement',
      devise: body.devise ?? 'TND',
      dateEmission,
      dateEcheance,
      datePaiement: null,
      ...totals,
      montantPaye: 0,
      montantRestant: totals.totalTtc,
      estEnRetard: false,
      notes: body.notes ?? '',
      conditionsPaiement: body.conditionsPaiement ?? '30 jours',
      xmlGenere: false,
      versionTeif: 'v1.8.8',
      lignes,
      historique: [{ id: uid('HIS'), action: 'Creation', utilisateurNom: 'Demo', dateAction: iso(new Date()) }],
      creeLe: iso(new Date()),
      modifieLe: iso(new Date()),
    };

    db.factures.unshift(created);
    return ok(created);
  }
  {
    const m = path.match(/^\/factures\/([^/]+)$/);
    if (method === 'PUT' && m) {
      const id = m[1];
      const existing = db.factures.find((f: any) => f.id === id);
      if (!existing) return notFound('Facture introuvable (demo)');
      Object.assign(existing, req.body ?? {}, { modifieLe: iso(new Date()) });
      return ok(existing);
    }
  }
  {
    const m = path.match(/^\/factures\/([^/]+)\/valider$/);
    if (method === 'POST' && m) {
      const existing = db.factures.find((f: any) => f.id === m[1]);
      if (!existing) return notFound('Facture introuvable (demo)');
      existing.statut = 'Validee';
      existing.modifieLe = iso(new Date());
      existing.historique = [...(existing.historique ?? []), { id: uid('HIS'), action: 'Validation', utilisateurNom: 'Demo', dateAction: iso(new Date()) }];
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
      facture.modifieLe = iso(new Date());
      return ok({ message: 'OK (demo)' });
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
    const facture = db.factures.find((f: any) => f.id === body.factureId);
    const paiement = {
      id: uid('PAY'),
      factureId: body.factureId,
      factureNumero: facture?.numero ?? body.factureNumero ?? 'FAC-DEMO',
      montant: Number(body.montant ?? 0),
      devise: body.devise ?? facture?.devise ?? 'TND',
      mode: body.mode ?? body.modePaiement ?? 'Virement',
      reference: body.reference ?? '',
      banque: body.banque ?? '',
      datePaiement: body.datePaiement ? iso(new Date(body.datePaiement)) : iso(new Date()),
      creeLe: iso(new Date()),
    };
    db.paiements.unshift(paiement);
    if (facture) {
      facture.montantPaye = Number(facture.montantPaye ?? 0) + paiement.montant;
      facture.montantRestant = Math.max(0, Number(facture.totalTtc ?? 0) - facture.montantPaye);
      if (facture.montantRestant <= 0.001) {
        facture.statut = 'Payee';
        facture.datePaiement = paiement.datePaiement;
      }
      facture.modifieLe = iso(new Date());
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
  if (method === 'GET' && path === '/taxes') return ok(db.taxes.map(t => ({ ...t })));
  if (method === 'POST' && path === '/taxes') {
    const body = (req.body as any) ?? {};
    const created = { id: uid('TX'), entrepriseId: db.entreprise['id'], titre: body.titre ?? 'Taxe', taux: Number(body.taux ?? 0), type: body.type ?? 'Tva', description: body.description, creeLe: iso(new Date()), modifieLe: iso(new Date()) };
    db.taxes.unshift(created);
    return ok(created);
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
      db.taxes = db.taxes.filter(x => x.id !== m[1]);
      return ok({ message: 'OK (demo)' });
    }
  }

  if (method === 'GET' && path === '/parametres-fiscaux') return ok(db.parametresFiscaux.map(p => ({ ...p })));
  if (method === 'POST' && path === '/parametres-fiscaux') {
    const body = (req.body as any) ?? {};
    const created = {
      id: uid('PF'),
      entrepriseId: db.entreprise['id'],
      libelle: body.libelle ?? 'Parametre fiscal',
      valeur: Number(body.valeur ?? 0),
      type: body.type ?? 'Pourcentage',
      signe: body.signe ?? 'Positif',
      ordreCalcul: body.ordreCalcul ?? 'AvantTva',
      utilisation: body.utilisation ?? 'Manuel',
      inclureRetenueSource: !!body.inclureRetenueSource,
      documentsCibles: body.documentsCibles ?? [],
      estActif: true,
      creeLe: iso(new Date()),
      modifieLe: iso(new Date()),
    };
    db.parametresFiscaux.unshift(created);
    return ok(created);
  }
  {
    const m = path.match(/^\/parametres-fiscaux\/([^/]+)$/);
    if (method === 'PUT' && m) {
      const p = db.parametresFiscaux.find(x => x.id === m[1]);
      if (!p) return notFound('Parametre fiscal introuvable (demo)');
      Object.assign(p, req.body ?? {}, { modifieLe: iso(new Date()) });
      return ok(p);
    }
    if (method === 'DELETE' && m) {
      db.parametresFiscaux = db.parametresFiscaux.filter(x => x.id !== m[1]);
      return ok({ message: 'OK (demo)' });
    }
  }

  // ---------------- Rapports ----------------
  if (method === 'GET' && path === '/rapports/tva-par-taux') {
    const rows = [
      { tauxTva: 19, baseHt: 112_000, montantTva: 21_280, montantTtc: 133_280 },
      { tauxTva: 13, baseHt: 22_000, montantTva: 2_860, montantTtc: 24_860 },
      { tauxTva: 7, baseHt: 9_200, montantTva: 644, montantTtc: 9_844 },
      { tauxTva: 0, baseHt: 4_800, montantTva: 0, montantTtc: 4_800 },
    ];
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
      const list = db.factures.filter((f: any) => f.typeFacture === 'Facture' && String(f.dateEmission).slice(0, 7) === month);
      const totalTtc = list.reduce((s: number, f: any) => s + Number(f.totalTtc ?? 0), 0);
      const totalHt = list.reduce((s: number, f: any) => s + Number(f.totalHt ?? 0), 0);
      const totalTva = list.reduce((s: number, f: any) => s + Number(f.totalTva ?? 0), 0);
      const montantPaye = list.reduce((s: number, f: any) => s + Number(f.montantPaye ?? 0), 0);
      const montantImpaye = Math.max(0, totalTtc - montantPaye);
      const tauxRecouvrement = totalTtc ? Math.round((montantPaye / totalTtc) * 100) : 0;
      return { mois: monthLabel(d), nbFactures: list.length, totalHt, totalTva, totalTtc, montantPaye, montantImpaye, tauxRecouvrement };
    });
    return ok(rows);
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
    return okBlob(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), 'text/csv', `transactions-${todayIso()}.csv`);
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
  if (method === 'POST' && path === '/signatures/demander') return ok({ signatureId: uid('SIG'), statut: 'EnAttente' });
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
      f.modifieLe = iso(new Date());
    }
    return ok({ echangeId: uid('ECH'), statut: 'Transmise' });
  }
  {
    const m = path.match(/^\/ttn\/facture\/([^/]+)$/);
    if (method === 'GET' && m) return ok({ factureId: m[1], statut: 'Transmise' });
  }
  {
    const m = path.match(/^\/ttn\/([^/]+)\/simuler\/([^/]+)$/);
    if (method === 'POST' && m) return ok({ message: 'OK (demo)', echangeId: m[1], scenario: m[2] });
  }
  {
    const m = path.match(/^\/ttn\/([^/]+)\/relancer$/);
    if (method === 'POST' && m) return ok({ message: 'OK (demo)' });
  }

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
        numero: f.numero,
        entrepriseNom: db.entreprise['raisonSociale'],
        clientNom: f.clientNom,
        dateEmission: f.dateEmission,
        totalTTC: f.totalTtc,
        statut: f.statut,
      }));
    return ok(list);
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
