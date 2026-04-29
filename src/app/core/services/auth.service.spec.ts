import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AuthService, AuthResponse, LoginRequest } from './auth.service';
import { environment } from '../../../environments/environment';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let router: jasmine.SpyObj<Router>;

  const mockResponse: AuthResponse = {
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    expireA: '2026-12-31T00:00:00Z',
    utilisateur: {
      id: 'u1',
      prenom: 'John',
      nom: 'Doe',
      email: 'john@doe.tn',
      role: 'Admin',
      statut: 'Actif',
      deuxFAActif: false,
      entrepriseId: 'ent1',
      derniereConnexion: null,
    },
  };

  beforeEach(() => {
    router = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AuthService,
        { provide: Router, useValue: router },
      ],
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    localStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('storeSession stocke tokens et utilisateur', () => {
    service.storeSession(mockResponse);

    expect(service.token).toBe('access-token');
    expect(service.refreshToken).toBe('refresh-token');
    expect(service.user?.email).toBe('john@doe.tn');
    expect(service.isLoggedIn).toBeTrue();
  });

  it('clearSession vide le stockage et le signal user', () => {
    service.storeSession(mockResponse);
    service.clearSession();

    expect(service.token).toBeNull();
    expect(service.user).toBeNull();
  });

  it('login envoie la requête et stocke la session', () => {
    const request: LoginRequest = { email: 'john@doe.tn', motDePasse: 'secret' };

    service.login(request).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);

    req.flush(mockResponse);
    expect(service.token).toBe('access-token');
    expect(service.user?.email).toBe('john@doe.tn');
  });

  it('refreshTokens renvoie une erreur si aucun token', (done) => {
    service.refreshTokens().subscribe({
      next: () => fail('devait être en erreur'),
      error: err => {
        expect(err).toBeTruthy();
        done();
      },
    });
  });

  it('refreshTokens recharge et stocke les nouveaux tokens', () => {
    service.storeSession(mockResponse);

    service.refreshTokens().subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/refresh`);
    expect(req.request.body).toEqual({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });

    const refreshed: AuthResponse = { ...mockResponse, accessToken: 'new-at', refreshToken: 'new-rt' };
    req.flush(refreshed);

    expect(service.token).toBe('new-at');
    expect(service.refreshToken).toBe('new-rt');
  });
});