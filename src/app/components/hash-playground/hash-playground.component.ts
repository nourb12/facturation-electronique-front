/**
 * 🎮 PLAYGROUND INTERACTIF POUR TESTER LE HASHAGE
 * 
 * Composant Angular pour visualiser le hashage en temps réel
 */

import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-hash-playground',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="hash-playground">
      <div class="hp-header">
        <h2 class="hp-title">🔐 Playground de <em>Hashage</em></h2>
        <p class="hp-subtitle">Testez le hashage SHA-256 en temps réel</p>
      </div>

      <!-- Zone de saisie -->
      <div class="hp-section">
        <label class="hp-label">Entrez votre texte</label>
        <textarea 
          class="hp-textarea" 
          [(ngModel)]="inputText"
          (ngModelChange)="onTextChange()"
          placeholder="Exemple : Facture N°2025-001 - Montant: 1500.000 TND"
          rows="4"
        ></textarea>
        <div class="hp-stats">
          <span>{{ inputText.length }} caractères</span>
          <span>{{ inputText.split(' ').filter(w => w).length }} mots</span>
        </div>
      </div>

      <!-- Résultat du hash -->
      <div class="hp-section">
        <label class="hp-label">Hash SHA-256</label>
        <div class="hp-hash-result">
          <code class="hp-hash">{{ hash() || 'Entrez du texte pour voir le hash...' }}</code>
          <button 
            class="hp-copy-btn" 
            (click)="copierHash()"
            [disabled]="!hash()"
            title="Copier le hash"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="4" y="4" width="8" height="8" rx="1" stroke="currentColor" stroke-width="1.3"/>
              <path d="M2 10V2h8" stroke="currentColor" stroke-width="1.3"/>
            </svg>
          </button>
        </div>
        <div class="hp-hash-info">
          <span>Longueur : {{ hash()?.length || 0 }} caractères</span>
          <span>Algorithme : SHA-256</span>
        </div>
      </div>

      <!-- Comparaison -->
      <div class="hp-section">
        <div class="hp-section-header">
          <label class="hp-label">Comparaison (détection de modification)</label>
          <button class="hp-btn-small" (click)="activerComparaison()">
            {{ modeComparaison() ? 'Désactiver' : 'Activer' }}
          </button>
        </div>

        @if (modeComparaison()) {
          <div class="hp-comparison">
            <div class="hp-comp-col">
              <div class="hp-comp-label">Texte Original</div>
              <textarea 
                class="hp-textarea hp-textarea--small" 
                [(ngModel)]="texteOriginal"
                (ngModelChange)="onTexteOriginalChange()"
                rows="3"
              ></textarea>
              <code class="hp-hash-mini">{{ hashOriginal() }}</code>
            </div>

            <div class="hp-comp-arrow">
              @if (hashsIdentiques()) {
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <circle cx="16" cy="16" r="14" stroke="#22C55E" stroke-width="2"/>
                  <path d="M10 16l4 4 8-8" stroke="#22C55E" stroke-width="2" stroke-linecap="round"/>
                </svg>
              } @else {
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <circle cx="16" cy="16" r="14" stroke="#EF4444" stroke-width="2"/>
                  <path d="M12 12l8 8M20 12l-8 8" stroke="#EF4444" stroke-width="2" stroke-linecap="round"/>
                </svg>
              }
            </div>

            <div class="hp-comp-col">
              <div class="hp-comp-label">Texte Modifié</div>
              <textarea 
                class="hp-textarea hp-textarea--small" 
                [(ngModel)]="texteModifie"
                (ngModelChange)="onTexteModifieChange()"
                rows="3"
              ></textarea>
              <code class="hp-hash-mini">{{ hashModifie() }}</code>
            </div>
          </div>

          <div class="hp-result" [class.hp-result--ok]="hashsIdentiques()" [class.hp-result--err]="!hashsIdentiques()">
            @if (hashsIdentiques()) {
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8l4 4 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
              <span>✅ Hash identiques - Documents identiques</span>
            } @else {
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
              <span>❌ Hash différents - Documents modifiés</span>
            }
          </div>
        }
      </div>

      <!-- Exemples prédéfinis -->
      <div class="hp-section">
        <label class="hp-label">Exemples prédéfinis</label>
        <div class="hp-examples">
          <button class="hp-example-btn" (click)="chargerExemple('facture')">
            📄 Facture
          </button>
          <button class="hp-example-btn" (click)="chargerExemple('client')">
            👤 Client
          </button>
          <button class="hp-example-btn" (click)="chargerExemple('paiement')">
            💳 Paiement
          </button>
          <button class="hp-example-btn" (click)="chargerExemple('json')">
            📋 JSON
          </button>
        </div>
      </div>

      <!-- Informations pédagogiques -->
      <div class="hp-info">
        <div class="hp-info-title">💡 Comment ça marche ?</div>
        <ul class="hp-info-list">
          <li><strong>Déterministe :</strong> Le même texte produit toujours le même hash</li>
          <li><strong>Unique :</strong> Deux textes différents produisent des hash différents</li>
          <li><strong>Irréversible :</strong> Impossible de retrouver le texte à partir du hash</li>
          <li><strong>Sensible :</strong> Un seul caractère modifié change complètement le hash</li>
          <li><strong>Rapide :</strong> Le calcul est instantané même pour de gros fichiers</li>
        </ul>
      </div>
    </div>
  `,
  styles: [`
    .hash-playground {
      max-width: 1000px;
      margin: 0 auto;
      padding: 24px;
    }

    .hp-header {
      text-align: center;
      margin-bottom: 32px;
    }

    .hp-title {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 2rem;
      font-weight: 900;
      color: var(--tp);
      margin: 0 0 8px;
      em {
        color: var(--c-tuniflow);
        font-style: italic;
      }
    }

    .hp-subtitle {
      font-size: 14px;
      color: var(--ts);
      margin: 0;
    }

    .hp-section {
      background: var(--bg-card);
      border: 1px solid var(--b1);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 16px;
    }

    .hp-section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    .hp-label {
      display: block;
      font-size: 11px;
      font-weight: 700;
      color: var(--ts);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      margin-bottom: 8px;
    }

    .hp-textarea {
      width: 100%;
      padding: 12px;
      background: var(--input-bg);
      border: 1px solid var(--input-border);
      border-radius: 8px;
      color: var(--input-text);
      font-family: 'DM Sans', sans-serif;
      font-size: 13px;
      resize: vertical;
      outline: none;
      transition: border 0.15s;
      &:focus {
        border-color: var(--c-tuniflow);
        box-shadow: 0 0 0 3px rgba(var(--c-tuniflow-rgb), 0.1);
      }
      &--small {
        font-size: 12px;
        padding: 10px;
      }
    }

    .hp-stats {
      display: flex;
      gap: 16px;
      margin-top: 8px;
      font-size: 11px;
      color: var(--ts);
    }

    .hp-hash-result {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px;
      background: var(--bg-surf);
      border: 1px solid var(--b1);
      border-radius: 8px;
    }

    .hp-hash {
      flex: 1;
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      color: var(--c-tuniflow);
      word-break: break-all;
      line-height: 1.6;
    }

    .hp-copy-btn {
      width: 32px;
      height: 32px;
      border-radius: 6px;
      border: 1px solid var(--b1);
      background: var(--bg-card);
      color: var(--ts);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s;
      flex-shrink: 0;
      &:hover:not(:disabled) {
        background: var(--b0);
        color: var(--tp);
      }
      &:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }
    }

    .hp-hash-info {
      display: flex;
      gap: 16px;
      margin-top: 8px;
      font-size: 10px;
      color: var(--ts);
    }

    .hp-comparison {
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      gap: 16px;
      align-items: center;
    }

    .hp-comp-col {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .hp-comp-label {
      font-size: 10px;
      font-weight: 700;
      color: var(--ts);
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }

    .hp-hash-mini {
      font-family: 'JetBrains Mono', monospace;
      font-size: 9px;
      color: var(--c-tuniflow);
      background: rgba(var(--c-tuniflow-rgb), 0.08);
      padding: 6px 8px;
      border-radius: 4px;
      word-break: break-all;
      line-height: 1.4;
    }

    .hp-comp-arrow {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .hp-result {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      margin-top: 12px;
      &--ok {
        background: rgba(34, 197, 94, 0.1);
        color: #22C55E;
      }
      &--err {
        background: rgba(239, 68, 68, 0.1);
        color: #EF4444;
      }
    }

    .hp-examples {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .hp-example-btn {
      padding: 8px 14px;
      background: var(--bg-surf);
      border: 1px solid var(--b1);
      border-radius: 8px;
      color: var(--tp);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s;
      &:hover {
        background: var(--b0);
        border-color: var(--c-tuniflow);
      }
    }

    .hp-btn-small {
      padding: 6px 12px;
      background: rgba(var(--c-tuniflow-rgb), 0.1);
      border: 1px solid rgba(var(--c-tuniflow-rgb), 0.2);
      border-radius: 6px;
      color: var(--c-tuniflow);
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s;
      &:hover {
        background: rgba(var(--c-tuniflow-rgb), 0.15);
      }
    }

    .hp-info {
      background: rgba(var(--c-tuniflow-rgb), 0.05);
      border: 1px solid rgba(var(--c-tuniflow-rgb), 0.2);
      border-radius: 12px;
      padding: 16px;
    }

    .hp-info-title {
      font-size: 13px;
      font-weight: 700;
      color: var(--tp);
      margin-bottom: 12px;
    }

    .hp-info-list {
      margin: 0;
      padding-left: 20px;
      li {
        font-size: 12px;
        color: var(--ts);
        line-height: 1.8;
        strong {
          color: var(--tp);
        }
      }
    }

    @media (max-width: 768px) {
      .hp-comparison {
        grid-template-columns: 1fr;
        .hp-comp-arrow {
          transform: rotate(90deg);
        }
      }
    }
  `]
})
export class HashPlaygroundComponent {
  inputText = '';
  hash = signal<string>('');

  modeComparaison = signal(false);
  texteOriginal = '';
  texteModifie = '';
  hashOriginal = signal<string>('');
  hashModifie = signal<string>('');

  hashsIdentiques = computed(() => 
    this.hashOriginal() && this.hashModifie() && 
    this.hashOriginal() === this.hashModifie()
  );

  async onTextChange() {
    if (!this.inputText) {
      this.hash.set('');
      return;
    }
    const hashValue = await this.calculateHash(this.inputText);
    this.hash.set(hashValue);
  }

  async onTexteOriginalChange() {
    const hashValue = await this.calculateHash(this.texteOriginal);
    this.hashOriginal.set(hashValue);
  }

  async onTexteModifieChange() {
    const hashValue = await this.calculateHash(this.texteModifie);
    this.hashModifie.set(hashValue);
  }

  async calculateHash(text: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  copierHash() {
    if (this.hash()) {
      navigator.clipboard.writeText(this.hash());
      // Vous pouvez ajouter un toast ici
      console.log('Hash copié !');
    }
  }

  activerComparaison() {
    this.modeComparaison.update(v => !v);
    if (this.modeComparaison()) {
      this.texteOriginal = this.inputText;
      this.texteModifie = this.inputText;
      this.onTexteOriginalChange();
      this.onTexteModifieChange();
    }
  }

  chargerExemple(type: string) {
    const exemples: Record<string, string> = {
      facture: 'Facture N°2025-001\nClient: ACME Corporation\nMontant: 1500.000 TND\nDate: 02/05/2025',
      client: 'Nom: ACME Corporation\nMatricule Fiscal: 1234567/A/M/000\nAdresse: Avenue Habib Bourguiba, Tunis\nTéléphone: +216 71 123 456',
      paiement: 'Paiement N°PAY-2025-001\nFacture: FAC-2025-001\nMontant: 1500.000 TND\nMode: Virement\nDate: 02/05/2025',
      json: JSON.stringify({
        numero: 'FAC-2025-001',
        client: 'ACME Corporation',
        montantTTC: 1500.000,
        devise: 'TND',
        dateEmission: '2025-05-02'
      }, null, 2)
    };

    this.inputText = exemples[type] || '';
    this.onTextChange();
  }
}
