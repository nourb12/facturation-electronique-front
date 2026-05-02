import {
  Component, OnInit, OnDestroy, signal,
  HostListener, ElementRef, NgZone, inject,
  PLATFORM_ID
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ThemeToggleComponent } from '../../shared/components/theme-toggle/theme-toggle.component';
import { LanguageSwitcherComponent } from '../../shared/components/language-switcher/language-switcher.component';

export interface Feature {
  title: string;
  tag: string;
  desc: string;
  detail: string;
}

export interface Stat {
  label: string;
  target: number | null;
  suffix: string;
  fixed: string;
  display: string;
}

export interface ScoreRow {
  key: string;
  pct: number;
  warn: boolean;
}

export interface ComplianceItem {
  label: string;
  done: boolean;
}

export interface WorkflowStep {
  num: number;
  title: string;
  desc: string;
  tag: string;
  icon: string;
}

export interface DiffItem {
  icon: string;
  title: string;
  desc: string;
}

export interface Audience {
  icon: string;
  title: string;
  desc: string;
  points: string[];
}

export interface SecurityItem {
  icon: string;
  label: string;
  desc: string;
}

export interface AuditLog {
  action: string;
  time: string;
  status: string;
  ok: boolean;
}

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterLink, ThemeToggleComponent, LanguageSwitcherComponent, TranslatePipe],
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.scss']
})
export class LandingComponent implements OnInit, OnDestroy {
  cursorX = 0;
  cursorY = 0;
  ringX = 0;
  ringY = 0;
  heroTypedWord = signal('');

  private rafId?: number;
  private mx = 0;
  private my = 0;
  private statsAnimated = false;
  private statsRafId?: number;
  private heroTimer?: number;
  private heroWordIndex = 0;
  private heroCharIndex = 0;
  private heroDeleting = false;
  private heroWords: string[] = [];
  private langChangeSub?: { unsubscribe(): void };
  private observers: IntersectionObserver[] = [];
  private platformId = inject(PLATFORM_ID);

  scrolled = signal(false);
  scoreAnimated = signal(false);
  complianceVisible = signal(false);
  activeYear = signal(new Date().getFullYear());
  selectedFeature = signal<Feature | null>(null);

  stats = signal<Stat[]>([
    { label: 'LANDING.STATS.ITEMS.TEIF_PROCESS', target: 100, suffix: '%', fixed: '100%', display: '0%' },
    { label: 'LANDING.STATS.ITEMS.DGI_TRANSMISSION', target: 2, suffix: 's', fixed: '< 2s', display: '0.0s' },
    { label: 'LANDING.STATS.ITEMS.UBL_VALID', target: null, suffix: '', fixed: 'UBL 2.1', display: 'UBL 2.1' },
    { label: 'LANDING.STATS.ITEMS.PLATFORM_UPTIME', target: 99.9, suffix: '%', fixed: '99.9%', display: '0%' }
  ]);

  features = signal<Feature[]>([
    {
      title: 'LANDING.FEATURES.ITEMS.KYC.TITLE',
      tag: 'LANDING.FEATURES.ITEMS.KYC.TAG',
      desc: 'LANDING.FEATURES.ITEMS.KYC.DESC',
      detail: 'LANDING.FEATURES.ITEMS.KYC.DETAIL'
    },
    {
      title: 'LANDING.FEATURES.ITEMS.SCORE.TITLE',
      tag: 'LANDING.FEATURES.ITEMS.SCORE.TAG',
      desc: 'LANDING.FEATURES.ITEMS.SCORE.DESC',
      detail: 'LANDING.FEATURES.ITEMS.SCORE.DETAIL'
    },
    {
      title: 'LANDING.FEATURES.ITEMS.UBL.TITLE',
      tag: 'LANDING.FEATURES.ITEMS.UBL.TAG',
      desc: 'LANDING.FEATURES.ITEMS.UBL.DESC',
      detail: 'LANDING.FEATURES.ITEMS.UBL.DETAIL'
    },
    {
      title: 'LANDING.FEATURES.ITEMS.API.TITLE',
      tag: 'LANDING.FEATURES.ITEMS.API.TAG',
      desc: 'LANDING.FEATURES.ITEMS.API.DESC',
      detail: 'LANDING.FEATURES.ITEMS.API.DETAIL'
    },
    {
      title: 'LANDING.FEATURES.ITEMS.SIGNATURE.TITLE',
      tag: 'LANDING.FEATURES.ITEMS.SIGNATURE.TAG',
      desc: 'LANDING.FEATURES.ITEMS.SIGNATURE.DESC',
      detail: 'LANDING.FEATURES.ITEMS.SIGNATURE.DETAIL'
    },
    {
      title: 'LANDING.FEATURES.ITEMS.AUDIT.TITLE',
      tag: 'LANDING.FEATURES.ITEMS.AUDIT.TAG',
      desc: 'LANDING.FEATURES.ITEMS.AUDIT.DESC',
      detail: 'LANDING.FEATURES.ITEMS.AUDIT.DETAIL'
    }
  ]);

