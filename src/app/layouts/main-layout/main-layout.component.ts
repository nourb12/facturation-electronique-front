
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

  @HostListener('document:keydown.escape')
  onEscape(): void { this.closeSidebar(); }

  logout(): void {
    this.closeSidebar();
    this.auth.logout();
  }

  private lockScroll():   void { document.body.style.overflow = 'hidden'; }
  private unlockScroll(): void { document.body.style.overflow = ''; }
}
