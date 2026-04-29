
import { Injectable, signal, effect } from '@angular/core';

export type Theme = 'dark' | 'light';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly STORAGE_KEY = 'ey-theme';

  theme = signal<Theme>(this.getSavedTheme());

  constructor() {

    this.applyTheme(this.theme());

    effect(() => {
      const t = this.theme();
      this.applyTheme(t);
      localStorage.setItem(this.STORAGE_KEY, t);
    });
  }

  toggle(): void {
    this.theme.set(this.theme() === 'dark' ? 'light' : 'dark');
  }

  set(theme: Theme): void {
    this.theme.set(theme);
  }

  isDark(): boolean {
    return this.theme() === 'dark';
  }

  private getSavedTheme(): Theme {
    const saved = localStorage.getItem(this.STORAGE_KEY) as Theme;
    if (saved === 'dark' || saved === 'light') return saved;
    const prefersLight = window.matchMedia?.('(prefers-color-scheme: light)').matches;
    return prefersLight ? 'light' : 'dark';
  }

  private applyTheme(theme: Theme) {
    document.documentElement.dataset['theme'] = theme;
  }
}
