







import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';


@Injectable({ providedIn: 'root' })
export class ApiService {
  protected http = inject(HttpClient);
  protected base = environment.apiUrl;
}




export interface ClientDto {
  id: string; nom: string; email: string;
  typeClient: string; matriculeFiscal?: string;
  adresse?: string; ville?: string; codePostal?: string;
  pays: string; telephone?: string;
  estActif: boolean; creeLe: string; modifieLe: string;
  entrepriseId: string;
}
export interface CreerClientRequest {
  nom: string; email: string; typeClient: string;
  matriculeFiscal?: string; adresse?: string;
  ville?: string; codePostal?: string;
  telephone?: string; pays?: string;
}
export interface ListeClientsDto {
  items: ClientDto[]; total: number; page: number; parPage: number;
}

@Injectable({ providedIn: 'root' })
export class ClientService extends ApiService {
  private url = `${this.base}/clients`;

  lister(page = 1, parPage = 20, actifSeulement?: boolean) {
    let p = new HttpParams().set('page', page).set('parPage', parPage);
    if (actifSeulement !== undefined) p = p.set('actifSeulement', actifSeulement);
    return this.http.get<ListeClientsDto>(this.url, { params: p });
  }
  rechercher(terme: string) {
    return this.http.get<ClientDto[]>(`${this.url}/rechercher`, {
      params: new HttpParams().set('terme', terme)
    });
  }
  obtenirParId(id: string)        { return this.http.get<ClientDto>(`${this.url}/${id}`); }
  creer(req: CreerClientRequest)  { return this.http.post<ClientDto>(this.url, req); }
  mettreAJour(id: string, req: Partial<CreerClientRequest>) {
    return this.http.put<ClientDto>(`${this.url}/${id}`, req);
  }
  desactiver(id: string) { return this.http.post(`${this.url}/${id}/desactiver`, {}); }
  reactiver(id: string)  { return this.http.post(`${this.url}/${id}/reactiver`, {}); }
}




export interface ProduitDto {
  id: string; code: string; libelle: string;
  description?: string; prixUnitaire: number;
  tauxTva: number; unite: string; type: string;
  estActif: boolean; categorieId?: string;
  categorieNom?: string; entrepriseId: string;
  creeLe: string; modifieLe: string;
}
export interface CategorieDto {
  id: string; nom: string; description?: string;
  estActive: boolean; nbProduits: number;
  entrepriseId: string; creeLe: string;
}
export interface ListeProduitsDto {
  items: ProduitDto[]; total: number; page: number; parPage: number;
}

@Injectable({ providedIn: 'root' })
export class ProduitApiService extends ApiService {
  private url = `${this.base}/produits`;

  lister(page = 1, parPage = 20, categorieId?: string, actifSeulement?: boolean) {
    let p = new HttpParams().set('page', page).set('parPage', parPage);
    if (categorieId)                p = p.set('categorieId', categorieId);
    if (actifSeulement !== undefined) p = p.set('actifSeulement', actifSeulement);
    return this.http.get<ListeProduitsDto>(this.url, { params: p });
  }
  rechercher(terme: string) {
    return this.http.get<ProduitDto[]>(`${this.url}/rechercher`, {
      params: new HttpParams().set('terme', terme)
    });
  }
  obtenirParId(id: string)              { return this.http.get<ProduitDto>(`${this.url}/${id}`); }
  creer(req: any)                       { return this.http.post<ProduitDto>(this.url, req); }
  mettreAJour(id: string, req: any)     { return this.http.put<ProduitDto>(`${this.url}/${id}`, req); }
  desactiver(id: string)                { return this.http.post(`${this.url}/${id}/desactiver`, {}); }
  reactiver(id: string)                 { return this.http.post(`${this.url}/${id}/reactiver`, {}); }
  supprimer(id: string)                 { return this.http.delete(`${this.url}/${id}`); }
}

@Injectable({ providedIn: 'root' })
export class CategorieApiService extends ApiService {
  private url = `${this.base}/categories`;

