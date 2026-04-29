import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

const API = environment.apiUrl;

interface AdminEntreprise {
  id: string;
  raisonSociale: string;
  matriculeFiscal: string;
  ville: string;
  nbUtilisateurs: number;
  nbFactures: number;
  estActive: boolean;
}

@Component({
  selector: 'app-admin-entreprises',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-entreprises.component.html',
  styleUrls: ['./admin-entreprises.component.scss']
})
export class AdminEntreprisesComponent implements OnInit {

  entreprises = signal<AdminEntreprise[]>([]);
  filtered: AdminEntreprise[] = [];
  q = '';
  stats = signal({ total: 0, actives: 0, suspendues: 0, utilisateurs: 0, factures: 0 });

  constructor(private http: HttpClient) {}

  ngOnInit() { this.load(); }

  load() {
    this.http.get<AdminEntreprise[]>(`${API}/admin/entreprises`).subscribe({
      next: d => { this.entreprises.set(d); this.filter(); }
    });
  }

  filter() {
    const query = this.q.toLowerCase();
    this.filtered = query
      ? this.entreprises().filter(e => (e.raisonSociale || '').toLowerCase().includes(query))
      : [...this.entreprises()];

    const total = this.filtered.length;
    const actives = this.filtered.filter(e => e.estActive).length;
    const suspendues = total - actives;
    const utilisateurs = this.filtered.reduce((s, e) => s + (e.nbUtilisateurs ?? 0), 0);
    const factures = this.filtered.reduce((s, e) => s + (e.nbFactures ?? 0), 0);
    this.stats.set({ total, actives, suspendues, utilisateurs, factures });
  }

  toggle(e: AdminEntreprise) {
    this.http.patch(`${API}/admin/entreprises/${e.id}/statut`, { estActive: !e.estActive })
      .subscribe({ next: () => this.load() });
  }
}
