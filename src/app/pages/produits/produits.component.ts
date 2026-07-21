
import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { trigger, transition, style, animate } from '@angular/animations';
import {
  ProduitApiService, ProduitDto,
  CategorieApiService, CategorieDto
} from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { ConfirmationService } from '../../core/services/confirmation.service';

type ProduitView = {
  id: string;
  nom: string;
  description: string;
  ref: string;
  categorie: string;
  type: 'service' | 'article';
  prix: number;
  tva: number;
  statut: 'ok' | 'warn' | 'neutral';
  statutLabel: string;
};

const DEMO_CATEGORIES: CategorieDto[] = [
  { id: 'CAT-1', nom: 'Services', description: 'Prestations et conseil', estActive: true, nbProduits: 3, entrepriseId: 'ENT-1', creeLe: '2026-01-02' },
  { id: 'CAT-2', nom: 'Logiciels', description: 'Licences et SaaS', estActive: true, nbProduits: 2, entrepriseId: 'ENT-1', creeLe: '2026-01-02' },
  { id: 'CAT-3', nom: 'Materiel', description: 'Equipements', estActive: true, nbProduits: 1, entrepriseId: 'ENT-1', creeLe: '2026-01-05' }
];

const DEMO_PRODUITS: ProduitDto[] = [
  { id: 'DEMO-PR-1', code: 'SRV-AUDIT', libelle: 'Audit conformite TEIF', description: 'Forfait audit complet', prixUnitaire: 2800, tauxTva: 19, unite: 'Forfait', type: 'Service', estActif: true, categorieId: 'CAT-1', categorieNom: 'Services', entrepriseId: 'ENT-1', creeLe: '2026-02-10', modifieLe: '2026-05-02' },
  { id: 'DEMO-PR-2', code: 'LIC-ERP', libelle: 'Licence ERP Cloud', description: 'Licence annuelle', prixUnitaire: 7200, tauxTva: 19, unite: 'Licence', type: 'Produit', estActif: true, categorieId: 'CAT-2', categorieNom: 'Logiciels', entrepriseId: 'ENT-1', creeLe: '2026-01-05', modifieLe: '2026-05-02' },
  { id: 'DEMO-PR-3', code: 'SRV-SUP', libelle: 'Support Premium', description: 'Support mensuel SLA', prixUnitaire: 450, tauxTva: 19, unite: 'Mois', type: 'Service', estActif: true, categorieId: 'CAT-1', categorieNom: 'Services', entrepriseId: 'ENT-1', creeLe: '2026-01-08', modifieLe: '2026-05-03' },
  { id: 'DEMO-PR-4', code: 'MAT-SCN', libelle: 'Scanner A4', description: 'Scanner de bureau', prixUnitaire: 390, tauxTva: 19, unite: 'U', type: 'Produit', estActif: true, categorieId: 'CAT-3', categorieNom: 'Materiel', entrepriseId: 'ENT-1', creeLe: '2026-02-11', modifieLe: '2026-05-04' }
];

@Component({
  selector: 'app-produits',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './produits.component.html',
  styleUrls: ['./produits.component.scss'],
  animations: [
    trigger('pageIn', [transition(':enter', [
      style({ opacity: 0, transform: 'translateY(8px)' }),
      animate('400ms cubic-bezier(.16,1,.3,1)',
        style({ opacity: 1, transform: 'translateY(0)' }))
    ])]),
    trigger('fadeIn', [
      transition(':enter', [style({ opacity: 0 }), animate('200ms ease', style({ opacity: 1 }))]),
      transition(':leave', [animate('150ms ease', style({ opacity: 0 }))])
    ])
  ]
})
export class ProduitsComponent implements OnInit {

  private produitSvc   = inject(ProduitApiService);
  private categorieSvc = inject(CategorieApiService);
  private toast        = inject(ToastService);
  private confirmSvc   = inject(ConfirmationService);

  loading    = signal(true);
  saving     = signal(false);
  produits   = signal<ProduitView[]>([]);
  categories = signal<CategorieDto[]>([]);
  total      = signal(0);

