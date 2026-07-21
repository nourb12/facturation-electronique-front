import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

type PaieView = 'dashboard' | 'employes' | 'fiches' | 'declarations' | 'paiements' | 'ecritures';
type FicheStatut = 'Brouillon' | 'Validee' | 'Payee';

interface EmployePaie {
  id: string;
  matricule: string;
  nom: string;
  poste: string;
  departement: string;
  cin: string;
  cnss: string;
  rib: string;
  salaireBase: number;
  prime: number;
  avantage: number;
  actif: boolean;
}

interface FichePaie {
  id: string;
  employeId: string;
  periode: string;
  statut: FicheStatut;
  jours: number;
  heuresSup: number;
  brut: number;
  cnssSalarie: number;
  irpp: number;
  avances: number;
  net: number;
  datePaiement?: string;
}

interface EcriturePaie {
  id: string;
  date: string;
  journal: string;
  compte: string;
  libelle: string;
  debit: number;
  credit: number;
}

const EMPLOYES: EmployePaie[] = [
  { id: 'EMP-1', matricule: 'EMP-0001', nom: 'Ines Trabelsi', poste: 'Responsable financier', departement: 'Finance', cin: '09876543', cnss: 'CNSS-48291', rib: 'TN59 1000 0000 0000 0001', salaireBase: 2800, prime: 450, avantage: 180, actif: true },
  { id: 'EMP-2', matricule: 'EMP-0002', nom: 'Nour Ben Ali', poste: 'Comptable senior', departement: 'Comptabilite', cin: '11223344', cnss: 'CNSS-48292', rib: 'TN59 1000 0000 0000 0002', salaireBase: 2100, prime: 260, avantage: 120, actif: true },
  { id: 'EMP-3', matricule: 'EMP-0003', nom: 'Sami Jebali', poste: 'Consultant TEIF', departement: 'Operations', cin: '22334455', cnss: 'CNSS-48293', rib: 'TN59 1000 0000 0000 0003', salaireBase: 2400, prime: 380, avantage: 150, actif: true },
  { id: 'EMP-4', matricule: 'EMP-0004', nom: 'Meriem Mansour', poste: 'Chargee support', departement: 'Support', cin: '33445566', cnss: 'CNSS-48294', rib: 'TN59 1000 0000 0000 0004', salaireBase: 1550, prime: 180, avantage: 80, actif: true },
  { id: 'EMP-5', matricule: 'EMP-0005', nom: 'Ahmed Gharbi', poste: 'Commercial B2B', departement: 'Ventes', cin: '44556677', cnss: 'CNSS-48295', rib: 'TN59 1000 0000 0000 0005', salaireBase: 1750, prime: 620, avantage: 110, actif: false }
];

@Component({
  selector: 'app-paie',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, DecimalPipe],
  templateUrl: './paie.component.html',
  styleUrls: ['./paie.component.scss']
})
export class PaieComponent {
  view = signal<PaieView>('dashboard');
  search = signal('');
  periode = signal('2026-05');
  selectedEmploye = signal('');

  employes = signal<EmployePaie[]>(EMPLOYES);
  fiches = signal<FichePaie[]>(EMPLOYES.map((e, index) => this.createFiche(e, index)));

  readonly views: Array<{ key: PaieView; label: string; icon: string }> = [
    { key: 'dashboard', label: 'Dashboard', icon: 'ti-layout-dashboard' },
    { key: 'employes', label: 'Employés', icon: 'ti-users' },
    { key: 'fiches', label: 'Fiches de paie', icon: 'ti-file-dollar' },
    { key: 'declarations', label: 'Déclarations', icon: 'ti-building-bank' },
    { key: 'paiements', label: 'Paiements', icon: 'ti-credit-card-pay' },
    { key: 'ecritures', label: 'Écritures', icon: 'ti-journal' }
  ];