  lister()                               { return this.http.get<CategorieDto[]>(this.url); }
  creer(req: { nom: string; description?: string }) { return this.http.post<CategorieDto>(this.url, req); }
  mettreAJour(id: string, req: any)      { return this.http.put<CategorieDto>(`${this.url}/${id}`, req); }
  desactiver(id: string)                 { return this.http.post(`${this.url}/${id}/desactiver`, {}); }
  supprimer(id: string)                  { return this.http.delete(`${this.url}/${id}`); }
}




export interface LigneFactureDto {
  id: string; ordre: number; designation: string;
  description?: string; unite: string; quantite: number;
  prixUnitaire: number; tauxRemise: number; tauxTva: number;
  montantHt: number; montantRemise: number;
  montantTva: number; montantTtc: number; produitId?: string;
}

export interface HistoriqueEntreeDto {
  id: string;
  action: string;
  utilisateurNom: string;
  dateAction: string;
  ancienneValeur?: string;
  nouvelleValeur?: string;
  details?: string;
}

export interface FactureDto {
  id: string; numero: string; clientId: string; factureOrigineId?: string;
  clientNom: string; clientMatriculeFiscal?: string;
  reference?: string; statut: string; typeFacture: string;
  modePaiement: string; devise: string;
  dateEmission: string; dateEcheance: string;
  datePaiement?: string;
  totalHt: number; totalTva: number; totalTtc: number;
  appliquerRS: boolean; codeRS?: string; tauxRS: number;
  baseRS: number; montantRS: number; netAPayer: number;
  montantPaye: number; montantRestant: number;
  estEnRetard: boolean; notes?: string;
  conditionsPaiement?: string;
  xmlGenere: boolean; versionTeif?: string;
  lignes: LigneFactureDto[];
  historique: HistoriqueEntreeDto[];  // ← US 3.5 : typé proprement
  creeLe: string; modifieLe: string;
}

export interface ListeFacturesDto {
  items: FactureDto[]; total: number; page: number; parPage: number;
}

export interface StatistiquesFacturesDto {
  totalBrouillons: number; totalValidees: number;
  totalTransmises: number; totalAcceptees: number;
  totalRejetees: number;   totalPayees: number;
  totalEnRetard: number;   montantTotalMois: number;
  montantEncaisseMois: number; montantEnAttente: number;
}

@Injectable({ providedIn: 'root' })
export class FactureApiService extends ApiService {
  private url = `${this.base}/factures`;

  lister(params: any = {}) {
    let p = new HttpParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') p = p.set(k, String(v));
    });
    return this.http.get<ListeFacturesDto>(this.url, { params: p });
  }

  obtenirParId(id: string)           { return this.http.get<FactureDto>(`${this.url}/${id}`); }
  statistiques()                     { return this.http.get<StatistiquesFacturesDto>(`${this.url}/statistiques`); }
  creer(req: any)                    { return this.http.post<FactureDto>(this.url, req); }
  mettreAJour(id: string, req: any)  { return this.http.put<FactureDto>(`${this.url}/${id}`, req); }
  valider(id: string)                { return this.http.post<FactureDto>(`${this.url}/${id}/valider`, {}); }
  soumettreValidationFiscale(id: string) {
    return this.http.post<FactureDto>(`${this.url}/${id}/soumettre-validation-fiscale`, {});
  }
  rejeter(id: string, motif: string) { return this.http.post<FactureDto>(`${this.url}/${id}/rejeter`, { motif }); }
  annuler(id: string, motif: string) { return this.http.post<FactureDto>(`${this.url}/${id}/annuler`, { motif }); }
  remettreBrouillon(id: string)      { return this.http.post<FactureDto>(`${this.url}/${id}/remettre-brouillon`, {}); }
  convertirEnFacture(id: string, req: { dateEcheance?: string; reference?: string } = {}) {
    return this.http.post<FactureDto>(`${this.url}/${id}/convertir-facture`, req);
  }

  
  telechargerPdf(id: string) {
    return this.http.get(`${this.url}/${id}/pdf`, { responseType: 'blob' });
  }

  
  obtenirHistorique(id: string) {
    return this.http.get<HistoriqueEntreeDto[]>(`${this.url}/${id}/historique`);
  }
}

