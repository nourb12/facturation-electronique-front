import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { authGuard } from './auth-guard';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';

describe('authGuard', () => {
  let previousDemo: boolean;
  let router: jasmine.SpyObj<Router>;
  let authService: Partial<AuthService>;
  let loginTree: UrlTree;
  let pendingTree: UrlTree;

  const runGuard = () => TestBed.runInInjectionContext(() => authGuard({} as any, {} as any));

  beforeEach(() => {
    previousDemo = environment.demoMode;
    (environment as any).demoMode = false;

    router = jasmine.createSpyObj('Router', ['createUrlTree']);
    loginTree = {} as UrlTree;
    pendingTree = {} as UrlTree;

    router.createUrlTree.withArgs(['/login/entreprise']).and.returnValue(loginTree);
    router.createUrlTree.withArgs(['/auth/en-attente']).and.returnValue(pendingTree);
    router.createUrlTree.and.callFake(() => ({} as UrlTree));

    authService = { token: '' } as Partial<AuthService>;

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router },
      ],
    });
  });

  afterEach(() => {
    (environment as any).demoMode = previousDemo;
    localStorage.removeItem('ey_expires_at');
  });

  it('autorise l acces quand un token est present', () => {
    (authService as any).token = 'abc';
    (authService as any).user = { statut: 'Actif' };
    const result = runGuard();
    expect(result).toBeTrue();
    expect(router.createUrlTree).not.toHaveBeenCalledWith(['/login/entreprise']);
  });

  it('redirige vers /login/entreprise sans token', () => {
    (authService as any).token = '';
    const result = runGuard();
    expect(result).toBe(loginTree);
    expect(router.createUrlTree).toHaveBeenCalledWith(['/login/entreprise']);
  });

  it('redirige vers /auth/en-attente si le statut n est pas Actif', () => {
    (authService as any).token = 'abc';
    (authService as any).user = { statut: 'EnAttente' };
    const result = runGuard();
    expect(result).toBe(pendingTree);
    expect(router.createUrlTree).toHaveBeenCalledWith(['/auth/en-attente']);
  });

  it('redirige vers /login/entreprise si le token est expire', () => {
    (authService as any).token = 'abc';
    (authService as any).user = { statut: 'Actif' };
    (authService as any).clearSession = jasmine.createSpy('clearSession');
    localStorage.setItem('ey_expires_at', new Date(Date.now() - 1000).toISOString());

    const result = runGuard();

    expect(result).toBe(loginTree);
    expect((authService as any).clearSession).toHaveBeenCalled();
    expect(router.createUrlTree).toHaveBeenCalledWith(['/login/entreprise']);
  });
});
