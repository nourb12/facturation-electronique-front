import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UtilisateurApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';

interface AdminUser {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  statut: string;
  role?: string;
  entrepriseNom?: string;
}

@Component({
  selector: 'app-admin-utilisateurs',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-utilisateurs.component.html',
  styleUrls: ['./admin-utilisateurs.component.scss']
})
export class AdminUtilisateursComponent implements OnInit {
  private utilisateurSvc = inject(UtilisateurApiService);
  private toast = inject(ToastService);

  loading = signal(true);
  saving = signal(false);
  q = '';

  users = signal<AdminUser[]>([]);
  filtered: AdminUser[] = [];
  stats = signal({ total: 0, actifs: 0, suspendus: 0, admins: 0 });

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.utilisateurSvc.lister().subscribe({
      next: data => {
        this.users.set(data as AdminUser[]);
        this.filter();
        this.loading.set(false);
      },
      error: () => {
        this.toast.error('Impossible de charger les utilisateurs.');
        this.loading.set(false);
      }
    });
  }

  filter() {
    const query = this.q.trim().toLowerCase();
    const base = this.users();
    this.filtered = query
      ? base.filter(u =>
          (u.nom || '').toLowerCase().includes(query) ||
          (u.prenom || '').toLowerCase().includes(query) ||
          (u.email || '').toLowerCase().includes(query)
        )
      : [...base];

    const total = this.filtered.length;
    const actifs = this.filtered.filter(u => u.statut === 'Actif').length;
    const suspendus = this.filtered.filter(u => u.statut !== 'Actif').length;
    const admins = this.filtered.filter(u => ['SuperAdmin', 'Admin'].includes(u.role ?? '')).length;
    this.stats.set({ total, actifs, suspendus, admins });
  }

  formatRole(role: string | undefined): string {
    const map: Record<string, string> = {
      ResponsableEntreprise: 'Responsable entreprise',
      ResponsableFinancier: 'Responsable financier',
      SuperAdmin: 'Admin total',
      Admin: 'Admin'
    };
    return role ? (map[role] ?? role) : '—';
  }

  getBadge(statut: string): string {
    const isActive = statut === 'Actif';
    return 'badge ' + (isActive ? 'badge-green' : 'badge-red');
  }

  toggle(user: AdminUser) {
    if (this.saving()) return;
    this.saving.set(true);

    const action$ = user.statut === 'Actif'
      ? this.utilisateurSvc.suspendre(user.id)
      : this.utilisateurSvc.reactiver(user.id);

    action$.subscribe({
      next: () => {
        this.toast.success(user.statut === 'Actif'
          ? `${user.prenom} suspendu.`
          : `${user.prenom} réactivé.`);
        this.saving.set(false);
        this.load();
      },
      error: err => {
        this.toast.error(err?.error?.message ?? 'Erreur lors de la mise à jour.');
        this.saving.set(false);
      }
    });
  }

  supprimer(user: AdminUser) {
    if (!confirm(`Supprimer ${user.prenom} ${user.nom} ?`)) return;
    this.utilisateurSvc.supprimer(user.id).subscribe({
      next: () => {
        this.toast.success('Utilisateur supprimé.');
        this.load();
      },
      error: err => this.toast.error(err?.error?.message ?? 'Erreur.')
    });
  }
}
