import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { AuthService, AuthResponse } from '../../../core/services/auth.service';
import { LoginEntrepriseComponent } from './login-entreprise.component';

describe('LoginEntrepriseComponent', () => {
  let authSpy: jasmine.SpyObj<AuthService>;
  let router: Router;
  const authRes: AuthResponse = {
    accessToken: 'at', refreshToken: 'rt', expireA: '',
    utilisateur: {
      id: 'u', prenom: 'P', nom: 'N', email: 'p@n.tn', role: 'Admin',
      statut: 'Actif', deuxFAActif: false, entrepriseId: 'e1', derniereConnexion: null,
    },
  };

  beforeEach(async () => {
    authSpy = jasmine.createSpyObj<AuthService>('AuthService', [
      'login',
      'login2FA',
      'redirectAfterLogin'
    ], { role: 'Admin' });

    await TestBed.configureTestingModule({
      imports: [RouterTestingModule, LoginEntrepriseComponent],
      providers: [{ provide: AuthService, useValue: authSpy }],
    }).compileComponents();

    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
  });

  const create = () => TestBed.createComponent(LoginEntrepriseComponent).componentInstance;

  it('ne soumet pas si formulaire invalide', () => {
    const cmp = create();
    cmp.form = { email: 'bad', password: '12', remember: false };
    cmp.onSubmit();
    expect(authSpy.login).not.toHaveBeenCalled();
  });

  it('appelle login puis redirectAfterLogin en succès simple', () => {
    authSpy.login.and.returnValue(of(authRes));
    const cmp = create();
    cmp.form = { email: 'User@Mail.Com', password: '123456', remember: false };

    cmp.onSubmit();

    expect(authSpy.login).toHaveBeenCalledWith({ email: 'user@mail.com', motDePasse: '123456' });
    expect(authSpy.redirectAfterLogin).toHaveBeenCalled();
    expect(cmp.loading()).toBeFalse();
    expect(cmp.show2FA()).toBeFalse();
  });

  it('affiche étape 2FA quand la réponse contient utilisateurId', () => {
    authSpy.login.and.returnValue(of({ utilisateurId: 'u1' } as any));
    const cmp = create();
    cmp.form = { email: 'u@a.b', password: '123456', remember: false };

    cmp.onSubmit();

    expect(cmp.show2FA()).toBeTrue();
    expect(cmp.userId2FA()).toBe('u1');
    expect(authSpy.redirectAfterLogin).not.toHaveBeenCalled();
  });

  it('affiche le message d’erreur en cas d’échec login', fakeAsync(() => {
    authSpy.login.and.returnValue(throwError(() => ({ error: { message: 'oops' } })));
    const cmp = create();
    cmp.form = { email: 'u@a.b', password: '123456', remember: false };

    cmp.onSubmit();
    tick(600);

    expect(cmp.errorMsg()).toBe('oops');
    expect(cmp.loading()).toBeFalse();
  }));

  it('onSubmit2FA appelle login2FA et redirige', () => {
    authSpy.login2FA.and.returnValue(of(authRes));
    authSpy.redirectAfterLogin.and.stub();
    const cmp = create();
    cmp.userId2FA.set('u1');
    cmp.otpCode.set('123456');

    cmp.onSubmit2FA();

    expect(authSpy.login2FA).toHaveBeenCalledWith('u1', '123456');
    expect(authSpy.redirectAfterLogin).toHaveBeenCalled();
  });
});