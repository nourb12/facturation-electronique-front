import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { NotificationService } from './notification.service';
import { environment } from '../../../environments/environment';

describe('NotificationService', () => {
  let service: NotificationService;
  let httpMock: HttpTestingController;
  const api = environment.apiUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [NotificationService],
    });
    service = TestBed.inject(NotificationService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('envoyerEmailBienvenue poste userId', () => {
    service.envoyerEmailBienvenue('u1').subscribe();
    const req = httpMock.expectOne(`${api}/notifications/email/bienvenue`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ userId: 'u1' });
    req.flush({});
  });

  it('envoyerSmsVerification poste telephone et code', () => {
    service.envoyerSmsVerification('123', '9999').subscribe();
    const req = httpMock.expectOne(`${api}/notifications/sms/verification`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ telephone: '123', code: '9999' });
    req.flush({});
  });

  it('envoyerNotificationFacture poste factureId et type', () => {
    service.envoyerNotificationFacture('f1', 'PAYEE').subscribe();
    const req = httpMock.expectOne(`${api}/notifications/facture`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ factureId: 'f1', type: 'PAYEE' });
    req.flush({});
  });
});