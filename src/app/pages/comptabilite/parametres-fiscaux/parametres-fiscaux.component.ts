import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { animate, style, transition, trigger } from '@angular/animations';
import {
  CreerParametreFiscalRequest,
  ParametreFiscalApiService,
  ParametreFiscalDto
} from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';

type ParametreFiscalType = 'Pourcentage' | 'Fixe';
type ParametreFiscalSigne = 'Positif' | 'Negatif';
type ParametreFiscalOrdre = 'AvantTva' | 'ApresTva';
type ParametreFiscalUtilisation = 'Manuel' | 'Auto';
type TypeFournisseur = 'Tous' | 'PersonnePhysique' | 'PersonneMorale';
type StatutFiltre = 'Tous' | 'Actif' | 'Inactif';
type DocumentCible =
  | 'Facture'
  | 'Avoir'
  | 'BonCommande'
  | 'BonLivraison'
  | 'BonReception'
  | 'BonSortie'
  | 'Devis'
  | 'FactureFournisseur';

interface ParametreFiscalView extends ParametreFiscalDto {
  codeDGI: string;
  typeFournisseur: TypeFournisseur;
  seuilMinimum: number | null;
  dateEffet: string;
  inclureRS: boolean;
  nombreUtilisations: number;
}

interface ParametreFiscalForm {
  libelle: string;
  codeDGI: string;
  valeur: number | null;
  type: ParametreFiscalType;
  signe: ParametreFiscalSigne;
  dateEffet: string;
  estActif: boolean;
  ordreCalcul: ParametreFiscalOrdre;
  utilisation: ParametreFiscalUtilisation;
  typeFournisseur: TypeFournisseur;
  seuilMinimum: number | null;
  inclureRS: boolean;
  documentsCibles: DocumentCible[];
}

interface DeleteModal {
  mode: 'single' | 'bulk';
  ids: string[];
  title: string;
  message: string;
}

interface BlockedDeleteModal {
  title: string;
  message: string;
  count: number;
}

interface UsageModal {
  parametre: ParametreFiscalView;
  count: number;
}

