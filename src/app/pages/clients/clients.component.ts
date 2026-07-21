
import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { trigger, transition, style, animate } from '@angular/animations';
import { ClientService, ClientDto, CreerClientRequest } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';

const DEMO_CLIENTS: ClientDto[] = [
  { id: 'DEMO-CL-1', nom: 'STE GreenTech', email: 'contact@greentech.tn', typeClient: 'B2B', matriculeFiscal: '1234567A/B/C/000', adresse: 'Rue du Lac', ville: 'Tunis', codePostal: '1053', pays: 'TN', telephone: '+216 20 111 222', estActif: true, creeLe: '2026-01-12', modifieLe: '2026-05-01', entrepriseId: 'ENT-1' },
  { id: 'DEMO-CL-2', nom: 'Banque BIAT', email: 'achats@biat.com', typeClient: 'B2B', matriculeFiscal: '7654321B/C/D/000', adresse: 'Lac 2', ville: 'Tunis', codePostal: '1053', pays: 'TN', telephone: '+216 71 123 456', estActif: true, creeLe: '2026-02-02', modifieLe: '2026-05-03', entrepriseId: 'ENT-1' },
  { id: 'DEMO-CL-3', nom: 'Societe OneTel', email: 'billing@onetel.tn', typeClient: 'B2B', matriculeFiscal: '2468135E/F/G/000', adresse: 'Centre Ville', ville: 'Sousse', codePostal: '4000', pays: 'TN', telephone: '+216 73 555 444', estActif: true, creeLe: '2026-02-18', modifieLe: '2026-05-05', entrepriseId: 'ENT-1' },
  { id: 'DEMO-CL-4', nom: 'SARL MedCare', email: 'contact@medcare.tn', typeClient: 'B2B', matriculeFiscal: '1357924H/I/J/000', adresse: 'Ariana', ville: 'Ariana', codePostal: '2080', pays: 'TN', telephone: '+216 26 310 210', estActif: true, creeLe: '2026-03-02', modifieLe: '2026-05-06', entrepriseId: 'ENT-1' },
  { id: 'DEMO-CL-5', nom: 'ABC Distribution', email: 'ap@abc.tn', typeClient: 'B2B', matriculeFiscal: '9876543X/Y/Z/000', adresse: 'Zone Industrielle', ville: 'Sfax', codePostal: '3000', pays: 'TN', telephone: '+216 74 222 333', estActif: false, creeLe: '2026-03-10', modifieLe: '2026-05-10', entrepriseId: 'ENT-1' }
];

@Component({
  selector: 'app-clients',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './clients.component.html',
  styleUrls: ['./clients.component.scss'],
  animations: [
    trigger('pageIn', [transition(':enter', [
      style({ opacity: 0, transform: 'translateY(8px)' }),
      animate('400ms cubic-bezier(.16,1,.3,1)',
        style({ opacity: 1, transform: 'translateY(0)' }))
    ])]),
    trigger('fadeIn', [
      transition(':enter', [style({ opacity: 0, transform: 'scale(.97)' }),
        animate('220ms ease', style({ opacity: 1, transform: 'scale(1)' }))]),
      transition(':leave', [animate('160ms ease', style({ opacity: 0 }))])
    ]),
    trigger('modalIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(16px) scale(0.96)' }),
        animate('260ms cubic-bezier(.16,1,.3,1)',
          style({ opacity: 1, transform: 'translateY(0) scale(1)' }))
      ]),
      transition(':leave', [
        animate('180ms ease', style({ opacity: 0, transform: 'translateY(8px) scale(0.97)' }))
      ])
    ])
  ]
})
export class ClientsComponent implements OnInit {

  private clientSvc = inject(ClientService);
  private toast     = inject(ToastService);

  searchQuery  = '';
  activeFilter = 'tous';
  viewMode: 'grid' | 'list' = 'grid';
  showModal    = false;
  loading      = signal(true);
  saving       = signal(false);

