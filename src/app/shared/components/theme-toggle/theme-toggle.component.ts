
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService } from '../../../core/services/theme.service';

@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      class="theme-toggle"
      [class.is-dark]="theme.isDark()"
      type="button"
      (click)="theme.toggle()"
      [attr.aria-label]="theme.isDark() ? 'Passer en mode clair' : 'Passer en mode sombre'"
      [attr.title]="theme.isDark() ? 'Mode clair' : 'Mode sombre'"
    >
      <span class="track">

        <!-- Icone soleil (visible en mode clair, côté gauche de la track) -->
        <span class="icon sun" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="4"/>
            <line x1="12" y1="2"  x2="12" y2="5"/>
            <line x1="12" y1="19" x2="12" y2="22"/>
            <line x1="4.22"  y1="4.22"  x2="6.34"  y2="6.34"/>
            <line x1="17.66" y1="17.66" x2="19.78" y2="19.78"/>
            <line x1="2"  y1="12" x2="5"  y2="12"/>
            <line x1="19" y1="12" x2="22" y2="12"/>
            <line x1="4.22"  y1="19.78" x2="6.34"  y2="17.66"/>
            <line x1="17.66" y1="6.34"  x2="19.78" y2="4.22"/>
          </svg>
        </span>

        <!-- Icone lune (visible en mode sombre, côté droit de la track) -->
        <span class="icon moon" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
          </svg>
        </span>

        <!-- Thumb — contient l'icône active centrée -->
        <span class="thumb">
          <span class="thumb-icon thumb-sun" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="4"/>
              <line x1="12" y1="2"  x2="12" y2="5"/>
              <line x1="12" y1="19" x2="12" y2="22"/>
              <line x1="4.22"  y1="4.22"  x2="6.34"  y2="6.34"/>
              <line x1="17.66" y1="17.66" x2="19.78" y2="19.78"/>
              <line x1="2"  y1="12" x2="5"  y2="12"/>
              <line x1="19" y1="12" x2="22" y2="12"/>
              <line x1="4.22"  y1="19.78" x2="6.34"  y2="17.66"/>
              <line x1="17.66" y1="6.34"  x2="19.78" y2="4.22"/>
            </svg>
          </span>
          <span class="thumb-icon thumb-moon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          </span>
        </span>

      </span>
    </button>
  `,
  styles: [`
    .theme-toggle {
      --track-w:    74px;
      --track-h:    32px;
      --thumb-size: calc(var(--track-h) - 8px);
      --pad:        4px;

      border:      none;
      background:  none;
      padding:     0;
      cursor:      pointer;
      flex-shrink: 0;
      outline:     none;
      display:     inline-block;
    }

    
    .track {
      position:      relative;
      width:         var(--track-w);
      height:        var(--track-h);
      border-radius: var(--track-h);
      background:    #f2f4f7;
      border:        1px solid rgba(0,0,0,.08);
      display:       flex;
      align-items:   center;
      justify-content: space-between;
      padding:       0 10px;
      box-sizing:    border-box;
      transition:    background 220ms cubic-bezier(.16,1,.3,1),
                     border-color 220ms cubic-bezier(.16,1,.3,1);
    }

    
    .icon {
      display:         flex;
      align-items:     center;
      justify-content: center;
      width:           14px;
      height:          14px;
      flex-shrink:     0;
      z-index:         0;
      pointer-events:  none;
      transition:      color 200ms, opacity 200ms;
    }
    .icon svg {
      width:        14px;
      height:       14px;
      display:      block;
      stroke:       currentColor;
      stroke-width: 2;
      fill:         none;
    }

    
    .thumb {
      position:      absolute;
      top:           var(--pad);
      left:          var(--pad);
      width:         var(--thumb-size);
      height:        var(--thumb-size);
      border-radius: 50%;
      background:    #ffffff;
      box-shadow:    0 2px 8px rgba(0,0,0,.18);
      display:       flex;
      align-items:   center;
      justify-content: center;
      transition:    left 220ms cubic-bezier(.16,1,.3,1),
                     background 200ms,
                     box-shadow 200ms;
      z-index:       2;
    }

    
    .thumb-icon {
      position:        absolute;
      inset:           0;
      display:         flex;
      align-items:     center;
      justify-content: center;
      transition:      opacity 180ms, transform 180ms;
    }
    .thumb-icon svg {
      width:        14px;
      height:       14px;
      stroke:       currentColor;
      stroke-width: 2;
      fill:         none;
      display:      block;
    }

    
    .theme-toggle:not(.is-dark) .track {
      background:   #f2f4f7;
      border-color: rgba(0,0,0,.08);
    }
    .theme-toggle:not(.is-dark) .thumb {
      left:       var(--pad);
      background: #ffffff;
      box-shadow: 0 2px 10px rgba(0,0,0,.18);
    }

    
    .theme-toggle:not(.is-dark) .icon.sun  { color: #ffb400; opacity: .5; }
    .theme-toggle:not(.is-dark) .icon.moon { color: rgba(0,0,0,.30); opacity: .4; }

    
    .theme-toggle:not(.is-dark) .thumb-sun  { color: #ffb400; opacity: 1;  transform: scale(1);    }
    .theme-toggle:not(.is-dark) .thumb-moon { color: #ffb400; opacity: 0;  transform: scale(.6);   }

    
    .theme-toggle.is-dark .track {
      background:   #0F172A;
      border-color: rgba(255,255,255,.12);
    }
    .theme-toggle.is-dark .thumb {
      left:       calc(var(--track-w) - var(--thumb-size) - var(--pad) - 2px);
      background: #1e293b;
      box-shadow: 0 2px 10px rgba(0,0,0,.4);
    }

    
    .theme-toggle.is-dark .icon.sun  { color: rgba(255,255,255,.35); opacity: .5; }
    .theme-toggle.is-dark .icon.moon { color: #FFE600; opacity: .5; }

    
    .theme-toggle.is-dark .thumb-sun  { color: #FFE600; opacity: 0;  transform: scale(.6);   }
    .theme-toggle.is-dark .thumb-moon { color: #FFE600; opacity: 1;  transform: scale(1);    }

    
    .theme-toggle:focus-visible .track {
      box-shadow: 0 0 0 3px rgba(255,230,0,.35);
    }
  `]
})
export class ThemeToggleComponent {
  theme = inject(ThemeService);
}