export interface BalanceLigneDto {
  compte: string;
  intitule: string;
  debit: number;
  credit: number;
  soldeDebiteur: number;
  soldeCrediteur: number;
}

export interface ComptabilitePayload {
  kpis: any[];
  alertes: any[];
  calendrierFiscal: any[];
  planComptable: any[];
  ecritures: any[];
  journaux: any[];
  balance: BalanceLigneDto[];
  grandLivre: any[];
  actifs: any[];
  etats: any[];
  exercices: any[];
  analytique: any[];
}

@Injectable({ providedIn: 'root' })
export class ComptabiliteApiService extends ApiService {
  private url = `${this.base}/comptabilite`;

  private buildParams(params?: Record<string, unknown>) {
    let httpParams = new HttpParams();
    Object.entries(params ?? {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        httpParams = httpParams.set(key, String(value));
      }
    });
    return httpParams;
  }

  dashboard()       { return this.http.get<ComptabilitePayload>(`${this.url}/dashboard`); }
  planComptable()   { return this.http.get<any[]>(`${this.url}/plan-comptable`); }
  ajouterCompte(req: any) { return this.http.post<any>(`${this.url}/plan-comptable`, req); }
  ecritures()       { return this.http.get<any[]>(`${this.url}/ecritures`); }
  ecrituresFiltrees(params?: { journal?: string; dateDebut?: string; dateFin?: string; compte?: string; search?: string }) {
    return this.http.get<any[]>(`${this.base}/ecritures`, { params: this.buildParams(params) });
  }
  creerEcriture(req: any) {
    return this.http.post<any>(`${this.base}/ecritures`, req);
  }
  balanceReelle() {
    return this.http.get<BalanceLigneDto[]>(`${this.base}/ecritures/balance`);
  }
  grandLivreReel(params?: { compte?: string; dateDebut?: string; dateFin?: string }) {
    return this.http.get<any[]>(`${this.base}/ecritures/grand-livre`, { params: this.buildParams(params) });
  }
  exportEcrituresPdf(params?: Record<string, unknown>) {
    return this.http.get(`${this.base}/ecritures/export/pdf`, { params: this.buildParams(params), responseType: 'blob' });
  }
  exportEcrituresExcel(params?: Record<string, unknown>) {
    return this.http.get(`${this.base}/ecritures/export/excel`, { params: this.buildParams(params), responseType: 'blob' });
  }
  journaux()        { return this.http.get<any[]>(`${this.url}/journaux`); }
  balance()         { return this.http.get<BalanceLigneDto[]>(`${this.url}/balance`); }
  grandLivre()      { return this.http.get<any[]>(`${this.url}/grand-livre`); }
  actifs()          { return this.http.get<any[]>(`${this.url}/actifs`); }
  etats()           { return this.http.get<any[]>(`${this.url}/etats`); }
  exercices()       { return this.http.get<any[]>(`${this.url}/exercices`); }
  analytique()      { return this.http.get<any[]>(`${this.url}/analytique`); }
  calendrierFiscal(){ return this.http.get<any[]>(`${this.url}/calendrier-fiscal`); }
  declarationsTva() { return this.http.get<any>(`${this.url}/declarations/tva`); }
  declarationTva(params?: { mois?: number | string; annee?: number | string }) {
    return this.http.get<any>(`${this.base}/declarations/tva`, { params: this.buildParams(params) });
  }
  declarationRs(params?: { mois?: number | string; annee?: number | string }) {
    return this.http.get<any>(`${this.base}/declarations/rs`, { params: this.buildParams(params) });
  }
  liasseDgi(params?: { annee?: number | string }) {
    return this.http.get<any>(`${this.base}/declarations/liasse-dgi`, { params: this.buildParams(params) });
  }
  retenueSource()   { return this.http.get<any>(`${this.url}/retenue-source`); }
  tresorerie()       { return this.http.get<any>(`${this.url}/tresorerie`); }
  lettrageNonLettres() {
    return this.http.get<any[]>(`${this.base}/lettrage/non-lettres`);
  }
  rapprocherLettrage(req: any) {
    return this.http.post<any>(`${this.base}/lettrage`, req);
  }
  importerRapprochement(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<any>(`${this.base}/rapprochement/import`, formData);
  }
  rapprochementEcarts() {
    return this.http.get<any[]>(`${this.base}/rapprochement/ecarts`);
  }
  audit(params?: { entite?: string; action?: string; dateDebut?: string; dateFin?: string }) {
    return this.http.get<any[]>(`${this.base}/audit`, { params: this.buildParams(params) });
  }
}

