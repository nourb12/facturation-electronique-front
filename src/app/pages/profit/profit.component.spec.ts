import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ProfitComponent } from './profit.component';
import { FactureApiService } from '../../core/services/api.service';

describe('ProfitComponent', () => {
  let component: ProfitComponent;
  let fixture: ComponentFixture<ProfitComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfitComponent],
      providers: [
        {
          provide: FactureApiService,
          useValue: {
            lister: () => of({ items: [], total: 0, page: 1, parPage: 500 })
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ProfitComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
