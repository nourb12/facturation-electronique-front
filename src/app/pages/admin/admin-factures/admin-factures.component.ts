import { Component, OnInit, signal } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

const API = environment.apiUrl;

interface AdminFacture {
  numero: string;
  entrepriseNom: string;
  clientNom: string;
  dateEmission: string;
  totalTTC: number;
  statut: string;
}

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

  stats = signal({ total: 0, payees: 0, retard: 0, brouillon: 0, totalTtc: 0 });

  constructor(private http: HttpClient) {}

  ngOnInit() { this.load(); }

  load() {
    this.http.get<AdminFacture[]>(`${API}/admin/factures`).subscribe({
      next: res => { this.factures = res; this.filter(); }
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
    const totalTtc = this.filtered.reduce((s, f) => s + (f.totalTTC ?? 0), 0);
    this.stats.set({ total, payees, retard, brouillon, totalTtc });
  }

  getBadge(statut: string) {
    const map: Record<string, string> = {
      'Payée': 'badge-green', 'Payee': 'badge-green',
      'Brouillon': 'badge-gray',
      'Émise': 'badge-blue', 'Emise': 'badge-blue',
      'EnAttente': 'badge-ey',
      'EnRetard': 'badge-red', 'Retard': 'badge-red',
      'Annulée': 'badge-gray', 'Annulee': 'badge-gray'
    };
    return 'badge ' + (map[statut] || 'badge-gray');
  }
}