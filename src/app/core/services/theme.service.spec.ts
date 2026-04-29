import { TestBed, fakeAsync, flush } from '@angular/core/testing';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  let originalMatchMedia: any;

  beforeEach(() => {
    originalMatchMedia = window.matchMedia;
    (window as any).matchMedia = (q: string) => ({ matches: q === '(prefers-color-scheme: light)' });
    document.documentElement.dataset['theme'] = '';
    localStorage.clear();

    TestBed.configureTestingModule({ providers: [ThemeService] });
  });

  afterEach(() => {
    (window as any).matchMedia = originalMatchMedia;
    localStorage.clear();
  });

  const getService = () => TestBed.inject(ThemeService);

  it('prend le thème sauvegardé si présent', fakeAsync(() => {
    localStorage.setItem('ey-theme', 'light');
    const service = getService();
    flush();
    expect(service.theme()).toBe('light');
    expect(document.documentElement.dataset['theme']).toBe('light');
  }));

  it('toggle bascule dark/light et persiste', fakeAsync(() => {
    const setItemSpy = spyOn(localStorage, 'setItem').and.callThrough();
    const service = getService();
    flush();
    const first = service.theme();
    service.toggle();
    flush();
    expect(service.theme()).not.toBe(first);
    expect(setItemSpy).toHaveBeenCalledWith('ey-theme', service.theme());
  }));

  it('set applique le thème donné', fakeAsync(() => {
    const service = getService();
    service.set('dark');
    flush();
    expect(service.theme()).toBe('dark');
    expect(document.documentElement.dataset['theme']).toBe('dark');
  }));

  it('isDark reflète le signal', fakeAsync(() => {
    const service = getService();
    service.set('dark');
    flush();
    expect(service.isDark()).toBeTrue();
    service.set('light');
    flush();
    expect(service.isDark()).toBeFalse();
  }));
});