  filteredEmployes = computed(() => {
    const q = this.search().trim().toLowerCase();
    const selected = this.selectedEmploye();
    return this.employes().filter(e => {
      const matchSearch = !q || [e.nom, e.matricule, e.poste, e.departement, e.cin, e.cnss]
        .some(v => v.toLowerCase().includes(q));
      const matchEmploye = !selected || e.id === selected;
      return matchSearch && matchEmploye;
    });
  });

  filteredFiches = computed(() => {
    const ids = new Set(this.filteredEmployes().map(e => e.id));
    return this.fiches().filter(f => f.periode === this.periode() && ids.has(f.employeId));
  });

  declarations = computed(() => {
    const fiches = this.filteredFiches();
    const brut = this.sum(fiches, 'brut');
    const cnss = this.sum(fiches, 'cnssSalarie');
    const irpp = this.sum(fiches, 'irpp');
    const net = this.sum(fiches, 'net');
    return [
      { code: 'CNSS', label: 'Cotisations CNSS salariés', montant: cnss, echeance: '15/06/2026', statut: 'À déclarer' },
      { code: 'IRPP', label: 'Retenue IRPP sur salaires', montant: irpp, echeance: '28/06/2026', statut: 'Préparé' },
      { code: 'PAY', label: 'Net à payer salariés', montant: net, echeance: '31/05/2026', statut: 'Paiement' },
      { code: 'BRUT', label: 'Masse salariale brute', montant: brut, echeance: 'Contrôle mensuel', statut: 'Référence' }
    ];
  });

  ecritures = computed<EcriturePaie[]>(() => {
    const fiches = this.filteredFiches();
    const brut = this.sum(fiches, 'brut');
    const cnss = this.sum(fiches, 'cnssSalarie');
    const irpp = this.sum(fiches, 'irpp');
    const net = this.sum(fiches, 'net');
    return [
      { id: 'PAY-ECR-1', date: `${this.periode()}-28`, journal: 'PAI', compte: '640000', libelle: 'Charges de personnel - salaires bruts', debit: brut, credit: 0 },
      { id: 'PAY-ECR-2', date: `${this.periode()}-28`, journal: 'PAI', compte: '432000', libelle: 'CNSS due sur salaires', debit: 0, credit: cnss },
      { id: 'PAY-ECR-3', date: `${this.periode()}-28`, journal: 'PAI', compte: '437000', libelle: 'Etat - IRPP salaires', debit: 0, credit: irpp },
      { id: 'PAY-ECR-4', date: `${this.periode()}-28`, journal: 'PAI', compte: '421000', libelle: 'Personnel remunerations dues', debit: 0, credit: net }
    ].filter(e => e.debit || e.credit);
  });

  summary = computed(() => {
    const fiches = this.filteredFiches();
    const brut = this.sum(fiches, 'brut');
    const net = this.sum(fiches, 'net');
    const cnss = this.sum(fiches, 'cnssSalarie');
    const irpp = this.sum(fiches, 'irpp');
    return {
      employes: this.filteredEmployes().filter(e => e.actif).length,
      fiches: fiches.length,
      brut,
      net,
      retenues: cnss + irpp,
      payees: fiches.filter(f => f.statut === 'Payee').length
    };
  });

  departmentStats = computed(() => {
    const rows = this.employes();
    const activeRows = rows.filter(e => e.actif);
    const total = Math.max(activeRows.length, 1);
    return ['Finance', 'Comptabilite', 'Operations', 'Support', 'Ventes']
      .map(name => {
        const members = rows.filter(e => e.departement === name);
        const active = members.filter(e => e.actif);
        const brut = members.reduce((acc, e) => acc + e.salaireBase + e.prime + e.avantage, 0);
        return {
          name,
          count: members.length,
          active: active.length,
          brut,
          percent: Math.round(active.length / total * 100)
        };
      })
      .filter(dept => dept.count > 0);
  });

  employeName(id: string): string {
    return this.employes().find(e => e.id === id)?.nom ?? '-';
  }

  employeById(id: string): EmployePaie | undefined {
    return this.employes().find(e => e.id === id);
  }

