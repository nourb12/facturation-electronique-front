import {Component, OnInit, signal, computed, inject, PLATFORM_ID, HostListener} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormsModule, NgForm } from '@angular/forms';
import { environment } from '../../../environments/environment';
import { ThemeToggleComponent } from '../../shared/components/theme-toggle/theme-toggle.component';
import { LanguageSwitcherComponent } from '../../shared/components/language-switcher/language-switcher.component';
import { TranslateModule } from '@ngx-translate/core';

export interface TimeSlot {
  time: string;
  available: boolean;
}

export interface CalendarDay {
  date: Date;
  dayNum: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isPast: boolean;
  isWeekend: boolean;
}

export interface BookingForm {
  prenom: string;
  nom: string;
  email: string;
  entreprise: string;
  telephone: string;
  message: string;
}

@Component({
  selector: 'app-demo-booking',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, ThemeToggleComponent, LanguageSwitcherComponent, TranslateModule],
  templateUrl: './demo-booking.component.html',
  styleUrls: ['./demo-booking.component.scss']
})
export class DemoBookingComponent implements OnInit {
  private platformId = inject(PLATFORM_ID);
  private router = inject(Router);

  // Navbar scroll state
  scrolled = false;

  @HostListener('window:scroll')
  onWindowScroll() {
    if (isPlatformBrowser(this.platformId)) {
      this.scrolled = window.scrollY > 20;
    }
  }

  // Steps: 1 = calendar, 2 = form, 3 = confirmation
  currentStep = signal(1);

  // Calendar state
  currentMonth = signal(new Date());
  selectedDate = signal<Date | null>(null);
  selectedSlot = signal<string | null>(null);

  // Form state
  isSubmitting = signal(false);
  submissionError = signal<string | null>(null);

  bookingForm: BookingForm = {
    prenom: '',
    nom: '',
    email: '',
    entreprise: '',
    telephone: '',
    message: ''
  };

  // Computed calendar days
  calendarDays = computed(() => {
    const month = this.currentMonth();
    const year = month.getFullYear();
    const monthIdx = month.getMonth();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const firstDay = new Date(year, monthIdx, 1);
    const lastDay = new Date(year, monthIdx + 1, 0);

    // Start from Monday
    let startDow = firstDay.getDay(); // 0=Sun
    startDow = startDow === 0 ? 6 : startDow - 1; // convert to Mon=0

    const days: CalendarDay[] = [];

    // Prev month fill
    for (let i = startDow - 1; i >= 0; i--) {
      const d = new Date(year, monthIdx, -i);
      days.push(this.makeDay(d, false, today));
    }

    // Current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const d = new Date(year, monthIdx, i);
      days.push(this.makeDay(d, true, today));
    }

    // Next month fill to complete grid
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, monthIdx + 1, i);
      days.push(this.makeDay(d, false, today));
    }

    return days;
  });

  timeSlots = computed((): TimeSlot[] => {
    const date = this.selectedDate();
    if (!date) return [];

    // Generate slots 09:00 - 17:30 by 30min
    const slots: TimeSlot[] = [];
    for (let h = 9; h <= 17; h++) {
      for (const m of [0, 30]) {
        if (h === 17 && m === 30) continue;
        const time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        // Simulate some unavailable slots (deterministic based on date+time)
        const seed = (date.getDate() * 7 + h * 3 + m) % 5;
        slots.push({ time, available: seed !== 0 });
      }
    }
    return slots;
  });

  monthLabel = computed(() => {
    const d = this.currentMonth();
    return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  });

  selectedDateLabel = computed(() => {
    const d = this.selectedDate();
    if (!d) return null;
    return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  });

  weekdays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  private makeDay(date: Date, isCurrentMonth: boolean, today: Date): CalendarDay {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const todayCopy = new Date(today);
    todayCopy.setHours(0, 0, 0, 0);
    
    return {
      date,
      dayNum: date.getDate(),
      isCurrentMonth,
      isToday: d.getTime() === todayCopy.getTime(),
      isPast: d < todayCopy,
      isWeekend: date.getDay() === 0 || date.getDay() === 6
    };
  }

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    // Set initial month to current
    const now = new Date();
    this.currentMonth.set(new Date(now.getFullYear(), now.getMonth(), 1));
  }

  prevMonth(): void {
    const m = this.currentMonth();
    this.currentMonth.set(new Date(m.getFullYear(), m.getMonth() - 1, 1));
    this.selectedDate.set(null);
    this.selectedSlot.set(null);
  }

  nextMonth(): void {
    const m = this.currentMonth();
    this.currentMonth.set(new Date(m.getFullYear(), m.getMonth() + 1, 1));
    this.selectedDate.set(null);
    this.selectedSlot.set(null);
  }

  selectDay(day: CalendarDay): void {
    // Allow selection of current month days that are not weekends
    // Remove the isPast check to allow booking for any future date
    if (!day.isCurrentMonth || day.isWeekend) return;
    this.selectedDate.set(day.date);
    this.selectedSlot.set(null);
  }

  selectSlot(slot: TimeSlot): void {
    if (!slot.available) return;
    this.selectedSlot.set(slot.time);
  }

  proceedToForm(): void {
    if (this.selectedDate() && this.selectedSlot()) {
      this.currentStep.set(2);
    }
  }

  backToCalendar(): void {
    this.currentStep.set(1);
  }

  isSelectedDay(day: CalendarDay): boolean {
    const sel = this.selectedDate();
    if (!sel) return false;
    return sel.toDateString() === day.date.toDateString();
  }

  async submitBooking(form: NgForm): Promise<void> {
    if (form.invalid) return;

    this.isSubmitting.set(true);
    this.submissionError.set(null);

    const payload = {
      prenom: this.bookingForm.prenom,
      nom: this.bookingForm.nom,
      email: this.bookingForm.email,
      entreprise: this.bookingForm.entreprise,
      telephone: this.bookingForm.telephone,
      message: this.bookingForm.message,
      date: this.selectedDate()?.toISOString(),
      heure: this.selectedSlot(),
    };

    try {
      // POST to backend endpoint
      const res = await fetch(`${environment.apiUrl}/demo/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error('Erreur serveur');
      }

      this.currentStep.set(3);
    } catch (err) {
      this.submissionError.set('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  bookAnother(): void {
    this.currentStep.set(1);
    this.selectedDate.set(null);
    this.selectedSlot.set(null);
    this.bookingForm = { prenom: '', nom: '', email: '', entreprise: '', telephone: '', message: '' };
  }
}
