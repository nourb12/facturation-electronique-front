
import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { trigger, transition, style, animate } from '@angular/animations';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import {
  FactureApiService, FactureDto, ListeFacturesDto,
  StatistiquesFacturesDto, ClientService, ClientDto,
  ProduitApiService, ProduitDto,
  TeifApiService, PaiementApiService, SignatureApiService, TtnApiService
} from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-factures',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './factures.component.html',
  styleUrls: ['./factures.component.scss'],
  animations: [
    trigger('pageIn', [transition(':enter', [
      style({ opacity: 0, transform: 'translateY(8px)' }),
      animate('380ms cubic-bezier(.16,1,.3,1)', style({ opacity: 1, transform: 'translateY(0)' }))
    ])]),
    trigger('fadeIn', [
      transition(':enter', [style({ opacity: 0 }), animate('200ms ease', style({ opacity: 1 }))]),
      transition(':leave', [animate('150ms ease', style({ opacity: 0 }))])
    ]),
    trigger('modalIn', [transition(':enter', [
      style({ opacity: 0, transform: 'scale(.95) translateY(10px)' }),
      animate('300ms cubic-bezier(.16,1,.3,1)', style({ opacity: 1, transform: 'scale(1) translateY(0)' }))
    ])]),
    trigger('rowIn', [transition(':enter', [
      style({ opacity: 0, transform: 'translateX(-8px)' }),
      animate('250ms ease', style({ opacity: 1, transform: 'translateX(0)' }))
    ])])
  ]
})
export class FacturesComponent implements OnInit {
  private router       = inject(Router);
  private factureSvc   = inject(FactureApiService);
  private clientSvc    = inject(ClientService);
  private produitSvc   = inject(ProduitApiService);
  private teifSvc      = inject(TeifApiService);
  private paiementSvc  = inject(PaiementApiService);
  private signatureSvc = inject(SignatureApiService);
  private ttnSvc       = inject(TtnApiService);
  private toast        = inject(ToastService);
  private translate    = inject(TranslateService);


  loading       = signal(true);
  saving        = signal(false);
  factures      = signal<any[]>([]);
  total         = signal(0);
  stats         = signal<StatistiquesFacturesDto | null>(null);
  clients       = signal<ClientDto[]>([]);
  produits      = signal<ProduitDto[]>([]);


  searchQuery   = '';
  activeStatut  = 'all';
  sortBy        = 'date-desc';
  currentPage   = signal(1);
  parPage       = 20;


  filtreClientId   = '';
  filtreDateDebut  = '';
  filtreDateFin    = '';
  showFiltresAvances = false;


  showModal          = signal(false);
  showDetailModal    = signal(false);
  showValiderModal   = signal(false);
  showPaiementModal  = signal(false);

  showHistoriqueModal = signal(false);
  historiqueFacture   = signal<any[]>([]);
  historiqueLoading   = signal(false);

  selectedFacture    = signal<any | null>(null);
  actionLoading      = signal(false);
  pdfLoading         = signal(false);
  teifLoading        = signal(false);


  newFacture: any = {
    clientId: '', typeFacture: 'Facture',
    modePaiement: 'Virement',
    dateEcheance: this.defaultEcheance(),
    notes: '', conditionsPaiement: '', devise: 'TND',
    lignes: [this.newLigne()]
  };


  paiementForm = {
    montant: 0, mode: 'Virement',
    datePaiement: new Date().toISOString().substring(0, 10),
    reference: '', banque: ''
  };


  readonly statuts = [
    { key: 'all',       labelKey: 'FACTURES.FILTERS.ALL',       count: 0 },
    { key: 'Brouillon', labelKey: 'FACTURES.FILTERS.DRAFT',     count: 0 },
    { key: 'Validee',   labelKey: 'FACTURES.FILTERS.VALIDATED', count: 0 },
    { key: 'Conforme',  labelKey: 'FACTURES.FILTERS.COMPLIANT', count: 0 },
    { key: 'Transmise', labelKey: 'FACTURES.FILTERS.SENT',      count: 0 },
    { key: 'Acceptee',  labelKey: 'FACTURES.FILTERS.ACCEPTED',  count: 0 },
    { key: 'Rejetee',   labelKey: 'FACTURES.FILTERS.REJECTED',  count: 0 },
    { key: 'Payee',     labelKey: 'FACTURES.FILTERS.PAID',      count: 0 },
  ];

