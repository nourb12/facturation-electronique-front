import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ClientService } from './api.service';
import { environment } from '../../../environments/environment';

describe('ClientService', () => {
  let service: ClientService;
  let httpMock: HttpTestingController;
  const base = `${environment.apiUrl}/clients`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ClientService],
    });
    service = TestBed.inject(ClientService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('lister applique pagination et filtre actif', () => {
    service.lister(2, 50, true).subscribe();
    const req = httpMock.expectOne(r => r.url === base);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('parPage')).toBe('50');
    expect(req.request.params.get('actifSeulement')).toBe('true');
    req.flush({});
  });

  it('rechercher envoie terme en query', () => {
    service.rechercher('abc').subscribe();
    const req = httpMock.expectOne(`${base}/rechercher?terme=abc`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('creer poste le body', () => {
    const body = { nom: 'Acme', email: 'a@b.c', typeClient: 'Entreprise' };
    service.creer(body).subscribe();
    const req = httpMock.expectOne(base);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush({});
  });

  it('desactiver appelle POST /:id/desactiver', () => {
    service.desactiver('123').subscribe();
    const req = httpMock.expectOne(`${base}/123/desactiver`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});
    req.flush({});
  });

  it('reactiver appelle POST /:id/reactiver', () => {
    service.reactiver('123').subscribe();
    const req = httpMock.expectOne(`${base}/123/reactiver`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});
    req.flush({});
  });
});