  searchQuery       = '';
  activeCategorieId = '';
  showModal         = false;
  editProduit: ProduitView | null = null;
  showAlert = true;

  form = {
    code: '', libelle: '', description: '',
    prixUnitaire: 0, tauxTva: 19,
    type: 'Produit', unite: 'U', categorieId: ''
  };

  readonly tauxTvaOptions = [0, 7, 13, 19];
  readonly typeOptions    = ['Produit', 'Service'];
  readonly unites         = ['U', 'Kg', 'Heure'];
  readonly tvaOptions     = this.tauxTvaOptions;

  filters = [
    { key: 'all', label: 'Tout', count: 0 },
    { key: 'service', label: 'Services', count: 0 },
    { key: 'article', label: 'Articles', count: 0 },
  ];
  activeFilter = 'all';

  newProduit = { nom: '', ref: '', type: 'service', categorie: '', unite: 'U', prix: 0, tva: 19, description: '' };

  filteredProduits = computed(() => {
    let list = this.produits();
    const q = this.searchQuery.toLowerCase();
    if (q) list = list.filter(p =>
      p.nom.toLowerCase().includes(q) ||
      p.ref.toLowerCase().includes(q)
    );
    if (this.activeCategorieId)
      list = list.filter(p => p.categorie === this.activeCategorieId);
    if (this.activeFilter !== 'all')
      list = list.filter(p => p.type === this.activeFilter);
    return list;
  });

  ngOnInit() { this.loadAll(); }

  loadAll() {
    this.loading.set(true);
    this.produitSvc.lister(1, 200).subscribe({
      next: res => {
        const items = res.items?.length ? res.items : DEMO_PRODUITS;
        this.produits.set(items.map(p => this.toView(p)));
        this.total.set(res.items?.length ? (res.total ?? res.items.length) : items.length);
        this.refreshCounts();
        this.loading.set(false);
      },
      error: () => {
        this.produits.set(DEMO_PRODUITS.map(p => this.toView(p)));
        this.total.set(DEMO_PRODUITS.length);
        this.refreshCounts();
        this.loading.set(false);
      }
    });
    this.categorieSvc.lister().subscribe({
      next: cats => this.categories.set(cats.length ? cats : DEMO_CATEGORIES),
      error: () => this.categories.set(DEMO_CATEGORIES)
    });
  }

  openModal(p?: ProduitDto) {
    if (p) {
      const vm = this.toView(p);
      this.editProduit = vm;
      this.newProduit = {
        nom: vm.nom, ref: vm.ref, type: vm.type,
        categorie: vm.categorie, unite: 'U',
        prix: vm.prix, tva: vm.tva, description: vm.description
      };
    } else {
      this.editProduit = null;
      this.resetForm();
    }
    this.showModal = true;
  }

  closeModal() { this.showModal = false; this.resetForm(); }

  save() {
    if (!this.form.code || !this.form.libelle || this.saving()) return;
    this.saving.set(true);

    const req = {
      code:          this.form.code.toUpperCase().trim(),
      libelle:       this.form.libelle,
      description:   this.form.description || undefined,
      prixUnitaire:  this.form.prixUnitaire,
      tauxTva:       this.form.tauxTva,
      type:          this.form.type,
      unite:         this.form.unite,
      categorieId:   this.form.categorieId || undefined,
    };

    const obs = this.editProduit
      ? this.produitSvc.mettreAJour(this.editProduit.id, req)
      : this.produitSvc.creer(req);

    obs.subscribe({
      next: (p) => {
        this.saving.set(false);
        const vm = this.toView(p);
        if (this.editProduit) {
          this.produits.update(list => list.map(x => x.id === p.id ? vm : x));
          this.toast.success('Produit mis à jour.');
        } else {
          this.produits.update(list => [vm, ...list]);
          this.toast.success('Produit créé.');
        }
        this.refreshCounts();
        this.closeModal();
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.error(err?.error?.message ?? 'Erreur.');
      }
    });
  }

