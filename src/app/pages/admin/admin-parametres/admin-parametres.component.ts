import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-admin-parametres',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-parametres.component.html',
  styleUrls: ['./admin-parametres.component.scss']
})
export class AdminParametresComponent {
  save() {}
}
