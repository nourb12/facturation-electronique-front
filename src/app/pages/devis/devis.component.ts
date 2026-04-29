
import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { trigger, transition, style, animate } from '@angular/animations';
import {
  FactureApiService, FactureDto, ListeFacturesDto,
  StatistiquesFacturesDto, ClientService, ClientDto,
  ProduitApiService, ProduitDto,
  TeifApiService, PaiementApiService, SignatureApiService, TtnApiService
} from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { buildDocumentListParams, createDocumentStatuses, updateDocumentStatusCounts } from '../../core/utils/document-page.utils';

@Component({
  selector: 'app-devis',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './devis.component.html',
  styleUrls: ['./devis.component.scss'],
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
export class DevisComponent implements OnInit {
  private router       = inject(Router);
  private factureSvc   = inject(FactureApiService);
  private clientSvc    = inject(ClientService);
  private produitSvc   = inject(ProduitApiService);
  private teifSvc      = inject(TeifApiService);
  private paiementSvc  = inject(PaiementApiService);
  private signatureSvc = inject(SignatureApiService);
  private ttnSvc       = inject(TtnApiService);
  private toast        = inject(ToastService);


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
    clientId: '', typeFacture: 'Proforma',
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
    { key: 'all',       label: 'Toutes',     count: 0 },
    { key: 'Brouillon', label: 'Brouillons', count: 0 },
    { key: 'Validee',   label: 'Validées',   count: 0 },
    { key: 'Conforme',  label: 'Conformes',  count: 0 },
    { key: 'Transmise', label: 'Transmises', count: 0 },
    { key: 'Acceptee',  label: 'Acceptées',  count: 0 },
    { key: 'Rejetee',   label: 'Rejetées',   count: 0 },
    { key: 'Payee',     label: 'Payées',     count: 0 },
  ];

  readonly typeFactureOptions   = ['Proforma'];
  readonly modePaiementOptions  = ['Virement', 'Cheque', 'Especes', 'CarteBancaire', 'Traite'];


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


    const params = buildDocumentListParams({
      page: this.currentPage(),
      parPage: this.parPage,
      typeFacture: 'Proforma',
      activeStatut: this.activeStatut,
      searchQuery: this.searchQuery,
      filtreClientId: this.filtreClientId,
      filtreDateDebut: this.filtreDateDebut,
      filtreDateFin: this.filtreDateFin,
    });

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
    updateDocumentStatusCounts(this.statuts, this.factures());
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
      factureOrigineId:   this.newFacture.factureOrigineId || undefined,
      modePaiement:       this.newFacture.modePaiement,
      dateEcheance:       new Date(this.newFacture.dateEcheance).toISOString(),
      reference:          this.newFacture.reference || undefined,
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
        this.toast.success(`Devis ${f.numero} créé.`);
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.error(err?.error?.message ?? 'Erreur création.');
      }
    });
  }

  convertirEnFacture(f: any) {
    if (!f || this.actionLoading()) return;
    this.actionLoading.set(true);

    this.factureSvc.obtenirParId(f.id).subscribe({
      next: (detail) => {
        const req = {
          clientId:           detail.clientId,
          typeFacture:        'Facture',
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
            this.toast.success(`Facture ${created.numero} créée à partir du devis ${detail.numero}.`);
            this.loadAll();
          },
          error: (err) => {
            this.actionLoading.set(false);
            this.toast.error(err?.error?.message ?? 'Erreur conversion.');
          }
        });
      },
      error: (err) => {
        this.actionLoading.set(false);
        this.toast.error(err?.error?.message ?? 'Impossible de charger le devis.');
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
      error: () => { this.historiqueLoading.set(false); this.toast.error('Impossible de charger l\'historique.'); }
    });
  }


  valider(f: any) {
    if (this.actionLoading()) return;
    this.actionLoading.set(true);
    this.factureSvc.valider(f.id).subscribe({
      next: (updated) => { this.actionLoading.set(false); this.updateFacture(updated); this.toast.success(`Facture ${updated.numero} validée.`); },
      error: (err)    => { this.actionLoading.set(false); this.toast.error(err?.error?.message ?? 'Erreur validation.'); }
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
        this.toast.success('XML TEIF genere.');
      },
      error: (err) => { this.teifLoading.set(false); this.toast.error(err?.error?.message ?? 'Erreur generation XML.'); }
    });
  }

  validerTeif(f: any) {
    this.actionLoading.set(true);
    this.teifSvc.marquerConforme(f.id).subscribe({
      next: (updated) => { this.actionLoading.set(false); this.updateFacture(updated); this.toast.success('Facture marquée conforme TEIF.'); },
      error: (err)    => { this.actionLoading.set(false); this.toast.error(err?.error?.message ?? 'Non conforme — vérifiez les données.'); }
    });
  }

  signer(f: any) {
    this.actionLoading.set(true);
    this.signatureSvc.demander(f.id).subscribe({
      next: (sig) => {
        this.actionLoading.set(false);
        if (sig.statut === 'Signee') this.toast.success('Facture signée.');
        else this.toast.info('Signature en cours : ' + (sig.messageErreur ?? ''));
      },
      error: (err) => { this.actionLoading.set(false); this.toast.error(err?.error?.message ?? 'Erreur signature.'); }
    });
  }

  envoyerTtn(f: any) {
    this.actionLoading.set(true);
    this.ttnSvc.envoyer(f.id).subscribe({
      next: ()    => { this.actionLoading.set(false); this.loadAll(); this.toast.success('Facture envoyée au système TTN.'); },
      error: (err) => { this.actionLoading.set(false); this.toast.error(err?.error?.message ?? 'Erreur envoi TTN.'); }
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
      next: ()    => { this.saving.set(false); this.showPaiementModal.set(false); this.loadAll(); this.toast.success('Paiement enregistré.'); },
      error: (err) => { this.saving.set(false); this.toast.error(err?.error?.message ?? 'Erreur paiement.'); }
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
      error: () => { this.pdfLoading.set(false); this.toast.error('Erreur génération PDF.'); }
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
      error: () => this.toast.error('Impossible de télécharger le XML.')
    });
  }

  exportCSV() {
    const rows = [['Numéro','Client','Statut','Total TTC','Devise','Date émission']];
    this.filteredFactures().forEach(f => {
      rows.push([f.numero, f.clientNom, f.statut, String(f.totalTtc), f.devise, f.dateEmission?.substring(0,10)]);
    });
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'devis.csv'; a.click();
    URL.revokeObjectURL(url);
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
      clientId: '', typeFacture: 'Proforma',
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