export interface DocumentFluxDto {
  id: string;
  type: string;
  numero: string;
  client: string;
  total: number;
  statut: string;
  date: string;
  echeance?: string | null;
  linkedTo?: string | null;
  convertedTo?: string | null;
  history: string[];
  source?: string | null;
}

export interface DocumentsDashboardDto {
  documents: DocumentFluxDto[];
  generatedAt?: string;
}

@Injectable({ providedIn: 'root' })
export class DocumentsApiService extends ApiService {
  private url = `${this.base}/documents`;

  dashboard() {
    return this.http.get<DocumentsDashboardDto>(`${this.url}/dashboard`);
  }

  convertir(id: string) {
    return this.http.post<DocumentFluxDto>(`${this.url}/${encodeURIComponent(id)}/convertir`, {});
  }
}




export interface XmlTeifDto {
  factureId: string;
  numero: string;
  xmlContent: string;
  hashIntegrite: string;
  versionTeif: string;
  genereA: string;
}

export interface ErreurTeifDto {
  code: string;
  message: string;
  champ?: string;
  severite: string;
}

export interface ValidationTeifDto {
  factureId: string;
  estConforme: boolean;
  erreurs: ErreurTeifDto[];
  valideeA: string;
}

@Injectable({ providedIn: 'root' })
export class TeifApiService extends ApiService {
  private url = `${this.base}/teif`;

  genererXml(factureId: string)      { return this.http.post<XmlTeifDto>(`${this.url}/${factureId}/generer-xml`, {}); }
  valider(factureId: string)         { return this.http.post<ValidationTeifDto>(`${this.url}/${factureId}/valider`, {}); }
  marquerConforme(factureId: string) { return this.http.post<any>(`${this.url}/${factureId}/marquer-conforme`, {}); }

  
  telechargerXml(factureId: string) {
    return this.http.get(`${this.url}/${factureId}/generer-xml/fichier`, { responseType: 'blob' });
  }
}




@Injectable({ providedIn: 'root' })
export class PaiementApiService extends ApiService {
  private url = `${this.base}/paiements`;

  enregistrer(req: any)               { return this.http.post<any>(this.url, req); }
  listerParFacture(factureId: string) { return this.http.get<any>(`${this.url}/facture/${factureId}`); }
  listerTous(page = 1, parPage = 20) {
    return this.http.get<any>(this.url, {
      params: new HttpParams().set('page', page).set('parPage', parPage)
    });
  }
}




@Injectable({ providedIn: 'root' })
export class SignatureApiService extends ApiService {
  private url = `${this.base}/signatures`;

  demander(factureId: string)    { return this.http.post<any>(`${this.url}/demander`, { factureId }); }
  statut(factureId: string)      { return this.http.get<any>(`${this.url}/facture/${factureId}`); }
  relancer(signatureId: string)  { return this.http.post<any>(`${this.url}/${signatureId}/relancer`, {}); }
}

@Injectable({ providedIn: 'root' })
export class TtnApiService extends ApiService {
  private url = `${this.base}/ttn`;

