import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AppLoggerService {
  warn(message: string, ...args: unknown[]): void {
    if (!environment.production) {
      console.warn(message, ...args);
    }
  }

  error(message: string, ...args: unknown[]): void {
    if (!environment.production) {
      console.error(message, ...args);
    }
  }
}
