import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import {
  DashboardApiService,
  EntrepriseApiService,
  PersonnalisationApiService,
  TaxeApiService,
  ParametreFiscalApiService,
  UtilisateurApiService,
  PaiementApiService,
  SignatureApiService,
  TtnApiService,
  TeifApiService,
} from './api.service';
import { environment } from '../../../environments/environment';

describe('ApiServices (extra)', () => {
  let httpMock: HttpTestingController;
  const base = environment.apiUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        DashboardApiService,
        EntrepriseApiService,
        PersonnalisationApiService,
        TaxeApiService,
        ParametreFiscalApiService,
        UtilisateurApiService,
        PaiementApiService,
        SignatureApiService,
        TtnApiService,
        TeifApiService,
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('DashboardApiService.obtenirDashboard GET /dashboard', () => {
    const service = TestBed.inject(DashboardApiService);
    service.obtenirDashboard().subscribe();
    const req = httpMock.expectOne(`${base}/dashboard`);
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('DashboardApiService.obtenirDashboardAdmin GET /dashboard/admin', () => {
    const service = TestBed.inject(DashboardApiService);
    service.obtenirDashboardAdmin().subscribe();
    const req = httpMock.expectOne(`${base}/dashboard/admin`);
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('EntrepriseApiService calls correct endpoints', () => {
    const service = TestBed.inject(EntrepriseApiService);
    service.obtenirParId('e1').subscribe();
    let req = httpMock.expectOne(`${base}/entreprises/e1`);
    expect(req.request.method).toBe('GET');
    req.flush({});

    const body = { nom: 'Acme' };
    service.mettreAJour('e1', body).subscribe();
    req = httpMock.expectOne(`${base}/entreprises/e1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(body);
    req.flush({});

    const teif = { version: '2.1' };
    service.configurerTeif('e1', teif).subscribe();
    req = httpMock.expectOne(`${base}/entreprises/e1/teif`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(teif);
    req.flush({});

    service.listerToutes().subscribe();
    req = httpMock.expectOne(`${base}/entreprises`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('PersonnalisationApiService calls correct endpoints', () => {
    const service = TestBed.inject(PersonnalisationApiService);
    service.obtenir().subscribe();
    let req = httpMock.expectOne(`${base}/personnalisation`);
    expect(req.request.method).toBe('GET');
    req.flush(null);

    const payload = { donnees: { a: 1 } };
    service.enregistrer(payload).subscribe();
    req = httpMock.expectOne(`${base}/personnalisation`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(payload);
    req.flush({});
  });

  it('TaxeApiService calls correct endpoints', () => {
    const service = TestBed.inject(TaxeApiService);
    service.lister().subscribe();
    let req = httpMock.expectOne(`${base}/taxes`);
    expect(req.request.method).toBe('GET');
    req.flush([]);

    const body = { titre: 'TVA', taux: 19, type: 'TVA' };
    service.creer(body).subscribe();
    req = httpMock.expectOne(`${base}/taxes`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush({});

    service.mettreAJour('t1', body).subscribe();
    req = httpMock.expectOne(`${base}/taxes/t1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(body);
    req.flush({});

    service.supprimer('t1').subscribe();
    req = httpMock.expectOne(`${base}/taxes/t1`);
    expect(req.request.method).toBe('DELETE');
    req.flush({});
  });

  it('ParametreFiscalApiService calls correct endpoints', () => {
    const service = TestBed.inject(ParametreFiscalApiService);
    service.lister().subscribe();
    let req = httpMock.expectOne(`${base}/parametres-fiscaux`);
    expect(req.request.method).toBe('GET');
    req.flush([]);

    const body = {
      libelle: 'Timbre', valeur: 1, type: 'Pourcentage', signe: 'Positif',
      ordreCalcul: 'AvantTVA', utilisation: 'Manuel',
      inclureRetenueSource: false, documentsCibles: []
    };
    service.creer(body).subscribe();
    req = httpMock.expectOne(`${base}/parametres-fiscaux`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush({});

    service.mettreAJour('p1', body).subscribe();
    req = httpMock.expectOne(`${base}/parametres-fiscaux/p1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(body);
    req.flush({});

    service.supprimer('p1').subscribe();
    req = httpMock.expectOne(`${base}/parametres-fiscaux/p1`);
    expect(req.request.method).toBe('DELETE');
    req.flush({});
  });

  it('UtilisateurApiService calls correct endpoints', () => {
    const service = TestBed.inject(UtilisateurApiService);
    service.lister().subscribe();
    let req = httpMock.expectOne(`${base}/utilisateurs`);
    expect(req.request.method).toBe('GET');
    req.flush([]);

    service.obtenirParId('u1').subscribe();
    req = httpMock.expectOne(`${base}/utilisateurs/u1`);
    expect(req.request.method).toBe('GET');
    req.flush({});

    const body = { nom: 'Test' };
    service.creer(body).subscribe();
    req = httpMock.expectOne(`${base}/utilisateurs`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush({});

    service.mettreAJour('u1', body).subscribe();
    req = httpMock.expectOne(`${base}/utilisateurs/u1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(body);
    req.flush({});

    service.suspendre('u1').subscribe();
    req = httpMock.expectOne(`${base}/utilisateurs/u1/suspendre`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});
    req.flush({});

    service.reactiver('u1').subscribe();
    req = httpMock.expectOne(`${base}/utilisateurs/u1/reactiver`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});
    req.flush({});

    service.supprimer('u1').subscribe();
    req = httpMock.expectOne(`${base}/utilisateurs/u1`);
    expect(req.request.method).toBe('DELETE');
    req.flush({});

    const pwd = { motDePasseActuel: 'a', nouveauMotDePasse: 'b', confirmationMotDePasse: 'b' };
    service.changerMotDePasse('u1', pwd).subscribe();
    req = httpMock.expectOne(`${base}/utilisateurs/u1/changer-mot-de-passe`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(pwd);
    req.flush({});

    service.obtenirSessions('u1').subscribe();
    req = httpMock.expectOne(`${base}/utilisateurs/u1/sessions`);
    expect(req.request.method).toBe('GET');
    req.flush([]);

    service.revoquerSession('u1', 's1').subscribe();
    req = httpMock.expectOne(`${base}/utilisateurs/u1/sessions/s1`);
    expect(req.request.method).toBe('DELETE');
    req.flush({});

    service.revoquerToutesSessions('u1').subscribe();
    req = httpMock.expectOne(`${base}/utilisateurs/u1/sessions`);
    expect(req.request.method).toBe('DELETE');
    req.flush({});
  });

  it('PaiementApiService calls correct endpoints', () => {
    const service = TestBed.inject(PaiementApiService);
    const body = { factureId: 'f1', montant: 10 };
    service.enregistrer(body).subscribe();
    let req = httpMock.expectOne(`${base}/paiements`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush({});

    service.listerParFacture('f1').subscribe();
    req = httpMock.expectOne(`${base}/paiements/facture/f1`);
    expect(req.request.method).toBe('GET');
    req.flush([]);

    service.listerTous(2, 50).subscribe();
    req = httpMock.expectOne(r => r.url === `${base}/paiements`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('parPage')).toBe('50');
    req.flush({});
  });

  it('SignatureApiService calls correct endpoints', () => {
    const service = TestBed.inject(SignatureApiService);
    service.demander('f1').subscribe();
    let req = httpMock.expectOne(`${base}/signatures/demander`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ factureId: 'f1' });
    req.flush({});

    service.statut('f1').subscribe();
    req = httpMock.expectOne(`${base}/signatures/facture/f1`);
    expect(req.request.method).toBe('GET');
    req.flush({});

    service.relancer('s1').subscribe();
    req = httpMock.expectOne(`${base}/signatures/s1/relancer`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});
    req.flush({});
  });

  it('TtnApiService calls correct endpoints', () => {
    const service = TestBed.inject(TtnApiService);
    service.envoyer('f1').subscribe();
    let req = httpMock.expectOne(`${base}/ttn/envoyer`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ factureId: 'f1' });
    req.flush({});

    service.simuler('e1', 'ok').subscribe();
    req = httpMock.expectOne(`${base}/ttn/e1/simuler/ok`);
    expect(req.request.method).toBe('POST');
    req.flush({});

    service.statut('f1').subscribe();
    req = httpMock.expectOne(`${base}/ttn/facture/f1`);
    expect(req.request.method).toBe('GET');
    req.flush({});

    service.relancer('e1').subscribe();
    req = httpMock.expectOne(`${base}/ttn/e1/relancer`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});
    req.flush({});
  });

  it('TeifApiService calls correct endpoints', () => {
    const service = TestBed.inject(TeifApiService);
    service.genererXml('f1').subscribe();
    let req = httpMock.expectOne(`${base}/teif/f1/generer-xml`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});
    req.flush({});

    service.valider('f1').subscribe();
    req = httpMock.expectOne(`${base}/teif/f1/valider`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});
    req.flush({});

    service.marquerConforme('f1').subscribe();
    req = httpMock.expectOne(`${base}/teif/f1/marquer-conforme`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});
    req.flush({});

    service.telechargerXml('f1').subscribe();
    req = httpMock.expectOne(`${base}/teif/f1/generer-xml/fichier`);
    expect(req.request.method).toBe('GET');
    expect(req.request.responseType).toBe('blob');
    req.flush(new Blob());
  });
});