import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { trigger, transition, style, animate } from '@angular/animations';
import { TaxeApiService, TaxeDto } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { TranslateModule } from '@ngx-translate/core';

type TaxeType = 'Tva' | 'Fodec' | 'DroitConsommation';
type CodeTeif = 'S' | 'E' | 'Z' | 'O';
type StatutFilter = 'Tous' | 'Actif' | 'Inactif';
type TaxeColumnKey = 'titre' | 'taux' | 'type' | 'codeTeif' | 'dateEffet' | 'statut' | 'utilisations' | 'action';

interface TaxeView extends Omit<TaxeDto, 'type'> {
  type: TaxeType;
  codeTEIF: CodeTeif;
  dateEffet: string;
  estActif: boolean;
  nombreUtilisations: number;
}

interface TaxeForm {
  titre: string;
  taux: number;
  type: TaxeType;
  codeTEIF: CodeTeif;
  dateEffet: string;
  estActif: boolean;
}

@Component({
  selector: 'app-taxes',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './taxes.component.html',
  styleUrls: ['./taxes.component.scss'],
  animations: [
    trigger('pageIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(8px)' }),
        animate('380ms cubic-bezier(.16,1,.3,1)', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('200ms ease', style({ opacity: 1 }))
      ])
    ]),
    trigger('slideUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px) scale(0.95)' }),
        animate('250ms cubic-bezier(.16,1,.3,1)', style({ opacity: 1, transform: 'translateY(0) scale(1)' }))
      ])
    ])
  ]
})
export class TaxesComponent implements OnInit {
  private api = inject(TaxeApiService);
  private toast = inject(ToastService);
  private searchTimer?: ReturnType<typeof setTimeout>;

  taxes = signal<TaxeView[]>([]);
  loading = signal(true);
  saving = signal(false);
  deleting = signal(false);
  deleteConfirm: TaxeView | null = null;
  deleteBlocked: { taxe: TaxeView; count: number } | null = null;

  searchQuery = '';
  searchDraft = '';
  filterType: 'Tous' | TaxeType = 'Tous';
  filterStatut: StatutFilter = 'Tous';
  showColumns = false;
  page = 1;
  pageSize = 5;
  pageSizes = [5, 10, 20];

  columns: { key: TaxeColumnKey; label: string }[] = [
    { key: 'titre', label: 'Titre' },
    { key: 'taux', label: 'Taux' },
    { key: 'type', label: 'Type' },
    { key: 'codeTeif', label: 'Code TEIF' },
    { key: 'dateEffet', label: "Date d'effet" },
    { key: 'statut', label: 'Statut' },
    { key: 'utilisations', label: 'Utilisations' },
    { key: 'action', label: '' }
  ];

  visibleColumns: Record<TaxeColumnKey, boolean> = {
    titre: true,
    taux: true,
    type: true,
    codeTeif: true,
    dateEffet: true,
    statut: true,
    utilisations: true,
    action: true
  };

  editId: string | null = null;
  form: TaxeForm = this.emptyForm();
  submitted = false;

  typeOptions: { value: TaxeType; labelKey: string; label: string }[] = [
    { value: 'Tva', labelKey: 'ACCOUNTING.TAXES.TYPES.VAT', label: 'TVA' },
    { value: 'Fodec', labelKey: 'ACCOUNTING.TAXES.TYPES.FODEC', label: 'FODEC' },
    { value: 'DroitConsommation', labelKey: 'ACCOUNTING.TAXES.TYPES.CONSUMPTION', label: 'Droit de consommation' }
  ];

  codeTeifOptions: { value: CodeTeif; label: string; description: string }[] = [
    { value: 'S', label: 'S', description: 'Taux standard soumis à la taxe' },
    { value: 'E', label: 'E', description: 'Opération exonérée' },
    { value: 'Z', label: 'Z', description: 'Taux zéro' },
    { value: 'O', label: 'O', description: 'Autre cas fiscal ou hors champ' }
  ];

  ngOnInit() {
    this.load();
  }

  emptyForm(): TaxeForm {
    return {
      titre: '',
      taux: 19,
      type: 'Tva',
      codeTEIF: 'S',
      dateEffet: this.todayInput(),
      estActif: true
    };
  }