  readonly typeFactureOptions = [
    { value: 'Facture',  labelKey: 'INVOICE.TYPE.INVOICE' },
    { value: 'Avoir',    labelKey: 'INVOICE.TYPE.CREDIT_NOTE' },
    { value: 'Proforma', labelKey: 'INVOICE.TYPE.PROFORMA' },
  ] as const;

  readonly modePaiementOptions = [
    { value: 'Virement',       labelKey: 'INVOICE.PAYMENT_MODES.BANK_TRANSFER' },
    { value: 'Cheque',         labelKey: 'INVOICE.PAYMENT_MODES.CHECK' },
    { value: 'Especes',        labelKey: 'INVOICE.PAYMENT_MODES.CASH' },
    { value: 'CarteBancaire',  labelKey: 'INVOICE.PAYMENT_MODES.CARD' },
    { value: 'Traite',         labelKey: 'INVOICE.PAYMENT_MODES.BILL_OF_EXCHANGE' },
  ] as const;


  filteredFactures = computed(() => {
    let list = this.factures();
    const q = this.searchQuery.toLowerCase();
    if (q) list = list.filter(f =>
      f.numero?.toLowerCase().includes(q) ||
      f.clientNom?.toLowerCase().includes(q) ||
      (f.reference ?? '').toLowerCase().includes(q)
    );
    return list;
  });


  get totalHt()  { return this.newFacture.lignes.reduce((s: number, l: any) => s + (l.montantHt  || 0), 0); }
  get totalTva() { return this.newFacture.lignes.reduce((s: number, l: any) => s + (l.montantTva || 0), 0); }
  get totalTtc() { return this.newFacture.lignes.reduce((s: number, l: any) => s + (l.montantTtc || 0), 0); }


  get totalPages() { return Math.ceil(this.total() / this.parPage); }
  pagePrecedente() { if (this.currentPage() > 1) { this.currentPage.update(p => p - 1); this.loadAll(); } }
  pageSuivante()   { if (this.currentPage() < this.totalPages) { this.currentPage.update(p => p + 1); this.loadAll(); } }


  ngOnInit() { this.loadAll(); }


  loadAll() {
    this.loading.set(true);


    const params: any = { page: this.currentPage(), parPage: this.parPage };
    if (this.activeStatut !== 'all')  params['statut']    = this.activeStatut;
    if (this.searchQuery.trim())      params['recherche'] = this.searchQuery.trim();
    if (this.filtreClientId)          params['clientId']  = this.filtreClientId;
    if (this.filtreDateDebut)         params['dateDebut'] = this.filtreDateDebut;
    if (this.filtreDateFin)           params['dateFin']   = this.filtreDateFin;

    this.factureSvc.lister(params).subscribe({
      next: (res: ListeFacturesDto) => {
        this.factures.set(res.items);
        this.total.set(res.total);
        this.loading.set(false);
        this.updateStatutCounts();
      },
      error: () => this.loading.set(false)
    });

    this.factureSvc.statistiques().subscribe({ next: s => this.stats.set(s) });

    this.clientSvc.lister(1, 200, true).subscribe({ next: res => this.clients.set(res.items) });
    this.produitSvc.lister(1, 200, undefined, true).subscribe({ next: res => this.produits.set(res.items) });
  }

  private updateStatutCounts() {
    const all = this.factures();
    this.statuts[0].count = all.length;
    this.statuts.slice(1).forEach(s => { s.count = all.filter(f => f.statut === s.key).length; });
  }


  setStatut(key: string) {
    this.activeStatut = key;
    this.currentPage.set(1);
    this.loadAll();
  }

  appliquerFiltres() { this.currentPage.set(1); this.loadAll(); }

  reinitialiserFiltres() {
    this.searchQuery = '';
    this.filtreClientId = '';
    this.filtreDateDebut = '';
    this.filtreDateFin = '';
    this.activeStatut = 'all';
    this.currentPage.set(1);
    this.loadAll();
  }


  openModal()  { this.showModal.set(true); }
  closeModal() { this.showModal.set(false); this.resetNewFacture(); }

  addLigne() { this.newFacture.lignes.push(this.newLigne()); }

