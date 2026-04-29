import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { CategorieApiService } from './api.service';
import { environment } from '../../../environments/environment';

describe('CategorieApiService', () => {
  let service: CategorieApiService;
  let httpMock: HttpTestingController;
  const base = `${environment.apiUrl}/categories`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [CategorieApiService],
    });
    service = TestBed.inject(CategorieApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('lister GET /categories', () => {
    service.lister().subscribe();
    const req = httpMock.expectOne(base);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('creer poste le body', () => {
    const body = { nom: 'Cat', description: 'd' };
    service.creer(body).subscribe();
    const req = httpMock.expectOne(base);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush({});
  });

  it('mettreAJour put /:id', () => {
    service.mettreAJour('1', { nom: 'N' }).subscribe();
    const req = httpMock.expectOne(`${base}/1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ nom: 'N' });
    req.flush({});
  });

  it('desactiver poste /:id/desactiver', () => {
    service.desactiver('1').subscribe();
    const req = httpMock.expectOne(`${base}/1/desactiver`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});
    req.flush({});
  });
});