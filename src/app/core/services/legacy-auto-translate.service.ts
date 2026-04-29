import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { filter } from 'rxjs/operators';

type AttrSourceMap = Partial<Record<'placeholder' | 'title' | 'aria-label', string>>;

@Injectable({ providedIn: 'root' })
export class LegacyAutoTranslateService {
  private readonly document = inject(DOCUMENT);
  private readonly translate = inject(TranslateService);
  private readonly router = inject(Router);

  private readonly textSources = new WeakMap<Text, string>();
  private readonly attrSources = new WeakMap<Element, AttrSourceMap>();
  private scheduled = false;

  init(): void {
    this.translate.onLangChange.subscribe(() => {
      this.scheduleApply();
      setTimeout(() => this.scheduleApply(), 120);
    });

    this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe(() => {
      this.scheduleApply();
      setTimeout(() => this.scheduleApply(), 120);
    });

    this.scheduleApply();
    setTimeout(() => this.scheduleApply(), 120);
  }

  private scheduleApply(): void {
    if (this.scheduled) return;
    this.scheduled = true;
    setTimeout(() => {
      this.scheduled = false;
      this.apply();
    }, 0);
  }

  private apply(): void {
    const root = this.document.body;
    if (!root) return;

    const map = this.currentMap();
    this.translateElement(root, map);
  }

  private currentMap(): Record<string, string> {
    const value = this.translate.instant('LEGACY_AUTO');
    return value && typeof value === 'object' ? (value as Record<string, string>) : {};
  }

  private translateElement(element: Element, map: Record<string, string>): void {
    if (this.shouldSkipElement(element)) return;

    this.translateAttributes(element, map);

    for (const child of Array.from(element.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE) {
        this.translateTextNode(child as Text, map);
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        this.translateElement(child as Element, map);
      }
    }
  }

  private translateTextNode(node: Text, map: Record<string, string>): void {
    const current = node.textContent ?? '';
    if (!current.trim()) return;

    const source = this.resolveTextSource(node, current, map);
    const translated = this.translateChunk(source, map);

    if (translated !== current) {
      node.textContent = translated;
    }
  }

  private translateAttributes(element: Element, map: Record<string, string>): void {
    const tracked: Array<'placeholder' | 'title' | 'aria-label'> = ['placeholder', 'title', 'aria-label'];
    const sourceMap = this.attrSources.get(element) ?? {};

    for (const attr of tracked) {
      const current = element.getAttribute(attr);
      if (!current || !current.trim()) continue;

      const nextSource = this.resolveAttrSource(current, sourceMap[attr], map);
      sourceMap[attr] = nextSource;

      const translated = this.translateChunk(nextSource, map);
      if (translated !== current) {
        element.setAttribute(attr, translated);
      }
    }

    this.attrSources.set(element, sourceMap);
  }

  private resolveTextSource(node: Text, current: string, map: Record<string, string>): string {
    const stored = this.textSources.get(node);
    if (!stored) {
      this.textSources.set(node, current);
      return current;
    }

    if (this.translate.currentLang === 'fr') {
      this.textSources.set(node, current);
      return current;
    }

    if (current !== this.translateChunk(stored, map)) {
      this.textSources.set(node, current);
      return current;
    }

    return stored;
  }

  private resolveAttrSource(current: string, stored: string | undefined, map: Record<string, string>): string {
    if (!stored) return current;

    if (this.translate.currentLang === 'fr') {
      return current;
    }

    if (current !== this.translateChunk(stored, map)) {
      return current;
    }

    return stored;
  }

  private translateChunk(source: string, map: Record<string, string>): string {
    if (this.translate.currentLang === 'fr') return source;

    const trimmed = source.trim();
    if (!trimmed) return source;

    const match = map[trimmed] ?? map[this.repairMojibake(trimmed)];
    if (!match) return source;

    return source.replace(trimmed, match);
  }

  private repairMojibake(value: string): string {
    try {
      return decodeURIComponent(escape(value));
    } catch {
      return value;
    }
  }

  private shouldSkipElement(element: Element): boolean {
    const tag = element.tagName.toLowerCase();
    return ['script', 'style', 'svg', 'path', 'code', 'pre', 'textarea'].includes(tag);
  }
}
