
import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { trigger, transition, style, animate } from '@angular/animations';
import {
  ProduitApiService, ProduitDto,
  CategorieApiService, CategorieDto
} from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';

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
        this.produits.set(res.items.map(p => this.toView(p)));
        this.total.set(res.total ?? res.items.length);
        this.refreshCounts();
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
    this.categorieSvc.lister().subscribe({
      next: cats => this.categories.set(cats)
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