  toggleActif(p: ProduitDto) {
    const obs = p.estActif ? this.produitSvc.desactiver(p.id) : this.produitSvc.reactiver(p.id);
    obs.subscribe({
      next: () => {
        this.produits.update(list => list.map(x => x.id === p.id ? { ...x, statut: x.statut === 'warn' ? 'ok' : 'warn' } : x));
        this.toast.success(p.estActif ? 'Désactivé.' : 'Réactivé.');
      },
      error: (err) => this.toast.error(err?.error?.message ?? 'Erreur.')
    });
  }


  setFilter(key: string) { this.activeFilter = key; }

  get nbAlerts() { return this.produits().filter(p => p.statut === 'warn').length; }
  get nbServices() { return this.produits().filter(p => p.type === 'service').length; }
  get nbArticles() { return this.produits().filter(p => p.type === 'article').length; }
  get totalCA() { return this.produits().reduce((acc, p) => acc + p.prix, 0).toLocaleString('fr-TN'); }

  saveProduit() {
    if (!this.newProduit.nom.trim()) return;
    const vm: ProduitView = {
      id: crypto.randomUUID(),
      nom: this.newProduit.nom,
      description: this.newProduit.description,
      ref: this.newProduit.ref || this.newProduit.nom.slice(0, 3).toUpperCase(),
      categorie: this.newProduit.categorie || 'Général',
      type: this.newProduit.type as 'service' | 'article',
      prix: Number(this.newProduit.prix) || 0,
      tva: Number(this.newProduit.tva) || 0,
      statut: 'ok',
      statutLabel: 'Actif'
    };
    this.produits.update(list => [vm, ...list]);
    this.refreshCounts();
    this.closeModal();
    this.toast.success('Produit ajouté (local).');
  }

  prixTTC(p: ProduitView) { return (p.prix * (1 + (p.tva ?? 0) / 100)).toLocaleString('fr-TN'); }

  confirmDelete(p: ProduitView) {
    this.confirmSvc.confirm({
      title: 'Supprimer ce produit ?',
      message: `Cette action est irréversible. Le produit « ${p.nom} » sera définitivement supprimé.`,
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      confirmClass: 'danger',
      onConfirm: () => this.deleteProduit(p.id)
    });
  }

  deleteProduit(id: string) {
    this.produitSvc.supprimer(id).subscribe({
      next: () => {
        this.produits.update(list => list.filter(p => p.id !== id));
        this.refreshCounts();
        this.toast.success('Produit supprimé.');
      },
      error: (err: any) => {
        this.toast.error(err?.error?.message ?? 'Erreur lors de la suppression.');
      }
    });
  }

  private resetForm() {
    this.form = { code: '', libelle: '', description: '', prixUnitaire: 0, tauxTva: 19, type: 'Produit', unite: 'U', categorieId: '' };
    this.newProduit = { nom: '', ref: '', type: 'service', categorie: '', unite: 'U', prix: 0, tva: 19, description: '' };
  }

  private toView(p: ProduitDto): ProduitView {
    return {
      id: p.id,
      nom: p.libelle ?? p.code ?? 'Produit',
      description: p.description ?? '',
      ref: p.code ?? 'N/A',
      categorie: (p as any).categorie ?? p.categorieId ?? 'Général',
      type: (p.type?.toLowerCase() === 'service' ? 'service' : 'article'),
      prix: p.prixUnitaire ?? 0,
      tva: p.tauxTva ?? 0,
      statut: p.estActif === false ? 'warn' : 'ok',
      statutLabel: p.estActif === false ? 'Inactif' : 'Actif'
    };
  }

  private refreshCounts() {
    this.filters = this.filters.map(f => ({
      ...f,
      count: f.key === 'all'
        ? this.produits().length
        : this.produits().filter(p => p.type === f.key).length
    }));
  }

  formatPrix(v: number): string { return new Intl.NumberFormat('fr-TN', { minimumFractionDigits: 3 }).format(v); }
}
