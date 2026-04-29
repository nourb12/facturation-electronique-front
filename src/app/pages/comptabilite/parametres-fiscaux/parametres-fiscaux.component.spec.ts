import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ParametresFiscauxComponent } from './parametres-fiscaux.component';

describe('ParametresFiscauxComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ParametresFiscauxComponent, NoopAnimationsModule, HttpClientTestingModule],
      providers: [provideRouter([])],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(ParametresFiscauxComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });
});