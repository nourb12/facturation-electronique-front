import { Component, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

const API = environment.apiUrl;

interface AdminFacture {
  id: string;
  entrepriseId: string;
  numero: string;
  entrepriseNom: string;
  clientNom: string;
  clientEmail?: string;
  dateEmission: string;
  totalTTC: number;
  statut: string;
  xmlGenere?: boolean;
  hashIntegrite?: string;
  versionTeif?: string;
  signatureStatut?: string;
  echangeStatut?: string;
  validationFiscale?: {
    statut: string;
    reference?: string;
    commentaire?: string;
    erreurs?: string[];
    date?: string;
  };
}

interface AdminXmlResponse {
  factureId: string;
  numero: string;
  xmlContent: string;
  hashIntegrite: string;
  versionTeif: string;
  genereA: string;
}

const SCENARIO_FACTURES: AdminFacture[] = [
  {
    id: 'admin-demo-001',
    entrepriseId: 'demo-entreprise-01',
    numero: 'FAC-TEIF-2026-001',
    entrepriseNom: 'Iberis Consulting SARL',
    clientNom: 'Societe Carthage Distribution',
    clientEmail: 'finance@carthage-distribution.tn',
    dateEmission: '2026-05-14T09:30:00Z',
    totalTTC: 18420.750,
    statut: 'Validee',
    xmlGenere: true,
    hashIntegrite: 'SIM-SHA256-7C4B-001-TEIF',
    versionTeif: 'TEIF v1.8.8',
    signatureStatut: 'A signer',
    echangeStatut: 'Pret validation admin'
  },
  {
    id: 'admin-demo-002',
    entrepriseId: 'demo-entreprise-02',
    numero: 'FAC-TEIF-2026-002',
    entrepriseNom: 'Tunis Digital Services',
    clientNom: 'Clinique El Amen',
    clientEmail: 'compta@elamen.tn',
    dateEmission: '2026-05-13T11:15:00Z',
    totalTTC: 9360.000,
    statut: 'EnAttenteAdmin',
    xmlGenere: true,
    hashIntegrite: 'SIM-SHA256-92AF-002-TEIF',
    versionTeif: 'TEIF v1.8.8',
    signatureStatut: 'Signee',
    echangeStatut: 'En attente admin',
    validationFiscale: {
      statut: 'EnAttenteAdmin',
      commentaire: 'Facture soumise par l entreprise pour controle fiscal simule.',
      erreurs: []
    }
  },
  {
    id: 'admin-demo-003',
    entrepriseId: 'demo-entreprise-03',
    numero: 'FAC-TEIF-2026-003',
    entrepriseNom: 'Medina Export SA',
    clientNom: 'Groupe Atlas Retail',
    clientEmail: 'ap@atlas-retail.tn',
    dateEmission: '2026-05-12T08:45:00Z',
    totalTTC: 42780.250,
    statut: 'Conforme',
    xmlGenere: true,
    hashIntegrite: 'SIM-SHA256-AF13-003-TEIF',
    versionTeif: 'TEIF v1.8.8',
    signatureStatut: 'Signee',
    echangeStatut: 'Pret TTN'
  },
  {
    id: 'admin-demo-004',
    entrepriseId: 'demo-entreprise-04',
    numero: 'FAC-TEIF-2026-004',
    entrepriseNom: 'Sfax Industrie Plus',
    clientNom: 'Office Equipement Tunisie',
    clientEmail: 'factures@office-equipement.tn',
    dateEmission: '2026-05-10T14:10:00Z',
    totalTTC: 12500.000,
    statut: 'Transmise',
    xmlGenere: true,
    hashIntegrite: 'SIM-SHA256-41DD-004-TEIF',
    versionTeif: 'TEIF v1.8.8',
    signatureStatut: 'Signee',
    echangeStatut: 'Transmise simulation',
    validationFiscale: {
      statut: 'Transmise',
      reference: 'SIM-TTN-20260510-004',
      commentaire: 'Transmission TTN simulee acceptee par le workflow admin.',
      erreurs: []
    }
  },
  {
    id: 'admin-demo-005',
    entrepriseId: 'demo-entreprise-05',
    numero: 'FAC-TEIF-2026-005',
    entrepriseNom: 'Bizerte Cloud Factory',
    clientNom: 'Hotel Jasmin Palace',
    clientEmail: 'finance@jasmin-palace.tn',
    dateEmission: '2026-05-08T16:25:00Z',
    totalTTC: 0,
    statut: 'Rejetee',
    xmlGenere: false,
    signatureStatut: 'A signer',
    echangeStatut: 'Non transmise',
    validationFiscale: {
      statut: 'Rejetee',
      commentaire: 'Champs fiscaux incomplets avant transmission.',
      erreurs: ['Montant TTC invalide', 'XML TEIF manquant']
    }
  }
];

@Component({
  selector: 'app-admin-factures',
  standalone: true,
  imports: [CommonModule, FormsModule, DecimalPipe, DatePipe],
  templateUrl: './admin-factures.component.html',
  styleUrls: ['./admin-factures.component.scss']
})
export class AdminFacturesComponent implements OnInit {
  factures: AdminFacture[] = [];
  filtered: AdminFacture[] = [];

  q = '';
  statutFilter = '';

  stats = signal({
    total: 0,
    payees: 0,
    retard: 0,
    brouillon: 0,
    totalTtc: 0,
    conformes: 0,
    aValider: 0,
    transmises: 0
  });
  loadingAction = signal<string | null>(null);
  toast = signal<{ type: 'success' | 'error'; message: string } | null>(null);
  xmlModal = signal<AdminXmlResponse | null>(null);
  scenarioDemo = signal(false);

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.load();
  }

  load() {
    this.http.get<AdminFacture[]>(`${API}/admin/factures`).subscribe({
      next: res => {
        this.factures = res.length ? res : this.demoRows();
        this.scenarioDemo.set(!res.length);
        this.filter();
      },
      error: () => {
        this.factures = this.demoRows();
        this.scenarioDemo.set(true);
        this.filter();
      },
    });
  }

  filter() {
    const query = this.q.toLowerCase();
    const list = query
      ? this.factures.filter(f =>
          (f.numero || '').toLowerCase().includes(query) ||
          (f.entrepriseNom || '').toLowerCase().includes(query) ||
          (f.clientNom || '').toLowerCase().includes(query)
        )
      : [...this.factures];

    this.filtered = this.statutFilter
      ? list.filter(f => f.statut === this.statutFilter)
      : list;

    const total = this.filtered.length;
    const payees = this.filtered.filter(f => (f.statut ?? '').toLowerCase().includes('pay')).length;
    const retard = this.filtered.filter(f => (f.statut ?? '').toLowerCase().includes('retard')).length;
    const brouillon = this.filtered.filter(f => (f.statut ?? '').toLowerCase().includes('brouillon')).length;
    const conformes = this.filtered.filter(f => ['Conforme', 'Transmise', 'Acceptee'].includes(f.statut)).length;
    const aValider = this.filtered.filter(f => f.statut === 'EnAttenteAdmin').length;
    const transmises = this.filtered.filter(f => ['Transmise', 'Acceptee'].includes(f.statut)).length;
    const totalTtc = this.filtered.reduce((s, f) => s + (f.totalTTC ?? 0), 0);
    this.stats.set({ total, payees, retard, brouillon, totalTtc, conformes, aValider, transmises });
  }

  getBadge(statut: string) {
    const map: Record<string, string> = {
      Payee: 'badge--ok',
      Payée: 'badge--ok',
      Brouillon: 'badge--neutral',
      Emise: 'badge--info',
      Émise: 'badge--info',
      Validee: 'badge--info',
      EnAttenteAdmin: 'badge--warn',
      Conforme: 'badge--ok',
      Transmise: 'badge--tuniflow',
      Acceptee: 'badge--ok',
      Rejetee: 'badge--err',
      EnAttente: 'badge--warn',
      EnRetard: 'badge--err',
      Retard: 'badge--err',
      Annulee: 'badge--neutral',
      Annulée: 'badge--neutral'
    };
    return map[statut] || 'badge--neutral';
  }

  actionKey(f: AdminFacture, action: string) {
    return `${f.id}:${action}`;
  }

  isLoading(f: AdminFacture, action: string) {
    return this.loadingAction() === this.actionKey(f, action);
  }

  voirXml(f: AdminFacture) {
    this.loadingAction.set(this.actionKey(f, 'xml'));
    this.toast.set(null);

    if (this.isDemoFacture(f)) {
      const xml = this.buildDemoXml(f);
      this.updateDemoFacture(f.id, {
        xmlGenere: true,
        hashIntegrite: xml.hashIntegrite,
        versionTeif: xml.versionTeif
      });
      this.xmlModal.set(xml);
      this.loadingAction.set(null);
      return;
    }

    this.http.get<AdminXmlResponse>(`${API}/admin/factures/${f.id}/xml`).subscribe({
      next: xml => {
        this.xmlModal.set(xml);
        this.loadingAction.set(null);
        this.load();
      },
      error: err => this.fail(err, 'Impossible de generer ou afficher le XML.')
    });
  }

  validerV0(f: AdminFacture) {
    this.loadingAction.set(this.actionKey(f, 'v0'));
    this.toast.set(null);

    if (this.isDemoFacture(f)) {
      if (f.statut === 'Brouillon') {
        this.fail(null, 'La facture doit etre finalisee cote entreprise avant validation admin v0.');
        return;
      }

      this.updateDemoFacture(f.id, {
        statut: 'Conforme',
        xmlGenere: true,
        hashIntegrite: f.hashIntegrite || `SIM-SHA256-${f.id.toUpperCase()}`,
        versionTeif: f.versionTeif || 'TEIF v1.8.8',
        signatureStatut: f.signatureStatut || 'A signer',
        echangeStatut: 'Pret TTN',
        validationFiscale: {
          statut: 'Conforme',
          commentaire: 'Champs obligatoires et XML TEIF controles en simulation.',
          erreurs: []
        }
      });
      this.loadingAction.set(null);
      this.toast.set({ type: 'success', message: 'Facture validee v0 dans le scenario demo.' });
      return;
    }

    this.http.post<any>(`${API}/admin/factures/${f.id}/valider-v0`, {}).subscribe({
      next: res => {
        this.toast.set({ type: 'success', message: res?.message || 'Facture validee v0.' });
        this.loadingAction.set(null);
        this.load();
      },
      error: err => this.fail(err, 'Validation v0 impossible.')
    });
  }

  envoyerTtn(f: AdminFacture) {
    this.loadingAction.set(this.actionKey(f, 'ttn'));
    this.toast.set(null);

    if (this.isDemoFacture(f)) {
      if (f.statut !== 'Conforme') {
        this.fail(null, 'La facture doit etre conforme v0 avant l envoi TTN.');
        return;
      }

      this.updateDemoFacture(f.id, {
        statut: 'Transmise',
        signatureStatut: 'Signee',
        echangeStatut: 'Transmise simulation',
        validationFiscale: {
          statut: 'Transmise',
          reference: `SIM-TTN-${Date.now()}`,
          commentaire: 'Facture signee puis envoyee a TTN simulation.',
          erreurs: []
        }
      });
      this.loadingAction.set(null);
      this.toast.set({ type: 'success', message: 'Facture signee puis envoyee a TTN simulation.' });
      return;
    }

    this.http.post<any>(`${API}/admin/factures/${f.id}/envoyer-ttn`, {}).subscribe({
      next: res => {
        this.toast.set({ type: 'success', message: res?.message || 'Facture envoyee a TTN simulation.' });
        this.loadingAction.set(null);
        this.load();
      },
      error: err => this.fail(err, 'Envoi TTN simulation impossible.')
    });
  }

  validerTransmissionFiscale(f: AdminFacture) {
    this.loadingAction.set(this.actionKey(f, 'fiscal-ok'));
    this.toast.set(null);

    if (this.isDemoFacture(f)) {
      const erreurs = this.checklist(f).filter(item => !item.ok).map(item => item.label);
      if (erreurs.length) {
        this.updateDemoFacture(f.id, {
          statut: 'Rejetee',
          echangeStatut: 'Non transmise',
          validationFiscale: {
            statut: 'Rejetee',
            commentaire: 'Controle admin refuse en simulation.',
            erreurs
          }
        });
        this.loadingAction.set(null);
        this.toast.set({ type: 'error', message: `Facture rejetee: ${erreurs.join(', ')}.` });
        return;
      }

      this.updateDemoFacture(f.id, {
        statut: 'Transmise',
        signatureStatut: 'Signee',
        echangeStatut: 'Transmise simulation',
        validationFiscale: {
          statut: 'Transmise',
          reference: `SIM-TTN-${Date.now()}`,
          commentaire: 'Admin a marque la facture transmise en simulation.',
          erreurs: []
        }
      });
      this.loadingAction.set(null);
      this.toast.set({ type: 'success', message: 'Facture marquee transmise dans le scenario demo.' });
      return;
    }

    this.http.post<any>(`${API}/admin/factures/${f.id}/validation-fiscale/accepter`, {}).subscribe({
      next: res => {
        this.toast.set({ type: 'success', message: res?.message || 'Facture marquee transmise.' });
        this.loadingAction.set(null);
        this.load();
      },
      error: err => this.fail(err, 'Validation fiscale impossible.')
    });
  }

  rejeterTransmissionFiscale(f: AdminFacture) {
    this.loadingAction.set(this.actionKey(f, 'fiscal-reject'));
    this.toast.set(null);

    if (this.isDemoFacture(f)) {
      this.updateDemoFacture(f.id, {
        statut: 'Rejetee',
        echangeStatut: 'Non transmise',
        validationFiscale: {
          statut: 'Rejetee',
          commentaire: 'Champs fiscaux a corriger avant transmission.',
          erreurs: ['Champs fiscaux a corriger avant transmission.']
        }
      });
      this.loadingAction.set(null);
      this.toast.set({ type: 'success', message: 'Facture rejetee pour correction dans le scenario demo.' });
      return;
    }

    this.http.post<any>(`${API}/admin/factures/${f.id}/validation-fiscale/rejeter`, {
      motif: 'Champs fiscaux a corriger avant transmission.'
    }).subscribe({
      next: res => {
        this.toast.set({ type: 'success', message: res?.message || 'Facture rejetee pour correction.' });
        this.loadingAction.set(null);
        this.load();
      },
      error: err => this.fail(err, 'Rejet fiscal impossible.')
    });
  }

  checklist(f: AdminFacture): Array<{ label: string; ok: boolean }> {
    return [
      { label: 'Numero facture', ok: !!f.numero },
      { label: 'Entreprise', ok: !!f.entrepriseNom },
      { label: 'Client', ok: !!f.clientNom },
      { label: 'Montant TTC', ok: Number(f.totalTTC) > 0 },
      { label: 'XML TEIF', ok: !!f.xmlGenere }
    ];
  }

  fermerXml() {
    this.xmlModal.set(null);
  }

  private fail(err: any, fallback: string) {
    const detail = err?.error?.message || err?.error?.detail || fallback;
    this.toast.set({ type: 'error', message: detail });
    this.loadingAction.set(null);
  }

  private demoRows() {
    return SCENARIO_FACTURES.map(f => ({
      ...f,
      validationFiscale: f.validationFiscale ? { ...f.validationFiscale, erreurs: [...(f.validationFiscale.erreurs ?? [])] } : undefined
    }));
  }

  private isDemoFacture(f: AdminFacture) {
    return f.id.startsWith('admin-demo-');
  }

  private updateDemoFacture(id: string, patch: Partial<AdminFacture>) {
    this.factures = this.factures.map(f => f.id === id ? { ...f, ...patch } : f);
    this.filter();
  }

  private buildDemoXml(f: AdminFacture): AdminXmlResponse {
    const hash = f.hashIntegrite || `SIM-SHA256-${f.id.toUpperCase()}`;
    const version = f.versionTeif || 'TEIF v1.8.8';
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<TEIFInvoice version="${version}">
  <Header>
    <InvoiceNumber>${f.numero}</InvoiceNumber>
    <IssueDate>${f.dateEmission.slice(0, 10)}</IssueDate>
    <Currency>TND</Currency>
  </Header>
  <Seller>
    <Name>${f.entrepriseNom}</Name>
    <TaxIdentifier>MF-SIM-${f.entrepriseId.slice(-2).toUpperCase()}</TaxIdentifier>
  </Seller>
  <Buyer>
    <Name>${f.clientNom}</Name>
    <Email>${f.clientEmail || 'client@example.tn'}</Email>
  </Buyer>
  <Totals>
    <TaxInclusiveAmount>${Number(f.totalTTC || 0).toFixed(3)}</TaxInclusiveAmount>
  </Totals>
  <AdminValidation>
    <Status>${f.statut}</Status>
    <Hash>${hash}</Hash>
  </AdminValidation>
</TEIFInvoice>`;

    return {
      factureId: f.id,
      numero: f.numero,
      xmlContent: xml,
      hashIntegrite: hash,
      versionTeif: version,
      genereA: new Date().toISOString()
    };
  }
}
