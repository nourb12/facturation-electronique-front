import { CommonModule } from '@angular/common';
import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { LanguageService } from '../../../core/services/language.service';
import { AppLang } from '../../../core/i18n/i18n.constants';

interface LangOption {
  code: AppLang;
  label: string;
  flagSrc: string;
}

@Component({
  selector: 'app-language-switcher',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="lang" [class.open]="open()" (click)="$event.stopPropagation()">
      <button
        type="button"
        class="lang-btn"
        [attr.aria-expanded]="open()"
        aria-haspopup="menu"
        (click)="toggle()"
      >
        <img class="flag" [src]="current().flagSrc" [alt]="current().label" />
        <span class="chev" aria-hidden="true">▾</span>
        <span class="sr-only">Language</span>
      </button>

      <div class="menu" *ngIf="open()" role="menu" aria-label="Language">
        <button
          type="button"
          role="menuitemradio"
          class="item"
          *ngFor="let opt of options"
          [class.active]="opt.code === current().code"
          [attr.aria-checked]="opt.code === current().code"
          (click)="select(opt.code)"
        >
          <img class="flag" [src]="opt.flagSrc" [alt]="opt.label" />
          <span class="label">{{ opt.label }}</span>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .sr-only {
      position:absolute; width:1px; height:1px; padding:0; margin:-1px;
      overflow:hidden; clip:rect(0,0,0,0); white-space:nowrap; border:0;
    }

    .lang { position: relative; display: inline-flex; align-items: center; }

    .lang-btn {
      height: 38px;
      min-width: 44px;
      padding: 0 10px;
      border-radius: 999px;
      border: 1px solid rgba(0,0,0,.10);
      background: rgba(255,255,255,.8);
      backdrop-filter: blur(10px);
      display: inline-flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      transition: background var(--t-fast), box-shadow var(--t-fast), border-color var(--t-fast);
    }

    :root[data-theme="light"] .lang-btn {
      border-color: rgba(0,0,0,.10);
      background: rgba(255,255,255,.9);
    }

    :root:not([data-theme="light"]) .lang-btn {
      border-color: rgba(255,255,255,.14);
      background: rgba(15,23,42,.55);
    }

    .lang-btn:hover {
      border-color: rgba(17,24,39,.12);
      background: rgba(255,255,255,.96);
    }

    .lang-btn:focus-visible {
      outline: none;
      box-shadow: 0 0 0 3px rgba(17,24,39,.08);
      border-color: rgba(17,24,39,.18);
    }

    .flag {
      width: 18px;
      height: 12px;
      border-radius: 3px;
      box-shadow: 0 0 0 1px rgba(0,0,0,.10);
      object-fit: cover;
      flex: 0 0 auto;
    }

    .chev {
      font-size: 12px;
      opacity: .75;
      margin-top: 1px;
      color: var(--ts, #6B7280);
    }

    .menu {
      position: absolute;
      top: calc(100% + 10px);
      right: 0;
      width: 220px;
      border-radius: 16px;
      padding: 10px;
      background: rgba(255,255,255,.95);
      border: 1px solid rgba(0,0,0,.10);
      box-shadow: 0 18px 60px rgba(0,0,0,.18);
      backdrop-filter: blur(14px);
      z-index: 50;
      animation: pop 180ms cubic-bezier(.16,1,.3,1);
    }

    :root:not([data-theme="light"]) .menu {
      background: rgba(15,23,42,.85);
      border-color: rgba(255,255,255,.12);
      box-shadow: 0 18px 60px rgba(0,0,0,.45);
    }

    @keyframes pop {
      from { opacity: 0; transform: translateY(-6px) scale(.98); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }

    .item {
      width: 100%;
      border: 0;
      background: transparent;
      border-radius: 12px;
      padding: 10px 12px;
      display: flex;
      align-items: center;
      gap: 12px;
      cursor: pointer;
      transition: background var(--t-fast), box-shadow var(--t-fast);
      text-align: left;
    }

    .item:hover {
      background: rgba(15,23,42,.04);
    }

    .item.active {
      background: rgba(15,23,42,.05);
      box-shadow: inset 0 0 0 1px rgba(15,23,42,.08);
    }

    .label {
      font-size: 13px;
      font-weight: 500;
      color: var(--ts, #6B7280);
    }

    :root:not([data-theme="light"]) .label {
      color: rgba(255,255,255,.92);
    }

    :root:not([data-theme="light"]) .item:hover {
      background: rgba(255,255,255,.06);
    }

    :root:not([data-theme="light"]) .item.active {
      background: rgba(255,255,255,.07);
      box-shadow: inset 0 0 0 1px rgba(255,255,255,.10);
    }
  `]
})
export class LanguageSwitcherComponent {
  private readonly lang = inject(LanguageService);

  readonly open = signal(false);

  readonly options: LangOption[] = [
    { code: 'en', label: 'English',  flagSrc: './assets/flags/us.svg' },
    { code: 'fr', label: 'Français', flagSrc: './assets/flags/fr.svg' },
    { code: 'ar', label: 'العربية',  flagSrc: './assets/flags/tn.svg' },
  ];

  readonly current = computed(() => {
    const code = this.lang.current();
    return this.options.find(o => o.code === code) ?? this.options[1];
  });

  toggle(): void {
    this.open.update(v => !v);
  }

  async select(code: AppLang): Promise<void> {
    this.open.set(false);
    await this.lang.switchLang(code);
  }

  @HostListener('document:click')
  onDocClick(): void {
    this.open.set(false);
  }
}

