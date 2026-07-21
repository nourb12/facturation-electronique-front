
import { Component, OnInit, OnDestroy, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  RouterOutlet, RouterLink, RouterLinkActive, Router
} from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { ThemeToggleComponent } from '../../shared/components/theme-toggle/theme-toggle.component';
import { LanguageSwitcherComponent } from '../../shared/components/language-switcher/language-switcher.component';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector:    'app-main-layout',
  standalone:  true,
  imports:     [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, ThemeToggleComponent, LanguageSwitcherComponent, TranslatePipe],
  templateUrl: './main-layout.component.html',
  styleUrls:   ['./main-layout.component.scss']
})
export class MainLayoutComponent implements OnInit, OnDestroy {

  auth        = inject(AuthService);
  router      = inject(Router);
  sidebarOpen = false;
  expandedBusinessGroup = 'Ventes';
  expandedPersonalisationGroup = 'Documents';

  businessGroups = [
    {
      label: 'Ventes',
      routes: ['/ventes'],
      items: [
        { label: 'Devis', route: '/ventes/devis' },
        { label: 'Bons de commande', route: '/ventes/bons-commande' },
        { label: 'Bons de livraison', route: '/ventes/bons-livraison' },
        { label: 'Factures', route: '/ventes/factures' },
        { label: 'Factures scannées', route: '/ventes/factures-scannees' },
        { label: 'Factures d’avoir', route: '/ventes/avoirs' },
        { label: 'Paiements reçus', route: '/ventes/paiements' }
      ]
    },
    {
      label: 'Achats',
      routes: ['/achats'],
      items: [
        { label: 'Bons de réception', route: '/achats/bons-reception' },
        { label: 'Bons de commande', route: '/achats/bons-commande' },
        { label: 'Factures fournisseur', route: '/achats/factures-fournisseur' },
        { label: 'Factures scannées', route: '/achats/factures-scannees' },
        { label: 'Prestations de service', route: '/achats/prestations' },
        { label: 'Paiements fournisseur', route: '/achats/paiements' },
        { label: 'Retenue à la source', route: '/achats/retenue-source' }
      ]
    }
  ];

  personalisationGroups = [
    {
      label: 'Documents',
      icon: 'ti-files',
      color: '#6366f1',
      items: [
        { key: 'numerotation', label: 'Numérotation', icon: 'ti-list-numbers' },
        { key: 'pdf', label: 'PDF et Apparence', icon: 'ti-file-type-pdf' },
        { key: 'types', label: 'Types de documents', icon: 'ti-layout-list' }
      ]
    },
    {
      label: 'Catégories',
      icon: 'ti-tags',
      color: '#10b981',
      items: [
        { key: 'catVente', label: 'Catégories vente', icon: 'ti-trending-up' },
        { key: 'catAchat', label: 'Catégories achat', icon: 'ti-trending-down' }
      ]
    },
    {
      label: 'Fiscal et légal',
      icon: 'ti-scale',
      color: '#f59e0b',
      items: [
        { key: 'taxes', label: 'Taxes et TVA', icon: 'ti-percentage' },
        { key: 'retenues', label: 'Retenues à la source', icon: 'ti-shield-check' }
      ]
    },
    {
      label: 'Configuration',
      icon: 'ti-adjustments-horizontal',
      color: '#ec4899',
      items: [
        { key: 'articles', label: 'Articles et Unités', icon: 'ti-package' },
        { key: 'paiements', label: 'Modes de paiement', icon: 'ti-credit-card' },
        { key: 'comptabilite', label: 'Comptabilité', icon: 'ti-calculator' },
        { key: 'conditions', label: 'Conditions et Affichage', icon: 'ti-clock-cog' },
        { key: 'webhooks', label: 'Webhooks', icon: 'ti-webhook' }
      ]
    }
  ];

  get userName()     { return this.auth.fullName || 'COMMON.USER'; }
  get userInitials() { return this.auth.initiales || 'U'; }
  get userRole()     {
    const role = this.auth.role;
    switch (role) {
      case 'SuperAdmin':
        return 'AUTH.ROLES.ADMIN';
      case 'ResponsableFinancier':
        return 'AUTH.ROLES.FINANCIER';
      case 'ResponsableEntreprise':
      case 'Admin':
        return 'AUTH.ROLES.ENTREPRISE';
      default:
        return role || 'AUTH.ROLES.ENTREPRISE';
    }
  }
  get entrepriseId() { return this.auth.entrepriseId; }

  ngOnInit(): void {}
  ngOnDestroy(): void { this.unlockScroll(); }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
    this.sidebarOpen ? this.lockScroll() : this.unlockScroll();
  }

  closeSidebar(): void {
    if (this.sidebarOpen) {
      this.sidebarOpen = false;
      this.unlockScroll();
    }
  }

  isPersonalisationRoute(): boolean {
    return this.router.url.startsWith('/entreprise/personnalisation');
  }

  isBusinessRoute(group: { routes: string[]; items: Array<{ route: string }> }): boolean {
    return group.routes.some(route => this.router.url.startsWith(route)) ||
      group.items.some(item => this.router.url.startsWith(item.route));
  }

  isBusinessGroupOpen(group: { label: string; routes: string[]; items: Array<{ route: string }> }): boolean {
    return this.expandedBusinessGroup === group.label || this.isBusinessRoute(group);
  }

  toggleBusinessGroup(label: string): void {
    this.expandedBusinessGroup = this.expandedBusinessGroup === label ? '' : label;
  }

  currentPersonalisationSection(): string {
    const tree = this.router.parseUrl(this.router.url);
    return tree.queryParams['section'] || 'numerotation';
  }

  isPersonalisationGroupOpen(group: { label: string; items: Array<{ key: string }> }): boolean {
    return this.expandedPersonalisationGroup === group.label ||
      group.items.some(item => item.key === this.currentPersonalisationSection());
  }

  togglePersonalisationGroup(label: string): void {
    this.expandedPersonalisationGroup = this.expandedPersonalisationGroup === label ? '' : label;
  }

  @HostListener('document:keydown.escape')
  onEscape(): void { this.closeSidebar(); }

  logout(): void {
    this.closeSidebar();
    this.auth.logout();
  }

  private lockScroll():   void { document.body.style.overflow = 'hidden'; }
  private unlockScroll(): void { document.body.style.overflow = ''; }
}
