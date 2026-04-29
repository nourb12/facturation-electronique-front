import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { OnboardingWizardComponent } from './onboarding-wizard.component';

describe('OnboardingWizardComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OnboardingWizardComponent, NoopAnimationsModule, HttpClientTestingModule],
      providers: [provideRouter([])],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(OnboardingWizardComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });
});