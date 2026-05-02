import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { AuthService, AuthResponse } from '../../../core/services/auth.service';
import { LoginAdminComponent } from './login-admin.component';

describe('LoginAdminComponent', () => {
  let authSpy: jasmine.SpyObj<AuthService>;
  let router: Router;
  let currentRole: string;
  const authRes: AuthResponse = {
    accessToken: 'at', refreshToken: 'rt', expireA: '',
    utilisateur: {
      id: 'u', prenom: 'P', nom: 'N', email: 'p@n.tn', role: 'SuperAdmin',
      statut: 'Actif', deuxFAActif: false, entrepriseId: 'e1', derniereConnexion: null,
    },
  };

  beforeEach(async () => {
    currentRole = 'SuperAdmin';
    authSpy = jasmine.createSpyObj<AuthService>('AuthService', [
      'login',
      'login2FA',
      'clearSession'
    ]);
    Object.defineProperty(authSpy, 'role', { get: () => currentRole });

    await TestBed.configureTestingModule({
      imports: [RouterTestingModule, LoginAdminComponent],
      providers: [
        { provide: AuthService, useValue: authSpy },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
  });

  const create = () => TestBed.createComponent(LoginAdminComponent).componentInstance;

  it('ne soumet pas si formulaire invalide', () => {
    const cmp = create();
    cmp.form = { identifiant: 'ad', password: '123', otp: '' } as any;
    cmp.onSubmit();
    expect(authSpy.login).not.toHaveBeenCalled();
  });

  it('active lâ€™Ã©tape 2FA quand utilisateurId prÃ©sent', () => {
    authSpy.login.and.returnValue(of({ utilisateurId: 'u1' } as any));
    const cmp = create();
    cmp.form = { identifiant: 'admin', password: '12345678', otp: '' } as any;

    cmp.onSubmit();

    expect(cmp.showOtp()).toBeTrue();
    expect(cmp.userId2FA()).toBe('u1');
  });

  it('rejette si rÃ´le pas SuperAdmin', fakeAsync(() => {
    authSpy.login.and.returnValue(of(authRes));
    currentRole = 'Admin';
    const cmp = create();
    cmp.form = { identifiant: 'admin', password: '12345678', otp: '' } as any;

    cmp.onSubmit();
    tick(600);

    expect(authSpy.clearSession).toHaveBeenCalled();
    expect(cmp.errorMsg()).toContain('administrateurs');
    expect(router.navigate).not.toHaveBeenCalled();
  }));

  it('navigue dashboard admin quand SuperAdmin', () => {
    authSpy.login.and.returnValue(of(authRes));
    currentRole = 'SuperAdmin';
    const cmp = create();
    cmp.form = { identifiant: 'admin', password: '12345678', otp: '' } as any;

    cmp.onSubmit();

    expect(router.navigate).toHaveBeenCalledWith(['/admin/dashboard']);
  });

  it('verifyOtp avec mauvais rÃ´le nettoie la session', fakeAsync(() => {
    authSpy.login2FA.and.returnValue(of(authRes));
    currentRole = 'Admin';
    const cmp = create();
    cmp.userId2FA.set('u1');
    cmp.form = { identifiant: '', password: '12345678', otp: '123456' } as any;

    cmp.verifyOtp();
    tick(600);

    expect(authSpy.login2FA).toHaveBeenCalledWith('u1', '123456');
    expect(authSpy.clearSession).toHaveBeenCalled();
    expect(cmp.showOtp()).toBeFalse();
    expect(router.navigate).not.toHaveBeenCalled();
  }));

  it('verifyOtp navigue dashboard admin pour SuperAdmin', () => {
    authSpy.login2FA.and.returnValue(of(authRes));
    currentRole = 'SuperAdmin';
    const cmp = create();
    cmp.userId2FA.set('u1');
    cmp.form = { identifiant: '', password: '12345678', otp: '123456' } as any;

    cmp.verifyOtp();

    expect(router.navigate).toHaveBeenCalledWith(['/admin/dashboard']);
  });

  it('onSubmit gÃ¨re erreur serveur', fakeAsync(() => {
    authSpy.login.and.returnValue(throwError(() => ({ error: { message: 'bad' } })));
    const cmp = create();
    cmp.form = { identifiant: 'admin', password: '12345678', otp: '' } as any;

    cmp.onSubmit();
    tick(600);

    expect(cmp.errorMsg()).toBe('bad');
  }));
});