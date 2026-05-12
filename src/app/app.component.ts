import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from './core/services/theme.service';
import { ToastComponent } from './shared/components/toast.component';
import { ConfirmationModalComponent } from './shared/components/confirmation-modal/confirmation-modal.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastComponent, ConfirmationModalComponent],
  templateUrl: './app.component.html'
})
export class AppComponent {
  constructor(private theme: ThemeService) {}
}
