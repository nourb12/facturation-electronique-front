










import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { trigger, transition, style, animate } from '@angular/animations';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { UtilisateurApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-profil',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profil.component.html',
  styleUrls: ['./profil.component.scss'],
  animations: [
    trigger('pageIn', [transition(':enter', [
      style({ opacity: 0, transform: 'translateY(8px)' }),
      animate('380ms cubic-bezier(.16,1,.3,1)', style({ opacity: 1, transform: 'translateY(0)' }))
    ])])
  ]
})
export class ProfilComponent implements OnInit {
  private auth           = inject(AuthService);
  private toast          = inject(ToastService);
  private utilisateurSvc = inject(UtilisateurApiService);

  loading = signal(false);
  saving  = signal(false);

  activeTab   = 'infos';
  formModifie = false;
  initiales   = '';


  form = {
    prenom: '', nom: '', email: '',
    telephone: '', poste: '', departement: '',
    langue: 'Français',
    deuxFA: false,
    notifConnexion: true,
    role: ''
  };


  passwords = { actuel: '', nouveau: '', confirmer: '' };
  showOldPwd  = signal(false);
  showNewPwd  = signal(false);
  showConfPwd = signal(false);
  changePasswordMode = false;


  show2FASetup   = signal(false);
  qrCodeUri      = signal('');
  secret2FA      = signal('');
  code2FAConfirm = '';
  loading2FA     = signal(false);


  notifications = [
    { label: 'Facture validée',    detail: 'Email instantané',      active: true  },
    { label: 'Facture rejetée',    detail: 'SMS + email',           active: true  },
    { label: 'Nouvelle connexion', detail: 'Email',                 active: true  },
    { label: 'Export de données',  detail: 'Notification in-app',   active: false },
  ];


  sessions = signal<any[]>([]);
  loadingSessions = signal(false);


  activiteLogs: any[] = [];


  permissions: string[] = [];

  get user() { return this.auth.user; }


  ngOnInit() {
    this.hydraterDepuisUtilisateur(this.auth.user as any);
    if (this.auth.userId) {
      this.utilisateurSvc.obtenirParId(this.auth.userId).subscribe({
        next: (u) => this.hydraterDepuisUtilisateur(u),
        error: () => {}
      });
    }
    this.buildPermissions();
    this.chargerSessions();
  }

  private hydraterDepuisUtilisateur(u: any) {
    if (!u) return;
    this.form.prenom = u.prenom ?? this.form.prenom;
    this.form.nom = u.nom ?? this.form.nom;
    this.form.email = u.email ?? this.form.email;
    this.form.telephone = u.telephone ?? this.form.telephone;
    this.form.poste = u.poste ?? this.form.poste;
    this.form.departement = u.departement ?? this.form.departement;
    this.form.deuxFA = u.deuxFAActif ?? this.form.deuxFA;
    this.form.notifConnexion = u.alerteConnexion ?? this.form.notifConnexion;
    this.form.role = u.role ?? this.form.role;
    this.initiales = ((this.form.prenom?.[0] ?? '') + (this.form.nom?.[0] ?? '')).toUpperCase();
  }


  private buildPermissions() {
    const r = this.auth.role;
    const base = ['Factures — lecture', 'Clients — lecture'];
    if (r === 'SuperAdmin')            this.permissions = [...base, 'Administration totale', 'Gestion entreprises', 'Audit', '2FA requis'];
    else if (r === 'Admin')            this.permissions = [...base, 'Factures — édition', 'Utilisateurs — gestion', 'Paiements', 'Exports'];
    else if (r === 'ResponsableFinancier') this.permissions = [...base, 'Factures — édition', 'Paiements — validation', 'Exports', 'Invitations'];
    else                               this.permissions = [...base, 'Rapports', 'Exports'];
  }


  marquerModifie() { this.formModifie = true; }

  annuler() {
    this.hydraterDepuisUtilisateur(this.auth.user as any);
    this.formModifie = false;
  }

  enregistrer() { this.saveProfil(); }

