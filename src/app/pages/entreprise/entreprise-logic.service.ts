import { Injectable } from '@angular/core';

export type TeifLevel = 'critique' | 'partiel' | 'conforme';

export interface TeifMeta {
  score: number;
  level: TeifLevel;
  label: string;
  message: string;
  color: string;
  recommendations: string[];
}

@Injectable({ providedIn: 'root' })
export class EntrepriseLogicService {
  private activiteLabels: Record<string, string> = {
    '6201Z': 'Programmation informatique',
    '6920Z': 'Comptabilite et audit',
    '6910Z': 'Activites juridiques',
    '4711A': 'Commerce de detail alimentaire',
    '4120A': 'Construction de batiments'
  };

  getActiviteLabel(code: string): string {
    if (!code) return '';
    return this.activiteLabels[code] ?? 'Activite non referencee';
  }

  detectFormeSuggestion(raison: string, forme: string): string | null {
    const upper = (raison ?? '').toUpperCase();
    const candidates = ['SARL', 'SA', 'SUARL', 'SAS', 'SNC'];
    const found = candidates.find(c => upper.includes(c));
    if (found && found !== forme) return `Entreprise detectee : ${found}`;
    return null;
  }

  validateRequired(value: any, label: string): string {
    if (value === undefined || value === null) return `${label} requis`;
    if (typeof value === 'string' && value.trim().length === 0) return `${label} requis`;
    return '';
  }

  validateEmail(value: string): string {
    if (!value || !value.trim()) return 'Email requis';
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
    return ok ? '' : 'Email invalide';
  }

  validateTelephone(value: string): string {
    if (!value || !value.trim()) return 'Telephone requis';
    const cleaned = value.replace(/\s/g, '');
    const ok = /^\+?\d{8,15}$/.test(cleaned);
    return ok ? '' : 'Numero invalide';
  }

  validateMatriculeFiscal(value: string): string {
    if (!value || !value.trim()) return 'Matricule fiscal requis';
    const raw = value.trim().toUpperCase();
    const normalized = raw.replace(/[^A-Z0-9]/g, '');
    const ok = /^[0-9]{7}[A-Z]([A-Z]{2}[0-9]{3})?$/.test(normalized);
    return ok ? '' : 'Format attendu: 1495908/S ou 1234567A/B/M/000';
  }

  computeTeifMeta(items: { key: string; label: string }[], entreprise: any): TeifMeta {
    const total = items.length || 1;
    const ok = items.filter(i => !!entreprise?.[i.key]).length;
    const score = Math.round((ok / total) * 100);

    let level: TeifLevel = 'critique';
    if (score >= 80) level = 'conforme';
    else if (score >= 50) level = 'partiel';

    const labelMap: Record<TeifLevel, string> = {
      critique: 'Critique',
      partiel: 'Partiel',
      conforme: 'Conforme'
    };
    const messageMap: Record<TeifLevel, string> = {
      critique: 'Votre conformite TEIF est critique',
      partiel: 'Votre conformite TEIF est partielle',
      conforme: 'Votre conformite TEIF est conforme'
    };
    const colorMap: Record<TeifLevel, string> = {
      critique: '#EF4444',
      partiel: '#FFE600',
      conforme: '#22C55E'
    };

    const recMap: Record<string, string> = {
      teifSignature: 'Activez la signature numerique DGI',
      teifArchivage: 'Configurez l archivage legal 10 ans',
      teifHorodatage: 'Completez l horodatage pour atteindre la conformite',
      teifSandbox: 'Validez un envoi TEIF en pre-production',
      teifSurveille: 'Activez les alertes de rejet TEIF'
    };

    const recommendations = items
      .filter(i => !entreprise?.[i.key])
      .map(i => recMap[i.key] ?? `Completez ${i.label}`)
      .slice(0, 3);

    return {
      score,
      level,
      label: labelMap[level],
      message: messageMap[level],
      color: colorMap[level],
      recommendations
    };
  }
}