  envoyer(factureId: string)                   { return this.http.post<any>(`${this.url}/envoyer`, { factureId }); }
  simuler(echangeId: string, scenario: string) { return this.http.post<any>(`${this.url}/${echangeId}/simuler/${scenario}`, {}); }
  statut(factureId: string)                    { return this.http.get<any>(`${this.url}/facture/${factureId}`); }
  relancer(echangeId: string)                  { return this.http.post<any>(`${this.url}/${echangeId}/relancer`, {}); }
}




@Injectable({ providedIn: 'root' })
export class DashboardApiService extends ApiService {
  private url = `${this.base}/dashboard`;

  obtenirDashboard()      { return this.http.get<any>(this.url); }
  obtenirDashboardAdmin() { return this.http.get<any>(`${this.url}/admin`); }
}

export interface TvaParTauxDto {
  tauxTva: number;
  baseHt: number;
  montantTva: number;
  montantTtc: number;
}

export interface DelaiPaiementClientDto {
  clientId: string;
  clientNom: string;
  nbFactures: number;
  delaiMoyenJours: number;
}

export interface RecapMensuelDto {
  mois: string;
  nbFactures: number;
  totalHt: number;
  totalTva: number;
  totalTtc: number;
  montantPaye: number;
  montantImpaye: number;
  tauxRecouvrement: number;
}

@Injectable({ providedIn: 'root' })
export class RapportsApiService extends ApiService {
  private url = `${this.base}/rapports`;

  private buildParams(params?: { dateDebut?: string; dateFin?: string; top?: number }) {
    let p = new HttpParams();
    if (params?.dateDebut) p = p.set('dateDebut', params.dateDebut);
    if (params?.dateFin) p = p.set('dateFin', params.dateFin);
    if (params?.top !== undefined) p = p.set('top', params.top);
    return p;
  }

  tvaParTaux(params?: { dateDebut?: string; dateFin?: string }) {
    return this.http.get<TvaParTauxDto[]>(`${this.url}/tva-par-taux`, {
      params: this.buildParams(params)
    });
  }

  delaisPaiement(params?: { dateDebut?: string; dateFin?: string; top?: number }) {
    return this.http.get<DelaiPaiementClientDto[]>(`${this.url}/delais-paiement`, {
      params: this.buildParams(params)
    });
  }

  recapMensuel(params?: { dateDebut?: string; dateFin?: string }) {
    return this.http.get<RecapMensuelDto[]>(`${this.url}/recap-mensuel`, {
      params: this.buildParams(params)
    });
  }
}




export interface EntrepriseDto {
  id: string;
  nom?: string;
  raisonSociale?: string;
  nomCommercial?: string;
  forme?: string;
  capital?: string | number | null;
  dateCreation?: string | null;
  activiteCode?: string | null;
  activiteLibelle?: string | null;
  adresse?: string | null;
  ville?: string | null;
  codePostal?: string | null;
  gouvernorat?: string | null;
  pays?: string | null;
  telephone?: string | null;
  tel?: string | null;
  fax?: string | null;
  email?: string | null;
  siteWeb?: string | null;
  matriculeFiscal?: string | null;
  numRNE?: string | null;
  regimeTVA?: string | null;
  tauxTVAPrincipal?: number | string | null;
  teifSignature?: boolean;
  teifArchivage?: boolean;
  teifHorodatage?: boolean;
  teifSandbox?: boolean;
  teifSurveille?: boolean;
  scoreConformite?: number;
}

export type MettreAJourEntrepriseRequest = Partial<Omit<EntrepriseDto, 'id' | 'scoreConformite'>>;

export interface ConfigurerTeifRequest {
  parametresTeif: string;
  versionTeif: string;
}

export interface MessageResponse {
  message: string;
}

@Injectable({ providedIn: 'root' })
export class EntrepriseApiService extends ApiService {
  private url = `${this.base}/entreprises`;

