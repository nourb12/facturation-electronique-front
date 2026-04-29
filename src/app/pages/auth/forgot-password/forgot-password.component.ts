
import { Component, OnDestroy, signal } from '@angular/core';
import { CommonModule }  from '@angular/common';
import { FormsModule }   from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService }   from '../../../core/services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TranslatePipe],
  templateUrl: './forgot-password.component.html',
  styleUrls:   ['./forgot-password.component.scss']
})
export class ForgotPasswordComponent implements OnDestroy {

  currentStep = signal<1 | 2 | 3>(1);
  loading     = signal(false);
  errorMsg    = signal('');
  shake       = signal(false);
  successMsg  = signal('');


  email = '';
  get emailValid() { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email); }


  otp = '';
  get otpValid() { return this.otp.replace(/\s/g,'').length === 6; }


  newPassword     = '';
  confirmPassword = '';
  showNewPwd      = signal(false);
  showConfirmPwd  = signal(false);
  pwBars = [1, 2, 3, 4];

  get passwordsValid() {
    return this.newPassword.length >= 8
      && this.newPassword === this.confirmPassword
      && /[A-Z]/.test(this.newPassword)
      && /[0-9]/.test(this.newPassword);
  }


  otpCountdown   = signal(0);
  private counterId?: ReturnType<typeof setInterval>;

  constructor(
    private auth: AuthService,
    private router: Router
  ) {}

  ngOnDestroy() { if (this.counterId) clearInterval(this.counterId); }



  sendOtp() {
    if (!this.emailValid || this.loading()) return;
    this.loading.set(true);
    this.errorMsg.set('');

    this.auth.envoyerOtp({ courriel: this.email.toLowerCase().trim() }).subscribe({
      next: () => {
        this.loading.set(false);
        this.currentStep.set(2);
        this.startOtpCountdown();
      },
      error: (err: any) => {
        this.loading.set(false);

        this.currentStep.set(2);
        this.startOtpCountdown();
      }
    });
  }



  verifyOtp() {
    if (!this.otpValid || this.loading()) return;
    this.loading.set(true);
    this.errorMsg.set('');

    this.auth.verifierOtp({
      courriel: this.email.toLowerCase().trim(),
      otp:      this.otp.replace(/\s/g,'')
    }).subscribe({
      next: () => {
        this.loading.set(false);
        this.currentStep.set(3);
      },
      error: (err: any) => {
        this.loading.set(false);
        this.errorMsg.set(err?.error?.message ?? 'ERRORS.OTP_INVALID_OR_EXPIRED');
        this.triggerShake();
      }
    });
  }



  resetPassword() {
    if (!this.passwordsValid || this.loading()) return;
    this.loading.set(true);
    this.errorMsg.set('');

    this.auth.reinitialiserMotDePasse({
      courriel:               this.email.toLowerCase().trim(),
      otp:                    this.otp.replace(/\s/g,''),
      nouveauMotDePasse:      this.newPassword,
      confirmationMotDePasse: this.confirmPassword
    }).subscribe({
      next: () => {
        this.loading.set(false);
        this.successMsg.set('AUTH.FORGOT.SUCCESS_REDIRECT');
        setTimeout(() => this.router.navigate(['/login/entreprise']), 2000);
      },
      error: (err: any) => {
        this.loading.set(false);
        this.errorMsg.set(err?.error?.message ?? 'ERRORS.PASSWORD_RESET_FAILED');
        this.triggerShake();
      }
    });
  }

  resendOtp() {
    if (this.otpCountdown() > 0) return;
    this.sendOtp();
  }


  sendCode() { this.sendOtp(); }
  resendCountdown() { return this.otpCountdown(); }
  resendCode() { this.resendOtp(); }
  verifyCode() { this.verifyOtp(); }
  goBack() {
    const step = this.currentStep();
    if (step > 1) this.currentStep.set((step - 1) as 1 | 2 | 3);
    else this.router.navigate(['/login/entreprise']);
  }

  showNewPw() { return this.showNewPwd(); }
  toggleShowNewPw() { this.showNewPwd.update(v => !v); }

  showConfirm() { return this.showConfirmPwd(); }
  toggleShowConfirm() { this.showConfirmPwd.update(v => !v); }

  get confirmPw() { return this.confirmPassword; }
  set confirmPw(v: string) { this.confirmPassword = v; }

  get pwsMatch() { return !!this.confirmPassword && this.newPassword === this.confirmPassword; }
  get pwValid()  { return this.passwordsValid; }

  get pwStrength() {
    let score = 0;
    if (this.newPassword.length >= 8) score++;
    if (/[A-Z]/.test(this.newPassword)) score++;
    if (/[0-9]/.test(this.newPassword)) score++;
    if (/[^A-Za-z0-9]/.test(this.newPassword)) score++;
    return score; // 0..4
  }

  isPwBarActive(bar: number) { return this.pwStrength >= bar; }
  get pwColor() {
    if (this.pwStrength >= 3) return '#22C55E';
    if (this.pwStrength === 2) return '#F59E0B';
    return '#EF4444';
  }
  get pwLabel() {
    if (this.pwStrength >= 3) return 'AUTH.FORGOT.PW_STRENGTH.STRONG';
    if (this.pwStrength === 2) return 'AUTH.FORGOT.PW_STRENGTH.MEDIUM';
    return 'AUTH.FORGOT.PW_STRENGTH.WEAK';
  }

  private startOtpCountdown() {
    this.otpCountdown.set(60);
    this.counterId = setInterval(() => {
      this.otpCountdown.update(v => {
        if (v <= 1) { clearInterval(this.counterId); return 0; }
        return v - 1;
      });
    }, 1000);
  }

  private triggerShake() {
    this.shake.set(true);
    setTimeout(() => this.shake.set(false), 600);
  }
}
