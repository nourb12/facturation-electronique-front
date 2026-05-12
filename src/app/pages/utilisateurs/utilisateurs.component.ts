import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { trigger, transition, style, animate } from '@angular/animations';
import { UtilisateurApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';

export type ViewId = 'overview' | 'membres' | 'roles' | 'permissions' | 'activite';

export interface PermAction { lire: boolean; ecrire: boolean; modifier: boolean; supprimer: boolean; }
export interface PermItem   { name: string; actions: PermAction; }
export interface PermCat    { title: string; icon: string; color: string; items: PermItem[]; open: boolean; }

export interface Role {
  id: string; name: string; icon: string; color: string;
  textColor: string; desc: string; members: string[]; custom?: boolean;
}

export interface ActivityLog {
  type: 'create' | 'edit' | 'delete' | 'view' | 'perm';
  who: string; what: string; time: string;
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
      animate('380ms cubic-bezier(.16,1,.3,1)', style({ opacity: 1, transform: 'translateY(0)' }))
    ])]),
    trigger('fadeIn', [
      transition(':enter', [style({ opacity: 0 }), animate('200ms ease', style({ opacity: 1 }))]),
      transition(':leave', [animate('150ms ease', style({ opacity: 0 }))])
    ]),
    trigger('modalIn', [transition(':enter', [
      style({ opacity: 0, transform: 'translateY(16px) scale(.97)' }),
      animate('180ms cubic-bezier(.16,1,.3,1)', style({ opacity: 1, transform: 'translateY(0) scale(1)' }))
    ])])
  ]
})
export class UtilisateursComponent implements OnInit {
  private svc = inject(UtilisateurApiService);
  toastSvc    = inject(ToastService);

  // ── Navigation ──────────────────────────────────────────────
  activeView    = signal<ViewId>('overview');
  selectedRoleId = signal<string | null>(null);

  nav: { id: ViewId; label: string; icon: string }[] = [
    { id: 'overview',    label: "Vue d'ensemble", icon: 'layout-dashboard' },
    { id: 'membres',     label: 'Membres',        icon: 'users'            },
    { id: 'roles',       label: 'Rôles',          icon: 'shield-check'     },
    { id: 'permissions', label: 'Permissions',    icon: 'key'              },
    { id: 'activite',    label: 'Activité',       icon: 'activity'         },
  ];

  showView(id: ViewId) { this.activeView.set(id); }

  getCurrentViewLabel(): string {
    return this.nav.find(n => n.id === this.activeView())?.label ?? 'Vue d\'ensemble';
  }

  // ── API state ────────────────────────────────────────────────
  utilisateurs = signal<any[]>([]);
  loading      = signal(true);
  saving       = signal(false);

  // ── Modals ───────────────────────────────────────────────────
  inviteModal   = false;
  newRoleOpen   = false;
  searchQuery   = '';
  actFilter = signal<'all' | 'create' | 'edit' | 'delete' | 'view'>('all');

  // ── Forms ────────────────────────────────────────────────────
  inviteForm  = { name: '', email: '', roleId: 'commercial' };
  newRoleForm = { name: '', desc: '' };

  // ── Roles ────────────────────────────────────────────────────
  roles = signal<Role[]>([
    { id: 'proprietaire', name: 'Responsable entreprise', icon: 'crown',      color: '#FAEEDA', textColor: '#854F0B',
      desc: 'Accès total à toutes les fonctionnalités et paramètres.',         members: ['NB'] },
    { id: 'comptable',    name: 'Comptable',    icon: 'calculator', color: '#E6F1FB', textColor: '#185FA5',
      desc: 'Gestion financière — factures, paiements, TVA, exports.',         members: ['AD'] },
    { id: 'commercial',   name: 'Commercial',   icon: 'briefcase',  color: '#FBEAF0', textColor: '#993556',
      desc: 'Devis, factures clients, contacts et suivi des ventes.',          members: ['SK','MT'] },
    { id: 'magasinier',   name: 'Responsable entrepôt',   icon: 'box',        color: '#EAF3DE', textColor: '#3B6D11',
      desc: 'Articles, stocks, bons d\'entrée/sortie, inventaires.',           members: ['FS'] },
  ]);

