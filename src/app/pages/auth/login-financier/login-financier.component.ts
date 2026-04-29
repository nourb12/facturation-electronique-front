
import { Component, signal } from '@angular/core';
import { CommonModule }      from '@angular/common';
import { FormsModule }       from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { trigger, transition, style, animate } from '@angular/animations';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService, LoginRequest } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login-financier',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TranslatePipe],
  templateUrl: './login-financier.component.html',
  styleUrls:  ['./login-financier.component.scss'],
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
export class LoginFinancierComponent {

  form = { email: '', password: '', entrepriseCode: '' };

  showPassword = signal(false);
  loading      = signal(false);
  errorMsg     = signal('');
  shake        = signal(false);
  show2FA      = signal(false);
  userId2FA    = signal('');
  otpCode      = signal('');

  constructor(
    private router: Router,
    private auth: AuthService
  ) {}

  togglePassword() { this.showPassword.update(v => !v); }

  get emailValid() { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.form.email); }
  get canSubmit()  { return this.emailValid && this.form.password.length >= 6; }

  onSubmit() {
    if (!this.canSubmit || this.loading()) return;
    this.loading.set(true);
    this.errorMsg.set('');

    const req: LoginRequest = {
      email:      this.form.email.toLowerCase().trim(),
      motDePasse: this.form.password
    };

    this.auth.login(req).subscribe({
      next: (res: any) => {
        this.loading.set(false);
        if ('utilisateurId' in res) {
          this.userId2FA.set(res.utilisateurId);
          this.show2FA.set(true);
          return;
        }

        const role = this.auth.role;
        if (role !== 'ResponsableFinancier' && role !== 'Admin' && role !== 'SuperAdmin') {
          this.auth.clearSession();
          this.errorMsg.set('ERRORS.FINANCIER_ONLY');
          this.triggerShake();
          return;
        }
        this.router.navigate(['/dashboard']);
      },
      error: (err: any) => {
        this.loading.set(false);
        this.errorMsg.set(err?.error?.message ?? 'ERRORS.INVALID_CREDENTIALS');
        this.triggerShake();
      }
    });
  }

  onSubmit2FA() {
    if (this.otpCode().length !== 6 || this.loading()) return;
    this.loading.set(true);
    this.auth.login2FA(this.userId2FA(), this.otpCode()).subscribe({
      next: () => { this.loading.set(false); this.router.navigate(['/dashboard']); },
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
}
