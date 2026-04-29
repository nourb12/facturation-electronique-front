
import { Routes } from '@angular/router';
import { environment } from '../environments/environment';
import { authGuard }      from './core/guards/auth-guard';
import { adminGuard }     from './core/guards/admin-guard';
import { pendingFormGuard } from './core/guards/pending-form.guard';

export const routes: Routes = [


  { path: '', redirectTo: 'landing', pathMatch: 'full' },


  {
    path: 'landing',
    loadComponent: () =>
      import('./pages/landing/landing.component').then(m => m.LandingComponent)
  },


  {
    path: 'role-selection',
    loadComponent: () =>
      import('./pages/auth/role-selection/role-selection-page.component')
        .then(m => m.RoleSelectionPageComponent)
  },


  {
    path: 'demande-acces',
    loadComponent: () =>
      import('./pages/auth/demande-acces/demande-acces.component')
        .then(m => m.DemandeAccesComponent),
    canDeactivate: [pendingFormGuard]
  },
  { path: 'register', redirectTo: 'demande-acces', pathMatch: 'full' },
  {
    path: 'register/onboarding',
    loadComponent: () =>
      import('./pages/auth/register/onboarding-wizard.component')
        .then(m => m.OnboardingWizardComponent)
  },
  {
    path: 'auth/en-attente',
    loadComponent: () =>
      import('./pages/auth/en-attente/en-attente.component')
        .then(m => m.EnAttenteComponent)
  },
  {
    path: 'login/entreprise',
    loadComponent: () =>
      import('./pages/auth/login-entreprise/login-entreprise.component')
        .then(m => m.LoginEntrepriseComponent)
  },
  {
    path: 'login/financier',
    loadComponent: () =>
      import('./pages/auth/login-financier/login-financier.component')
        .then(m => m.LoginFinancierComponent)
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./pages/auth/forgot-password/forgot-password.component')
        .then(m => m.ForgotPasswordComponent)
  },
  {
    path: 'admin/login',
    loadComponent: () =>
      import('./pages/auth/login-admin/login-admin.component')
        .then(m => m.LoginAdminComponent)
  },


  {
    path: '',
    loadComponent: () =>
      import('./layouts/main-layout/main-layout.component')
        .then(m => m.MainLayoutComponent),
    canActivate: environment.demoMode ? [] : [authGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./pages/dashboard/dashboard.component')
            .then(m => m.DashboardComponent)
      },
      {
        path: 'factures',
        loadComponent: () =>
          import('./pages/factures/factures.component')
            .then(m => m.FacturesComponent)
      },
      {
        path: 'devis',
        loadComponent: () =>
          import('./pages/devis/devis.component')
            .then(m => m.DevisComponent)
      },
      {
        path: 'avoirs',
        loadComponent: () =>
          import('./pages/avoirs/avoirs.component')
            .then(m => m.AvoirsComponent)
      },
      {
        path: 'clients',
        loadComponent: () =>
          import('./pages/clients/clients.component')
            .then(m => m.ClientsComponent)
      },
      {
        path: 'produits',
        loadComponent: () =>
          import('./pages/produits/produits.component')
            .then(m => m.ProduitsComponent)
      },
      {
        path: 'categories',
        loadComponent: () =>
          import('./pages/categories/categories.component')
            .then(m => m.CategoriesComponent)
      },
      {
        path: 'paiements',
        loadComponent: () =>
          import('./pages/paiements/paiements.component')
            .then(m => m.PaiementsComponent)
      },
      {
        path: 'transactions',
        loadComponent: () =>
          import('./pages/transactions/transactions.component')
            .then(m => m.TransactionsComponent)
      },
      {
        path: 'entreprise',
        loadComponent: () =>
          import('./pages/entreprise/entreprise.component')
            .then(m => m.EntrepriseComponent)
      },
      {
        path: 'entreprise/personnalisation',
        loadComponent: () =>
          import('./pages/entreprise/personnalisation/personnalisation.component')
            .then(m => m.PersonnalisationComponent)
      },
      {
        path: 'profil',
        loadComponent: () =>
          import('./pages/profil/profil.component')
            .then(m => m.ProfilComponent)
      },
      {
        path: 'utilisateurs',
        loadComponent: () =>
          import('./pages/utilisateurs/utilisateurs.component')
            .then(m => m.UtilisateursComponent)
      },
      {
        path: 'comptabilite/parametres-fiscaux',
        loadComponent: () =>
          import('./pages/comptabilite/parametres-fiscaux/parametres-fiscaux.component')
            .then(m => m.ParametresFiscauxComponent)
      },
      {
        path: 'comptabilite/taxes',
        loadComponent: () =>
          import('./pages/comptabilite/taxes/taxes.component')
            .then(m => m.TaxesComponent)
      },
      {
        path: 'rapports',
        loadComponent: () =>
          import('./pages/rapports/rapports.component')
            .then(m => m.RapportsComponent)
      },
    ]
  },


  {
    path: 'admin',
    loadComponent: () =>
      import('./layouts/admin-layout/admin-layout.component')
        .then(m => m.AdminLayoutComponent),
    canActivate: environment.demoMode ? [] : [adminGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./pages/admin/admin-dashboard/admin-dashboard.component')
            .then(m => m.AdminDashboardComponent)
      },
      {
        path: 'entreprises',
        loadComponent: () =>
          import('./pages/admin/admin-entreprises/admin-entreprises.component')
            .then(m => m.AdminEntreprisesComponent)
      },

      {
        path: 'demandes-kyc',
        loadComponent: () =>
          import('./pages/admin/admin-demandes-kyc/admin-demandes-kyc.component')
            .then(m => m.AdminDemandesKycComponent)
      },
      {
        path: 'demandes-kyc/:id',
        loadComponent: () =>
          import('./pages/admin/admin-detail-kyc/admin-detail-kyc.component')
            .then(m => m.AdminDetailKycComponent)
      },

      {
        path: 'utilisateurs',
        loadComponent: () =>
          import('./pages/admin/admin-utilisateurs/admin-utilisateurs.component')
            .then(m => m.AdminUtilisateursComponent)
      },
      {
        path: 'factures',
        loadComponent: () =>
          import('./pages/admin/admin-factures/admin-factures.component')
            .then(m => m.AdminFacturesComponent)
      },
      {
        path: 'audit',
        loadComponent: () =>
          import('./pages/admin/admin-audit/admin-audit.component')
            .then(m => m.AdminAuditComponent)
      },
      {
        path: 'parametres',
        loadComponent: () =>
          import('./pages/admin/admin-parametres/admin-parametres.component')
            .then(m => m.AdminParametresComponent)
      },
    ]
  },


  {
    path: 'not-found',
    loadComponent: () =>
      import('./pages/not-found/not-found.component').then(m => m.NotFoundComponent)
  },
  { path: '**', redirectTo: 'not-found' }
];