  // ── Members (mock, replaced by API) ─────────────────────────
  membres = signal<any[]>([
    { id:1, initials:'NB', name:'Nour Ben Mna',    roleId:'proprietaire', roleName:'Responsable entreprise',  statut:'Actif',    actions30:48, lastLogin:'Aujourd\'hui', color:'#FAEEDA', tcolor:'#854F0B' },
    { id:2, initials:'AD', name:'Anis Dridi',       roleId:'comptable',    roleName:'Comptable',     statut:'Actif',    actions30:30, lastLogin:'Aujourd\'hui', color:'#E6F1FB', tcolor:'#185FA5' },
    { id:3, initials:'SK', name:'Sarra Khelil',     roleId:'commercial',   roleName:'Commercial',    statut:'Actif',    actions30:24, lastLogin:'Hier',         color:'#FBEAF0', tcolor:'#993556' },
    { id:4, initials:'MT', name:'Mariem Triki',     roleId:'commercial',   roleName:'Commercial',    statut:'Actif',    actions30:14, lastLogin:'Hier',         color:'#FBEAF0', tcolor:'#993556' },
    { id:5, initials:'FS', name:'Firas Saad',       roleId:'magasinier',   roleName:'Responsable entrepôt',    statut:'Actif',    actions30:12, lastLogin:'Il y a 2j',   color:'#EAF3DE', tcolor:'#3B6D11' },
    { id:6, initials:'LB', name:'Leila Baccouche',  roleId:'commercial',   roleName:'Commercial',    statut:'Invité',   actions30:0,  lastLogin:'—',           color:'#EEEDFE', tcolor:'#534AB7' },
  ]);

  filteredMembres = computed(() => {
    const q = this.searchQuery.toLowerCase();
    if (!q) return this.membres();
    return this.membres().filter(m =>
      m.name.toLowerCase().includes(q) || m.roleName.toLowerCase().includes(q)
    );
  });

  // ── KPI overview ─────────────────────────────────────────────
  kpis = [
    { label: 'Membres actifs',        val: '7',   sub: '+2 ce mois',       icon: 'users',    iconClass: 'users',   tooltip: '7 membres actifs sur 8 au total\n+2 nouveaux ce mois\n1 membre suspendu' },
    { label: 'Rôles définis',         val: '4',   sub: 'dont 1 personnalisé', icon: 'shield', iconClass: 'roles',   tooltip: '4 rôles configurés:\n• Responsable entreprise (1)\n• Comptable (1)\n• Commercial (3)\n• Responsable entrepôt (1)' },
    { label: 'Actions (30 jours)',    val: '142', sub: 'moy. 20/membre',    icon: 'activity', iconClass: 'actions', tooltip: '142 actions au total\nMoyenne: 20 actions/membre\nTop: Nour (48 actions)' },
    { label: 'Invitations en attente',val: '2',   sub: 'expirent dans 5j', icon: 'clock',    iconClass: 'pending', tooltip: '2 invitations en attente:\n• Leila Baccouche\n• Ahmed Trabelsi\nExpirent dans 5 jours' },
  ];

  topActions = [
    { name: 'Nour Ben Mna', val: 48, pct: 100, color: '#1D9E75' },
    { name: 'Anis Dridi',   val: 30, pct: 63,  color: '#378ADD' },
    { name: 'Sarra Khelil', val: 24, pct: 50,  color: '#D4537E' },
    { name: 'Mariem Triki', val: 14, pct: 29,  color: '#EF9F27' },
    { name: 'Firas Saad',   val: 12, pct: 25,  color: '#534AB7' },
  ];

  actionTypes = [
    { label: 'Factures',  pct: 40, color: '#1D9E75' },
    { label: 'Achats',    pct: 24, color: '#378ADD' },
    { label: 'Stock',     pct: 16, color: '#EF9F27' },
    { label: 'Contacts',  pct: 20, color: '#D4537E' },
  ];

