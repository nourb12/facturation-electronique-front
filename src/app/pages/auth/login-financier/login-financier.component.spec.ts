import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { AuthService, AuthResponse } from '../../../core/services/auth.service';
import { LoginFinancierComponent } from './login-financier.component';

describe('LoginFinancierComponent', () => {
  let authSpy: jasmine.SpyObj<AuthService>;
  let router: Router;
  let currentRole: string;
  const authRes: AuthResponse = {
    accessToken: 'at', refreshToken: 'rt', expireA: '',
    utilisateur: {
      id: 'u', prenom: 'P', nom: 'N', email: 'p@n.tn', role: 'ResponsableFinancier',
      statut: 'Actif', deuxFAActif: false, entrepriseId: 'e1', derniereConnexion: null,
    },
  };

  beforeEach(async () => {
    currentRole = 'ResponsableFinancier';
    authSpy = jasmine.createSpyObj<AuthService>('AuthService', [
      'login',
      'login2FA',
      'clearSession'
    ]);
    Object.defineProperty(authSpy, 'role', { get: () => currentRole });

    await TestBed.configureTestingModule({
      imports: [RouterTestingModule, LoginFinancierComponent],
      providers: [
        { provide: AuthService, useValue: authSpy },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
  });

  const create = () => TestBed.createComponent(LoginFinancierComponent).componentInstance;

  it('n’appelle pas login si formulaire invalide', () => {
    const cmp = create();
    cmp.form = { email: 'bad', password: '123', entrepriseCode: '' } as any;
    cmp.onSubmit();
    expect(authSpy.login).not.toHaveBeenCalled();
  });

  it('redirige vers dashboard quand rôle autorisé', () => {
    authSpy.login.and.returnValue(of(authRes));
    currentRole = 'ResponsableFinancier';
    const cmp = create();
    cmp.form = { email: 'u@a.b', password: '123456', entrepriseCode: '' } as any;

    cmp.onSubmit();

    expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
  });

  it('refuse accès si rôle non autorisé', fakeAsync(() => {
    authSpy.login.and.returnValue(of(authRes));
    currentRole = 'ResponsableCommercial';
    const cmp = create();
    cmp.form = { email: 'u@a.b', password: '123456', entrepriseCode: '' } as any;

    cmp.onSubmit();
    tick(600);

    expect(authSpy.clearSession).toHaveBeenCalled();
    expect(cmp.errorMsg()).toContain('responsable financier');
    expect(router.navigate).not.toHaveBeenCalled();
  }));

  it('passe en mode 2FA quand utilisateurId est renvoyé', () => {
    authSpy.login.and.returnValue(of({ utilisateurId: 'u2' } as any));
    const cmp = create();
    cmp.form = { email: 'u@a.b', password: '123456', entrepriseCode: '' } as any;

    cmp.onSubmit();

    expect(cmp.show2FA()).toBeTrue();
    expect(cmp.userId2FA()).toBe('u2');
  });

  it('login erreur affiche message', fakeAsync(() => {
    authSpy.login.and.returnValue(throwError(() => ({ error: { message: 'bad' } })));
    const cmp = create();
    cmp.form = { email: 'u@a.b', password: '123456', entrepriseCode: '' } as any;

    cmp.onSubmit();
    tick(600);

    expect(cmp.errorMsg()).toBe('bad');
  }));

  it('onSubmit2FA appelle login2FA et navigue dashboard', () => {
    authSpy.login2FA.and.returnValue(of(authRes));
    currentRole = 'ResponsableFinancier';
    const cmp = create();
    cmp.userId2FA.set('u1');
    cmp.otpCode.set('123456');

    cmp.onSubmit2FA();

    expect(authSpy.login2FA).toHaveBeenCalledWith('u1', '123456');
    expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
  });
});