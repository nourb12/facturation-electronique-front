import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { trigger, transition, style, animate } from '@angular/animations';
import { UtilisateurApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-utilisateurs',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './utilisateurs.component.html',
  styleUrls: ['./utilisateurs.component.scss'],
  animations: [
    trigger('pageIn', [transition(':enter', [
      style({ opacity: 0, transform: 'translateY(8px)' }),
      animate('380ms cubic-bezier(.16,1,.3,1)', style({ opacity: 1, transform: 'translateY(0)' }))
    ])]),
    trigger('fadeIn', [
      transition(':enter', [style({ opacity: 0 }), animate('200ms ease', style({ opacity: 1 }))]),
      transition(':leave', [animate('150ms ease', style({ opacity: 0 }))])
    ]),
    trigger('modalIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(16px) scale(.97)' }),
        animate('180ms cubic-bezier(.16,1,.3,1)', style({ opacity: 1, transform: 'translateY(0) scale(1)' }))
      ])
    ])
  ]
})
export class UtilisateursComponent implements OnInit {
  private svc = inject(UtilisateurApiService);
  toastSvc = inject(ToastService);

  utilisateurs = signal<any[]>([]);
  loading = signal(true);
  saving = signal(false);
  showModal = signal(false);
  searchQuery = '';
  inviteModal = false;
  toast: string | null = null;

  form = {
    prenom: '', nom: '', email: '',
    motDePasse: '', confirmationMotDePasse: '',
    role: 'ResponsableFinancier'
  };

  inviteForm = { name: '', email: '', level: 'standard' };

  permSections = [
    {
      title: 'Factures', icon: '[F]',
      perms: [
        { name: 'Creer des factures',  desc: 'Brouillons + validations',  enabled: true,  risk: 'low',  riskLabel: 'Faible',  color: 'ok',   icon: 'OK' },
        { name: 'Envoyer au client',   desc: 'Transmission TTN',          enabled: true,  risk: 'med',  riskLabel: 'Modere',  color: 'info', icon: '->' },
        { name: 'Annuler / supprimer', desc: 'Brouillons uniquement',     enabled: false, risk: 'high', riskLabel: 'Eleve',   color: 'warn', icon: 'X' },
      ]
    },
    {
      title: 'Paiements', icon: '[P]',
      perms: [
        { name: 'Valider paiement', desc: 'Marquer comme paye',  enabled: true,  risk: 'med', riskLabel: 'Modere', color: 'info', icon: 'OK' },
        { name: 'Exporter CSV',     desc: 'Exports comptables',  enabled: true,  risk: 'low', riskLabel: 'Faible', color: 'ok',   icon: 'CSV' },
      ]
    },
    {
      title: 'Utilisateurs', icon: '[U]',
      perms: [
        { name: 'Inviter membre',   desc: 'Responsables financiers', enabled: true,  risk: 'med',  riskLabel: 'Modere', color: 'info', icon: '+' },
        { name: 'Suspendre acces',  desc: 'Revocation temporaire',   enabled: false, risk: 'high', riskLabel: 'Eleve',  color: 'warn', icon: '!' },
      ]
    },
  ];

  filteredUtilisateurs = computed(() => {
    const q = this.searchQuery.toLowerCase();
    if (!q) return this.utilisateurs();
    return this.utilisateurs().filter(u =>
      u.prenom?.toLowerCase().includes(q) ||
      u.nom?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.role?.toLowerCase().includes(q)
    );
  });

  get currentFinancier() {
    const u = this.utilisateurs()[0];
    if (!u) {
      return {
        initials: 'RF',
        name: 'Responsable Financier',
        email: '--',
        lastLogin: '--',
        history: [],
      } as any;
    }
    return {
      initials: this.getInitials(u),
      name: `${u.prenom ?? u.name ?? ''} ${u.nom ?? ''}`.trim(),
      email: u.email ?? '--',
      lastLogin: (u.lastLogin ?? u.derniereConnexion ?? '--'),
      history: u.history ?? [],
    } as any;
  }