  obtenirParId(id: string) { return this.http.get<EntrepriseDto>(`${this.url}/${id}`); }
  mettreAJour(id: string, req: MettreAJourEntrepriseRequest) {
    return this.http.put<EntrepriseDto>(`${this.url}/${id}`, req);
  }
  configurerTeif(id: string, req: ConfigurerTeifRequest) {
    return this.http.put<MessageResponse>(`${this.url}/${id}/teif`, req);
  }
  listerToutes() { return this.http.get<EntrepriseDto[]>(this.url); }
}
export interface PersonnalisationDto {
  id: string;
  entrepriseId: string;
  donnees: any;
  creeLe: string;
  modifieLe: string;
}

export interface EnregistrerPersonnalisationRequest {
  donnees: any;
}

@Injectable({ providedIn: 'root' })
export class PersonnalisationApiService extends ApiService {
  private url = `${this.base}/personnalisation`;

  obtenir() { return this.http.get<PersonnalisationDto | null>(this.url); }
  enregistrer(req: EnregistrerPersonnalisationRequest) {
    return this.http.put<PersonnalisationDto>(this.url, req);
  }
}






export interface TaxeDto {
  id: string;
  entrepriseId: string;
  titre: string;
  taux: number;
  type: string;
  codeTEIF?: 'S' | 'E' | 'Z' | 'O' | string;
  dateEffet?: string;
  estActif?: boolean;
  nombreUtilisations?: number;
  description?: string;
  creeLe: string;
  modifieLe: string;
}

export interface CreerTaxeRequest {
  titre: string;
  taux: number;
  type: string;
  codeTEIF?: 'S' | 'E' | 'Z' | 'O' | string;
  dateEffet?: string;
  estActif?: boolean;
  description?: string;
}

export interface TaxeUtilisationsDto {
  taxeId: string;
  nombreUtilisations: number;
  peutSupprimer: boolean;
}

export interface TaxeListParams {
  search?: string;
  type?: string;
  estActif?: boolean | null;
}

@Injectable({ providedIn: 'root' })
export class TaxeApiService extends ApiService {
  private url = `${this.base}/taxes`;

  lister(params?: TaxeListParams) {
    let httpParams = new HttpParams();
    if (params?.search) httpParams = httpParams.set('search', params.search);
    if (params?.type && params.type !== 'Tous') httpParams = httpParams.set('type', params.type);
    if (params?.estActif !== undefined && params.estActif !== null) {
      httpParams = httpParams.set('estActif', String(params.estActif));
    }
    return this.http.get<TaxeDto[]>(this.url, { params: httpParams });
  }
  creer(req: CreerTaxeRequest) { return this.http.post<TaxeDto>(this.url, req); }
  mettreAJour(id: string, req: CreerTaxeRequest) {
    return this.http.put<TaxeDto>(`${this.url}/${id}`, req);
  }
  toggleActif(id: string) {
    return this.http.put<TaxeDto>(`${this.url}/${id}/toggle-actif`, {});
  }
  utilisations(id: string) {
    return this.http.get<TaxeUtilisationsDto>(`${this.url}/${id}/utilisations`);
  }
  supprimer(id: string) { return this.http.delete(`${this.url}/${id}`); }
}
export interface ParametreFiscalDto {
  id: string;
  entrepriseId: string;
  libelle: string;
  valeur: number;
  type: string;
  signe: string;
  ordreCalcul: string;
  utilisation: string;
  codeDGI?: string;
  typeFournisseur?: string;
  seuilMinimum?: number | null;
  dateEffet?: string;
  inclureRetenueSource: boolean;
  inclureRS?: boolean;
  documentsCibles: string[];
  nombreUtilisations?: number;
  estActif: boolean;
  creeLe: string;
  modifieLe: string;
}

