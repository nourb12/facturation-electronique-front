import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PaieComponent } from './paie.component';

describe('PaieComponent', () => {
  let component: PaieComponent;
  let fixture: ComponentFixture<PaieComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaieComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(PaieComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
