
import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { trigger, transition, style, animate } from '@angular/animations';
import { CategorieApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './categories.component.html',
  styleUrls: ['./categories.component.scss'],
  animations: [
    trigger('pageIn', [transition(':enter', [
      style({ opacity: 0, transform: 'translateY(8px)' }),
      animate('380ms cubic-bezier(.16,1,.3,1)', style({ opacity: 1, transform: 'translateY(0)' }))
    ])])
  ]
})
export class CategoriesComponent implements OnInit {
  private svc   = inject(CategorieApiService);
  private toast = inject(ToastService);

  categories = signal<any[]>([]);
  loading    = signal(true);
  saving     = signal(false);
  showModal  = false;
  editItem   = signal<any | null>(null);
  form = { nom: '', description: '' };
  searchQuery = '';
  newCat = { nom: '', description: '', icone: '', couleur: '#FFE600' };
  icones = ['','','','','',''];
  couleurs = ['#FFE600','#22C55E','#3B82F6','#F59E0B','#EF4444','#8B5CF6'];

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.svc.lister().subscribe({
      next: list => {
        const withDefaults = list.map((c: any, idx: number) => ({
          ...c,
          icone: c.icone ?? this.icones[idx % this.icones.length],
          couleur: c.couleur ?? this.couleurs[idx % this.couleurs.length],
          statut: c.statut ?? (c.estActive === false ? 'inactif' : 'actif'),
          statutLabel: c.statutLabel ?? (c.estActive === false ? 'Inactive' : 'Active'),
          nbProduits: c.nbProduits ?? 0,
          ca: c.ca ?? 0
        }));
        this.categories.set(withDefaults);
        this.loading.set(false);
      },
      error: ()  => this.loading.set(false)
    });
  }

  openModal(cat?: any) {
    this.editItem.set(cat ?? null);
    this.form = cat ? { nom: cat.nom, description: cat.description ?? '' } : { nom: '', description: '' };
    this.newCat = { nom: this.form.nom, description: this.form.description, icone: '', couleur: '#FFE600' };
    this.showModal = true;
  }
  closeModal() { this.showModal = false; }

  save() {
    if (!this.form.nom || this.saving()) return;
    this.saving.set(true);
    const obs = this.editItem()
      ? this.svc.mettreAJour(this.editItem()!.id, this.form)
      : this.svc.creer(this.form);
    obs.subscribe({
      next: (cat: any) => {
        this.saving.set(false);
        if (this.editItem()) {
          this.categories.update(list => list.map(c => c.id === cat.id ? { ...c, ...cat } : c));
          this.toast.success('Catégorie mise à jour.');
        } else {
          const enriched = {
            ...cat,
            icone: this.newCat.icone,
            couleur: this.newCat.couleur,
            statut: 'actif',
            statutLabel: 'Active',
            nbProduits: 0,
            ca: 0
          };
          this.categories.update(list => [enriched, ...list]);
          this.toast.success('Catégorie créée.');
        }
        this.closeModal();
      },
      error: (err) => { this.saving.set(false); this.toast.error(err?.error?.message ?? 'Erreur.'); }
    });
  }

  desactiver(cat: any) {
    this.svc.desactiver(cat.id).subscribe({
      next: () => {
        this.categories.update(list => list.map(c => c.id === cat.id ? { ...c, estActive: false } : c));
        this.toast.success('Catégorie désactivée.');
      },
      error: (err) => this.toast.error(err?.error?.message ?? 'Erreur.')
    });
  }

  get totalProduits() { return this.categories().reduce((acc, c) => acc + (c.nbProduits ?? 0), 0); }
  get activeCount() { return this.categories().filter(c => c.estActive !== false).length; }
  get inactiveCount() { return this.categories().filter(c => c.estActive === false).length; }
  get filteredCats() {
    const q = this.searchQuery.toLowerCase();
    if (!q) return this.categories();
    return this.categories().filter(c =>
      c.nom.toLowerCase().includes(q) || (c.description ?? '').toLowerCase().includes(q)
    );
  }
  pct(c: any) {
    const total = this.totalProduits || 1;
    return Math.round(((c.nbProduits ?? 0) / total) * 100);
  }

  saveCat() {
    if (!this.newCat.nom.trim() || this.saving()) return;
    this.saving.set(true);
    this.svc.creer({ nom: this.newCat.nom, description: this.newCat.description }).subscribe({
      next: (cat: any) => {
        this.saving.set(false);
        const enriched = {
          ...cat,
          icone: this.newCat.icone,
          couleur: this.newCat.couleur,
          statut: 'actif',
          statutLabel: 'Active',
          nbProduits: 0,
          ca: 0
        };
        this.categories.update(list => [enriched, ...list]);
        this.toast.success('Catégorie créée.');
        this.closeModal();
      },
      error: (err) => { this.saving.set(false); this.toast.error(err?.error?.message ?? 'Erreur.'); }
    });
  }
}
