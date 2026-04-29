import { Component, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

const API = environment.apiUrl;

interface AuditLog {
  date: string;
  utilisateur: string;
  action: string;
  ressource: string;
  ip: string;
  succes: boolean;
}

@Component({
  selector: 'app-admin-audit',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  templateUrl: './admin-audit.component.html',
  styleUrls: ['./admin-audit.component.scss']
})
export class AdminAuditComponent implements OnInit {
  logs = signal<AuditLog[]>([]);
  filtered: AuditLog[] = [];
  q = '';

  constructor(private http: HttpClient) {}

  ngOnInit() { this.load(); }

  load() {
    this.http.get<AuditLog[]>(`${API}/admin/audit`).subscribe({
      next: d => { this.logs.set(d); this.filter(); }
    });
  }

  filter() {
    const query = this.q.toLowerCase();
    this.filtered = query
      ? this.logs().filter(l =>
          (l.utilisateur || '').toLowerCase().includes(query) ||
          (l.action || '').toLowerCase().includes(query) ||
          (l.ressource || '').toLowerCase().includes(query)
        )
      : [...this.logs()];
  }

  exportCsv() {
    const header = ['Date', 'Utilisateur', 'Action', 'Ressource', 'IP', 'Statut'];
    const rows = this.filtered.map(l => [
      l.date, l.utilisateur, l.action, l.ressource, l.ip,
      l.succes ? 'OK' : 'Erreur'
    ]);
    const csv = [header, ...rows].map(r => r.join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'audit_log.csv'; a.click();
    URL.revokeObjectURL(url);
  }
}