  getInitials(name: string): string {
    return (name || '')
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  recentActivity: ActivityLog[] = [
    { type:'create', who:'Nour Ben Mna',  what:'a créé la facture F-2026-0142 pour Sonatrans',           time:'il y a 12 min' },
    { type:'edit',   who:'Anis Dridi',    what:'a modifié le bon de commande BC-0089',                   time:'il y a 1h'     },
    { type:'create', who:'Nour Ben Mna',  what:'a invité Leila Baccouche (Commercial)',                  time:'il y a 2h'     },
    { type:'view',   who:'Sarra Khelil',  what:'a consulté le rapport TVA mars 2026',                    time:'il y a 3h'     },
    { type:'perm',   who:'Nour Ben Mna',  what:'a modifié les permissions du rôle Comptable',            time:'Hier 17:12'    },
  ];

  // ── Permission categories ────────────────────────────────────
  permCats = signal<PermCat[]>([
    {
      title:'Factures & Devis', icon:'file-invoice', color:'#1D9E75', open:true,
      items:[
        { name:'Factures clients',      actions:{ lire:true,  ecrire:true,  modifier:true,  supprimer:false } },
        { name:'Factures fournisseurs', actions:{ lire:true,  ecrire:true,  modifier:true,  supprimer:false } },
        { name:'Devis',                 actions:{ lire:true,  ecrire:true,  modifier:true,  supprimer:true  } },
        { name:'Avoirs',                actions:{ lire:true,  ecrire:false, modifier:false, supprimer:false } },
        { name:'Notes de débours',      actions:{ lire:true,  ecrire:true,  modifier:false, supprimer:false } },
      ]
    },
    {
      title:'Achats', icon:'shopping-cart', color:'#378ADD', open:false,
      items:[
        { name:'Bons de commande',    actions:{ lire:true,  ecrire:false, modifier:false, supprimer:false } },
        { name:'Bons de réception',   actions:{ lire:true,  ecrire:false, modifier:false, supprimer:false } },
        { name:'Retours fournisseur', actions:{ lire:true,  ecrire:false, modifier:false, supprimer:false } },
      ]
    },
    {
      title:'Ventes', icon:'chart-line', color:'#D4537E', open:false,
      items:[
        { name:'Bons de livraison',      actions:{ lire:true,  ecrire:true,  modifier:true,  supprimer:false } },
        { name:'Bons de sortie',         actions:{ lire:true,  ecrire:true,  modifier:true,  supprimer:false } },
        { name:'Catégories des ventes',  actions:{ lire:true,  ecrire:false, modifier:false, supprimer:false } },
        { name:'Points de vente',        actions:{ lire:true,  ecrire:false, modifier:false, supprimer:false } },
        { name:'Rappels clients',        actions:{ lire:true,  ecrire:true,  modifier:false, supprimer:false } },
      ]
    },
    {
      title:'Paiements & Finance', icon:'report-money', color:'#BA7517', open:false,
      items:[
        { name:'Paiements',          actions:{ lire:true,  ecrire:true,  modifier:true,  supprimer:false } },
        { name:'Rapports TVA',       actions:{ lire:true,  ecrire:false, modifier:false, supprimer:false } },
        { name:'Taxes & paramètres', actions:{ lire:true,  ecrire:false, modifier:true,  supprimer:false } },
        { name:'Trésorerie',         actions:{ lire:true,  ecrire:false, modifier:false, supprimer:false } },
        { name:'Exports CSV/Excel',  actions:{ lire:true,  ecrire:true,  modifier:false, supprimer:false } },
      ]
    },
    {
      title:'Stock & Inventaire', icon:'box', color:'#3B6D11', open:false,
      items:[
        { name:'Articles',            actions:{ lire:true,  ecrire:false, modifier:false, supprimer:false } },
        { name:'Catégories articles', actions:{ lire:true,  ecrire:false, modifier:false, supprimer:false } },
        { name:'Marques',             actions:{ lire:true,  ecrire:false, modifier:false, supprimer:false } },
        { name:'Unités & prix',       actions:{ lire:true,  ecrire:false, modifier:false, supprimer:false } },
        { name:'Entrepôts',           actions:{ lire:false, ecrire:false, modifier:false, supprimer:false } },
        { name:'Numéros de série',    actions:{ lire:true,  ecrire:false, modifier:false, supprimer:false } },
      ]
    },
    {
      title:'Contacts & CRM', icon:'users', color:'#534AB7', open:false,
      items:[
        { name:'Clients',      actions:{ lire:true,  ecrire:true,  modifier:true,  supprimer:false } },
        { name:'Fournisseurs', actions:{ lire:true,  ecrire:true,  modifier:false, supprimer:false } },
        { name:'Contacts',     actions:{ lire:true,  ecrire:true,  modifier:true,  supprimer:false } },
      ]
    },
    {
      title:'Entreprise & Paramètres', icon:'building', color:'#0F6E56', open:false,
      items:[
        { name:'Réglages entreprise',  actions:{ lire:true,  ecrire:false, modifier:false, supprimer:false } },
        { name:'Collaborateurs',       actions:{ lire:true,  ecrire:false, modifier:false, supprimer:false } },
        { name:'Rôles',               actions:{ lire:false, ecrire:false, modifier:false, supprimer:false } },
        { name:'Taxes',                actions:{ lire:true,  ecrire:false, modifier:false, supprimer:false } },
        { name:'Intégrations tierces', actions:{ lire:false, ecrire:false, modifier:false, supprimer:false } },
        { name:'Webhooks',             actions:{ lire:false, ecrire:false, modifier:false, supprimer:false } },
      ]
    },
    {
      title:'Documents & Rapports', icon:'folder', color:'#993556', open:false,
      items:[
        { name:'Journaux',        actions:{ lire:true,  ecrire:false, modifier:false, supprimer:false } },
        { name:'Fichiers',        actions:{ lire:true,  ecrire:true,  modifier:false, supprimer:false } },
        { name:'Rapports',        actions:{ lire:true,  ecrire:false, modifier:false, supprimer:false } },
        { name:'Tableau de bord', actions:{ lire:true,  ecrire:false, modifier:false, supprimer:false } },
        { name:'Calendrier',      actions:{ lire:true,  ecrire:true,  modifier:false, supprimer:false } },
      ]
    },
  ]);

  selectedRoleForPerm = signal<string>('comptable');
  selectedUserForPerm = '';

  // ── Activity ─────────────────────────────────────────────────
  fullActivity: ActivityLog[] = [
    { type:'create', who:'Nour Ben Mna',  what:'a créé la facture F-2026-0142 pour Sonatrans',       time:'12:34' },
    { type:'edit',   who:'Anis Dridi',    what:'a modifié le bon de commande BC-0089',               time:'11:20' },
    { type:'create', who:'Nour Ben Mna',  what:'a invité Leila Baccouche avec le rôle Commercial',   time:'10:05' },
    { type:'view',   who:'Sarra Khelil',  what:'a consulté le rapport TVA de mars 2026',             time:'09:48' },
    { type:'perm',   who:'Nour Ben Mna',  what:'a modifié les permissions du rôle Comptable',        time:'Hier 17:12' },
    { type:'delete', who:'Mariem Triki',  what:'a supprimé le brouillon de devis D-0031',            time:'Hier 14:55' },
    { type:'create', who:'Firas Saad',    what:'a ajouté 50 unités de Câble UTP Cat6 en stock',      time:'Hier 11:30' },
    { type:'edit',   who:'Sarra Khelil',  what:'a modifié le client Sonatrans',                      time:'Hier 10:00' },
  ];

  filteredActivity = computed(() => {
    if (this.actFilter() === 'all') return this.fullActivity;
    return this.fullActivity.filter(a => a.type === this.actFilter());
  });

  // ── Computed perm stats ──────────────────────────────────────
  activePermsCount = computed(() =>
    this.permCats().reduce((acc, c) =>
      acc + c.items.reduce((a2, it) =>
        a2 + Object.values(it.actions).filter(Boolean).length, 0), 0)
  );
  totalPerms = computed(() =>
    this.permCats().reduce((acc, c) => acc + c.items.length * 4, 0)
  );

  // ── Lifecycle ────────────────────────────────────────────────
  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.svc.lister().subscribe({
      next: (data) => { this.utilisateurs.set(data ?? []); this.loading.set(false); },
      error: ()    => { this.loading.set(false); }
    });
  }

