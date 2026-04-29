import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { AdminAuditComponent } from './admin-audit.component';

describe('AdminAuditComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminAuditComponent, NoopAnimationsModule, HttpClientTestingModule],
      providers: [provideRouter([])],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(AdminAuditComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });
});