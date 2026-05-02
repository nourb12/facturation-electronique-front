import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

interface DemoRequest {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  phone?: string;
  message?: string;
  preferredDate: string;
  preferredTime: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  createdAt: string;
}

@Component({
  selector: 'app-admin-demo-requests',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-demo-requests.component.html',
  styleUrls: ['./admin-demo-requests.component.scss']
})
export class AdminDemoRequestsComponent implements OnInit {
  private http = inject(HttpClient);
  
  loading = signal(true);
  requests = signal<DemoRequest[]>([]);
  selectedRequest = signal<DemoRequest | null>(null);
  
  // Filtres
  searchTerm = signal('');
  statusFilter = signal<string>('all');
  
  // Statistiques
  stats = computed(() => {
    const reqs = this.requests();
    return {
      total: reqs.length,
      pending: reqs.filter(r => r.status === 'pending').length,
      confirmed: reqs.filter(r => r.status === 'confirmed').length,
      completed: reqs.filter(r => r.status === 'completed').length,
      cancelled: reqs.filter(r => r.status === 'cancelled').length
    };
  });
  
  // Requêtes filtrées
  filteredRequests = computed(() => {
    let reqs = this.requests();
    
    // Filtre par statut
    if (this.statusFilter() !== 'all') {
      reqs = reqs.filter(r => r.status === this.statusFilter());
    }
    
    // Filtre par recherche
    const term = this.searchTerm().toLowerCase();
    if (term) {
      reqs = reqs.filter(r => 
        r.firstName.toLowerCase().includes(term) ||
        r.lastName.toLowerCase().includes(term) ||
        r.email.toLowerCase().includes(term) ||
        r.company.toLowerCase().includes(term)
      );
    }
    
    // Tri par date (plus récent en premier)
    return reqs.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  });

  ngOnInit() {
    this.loadRequests();
  }

  loadRequests() {
    this.loading.set(true);
    this.http.get<DemoRequest[]>(`${environment.apiUrl}/demo/requests`)
      .subscribe({
        next: (data) => {
          this.requests.set(data);
          this.loading.set(false);
        },
        error: (err) => {
          console.error('Erreur lors du chargement des demandes:', err);
          this.loading.set(false);
          // Données de démo pour le développement
          this.requests.set([
            {
              id: '3c8f9eb6-8f8b-4b2f-b32e-7e6f4ae1f001',
              firstName: 'Ahmed',
              lastName: 'Ben Salem',
              email: 'ahmed.bensalem@example.com',
              company: 'TechCorp Tunisia',
              phone: '+216 20 123 456',
              message: 'Intéressé par une démo complète de la plateforme',
              preferredDate: '2026-05-15',
              preferredTime: '10:00',
              status: 'pending',
              createdAt: '2026-04-29T14:30:00'
            },
            {
              id: '3c8f9eb6-8f8b-4b2f-b32e-7e6f4ae1f002',
              firstName: 'Fatma',
              lastName: 'Trabelsi',
              email: 'f.trabelsi@innovate.tn',
              company: 'Innovate Solutions',
              phone: '+216 98 765 432',
              message: 'Besoin d\'une présentation pour notre équipe comptable',
              preferredDate: '2026-05-10',
              preferredTime: '14:00',
              status: 'confirmed',
              createdAt: '2026-04-28T09:15:00'
            },
            {
              id: '3c8f9eb6-8f8b-4b2f-b32e-7e6f4ae1f003',
              firstName: 'Mohamed',
              lastName: 'Gharbi',
              email: 'mohamed.gharbi@startup.tn',
              company: 'StartUp Innovante',
              phone: '+216 55 444 333',
              preferredDate: '2026-05-05',
              preferredTime: '11:00',
              status: 'completed',
              createdAt: '2026-04-20T16:45:00'
            }
          ]);
        }
      });
  }

  updateStatus(request: DemoRequest, newStatus: DemoRequest['status']) {
    this.http.patch(`${environment.apiUrl}/demo/requests/${request.id}/status`, { status: newStatus })
      .subscribe({
        next: () => {
          // Mettre à jour localement
          this.requests.update(reqs => 
            reqs.map(r => r.id === request.id ? { ...r, status: newStatus } : r)
          );
          this.selectedRequest.set(null);
        },
        error: (err) => {
          console.error('Erreur lors de la mise à jour:', err);
          alert('Erreur lors de la mise à jour du statut');
        }
      });
  }

  viewDetails(request: DemoRequest) {
    this.selectedRequest.set(request);
  }

  closeModal() {
    this.selectedRequest.set(null);
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      pending: 'En attente',
      confirmed: 'Confirmée',
      completed: 'Terminée',
      cancelled: 'Annulée'
    };
    return labels[status] || status;
  }

  getStatusClass(status: string): string {
    const classes: Record<string, string> = {
      pending: 'badge--warn',
      confirmed: 'badge--info',
      completed: 'badge--ok',
      cancelled: 'badge--err'
    };
    return classes[status] || '';
  }

  getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      pending: 'warn',
      confirmed: 'info',
      completed: 'ok',
      cancelled: 'err'
    };
    return colors[status] || '';
  }

  getInitials(firstName: string, lastName: string): string {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(date);
  }

  formatDateTime(dateStr: string): string {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  exportToCSV() {
    const reqs = this.filteredRequests();
    const headers = ['ID', 'Prénom', 'Nom', 'Email', 'Entreprise', 'Téléphone', 'Date souhaitée', 'Heure', 'Statut', 'Date de demande'];
    const rows = reqs.map(r => [
      r.id,
      r.firstName,
      r.lastName,
      r.email,
      r.company,
      r.phone || '',
      r.preferredDate,
      r.preferredTime,
      this.getStatusLabel(r.status),
      this.formatDateTime(r.createdAt)
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `demandes-demo-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  }
}
