import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { RoleSelectionPageComponent } from './role-selection-page.component';
import { ThemeService } from '../../../core/services/theme.service';

class ThemeServiceStub { toggle = jasmine.createSpy('toggle'); }

describe('RoleSelectionPageComponent', () => {
  let router: Router;
  let themeStub: ThemeServiceStub;

  beforeEach(async () => {
    themeStub = new ThemeServiceStub();

    await TestBed.configureTestingModule({
      imports: [RouterTestingModule, RoleSelectionPageComponent],
      providers: [
        { provide: ThemeService, useValue: themeStub },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
  });

  const create = () => TestBed.createComponent(RoleSelectionPageComponent).componentInstance;

  it('selectEntreprise redirige vers /register', () => {
    const cmp = create();
    cmp.selectEntreprise();
    expect(router.navigate).toHaveBeenCalledWith(['/register']);
  });

  it('selectFinancier redirige vers /login/financier', () => {
    const cmp = create();
    cmp.selectFinancier();
    expect(router.navigate).toHaveBeenCalledWith(['/login/financier']);
  });

  it('toggleTheme délègue au ThemeService', () => {
    const cmp = create();
    cmp.toggleTheme();
    expect(themeStub.toggle).toHaveBeenCalled();
  });
});