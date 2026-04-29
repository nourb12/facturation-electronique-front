import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { FacturesComponent } from './factures.component';

describe('FacturesComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FacturesComponent, NoopAnimationsModule, HttpClientTestingModule],
      providers: [provideRouter([])],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(FacturesComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });
});