  get otherUsers() {
    return this.utilisateurs().slice(1).map((u: any) => ({
      initials: this.getInitials(u),
      name: `${u.prenom ?? ''} ${u.nom ?? ''}`.trim() || (u.name ?? 'Utilisateur'),
      role: this.formatRole(u.role),
      statut: (u.statut ?? 'Actif').toLowerCase(),
      statutLabel: u.statut ?? 'Actif',
      color: u.color ?? '#E5E7EB',
    }));
  }

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.svc.lister().subscribe({
      next: (data) => { this.utilisateurs.set(data ?? []); this.loading.set(false); },
      error: ()    => { this.loading.set(false); }
    });
  }

  creer() {
    if (!this.form.prenom || !this.form.nom || !this.form.email) {
      this.showToast('Remplissez tous les champs obligatoires.');
      return;
    }
    if (this.form.motDePasse !== this.form.confirmationMotDePasse) {
      this.showToast('Les mots de passe ne correspondent pas.');
      return;
    }
    this.saving.set(true);
    this.svc.creer(this.form).subscribe({
      next: (u) => {
        this.saving.set(false);
        this.utilisateurs.update(list => [u, ...list]);
        this.showModal.set(false);
        this.resetForm();
        this.toastSvc.success(`Utilisateur ${u.prenom} ${u.nom} cree.`);
      },
      error: (err) => {
        this.saving.set(false);
        this.toastSvc.error(err?.error?.message ?? 'Erreur creation utilisateur.');
      }
    });
  }

  toggleStatut(u: any) {
    const action$ = u.statut === 'Actif'
      ? this.svc.suspendre(u.id)
      : this.svc.reactiver(u.id);

    action$.subscribe({
      next: () => {
        u.statut = u.statut === 'Actif' ? 'Suspendu' : 'Actif';
        this.utilisateurs.update(list => [...list]);
        this.toastSvc.success(u.statut === 'Actif' ? 'Compte reactive.' : 'Compte suspendu.');
      },
      error: (err) => this.toastSvc.error(err?.error?.message ?? 'Erreur.')
    });
  }

  supprimer(u: any) {
    if (!confirm(`Supprimer ${u.prenom} ${u.nom} ?`)) return;
    this.svc.supprimer(u.id).subscribe({
      next: () => {
        this.utilisateurs.update(list => list.filter(x => x.id !== u.id));
        this.toastSvc.success('Utilisateur supprime.');
      },
      error: (err) => this.toastSvc.error(err?.error?.message ?? 'Erreur.')
    });
  }

  sendInvite() {
    if (!this.inviteForm.email || !this.inviteForm.name) {
      this.showToast('Renseignez nom et email.');
      return;
    }

    const req = {
      prenom: this.inviteForm.name.split(' ')[0] ?? this.inviteForm.name,
      nom:    this.inviteForm.name.split(' ').slice(1).join(' ') || '-',
      email:  this.inviteForm.email,
      motDePasse: 'TempPass@2026!',
      confirmationMotDePasse: 'TempPass@2026!',
      role: this.inviteForm.level === 'standard' ? 'ResponsableFinancier' : 'ResponsableEntreprise'
    };
    this.svc.creer(req).subscribe({
      next: (u) => {
        this.utilisateurs.update(list => [u, ...list]);
        this.inviteModal = false;
        this.inviteForm = { name: '', email: '', level: 'standard' };
        this.toastSvc.success('Invitation envoyee.');
      },
      error: (err) => this.toastSvc.error(err?.error?.message ?? 'Erreur invitation.')
    });
  }

  get activePermsCount(): number {
    return this.permSections.reduce((acc, s) => acc + s.perms.filter(p => p.enabled).length, 0);
  }
  get totalPerms(): number {
    return this.permSections.reduce((acc, s) => acc + s.perms.length, 0);
  }
  get accessLevel(): string {
    const pct = (this.activePermsCount / this.totalPerms) * 100;
    if (pct >= 80) return 'Eleve';
    if (pct >= 50) return 'Standard';
    return 'Restreint';
  }
  get accessLevelColor(): string {
    const pct = (this.activePermsCount / this.totalPerms) * 100;
    if (pct >= 80) return 'ok';
    if (pct >= 50) return 'info';
    return 'warn';
  }

  togglePerm(perm: any) { perm.enabled = !perm.enabled; this.onPermChange(); }

  onPermChange() { this.showToast('Permissions mises a jour.'); }

  saveAccess()   { this.showToast('Acces sauvegarde.'); }
  revokeAccess() { this.showToast('Acces revoque.'); }

  getInitials(u: any): string {
    return ((u.prenom?.[0] ?? '') + (u.nom?.[0] ?? '')).toUpperCase();
  }

  formatRole(role: string | undefined): string {
    const map: Record<string, string> = {
      ResponsableEntreprise: 'Responsable entreprise',
      ResponsableFinancier: 'Responsable financier',
      SuperAdmin: 'Admin total',
      Admin: 'Admin'
    };
    return role ? (map[role] ?? role) : 'Membre';
  }

  getStatutClass(s: string): string {
    return s === 'Actif' ? 'ok' : s === 'Suspendu' ? 'warn' : 'neutral';
  }

  private resetForm() {
    this.form = { prenom: '', nom: '', email: '', motDePasse: '', confirmationMotDePasse: '', role: 'ResponsableFinancier' };
  }

  private showToast(msg: string) {
    this.toast = msg;
    this.toastSvc.info(msg);
    setTimeout(() => this.toast = null, 2200);
  }
}
