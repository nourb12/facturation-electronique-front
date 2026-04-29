import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { trigger, transition, style, animate } from '@angular/animations';
import { ParametreFiscalApiService, ParametreFiscalDto } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { TranslateModule } from '@ngx-translate/core';

type ParametreFiscalType        = 'Pourcentage' | 'Fixe';
type ParametreFiscalSigne       = 'Positif' | 'Negatif';
type ParametreFiscalOrdre       = 'AvantTva' | 'ApresTva';
type ParametreFiscalUtilisation = 'Manuel' | 'Auto';
type ParametreFiscalColumnKey   = 'libelle' | 'valeur' | 'ordre' | 'utilisation' | 'condition' | 'action';

interface ParametreFiscalForm {
  libelle: string;
  valeur: number;
  type: ParametreFiscalType;
  signe: ParametreFiscalSigne;
  ordreCalcul: ParametreFiscalOrdre;
  utilisation: ParametreFiscalUtilisation;
  inclureRetenueSource: boolean;
  documentsCibles: string[];
}

@Component({
  selector: 'app-parametres-fiscaux',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './parametres-fiscaux.component.html',
  styleUrls: ['./parametres-fiscaux.component.scss'],
  animations: [
    trigger('pageIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(10px)' }),
        animate('400ms cubic-bezier(.16,1,.3,1)', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class ParametresFiscauxComponent implements OnInit {
  private api   = inject(ParametreFiscalApiService);
  private toast = inject(ToastService);

  parametres = signal<ParametreFiscalDto[]>([]);
  loading    = signal(true);
  saving     = signal(false);

  searchQuery  = '';
  showColumns  = false;
  page         = 1;
  pageSize     = 5;
  pageSizes    = [5, 10, 20];
  selectedIds  = new Set<string>();

  columns: { key: ParametreFiscalColumnKey; labelKey: string }[] = [
    { key: 'libelle',     labelKey: 'ACCOUNTING.FISCAL_PARAMS.COLUMNS.LABEL' },
    { key: 'valeur',      labelKey: 'ACCOUNTING.FISCAL_PARAMS.COLUMNS.VALUE_DEFAULT' },
    { key: 'ordre',       labelKey: 'ACCOUNTING.FISCAL_PARAMS.COLUMNS.ORDER' },
    { key: 'utilisation', labelKey: 'ACCOUNTING.FISCAL_PARAMS.COLUMNS.USAGE' },
    { key: 'condition',   labelKey: 'ACCOUNTING.FISCAL_PARAMS.COLUMNS.CONDITION' },
    { key: 'action',      labelKey: 'COMMON.ACTIONS.EDIT' }
  ];

  visibleColumns: Record<ParametreFiscalColumnKey, boolean> = {
    libelle: true, valeur: true, ordre: true,
    utilisation: true, condition: true, action: true
  };

  editId    : string | null = null;
  submitted = false;
  form: ParametreFiscalForm = this.emptyForm();

  documentOptions = [
    { key: 'Facture',             labelKey: 'ACCOUNTING.FISCAL_PARAMS.FORM.DOCS.INVOICE' },
    { key: 'Bon de sortie',       labelKey: 'ACCOUNTING.FISCAL_PARAMS.FORM.DOCS.GOODS_OUT_NOTE' },
    { key: "Facture d'avoir",     labelKey: 'ACCOUNTING.FISCAL_PARAMS.FORM.DOCS.CREDIT_INVOICE' },
    { key: 'Bon de commande',     labelKey: 'ACCOUNTING.FISCAL_PARAMS.FORM.DOCS.PURCHASE_ORDER' },
    { key: 'Bon de livraison',    labelKey: 'ACCOUNTING.FISCAL_PARAMS.FORM.DOCS.DELIVERY_NOTE' },
    { key: 'Devis',               labelKey: 'ACCOUNTING.FISCAL_PARAMS.FORM.DOCS.QUOTE' },
    { key: 'Bon de reception',    labelKey: 'ACCOUNTING.FISCAL_PARAMS.FORM.DOCS.RECEIPT_NOTE' },
    { key: 'Facture fournisseur', labelKey: 'ACCOUNTING.FISCAL_PARAMS.FORM.DOCS.SUPPLIER_INVOICE' }
  ];

  ngOnInit(): void { this.load(); }

  emptyForm(): ParametreFiscalForm {
    return {
      libelle: '', valeur: 1, type: 'Pourcentage', signe: 'Positif',
      ordreCalcul: 'AvantTva', utilisation: 'Manuel',
      inclureRetenueSource: false, documentsCibles: []
    };
  }

  // -- Normalisation API ----------------------------------------------------
  // Accepte tous les noms de champs possibles retournés par le backend
  private toBool(v: any): boolean {
    if (v === true || v === false) return v;
    if (v === null || v === undefined) return false;
    const s = String(v).trim().toLowerCase();
    if (['1', 'true', 'yes', 'oui', 'y'].includes(s)) return true;
    if (['0', 'false', 'no', 'non', 'n'].includes(s)) return false;
    return Boolean(v);
  }

  private normalizeType(raw: any): ParametreFiscalType {
    if (raw === null || raw === undefined) return 'Pourcentage';
    const s = String(raw).trim().toLowerCase();
    if (s === '1' || s.includes('fixe') || s.includes('montant')) return 'Fixe';
    return 'Pourcentage';
  }

  private normalizeSigne(raw: any): ParametreFiscalSigne {
    if (raw === null || raw === undefined) return 'Positif';
    const s = String(raw).trim().toLowerCase();
    if (s === '1' || s.includes('neg') || s === '-' || s.includes('moins')) return 'Negatif';
    return 'Positif';
  }

  private normalizeOrdre(raw: any): ParametreFiscalOrdre {
    if (raw === null || raw === undefined) return 'AvantTva';
    const s = String(raw).trim().toLowerCase();
    if (s === '1' || s.includes('apres')) return 'ApresTva';
    return 'AvantTva';
  }

  private normalizeUtilisation(raw: any): ParametreFiscalUtilisation {
    if (raw === null || raw === undefined) return 'Manuel';
    const s = String(raw).trim().toLowerCase();
    if (s === '1' || s.includes('auto')) return 'Auto';
    return 'Manuel';
  }

  private normalizeDocuments(raw: any): string[] {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw.map(v => String(v));
    if (typeof raw === 'string') {
      return raw.split(',').map(s => s.trim()).filter(Boolean);
    }
    return [];
  }

  private normalize(p: any): ParametreFiscalDto {
    const libelle =
      p.libelle     ??
      p.Libelle     ??
      p.titre       ??
      p.Titre       ??
      p.label       ??
      p.name        ??
      p['libellé']  ??
      p['libelle']  ??
      p.designation ??
      p.description ??
      '';

    const valeur = Number(
      p.valeur ?? p.Valeur ?? p.value ?? p.montant ?? p.amount ?? 0
    );

    const ordreCalcul = this.normalizeOrdre(
      p.ordreCalcul ?? p.OrdreCalcul ?? p.ordre_calcul ?? p.ordrecalcul ?? p.ordre ?? p.ordreDeCalcul ?? p.ordre_de_calcul
    );

    const documentsCibles = this.normalizeDocuments(
      p.documentsCibles ?? p.DocumentsCibles ?? p.documents_cibles ?? p.documents ?? p.Documents
    );

    return {
      ...p,
      id:                   String(p.id ?? p.Id ?? p._id ?? p.uid ?? ''),
      libelle,
      valeur,
      type:                 this.normalizeType(p.type ?? p.Type ?? p.typeParametre ?? p.type_parametre),
      signe:                this.normalizeSigne(p.signe ?? p.Signe ?? p.sign ?? p.signed),
      ordreCalcul,
      utilisation:          this.normalizeUtilisation(p.utilisation ?? p.Utilisation ?? p.usage ?? p.utilisationParametre),
      inclureRetenueSource: this.toBool(p.inclureRetenueSource ?? p.InclureRetenueSource ?? p.inclure_retenue_source ?? p.retenue ?? p.retenueSource ?? p.retenue_source ?? false),
      documentsCibles
    };
  }

  // -- Chargement -----------------------------------------------------------
  load(): void {
    this.loading.set(true);
    this.api.lister().subscribe({
      next: (res: any) => {
        const list = Array.isArray(res)
          ? res
          : (res?.items ?? res?.data ?? res?.value ?? res?.result ?? []);
        this.parametres.set((list || []).map((p: any) => this.normalize(p)));
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.errorKey(err?.error?.message ?? 'ACCOUNTING.FISCAL_PARAMS.TOAST.LOAD_ERROR');
      }
    });
  }

  // -- Filtrage / Pagination ------------------------------------------------
  filteredRows(): ParametreFiscalDto[] {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) return this.parametres();
    return this.parametres().filter(p =>
      (p.libelle ?? '').toLowerCase().includes(q) ||
      (p.ordreCalcul ?? '').toLowerCase().includes(q) ||
      (p.utilisation ?? '').toLowerCase().includes(q)
    );
  }

  pagedRows(): ParametreFiscalDto[] {
    const start = (this.page - 1) * this.pageSize;
    return this.filteredRows().slice(start, start + this.pageSize);
  }

  totalPages(): number {
    return Math.max(1, Math.ceil((this.filteredRows().length || 1) / this.pageSize));
  }

  rangeStart(): number {
    if (this.filteredRows().length === 0) return 0;
    return (this.page - 1) * this.pageSize + 1;
  }

  rangeEnd(): number {
    return Math.min(this.page * this.pageSize, this.filteredRows().length);
  }

  goPrev(): void { if (this.page > 1) this.page--; }
  goNext(): void { if (this.page < this.totalPages()) this.page++; }

  // -- Sélection -------------------------------------------------------------
  toggleSelectAll(checked: boolean): void {
    if (!checked) { this.selectedIds.clear(); return; }
    this.pagedRows().forEach(p => this.selectedIds.add(p.id));
  }

  isAllPageSelected(): boolean {
    const rows = this.pagedRows();
    return rows.length > 0 && rows.every(r => this.selectedIds.has(r.id));
  }

  toggleSelect(id: string, checked: boolean): void {
    if (checked) this.selectedIds.add(id);
    else         this.selectedIds.delete(id);
  }

  deleteSelected(): void {
    if (this.selectedIds.size === 0) return;
    const ids = [...this.selectedIds];
    let done = 0, errored = 0;
    ids.forEach(id => {
      this.api.supprimer(id).subscribe({
        next: () => {
          done++;
          this.parametres.update(list => list.filter(p => p.id !== id));
          this.selectedIds.delete(id);
          if (done + errored === ids.length) {
            errored === 0
              ? this.toast.successKey('ACCOUNTING.FISCAL_PARAMS.TOAST.DELETE_OK', { count: done })
              : this.toast.errorKey('ACCOUNTING.FISCAL_PARAMS.TOAST.DELETE_PARTIAL', { deleted: done, errors: errored });
            if (this.page > this.totalPages()) this.page = this.totalPages();
          }
        },
        error: () => {
          errored++;
          if (done + errored === ids.length)
            this.toast.errorKey('ACCOUNTING.FISCAL_PARAMS.TOAST.DELETE_PARTIAL', { deleted: done, errors: errored });
        }
      });
    });
  }

  // -- Documents ------------------------------------------------------------
  toggleDoc(key: string): void {
    const idx = this.form.documentsCibles.indexOf(key);
    if (idx >= 0) this.form.documentsCibles.splice(idx, 1);
    else          this.form.documentsCibles.push(key);
  }

  isDocChecked(key: string): boolean {
    return this.form.documentsCibles.includes(key);
  }

  // -- Edition --------------------------------------------------------------
  edit(param: ParametreFiscalDto): void {
    const p = this.normalize(param as any);
    this.editId    = p.id;
    this.submitted = false;
    this.form = {
      libelle:              p.libelle,
      valeur:               p.valeur,
      type:                 (p.type        || 'Pourcentage') as ParametreFiscalType,
      signe:                (p.signe       || 'Positif')     as ParametreFiscalSigne,
      ordreCalcul:          (p.ordreCalcul || 'AvantTva')    as ParametreFiscalOrdre,
      utilisation:          (p.utilisation || 'Manuel')      as ParametreFiscalUtilisation,
      inclureRetenueSource: !!p.inclureRetenueSource,
      documentsCibles:      [...(p.documentsCibles || [])]
    };
    setTimeout(() => {
      document.querySelector('.fiscal-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }

  resetForm(): void {
    this.editId    = null;
    this.submitted = false;
    this.form = this.emptyForm();
  }

  // -- Validation -----------------------------------------------------------
  canSave(): boolean {
    return this.form.libelle.trim().length > 0 && this.form.valeur > 0 && !this.saving();
  }

  // -- Sauvegarde -----------------------------------------------------------
  save(): void {
    this.submitted = true;
    if (!this.canSave()) {
      this.toast.errorKey('ACCOUNTING.FISCAL_PARAMS.TOAST.REQUIRED_FIELDS');
      return;
    }

    const payload = {
      libelle:              this.form.libelle.trim(),
      valeur:               Number(this.form.valeur),
      type:                 this.form.type,
      signe:                this.form.signe,
      ordreCalcul:          this.form.ordreCalcul,
      utilisation:          this.form.utilisation,
      inclureRetenueSource: this.form.inclureRetenueSource,
      documentsCibles:      [...this.form.documentsCibles]
    };

    this.saving.set(true);
    const obs$ = this.editId
      ? this.api.mettreAJour(this.editId, payload)
      : this.api.creer(payload);

    obs$.subscribe({
      next: (res: any) => {
        this.saving.set(false);
        const responsePayload = res?.data ?? res?.result ?? res?.item ?? res;
        let normalized = this.normalize(responsePayload as any);
        if (!normalized.libelle) {
          normalized = {
            ...normalized,
            libelle: this.form.libelle.trim(),
            valeur: normalized.valeur > 0 ? normalized.valeur : Number(this.form.valeur),
            type: normalized.type || this.form.type,
            signe: normalized.signe || this.form.signe,
            ordreCalcul: normalized.ordreCalcul || this.form.ordreCalcul,
            utilisation: normalized.utilisation || this.form.utilisation,
            inclureRetenueSource: normalized.inclureRetenueSource ?? this.form.inclureRetenueSource,
            documentsCibles: (normalized.documentsCibles && normalized.documentsCibles.length) ? normalized.documentsCibles : [...this.form.documentsCibles]
          };
        }

        if (this.editId) {
          this.parametres.update(list => list.map(p => p.id === normalized.id ? normalized : p));
          this.toast.successKey('ACCOUNTING.FISCAL_PARAMS.TOAST.UPDATED');
        } else {
          this.parametres.update(list => [normalized, ...list]);
          this.toast.successKey('ACCOUNTING.FISCAL_PARAMS.TOAST.CREATED');
        }
        this.resetForm();
      },
      error: err => {
        this.saving.set(false);
        this.toast.errorKey(err?.error?.message ?? 'ERRORS.GENERIC');
      }
    });
  }

  // -- Helpers affichage ----------------------------------------------------
  formatValeur(p: ParametreFiscalDto): string {
    const sign = p.signe === 'Negatif' ? '-' : '+';
    const val  = Number(p.valeur ?? 0);
    return p.type === 'Pourcentage' ? `${sign}${val}%` : `${sign}${val} DT`;
  }

  ordreLabelKey(p: ParametreFiscalDto): string {
    return p.ordreCalcul === 'ApresTva'
      ? 'ACCOUNTING.FISCAL_PARAMS.ORDER.AFTER_VAT'
      : 'ACCOUNTING.FISCAL_PARAMS.ORDER.BEFORE_VAT';
  }

  utilisationLabelKey(p: ParametreFiscalDto): string {
    return p.utilisation === 'Auto'
      ? 'ACCOUNTING.FISCAL_PARAMS.USAGE.AUTO'
      : 'ACCOUNTING.FISCAL_PARAMS.USAGE.MANUAL';
  }

  conditionLabelKey(p: ParametreFiscalDto): string {
    if (p.inclureRetenueSource)    return 'ACCOUNTING.FISCAL_PARAMS.CONDITION.WITHHOLDING';
    if (p.documentsCibles?.length) return 'ACCOUNTING.FISCAL_PARAMS.CONDITION.DOCS';
    return 'ACCOUNTING.FISCAL_PARAMS.CONDITION.NONE';
  }

  hasCondition(p: ParametreFiscalDto): boolean {
    return !!p.inclureRetenueSource || !!(p.documentsCibles?.length);
  }
}
