import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthResponse, LoginRequest, RegisterRequest } from '../../shared/models/auth.model';
import { RefreshRequest } from '../../shared/models/refresh-request.model';


@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  constructor() {
    this.tryRestoreSession();
  }
  /**
   * Intenta restaurar la sesión usando el refreshToken si el accessToken está expirado.
   */
  private tryRestoreSession(): void {
    const expiresAt = localStorage.getItem(this.EXPIRES_AT_KEY);
    const refreshToken = localStorage.getItem(this.REFRESH_TOKEN_KEY);
    const now = new Date().getTime();
    if (expiresAt && refreshToken && now > parseInt(expiresAt)) {
      // accessToken expirado, intentar renovar
      this.refreshTokenRequest().subscribe({
        next: () => {
          this.authStatusSubject.next(true);
        },
        error: () => {
          this.logout();
        }
      });
    }
  }

  // Asigna un equipo al usuario actual
  assignTeamToUser(teamId: string): Observable<any> {
    return this.http.post(`${environment.apiUrl}/auth/assign-team`, { teamId }, { responseType: 'text' });
  }

  private readonly TOKEN_KEY = 'accessToken';
  private readonly REFRESH_TOKEN_KEY = 'refreshToken';
  private readonly EXPIRES_AT_KEY = 'expiresAt';

  private authStatusSubject = new BehaviorSubject<boolean>(this.isAuthenticated());
  public authStatus$ = this.authStatusSubject.asObservable();

  login(email: string, password: string): Observable<AuthResponse> {
    const request: LoginRequest = { email, password };
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/login`, request).pipe(
      tap(response => this.handleAuthResponse(response))
    );
  }

  register(email: string, username: string, password: string): Observable<AuthResponse> {
    const request: RegisterRequest = { email, username, password };
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/register`, request).pipe(
      tap(response => this.handleAuthResponse(response))
    );
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.EXPIRES_AT_KEY);
    if (this.authStatusSubject) {
      this.authStatusSubject.next(false);
    }
    this.router.navigate(['/login']);
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    const expiresAt = localStorage.getItem(this.EXPIRES_AT_KEY);
    const refreshToken = localStorage.getItem(this.REFRESH_TOKEN_KEY);
    const now = new Date().getTime();
    if (!token || !expiresAt) {
      return false;
    }
    if (now < parseInt(expiresAt)) {
      return true;
    }
    // Si el accessToken está expirado pero hay refreshToken, intentar renovar de forma síncrona
    if (refreshToken) {
      this.refreshTokenRequest().subscribe({
        next: () => {
          this.authStatusSubject.next(true);
        },
        error: () => {
          this.logout();
        }
      });
      // Considerar autenticado mientras se intenta renovar
      return true;
    }
    return false;
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  // Obtiene la información del usuario actual (id, nombre y equipo)
  getUserInfo(): Observable<{ id: string; username: string; email: string; teamId?: string; teamName?: string }> {
    return this.http.get<{ id: string; username: string; email: string; teamId?: string; teamName?: string }>(`${environment.apiUrl}/auth/me`);
  }

  private handleAuthResponse(response: AuthResponse): void {
    const expiresAt = new Date().getTime() + response.expiresIn * 1000;

    localStorage.setItem(this.TOKEN_KEY, response.accessToken);
    localStorage.setItem(this.REFRESH_TOKEN_KEY, response.refreshToken);
    localStorage.setItem(this.EXPIRES_AT_KEY, expiresAt.toString());

    this.authStatusSubject.next(true);
  }

    refreshTokenRequest(): Observable<AuthResponse> {
    const refreshToken = localStorage.getItem(this.REFRESH_TOKEN_KEY);
    if (!refreshToken) {
      return new Observable<AuthResponse>((subscriber) => {
        subscriber.error('No refresh token');
      });
    }
    const request: RefreshRequest = { refreshToken };
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/refresh`, request).pipe(
      tap(response => this.handleAuthResponse(response))
    );
  }
}
