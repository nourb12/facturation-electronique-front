import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { FactureApiService } from './api.service';
import { environment } from '../../../environments/environment';

describe('FactureApiService', () => {
  let service: FactureApiService;
  let httpMock: HttpTestingController;
  const base = `${environment.apiUrl}/factures`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [FactureApiService],
    });
    service = TestBed.inject(FactureApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('lister propage tous les params fournis', () => {
    const params = { page: 2, statut: 'VALIDE', clientId: 'c1' } as any;
    service.lister(params).subscribe();
    const req = httpMock.expectOne(r => r.url === base);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('statut')).toBe('VALIDE');
    expect(req.request.params.get('clientId')).toBe('c1');
    req.flush({});
  });

  it('statistiques appelle GET /statistiques', () => {
    service.statistiques().subscribe();
    const req = httpMock.expectOne(`${base}/statistiques`);
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('valider appelle POST /:id/valider', () => {
    service.valider('f1').subscribe();
    const req = httpMock.expectOne(`${base}/f1/valider`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});
    req.flush({});
  });

  it('rejeter envoie le motif dans le corps', () => {
    service.rejeter('f1', 'erreur').subscribe();
    const req = httpMock.expectOne(`${base}/f1/rejeter`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ motif: 'erreur' });
    req.flush({});
  });

  it('annuler poste motif', () => {
    service.annuler('f1', 'client annule').subscribe();
    const req = httpMock.expectOne(`${base}/f1/annuler`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ motif: 'client annule' });
    req.flush({});
  });

  it('remettreBrouillon poste body vide', () => {
    service.remettreBrouillon('f1').subscribe();
    const req = httpMock.expectOne(`${base}/f1/remettre-brouillon`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});
    req.flush({});
  });

  it('telechargerPdf demande responseType blob', () => {
    service.telechargerPdf('f1').subscribe();
    const req = httpMock.expectOne(`${base}/f1/pdf`);
    expect(req.request.method).toBe('GET');
    expect(req.request.responseType).toBe('blob');
    req.flush(new Blob(['pdfdata'], { type: 'application/pdf' }));
  });
});