  removeLigne(i: number) {
    if (this.newFacture.lignes.length > 1) this.newFacture.lignes.splice(i, 1);
    this.recalculerTotaux();
  }

  onProduitChange(ligne: any, produitId: string) {
    const p = this.produits().find(pr => pr.id === produitId);
    if (p) {
      ligne.designation  = p.libelle;
      ligne.prixUnitaire = p.prixUnitaire;
      ligne.tauxTva      = p.tauxTva;
      ligne.unite        = p.unite;
      this.recalculerTotaux();
    }
  }

  recalculerTotaux() {
    this.newFacture.lignes.forEach((l: any) => {
      const brut   = (l.quantite || 0) * (l.prixUnitaire || 0);
      const remise = brut * ((l.tauxRemise || 0) / 100);
      const ht     = brut - remise;
      const tva    = ht * ((l.tauxTva || 0) / 100);
      l.montantHt  = +ht.toFixed(3);
      l.montantTva = +tva.toFixed(3);
      l.montantTtc = +(ht + tva).toFixed(3);
    });
  }

  creerFacture() {
    if (!this.newFacture.clientId || this.saving()) return;
    this.saving.set(true);
    const req = {
      clientId:           this.newFacture.clientId,
      typeFacture:        this.newFacture.typeFacture,
      modePaiement:       this.newFacture.modePaiement,
      dateEcheance:       new Date(this.newFacture.dateEcheance).toISOString(),
      notes:              this.newFacture.notes || undefined,
      conditionsPaiement: this.newFacture.conditionsPaiement || undefined,
      devise:             this.newFacture.devise,
      lignes: this.newFacture.lignes.map((l: any) => ({
        designation:  l.designation,
        quantite:     l.quantite,
        prixUnitaire: l.prixUnitaire,
        tauxTva:      l.tauxTva,
        tauxRemise:   l.tauxRemise || 0,
        unite:        l.unite,
        produitId:    l.produitId || undefined,
        description:  l.description || undefined,
      }))
    };
    this.factureSvc.creer(req).subscribe({
      next: (f) => {
        this.saving.set(false);
        this.factures.update(list => [f, ...list]);
        this.total.update(v => v + 1);
        this.updateStatutCounts();
        this.closeModal();
        this.toast.successKey('FACTURES.TOAST.CREATED', { number: f.numero });
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.errorKey(err?.error?.message ?? 'FACTURES.TOAST.CREATE_ERROR');
      }
    });
  }

  creerAvoirDepuisFacture(f: any) {
    if (!f || this.actionLoading()) return;
    this.actionLoading.set(true);

    this.factureSvc.obtenirParId(f.id).subscribe({
      next: (detail) => {
        const req = {
          clientId:           detail.clientId,
          typeFacture:        'Avoir',
          factureOrigineId:   detail.id,
          modePaiement:       detail.modePaiement,
          dateEcheance:       new Date(detail.dateEcheance).toISOString(),
          reference:          detail.reference || undefined,
          notes:              detail.notes || undefined,
          conditionsPaiement: detail.conditionsPaiement || undefined,
          devise:             detail.devise,
          lignes: detail.lignes.map((l: any) => ({
            designation:  l.designation,
            quantite:     l.quantite,
            prixUnitaire: l.prixUnitaire,
            tauxTva:      l.tauxTva,
            tauxRemise:   l.tauxRemise || 0,
            unite:        l.unite,
            produitId:    l.produitId || undefined,
            description:  l.description || undefined,
          }))
        };

        this.factureSvc.creer(req).subscribe({
          next: (created) => {
            this.actionLoading.set(false);
            this.toast.successKey('FACTURES.TOAST.CREDIT_CREATED_FROM_INVOICE', {
              creditNumber: created.numero,
              invoiceNumber: detail.numero,
            });
            this.loadAll();
          },
          error: (err) => {
            this.actionLoading.set(false);
            this.toast.errorKey(err?.error?.message ?? 'FACTURES.TOAST.CREDIT_CREATE_ERROR');
          }
        });
      },
      error: (err) => {
        this.actionLoading.set(false);
        this.toast.errorKey(err?.error?.message ?? 'FACTURES.TOAST.LOAD_INVOICE_ERROR');
      }
    });
  }
  openDetail(f: any) { this.selectedFacture.set(f); this.showDetailModal.set(true); }
  closeDetail()      { this.showDetailModal.set(false); this.selectedFacture.set(null); }


