import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class TokenRefreshService {
  private _isRefreshing = false;
  readonly refreshDone$ = new BehaviorSubject<boolean>(false);

  get isRefreshing(): boolean {
    return this._isRefreshing;
  }

  startRefresh(): void {
    this._isRefreshing = true;
    this.refreshDone$.next(false);
  }

  endRefresh(success: boolean): void {
    this._isRefreshing = false;
    this.refreshDone$.next(success);
  }
}
