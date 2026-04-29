import { HttpClient, HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { jwtInterceptor } from './jwt-interceptor';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';

const API = environment.apiUrl.replace(/\/+$/, '');

describe('jwtInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let router: jasmine.SpyObj<Router>;
  let currentToken: string;
  let authService: AuthService;
  let previousDemo: boolean;

  beforeEach(() => {
    previousDemo = environment.demoMode;
    (environment as any).demoMode = false;
    currentToken = 'old-token';

    router = jasmine.createSpyObj('Router', ['navigate']);

    const authStub = {
      get token() { return currentToken; },
      refreshTokens: jasmine.createSpy('refreshTokens').and.callFake(() => {
        currentToken = 'new-token';
        return of({} as any);
      }),
      clearSession: jasmine.createSpy('clearSession'),
    } as Partial<AuthService> as AuthService;

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authStub },
        { provide: Router, useValue: router },
        provideHttpClient(withInterceptors([jwtInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService);
  });

  afterEach(() => {
    (environment as any).demoMode = previousDemo;
    httpMock.verify();
  });

  it('ajoute le header Authorization pour une route API protegee', () => {
    currentToken = 'abc';
    http.get(`${API}/secure`).subscribe();
    const req = httpMock.expectOne(`${API}/secure`);
    expect(req.request.headers.get('Authorization')).toBe('Bearer abc');
    req.flush({});
  });

  it('n\'ajoute pas le header pour une route publique', () => {
    currentToken = 'abc';
    http.get(`${API}/auth/login`).subscribe();
    const req = httpMock.expectOne(`${API}/auth/login`);
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({});
  });

  it('ignore les appels hors API (pas de token)', () => {
    currentToken = 'abc';
    http.get('https://cdn.jsdelivr.net/npm/x').subscribe();
    const req = httpMock.expectOne('https://cdn.jsdelivr.net/npm/x');
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({});
  });

  it('tente un refresh sur 401 et rejoue la requete avec le nouveau token', () => {
    http.get(`${API}/secure`).subscribe();

    const first = httpMock.expectOne(`${API}/secure`);
    first.flush({}, { status: 401, statusText: 'Unauthorized' });

    const retry = httpMock.expectOne(`${API}/secure`);
    expect(retry.request.headers.get('Authorization')).toBe('Bearer new-token');
    retry.flush({ ok: true });

    expect((authService as any).refreshTokens).toHaveBeenCalled();
  });

  it('nettoie la session et redirige si le refresh echoue', () => {
    (authService as any).refreshTokens.and.returnValue(throwError(() => new Error('refresh failed')));

    http.get(`${API}/secure`).subscribe({
      error: (err: HttpErrorResponse) => {
        expect(err).toBeTruthy();
      }
    });

    const first = httpMock.expectOne(`${API}/secure`);
    first.flush({}, { status: 401, statusText: 'Unauthorized' });

    expect((authService as any).clearSession).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/login/entreprise']);
  });

  it('redirige vers /login/entreprise sur 403 API', () => {
    http.get(`${API}/secure`).subscribe({
      error: () => {
        expect((authService as any).clearSession).toHaveBeenCalled();
        expect(router.navigate).toHaveBeenCalledWith(['/login/entreprise']);
      }
    });

    const req = httpMock.expectOne(`${API}/secure`);
    req.flush({}, { status: 403, statusText: 'Forbidden' });
  });
});