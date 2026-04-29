
import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { trigger, transition, style, animate } from '@angular/animations';
import { ClientService, ClientDto, CreerClientRequest } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';

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

  loadClients() {
    this.loading.set(true);
    this.clientSvc.lister(this.page(), this.parPage).subscribe({
      next: res => {
        this.clients.set(res.items);
        this.total.set(res.total);
        this.loading.set(false);
        this.updateFilterCounts();
      },
      error: () => this.loading.set(false)
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


