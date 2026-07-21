import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { trigger, transition, style, animate } from '@angular/animations';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService, LoginRequest } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-login-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TranslatePipe],
  templateUrl: './login-admin.component.html',
  styleUrls: ['./login-admin.component.scss'],
  animations: [
    trigger('pageIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(12px)' }),
        animate('400ms cubic-bezier(.16,1,.3,1)',
          style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('200ms ease', style({ opacity: 1 }))
      ])
    ])
  ]
})
export class LoginAdminComponent {
  private readonly demoEmail = 'demo.admin@eyinvoice.tn';
  private readonly demoPassword = 'Demo@2026!';
  private readonly demoOtp = '123456';
  private localDemoPending = false;

  form = { identifiant: this.demoEmail, password: this.demoPassword, otp: '' };
  credentials = { username: '', password: '' };

  showPassword = signal(false);
  loading = signal(false);
  errorMsg = signal('');
  shake = signal(false);
  show2FA = signal(false);
  userId2FA = signal('');

  constructor(
    private router: Router,
    private auth: AuthService
  ) {}

  togglePassword() { this.showPassword.update(v => !v); }

  showOtp() { return this.show2FA(); }

  loginError() { return this.errorMsg(); }

  login() { this.onSubmit(); }

  get canSubmit(): boolean {
    return this.form.identifiant.trim().length >= 3
      && this.form.password.length >= 8;
  }

  onSubmit() {
    if (!this.canSubmit || this.loading()) return;

    this.loading.set(true);
    this.errorMsg.set('');

    const req: LoginRequest = {
      email: this.form.identifiant.toLowerCase().trim(),
      motDePasse: this.form.password,
      adminConsole: true
    };

    if (this.startLocalDemoLogin(req)) return;

    this.auth.login(req).subscribe({
      next: (res: any) => {
        this.loading.set(false);

        if ('utilisateurId' in res) {
          this.userId2FA.set(res.utilisateurId);
          this.show2FA.set(true);
          return;
        }

        if (this.auth.role !== 'SuperAdmin') {
          this.auth.clearSession();
          this.errorMsg.set('ERRORS.ADMIN_ONLY');
          this.triggerShake();
          return;
        }

        this.router.navigate(['/admin/dashboard']);
      },
      error: (err: any) => {
        this.loading.set(false);
        this.errorMsg.set(err?.error?.message ?? 'ERRORS.INVALID_CREDENTIALS');
        this.triggerShake();
      }
    });
  }

  verifyOtp() {
    const code = this.form.otp.trim();
    if (code.length !== 6 || this.loading()) return;

    this.loading.set(true);
    this.errorMsg.set('');

    if (this.localDemoPending) {
      this.completeLocalDemoLogin(code);
      return;
    }

    this.auth.login2FA(this.userId2FA(), code).subscribe({
      next: () => {
        this.loading.set(false);

        if (this.auth.role === 'SuperAdmin') {
          this.router.navigate(['/admin/dashboard']);
        } else {
          this.auth.clearSession();
          this.errorMsg.set('ERRORS.INSUFFICIENT_ROLE');
          this.show2FA.set(false);
        }
      },
      error: (err: any) => {
        this.loading.set(false);
        this.errorMsg.set(err?.error?.message ?? 'ERRORS.INVALID_OTP');
        this.triggerShake();
      }
    });
  }

  private triggerShake() {
    this.shake.set(true);
    setTimeout(() => this.shake.set(false), 600);
  }

  private startLocalDemoLogin(req: LoginRequest): boolean {
    if (environment.production) return false;
    if (req.email !== this.demoEmail || req.motDePasse !== this.demoPassword) return false;

    this.auth.clearSession();
    this.localDemoPending = true;
    this.userId2FA.set('USR-DEMO-SUPERADMIN');
    this.form.otp = '';
    this.show2FA.set(true);
    this.loading.set(false);
    return true;
  }

  private completeLocalDemoLogin(code: string) {
    if (code !== this.demoOtp) {
      this.loading.set(false);
      this.errorMsg.set('Code incorrect. Utilisez 123456 pour la démonstration.');
      this.triggerShake();
      return;
    }

    const expires = new Date(Date.now() + 8 * 3600 * 1000).toISOString();
    this.auth.storeSession({
      accessToken: 'local_demo_superadmin_token',
      refreshToken: 'local_demo_superadmin_refresh',
      expireA: expires,
      utilisateur: {
        id: 'USR-DEMO-SUPERADMIN',
        prenom: 'Demo',
        nom: 'SuperAdmin',
        email: this.demoEmail,
        role: 'SuperAdmin',
        statut: 'Actif',
        deuxFAActif: true,
        entrepriseId: null,
        derniereConnexion: new Date().toISOString(),
      },
    });
    this.localDemoPending = false;
    this.loading.set(false);
    this.router.navigate(['/admin/dashboard']);
  }
}
 
