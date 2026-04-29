









import { Component }        from '@angular/core';
import { CommonModule }     from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import {
  trigger, transition, style, animate, query, stagger
} from '@angular/animations';
import { TranslatePipe } from '@ngx-translate/core';
import { ThemeService } from '../../../core/services/theme.service';
import { LanguageSwitcherComponent } from '../../../shared/components/language-switcher/language-switcher.component';



const fadeUp = trigger('fadeUp', [
  transition(':enter', [
    style({ opacity: 0, transform: 'translateY(16px)', filter: 'blur(4px)' }),
    animate('440ms cubic-bezier(.16,1,.3,1)',
      style({ opacity: 1, transform: 'translateY(0)', filter: 'blur(0)' }))
  ])
]);


const staggerIn = trigger('staggerIn', [
  transition(':enter', [
    query('.rs-card', [
      style({ opacity: 0, transform: 'translateY(24px)', filter: 'blur(6px)' }),
      stagger(100, [
        animate('460ms cubic-bezier(.16,1,.3,1)',
          style({ opacity: 1, transform: 'translateY(0)', filter: 'blur(0)' }))
      ])
    ], { optional: true })
  ])
]);



@Component({
  selector:    'app-role-selection-page',
  standalone:  true,
  imports:     [CommonModule, RouterLink, TranslatePipe, LanguageSwitcherComponent],
  templateUrl: './role-selection-page.component.html',
  styleUrls:   ['./role-selection-page.component.scss'],
  animations:  [fadeUp, staggerIn]
})
export class RoleSelectionPageComponent {

  
  hoveredCard: 'entreprise' | 'financier' | null = null;

  constructor(private router: Router, private theme: ThemeService) {}


  selectEntreprise(): void {
    this.router.navigate(['/register']);
  }


  selectFinancier(): void {
    this.router.navigate(['/login/financier']);
  }

  toggleTheme(): void {
    this.theme.toggle();
  }
}
