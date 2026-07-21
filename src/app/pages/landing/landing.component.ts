import {
  Component, OnInit, OnDestroy, signal,
  HostListener, ElementRef, NgZone, inject,
  PLATFORM_ID
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { ThemeToggleComponent } from '../../shared/components/theme-toggle/theme-toggle.component';
import { LanguageSwitcherComponent } from '../../shared/components/language-switcher/language-switcher.component';
import { TermTooltipComponent } from '../../shared/components/term-tooltip/term-tooltip.component';

export interface Feature {
  icon: string;
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
  tag: string;
  title: string;
  desc: string;
  points: string[];
}

export interface WhySectionCopy {
  eyebrow: string;
  titleLine1: string;
  titleEm: string;
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

export interface TrustStat {
  value: string;
  label: string;
  detail: string;
}

export interface Testimonial {
  quote: string;
  author: string;
  role: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface AuditLog {
  action: string;
  time: string;
  status: string;
  ok: boolean;
}

export interface PricingPlan {
  id: string;
  name: string;
  priceMensuel: number | null;
  tagline: string;
  isPro: boolean;
  ctaLabel: string;
  ctaLink: string;
  ctaStyle: 'ghost' | 'ey' | 'outline';
  features: { text: string; type: 'ok' | 'ey' | 'na'; badge?: 'ai' | 'new' | 'soon' }[];
  limits: { val: string; label: string }[];
}

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterLink, ThemeToggleComponent, LanguageSwitcherComponent, TermTooltipComponent, TranslatePipe],
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.scss']
})
export class LandingComponent implements OnInit, OnDestroy {
  private readonly translate = inject(TranslateService);
  private readonly platformId = inject(PLATFORM_ID);

  heroTypedWord = signal(this.getInitialHeroWord());

  private statsAnimated = false;
  private statsAnimationComplete = false;
  private statsRafId?: number;
  private heroTimer?: number;
  private initTimer?: number;
  private heroWordIndex = 0;
  private heroCharIndex = 0;
  private heroDeleting = false;
  private heroWords: string[] = [];
  private heroLangChangeSub?: Subscription;
  private observers: IntersectionObserver[] = [];
  private observersInitialized = false;
  private readonly handleVisibilityChange = () => this.onVisibilityChange();

  scrolled = signal(false);
  navOpen = signal(false);
  scoreAnimated = signal(false);
  complianceVisible = signal(false);
  activeYear = signal(new Date().getFullYear());
  selectedFeature = signal<Feature | null>(null);
  openFaqIndex = signal(0);

  stats = signal<Stat[]>([
    { label: 'LANDING.STATS.ITEMS.TEIF_PROCESS', target: 100, suffix: '%', fixed: '100%', display: '0%' },
    { label: 'LANDING.STATS.ITEMS.DGI_TRANSMISSION', target: 2, suffix: 's', fixed: '< 2s', display: '0.0s' },
    { label: 'LANDING.STATS.ITEMS.UBL_VALID', target: null, suffix: '', fixed: 'UBL 2.1', display: 'UBL 2.1' },
    { label: 'LANDING.STATS.ITEMS.PLATFORM_UPTIME', target: 99.9, suffix: '%', fixed: '99.9%', display: '0%' }
  ]);

  trustStats = signal<TrustStat[]>([
    {
      value: '120+',
      label: 'LANDING.TRUST_STRIP.STATS.ACTIVE_COMPANIES.LABEL',
      detail: 'LANDING.TRUST_STRIP.STATS.ACTIVE_COMPANIES.DETAIL'
    },
    {
      value: '98%',
      label: 'LANDING.TRUST_STRIP.STATS.DGI_ACCEPTANCE.LABEL',
      detail: 'LANDING.TRUST_STRIP.STATS.DGI_ACCEPTANCE.DETAIL'
    },
    {
      value: '4.7/5',
      label: 'LANDING.TRUST_STRIP.STATS.SATISFACTION.LABEL',
      detail: 'LANDING.TRUST_STRIP.STATS.SATISFACTION.DETAIL'
    },
    {
      value: '2 j',
      label: 'LANDING.TRUST_STRIP.STATS.ACTIVATION.LABEL',
      detail: 'LANDING.TRUST_STRIP.STATS.ACTIVATION.DETAIL'
    }
  ]);

  testimonial = signal<Testimonial>({
    quote: 'LANDING.TRUST_STRIP.TESTIMONIAL.QUOTE',
    author: 'LANDING.TRUST_STRIP.TESTIMONIAL.AUTHOR',
    role: 'LANDING.TRUST_STRIP.TESTIMONIAL.ROLE'
  });

