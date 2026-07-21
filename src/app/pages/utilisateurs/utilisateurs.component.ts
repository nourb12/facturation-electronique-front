import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { trigger, transition, style, animate } from '@angular/animations';
import { Router } from '@angular/router';
import { UtilisateurApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';

export type ViewId = 'overview' | 'membres' | 'roles' | 'permissions' | 'activite';
type MemberStatus = 'Actif' | 'Invité' | 'Inactif';
type ActivityAction = 'Création' | 'Modification' | 'Suppression' | 'Consultation' | 'Permission' | 'Invitation';
type PermissionAction = 'voir' | 'creer' | 'modifier' | 'supprimer' | 'exporter';

interface Collaborateur {
  id: number;
  initials: string;
  name: string;
  email: string;
  roleId: string;
  statut: MemberStatus;
  actions30: number;
  lastLogin: string;
  inviteDate?: string;
}

interface Role {
  id: string;
  name: string;
  desc: string;
  color: string;
  accent: string;
  icon: string;
  custom?: boolean;
}

interface ActivityLog {
  id: number;
  memberId: number;
  who: string;
  action: ActivityAction;
  module: string;
  what: string;
  entityLabel: string;
  entityRoute: string;
  date: string;
}

interface PermissionCell {
  voir: boolean;
  creer: boolean;
  modifier: boolean;
  supprimer: boolean;
  exporter: boolean;
}

@Component({
  selector: 'app-utilisateurs',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './utilisateurs.component.html',
  styleUrls: ['./utilisateurs.component.scss'],
  animations: [
    trigger('pageIn', [transition(':enter', [
      style({ opacity: 0, transform: 'translateY(8px)' }),
      animate('320ms cubic-bezier(.16,1,.3,1)', style({ opacity: 1, transform: 'translateY(0)' }))
    ])]),
    trigger('fadeIn', [
      transition(':enter', [style({ opacity: 0 }), animate('180ms ease', style({ opacity: 1 }))]),
      transition(':leave', [animate('120ms ease', style({ opacity: 0 }))])
    ]),
    trigger('modalIn', [transition(':enter', [
      style({ opacity: 0, transform: 'translateY(16px) scale(.98)' }),
      animate('180ms cubic-bezier(.16,1,.3,1)', style({ opacity: 1, transform: 'translateY(0) scale(1)' }))
    ])])
  ]
})
export class UtilisateursComponent implements OnInit {
  private svc = inject(UtilisateurApiService);
  private router = inject(Router);
  toastSvc = inject(ToastService);

  readonly permissionActions: PermissionAction[] = ['voir', 'creer', 'modifier', 'supprimer', 'exporter'];
  readonly modules = ['Factures', 'Devis', 'Clients', 'Produits', 'Comptabilité', 'Taxes', 'Utilisateurs', 'Paramètres'];

  activeView = signal<ViewId>('overview');
  loading = signal(true);
  saving = signal(false);

  memberSearchInput = '';
  activitySearchInput = '';
  private memberSearchTimer: any;
  private activitySearchTimer: any;
  memberSearch = signal('');
  activitySearch = signal('');
  roleFilter = signal('Tous');
  statusFilter = signal<'Tous' | MemberStatus>('Tous');
  activityMemberFilter = signal('Tous');
  activityModuleFilter = signal('Tous');
  activityActionFilter = signal<'Toutes' | ActivityAction>('Toutes');
  activityStartDate = signal('');
  activityEndDate = signal('');
  pageSize = signal(10);
  page = signal(1);

  inviteModal = signal(false);
  roleModal = signal(false);
  permissionPanelRole = signal<Role | null>(null);
  confirmModal = signal<{ title: string; text: string; danger?: boolean; action: () => void } | null>(null);

  inviteForm = { name: '', email: '', roleId: 'commercial' };
  roleForm = { name: '', desc: '', permissions: new Set<string>(['Factures:voir', 'Clients:voir']) };

  nav: { id: ViewId; label: string; icon: string }[] = [
    { id: 'overview', label: "Vue d'ensemble", icon: 'layout-dashboard' },
    { id: 'membres', label: 'Membres', icon: 'users' },
    { id: 'roles', label: 'Rôles', icon: 'shield-check' },
    { id: 'permissions', label: 'Permissions', icon: 'key' },
    { id: 'activite', label: 'Activité', icon: 'activity' },
  ];

  roles = signal<Role[]>([
    { id: 'proprietaire', name: 'Responsable entreprise', icon: 'crown', color: '#FFF7D6', accent: '#A16207', desc: 'Accès complet à la plateforme, aux paramètres et à la gouvernance.' },
    { id: 'comptable', name: 'Comptable', icon: 'calculator', color: '#EAF3FF', accent: '#1D4ED8', desc: 'Factures, paiements, fiscalité, exports et suivi comptable.' },
    { id: 'commercial', name: 'Commercial', icon: 'briefcase', color: '#FCE7F3', accent: '#BE185D', desc: 'Devis, clients, factures de vente et relances commerciales.' },
    { id: 'magasinier', name: 'Responsable stock', icon: 'box', color: '#ECFDF3', accent: '#15803D', desc: 'Produits, mouvements de stock, bons et inventaires.' },
    { id: 'auditeur', name: 'Auditeur', icon: 'eye', color: '#F1F5F9', accent: '#475569', desc: 'Consultation, contrôles et exports sans modification.' },
  ]);

  membres = signal<Collaborateur[]>([
    { id: 1, initials: 'NB', name: 'Nour Ben Mna', email: 'nour@tuniflow.tn', roleId: 'proprietaire', statut: 'Actif', actions30: 48, lastLogin: "Aujourd'hui 12:10" },
    { id: 2, initials: 'AD', name: 'Anis Dridi', email: 'anis@tuniflow.tn', roleId: 'comptable', statut: 'Actif', actions30: 30, lastLogin: "Aujourd'hui 10:44" },
    { id: 3, initials: 'SK', name: 'Sarra Khelil', email: 'sarra@tuniflow.tn', roleId: 'commercial', statut: 'Actif', actions30: 24, lastLogin: 'Hier 17:02' },
    { id: 4, initials: 'MT', name: 'Mariem Triki', email: 'mariem@tuniflow.tn', roleId: 'commercial', statut: 'Actif', actions30: 14, lastLogin: 'Hier 09:25' },
    { id: 5, initials: 'FS', name: 'Firas Saad', email: 'firas@tuniflow.tn', roleId: 'magasinier', statut: 'Actif', actions30: 12, lastLogin: '18/07/2026 15:31' },
    { id: 6, initials: 'LB', name: 'Leila Baccouche', email: 'leila@tuniflow.tn', roleId: 'commercial', statut: 'Invité', actions30: 0, lastLogin: '-', inviteDate: '2026-07-16T09:15:00' },
    { id: 7, initials: 'AT', name: 'Ahmed Trabelsi', email: 'ahmed@tuniflow.tn', roleId: 'auditeur', statut: 'Invité', actions30: 0, lastLogin: '-', inviteDate: '2026-07-18T13:40:00' },
    { id: 8, initials: 'IM', name: 'Imen Mansour', email: 'imen@tuniflow.tn', roleId: 'comptable', statut: 'Inactif', actions30: 6, lastLogin: '12/07/2026 08:12' },
  ]);

  permissions = signal<Record<string, Record<string, PermissionCell>>>(this.defaultPermissions());

  fullActivity = signal<ActivityLog[]>([
    { id: 1, memberId: 1, who: 'Nour Ben Mna', action: 'Création', module: 'Factures', what: 'a créé la facture', entityLabel: 'F-2026-0142', entityRoute: '/factures', date: '2026-07-20T12:34:08' },
    { id: 2, memberId: 2, who: 'Anis Dridi', action: 'Modification', module: 'Clients', what: 'a modifié le client', entityLabel: 'Sonatrans', entityRoute: '/clients', date: '2026-07-20T11:20:44' },
    { id: 3, memberId: 1, who: 'Nour Ben Mna', action: 'Invitation', module: 'Utilisateurs', what: 'a invité', entityLabel: 'Leila Baccouche', entityRoute: '/utilisateurs', date: '2026-07-20T10:05:21' },
    { id: 4, memberId: 3, who: 'Sarra Khelil', action: 'Consultation', module: 'Comptabilité', what: 'a consulté le rapport TVA', entityLabel: 'Mars 2026', entityRoute: '/comptabilite/fiscal', date: '2026-07-20T09:48:03' },
    { id: 5, memberId: 1, who: 'Nour Ben Mna', action: 'Permission', module: 'Paramètres', what: 'a modifié les permissions du rôle', entityLabel: 'Comptable', entityRoute: '/utilisateurs', date: '2026-07-19T17:12:16' },
    { id: 6, memberId: 4, who: 'Mariem Triki', action: 'Suppression', module: 'Devis', what: 'a supprimé le brouillon', entityLabel: 'D-0031', entityRoute: '/devis', date: '2026-07-19T14:55:10' },
    { id: 7, memberId: 5, who: 'Firas Saad', action: 'Création', module: 'Produits', what: 'a ajouté 50 unités de', entityLabel: 'Câble UTP Cat6', entityRoute: '/produits', date: '2026-07-19T11:30:31' },
    { id: 8, memberId: 2, who: 'Anis Dridi', action: 'Consultation', module: 'Taxes', what: 'a exporté le référentiel', entityLabel: 'Taxes', entityRoute: '/comptabilite/taxes', date: '2026-07-18T16:12:02' },
    { id: 9, memberId: 3, who: 'Sarra Khelil', action: 'Création', module: 'Clients', what: 'a créé le client', entityLabel: 'Client SARL', entityRoute: '/clients', date: '2026-07-17T08:45:54' },
    { id: 10, memberId: 1, who: 'Nour Ben Mna', action: 'Modification', module: 'Paramètres', what: 'a modifié la personnalisation', entityLabel: 'Modèle facture', entityRoute: '/entreprise/personnalisation', date: '2026-07-16T15:08:19' },
  ]);

  getCurrentViewLabel = computed(() => this.nav.find(n => n.id === this.activeView())?.label ?? "Vue d'ensemble");
  roleOptions = computed(() => this.roles().map(r => ({ id: r.id, name: r.name })));
  roleMemberCount = computed(() => (roleId: string) => this.membres().filter(m => m.roleId === roleId).length);
  invitations = computed(() => this.membres().filter(m => m.statut === 'Invité'));
  activeMembers = computed(() => this.membres().filter(m => m.statut === 'Actif'));
  totalActions = computed(() => this.membres().reduce((sum, m) => sum + m.actions30, 0));

  kpis = computed(() => [
    { label: 'Membres actifs', val: String(this.activeMembers().length), sub: `${this.membres().length} membres au total`, icon: 'users', tone: 'blue', action: () => this.filterMembersByStatus('Actif') },
    { label: 'Rôles définis', val: String(this.roles().length), sub: 'Matrice permissions active', icon: 'shield-check', tone: 'violet', action: () => this.showView('roles') },
    { label: 'Actions 30 jours', val: String(this.totalActions()), sub: 'journal consolidé', icon: 'activity', tone: 'green', action: () => this.showView('activite') },
    { label: 'Invitations en attente', val: String(this.invitations().length), sub: 'à relancer si besoin', icon: 'clock', tone: 'amber', action: () => this.filterMembersByStatus('Invité') },
  ]);

  topActions = computed(() => {
    const max = Math.max(1, ...this.membres().map(m => m.actions30));
    return this.membres()
      .filter(m => m.actions30 > 0)
      .sort((a, b) => b.actions30 - a.actions30)
      .slice(0, 5)
      .map(m => ({ ...m, pct: Math.round((m.actions30 / max) * 100), role: this.roleName(m.roleId), color: this.roleById(m.roleId)?.accent ?? '#64748B' }));
  });

  actionTypes = computed(() => {
    const modules = ['Factures', 'Clients', 'Produits', 'Comptabilité'];
    const colors = ['#16A34A', '#2563EB', '#D97706', '#7C3AED'];
    const total = Math.max(1, this.fullActivity().length);
    return modules.map((module, index) => {
      const count = this.fullActivity().filter(a => a.module === module).length;
      return { label: module, count, pct: Math.round((count / total) * 100), color: colors[index] };
    });
  });

  recentActivity = computed(() => this.fullActivity().slice(0, 5));

  filteredMembres = computed(() => {
    const q = this.memberSearch().trim().toLowerCase();
    const role = this.roleFilter();
    const status = this.statusFilter();
    return this.membres().filter(m => {
      const matchesSearch = !q || [m.name, m.email, this.roleName(m.roleId), m.statut].some(v => v.toLowerCase().includes(q));
      const matchesRole = role === 'Tous' || m.roleId === role;
      const matchesStatus = status === 'Tous' || m.statut === status;
      return matchesSearch && matchesRole && matchesStatus;
    });
  });

  filteredActivity = computed(() => {
    const q = this.activitySearch().trim().toLowerCase();
    return this.fullActivity().filter(a => {
      const day = a.date.slice(0, 10);
      const matchesMember = this.activityMemberFilter() === 'Tous' || String(a.memberId) === this.activityMemberFilter();
      const matchesModule = this.activityModuleFilter() === 'Tous' || a.module === this.activityModuleFilter();
      const matchesAction = this.activityActionFilter() === 'Toutes' || a.action === this.activityActionFilter();
      const matchesStart = !this.activityStartDate() || day >= this.activityStartDate();
      const matchesEnd = !this.activityEndDate() || day <= this.activityEndDate();
      const matchesSearch = !q || [a.who, a.what, a.entityLabel, a.module, a.action].some(v => v.toLowerCase().includes(q));
      return matchesMember && matchesModule && matchesAction && matchesStart && matchesEnd && matchesSearch;
    });
  });

  pagedActivity = computed(() => {
    const start = (this.page() - 1) * this.pageSize();
    return this.filteredActivity().slice(start, start + this.pageSize());
  });

  totalPages = computed(() => Math.max(1, Math.ceil(this.filteredActivity().length / this.pageSize())));

  permissionPreview = computed(() => {
    const matrix = this.permissions()[this.selectedRoleForPerm()] ?? {};
    const allowed = this.modules.filter(module => Object.values(matrix[module] ?? {}).some(Boolean));
    return allowed.length ? allowed.join(', ') : 'Aucun module visible';
  });

  permissionSummary = computed(() => {
    const matrix = this.permissions()[this.selectedRoleForPerm()] ?? {};
    const enabled = this.modules.reduce((sum, module) =>
      sum + Object.values(matrix[module] ?? {}).filter(Boolean).length, 0);
    const visibleModules = this.modules.filter(module => Object.values(matrix[module] ?? {}).some(Boolean)).length;
    const deleteRights = this.modules.filter(module => matrix[module]?.supprimer).length;

    return {
      enabled,
      visibleModules,
      deleteRights,
      total: this.modules.length * this.permissionActions.length,
    };
  });

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.svc.lister().subscribe({
      next: () => {
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  showView(id: ViewId) {
    this.activeView.set(id);
  }

  setMemberSearch(value: string) {
    clearTimeout(this.memberSearchTimer);
    this.memberSearchTimer = setTimeout(() => this.memberSearch.set(value), 300);
  }

  setActivitySearch(value: string) {
    clearTimeout(this.activitySearchTimer);
    this.activitySearchTimer = setTimeout(() => {
      this.activitySearch.set(value);
      this.page.set(1);
    }, 300);
  }

  filterMembersByStatus(status: MemberStatus) {
    this.statusFilter.set(status);
    this.roleFilter.set('Tous');
    this.showView('membres');
  }

  filterActivityByModule(module: string) {
    this.activityModuleFilter.set(module);
    this.page.set(1);
    this.showView('activite');
  }

  filterActivityByMember(memberId: number) {
    this.activityMemberFilter.set(String(memberId));
    this.page.set(1);
    this.showView('activite');
  }

  filterMembersByRole(roleId: string) {
    this.roleFilter.set(roleId);
    this.statusFilter.set('Tous');
    this.showView('membres');
  }

  resetMemberFilters() {
    this.memberSearchInput = '';
    this.memberSearch.set('');
    this.roleFilter.set('Tous');
    this.statusFilter.set('Tous');
  }

  resetActivityFilters() {
    this.activitySearchInput = '';
    this.activitySearch.set('');
    this.activityMemberFilter.set('Tous');
    this.activityModuleFilter.set('Tous');
    this.activityActionFilter.set('Toutes');
    this.activityStartDate.set('');
    this.activityEndDate.set('');
    this.page.set(1);
  }

  roleById(roleId: string): Role | undefined {
    return this.roles().find(r => r.id === roleId);
  }

  roleName(roleId: string): string {
    return this.roleById(roleId)?.name ?? 'Rôle non défini';
  }

  memberById(id: number): Collaborateur | undefined {
    return this.membres().find(m => m.id === id);
  }

  getInitials(name: string): string {
    return (name || '').split(' ').map(part => part[0]).join('').toUpperCase().slice(0, 2) || 'NA';
  }

  updateMemberRole(member: Collaborateur, roleId: string) {
    this.membres.update(list => list.map(m => m.id === member.id ? { ...m, roleId } : m));
    this.toastSvc.success(`Rôle de ${member.name} mis à jour.`);
  }

  toggleMemberStatus(member: Collaborateur) {
    const statut: MemberStatus = member.statut === 'Actif' ? 'Inactif' : 'Actif';
    this.membres.update(list => list.map(m => m.id === member.id ? { ...m, statut } : m));
    this.toastSvc.success(statut === 'Actif' ? 'Collaborateur réactivé.' : 'Collaborateur désactivé.');
  }

  relanceInvitation(member: Collaborateur) {
    this.toastSvc.success(`Invitation relancée à ${member.email}.`);
  }

  requestDeleteMember(member: Collaborateur) {
    this.confirmModal.set({
      title: 'Supprimer le collaborateur',
      text: `Confirmez-vous la suppression de ${member.name} ? Cette action sera tracée dans le journal.`,
      danger: true,
      action: () => {
        this.membres.update(list => list.filter(m => m.id !== member.id));
        this.confirmModal.set(null);
        this.toastSvc.success('Collaborateur supprimé.');
      }
    });
  }

  sendInvite() {
    if (!this.inviteForm.name.trim() || !this.inviteForm.email.trim()) {
      this.toastSvc.error('Renseignez le nom et l’email.');
      return;
    }
    const role = this.roleById(this.inviteForm.roleId);
    this.membres.update(list => [...list, {
      id: Date.now(),
      initials: this.getInitials(this.inviteForm.name),
      name: this.inviteForm.name.trim(),
      email: this.inviteForm.email.trim(),
      roleId: this.inviteForm.roleId,
      statut: 'Invité',
      actions30: 0,
      lastLogin: '-',
      inviteDate: new Date().toISOString(),
    }]);
    this.fullActivity.update(list => [{
      id: Date.now(),
      memberId: 1,
      who: 'Nour Ben Mna',
      action: 'Invitation',
      module: 'Utilisateurs',
      what: 'a invité',
      entityLabel: this.inviteForm.name.trim(),
      entityRoute: '/utilisateurs',
      date: new Date().toISOString(),
    }, ...list]);
    this.inviteForm = { name: '', email: '', roleId: role?.id ?? 'commercial' };
    this.inviteModal.set(false);
    this.toastSvc.success('Invitation envoyée.');
  }

  openRoleModal() {
    this.roleForm = { name: '', desc: '', permissions: new Set<string>(['Factures:voir', 'Clients:voir']) };
    this.roleModal.set(true);
  }

  toggleRoleFormPermission(module: string, action: PermissionAction) {
    const key = `${module}:${action}`;
    if (this.roleForm.permissions.has(key)) this.roleForm.permissions.delete(key);
    else this.roleForm.permissions.add(key);
  }

  addRole() {
    if (!this.roleForm.name.trim()) {
      this.toastSvc.error('Le nom du rôle est obligatoire.');
      return;
    }
    const id = `custom_${Date.now()}`;
    this.roles.update(list => [...list, {
      id,
      name: this.roleForm.name.trim(),
      desc: this.roleForm.desc.trim() || 'Rôle personnalisé.',
      icon: 'user-cog',
      color: '#EEF2FF',
      accent: '#4F46E5',
      custom: true,
    }]);
    const matrix = this.emptyPermissionMatrix();
    this.roleForm.permissions.forEach(key => {
      const [module, action] = key.split(':') as [string, PermissionAction];
      matrix[module][action] = true;
    });
    this.permissions.update(current => ({ ...current, [id]: matrix }));
    this.roleModal.set(false);
    this.toastSvc.success('Rôle créé.');
  }

  duplicateRole(role: Role) {
    const id = `custom_${Date.now()}`;
    this.roles.update(list => [...list, { ...role, id, name: `${role.name} copie`, custom: true }]);
    this.permissions.update(current => ({ ...current, [id]: structuredClone(current[role.id] ?? this.emptyPermissionMatrix()) }));
    this.toastSvc.success('Rôle dupliqué.');
  }

  requestDeleteRole(role: Role) {
    const count = this.roleMemberCount()(role.id);
    if (count > 0) {
      this.toastSvc.error(`Suppression bloquée : ${count} membre(s) utilisent ce rôle.`);
      return;
    }
    this.confirmModal.set({
      title: 'Supprimer le rôle',
      text: `Confirmez-vous la suppression du rôle ${role.name} ?`,
      danger: true,
      action: () => {
        this.roles.update(list => list.filter(r => r.id !== role.id));
        this.permissions.update(current => {
          const next = { ...current };
          delete next[role.id];
          return next;
        });
        this.confirmModal.set(null);
        this.toastSvc.success('Rôle supprimé.');
      }
    });
  }

  openPermissionPanel(role: Role) {
    this.permissionPanelRole.set(role);
  }

  editRolePerms(roleId: string) {
    this.selectedRoleForPerm.set(roleId);
    this.showView('permissions');
  }

  togglePermission(roleId: string, module: string, action: PermissionAction) {
    this.permissions.update(current => {
      const next = structuredClone(current);
      next[roleId] ??= this.emptyPermissionMatrix();
      next[roleId][module][action] = !next[roleId][module][action];
      return next;
    });
    this.toastSvc.success('Permission enregistrée.');
  }

  resetPermissions(roleId = this.selectedRoleForPerm()) {
    this.permissions.update(current => ({ ...current, [roleId]: this.defaultPermissions()[roleId] ?? this.emptyPermissionMatrix() }));
    this.toastSvc.success('Permissions par défaut restaurées.');
  }

  selectedRoleForPerm = signal('comptable');

  rolePermissionScore(roleId: string): number {
    const matrix = this.permissions()[roleId] ?? {};
    return this.modules.reduce((sum, module) => sum + Object.values(matrix[module] ?? {}).filter(Boolean).length, 0);
  }

  permissionEnabled(roleId: string, module: string, action: PermissionAction): boolean {
    return !!this.permissions()[roleId]?.[module]?.[action];
  }

  actionClass(action: ActivityAction): string {
    const map: Record<ActivityAction, string> = {
      Création: 'create',
      Modification: 'edit',
      Suppression: 'delete',
      Consultation: 'view',
      Permission: 'perm',
      Invitation: 'invite',
    };
    return map[action];
  }

  actionIcon(action: ActivityAction): string {
    const map: Record<ActivityAction, string> = {
      Création: 'plus',
      Modification: 'edit',
      Suppression: 'trash',
      Consultation: 'eye',
      Permission: 'shield-check',
      Invitation: 'mail-plus',
    };
    return map[action];
  }

  statusClass(status: MemberStatus): string {
    return status === 'Actif' ? 'ok' : status === 'Invité' ? 'invite' : 'off';
  }

  formatDateTime(value: string): string {
    return new Date(value).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  formatDateTimePrecise(value: string): string {
    return new Date(value).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  relativeTime(value: string): string {
    const diff = Date.now() - new Date(value).getTime();
    const minutes = Math.max(1, Math.round(diff / 60000));
    if (minutes < 60) return `il y a ${minutes} min`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `il y a ${hours}h`;
    return this.formatDateTime(value);
  }

  goToEntity(activity: ActivityLog) {
    this.router.navigate([activity.entityRoute]);
  }

  nextPage() {
    this.page.set(Math.min(this.totalPages(), this.page() + 1));
  }

  prevPage() {
    this.page.set(Math.max(1, this.page() - 1));
  }

  exportMembersExcel() {
    this.downloadCsv('collaborateurs_membres.csv', this.filteredMembres().map(m => ({
      Nom: m.name,
      Email: m.email,
      Role: this.roleName(m.roleId),
      Statut: m.statut,
      Invitation: m.inviteDate ? this.formatDateTime(m.inviteDate) : '',
      Actions30j: m.actions30,
      DerniereConnexion: m.lastLogin,
    })));
    this.toastSvc.success('Export Excel des membres généré.');
  }

  exportMembersPdf() {
    this.exportPdf('collaborateurs_membres.pdf', 'Collaborateurs - membres', this.filteredMembres().map(m => `${m.name} | ${this.roleName(m.roleId)} | ${m.statut} | ${m.actions30} actions`));
  }

  exportActivityExcel() {
    this.downloadCsv('collaborateurs_journal.csv', this.filteredActivity().map(a => ({
      Date: this.formatDateTimePrecise(a.date),
      Membre: a.who,
      Module: a.module,
      Action: a.action,
      Entite: a.entityLabel,
      Detail: a.what,
    })));
    this.toastSvc.success('Export Excel du journal généré.');
  }

  exportActivityPdf() {
    this.exportPdf('collaborateurs_journal.pdf', 'TuniFlow - journal d’activité', this.filteredActivity().map(a => `${this.formatDateTimePrecise(a.date)} | ${a.who} | ${a.module} | ${a.action} | ${a.entityLabel}`));
  }

  private async exportPdf(fileName: string, title: string, rows: string[]) {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    let y = 48;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text(title, 40, y);
    y += 18;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Export TuniFlow - ${this.formatDateTimePrecise(new Date().toISOString())}`, 40, y);
    y += 28;
    rows.forEach(row => {
      if (y > 760) {
        doc.addPage();
        y = 48;
      }
      doc.text(row.slice(0, 118), 40, y);
      y += 16;
    });
    doc.save(fileName);
    this.toastSvc.success('Export PDF généré.');
  }

  private downloadCsv(fileName: string, rows: Record<string, unknown>[]) {
    const safeRows = rows.length ? rows : [{ Message: 'Aucune donnée' }];
    const headers = Object.keys(safeRows[0]);
    const csv = [
      headers.join(';'),
      ...safeRows.map(row => headers.map(header => this.csvEscape(row[header])).join(';'))
    ].join('\r\n');
    const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  }

  private csvEscape(value: unknown): string {
    const normalized = String(value ?? '').replace(/\r?\n/g, ' ');
    return /[";\r\n]/.test(normalized) ? `"${normalized.replace(/"/g, '""')}"` : normalized;
  }

  private defaultPermissions(): Record<string, Record<string, PermissionCell>> {
    const all = this.emptyPermissionMatrix(true);
    const readOnly = this.emptyPermissionMatrix();
    this.modules.forEach(module => { readOnly[module].voir = true; readOnly[module].exporter = true; });
    const comptable = this.emptyPermissionMatrix();
    ['Factures', 'Clients', 'Comptabilité', 'Taxes'].forEach(module => {
      comptable[module] = { voir: true, creer: true, modifier: true, supprimer: false, exporter: true };
    });
    const commercial = this.emptyPermissionMatrix();
    ['Factures', 'Devis', 'Clients', 'Produits'].forEach(module => {
      commercial[module] = { voir: true, creer: true, modifier: true, supprimer: false, exporter: false };
    });
    const stock = this.emptyPermissionMatrix();
    ['Produits'].forEach(module => {
      stock[module] = { voir: true, creer: true, modifier: true, supprimer: false, exporter: true };
    });
    return {
      proprietaire: all,
      comptable,
      commercial,
      magasinier: stock,
      auditeur: readOnly,
    };
  }

  private emptyPermissionMatrix(enabled = false): Record<string, PermissionCell> {
    return this.modules.reduce((acc, module) => ({
      ...acc,
      [module]: { voir: enabled, creer: enabled, modifier: enabled, supprimer: enabled, exporter: enabled }
    }), {} as Record<string, PermissionCell>);
  }
}