  complianceItems = signal<ComplianceItem[]>([
    { label: 'LANDING.COMPLIANCE.ITEMS.UBL_VALID', done: true },
    { label: 'LANDING.COMPLIANCE.ITEMS.E_SIGNATURE', done: true },
    { label: 'LANDING.COMPLIANCE.ITEMS.DGI_AUTO', done: true },
    { label: 'LANDING.COMPLIANCE.ITEMS.ARCHIVE_10Y', done: true },
    { label: 'LANDING.COMPLIANCE.ITEMS.VAT_REPORT', done: true },
    { label: 'LANDING.COMPLIANCE.ITEMS.AUDIT_TRAIL', done: true },
    { label: 'LANDING.COMPLIANCE.ITEMS.AES', done: true },
    { label: 'LANDING.COMPLIANCE.ITEMS.KYC', done: true }
  ]);

  scoreRows = signal<ScoreRow[]>([
    { key: 'LANDING.COMPLIANCE.SCORE_ROWS.UBL', pct: 100, warn: false },
    { key: 'LANDING.COMPLIANCE.SCORE_ROWS.SIGNATURE', pct: 100, warn: false },
    { key: 'LANDING.COMPLIANCE.SCORE_ROWS.DGI', pct: 100, warn: false },
    { key: 'LANDING.COMPLIANCE.SCORE_ROWS.ARCHIVE', pct: 100, warn: false }
  ]);

  workflowSteps = signal<WorkflowStep[]>([
    {
      num: 1,
      title: 'LANDING.WORKFLOW.ITEMS.STEP1.TITLE',
      desc: 'LANDING.WORKFLOW.ITEMS.STEP1.DESC',
      tag: 'LANDING.WORKFLOW.ITEMS.STEP1.TAG',
      icon: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><rect x="2" y="2" width="18" height="18" rx="4" stroke="currentColor" stroke-width="1.5"/><path d="M11 7v8M7 11h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>'
    },
    {
      num: 2,
      title: 'LANDING.WORKFLOW.ITEMS.STEP2.TITLE',
      desc: 'LANDING.WORKFLOW.ITEMS.STEP2.DESC',
      tag: 'LANDING.WORKFLOW.ITEMS.STEP2.TAG',
      icon: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M11 2L3 6.5v5.5C3 16.6 6.5 20 11 20.5c4.5-.5 8-3.9 8-8.5V6.5L11 2z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M7.5 11l2.5 2.5 4.5-4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    },
    {
      num: 3,
      title: 'LANDING.WORKFLOW.ITEMS.STEP3.TITLE',
      desc: 'LANDING.WORKFLOW.ITEMS.STEP3.DESC',
      tag: 'LANDING.WORKFLOW.ITEMS.STEP3.TAG',
      icon: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><rect x="3" y="2" width="16" height="18" rx="3" stroke="currentColor" stroke-width="1.5"/><path d="M7 7h8M7 11h8M7 15h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>'
    },
    {
      num: 4,
      title: 'LANDING.WORKFLOW.ITEMS.STEP4.TITLE',
      desc: 'LANDING.WORKFLOW.ITEMS.STEP4.DESC',
      tag: 'LANDING.WORKFLOW.ITEMS.STEP4.TAG',
      icon: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><rect x="4" y="2" width="14" height="18" rx="3" stroke="currentColor" stroke-width="1.5"/><path d="M8 7h6M8 11h6M8 15h3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="16" cy="16" r="4" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M14.5 16l1 1 2-2" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    },
    {
      num: 5,
      title: 'LANDING.WORKFLOW.ITEMS.STEP5.TITLE',
      desc: 'LANDING.WORKFLOW.ITEMS.STEP5.DESC',
      tag: 'LANDING.WORKFLOW.ITEMS.STEP5.TAG',
      icon: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M3 11h16M13 5l6 6-6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    }
  ]);