export interface CreerParametreFiscalRequest {
  libelle: string;
  valeur: number;
  type: string;
  signe: string;
  ordreCalcul: string;
  utilisation: string;
  codeDGI?: string;
  typeFournisseur?: string;
  seuilMinimum?: number | null;
  dateEffet?: string;
  inclureRetenueSource: boolean;
  inclureRS?: boolean;
  documentsCibles: string[];
  estActif?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ParametreFiscalApiService extends ApiService {
  private url = `${this.base}/parametres-fiscaux`;

  lister(params?: {
    search?: string;
    type?: string;
    utilisation?: string;
    estActif?: boolean | null;
    typeFournisseur?: string;
    dateDebut?: string;
    dateFin?: string;
  }) {
    let httpParams = new HttpParams();
    if (params?.search) httpParams = httpParams.set('search', params.search);
    if (params?.type && params.type !== 'Tous') httpParams = httpParams.set('type', params.type);
    if (params?.utilisation && params.utilisation !== 'Tous') httpParams = httpParams.set('utilisation', params.utilisation);
    if (params?.estActif !== undefined && params.estActif !== null) httpParams = httpParams.set('estActif', String(params.estActif));
    if (params?.typeFournisseur && params.typeFournisseur !== 'Tous') httpParams = httpParams.set('typeFournisseur', params.typeFournisseur);
    if (params?.dateDebut) httpParams = httpParams.set('dateDebut', params.dateDebut);
    if (params?.dateFin) httpParams = httpParams.set('dateFin', params.dateFin);
    return this.http.get<ParametreFiscalDto[]>(this.url, { params: httpParams });
  }
  creer(req: CreerParametreFiscalRequest) { return this.http.post<ParametreFiscalDto>(this.url, req); }
  mettreAJour(id: string, req: CreerParametreFiscalRequest) {
    return this.http.put<ParametreFiscalDto>(`${this.url}/${id}`, req);
  }
  toggleActif(id: string) {
    return this.http.put<ParametreFiscalDto>(`${this.url}/${id}/toggle-actif`, {});
  }
  utilisations(id: string) {
    return this.http.get<{ parametreFiscalId: string; nombreUtilisations: number; peutSupprimer: boolean }>(`${this.url}/${id}/utilisations`);
  }
  exporterExcel(params?: any) {
    return this.http.get(`${this.url}/export/excel`, { params: params ?? {}, responseType: 'blob' });
  }
  exporterPdf(params?: any) {
    return this.http.get(`${this.url}/export/pdf`, { params: params ?? {}, responseType: 'blob' });
  }
  supprimer(id: string) { return this.http.delete(`${this.url}/${id}`); }
}

export interface SessionActiveDto {
  id: string;
  appareil: string;
  ip: string;
  userAgent: string;
  creeLe: string;
  derniereActivite: string;
  estCourante: boolean;
}

@Injectable({ providedIn: 'root' })
export class UtilisateurApiService extends ApiService {
  private url = `${this.base}/utilisateurs`;

  lister()                           { return this.http.get<any[]>(this.url); }
  obtenirParId(id: string)           { return this.http.get<any>(`${this.url}/${id}`); }
  creer(req: any)                    { return this.http.post<any>(this.url, req); }
  mettreAJour(id: string, req: any)  { return this.http.put<any>(`${this.url}/${id}`, req); }
  suspendre(id: string)              { return this.http.post(`${this.url}/${id}/suspendre`, {}); }
  reactiver(id: string)              { return this.http.post(`${this.url}/${id}/reactiver`, {}); }
  supprimer(id: string)              { return this.http.delete(`${this.url}/${id}`); }

  
  changerMotDePasse(id: string, req: { motDePasseActuel: string; nouveauMotDePasse: string; confirmationMotDePasse: string }) {
    return this.http.post<{ message: string }>(`${this.url}/${id}/changer-mot-de-passe`, req);
  }

  
  obtenirSessions(id: string) {
    return this.http.get<SessionActiveDto[]>(`${this.url}/${id}/sessions`);
  }

  
  revoquerSession(utilisateurId: string, sessionId: string) {
    return this.http.delete(`${this.url}/${utilisateurId}/sessions/${sessionId}`);
  }

  
  revoquerToutesSessions(id: string) {
    return this.http.delete(`${this.url}/${id}/sessions`);
  }
}
