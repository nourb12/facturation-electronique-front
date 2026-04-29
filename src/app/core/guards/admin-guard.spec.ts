import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { adminGuard } from './admin-guard';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';

describe('adminGuard', () => {
  let previousDemo: boolean;
  let router: jasmine.SpyObj<Router>;
  let authService: Partial<AuthService>;
  let loginTree: UrlTree;

  const runGuard = () => TestBed.runInInjectionContext(() => adminGuard({} as any, {} as any));

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

  it('redirige vers /admin/login si aucun token', () => {
    (authService as any).token = '';
    const result = runGuard();
    expect(result).toBe(loginTree);
    expect(router.createUrlTree).toHaveBeenCalledWith(['/admin/login']);
  });

  it('redirige si le role n est pas SuperAdmin', () => {
    (authService as any).token = 'token';
    (authService as any).role = 'Admin';
    const result = runGuard();
    expect(result).toBe(loginTree);
    expect(router.createUrlTree).toHaveBeenCalledWith(['/admin/login']);
  });

  it('autorise l acces pour SuperAdmin', () => {
    (authService as any).token = 'token';
    (authService as any).role = 'SuperAdmin';
    expect(runGuard()).toBeTrue();
    expect(router.createUrlTree).not.toHaveBeenCalled();
  });
});