  diffItems = signal<DiffItem[]>([
    {
      icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="4" stroke="currentColor" stroke-width="1.5"/><path d="M9 12l2.5 2.5L15 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      title: 'LANDING.WHY.ITEMS.PAPERLESS.TITLE',
      desc: 'LANDING.WHY.ITEMS.PAPERLESS.DESC'
    },
    {
      icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5"/><path d="M12 7v5l3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      title: 'LANDING.WHY.ITEMS.AUTOMATION.TITLE',
      desc: 'LANDING.WHY.ITEMS.AUTOMATION.DESC'
    },
    {
      icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 2L4 6v6c0 5.3 3.4 8.7 8 9.7C17.6 20.7 21 17.3 21 12V6L12 2z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M9 12l2 2 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      title: 'LANDING.WHY.ITEMS.SCORE.TITLE',
      desc: 'LANDING.WHY.ITEMS.SCORE.DESC'
    }
  ]);

  audiences = signal<Audience[]>([
    {
      icon: '<svg width="28" height="28" viewBox="0 0 28 28" fill="none"><rect x="3" y="3" width="22" height="22" rx="5" stroke="currentColor" stroke-width="1.5"/><path d="M9 14l3.5 3.5 6.5-7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      title: 'LANDING.AUDIENCE.ITEMS.SME.TITLE',
      desc: 'LANDING.AUDIENCE.ITEMS.SME.DESC',
      points: [
        'LANDING.AUDIENCE.ITEMS.SME.POINTS.0',
        'LANDING.AUDIENCE.ITEMS.SME.POINTS.1',
        'LANDING.AUDIENCE.ITEMS.SME.POINTS.2'
      ]
    },
    {
      icon: '<svg width="28" height="28" viewBox="0 0 28 28" fill="none"><circle cx="14" cy="10" r="5" stroke="currentColor" stroke-width="1.5"/><path d="M5 25c0-5 4.5-8 9-8s9 3 9 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
      title: 'LANDING.AUDIENCE.ITEMS.ACCOUNTANTS.TITLE',
      desc: 'LANDING.AUDIENCE.ITEMS.ACCOUNTANTS.DESC',
      points: [
        'LANDING.AUDIENCE.ITEMS.ACCOUNTANTS.POINTS.0',
        'LANDING.AUDIENCE.ITEMS.ACCOUNTANTS.POINTS.1',
        'LANDING.AUDIENCE.ITEMS.ACCOUNTANTS.POINTS.2'
      ]
    },
    {
      icon: '<svg width="28" height="28" viewBox="0 0 28 28" fill="none"><path d="M14 2L3 8v7c0 6.6 4.7 11.4 11 12.5C20.3 26.4 25 21.6 25 15V8L14 2z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>',
      title: 'LANDING.AUDIENCE.ITEMS.ENTERPRISE.TITLE',
      desc: 'LANDING.AUDIENCE.ITEMS.ENTERPRISE.DESC',
      points: [
        'LANDING.AUDIENCE.ITEMS.ENTERPRISE.POINTS.0',
        'LANDING.AUDIENCE.ITEMS.ENTERPRISE.POINTS.1',
        'LANDING.AUDIENCE.ITEMS.ENTERPRISE.POINTS.2'
      ]
    }
  ]);