  voirHistorique(f: any) {
    this.selectedFacture.set(f);
    this.historiqueFacture.set([]);
    this.historiqueLoading.set(true);
    this.showHistoriqueModal.set(true);

    this.factureSvc.obtenirHistorique(f.id).subscribe({
      next: (hist) => { this.historiqueLoading.set(false); this.historiqueFacture.set(hist); },
      error: () => {
        this.historiqueLoading.set(false);
        this.toast.errorKey('FACTURES.TOAST.HISTORY_LOAD_ERROR');
      }
    });
  }


  valider(f: any) {
    if (this.actionLoading()) return;
    this.actionLoading.set(true);
    this.factureSvc.valider(f.id).subscribe({
      next: (updated) => {
        this.actionLoading.set(false);
        this.updateFacture(updated);
        this.toast.successKey('FACTURES.TOAST.VALIDATED', { number: updated.numero });
      },
      error: (err) => {
        this.actionLoading.set(false);
        this.toast.errorKey(err?.error?.message ?? 'FACTURES.TOAST.VALIDATION_ERROR');
      }
    });
  }


  genererXml(f: any) {
    this.teifLoading.set(true);
    this.teifSvc.genererXml(f.id).subscribe({
      next: (res) => {
        this.teifLoading.set(false);
        this.updateFacture({
          ...f,
          xmlGenere: !!res.xmlContent,
          versionTeif: res.versionTeif
        });
        this.toast.successKey('FACTURES.TOAST.XML_GENERATED');
      },
      error: (err) => {
        this.teifLoading.set(false);
        this.toast.errorKey(err?.error?.message ?? 'FACTURES.TOAST.XML_GENERATION_ERROR');
      }
    });
  }

  validerTeif(f: any) {
    this.actionLoading.set(true);
    this.teifSvc.marquerConforme(f.id).subscribe({
      next: (updated) => {
        this.actionLoading.set(false);
        this.updateFacture(updated);
        this.toast.successKey('FACTURES.TOAST.TEIF_COMPLIANT');
      },
      error: (err) => {
        this.actionLoading.set(false);
        this.toast.errorKey(err?.error?.message ?? 'FACTURES.TOAST.TEIF_NON_COMPLIANT');
      }
    });
  }

  signer(f: any) {
    this.actionLoading.set(true);
    this.signatureSvc.demander(f.id).subscribe({
      next: (sig) => {
        this.actionLoading.set(false);
        if (sig.statut === 'Signee') this.toast.successKey('FACTURES.TOAST.SIGNED');
        else this.toast.infoKey('FACTURES.TOAST.SIGNATURE_IN_PROGRESS', { message: sig.messageErreur ?? '' });
      },
      error: (err) => {
        this.actionLoading.set(false);
        this.toast.errorKey(err?.error?.message ?? 'FACTURES.TOAST.SIGNATURE_ERROR');
      }
    });
  }

  envoyerTtn(f: any) {
    this.actionLoading.set(true);
    this.ttnSvc.envoyer(f.id).subscribe({
      next: () => {
        this.actionLoading.set(false);
        this.loadAll();
        this.toast.successKey('FACTURES.TOAST.SENT_TTN');
      },
      error: (err) => {
        this.actionLoading.set(false);
        this.toast.errorKey(err?.error?.message ?? 'FACTURES.TOAST.SEND_TTN_ERROR');
      }
    });
  }


  ouvrirPaiement(f: any) {
    this.selectedFacture.set(f);
    this.paiementForm.montant = f.montantRestant;
    this.showPaiementModal.set(true);
  }

