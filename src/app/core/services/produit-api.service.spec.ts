import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ProduitApiService } from './api.service';
import { environment } from '../../../environments/environment';

describe('ProduitApiService', () => {
  let service: ProduitApiService;
  let httpMock: HttpTestingController;
  const base = `${environment.apiUrl}/produits`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ProduitApiService],
    });
    service = TestBed.inject(ProduitApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('lister inclut pagination et filtres optionnels', () => {
    service.lister(3, 10, 'cat1', false).subscribe();
    const req = httpMock.expectOne(r => r.url === base);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('page')).toBe('3');
    expect(req.request.params.get('parPage')).toBe('10');
    expect(req.request.params.get('categorieId')).toBe('cat1');
    expect(req.request.params.get('actifSeulement')).toBe('false');
    req.flush({});
  });

  it('rechercher envoie le terme', () => {
    service.rechercher('prod').subscribe();
    const req = httpMock.expectOne(`${base}/rechercher?terme=prod`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('creer poste le body', () => {
    const body = { libelle: 'P1' } as any;
    service.creer(body).subscribe();
    const req = httpMock.expectOne(base);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush({});
  });

  it('mettreAJour envoie PUT /:id', () => {
    service.mettreAJour('42', { libelle: 'New' }).subscribe();
    const req = httpMock.expectOne(`${base}/42`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ libelle: 'New' });
    req.flush({});
  });

  it('desactiver et reactiver', () => {
    service.desactiver('42').subscribe();
    const d = httpMock.expectOne(`${base}/42/desactiver`);
    expect(d.request.method).toBe('POST');
    d.flush({});

    service.reactiver('42').subscribe();
    const r = httpMock.expectOne(`${base}/42/reactiver`);
    expect(r.request.method).toBe('POST');
    r.flush({});
  });
});