  securityItems = signal<SecurityItem[]>([
    {
      icon: '<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="2" y="2" width="14" height="14" rx="3.5" stroke="currentColor" stroke-width="1.3"/><path d="M9 5.5v7M5.5 9h7" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>',
      label: 'LANDING.SECURITY.ITEMS.AES.TITLE',
      desc: 'LANDING.SECURITY.ITEMS.AES.DESC'
    },
    {
      icon: '<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 9l4 4 8-8" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/><circle cx="9" cy="9" r="7.5" stroke="currentColor" stroke-width="1.3"/></svg>',
      label: 'LANDING.SECURITY.ITEMS.AUDIT.TITLE',
      desc: 'LANDING.SECURITY.ITEMS.AUDIT.DESC'
    },
    {
      icon: '<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 1L2 5v4.5C2 12.9 5.1 15.9 9 16.5c3.9-.6 7-3.6 7-7V5L9 1z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>',
      label: 'LANDING.SECURITY.ITEMS.HOSTING.TITLE',
      desc: 'LANDING.SECURITY.ITEMS.HOSTING.DESC'
    },
    {
      icon: '<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="5" y="8" width="8" height="8" rx="2" stroke="currentColor" stroke-width="1.3"/><path d="M6 8V6a3 3 0 0 1 6 0v2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>',
      label: 'LANDING.SECURITY.ITEMS.ARCHIVE.TITLE',
      desc: 'LANDING.SECURITY.ITEMS.ARCHIVE.DESC'
    }
  ]);

  auditLogs = signal<AuditLog[]>([
    { action: 'LANDING.SECURITY.LOGS.ITEM1.ACTION', time: 'LANDING.SECURITY.LOGS.ITEM1.TIME', status: 'LANDING.SECURITY.LOGS.ITEM1.STATUS', ok: true },
    { action: 'LANDING.SECURITY.LOGS.ITEM2.ACTION', time: 'LANDING.SECURITY.LOGS.ITEM2.TIME', status: '1.4s', ok: true },
    { action: 'LANDING.SECURITY.LOGS.ITEM3.ACTION', time: 'LANDING.SECURITY.LOGS.ITEM3.TIME', status: 'LANDING.SECURITY.LOGS.ITEM3.STATUS', ok: true },
    { action: 'LANDING.SECURITY.LOGS.ITEM4.ACTION', time: 'LANDING.SECURITY.LOGS.ITEM4.TIME', status: '100%', ok: true },
    { action: 'LANDING.SECURITY.LOGS.ITEM5.ACTION', time: 'LANDING.SECURITY.LOGS.ITEM5.TIME', status: 'LANDING.SECURITY.LOGS.ITEM5.STATUS', ok: true }
  ]);

  constructor(
    private el: ElementRef,
    private zone: NgZone,
    private sanitizer: DomSanitizer,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.initHeroTypewriter();

    this.zone.runOutsideAngular(() => {
      const loop = () => {
        this.ringX += (this.mx - this.ringX) * 0.12;
        this.ringY += (this.my - this.ringY) * 0.12;
        this.rafId = requestAnimationFrame(loop);
      };

      this.rafId = requestAnimationFrame(loop);
    });

    setTimeout(() => {
      this.initObservers();
      this.animateStats();
    }, 200);
  }

  ngOnDestroy(): void {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }

    if (this.statsRafId) {
      cancelAnimationFrame(this.statsRafId);
    }

    if (this.heroTimer) {
      clearTimeout(this.heroTimer);
    }