  enregistrerPaiement() {
    const f = this.selectedFacture();
    if (!f || this.saving()) return;
    this.saving.set(true);
    this.paiementSvc.enregistrer({
      factureId:    f.id,
      montant:      this.paiementForm.montant,
      mode:         this.paiementForm.mode,
      datePaiement: new Date(this.paiementForm.datePaiement).toISOString(),
      reference:    this.paiementForm.reference || undefined,
      banque:       this.paiementForm.banque    || undefined,
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.showPaiementModal.set(false);
        this.loadAll();
        this.toast.successKey('FACTURES.TOAST.PAYMENT_RECORDED');
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.errorKey(err?.error?.message ?? 'FACTURES.TOAST.PAYMENT_ERROR');
      }
    });
  }


  telechargerPdf(f: any) {
    if (!f || this.pdfLoading()) return;
    this.pdfLoading.set(true);
    this.factureSvc.telechargerPdf(f.id).subscribe({
      next: (blob: Blob) => {
        this.pdfLoading.set(false);
        const url = URL.createObjectURL(blob);
        const win = window.open(url, '_blank');
        if (win) {
          win.onload = () => { win.print(); URL.revokeObjectURL(url); };
        } else {

          const a = document.createElement('a');
          a.href = url; a.download = `${f.numero}.pdf`; a.click();
          URL.revokeObjectURL(url);
        }
      },
      error: () => {
        this.pdfLoading.set(false);
        this.toast.errorKey('FACTURES.TOAST.PDF_ERROR');
      }
    });
  }

  telechargerXml(f: any) {
    this.teifSvc.telechargerXml(f.id).subscribe({
      next: (blob: Blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `${f.numero}_TEIF.xml`; a.click();
        URL.revokeObjectURL(url);
      },
      error: () => this.toast.errorKey('FACTURES.TOAST.XML_DOWNLOAD_ERROR')
    });
  }

  exportCSV() {
    const rows = [[
      this.translate.instant('FACTURES.CSV.HEADERS.NUMBER'),
      this.translate.instant('FACTURES.CSV.HEADERS.CLIENT'),
      this.translate.instant('FACTURES.CSV.HEADERS.STATUS'),
      this.translate.instant('FACTURES.CSV.HEADERS.TOTAL_TTC'),
      this.translate.instant('FACTURES.CSV.HEADERS.CURRENCY'),
      this.translate.instant('FACTURES.CSV.HEADERS.ISSUE_DATE'),
    ]];
    this.filteredFactures().forEach(f => {
      rows.push([f.numero, f.clientNom, f.statut, String(f.totalTtc), f.devise, f.dateEmission?.substring(0,10)]);
    });
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = this.translate.instant('FACTURES.CSV.FILE_NAME'); a.click();
    URL.revokeObjectURL(url);
  }

  statutLabelKey(statut: string): string {
    switch (statut) {
      case 'Brouillon':
        return 'FACTURES.STATUS.DRAFT';
      case 'Validee':
        return 'FACTURES.STATUS.VALIDATED';
      case 'Conforme':
        return 'FACTURES.STATUS.COMPLIANT';
      case 'Transmise':
        return 'FACTURES.STATUS.SENT';
      case 'Acceptee':
        return 'FACTURES.STATUS.ACCEPTED';
      case 'Rejetee':
        return 'FACTURES.STATUS.REJECTED';
      case 'Payee':
        return 'FACTURES.STATUS.PAID';
      case 'PartiellemntPayee':
      case 'PartiellemementPayee':
      case 'PartiellementPayee':
        return 'FACTURES.STATUS.PARTIALLY_PAID';
      case 'Annulee':
        return 'FACTURES.STATUS.CANCELLED';
      default:
        return statut;
    }
  }

  getStatutClass(statut: string): string {
    const map: Record<string, string> = {
      Brouillon: 'neutral', Validee: 'info', Conforme: 'info',
      Transmise: 'warn', Acceptee: 'ok', Rejetee: 'err',
      Payee: 'ok', PartiellemementPayee: 'warn', Annulee: 'neutral'
    };
    return map[statut] ?? 'neutral';
  }

  private updateFacture(updated: any) {
    this.factures.update(list => list.map(f => f.id === updated.id ? updated : f));
    this.updateStatutCounts();
    if (this.selectedFacture()?.id === updated.id) this.selectedFacture.set(updated);
  }

  private resetNewFacture() {
    this.newFacture = {
      clientId: '', typeFacture: 'Facture',
      modePaiement: 'Virement', dateEcheance: this.defaultEcheance(),
      notes: '', conditionsPaiement: '', devise: 'TND',
      lignes: [this.newLigne()]
    };
  }

  private newLigne(): any {
    return { produitId: '', designation: '', description: '', unite: 'U', quantite: 1, prixUnitaire: 0, tauxRemise: 0, tauxTva: 19, montantHt: 0, montantTva: 0, montantTtc: 0 };
  }

  private defaultEcheance(): string {
    const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString().substring(0, 10);
  }
}
