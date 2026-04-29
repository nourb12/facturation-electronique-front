import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { DashboardApiService } from '../../../core/services/api.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss']
})
export class AdminDashboardComponent implements OnInit {
  private svc = inject(DashboardApiService);
  router = inject(Router);

  loading = signal(true);
  dashboard = signal<any>(null);

  showNotifs = signal(false);
  unreadCount = signal(0);
  notifications: any[] = [];

  barData = signal([
    { label: 'J', pct: 62, active: false },
    { label: 'F', pct: 68, active: false },
    { label: 'M', pct: 75, active: true },
    { label: 'A', pct: 70, active: false },
    { label: 'M', pct: 80, active: false },
    { label: 'J', pct: 82, active: false }
  ]);

  auditLog = [
    { action: 'Connexion admin', date: 'Aujourd\'hui · 09:12' },
    { action: 'Suspension utilisateur #U-431', date: 'Hier · 18:44' },
    { action: 'Export CSV factures', date: '12/03 · 10:02' },
    { action: 'Création entreprise SOLARIS', date: '11/03 · 16:30' }
  ];

  donutSegments = computed(() => {
    const s = this.stats;
    const parts = [
      { label: 'Entreprises', count: s.entreprises, color: '#FDE68A' },
      { label: 'Utilisateurs', count: s.utilisateurs, color: '#BFDBFE' },
      { label: 'Factures', count: s.factures, color: '#BBF7D0' },
      { label: 'Retards', count: s.retard, color: '#FECACA' }
    ].filter(p => (p.count ?? 0) > 0);

    const total = parts.reduce((t, p) => t + p.count, 0) || 1;
    const circ = 2 * Math.PI * 46;
    let offset = 0;
    return parts.map(p => {
      const dash = (p.count / total) * circ;
      const seg = { ...p, dash: `${dash} ${circ - dash}`, offset: -offset };
      offset += dash;
      return seg;
    });
  });

  ngOnInit() {
    this.svc.obtenirDashboardAdmin().subscribe({
      next: d => {
        this.dashboard.set(d);
        this.loading.set(false);
        this.notifications = (d?.alertes ?? this.auditLog).map((a: any, i: number) => ({
          id: i,
          text: a.message ?? a.action,
          time: a.date ?? 'Maintenant',
          read: false
        }));
        this.unreadCount.set(this.notifications.length);
      },
      error: () => this.loading.set(false)
    });
  }

  get stats() {
    const d = this.dashboard();
    if (!d) return { entreprises: 0, utilisateurs: 0, factures: 0, retard: 0 };
    return {
      entreprises: d.totalEntreprises ?? 0,
      utilisateurs: d.totalUtilisateurs ?? 0,
      factures: d.totalFacturesPlateforme ?? 0,
      retard: d.facturesEnRetard ?? 0
    };
  }

  toggleNotifs() { this.showNotifs.update(v => !v); }
  markNotifRead(n: any) { if (!n?.read) { n.read = true; this.unreadCount.update(v => Math.max(0, v - 1)); } }
  clearNotifs() { this.notifications.forEach(n => n.read = true); this.unreadCount.set(0); }

  fmt(v: number): string { return new Intl.NumberFormat('fr-TN').format(Math.round(v ?? 0)); }
}