@Component({
  selector: 'app-parametres-fiscaux',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './parametres-fiscaux.component.html',
  styleUrls: ['./parametres-fiscaux.component.scss'],
  animations: [
    trigger('pageIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(10px)' }),
        animate('360ms cubic-bezier(.16,1,.3,1)', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class ParametresFiscauxComponent implements OnInit, OnDestroy {
  private readonly api = inject(ParametreFiscalApiService);
  private readonly toast = inject(ToastService);
  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  parametres = signal<ParametreFiscalView[]>([]);
  loading = signal(true);
  saving = signal(false);
  deleting = signal(false);
  exporting = signal(false);

  searchDraft = '';
  searchQuery = '';
  filterType: 'Tous' | ParametreFiscalType = 'Tous';
  filterUtilisation: 'Tous' | ParametreFiscalUtilisation = 'Tous';
  filterStatut: StatutFiltre = 'Tous';
  filterFournisseur: TypeFournisseur = 'Tous';
  dateDebut = '';
  dateFin = '';

  page = 1;
  pageSize = 7;
  pageSizes = [7, 10, 20];
  selectedIds = new Set<string>();

  editId: string | null = null;
  submitted = false;
  form: ParametreFiscalForm = this.emptyForm();

  deleteConfirm = signal<DeleteModal | null>(null);
  deleteBlocked = signal<BlockedDeleteModal | null>(null);
  usageModal = signal<UsageModal | null>(null);

  readonly typeOptions = [
    { value: 'Pourcentage' as const, label: 'Pourcentage' },
    { value: 'Fixe' as const, label: 'Montant fixe' }
  ];

  readonly utilisationOptions = [
    { value: 'Manuel' as const, label: 'Manuel' },
    { value: 'Auto' as const, label: 'Automatique' }
  ];

  readonly fournisseurOptions = [
    { value: 'Tous' as const, label: 'Tous' },
    { value: 'PersonnePhysique' as const, label: 'Personne physique' },
    { value: 'PersonneMorale' as const, label: 'Personne morale' }
  ];

  readonly documentOptions: Array<{ value: DocumentCible; label: string }> = [
    { value: 'Facture', label: 'Facture' },
    { value: 'Avoir', label: 'Avoir' },
    { value: 'BonCommande', label: 'Bon de commande' },
    { value: 'BonLivraison', label: 'Bon de livraison' },
    { value: 'BonReception', label: 'Bon de reception' },
    { value: 'BonSortie', label: 'Bon de sortie' },
    { value: 'Devis', label: 'Devis' },
    { value: 'FactureFournisseur', label: 'Facture fournisseur' }
  ];

  ngOnInit(): void {
    this.load();
  }

  ngOnDestroy(): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
  }

  emptyForm(): ParametreFiscalForm {
    return {
      libelle: '',
      codeDGI: '',
      valeur: null,
      type: 'Pourcentage',
      signe: 'Negatif',
      dateEffet: this.today(),
      estActif: true,
      ordreCalcul: 'AvantTva',
      utilisation: 'Manuel',
      typeFournisseur: 'Tous',
      seuilMinimum: null,
      inclureRS: true,
      documentsCibles: ['Facture']
    };
  }

  load(): void {
    this.loading.set(true);
    this.api.lister(this.apiFilters()).subscribe({
      next: (res: any) => {
        const list = Array.isArray(res) ? res : (res?.items ?? res?.data ?? res?.result ?? []);
        this.parametres.set((list ?? []).map((item: any) => this.normalize(item)));
        this.loading.set(false);
        this.selectedIds.clear();
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.error(err?.error?.message ?? 'Impossible de charger les paramètres fiscaux.');
      }
    });
  }

  private apiFilters() {
    return {
      search: this.searchQuery || undefined,
      type: this.filterType === 'Tous' ? undefined : this.filterType,
      utilisation: this.filterUtilisation === 'Tous' ? undefined : this.filterUtilisation,
      estActif: this.filterStatut === 'Tous' ? null : this.filterStatut === 'Actif',
      typeFournisseur: this.filterFournisseur === 'Tous' ? undefined : this.filterFournisseur,
      dateDebut: this.dateDebut || undefined,
      dateFin: this.dateFin || undefined
    };
  }

  onSearchChange(value: string): void {
    this.searchDraft = value;
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.searchQuery = this.searchDraft.trim();
      this.page = 1;
      this.selectedIds.clear();
    }, 300);
  }

  applyFilters(): void {
    this.page = 1;
    this.selectedIds.clear();
  }

  resetFilters(): void {
    this.searchDraft = '';
    this.searchQuery = '';
    this.filterType = 'Tous';
    this.filterUtilisation = 'Tous';
    this.filterStatut = 'Tous';
    this.filterFournisseur = 'Tous';
    this.dateDebut = '';
    this.dateFin = '';
    this.applyFilters();
  }

  filteredRows(): ParametreFiscalView[] {
    const q = this.searchQuery.toLowerCase();
    return this.parametres().filter(p => {
      const matchSearch = !q ||
        p.libelle.toLowerCase().includes(q) ||
        p.codeDGI.toLowerCase().includes(q);
      const matchType = this.filterType === 'Tous' || p.type === this.filterType;
      const matchUsage = this.filterUtilisation === 'Tous' || p.utilisation === this.filterUtilisation;
      const matchStatus = this.filterStatut === 'Tous' || (this.filterStatut === 'Actif' ? p.estActif : !p.estActif);
      const matchFournisseur = this.filterFournisseur === 'Tous' || p.typeFournisseur === this.filterFournisseur || p.typeFournisseur === 'Tous';
      const date = this.toDateOnly(p.dateEffet);
      const matchStart = !this.dateDebut || date >= this.dateDebut;
      const matchEnd = !this.dateFin || date <= this.dateFin;
      return matchSearch && matchType && matchUsage && matchStatus && matchFournisseur && matchStart && matchEnd;
    });
  }

  pagedRows(): ParametreFiscalView[] {
    const start = (this.page - 1) * this.pageSize;
    return this.filteredRows().slice(start, start + this.pageSize);
  }

  totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredRows().length / this.pageSize));
  }

  rangeStart(): number {
    return this.filteredRows().length === 0 ? 0 : (this.page - 1) * this.pageSize + 1;
  }

  rangeEnd(): number {
    return Math.min(this.page * this.pageSize, this.filteredRows().length);
  }

  goPrev(): void {
    this.page = Math.max(1, this.page - 1);
  }

  goNext(): void {
    this.page = Math.min(this.totalPages(), this.page + 1);
  }

  toggleSelect(id: string, checked: boolean): void {
    checked ? this.selectedIds.add(id) : this.selectedIds.delete(id);
  }

  toggleSelectAll(checked: boolean): void {
    this.pagedRows().forEach(p => checked ? this.selectedIds.add(p.id) : this.selectedIds.delete(p.id));
  }

  isAllPageSelected(): boolean {
    const rows = this.pagedRows();
    return rows.length > 0 && rows.every(p => this.selectedIds.has(p.id));
  }

  selectedRows(): ParametreFiscalView[] {
    return this.parametres().filter(p => this.selectedIds.has(p.id));
  }

  save(): void {
    this.submitted = true;
    if (!this.form.libelle.trim() || this.form.valeur === null || this.form.valeur < 0 || !this.form.dateEffet) {
      this.toast.error('Renseignez le libellé, la valeur et la date d\'effet.');
      return;
    }

    this.saving.set(true);
    const payload = this.toPayload();
    const request = this.editId
      ? this.api.mettreAJour(this.editId, payload)
      : this.api.creer(payload);

    request.subscribe({
      next: (saved: any) => {
        const normalized = this.normalize(saved);
        this.parametres.update(list => {
          if (this.editId) return list.map(p => p.id === normalized.id ? normalized : p);
          return [normalized, ...list];
        });
        this.toast.success(this.editId ? 'Paramètre fiscal mis à jour.' : 'Paramètre fiscal ajouté.');
        this.resetForm();
        this.saving.set(false);
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.error(err?.error?.message ?? 'Erreur lors de l\'enregistrement.');
      }
    });
  }

  edit(p: ParametreFiscalView): void {
    this.editId = p.id;
    this.submitted = false;
    this.form = {
      libelle: p.libelle,
      codeDGI: p.codeDGI,
      valeur: Number(p.valeur ?? 0),
      type: p.type as ParametreFiscalType,
      signe: p.signe as ParametreFiscalSigne,
      dateEffet: this.toDateOnly(p.dateEffet),
      estActif: p.estActif,
      ordreCalcul: p.ordreCalcul as ParametreFiscalOrdre,
      utilisation: p.utilisation as ParametreFiscalUtilisation,
      typeFournisseur: p.typeFournisseur,
      seuilMinimum: p.seuilMinimum,
      inclureRS: p.inclureRS,
      documentsCibles: this.normalizeDocuments(p.documentsCibles)
    };
  }

  resetForm(): void {
    this.editId = null;
    this.submitted = false;
    this.form = this.emptyForm();
  }

  toggleActif(p: ParametreFiscalView): void {
    this.api.toggleActif(p.id).subscribe({
      next: (updated: any) => {
        const normalized = this.normalize(updated);
        this.parametres.update(list => list.map(x => x.id === p.id ? normalized : x));
        this.toast.success(normalized.estActif ? 'Paramètre activé.' : 'Paramètre désactivé.');
      },
      error: () => {
        this.parametres.update(list => list.map(x => x.id === p.id ? { ...x, estActif: !x.estActif } : x));
        this.toast.info('Statut mis à jour localement.');
      }
    });
  }

  requestDelete(p: ParametreFiscalView): void {
    if (p.nombreUtilisations > 0) {
      this.deleteBlocked.set({
        title: 'Suppression impossible',
        message: `${p.libelle} est déjà utilisé dans ${p.nombreUtilisations} facture(s). Il faut le désactiver au lieu de le supprimer.`,
        count: p.nombreUtilisations
      });
      return;
    }

    this.api.utilisations(p.id).subscribe({
      next: res => {
        const count = Number(res?.nombreUtilisations ?? p.nombreUtilisations ?? 0);
        if (count > 0) {
          this.deleteBlocked.set({
            title: 'Suppression impossible',
            message: `${p.libelle} est déjà utilisé dans ${count} facture(s).`,
            count
          });
          return;
        }
        this.deleteConfirm.set({
          mode: 'single',
          ids: [p.id],
          title: 'Supprimer ce paramètre ?',
          message: `Le paramètre "${p.libelle}" sera supprimé définitivement.`
        });
      },
      error: () => {
        this.deleteConfirm.set({
          mode: 'single',
          ids: [p.id],
          title: 'Supprimer ce paramètre ?',
          message: `Le paramètre "${p.libelle}" sera supprimé définitivement.`
        });
      }
    });
  }

  requestBulkDelete(): void {
    const rows = this.selectedRows();
    if (!rows.length) return;
    const blocked = rows.filter(p => p.nombreUtilisations > 0);
    if (blocked.length) {
      const count = blocked.reduce((sum, p) => sum + p.nombreUtilisations, 0);
      this.deleteBlocked.set({
        title: 'Suppression groupée bloquée',
        message: `${blocked.length} paramètre(s) sont déjà utilisés dans des factures. Désactivez-les au lieu de les supprimer.`,
        count
      });
      return;
    }

    this.deleteConfirm.set({
      mode: 'bulk',
      ids: rows.map(p => p.id),
      title: 'Supprimer la sélection ?',
      message: `${rows.length} paramètre(s) seront supprimés définitivement.`
    });
  }

  deleteConfirmed(): void {
    const modal = this.deleteConfirm();
    if (!modal) return;
    this.deleting.set(true);

    let done = 0;
    let failed = 0;
    const ids = [...modal.ids];
    const deletedIds: string[] = [];
    const next = () => {
      const id = ids.shift();
      if (!id) {
        this.parametres.update(list => list.filter(p => !deletedIds.includes(p.id)));
        modal.ids.forEach(x => this.selectedIds.delete(x));
        this.deleteConfirm.set(null);
        this.deleting.set(false);
        if (failed) this.toast.warning(`${done} supprimé(s), ${failed} erreur(s).`);
        else this.toast.success(`${done} paramètre(s) supprimé(s).`);
        return;
      }

      this.api.supprimer(id).subscribe({
        next: () => { done += 1; deletedIds.push(id); next(); },
        error: (err) => {
          failed += 1;
          if (err?.status === 409) {
            this.deleteBlocked.set({
              title: 'Suppression impossible',
              message: err?.error?.message ?? 'Ce paramètre est utilisé dans des factures.',
              count: Number(err?.error?.nombreUtilisations ?? 0)
            });
          }
          next();
        }
      });
    };
    next();
  }

  bulkSetActive(active: boolean): void {
    const rows = this.selectedRows();
    if (!rows.length) return;
    rows.forEach(row => {
      if (row.estActif === active) return;
      this.parametres.update(list => list.map(p => p.id === row.id ? { ...p, estActif: active } : p));
      this.api.toggleActif(row.id).subscribe({ error: () => undefined });
    });
    this.toast.success(active ? 'Sélection activée.' : 'Sélection désactivée.');
  }

  openUsages(p: ParametreFiscalView): void {
    this.api.utilisations(p.id).subscribe({
      next: res => this.usageModal.set({ parametre: p, count: Number(res?.nombreUtilisations ?? p.nombreUtilisations ?? 0) }),
      error: () => this.usageModal.set({ parametre: p, count: p.nombreUtilisations })
    });
  }

  exportExcel(selectionOnly = false): void {
    const rows = selectionOnly ? this.selectedRows() : this.filteredRows();
    if (!rows.length) {
      this.toast.warning('Aucune donnée à exporter.');
      return;
    }
    const header = [
      'Libelle', 'Valeur', 'Type', 'Signe', 'Code DGI', 'Ordre calcul',
      'Utilisation', 'Type fournisseur', 'Seuil minimum', 'Date effet',
      'Statut', 'Inclure RS', 'Documents cibles', 'Utilisations'
    ];
    const body = rows.map(p => [
      p.libelle, this.formatValeur(p), this.typeLabel(p.type), this.signeLabel(p.signe),
      p.codeDGI, this.ordreLabel(p.ordreCalcul), this.utilisationLabel(p.utilisation),
      this.fournisseurLabel(p.typeFournisseur), p.seuilMinimum ?? '',
      this.formatDate(p.dateEffet), p.estActif ? 'Actif' : 'Inactif',
      p.inclureRS ? 'Oui' : 'Non', p.documentsCibles.join(' | '),
      `${p.nombreUtilisations} facture(s)`
    ]);
    const csv = [header, ...body].map(line => line.map(v => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\r\n');
    this.download(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }), `tuniflow-parametres-fiscaux-${this.today()}.csv`);
    this.toast.success('Export Excel généré.');
  }

  exportPdf(selectionOnly = false): void {
    const rows = selectionOnly ? this.selectedRows() : this.filteredRows();
    if (!rows.length) {
      this.toast.warning('Aucune donnée à exporter.');
      return;
    }
    const html = `
      <html><head><title>TuniFlow - Paramètres fiscaux</title>
      <style>
        body{font-family:Arial,sans-serif;padding:24px;color:#111827}
        h1{margin:0 0 4px;font-size:24px}.meta{color:#64748b;margin-bottom:18px}
        table{width:100%;border-collapse:collapse;font-size:12px}
        th,td{border:1px solid #e2e8f0;padding:8px;text-align:left}
        th{background:#f8fafc;color:#475569;text-transform:uppercase;font-size:10px}
      </style></head><body>
      <h1>TuniFlow - Paramètres fiscaux</h1>
      <div class="meta">Export du ${this.formatDate(this.today())}</div>
      <table><thead><tr><th>Libellé</th><th>Valeur</th><th>Code DGI</th><th>Utilisation</th><th>Statut</th><th>Utilisations</th></tr></thead>
      <tbody>${rows.map(p => `<tr><td>${this.escapeHtml(p.libelle)}</td><td>${this.escapeHtml(this.formatValeur(p))}</td><td>${this.escapeHtml(p.codeDGI || '-')}</td><td>${this.escapeHtml(this.utilisationLabel(p.utilisation))}</td><td>${p.estActif ? 'Actif' : 'Inactif'}</td><td>${p.nombreUtilisations} facture(s)</td></tr>`).join('')}</tbody></table>
      </body></html>`;
    const w = window.open('', '_blank');
    if (!w) {
      this.toast.error('Impossible d\'ouvrir la fenêtre PDF.');
      return;
    }
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
  }

  toggleDocument(doc: DocumentCible, checked: boolean): void {
    const current = new Set(this.form.documentsCibles);
    checked ? current.add(doc) : current.delete(doc);
    this.form.documentsCibles = [...current];
  }

  toggleAllDocuments(checked: boolean): void {
    this.form.documentsCibles = checked ? this.documentOptions.map(x => x.value) : [];
  }

  allDocumentsSelected(): boolean {
    return this.documentOptions.every(x => this.form.documentsCibles.includes(x.value));
  }

  documentChecked(doc: DocumentCible): boolean {
    return this.form.documentsCibles.includes(doc);
  }

  simulationAmount(): string {
    const valeur = Number(this.form.valeur ?? 0);
    const seuil = Number(this.form.seuilMinimum ?? 0);
    if (!this.form.inclureRS || valeur <= 0 || (seuil > 0 && 1000 < seuil)) return '0,000 DT';
    const amount = this.form.type === 'Pourcentage' ? 1000 * valeur / 100 : valeur;
    const signed = this.form.signe === 'Negatif' ? -amount : amount;
    return `${signed < 0 ? '-' : '+'}${Math.abs(signed).toLocaleString('fr-FR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} DT`;
  }

  formatValeur(p: Pick<ParametreFiscalView, 'valeur' | 'type' | 'signe'>): string {
    const prefix = p.signe === 'Negatif' ? '-' : '+';
    const value = Number(p.valeur ?? 0).toLocaleString('fr-FR', { maximumFractionDigits: 3 });
    return p.type === 'Pourcentage' ? `${prefix}${value}%` : `${prefix}${value} DT`;
  }

  formatDate(value: string | undefined): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  typeLabel(value: any): string {
    return this.normalizeType(value) === 'Fixe' ? 'Montant fixe' : 'Pourcentage';
  }

  signeLabel(value: any): string {
    return this.normalizeSigne(value) === 'Negatif' ? 'Négatif' : 'Positif';
  }

  ordreLabel(value: any): string {
    return this.normalizeOrdre(value) === 'ApresTva' ? 'Après TVA' : 'Avant TVA';
  }

  utilisationLabel(value: any): string {
    return this.normalizeUtilisation(value) === 'Auto' ? 'Automatique' : 'Manuel';
  }

  fournisseurLabel(value: any): string {
    const v = this.normalizeFournisseur(value);
    if (v === 'PersonnePhysique') return 'Personne physique';
    if (v === 'PersonneMorale') return 'Personne morale';
    return 'Tous';
  }

  codeDgiTitle(): string {
    return 'Code officiel Direction Générale des Impôts';
  }

  retenueTitle(): string {
    return 'Retenue à la source - prélevée par le client';
  }

  negativeTitle(p: ParametreFiscalView): string | null {
    return p.signe === 'Negatif' ? 'Montant déduit du total facture' : null;
  }

  isRs(p: ParametreFiscalView): boolean {
    return p.inclureRS || p.inclureRetenueSource || p.libelle.toLowerCase().includes('retenue');
  }

  private toPayload(): CreerParametreFiscalRequest {
    return {
      libelle: this.form.libelle.trim(),
      valeur: Number(this.form.valeur ?? 0),
      type: this.form.type,
      signe: this.form.signe,
      ordreCalcul: this.form.ordreCalcul,
      utilisation: this.form.utilisation,
      codeDGI: this.form.codeDGI.trim(),
      typeFournisseur: this.form.typeFournisseur,
      seuilMinimum: this.form.seuilMinimum,
      dateEffet: this.form.dateEffet,
      inclureRetenueSource: this.form.inclureRS,
      inclureRS: this.form.inclureRS,
      documentsCibles: this.form.documentsCibles,
      estActif: this.form.estActif
    };
  }

  private normalize(p: any): ParametreFiscalView {
    const libelle = String(p?.libelle ?? p?.Libelle ?? p?.titre ?? 'Paramètre fiscal');
    const type = this.normalizeType(p?.type ?? p?.Type);
    const signe = this.normalizeSigne(p?.signe ?? p?.Signe);
    const ordreCalcul = this.normalizeOrdre(p?.ordreCalcul ?? p?.OrdreCalcul);
    const utilisation = this.normalizeUtilisation(p?.utilisation ?? p?.Utilisation);
    const docs = this.normalizeDocuments(p?.documentsCibles ?? p?.DocumentsCibles);
    const inclureRS = this.toBool(p?.inclureRS ?? p?.InclureRS ?? p?.inclureRetenueSource ?? p?.InclureRetenueSource);
    const created = String(p?.creeLe ?? p?.createdAt ?? new Date().toISOString());
    const updated = String(p?.modifieLe ?? p?.updatedAt ?? created);
    return {
      ...p,
      id: String(p?.id ?? p?.Id ?? crypto.randomUUID()),
      entrepriseId: String(p?.entrepriseId ?? p?.EntrepriseId ?? ''),
      libelle,
      valeur: Number(p?.valeur ?? p?.Valeur ?? 0),
      type,
      signe,
      ordreCalcul,
      utilisation,
      codeDGI: String(p?.codeDGI ?? p?.CodeDGI ?? ''),
      typeFournisseur: this.normalizeFournisseur(p?.typeFournisseur ?? p?.TypeFournisseur),
      seuilMinimum: p?.seuilMinimum === undefined || p?.seuilMinimum === null ? null : Number(p.seuilMinimum),
      dateEffet: this.toDateOnly(p?.dateEffet ?? p?.DateEffet ?? created),
      inclureRetenueSource: inclureRS,
      inclureRS,
      documentsCibles: docs,
      nombreUtilisations: Number(p?.nombreUtilisations ?? p?.NombreUtilisations ?? 0),
      estActif: this.toBool(p?.estActif ?? p?.EstActif ?? true),
      creeLe: created,
      modifieLe: updated
    };
  }

  private normalizeType(value: any): ParametreFiscalType {
    const s = String(value ?? '').toLowerCase();
    return s.includes('fix') || s.includes('montant') || s === '1' ? 'Fixe' : 'Pourcentage';
  }

  private normalizeSigne(value: any): ParametreFiscalSigne {
    const s = String(value ?? '').toLowerCase();
    return s.includes('neg') || s.includes('moins') || s === '-' || s === '1' ? 'Negatif' : 'Positif';
  }

  private normalizeOrdre(value: any): ParametreFiscalOrdre {
    const s = String(value ?? '').toLowerCase();
    return s.includes('apres') || s.includes('après') || s === '1' ? 'ApresTva' : 'AvantTva';
  }

  private normalizeUtilisation(value: any): ParametreFiscalUtilisation {
    const s = String(value ?? '').toLowerCase();
    return s.includes('auto') || s === '1' ? 'Auto' : 'Manuel';
  }

  private normalizeFournisseur(value: any): TypeFournisseur {
    const s = String(value ?? '').toLowerCase();
    if (s.includes('phys')) return 'PersonnePhysique';
    if (s.includes('moral')) return 'PersonneMorale';
    return 'Tous';
  }

  private normalizeDocuments(raw: any): DocumentCible[] {
    if (!raw) return [];
    const values = Array.isArray(raw) ? raw : String(raw).split(',');
    return values
      .map(x => String(x).trim().replace(/ /g, ''))
      .map(x => x === 'Facturedavoir' ? 'Avoir' : x)
      .filter((x): x is DocumentCible => this.documentOptions.some(opt => opt.value === x));
  }

  private toBool(value: any): boolean {
    if (value === true || value === false) return value;
    if (value === undefined || value === null) return false;
    const s = String(value).toLowerCase();
    if (['true', '1', 'oui', 'yes'].includes(s)) return true;
    if (['false', '0', 'non', 'no'].includes(s)) return false;
    return Boolean(value);
  }

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private toDateOnly(value: any): string {
    if (!value) return this.today();
    const str = String(value);
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
    const date = new Date(str);
    return Number.isNaN(date.getTime()) ? this.today() : date.toISOString().slice(0, 10);
  }

  private download(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  private escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, char => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[char] ?? char));
  }
}