    this.langChangeSub?.unsubscribe();
    this.observers.forEach(observer => observer.disconnect());
    document.body.style.overflow = '';
  }

  @HostListener('window:scroll')
  onScroll(): void {
    this.scrolled.set(window.scrollY > 40);
  }

  @HostListener('window:mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    this.cursorX = event.clientX;
    this.cursorY = event.clientY;
    this.mx = event.clientX;
    this.my = event.clientY;
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeFeatureModal();
  }

  openFeatureModal(feature: Feature): void {
    this.selectedFeature.set(feature);
    document.body.style.overflow = 'hidden';
  }

  closeFeatureModal(): void {
    this.selectedFeature.set(null);
    document.body.style.overflow = '';
  }

  scrollToSection(event: Event, sectionId: string): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    event.preventDefault();

    const target = document.getElementById(sectionId);
    if (!target) {
      return;
    }

    target.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  }

  safeSvg(icon: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(icon);
  }

  private animateStats(): void {
    if (this.statsAnimated) {
      return;
    }

    this.statsAnimated = true;
    const start = performance.now();
    const duration = 1100;

    const render = (time: number) => {
      const progress = Math.min(1, (time - start) / duration);

      const nextStats = this.stats().map(stat => {
        if (stat.target === null) {
          return stat;
        }

        const value = Math.min(stat.target, stat.target * progress);
        const display = stat.suffix === 's'
          ? `${Math.max(0.1, value).toFixed(1)}s`
          : `${Math.round(value)}${stat.suffix}`;

        return { ...stat, display };
      });

      this.stats.set(nextStats);

      if (progress < 1) {
        this.statsRafId = requestAnimationFrame(render);
      } else {
        this.stats.update(all =>
          all.map(stat => ({
            ...stat,
            display: stat.target !== null ? stat.fixed : stat.display
          }))
        );
      }
    };

    this.statsRafId = requestAnimationFrame(render);
  }

  private initHeroTypewriter(): void {
    this.syncHeroWords(true);
    this.langChangeSub = this.translate.onLangChange.subscribe(() => {
      this.syncHeroWords(true);
    });
  }

  private syncHeroWords(restart: boolean): void {
    this.heroWords = [
      this.translate.instant('LANDING.HERO.WORDS.INVOICING'),
      this.translate.instant('LANDING.HERO.WORDS.ACCOUNTING'),
      this.translate.instant('LANDING.HERO.WORDS.RISK'),
      this.translate.instant('LANDING.HERO.WORDS.PURCHASING'),
      this.translate.instant('LANDING.HERO.WORDS.SALES')
    ].filter(word => typeof word === 'string' && word.trim().length > 0);

    if (!this.heroWords.length) {
      this.heroTypedWord.set('');
      return;
    }

    if (!restart) {
      return;
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.heroTypedWord.set(this.heroWords[0]);
      return;
    }

    this.heroWordIndex = 0;
    this.heroCharIndex = 0;
    this.heroDeleting = false;
    this.heroTypedWord.set('');

    if (this.heroTimer) {
      clearTimeout(this.heroTimer);
    }

    this.scheduleHeroTick(220);
  }

  private scheduleHeroTick(delay: number): void {
    if (this.heroTimer) {
      clearTimeout(this.heroTimer);
    }

    this.heroTimer = window.setTimeout(() => this.tickHeroTyping(), delay);
  }

  private tickHeroTyping(): void {
    const currentWord = this.heroWords[this.heroWordIndex] ?? '';
    if (!currentWord) {
      return;
    }

    if (this.heroDeleting) {
      this.heroCharIndex = Math.max(0, this.heroCharIndex - 1);
      this.heroTypedWord.set(currentWord.slice(0, this.heroCharIndex));

      if (this.heroCharIndex === 0) {
        this.heroDeleting = false;
        this.heroWordIndex = (this.heroWordIndex + 1) % this.heroWords.length;
        this.scheduleHeroTick(180);
        return;
      }

      this.scheduleHeroTick(38);
      return;
    }

    this.heroCharIndex = Math.min(currentWord.length, this.heroCharIndex + 1);
    this.heroTypedWord.set(currentWord.slice(0, this.heroCharIndex));

    if (this.heroCharIndex === currentWord.length) {
      this.heroDeleting = true;
      this.scheduleHeroTick(1400);
      return;
    }

    this.scheduleHeroTick(82);
  }

  private initObservers(): void {
    const host = this.el.nativeElement as HTMLElement;

    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          (entry.target as HTMLElement).classList.add('visible');
        }
      });
    }, { threshold: 0.12 });

    host.querySelectorAll<HTMLElement>('.reveal, .reveal-left, .reveal-right')
      .forEach(element => revealObserver.observe(element));

    this.observers.push(revealObserver);

    const scoreElement = host.querySelector('.score-card');
    if (scoreElement) {
      const scoreObserver = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting) {
          this.zone.run(() => {
            this.scoreAnimated.set(true);
            this.complianceVisible.set(true);
          });
          scoreObserver.disconnect();
        }
      }, { threshold: 0.3 });

      scoreObserver.observe(scoreElement);
      this.observers.push(scoreObserver);
    }

    const statsSection = host.querySelector('.stats-section');
    if (statsSection) {
      const statsObserver = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting) {
          this.zone.run(() => this.animateStats());
          statsObserver.disconnect();
        }
      }, { threshold: 0.25 });

      statsObserver.observe(statsSection);
      this.observers.push(statsObserver);
    }
  }
}