  // ── Permissions ──────────────────────────────────────────────
  toggleCat(cat: PermCat) { cat.open = !cat.open; }

  toggleAction(item: PermItem, action: keyof PermAction) {
    item.actions[action] = !item.actions[action];
  }

  // Nouvelle méthode pour activer/désactiver toutes les actions d'un item
  isAllActionsActive(item: PermItem): boolean {
    return item.actions.lire && item.actions.ecrire && item.actions.modifier && item.actions.supprimer;
  }

  toggleAllActions(item: PermItem) {
    const newState = !this.isAllActionsActive(item);
    item.actions.lire = newState;
    item.actions.ecrire = newState;
    item.actions.modifier = newState;
    item.actions.supprimer = newState;
  }

  toggleAllCat(cat: PermCat, val: boolean) {
    cat.items.forEach(it => {
      it.actions.lire = val;
      it.actions.ecrire = val;
      it.actions.modifier = val;
      it.actions.supprimer = val;
    });
  }

  isCatAllActive(cat: PermCat): boolean {
    return cat.items.every(it =>
      it.actions.lire && it.actions.ecrire && it.actions.modifier && it.actions.supprimer
    );
  }

  // Obtenir les utilisateurs par rôle sélectionné
  getUsersByRole(): any[] {
    const roleId = this.selectedRoleForPerm();
    return this.membres().filter(m => m.roleId === roleId);
  }

