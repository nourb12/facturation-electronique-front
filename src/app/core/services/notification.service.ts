
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private http = inject(HttpClient);
  private api  = environment.apiUrl;





  envoyerEmailBienvenue(userId: string) {
    return this.http.post(`${this.api}/notifications/email/bienvenue`, { userId });
  }

  envoyerSmsVerification(telephone: string, code: string) {
    return this.http.post(`${this.api}/notifications/sms/verification`, { telephone, code });
  }

  envoyerNotificationFacture(factureId: string, type: string) {
    return this.http.post(`${this.api}/notifications/facture`, { factureId, type });
  }
}
