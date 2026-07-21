import { CommonModule } from '@angular/common';
import { Component, computed, ElementRef, HostListener, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../core/services/toast.service';
import { FindColPipe } from './find-col.pipe';
import {
  AVATARS,
  CATEGORIES,
  defaultCartes,
  KanbanCarte,
  KanbanCategorie,
  KanbanColonne,
  KanbanPriorite,
  PRIORITES,
} from './kanban.model';

const STORAGE_KEY = 'tuniflow-kanban-v1';
const COLONNES: { id: KanbanColonne; label: string; dot: string }[] = [
  { id: 'todo', label: 'À faire', dot: 'dot-todo' },
  { id: 'doing', label: 'En cours', dot: 'dot-doing' },
  { id: 'done', label: 'Terminé', dot: 'dot-done' },
];

@Component({
  selector: 'app-kanban',
  standalone: true,
  imports: [CommonModule, FormsModule, FindColPipe],
  templateUrl: './kanban.component.html',
  styleUrls: ['./kanban.component.scss'],
})
export class KanbanComponent implements OnInit {
  private toast = inject(ToastService);
  private el = inject(ElementRef);

  cartes = signal<KanbanCarte[]>([]);
  filtreCateg = signal<KanbanCategorie | null>(null);
  filtreSearch = signal('');
  modalOuverte = signal(false);
  detailCarte = signal<KanbanCarte | null>(null);

  draggingId: string | null = null;
  dragOverCol: KanbanColonne | null = null;

  form = {
    titre: '',
    description: '',
    categorie: 'facture' as KanbanCategorie,
    priorite: 'moyenne' as KanbanPriorite,
    echeance: '',
    colonne: 'todo' as KanbanColonne,
  };
  formErreur = '';
  colonneModal: KanbanColonne = 'todo';

  readonly COLONNES = COLONNES;
  readonly CATEGORIES = CATEGORIES;
  readonly PRIORITES = PRIORITES;
  readonly AVATARS = AVATARS;
  readonly categorieKeys = Object.keys(CATEGORIES) as KanbanCategorie[];

  cartesFiltrees = computed(() => {
    const search = this.filtreSearch().toLowerCase().trim();
    const cat = this.filtreCateg();
    return this.cartes().filter(carte => {
      const text = `${carte.titre} ${carte.description ?? ''}`.toLowerCase();
      return (!cat || carte.categorie === cat) && (!search || text.includes(search));
    });
  });

  total = computed(() => this.cartes().length);
  urgentes = computed(() => this.cartes().filter(c => c.priorite === 'haute' && c.colonne !== 'done').length);
  enCours = computed(() => this.cartes().filter(c => c.colonne === 'doing').length);
  pctDone = computed(() => {
    const total = this.cartes().length;
    return total ? Math.round((this.cartes().filter(c => c.colonne === 'done').length / total) * 100) : 0;
  });

  ngOnInit() {
    this.cartes.set(this.restoreCartes());
  }

  cartesParColonne(col: KanbanColonne): KanbanCarte[] {
    return this.cartesFiltrees().filter(c => c.colonne === col);
  }

  onDragStart(id: string) {
    this.draggingId = id;
  }

  onDragEnd() {
    this.draggingId = null;
    this.dragOverCol = null;
  }

  onDragOver(event: DragEvent, col: KanbanColonne) {
    event.preventDefault();
    this.dragOverCol = col;
  }

  onDragLeave(col: KanbanColonne) {
    if (this.dragOverCol === col) this.dragOverCol = null;
  }

  onDrop(event: DragEvent, col: KanbanColonne) {
    event.preventDefault();
    this.dragOverCol = null;
    if (!this.draggingId) return;

    const carte = this.cartes().find(c => c.id === this.draggingId);
    if (!carte || carte.colonne === col) {
      this.draggingId = null;
      return;
    }

    this.cartes.update(list => list.map(c => (c.id === this.draggingId ? { ...c, colonne: col } : c)));
    this.persist();
    this.toast.success(`"${carte.titre}" déplacée vers ${COLONNES.find(c => c.id === col)?.label}`);
    this.draggingId = null;
  }

  cycleColonne(carte: KanbanCarte) {
    const order: KanbanColonne[] = ['todo', 'doing', 'done'];
    const next = order[(order.indexOf(carte.colonne) + 1) % order.length];
    this.cartes.update(list => list.map(c => (c.id === carte.id ? { ...c, colonne: next } : c)));
    this.persist();
    this.toast.success(`"${carte.titre}" → ${COLONNES.find(c => c.id === next)?.label}`);
  }

  ouvrirModal(col?: KanbanColonne) {
    this.colonneModal = col ?? 'todo';
    this.form = {
      titre: '',
      description: '',
      categorie: 'facture',
      priorite: 'moyenne',
      echeance: new Date().toISOString().slice(0, 10),
      colonne: this.colonneModal,
    };
    this.formErreur = '';
    this.modalOuverte.set(true);
    setTimeout(() => (this.el.nativeElement.querySelector('#f-titre') as HTMLElement | null)?.focus(), 60);
  }

  fermerModal() {
    this.modalOuverte.set(false);
  }

  soumettreFormulaire() {
    this.formErreur = '';
    if (!this.form.titre.trim()) {
      this.formErreur = 'Le titre est obligatoire.';
      return;
    }

    const carte: KanbanCarte = {
      id: `k${Date.now()}`,
      titre: this.form.titre.trim(),
      description: this.form.description.trim() || undefined,
      categorie: this.form.categorie,
      priorite: this.form.priorite,
      echeance: this.form.echeance || undefined,
      colonne: this.form.colonne,
      assigneIdx: [Math.floor(Math.random() * AVATARS.length)],
      creeLe: new Date().toISOString(),
    };

    this.cartes.update(list => [carte, ...list]);
    this.persist();
    this.fermerModal();
    this.toast.success('Tâche créée avec succès.');
  }

  ouvrirDetail(carte: KanbanCarte) {
    this.detailCarte.set({ ...carte });
  }

  fermerDetail() {
    this.detailCarte.set(null);
  }

  supprimerCarte(id: string) {
    const titre = this.cartes().find(c => c.id === id)?.titre ?? '';
    this.cartes.update(list => list.filter(c => c.id !== id));
    this.persist();
    this.fermerDetail();
    this.toast.success(`"${titre}" supprimée.`);
  }

  setFiltreCateg(cat: KanbanCategorie | null) {
    this.filtreCateg.set(this.filtreCateg() === cat ? null : cat);
  }

  echeanceInfo(echeance?: string): { texte: string; urgent: boolean; depasse: boolean } | null {
    if (!echeance) return null;
    const dt = new Date(echeance);
    const diff = Math.ceil((dt.getTime() - Date.now()) / 86_400_000);
    return {
      texte: dt.toLocaleDateString('fr-TN', { day: 'numeric', month: 'short' }),
      urgent: diff <= 3 && diff >= 0,
      depasse: diff < 0,
    };
  }

  @HostListener('keydown.escape')
  onEsc() {
    if (this.modalOuverte()) this.fermerModal();
    if (this.detailCarte()) this.fermerDetail();
  }

  trackById(_: number, c: KanbanCarte) {
    return c.id;
  }

  private restoreCartes(): KanbanCarte[] {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : defaultCartes();
    } catch {
      return defaultCartes();
    }
  }

  private persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.cartes()));
  }
}