  faqItems = signal<FaqItem[]>([
    {
      question: 'LANDING.FAQ.ITEMS.OLD_INVOICES.QUESTION',
      answer: 'LANDING.FAQ.ITEMS.OLD_INVOICES.ANSWER'
    },
    {
      question: 'LANDING.FAQ.ITEMS.ACTIVATION.QUESTION',
      answer: 'LANDING.FAQ.ITEMS.ACTIVATION.ANSWER'
    },
    {
      question: 'LANDING.FAQ.ITEMS.CANCELLATION.QUESTION',
      answer: 'LANDING.FAQ.ITEMS.CANCELLATION.ANSWER'
    },
    {
      question: 'LANDING.FAQ.ITEMS.HOSTING.QUESTION',
      answer: 'LANDING.FAQ.ITEMS.HOSTING.ANSWER'
    },
    {
      question: 'LANDING.FAQ.ITEMS.DGI_REJECTION.QUESTION',
      answer: 'LANDING.FAQ.ITEMS.DGI_REJECTION.ANSWER'
    }
  ]);

  features = signal<Feature[]>([
    {
      icon: '<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="3" y="2.5" width="14" height="15" rx="3" stroke="currentColor" stroke-width="1.4"/><path d="M6.5 6.5h7M6.5 10h7M6.5 13.5h4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
      title: 'LANDING.FEATURES.ITEMS.INVOICE.TITLE',
      tag: 'LANDING.FEATURES.ITEMS.INVOICE.TAG',
      desc: 'LANDING.FEATURES.ITEMS.INVOICE.DESC',
      detail: 'LANDING.FEATURES.ITEMS.INVOICE.DETAIL'
    },
    {
      icon: '<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M4 14.5h12M5.5 14.5V10m4 4.5V7m4 7.5V5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><circle cx="14" cy="5" r="1.2" fill="currentColor"/></svg>',
      title: 'LANDING.FEATURES.ITEMS.TAXES.TITLE',
      tag: 'LANDING.FEATURES.ITEMS.TAXES.TAG',
      desc: 'LANDING.FEATURES.ITEMS.TAXES.DESC',
      detail: 'LANDING.FEATURES.ITEMS.TAXES.DETAIL'
    },
    {
      icon: '<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M6 4.5h8M6 8h8M6 11.5h5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><rect x="3" y="2.5" width="14" height="15" rx="3" stroke="currentColor" stroke-width="1.4"/></svg>',
      title: 'LANDING.FEATURES.ITEMS.UBL.TITLE',
      tag: 'LANDING.FEATURES.ITEMS.UBL.TAG',
      desc: 'LANDING.FEATURES.ITEMS.UBL.DESC',
      detail: 'LANDING.FEATURES.ITEMS.UBL.DETAIL'
    },
    {
      icon: '<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M6.5 9V7.5a3.5 3.5 0 0 1 7 0V9" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><rect x="5" y="9" width="10" height="7.5" rx="2.2" stroke="currentColor" stroke-width="1.4"/><circle cx="10" cy="12.8" r="0.9" fill="currentColor"/></svg>',
      title: 'LANDING.FEATURES.ITEMS.SIGNATURE.TITLE',
      tag: 'LANDING.FEATURES.ITEMS.SIGNATURE.TAG',
      desc: 'LANDING.FEATURES.ITEMS.SIGNATURE.DESC',
      detail: 'LANDING.FEATURES.ITEMS.SIGNATURE.DETAIL'
    },
    {
      icon: '<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M3 10h14M12.5 5l4.5 5-4.5 5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      title: 'LANDING.FEATURES.ITEMS.TRANSMISSION.TITLE',
      tag: 'LANDING.FEATURES.ITEMS.TRANSMISSION.TAG',
      desc: 'LANDING.FEATURES.ITEMS.TRANSMISSION.DESC',
      detail: 'LANDING.FEATURES.ITEMS.TRANSMISSION.DETAIL'
    },
    {
      icon: '<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="7" stroke="currentColor" stroke-width="1.4"/><path d="M10 6.5V10l2.8 2.2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      title: 'LANDING.FEATURES.ITEMS.STATUS.TITLE',
      tag: 'LANDING.FEATURES.ITEMS.STATUS.TAG',
      desc: 'LANDING.FEATURES.ITEMS.STATUS.DESC',
      detail: 'LANDING.FEATURES.ITEMS.STATUS.DETAIL'
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
      icon: '<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="2" y="2" width="14" height="14" rx="3" stroke="currentColor" stroke-width="1.3"/><path d="M9 6v6M6 9h6" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>'
    },
    {
      num: 2,
      title: 'LANDING.WORKFLOW.ITEMS.STEP2.TITLE',
      desc: 'LANDING.WORKFLOW.ITEMS.STEP2.DESC',
      tag: 'LANDING.WORKFLOW.ITEMS.STEP2.TAG',
      icon: '<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 2.5a6.5 6.5 0 1 0 4.8 10.9" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><path d="M12.5 2.5h3v3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/><path d="M15.5 5.5 13 3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>'
    },
    {
      num: 3,
      title: 'LANDING.WORKFLOW.ITEMS.STEP3.TITLE',
      desc: 'LANDING.WORKFLOW.ITEMS.STEP3.DESC',
      tag: 'LANDING.WORKFLOW.ITEMS.STEP3.TAG',
      icon: '<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="2.5" y="1.5" width="13" height="15" rx="2.5" stroke="currentColor" stroke-width="1.3"/><path d="M5.5 5.5h7M5.5 9h7M5.5 12.5h4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>'
    },
    {
      num: 4,
      title: 'LANDING.WORKFLOW.ITEMS.STEP4.TITLE',
      desc: 'LANDING.WORKFLOW.ITEMS.STEP4.DESC',
      tag: 'LANDING.WORKFLOW.ITEMS.STEP4.TAG',
      icon: '<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="3" y="1.5" width="12" height="15" rx="2.5" stroke="currentColor" stroke-width="1.3"/><path d="M6 5.5h6M6 9h6" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><path d="M6.5 12.5 8 14l3-3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    },
    {
      num: 5,
      title: 'LANDING.WORKFLOW.ITEMS.STEP5.TITLE',
      desc: 'LANDING.WORKFLOW.ITEMS.STEP5.DESC',
      tag: 'LANDING.WORKFLOW.ITEMS.STEP5.TAG',
      icon: '<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M15.5 2.5 8.7 15.5 7.1 9 1.5 7.4 15.5 2.5Z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/><path d="M7.2 9.1 15.5 2.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>'
    }
  ]);

  whyCopy = signal<WhySectionCopy>({
    eyebrow: '',
    titleLine1: '',
    titleEm: '',
    desc: ''
  });

  diffItems = signal<DiffItem[]>([]);

  audiences = signal<Audience[]>([
    {
      icon: '<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="2" y="2" width="14" height="14" rx="3.5" stroke="currentColor" stroke-width="1.3"/><path d="M6.5 9l2.5 2.5 4.5-5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      title: 'LANDING.AUDIENCE.ITEMS.SME.TITLE',
      desc: 'LANDING.AUDIENCE.ITEMS.SME.DESC',
      points: [
        'LANDING.AUDIENCE.ITEMS.SME.POINTS.0',
        'LANDING.AUDIENCE.ITEMS.SME.POINTS.1',
        'LANDING.AUDIENCE.ITEMS.SME.POINTS.2'
      ]
    },
    {
      icon: '<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="7" r="3.5" stroke="currentColor" stroke-width="1.3"/><path d="M3.5 17c0-3.5 3-6 5.5-6s5.5 2.5 5.5 6" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>',
      title: 'LANDING.AUDIENCE.ITEMS.ACCOUNTANTS.TITLE',
      desc: 'LANDING.AUDIENCE.ITEMS.ACCOUNTANTS.DESC',
      points: [
        'LANDING.AUDIENCE.ITEMS.ACCOUNTANTS.POINTS.0',
        'LANDING.AUDIENCE.ITEMS.ACCOUNTANTS.POINTS.1',
        'LANDING.AUDIENCE.ITEMS.ACCOUNTANTS.POINTS.2'
      ]
    },
    {
      icon: '<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 1.5L2 5.5v5C2 14.5 5 17 9 17.5c4-.5 7-3 7-7v-5L9 1.5z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>',
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
      icon: '<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 5.5h12v7H3z" stroke="currentColor" stroke-width="1.3"/><path d="M6 8h6M6 11h4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><path d="M5 2.5v3M13 2.5v3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>',
      label: 'LANDING.SECURITY.ITEMS.HOSTING_PRIORITY.TITLE',
      desc: 'LANDING.SECURITY.ITEMS.HOSTING_PRIORITY.DESC'
    },
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

  billingType = signal<'mensuel' | 'annuel'>('mensuel');
  priceMode = signal<'ht' | 'ttc'>('ht');
  readonly vatRate = 0.19;
  readonly vatPercent = 19;

  plans = signal<PricingPlan[]>([
    {
      id: 'starter',
      name: 'Starter',
      priceMensuel: 49,
      tagline: 'LANDING.PRICING.PLANS.STARTER.TAGLINE',
      isPro: false,
      ctaLabel: 'LANDING.PRICING.PLANS.STARTER.CTA',
      ctaLink: '/demande-acces',
      ctaStyle: 'ghost',
      features: [
        { text: 'LANDING.PRICING.PLANS.STARTER.FEATURES.TRIAL', type: 'ok' },
        { text: 'LANDING.PRICING.PLANS.STARTER.FEATURES.INVOICES', type: 'ok' },
        { text: 'LANDING.PRICING.PLANS.STARTER.FEATURES.XML', type: 'ok' },
        { text: 'LANDING.PRICING.PLANS.STARTER.FEATURES.TRANSMISSION', type: 'ok' },
        { text: 'LANDING.PRICING.PLANS.STARTER.FEATURES.PDF', type: 'ok' },
        { text: 'LANDING.PRICING.PLANS.STARTER.FEATURES.USER', type: 'ok' }
      ],
      limits: [
        { val: '30', label: 'LANDING.PRICING.LIMITS.INVOICES_MONTH' },
        { val: '1', label: 'LANDING.PRICING.LIMITS.USER' },
        { val: '1', label: 'LANDING.PRICING.LIMITS.COMPANY' }
      ]
    },
    {
      id: 'growth',
      name: 'Growth',
      priceMensuel: 89,
      tagline: 'LANDING.PRICING.PLANS.GROWTH.TAGLINE',
      isPro: false,
      ctaLabel: 'LANDING.PRICING.PLANS.GROWTH.CTA',
      ctaLink: '/demande-acces?plan=growth',
      ctaStyle: 'ghost',
      features: [
        { text: 'LANDING.PRICING.PLANS.GROWTH.FEATURES.INVOICES', type: 'ok' },
        { text: 'LANDING.PRICING.PLANS.GROWTH.FEATURES.USERS', type: 'ok' },
        { text: 'LANDING.PRICING.PLANS.GROWTH.FEATURES.ACCOUNTING', type: 'ok' },
        { text: 'LANDING.PRICING.PLANS.GROWTH.FEATURES.TAXES', type: 'ok' },
        { text: 'LANDING.PRICING.PLANS.GROWTH.FEATURES.REPORTS', type: 'ok' },
        { text: 'LANDING.PRICING.PLANS.GROWTH.FEATURES.SUPPORT', type: 'ok' }
      ],
      limits: [
        { val: '100', label: 'LANDING.PRICING.LIMITS.INVOICES_MONTH' },
        { val: '3', label: 'LANDING.PRICING.LIMITS.USERS' },
        { val: '1', label: 'LANDING.PRICING.LIMITS.COMPANY' },
        { val: '5 Go', label: 'LANDING.PRICING.LIMITS.STORAGE' }
      ]
    },
    {
      id: 'pro',
      name: 'Pro',
      priceMensuel: 149,
      tagline: 'LANDING.PRICING.PLANS.PRO.TAGLINE',
      isPro: true,
      ctaLabel: 'LANDING.PRICING.PLANS.PRO.CTA',
      ctaLink: '/demande-acces',
      ctaStyle: 'ey',
      features: [
        { text: 'LANDING.PRICING.PLANS.PRO.FEATURES.UNLIMITED', type: 'ey' },
        { text: 'LANDING.PRICING.PLANS.PRO.FEATURES.USERS', type: 'ey' },
        { text: 'LANDING.PRICING.PLANS.PRO.FEATURES.ACCOUNTING', type: 'ey' },
        { text: 'LANDING.PRICING.PLANS.PRO.FEATURES.PAYMENTS', type: 'ey' },
        { text: 'LANDING.PRICING.PLANS.PRO.FEATURES.DASHBOARD', type: 'ey' },
        { text: 'LANDING.PRICING.PLANS.PRO.FEATURES.EXPORTS', type: 'ey' },
        { text: 'LANDING.PRICING.PLANS.PRO.FEATURES.CREDIT_NOTES', type: 'ey' },
        { text: 'LANDING.PRICING.PLANS.PRO.FEATURES.TAXES', type: 'ey' },
        { text: 'LANDING.PRICING.PLANS.PRO.FEATURES.SIGNATURE', type: 'ey' },
        { text: 'LANDING.PRICING.PLANS.PRO.FEATURES.EXTRACTION', type: 'ey' },
        { text: 'LANDING.PRICING.PLANS.PRO.FEATURES.RISK', type: 'ey' },
        { text: 'LANDING.PRICING.PLANS.PRO.FEATURES.PREDICTION', type: 'ey' }
      ],
      limits: [
        { val: '∞', label: 'LANDING.PRICING.LIMITS.INVOICES' },
        { val: '5', label: 'LANDING.PRICING.LIMITS.USERS' },
        { val: '1', label: 'LANDING.PRICING.LIMITS.COMPANY' },
        { val: '10 Go', label: 'LANDING.PRICING.LIMITS.STORAGE' }
      ]
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      priceMensuel: null,
      tagline: 'LANDING.PRICING.PLANS.ENTERPRISE.TAGLINE',
      isPro: false,
      ctaLabel: 'LANDING.PRICING.PLANS.ENTERPRISE.CTA',
      ctaLink: '/contact',
      ctaStyle: 'outline',
      features: [
        { text: 'LANDING.PRICING.PLANS.ENTERPRISE.FEATURES.USERS', type: 'ok' },
        { text: 'LANDING.PRICING.PLANS.ENTERPRISE.FEATURES.MULTI_COMPANY', type: 'ok' },
        { text: 'LANDING.PRICING.PLANS.ENTERPRISE.FEATURES.MOBILE', type: 'ok' },
        { text: 'LANDING.PRICING.PLANS.ENTERPRISE.FEATURES.ANOMALIES', type: 'ok' },
        { text: 'LANDING.PRICING.PLANS.ENTERPRISE.FEATURES.STORAGE', type: 'ok' },
        { text: 'LANDING.PRICING.PLANS.ENTERPRISE.FEATURES.SUPPORT', type: 'ok' },
        { text: 'LANDING.PRICING.PLANS.ENTERPRISE.FEATURES.AUDIT', type: 'ok' },
      ],
      limits: [
        { val: '∞', label: 'LANDING.PRICING.LIMITS.INVOICES' },
        { val: '∞', label: 'LANDING.PRICING.LIMITS.USERS' },
        { val: '∞', label: 'LANDING.PRICING.LIMITS.COMPANIES' },
        { val: '∞', label: 'LANDING.PRICING.LIMITS.STORAGE' }
      ]
    }
  ]);

  mobileFeatures = signal([
    {
      icon: '<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="3" y="1.5" width="12" height="15" rx="2.5" stroke="currentColor" stroke-width="1.3"/><circle cx="9" cy="13.5" r="0.8" fill="currentColor"/><path d="M6 5.5h6M6 8.5h6" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>',
      title: 'LANDING.MOBILE_SECTION.FEATURES.CAPTURE.TITLE',
      desc: 'LANDING.MOBILE_SECTION.FEATURES.CAPTURE.DESC'
    },
    {
      icon: '<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M2 6.5h14M2 10h14M2 13.5h8" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><rect x="1.5" y="1.5" width="15" height="15" rx="2.5" stroke="currentColor" stroke-width="1.3"/></svg>',
      title: 'LANDING.MOBILE_SECTION.FEATURES.EXTRACTION.TITLE',
      desc: 'LANDING.MOBILE_SECTION.FEATURES.EXTRACTION.DESC'
    },
    {
      icon: '<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="2.5" y="1.5" width="13" height="15" rx="2.5" stroke="currentColor" stroke-width="1.3"/><path d="M5.5 5.5h7M5.5 9h7M5.5 12.5h4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>',
      title: 'LANDING.MOBILE_SECTION.FEATURES.PREFILL.TITLE',
      desc: 'LANDING.MOBILE_SECTION.FEATURES.PREFILL.DESC'
    },
    {
      icon: '<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M2 9h14M11 4l5 5-5 5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      title: 'LANDING.MOBILE_SECTION.FEATURES.VALIDATION.TITLE',
      desc: 'LANDING.MOBILE_SECTION.FEATURES.VALIDATION.DESC'
    }
  ]);

  constructor(
    private el: ElementRef,
    private zone: NgZone,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.syncWhySectionCopy();
    this.initHeroTypewriter();
    document.addEventListener('visibilitychange', this.handleVisibilityChange);

    this.initTimer = window.setTimeout(() => {
      this.initTimer = undefined;
      if (this.isPageVisible()) {
        this.initObservers();
      }
    }, 200);
  }

  ngOnDestroy(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.cancelStatsAnimation(false);
    this.pauseHeroTyping();

    if (this.initTimer) {
      clearTimeout(this.initTimer);
      this.initTimer = undefined;
    }

    this.heroLangChangeSub?.unsubscribe();
    this.observers.forEach(observer => observer.disconnect());
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    this.observersInitialized = false;
    document.body.style.overflow = '';
  }

  @HostListener('window:scroll')
  onScroll(): void {
    this.scrolled.set(window.scrollY > 40);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeNavMenu();
    this.closeFeatureModal();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as Node | null;
    const host = this.el.nativeElement as HTMLElement;

    if (target && !host.querySelector('.nav-inner')?.contains(target)) {
      this.closeNavMenu();
    }
  }

  toggleNavMenu(): void {
    this.navOpen.update(open => !open);
  }

  closeNavMenu(): void {
    this.navOpen.set(false);
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
    this.closeNavMenu();

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

  getCurrentPrice(plan: PricingPlan): string {
    const price = this.getPlanBasePrice(plan);
    if (price === null) return '';
    const displayPrice = this.priceMode() === 'ttc' ? price * (1 + this.vatRate) : price;
    return this.formatDtAmount(displayPrice);
  }

  getMonthlyComparePrice(plan: PricingPlan): string {
    if (plan.priceMensuel === null) return '';
    const price = this.priceMode() === 'ttc' ? plan.priceMensuel * (1 + this.vatRate) : plan.priceMensuel;
    return this.formatDtAmount(price);
  }

  isFaqOpen(index: number): boolean {
    return this.openFaqIndex() === index;
  }

  toggleFaq(index: number): void {
    this.openFaqIndex.update(current => current === index ? -1 : index);
  }

  getHtPrice(plan: PricingPlan): string {
    const price = this.getPlanBasePrice(plan);
    return price === null ? '' : this.formatDtAmount(price);
  }

  getVatAmount(plan: PricingPlan): string {
    const price = this.getPlanBasePrice(plan);
    return price === null ? '' : this.formatDtAmount(price * this.vatRate);
  }

  getTtcPrice(plan: PricingPlan): string {
    const price = this.getPlanBasePrice(plan);
    return price === null ? '' : this.formatDtAmount(price * (1 + this.vatRate));
  }

  planSectionLabelKey(planId: string): string {
    switch (planId) {
      case 'starter':
        return 'LANDING.PRICING.INCLUDED';
      case 'growth':
        return 'LANDING.PRICING.EVERYTHING_STARTER_PLUS';
      case 'pro':
        return 'LANDING.PRICING.EVERYTHING_GROWTH_PLUS';
      default:
        return 'LANDING.PRICING.EVERYTHING_PRO_PLUS';
    }
  }

  priceModeLabelKey(): string {
    return this.priceMode() === 'ht' ? 'LANDING.PRICING.HT' : 'LANDING.PRICING.TTC';
  }

  private getPlanBasePrice(plan: PricingPlan): number | null {
    if (plan.priceMensuel === null) return null;
    return this.billingType() === 'mensuel' ? plan.priceMensuel : plan.priceMensuel * 0.8;
  }

  private formatDtAmount(value: number): string {
    const hasDecimals = Math.round(value * 100) % 100 !== 0;
    return new Intl.NumberFormat('fr-TN', {
      minimumFractionDigits: hasDecimals ? 2 : 0,
      maximumFractionDigits: 2
    }).format(value);
  }

  private isPageVisible(): boolean {
    return isPlatformBrowser(this.platformId) && !document.hidden;
  }

  private getInitialHeroWord(): string {
    const key = 'LANDING.HERO.WORDS.INVOICING';
    const translated = this.translate.instant(key);

    if (translated && translated !== key) {
      return translated;
    }

    switch (this.resolveInitialHeroLang()) {
      case 'en':
        return 'Invoicing';
      case 'ar':
        return 'الفوترة';
      default:
        return 'Facturation électronique';
    }
  }

  private resolveInitialHeroLang(): 'fr' | 'en' | 'ar' {
    const currentLang = (this.translate.currentLang || this.translate.getFallbackLang() || '').toLowerCase();
    if (currentLang === 'en' || currentLang === 'ar' || currentLang === 'fr') {
      return currentLang;
    }

    if (isPlatformBrowser(this.platformId)) {
      try {
        const storedLang = localStorage.getItem('ey_lang')?.toLowerCase();
        if (storedLang === 'en' || storedLang === 'ar' || storedLang === 'fr') {
          return storedLang;
        }
      } catch {
        // Ignore storage access issues and continue with other hints.
      }

      const documentLang = document.documentElement.lang?.toLowerCase();
      if (documentLang.startsWith('ar')) return 'ar';
      if (documentLang.startsWith('en')) return 'en';
      if (documentLang.startsWith('fr')) return 'fr';

      const browserLang = navigator.language?.toLowerCase() || '';
      if (browserLang.startsWith('ar')) return 'ar';
      if (browserLang.startsWith('en')) return 'en';
    }

    return 'fr';
  }

  private prefersReducedMotion(): boolean {
    return isPlatformBrowser(this.platformId)
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  private onVisibilityChange(): void {
    if (!this.isPageVisible()) {
      this.pauseHeroTyping();
      this.cancelStatsAnimation(true);
      return;
    }

    if (!this.observersInitialized) {
      this.initObservers();
    }

    this.resumeHeroTyping();
  }

  private pauseHeroTyping(): void {
    if (this.heroTimer) {
      clearTimeout(this.heroTimer);
      this.heroTimer = undefined;
    }
  }

  private resumeHeroTyping(): void {
    if (this.heroTimer || !this.heroWords.length || this.prefersReducedMotion()) {
      return;
    }

    this.scheduleHeroTick(240);
  }

  private cancelStatsAnimation(finalize: boolean): void {
    if (this.statsRafId) {
      cancelAnimationFrame(this.statsRafId);
      this.statsRafId = undefined;
    }

    if (finalize && this.statsAnimated && !this.statsAnimationComplete) {
      this.finishStatsAnimation();
    }
  }

  private finishStatsAnimation(): void {
    this.stats.update(all =>
      all.map(stat => ({
        ...stat,
        display: stat.target !== null ? stat.fixed : stat.display
      }))
    );
    this.statsAnimated = true;
    this.statsAnimationComplete = true;
    this.statsRafId = undefined;
  }

  private animateStats(): void {
    if (this.statsAnimated || this.statsAnimationComplete) {
      return;
    }

    if (!this.isPageVisible() || this.prefersReducedMotion()) {
      this.finishStatsAnimation();
      return;
    }

    this.statsAnimated = true;
    const start = performance.now();
    const duration = 1100;

    const render = (time: number) => {
      if (!this.isPageVisible()) {
        this.finishStatsAnimation();
        return;
      }

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
        this.finishStatsAnimation();
      }
    };

    this.statsRafId = requestAnimationFrame(render);
  }

  private initHeroTypewriter(): void {
    this.syncHeroWords(true);
    this.heroLangChangeSub = this.translate.onLangChange.subscribe(() => {
      this.syncWhySectionCopy();
      this.syncHeroWords(true);
    });
  }

  private syncWhySectionCopy(): void {
    this.whyCopy.set({
      eyebrow: this.translateWithFallback('LANDING.WHY.EYEBROW', 'Pilotage financier'),
      titleLine1: this.translateWithFallback('LANDING.WHY.TITLE_LINE1', 'Facturation, comptabilité'),
      titleEm: this.translateWithFallback('LANDING.WHY.TITLE_EM', 'et trésorerie dans un seul espace'),
      desc: this.translateWithFallback(
        'LANDING.WHY.DESC',
        'TuniFlow aide les entreprises tunisiennes à automatiser la facturation, alimenter la comptabilité, suivre les encaissements et garder une lecture claire de la conformité TEIF.'
      )
    });

    this.diffItems.set([
      {
        icon: '<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="2" y="2" width="14" height="14" rx="3" stroke="currentColor" stroke-width="1.3"/><path d="M5.5 6h7M5.5 9h7M5.5 12h4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>',
        tag: this.translateWithFallback('LANDING.WHY.ITEMS.FLOW.TAG', 'Facturation'),
        title: this.translateWithFallback('LANDING.WHY.ITEMS.FLOW.TITLE', 'Un cycle de vente plus fluide'),
        desc: this.translateWithFallback(
          'LANDING.WHY.ITEMS.FLOW.DESC',
          'De la création de facture jusqu’au statut d’envoi, l’équipe suit le document dans un seul parcours au lieu de multiplier les écrans et les ressaisies.'
        ),
        points: [
          this.translateWithFallback('LANDING.WHY.ITEMS.FLOW.POINTS.0', 'Création, validation et émission dans le même flux'),
          this.translateWithFallback('LANDING.WHY.ITEMS.FLOW.POINTS.1', 'Format électronique prêt pour la transmission'),
          this.translateWithFallback('LANDING.WHY.ITEMS.FLOW.POINTS.2', 'Statuts visibles sans sortir du dossier client')
        ]
      },
      {
        icon: '<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 4.5h12v9H3z" stroke="currentColor" stroke-width="1.3"/><path d="M6 7.5h6M6 10.5h4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><path d="M5 2.5v2M13 2.5v2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>',
        tag: this.translateWithFallback('LANDING.WHY.ITEMS.ACCOUNTING.TAG', 'Comptabilité'),
        title: this.translateWithFallback('LANDING.WHY.ITEMS.ACCOUNTING.TITLE', 'La comptabilité suit les factures'),
        desc: this.translateWithFallback(
          'LANDING.WHY.ITEMS.ACCOUNTING.DESC',
          'Les écritures, journaux et bases fiscales se mettent à jour à partir de l’activité de facturation pour réduire les doubles saisies côté finance.'
        ),
        points: [
          this.translateWithFallback('LANDING.WHY.ITEMS.ACCOUNTING.POINTS.0', 'Journaux et mouvements reliés aux factures'),
          this.translateWithFallback('LANDING.WHY.ITEMS.ACCOUNTING.POINTS.1', 'TVA, FODEC et timbre mieux cadrés'),
          this.translateWithFallback('LANDING.WHY.ITEMS.ACCOUNTING.POINTS.2', 'Vision plus propre pour le suivi comptable')
        ]
      },
      {
        icon: '<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 9h12" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><path d="M5 5.5h8v7H5z" stroke="currentColor" stroke-width="1.3"/><path d="M7 12.5h4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>',
        tag: this.translateWithFallback('LANDING.WHY.ITEMS.CASH.TAG', 'Trésorerie'),
        title: this.translateWithFallback('LANDING.WHY.ITEMS.CASH.TITLE', 'Encaissements et relances centralisés'),
        desc: this.translateWithFallback(
          'LANDING.WHY.ITEMS.CASH.DESC',
          'Paiements, retards, relances et reste à encaisser sont suivis dans la même plateforme pour donner une lecture simple de la trésorerie.'
        ),
        points: [
          this.translateWithFallback('LANDING.WHY.ITEMS.CASH.POINTS.0', 'Paiements partiels ou complets visibles rapidement'),
          this.translateWithFallback('LANDING.WHY.ITEMS.CASH.POINTS.1', 'Relances et retards suivis sans tableau séparé'),
          this.translateWithFallback('LANDING.WHY.ITEMS.CASH.POINTS.2', 'Lecture claire du restant dû par client')
        ]
      },
      {
        icon: '<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 1.5L2.5 4.5v4.2c0 2.9 2.4 5.4 6.5 6.8 4.1-1.4 6.5-3.9 6.5-6.8V4.5L9 1.5z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/><path d="M6.5 9.2 8.2 11l3.3-3.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
        tag: this.translateWithFallback('LANDING.WHY.ITEMS.CONTROL.TAG', 'Pilotage'),
        title: this.translateWithFallback('LANDING.WHY.ITEMS.CONTROL.TITLE', 'Conformité et contrôle au quotidien'),
        desc: this.translateWithFallback(
          'LANDING.WHY.ITEMS.CONTROL.DESC',
          'L’équipe garde une vue continue sur les statuts, les contrôles de format et les points à corriger avant ou après transmission.'
        ),
        points: [
          this.translateWithFallback('LANDING.WHY.ITEMS.CONTROL.POINTS.0', 'Contrôles TEIF intégrés au workflow'),
          this.translateWithFallback('LANDING.WHY.ITEMS.CONTROL.POINTS.1', 'Rejets et corrections traités plus vite'),
          this.translateWithFallback('LANDING.WHY.ITEMS.CONTROL.POINTS.2', 'Tableau de bord plus lisible pour la direction financière')
        ]
      },
      {
        icon: '<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M4 9h10M9 4l5 5-5 5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/><circle cx="4" cy="9" r="1.2" fill="currentColor"/></svg>',
        tag: this.translateWithFallback('LANDING.WHY.ITEMS.ACTIVATION.TAG', 'Accompagnement'),
        title: this.translateWithFallback('LANDING.WHY.ITEMS.ACTIVATION.TITLE', 'Un déploiement plus rapide et plus lisible'),
        desc: this.translateWithFallback(
          'LANDING.WHY.ITEMS.ACTIVATION.DESC',
          'L’équipe avance avec un accompagnement local, des délais d’activation courts et une lecture tarifaire simple dès le départ.'
        ),
        points: [
          this.translateWithFallback('LANDING.WHY.ITEMS.ACTIVATION.POINTS.0', 'Activation moyenne en 2 jours ouvrés'),
          this.translateWithFallback('LANDING.WHY.ITEMS.ACTIVATION.POINTS.1', 'Support local en français et en arabe'),
          this.translateWithFallback('LANDING.WHY.ITEMS.ACTIVATION.POINTS.2', 'Tarification lisible sans frais cachés')
        ]
      }
    ]);
  }

  private translateWithFallback(key: string, fallback: string): string {
    const value = this.translate.instant(key);
    if (typeof value !== 'string') {
      return fallback;
    }

    const trimmed = value.trim();
    if (!trimmed || trimmed === key) {
      return fallback;
    }

    return trimmed;
  }

  private syncHeroWords(restart: boolean): void {
    this.heroWords = [
      this.translate.instant('LANDING.HERO.WORDS.INVOICING'),
      this.translate.instant('LANDING.HERO.WORDS.ACCOUNTING'),
      this.translate.instant('LANDING.HERO.WORDS.COMPLIANCE')
    ].filter(word => typeof word === 'string' && word.trim().length > 0);

    if (!this.heroWords.length) {
      this.heroTypedWord.set('');
      return;
    }

    if (!restart) {
      return;
    }

    if (this.prefersReducedMotion()) {
      this.heroTypedWord.set(this.heroWords[0]);
      return;
    }

    this.heroWordIndex = 0;
    this.heroCharIndex = 0;
    this.heroDeleting = false;
    this.heroTypedWord.set('');

    this.pauseHeroTyping();

    this.scheduleHeroTick(220);
  }

  private scheduleHeroTick(delay: number): void {
    if (!this.isPageVisible() || this.prefersReducedMotion()) {
      return;
    }

    this.pauseHeroTyping();

    this.heroTimer = window.setTimeout(() => {
      this.heroTimer = undefined;
      this.tickHeroTyping();
    }, delay);
  }

  private tickHeroTyping(): void {
    if (!this.isPageVisible() || this.prefersReducedMotion()) {
      return;
    }

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
    if (!this.isPageVisible() || this.observersInitialized) {
      return;
    }

    this.observersInitialized = true;
    const host = this.el.nativeElement as HTMLElement;
    const lateRevealSelector = '.section-header, .guarantee-strip, .cta-inner';

    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          (entry.target as HTMLElement).classList.add('visible');
        }
      });
    }, { threshold: 0.2 });

    const lateRevealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          (entry.target as HTMLElement).classList.add('visible');
        }
      });
    }, {
      threshold: 0.2,
      rootMargin: '0px 0px -50px 0px'
    });

    host.querySelectorAll<HTMLElement>('.reveal, .reveal-left, .reveal-right')
      .forEach(element => {
        if (element.matches(lateRevealSelector)) {
          lateRevealObserver.observe(element);
          return;
        }

        revealObserver.observe(element);
      });

    this.observers.push(revealObserver);
    this.observers.push(lateRevealObserver);

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

    const statsSection = host.querySelector('.trust-strip-section');
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
