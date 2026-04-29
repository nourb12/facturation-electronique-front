import {
  Component, signal, computed, inject, OnInit, OnDestroy, Input
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { trigger, transition, style, animate } from '@angular/animations';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-en-attente',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslatePipe],
  templateUrl: './en-attente.component.html',
  styleUrls: ['./en-attente.component.scss'],
  animations: [
    trigger('pageIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(12px)' }),
        animate('400ms cubic-bezier(.16,1,.3,1)', style({ opacity: 1, transform: 'none' }))
      ])
    ]),
    trigger('pulseIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(.92)' }),
        animate('500ms cubic-bezier(.16,1,.3,1)', style({ opacity: 1, transform: 'none' }))
      ])
    ])
  ]
})
export class EnAttenteComponent implements OnInit, OnDestroy {
  private auth   = inject(AuthService);
  private http   = inject(HttpClient);
  private router = inject(Router);

  /** Référence dossier transmise depuis la page de confirmation du formulaire */
  @Input() confirmationRef = '';

  // ── État général ──────────────────────────────────────────────
  checking   = signal(false);
  statusMsg  = signal<string | null>(null);
  statusType = signal<'ok' | 'wait' | 'error'>('wait');
  showToast  = signal(false);

  /** Feedback copie référence */
  refCopied = false;

  // ── Polling auto ──────────────────────────────────────────────
  readonly pollIntervalSec = 45;
  private pollTimer:      ReturnType<typeof setInterval> | null = null;
  private countdownTimer: ReturnType<typeof setInterval> | null = null;
  private _nextCheckIn  = signal(this.pollIntervalSec);

  nextCheckIn = computed(() => this._nextCheckIn());

  // ── Cooldown bouton manuel ────────────────────────────────────
  private readonly COOLDOWN_SEC  = 12;
  private lastManualCheck        = 0;
  private cooldownTimer: ReturnType<typeof setInterval> | null = null;
  private _cooldownRemaining     = signal(0);

  cooldownActive    = computed(() => this._cooldownRemaining() > 0);
  cooldownRemaining = computed(() => this._cooldownRemaining());

  get email(): string { return this.auth.user?.email ?? '—'; }

  // ═══════════════════════════════════════════════════════════════
  ngOnInit(): void {
    // Récupérer la référence depuis la navigation state si non passée en @Input
    const nav = history.state as { reference?: string };
    if (!this.confirmationRef && nav?.reference) {
      this.confirmationRef = nav.reference;
    }
    this.startPolling();
  }

  ngOnDestroy(): void {
    this.stopPolling();
    if (this.cooldownTimer) clearInterval(this.cooldownTimer);
  }

  // ═══════════════════════════════════════════════════════════════
  // COPIE RÉFÉRENCE
  // ═══════════════════════════════════════════════════════════════
  copyRef(): void {
    if (!this.confirmationRef) return;
    navigator.clipboard.writeText(this.confirmationRef).then(() => {
      this.refCopied = true;
      setTimeout(() => this.refCopied = false, 2000);
    }).catch(() => {
      this.refCopied = false;
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // POLLING AUTOMATIQUE
  // ═══════════════════════════════════════════════════════════════
  private startPolling(): void {
    this._nextCheckIn.set(this.pollIntervalSec);

    this.countdownTimer = setInterval(() => {
      const current = this._nextCheckIn();
      this._nextCheckIn.set(current <= 1 ? this.pollIntervalSec : current - 1);
    }, 1000);

    this.pollTimer = setInterval(() => {
      this.checkStatus(true);
    }, this.pollIntervalSec * 1000);
  }

  private stopPolling(): void {
    if (this.pollTimer)      { clearInterval(this.pollTimer);      this.pollTimer      = null; }
    if (this.countdownTimer) { clearInterval(this.countdownTimer); this.countdownTimer = null; }
  }

  // ═══════════════════════════════════════════════════════════════
  // VÉRIFICATION MANUELLE
  // ═══════════════════════════════════════════════════════════════
  checkStatusManual(): void {
    const now = Date.now();
    if (now - this.lastManualCheck < this.COOLDOWN_SEC * 1000) return;
    this.lastManualCheck = now;
    this.startCooldown();
    this.checkStatus(false);
  }

  private startCooldown(): void {
    this._cooldownRemaining.set(this.COOLDOWN_SEC);
    if (this.cooldownTimer) clearInterval(this.cooldownTimer);
    this.cooldownTimer = setInterval(() => {
      const r = this._cooldownRemaining();
      if (r <= 1) {
        this._cooldownRemaining.set(0);
        if (this.cooldownTimer) clearInterval(this.cooldownTimer);
      } else {
        this._cooldownRemaining.set(r - 1);
      }
    }, 1000);
  }

  // ═══════════════════════════════════════════════════════════════
  // APPEL API STATUT
  // ═══════════════════════════════════════════════════════════════
  private checkStatus(silent: boolean): void {
    if (this.checking()) return;
    if (!silent) this.checking.set(true);

    this.http.get<{ statut: string }>(`${environment.apiUrl}/auth/statut-compte`)
      .subscribe({
        next: (res) => {
          if (!silent) this.checking.set(false);

          if (res.statut === 'Actif') {
            this.stopPolling();
            this.statusType.set('ok');
            this.statusMsg.set('AUTH.WAITING.STATUS_ACTIVE_REDIRECT');
            this.showToast.set(true);

            setTimeout(() => {
              this.auth.refreshTokenEntreprise().subscribe({
                next: () => this.router.navigate(['/dashboard']),
                error: ()  => this.router.navigate(['/login/entreprise'])
              });
            }, 2000);

          } else if (!silent) {
            this.statusType.set('wait');
            this.statusMsg.set('AUTH.WAITING.STATUS_STILL_PENDING');
          }
        },
        error: (err: HttpErrorResponse) => {
          if (!silent) this.checking.set(false);

          if (err.status === 401) {
            this.stopPolling();
            this.auth.logout();
            return;
          }

          if (!silent) {
            this.statusType.set('error');
            this.statusMsg.set('AUTH.WAITING.STATUS_CHECK_FAILED');
          }
        }
      });
  }

  // ═══════════════════════════════════════════════════════════════
  logout(): void {
    this.stopPolling();
    this.auth.logout();
  }
}