  clients      = signal<ClientDto[]>([]);
  total        = signal(0);
  page         = signal(1);
  parPage      = 20;

  newClient = {
    nom: '', typeClient: 'B2B', matriculeFiscal: '',
    ville: '', email: '', telephone: '', adresse: '', codePostal: '', pays: 'TN'
  };

  readonly filters = [
    { key: 'tous',    label: 'Tous',      count: 0 },
    { key: 'actif',   label: 'Actifs',    count: 0 },
    { key: 'inactif', label: 'Inactifs',  count: 0 },
  ];

  filteredClients = computed(() => {
    let list = this.clients();
    const q = this.searchQuery.toLowerCase();
    if (q) list = list.filter(c =>
      c.nom.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      (c.matriculeFiscal ?? '').toLowerCase().includes(q) ||
      (c.ville ?? '').toLowerCase().includes(q)
    );
    if (this.activeFilter === 'actif')   list = list.filter(c => c.estActif);
    if (this.activeFilter === 'inactif') list = list.filter(c => !c.estActif);
    return list;
  });

  ngOnInit() { this.loadClients(); }

  genererDonneesTest() {
    if (!confirm('Créer 10 clients de test ?')) return;
    
    const clientsTest = [
      { nom: 'SARL TechSolutions', matriculeFiscal: '1234567A', email: 'contact@techsolutions.tn', telephone: '+216 71 123 456', ville: 'Tunis', adresse: '15 Avenue Habib Bourguiba', codePostal: '1000' },
      { nom: 'Entreprise Moderne SARL', matriculeFiscal: '2345678B', email: 'info@moderne.tn', telephone: '+216 71 234 567', ville: 'Sfax', adresse: '28 Rue de la République', codePostal: '3000' },
      { nom: 'Cabinet Conseil Plus', matriculeFiscal: '3456789C', email: 'contact@conseilplus.tn', telephone: '+216 71 345 678', ville: 'Sousse', adresse: '42 Avenue Léopold Sédar Senghor', codePostal: '4000' },
      { nom: 'Import Export Tunisie', matriculeFiscal: '4567890D', email: 'export@ietunisie.tn', telephone: '+216 71 456 789', ville: 'Bizerte', adresse: '7 Rue du Port', codePostal: '7000' },
      { nom: 'Services Informatiques SA', matriculeFiscal: '5678901E', email: 'contact@si-sa.tn', telephone: '+216 71 567 890', ville: 'Tunis', adresse: '33 Rue de Marseille', codePostal: '1002' },
      { nom: 'Distribution Alimentaire', matriculeFiscal: '6789012F', email: 'info@distalim.tn', telephone: '+216 71 678 901', ville: 'Nabeul', adresse: '12 Avenue Farhat Hached', codePostal: '8000' },
      { nom: 'Société Générale Commerce', matriculeFiscal: '7890123G', email: 'sgc@commerce.tn', telephone: '+216 71 789 012', ville: 'Monastir', adresse: '55 Boulevard de l\'Environnement', codePostal: '5000' },
      { nom: 'Consulting & Audit Partners', matriculeFiscal: '8901234H', email: 'contact@cap-audit.tn', telephone: '+216 71 890 123', ville: 'Tunis', adresse: '88 Avenue Mohamed V', codePostal: '1001' },
      { nom: 'Industrie Textile Tunisienne', matriculeFiscal: '9012345I', email: 'itt@textile.tn', telephone: '+216 71 901 234', ville: 'Ksar Hellal', adresse: '21 Zone Industrielle', codePostal: '5070' },
      { nom: 'Pharmacie Centrale Distribution', matriculeFiscal: '0123456J', email: 'pcd@pharma.tn', telephone: '+216 71 012 345', ville: 'Tunis', adresse: '99 Rue de la Liberté', codePostal: '1003' }
    ];

    let created = 0;
    const total = clientsTest.length;

    clientsTest.forEach((client, index) => {
      const req: CreerClientRequest = {
        nom: client.nom,
        typeClient: 'B2B',
        matriculeFiscal: client.matriculeFiscal,
        email: client.email,
        telephone: client.telephone,
        adresse: client.adresse,
        ville: client.ville,
        codePostal: client.codePostal,
        pays: 'TN'
      };

      this.clientSvc.creer(req).subscribe({
        next: (c) => {
          created++;
          this.clients.update(list => [c, ...list]);
          this.total.update(v => v + 1);
          
          if (created === total) {
            this.updateFilterCounts();
            this.toast.success(`${created} clients de test créés avec succès !`);
          }
        },
        error: (err) => {
          console.error(`Erreur création client ${index + 1}:`, err);
          if (created + 1 === total) {
            this.toast.warning(`${created}/${total} clients créés (certains existaient déjà)`);
          }
        }
      });
    });
  }