  private todayInput(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private normalizeType(rawType: any): TaxeType {
    if (rawType === null || rawType === undefined) return 'Tva';
    const asString = String(rawType).trim();
    const lower = asString.toLowerCase();
    if (lower === '1' || lower.includes('fodec')) return 'Fodec';
    if (lower === '2' || lower.includes('droit') || lower.includes('consommation')) return 'DroitConsommation';
    return 'Tva';
  }

  private normalizeCode(rawCode: any, type: TaxeType, taux: number): CodeTeif {
    const code = String(rawCode ?? '').trim().toUpperCase();
    if (['S', 'E', 'Z', 'O'].includes(code)) return code as CodeTeif;
    if (type === 'Tva' && Number(taux) === 0) return 'Z';
    if (type === 'Tva') return 'S';
    return 'O';
  }

  private normalizeDate(rawDate: any): string {
    const value = String(rawDate ?? '').trim();
    if (!value) return this.todayInput();
    return value.includes('T') ? value.slice(0, 10) : value.slice(0, 10);
  }

  private normalizeTaxe(raw: any): TaxeView {
    const type = this.normalizeType(raw?.type ?? raw?.Type);
    const taux = Number(raw?.taux ?? raw?.Taux ?? 0);
    return {
      id: raw?.id ?? raw?.Id ?? '',
      entrepriseId: raw?.entrepriseId ?? raw?.EntrepriseId ?? '',
      titre: raw?.titre ?? raw?.Titre ?? raw?.libelle ?? raw?.Libelle ?? raw?.nom ?? raw?.Nom ?? raw?.label ?? raw?.Label ?? raw?.name ?? raw?.Name ?? raw?.title ?? raw?.Title ?? '',
      taux,
      type,
      codeTEIF: this.normalizeCode(raw?.codeTEIF ?? raw?.CodeTEIF ?? raw?.codeTeif ?? raw?.CodeTeif, type, taux),
      dateEffet: this.normalizeDate(raw?.dateEffet ?? raw?.DateEffet ?? raw?.creeLe ?? raw?.CreeLe),
      estActif: raw?.estActif ?? raw?.EstActif ?? true,
      nombreUtilisations: Number(raw?.nombreUtilisations ?? raw?.NombreUtilisations ?? raw?.utilisations ?? raw?.Utilisations ?? 0),
      description: raw?.description ?? raw?.Description ?? undefined,
      creeLe: raw?.creeLe ?? raw?.CreeLe ?? '',
      modifieLe: raw?.modifieLe ?? raw?.ModifieLe ?? ''
    };
  }

  load() {
    this.loading.set(true);
    this.api.lister().subscribe({
      next: (res: any) => {
        const list = Array.isArray(res)
          ? res
          : (res?.items ?? res?.data ?? res?.value ?? res?.result ?? []);
        const normalized = (list || []).map((t: any) => this.normalizeTaxe(t));
        this.taxes.set(this.withStandardTunisianTaxes(normalized));
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.errorKey('ACCOUNTING.TAXES.TOAST.LOAD_ERROR');
      }
    });
  }

  onSearchChange(value: string) {
    this.searchDraft = value;
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.searchQuery = value;
      this.page = 1;
    }, 300);
  }

  clearSearch() {
    this.searchDraft = '';
    this.searchQuery = '';
    this.page = 1;
  }

  resetFilters() {
    this.filterType = 'Tous';
    this.filterStatut = 'Tous';
    this.clearSearch();
  }

  hasActiveFilters() {
    return !!this.searchQuery || this.filterType !== 'Tous' || this.filterStatut !== 'Tous';
  }

  filteredRows() {
    const q = this.searchQuery.trim().toLowerCase();
    return this.taxes().filter(t => {
      const matchesSearch = !q || t.titre.toLowerCase().includes(q) || t.type.toLowerCase().includes(q) || t.codeTEIF.toLowerCase().includes(q);
      const matchesType = this.filterType === 'Tous' || t.type === this.filterType;
      const matchesStatus =
        this.filterStatut === 'Tous' ||
        (this.filterStatut === 'Actif' && t.estActif) ||
        (this.filterStatut === 'Inactif' && !t.estActif);
      return matchesSearch && matchesType && matchesStatus;
    });
  }

  pagedRows() {
    const list = this.filteredRows();
    const start = (this.page - 1) * this.pageSize;
    return list.slice(start, start + this.pageSize);
  }

  totalPages() {
    const total = this.filteredRows().length || 1;
    return Math.max(1, Math.ceil(total / this.pageSize));
  }

  rangeStart() {
    if (this.filteredRows().length === 0) return 0;
    return (this.page - 1) * this.pageSize + 1;
  }

  rangeEnd() {
    const end = this.page * this.pageSize;
    return Math.min(end, this.filteredRows().length);
  }

  goPrev() { if (this.page > 1) this.page -= 1; }
  goNext() { if (this.page < this.totalPages()) this.page += 1; }

  edit(row: TaxeView) {
    const t = this.normalizeTaxe(row as any);
    this.editId = t.id;
    this.submitted = false;
    this.form = {
      titre: t.titre,
      taux: t.taux,
      type: t.type,
      codeTEIF: t.codeTEIF,
      dateEffet: t.dateEffet,
      estActif: t.estActif
    };
  }

  resetForm() {
    this.editId = null;
    this.submitted = false;
    this.form = this.emptyForm();
  }

  canSave() {
    return this.form.titre.trim().length > 0 && this.form.taux >= 0 && !!this.form.dateEffet && !this.saving();
  }

  private withStandardTunisianTaxes(list: TaxeView[]): TaxeView[] {
    const seeds: TaxeView[] = [
      this.seedTaxe('TVA 0%', 0, 'Tva', 'Z', 0),
      this.seedTaxe('TVA 7%', 7, 'Tva', 'S', 2),
      this.seedTaxe('TVA 13%', 13, 'Tva', 'S', 1),
      this.seedTaxe('TVA 19%', 19, 'Tva', 'S', 4)
    ];
    const exists = (seed: TaxeView) => list.some(t => t.type === seed.type && Number(t.taux) === seed.taux);
    return [...seeds.filter(seed => !exists(seed)), ...list];
  }

  private seedTaxe(titre: string, taux: number, type: TaxeType, codeTEIF: CodeTeif, nombreUtilisations: number): TaxeView {
    return {
      id: `seed-${type}-${taux}`,
      entrepriseId: '',
      titre,
      taux,
      type,
      codeTEIF,
      dateEffet: '2026-01-01',
      estActif: true,
      nombreUtilisations,
      description: 'Taux tunisien standard préchargé',
      creeLe: '2026-01-01',
      modifieLe: '2026-01-01'
    };
  }

  save() {
    this.submitted = true;
    if (!this.canSave()) {
      this.toast.errorKey('ACCOUNTING.TAXES.TOAST.REQUIRED_FIELDS');
      return;
    }

    const payload = {
      titre: this.form.titre.trim(),
      taux: Number(this.form.taux),
      type: this.form.type,
      codeTEIF: this.form.codeTEIF,
      dateEffet: this.form.dateEffet,
      estActif: this.form.estActif
    };

    this.saving.set(true);
    const obs = this.editId
      ? this.api.mettreAJour(this.editId, payload)
      : this.api.creer(payload);

    obs.subscribe({
      next: (res: any) => {
        const responsePayload = res?.data ?? res?.result ?? res?.item ?? res;
        let normalized = this.normalizeTaxe(responsePayload as any);
        if (!normalized.titre) {
          normalized = this.normalizeTaxe({ ...payload, id: this.editId ?? `local-${Date.now()}` });
        }
        this.saving.set(false);
        if (this.editId) {
          this.taxes.update(list => list.map(t => t.id === this.editId ? { ...normalized, id: this.editId! } : t));
          this.toast.successKey('ACCOUNTING.TAXES.TOAST.UPDATED');
        } else {
          this.taxes.update(list => [normalized, ...list]);
          this.toast.successKey('ACCOUNTING.TAXES.TOAST.CREATED');
        }
        this.resetForm();
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.errorKey(err?.error?.message ?? 'ERRORS.GENERIC');
      }
    });
  }

  typeLabelKey(type: string) {
    switch (type) {
      case 'Fodec': return 'ACCOUNTING.TAXES.TYPES.FODEC';
      case 'DroitConsommation': return 'ACCOUNTING.TAXES.TYPES.CONSUMPTION';
      default: return 'ACCOUNTING.TAXES.TYPES.VAT';
    }
  }

  typeShortLabel(type: string) {
    switch (type) {
      case 'Fodec': return 'FODEC';
      case 'DroitConsommation': return 'DC';
      default: return 'TVA';
    }
  }

  typeClass(type: string) {
    switch (type) {
      case 'Fodec': return 'badge--fodec';
      case 'DroitConsommation': return 'badge--dc';
      default: return 'badge--tva';
    }
  }

  setType(value: string) {
    this.form.type = this.normalizeType(value);
    if (this.form.type === 'Tva' && Number(this.form.taux) === 0) this.form.codeTEIF = 'Z';
    if (this.form.type !== 'Tva' && this.form.codeTEIF === 'S') this.form.codeTEIF = 'O';
  }

  setCodeTEIF(value: string) {
    this.form.codeTEIF = this.normalizeCode(value, this.form.type, this.form.taux);
  }

  descriptionKey() {
    switch (this.form.type) {
      case 'Fodec':
        return 'ACCOUNTING.TAXES.TYPE_DESC.FODEC';
      case 'DroitConsommation':
        return 'ACCOUNTING.TAXES.TYPE_DESC.CONSUMPTION';
      default:
        return 'ACCOUNTING.TAXES.TYPE_DESC.VAT';
    }
  }

  codeTeifDescription(code: CodeTeif | string) {
    return this.codeTeifOptions.find(opt => opt.value === code)?.description ?? 'Code fiscal TEIF';
  }

  codeTeifClass(code: CodeTeif | string) {
    return `teif-badge--${String(code || 'S').toLowerCase()}`;
  }

  usageLabel(taxe: TaxeView) {
    if (!taxe.nombreUtilisations) return 'Non utilisée';
    return `${taxe.nombreUtilisations} facture${taxe.nombreUtilisations > 1 ? 's' : ''}`;
  }

  formatDate(value: string) {
    if (!value) return '-';
    const date = new Date(`${value}T00:00:00`);
    return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
  }

  toggleActif(taxe: TaxeView) {
    if (taxe.id.startsWith('seed-')) {
      this.taxes.update(list => list.map(t => t.id === taxe.id ? { ...t, estActif: !t.estActif } : t));
      this.toast.success('Statut de la taxe mis à jour.');
      return;
    }

    this.api.toggleActif(taxe.id).subscribe({
      next: (res: any) => {
        const normalized = this.normalizeTaxe(res?.data ?? res?.result ?? res ?? { ...taxe, estActif: !taxe.estActif });
        this.taxes.update(list => list.map(t => t.id === taxe.id ? normalized : t));
        this.toast.success('Statut de la taxe mis à jour.');
      },
      error: (err) => this.toast.errorKey(err?.error?.message ?? 'ERRORS.GENERIC')
    });
  }

  confirmDelete(taxe: TaxeView) {
    if (taxe.nombreUtilisations > 0) {
      this.deleteBlocked = { taxe, count: taxe.nombreUtilisations };
      return;
    }

    if (taxe.id.startsWith('seed-')) {
      this.deleteConfirm = taxe;
      return;
    }

    this.api.utilisations(taxe.id).subscribe({
      next: (res: any) => {
        const count = Number(res?.nombreUtilisations ?? res?.NombreUtilisations ?? res?.count ?? 0);
        if (count > 0) {
          this.deleteBlocked = { taxe, count };
        } else {
          this.deleteConfirm = taxe;
        }
      },
      error: () => {
        this.deleteConfirm = taxe;
      }
    });
  }

  cancelDelete() {
    this.deleteConfirm = null;
  }

  closeBlockedDelete() {
    this.deleteBlocked = null;
  }

  deleteConfirmed() {
    if (!this.deleteConfirm || this.deleting()) return;

    const id = this.deleteConfirm.id;
    if (id.startsWith('seed-')) {
      this.taxes.update(list => list.filter(t => t.id !== id));
      this.toast.successKey('ACCOUNTING.TAXES.TOAST.DELETED');
      this.deleteConfirm = null;
      return;
    }

    this.deleting.set(true);

    this.api.supprimer(id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.taxes.update(list => list.filter(t => t.id !== id));
        this.toast.successKey('ACCOUNTING.TAXES.TOAST.DELETED');
        this.deleteConfirm = null;

        if (this.pagedRows().length === 0 && this.page > 1) {
          this.page -= 1;
        }
      },
      error: (err) => {
        this.deleting.set(false);
        const count = Number(err?.error?.nombreUtilisations ?? err?.error?.NombreUtilisations ?? 0);
        if (err?.status === 409) {
          this.deleteBlocked = { taxe: this.deleteConfirm!, count };
          this.deleteConfirm = null;
          return;
        }
        this.toast.errorKey(err?.error?.message ?? 'ERRORS.GENERIC');
      }
    });
  }
}
