import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { catchError, switchMap } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  // Solo excluir login y register, agregar token a todo lo demás
  const isAuthLoginOrRegister =
    req.url.includes('/auth/login') || req.url.includes('/auth/register') || req.url.includes('/auth/refresh');

  if (token && !isAuthLoginOrRegister) {
    const clonedRequest = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
    return next(clonedRequest).pipe(
      catchError((error: HttpErrorResponse) => {
        // Si el token expiró, intentar refrescar
        if (error.status === 401 && authService.getToken() && localStorage.getItem('refreshToken')) {
          return authService.refreshTokenRequest().pipe(
            switchMap(() => {
              const newToken = authService.getToken();
              const retriedRequest = req.clone({
                setHeaders: {
                  Authorization: `Bearer ${newToken}`
                }
              });
              return next(retriedRequest);
            })
          );
        }
        throw error;
      })
    );
  }

  return next(req);
};