  // Callback quand l'utilisateur change
  onUserFilterChange() {
    if (this.selectedUserForPerm) {
      const user = this.membres().find(m => m.id === parseInt(this.selectedUserForPerm));
      if (user) {
        this.toastSvc.success(`Permissions de ${user.name} affichées.`);
      }
    } else {
      this.toastSvc.success(`Permissions du rôle ${this.roles().find(r => r.id === this.selectedRoleForPerm())?.name} affichées.`);
    }
  }

  // Callback quand une permission change
  onPermChange() {
    // Recalculer les stats
  }

  savePermissions() { 
    const target = this.selectedUserForPerm 
      ? this.membres().find(m => m.id === parseInt(this.selectedUserForPerm))?.name
      : this.roles().find(r => r.id === this.selectedRoleForPerm())?.name;
    this.toastSvc.success(`Permissions de ${target} enregistrées.`); 
  }

  // ── Roles ────────────────────────────────────────────────────
  addRole() {
    if (!this.newRoleForm.name) return;
    this.roles.update(list => [...list, {
      id: 'custom_' + Date.now(),
      name: this.newRoleForm.name,
      desc: this.newRoleForm.desc,
      icon: 'user',
      color: '#EEEDFE',
      textColor: '#534AB7',
      members: [],
      custom: true
    }]);
    this.newRoleForm = { name: '', desc: '' };
    this.newRoleOpen = false;
    this.toastSvc.success('Rôle créé.');
  }

  deleteRole(id: string) {
    this.roles.update(list => list.filter(r => r.id !== id));
    this.toastSvc.success('Rôle supprimé.');
  }

  editRolePerms(roleId: string) {
    this.selectedRoleForPerm.set(roleId);
    this.activeView.set('permissions');
  }

  // ── Members ──────────────────────────────────────────────────
  sendInvite() {
    if (!this.inviteForm.email || !this.inviteForm.name) {
      this.toastSvc.error('Renseignez nom et email.');
      return;
    }
    const role = this.roles().find(r => r.id === this.inviteForm.roleId);
    const parts = this.inviteForm.name.trim().split(' ');
    const initials = ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || 'XX';
    this.membres.update(list => [...list, {
      id: Date.now(),
      initials,
      name: this.inviteForm.name,
      roleId: this.inviteForm.roleId,
      roleName: role?.name ?? 'Membre',
      statut: 'Invité',
      actions30: 0,
      lastLogin: '—',
      color: role?.color ?? '#EEEDFE',
      tcolor: role?.textColor ?? '#534AB7',
    }]);
    this.inviteModal = false;
    this.inviteForm = { name: '', email: '', roleId: 'commercial' };
    this.toastSvc.success('Invitation envoyée.');
  }

  toggleStatut(m: any) {
    m.statut = m.statut === 'Actif' ? 'Suspendu' : 'Actif';
    this.membres.update(l => [...l]);
    this.toastSvc.success(m.statut === 'Actif' ? 'Compte réactivé.' : 'Compte suspendu.');
  }

  supprimerMembre(id: number) {
    if (!confirm('Supprimer ce membre ?')) return;
    this.membres.update(l => l.filter(m => m.id !== id));
    this.toastSvc.success('Membre supprimé.');
  }

  // ── Helpers ──────────────────────────────────────────────────
  getStatutClass(s: string): string {
    return s === 'Actif' ? 'ok' : s === 'Suspendu' ? 'warn' : 'neutral';
  }

  actIconClass(type: string): string {
    const m: Record<string, string> = {
      create: 'create', edit: 'edit', delete: 'delete', view: 'view', perm: 'perm'
    };
    return m[type] ?? 'view';
  }

  actIcon(type: string): string {
    const m: Record<string, string> = {
      create: 'file-plus', edit: 'edit', delete: 'trash', view: 'eye', perm: 'shield'
    };
    return m[type] ?? 'eye';
  }

  get permPct(): number {
    return Math.round((this.activePermsCount() / this.totalPerms()) * 100);
  }
}
