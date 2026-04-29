import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { financierGuard } from './financier-guard';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';

describe('financierGuard', () => {
  let previousDemo: boolean;
  let router: jasmine.SpyObj<Router>;
  let authService: Partial<AuthService>;
  let loginTree: UrlTree;

  const runGuard = () => TestBed.runInInjectionContext(() => financierGuard({} as any, {} as any));

  beforeEach(() => {
    previousDemo = environment.demoMode;
    (environment as any).demoMode = false;

    router = jasmine.createSpyObj('Router', ['createUrlTree']);
    loginTree = {} as UrlTree;
    router.createUrlTree.and.returnValue(loginTree);

    authService = { token: '', role: '' } as Partial<AuthService>;

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router },
      ],
    });
  });

  afterEach(() => {
    (environment as any).demoMode = previousDemo;
  });

  it('redirige vers /login/financier sans token', () => {
    (authService as any).token = '';
    const result = runGuard();
    expect(result).toBe(loginTree);
    expect(router.createUrlTree).toHaveBeenCalledWith(['/login/financier']);
  });

  it('redirige si le role n est pas autorise', () => {
    (authService as any).token = 'token';
    (authService as any).role = 'SuperAdmin';
    const result = runGuard();
    expect(result).toBe(loginTree);
    expect(router.createUrlTree).toHaveBeenCalledWith(['/login/financier']);
  });

  it('autorise Admin/ResponsableEntreprise/ResponsableFinancier', () => {
    (authService as any).token = 'token';
    for (const role of ['Admin', 'ResponsableEntreprise', 'ResponsableFinancier']) {
      (authService as any).role = role;
      const result = runGuard();
      expect(result).toBeTrue();
    }
    expect(router.createUrlTree).not.toHaveBeenCalled();
  });
});