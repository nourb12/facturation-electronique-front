







import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap, catchError, throwError, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';


export interface LoginRequest {
  email: string;
  motDePasse: string;
}

export interface RegisterRequest {
  prenom: string;
  nom: string;
  email: string;
  motDePasse: string;
  confirmationMotDePasse: string;
  nomEntreprise: string;
  matriculeFiscal: string;
  adresse: string;
  ville: string;
  telephone: string;
  codePostal: string;
  siteWeb: string;
  devisePrincipale: string;
}

export interface UtilisateurDto {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  role: string;
  statut: string;
  deuxFAActif: boolean;
  entrepriseId: string | null;
  derniereConnexion: string | null;
  telephone?: string | null;
  poste?: string | null;
  departement?: string | null;
  alerteConnexion?: boolean;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expireA: string;
  utilisateur: UtilisateurDto;
}

export interface DeuxFARequisResponse {
  utilisateurId: string;
}

export interface ForgotPasswordRequest {
  courriel: string;
}

export interface VerifierOtpRequest {
  courriel: string;
  otp: string;
}

export interface ReinitialiserMotDePasseRequest {
  courriel: string;
  otp: string;
  nouveauMotDePasse: string;
  confirmationMotDePasse: string;
}


const STORAGE_KEYS = {
  ACCESS_TOKEN:  'ey_access_token',
  REFRESH_TOKEN: 'ey_refresh_token',
  USER:          'ey_user',
  EXPIRES_AT:    'ey_expires_at',
} as const;

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http   = inject(HttpClient);
  private router = inject(Router);
  private api    = environment.apiUrl;


  currentUser = signal<UtilisateurDto | null>(this.loadUser());


  get token()        { return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN); }
  get refreshToken() { return localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN); }
  get isLoggedIn()   { return !!this.token && !!this.currentUser(); }
  get user()         { return this.currentUser(); }
  get role()         { return this.currentUser()?.role ?? ''; }
  get entrepriseId() { return this.currentUser()?.entrepriseId ?? ''; }
  get userId()       { return this.currentUser()?.id ?? ''; }
  get fullName()     { return `${this.currentUser()?.prenom ?? ''} ${this.currentUser()?.nom ?? ''}`.trim(); }
  get initiales()    { const u = this.currentUser(); return ((u?.prenom?.[0] ?? '') + (u?.nom?.[0] ?? '')).toUpperCase(); }


  get isAdmin()      { return this.role === 'SuperAdmin'; }
  get isEntreprise() { return this.role === 'Admin' || this.role === 'ResponsableEntreprise'; }
  get isFinancier()  { return this.role === 'ResponsableFinancier'; }


  login(req: LoginRequest) {
    return this.http.post<AuthResponse | DeuxFARequisResponse>(
      `${this.api}/auth/login`, req
    ).pipe(
      tap(res => {
        if ('accessToken' in res) {
          this.storeSession(res as AuthResponse);
        }

      })
    );
  }


  login2FA(utilisateurId: string, code: string) {
    return this.http.post<AuthResponse>(
      `${this.api}/auth/2fa/login`, { utilisateurId, code }
    ).pipe(tap(res => this.storeSession(res)));
  }


  register(req: RegisterRequest) {
    return this.http.post<AuthResponse>(
      `${this.api}/auth/register`, req
    ).pipe(tap(res => this.storeSession(res)));
  }


  logout() {
    const rt = this.refreshToken;
    if (rt) {
      this.http.post(`${this.api}/auth/logout`, { refreshToken: rt }).subscribe({
        error: () => {}
      });
    }
    this.clearSession();
    this.router.navigate(['/landing']);
  }


  refreshTokens() {
    const at = this.token;
    const rt = this.refreshToken;
    if (!at || !rt) return throwError(() => new Error('No tokens'));

    return this.http.post<AuthResponse>(
      `${this.api}/auth/refresh`, { accessToken: at, refreshToken: rt }
    ).pipe(
      tap(res => this.storeSession(res)),
      catchError(err => {
        this.clearSession();
        this.router.navigate(['/login/entreprise']);
        return throwError(() => err);
      })
    );
  }

  
  refreshTokenEntreprise(): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(
      `${this.api}/auth/refresh-token-entreprise`, {}
    ).pipe(tap(res => this.storeSession(res)));
  }


  envoyerOtp(req: ForgotPasswordRequest) {
    return this.http.post<{ message: string }>(
      `${this.api}/auth/mot-de-passe-oublie`, req
    );
  }

  verifierOtp(req: VerifierOtpRequest) {
    return this.http.post<{ message: string }>(
      `${this.api}/auth/verifier-otp`, req
    );
  }

  reinitialiserMotDePasse(req: ReinitialiserMotDePasseRequest) {
    return this.http.post<{ message: string }>(
      `${this.api}/auth/reinitialiser-mot-de-passe`, req
    );
  }


  activer2FAEtape1() {
    return this.http.post<{ secret: string; qrCodeUri: string }>(
      `${this.api}/auth/2fa/activer`, {}
    );
  }

  activer2FAEtape2(code: string) {
    return this.http.post<{ message: string }>(
      `${this.api}/auth/2fa/confirmer`, { code }
    );
  }

  desactiver2FA() {
    return this.http.delete<{ message: string }>(
      `${this.api}/auth/2fa`
    );
  }


  changerMotDePasse(motDePasseActuel: string, nouveauMotDePasse: string, confirmationMotDePasse: string) {
    return this.http.post<{ message: string }>(
      `${this.api}/auth/changer-mot-de-passe`,
      { motDePasseActuel, nouveauMotDePasse, confirmationMotDePasse }
    );
  }


  storeSession(res: AuthResponse) {
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN,  res.accessToken);
    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, res.refreshToken);
    localStorage.setItem(STORAGE_KEYS.USER,          JSON.stringify(res.utilisateur));
    localStorage.setItem(STORAGE_KEYS.EXPIRES_AT,    res.expireA);
    this.currentUser.set(res.utilisateur);
  }

  clearSession() {
    Object.values(STORAGE_KEYS).forEach(k => localStorage.removeItem(k));
    this.currentUser.set(null);
  }

  private loadUser(): UtilisateurDto | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.USER);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }


  redirectAfterLogin() {
    const role = this.role;
    if (role === 'SuperAdmin')               this.router.navigate(['/admin/dashboard']);
    else if (role === 'ResponsableFinancier') this.router.navigate(['/dashboard']);
    else if (role === 'Admin')               this.router.navigate(['/dashboard']);
    else if (role === 'ResponsableEntreprise') this.router.navigate(['/dashboard']);
    else                                     this.router.navigate(['/landing']);
  }
}