  saveProfil() {
    if (this.saving()) return;
    this.saving.set(true);
    this.utilisateurSvc.mettreAJour(this.auth.userId, {
      prenom:      this.form.prenom,
      nom:         this.form.nom,
      telephone:   this.form.telephone   || undefined,
      poste:       this.form.poste       || undefined,
      departement: this.form.departement || undefined,
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.formModifie = false;
        this.toast.success('Profil mis à jour.');
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.error(err?.error?.message ?? 'Erreur mise à jour profil.');
      }
    });
  }


  togglePasswordMode() { this.changePasswordMode = !this.changePasswordMode; }

  get forcePct(): number {
    const p = this.passwords.nouveau;
    let s = 0;
    if (p.length >= 8)          s += 25;
    if (p.length >= 12)         s += 15;
    if (/[A-Z]/.test(p))        s += 20;
    if (/[0-9]/.test(p))        s += 20;
    if (/[^A-Za-z0-9]/.test(p)) s += 20;
    return Math.min(100, s);
  }
  get forceColor(): string {
    if (this.forcePct >= 80) return '#22C55E';
    if (this.forcePct >= 50) return '#F59E0B';
    return '#EF4444';
  }
  get forceLabel(): string {
    if (this.forcePct >= 80) return 'Solide';
    if (this.forcePct >= 50) return 'Moyen';
    return 'Faible';
  }

  changerPassword() {
    if (!this.passwords.actuel || !this.passwords.nouveau) { this.toast.error('Remplissez les champs.'); return; }
    if (this.passwords.nouveau !== this.passwords.confirmer) { this.toast.error('Les mots de passe ne correspondent pas.'); return; }
    if (this.forcePct < 50) { this.toast.error('Mot de passe trop faible.'); return; }

    this.saving.set(true);
    this.utilisateurSvc.changerMotDePasse(this.auth.userId, {
      motDePasseActuel:       this.passwords.actuel,
      nouveauMotDePasse:      this.passwords.nouveau,
      confirmationMotDePasse: this.passwords.confirmer,
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success('Mot de passe mis à jour.');
        this.passwords = { actuel: '', nouveau: '', confirmer: '' };
        this.changePasswordMode = false;
      },
      error: (err) => { this.saving.set(false); this.toast.error(err?.error?.message ?? 'Erreur.'); }
    });
  }


  demarrer2FASetup() {
    this.loading2FA.set(true);
    this.auth.activer2FAEtape1().subscribe({
      next: (res) => {
        this.loading2FA.set(false);
        this.qrCodeUri.set(res.qrCodeUri);
        this.secret2FA.set(res.secret);
        this.show2FASetup.set(true);
      },
      error: () => { this.loading2FA.set(false); this.toast.error('Impossible de démarrer la configuration 2FA.'); }
    });
  }

  confirmer2FA() {
    if (!this.code2FAConfirm || this.code2FAConfirm.length < 6) { this.toast.error('Code à 6 chiffres requis.'); return; }
    this.loading2FA.set(true);
    this.auth.activer2FAEtape2(this.code2FAConfirm).subscribe({
      next: () => {
        this.loading2FA.set(false);
        this.form.deuxFA = true;
        this.show2FASetup.set(false);
        this.code2FAConfirm = '';
        this.toast.success('Double authentification activée.');
      },
      error: (err) => { this.loading2FA.set(false); this.toast.error(err?.error?.message ?? 'Code invalide.'); }
    });
  }

  desactiver2FA() {
    this.loading2FA.set(true);
    this.auth.desactiver2FA().subscribe({
      next: () => { this.loading2FA.set(false); this.form.deuxFA = false; this.toast.info('Double authentification désactivée.'); },
      error: () => { this.loading2FA.set(false); this.toast.error('Erreur désactivation 2FA.'); }
    });
  }


  chargerSessions() {
    if (!this.auth.userId) return;
    this.loadingSessions.set(true);
    this.utilisateurSvc.obtenirSessions(this.auth.userId).subscribe({
      next: (data) => { this.loadingSessions.set(false); this.sessions.set(data ?? []); },
      error: () => { this.loadingSessions.set(false); }
    });
  }

  revoquerSession(s: any) {
    this.utilisateurSvc.revoquerSession(this.auth.userId, s.id).subscribe({
      next: ()    => { this.sessions.update(list => list.filter(x => x.id !== s.id)); this.toast.info('Session révoquée.'); },
      error: ()   => this.toast.error('Erreur révocation session.')
    });
  }

  revoquerToutesSessions() {
    this.utilisateurSvc.revoquerToutesSessions(this.auth.userId).subscribe({
      next: ()  => { this.chargerSessions(); this.toast.info('Toutes les sessions révoquées.'); },
      error: () => this.toast.error('Erreur révocation sessions.')
    });
  }

  logout() { this.auth.logout(); }
}
