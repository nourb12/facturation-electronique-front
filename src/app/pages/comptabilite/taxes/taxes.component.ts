import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { trigger, transition, style, animate } from '@angular/animations';
import { TaxeApiService, TaxeDto } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { TranslateModule } from '@ngx-translate/core';

type TaxeType = 'Tva' | 'Fodec' | 'DroitConsommation';
type TaxeColumnKey = 'titre' | 'taux' | 'type' | 'action';

interface TaxeForm {
  titre: string;
  taux: number;
  type: TaxeType;
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
    ])
  ]
})
export class TaxesComponent implements OnInit {
  private api = inject(TaxeApiService);
  private toast = inject(ToastService);

  taxes = signal<TaxeDto[]>([]);
  loading = signal(true);
  saving = signal(false);

  searchQuery = '';
  showColumns = false;
  page = 1;
  pageSize = 5;
  pageSizes = [5, 10, 20];

  columns: { key: TaxeColumnKey; labelKey: string }[] = [
    { key: 'titre', labelKey: 'ACCOUNTING.TAXES.COLUMNS.TITLE' },
    { key: 'taux', labelKey: 'ACCOUNTING.TAXES.COLUMNS.RATE' },
    { key: 'type', labelKey: 'ACCOUNTING.TAXES.COLUMNS.TYPE' },
    { key: 'action', labelKey: 'ACCOUNTING.TAXES.COLUMNS.ACTION' }
  ];
  visibleColumns: Record<TaxeColumnKey, boolean> = {
    titre: true,
    taux: true,
    type: true,
    action: true
  };

  editId: string | null = null;
  form: TaxeForm = this.emptyForm();
  submitted = false;

  typeOptions: { value: TaxeType; labelKey: string }[] = [
    { value: 'Tva', labelKey: 'ACCOUNTING.TAXES.TYPES.VAT' },
    { value: 'Fodec', labelKey: 'ACCOUNTING.TAXES.TYPES.FODEC' },
    { value: 'DroitConsommation', labelKey: 'ACCOUNTING.TAXES.TYPES.CONSUMPTION' }
  ];

  ngOnInit() {
    this.load();
  }

  emptyForm(): TaxeForm {
    return { titre: '', taux: 19, type: 'Tva' };
  }

  private normalizeType(rawType: any): TaxeType {
    if (rawType === null || rawType === undefined) return 'Tva';
    const asString = String(rawType).trim();
    const lower = asString.toLowerCase();
    if (lower === '1' || lower.includes('fodec')) return 'Fodec';
    if (lower === '2' || lower.includes('droit')) return 'DroitConsommation';
    if (lower === '0' || lower.includes('tva')) return 'Tva';
    return 'Tva';
  }

  private normalizeTaxe(raw: any): TaxeDto {
    const type = this.normalizeType(raw?.type ?? raw?.Type);
    return {
      id: raw?.id ?? raw?.Id ?? '',
      entrepriseId: raw?.entrepriseId ?? raw?.EntrepriseId ?? '',
      titre: raw?.titre ?? raw?.Titre ?? raw?.libelle ?? raw?.Libelle ?? raw?.nom ?? raw?.Nom ?? raw?.label ?? raw?.Label ?? raw?.name ?? raw?.Name ?? raw?.title ?? raw?.Title ?? '',
      taux: Number(raw?.taux ?? raw?.Taux ?? 0),
      type,
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
        this.taxes.set(normalized);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.errorKey('ACCOUNTING.TAXES.TOAST.LOAD_ERROR');
      }
    });
  }

  filteredRows() {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) return this.taxes();
    return this.taxes().filter(t =>
      t.titre.toLowerCase().includes(q) ||
      t.type.toLowerCase().includes(q)
    );
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

  edit(row: TaxeDto) {
    const t = this.normalizeTaxe(row as any);
    this.editId = t.id;
    this.submitted = false;
    this.form = { titre: t.titre, taux: t.taux, type: t.type as TaxeType };
  }

  resetForm() {
    this.editId = null;
    this.submitted = false;
    this.form = this.emptyForm();
  }

  canSave() {
    return this.form.titre.trim().length > 0 && this.form.taux > 0 && !this.saving();
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
      type: this.form.type
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
          normalized = {
            ...normalized,
            titre: this.form.titre.trim(),
            taux: normalized.taux > 0 ? normalized.taux : Number(this.form.taux),
            type: normalized.type || this.form.type
          };
        }
        this.saving.set(false);
        if (this.editId) {
          this.taxes.update(list => list.map(t => t.id === normalized.id ? normalized : t));
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

  typeClass(type: string) {
    switch (type) {
      case 'Fodec': return 'badge--fodec';
      case 'DroitConsommation': return 'badge--dc';
      default: return 'badge--tva';
    }
  }

  setType(value: string) {
    this.form.type = this.normalizeType(value);
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
}