  deptCount(dept: string): number {
    return this.employes().filter(e => e.departement === dept).length;
  }

  statusLabel(statut: FicheStatut): string {
    if (statut === 'Validee') return 'Validée';
    if (statut === 'Payee') return 'Payée';
    return statut;
  }

  paymentProgress(): number {
    const total = this.summary().fiches;
    return total ? Math.round(this.summary().payees / total * 100) : 0;
  }

  draftCount(): number {
    return this.filteredFiches().filter(f => f.statut === 'Brouillon').length;
  }

  validatedCount(): number {
    return this.filteredFiches().filter(f => f.statut === 'Validee').length;
  }

  money(value: number): string {
    return new Intl.NumberFormat('fr-TN', {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3
    }).format(value || 0) + ' TND';
  }

  setView(view: PaieView): void {
    this.view.set(view);
  }

  generateFiches(): void {
    const existing = new Set(this.fiches().filter(f => f.periode === this.periode()).map(f => f.employeId));
    const next = this.employes()
      .filter(e => e.actif && !existing.has(e.id))
      .map((e, index) => this.createFiche(e, index + 10));
    if (next.length) this.fiches.update(list => [...next, ...list]);
  }

  validateFiche(id: string): void {
    this.fiches.update(list => list.map(f => f.id === id ? { ...f, statut: 'Validee' } : f));
  }

  validateAllDrafts(): void {
    this.fiches.update(list => list.map(f =>
      f.periode === this.periode() && f.statut === 'Brouillon'
        ? { ...f, statut: 'Validee' }
        : f
    ));
  }

  payFiche(id: string): void {
    this.fiches.update(list => list.map(f => f.id === id ? {
      ...f,
      statut: 'Payee',
      datePaiement: `${this.periode()}-30`
    } : f));
  }

  payAllValidated(): void {
    this.fiches.update(list => list.map(f =>
      f.periode === this.periode() && f.statut === 'Validee'
        ? { ...f, statut: 'Payee', datePaiement: `${this.periode()}-30` }
        : f
    ));
  }

  exportCsv(): void {
    const rows = this.filteredFiches().map(f => ({
      Periode: f.periode,
      Employe: this.employeName(f.employeId),
      Brut: f.brut,
      CNSS: f.cnssSalarie,
      IRPP: f.irpp,
      Avances: f.avances,
      Net: f.net,
      Statut: f.statut
    }));
    const headers = Object.keys(rows[0] ?? { Periode: '', Employe: '', Brut: '', Net: '', Statut: '' });
    const body = rows.map(row => headers.map(h => `"${String((row as any)[h] ?? '').replace(/"/g, '""')}"`).join(';'));
    const blob = new Blob([[headers.join(';'), ...body].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `paie-${this.periode()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  private createFiche(employe: EmployePaie, index: number): FichePaie {
    const brut = employe.salaireBase + employe.prime + employe.avantage + (index % 3) * 65;
    const cnssSalarie = +(brut * 0.0918).toFixed(3);
    const irpp = +(Math.max(0, brut - cnssSalarie - 600) * 0.12).toFixed(3);
    const avances = index % 4 === 0 ? 120 : 0;
    const net = +(brut - cnssSalarie - irpp - avances).toFixed(3);
    const statut: FicheStatut = index % 4 === 0 ? 'Brouillon' : index % 3 === 0 ? 'Validee' : 'Payee';
    return {
      id: `FPAIE-${employe.id}-${this.periode()}`,
      employeId: employe.id,
      periode: this.periode(),
      statut,
      jours: 26,
      heuresSup: index % 3 === 0 ? 4 : 0,
      brut,
      cnssSalarie,
      irpp,
      avances,
      net,
      datePaiement: statut === 'Payee' ? `${this.periode()}-30` : undefined
    };
  }

  private sum<T>(rows: T[], key: keyof T): number {
    return rows.reduce((acc, row) => acc + Number(row[key] ?? 0), 0);
  }
}