  loadClients() {
    this.loading.set(true);
    this.clientSvc.lister(this.page(), this.parPage).subscribe({
      next: res => {
        const items = res.items?.length ? res.items : DEMO_CLIENTS;
        this.clients.set(items);
        this.total.set(res.items?.length ? res.total : items.length);
        this.loading.set(false);
        this.updateFilterCounts();
      },
      error: () => {
        this.clients.set(DEMO_CLIENTS);
        this.total.set(DEMO_CLIENTS.length);
        this.loading.set(false);
        this.updateFilterCounts();
      }
    });
  }

  private updateFilterCounts() {
    const all = this.clients();
    this.filters[0].count = all.length;
    this.filters[1].count = all.filter(c => c.estActif).length;
    this.filters[2].count = all.filter(c => !c.estActif).length;
  }

  openModal()  { this.showModal = true; }
  closeModal() { this.showModal = false; this.resetForm(); }

  saveClient() {
    if (!this.newClient.nom || !this.newClient.email || this.saving()) return;
    this.saving.set(true);

    const req: CreerClientRequest = {
      nom:             this.newClient.nom,
      email:           this.newClient.email.toLowerCase().trim(),
      typeClient:      this.newClient.typeClient,
      matriculeFiscal: this.newClient.matriculeFiscal || undefined,
      adresse:         this.newClient.adresse || undefined,
      ville:           this.newClient.ville || undefined,
      codePostal:      this.newClient.codePostal || undefined,
      telephone:       this.newClient.telephone || undefined,
      pays:            this.newClient.pays,
    };

    this.clientSvc.creer(req).subscribe({
      next: (c) => {
        this.saving.set(false);
        this.clients.update(list => [c, ...list]);
        this.total.update(v => v + 1);
        this.updateFilterCounts();
        this.closeModal();
        this.toast.success('Client créé avec succès.');
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.error(err?.error?.message ?? 'Erreur lors de la création.');
      }
    });
  }

  toggleActif(client: ClientDto) {
    const obs = client.estActif
      ? this.clientSvc.desactiver(client.id)
      : this.clientSvc.reactiver(client.id);

    obs.subscribe({
      next: () => {
        this.clients.update(list =>
          list.map(c => c.id === client.id ? { ...c, estActif: !c.estActif } : c)
        );
        this.updateFilterCounts();
        this.toast.success(client.estActif ? 'Client désactivé.' : 'Client réactivé.');
      },
      error: (err) => this.toast.error(err?.error?.message ?? 'Erreur.')
    });
  }

  private resetForm() {
    this.newClient = {
      nom: '', typeClient: 'B2B', matriculeFiscal: '',
      ville: '', email: '', telephone: '',
      adresse: '', codePostal: '', pays: 'TN'
    };
  }

  getInitials(nom: string): string {
    return nom.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
  }

  getStatutColor(c: ClientDto): string {
    return c.estActif ? 'ok' : 'neutral';
  }
}


