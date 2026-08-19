import { HttpInterceptorFn } from '@angular/common/http';

export const clientHttpDiagnosticsInterceptor: HttpInterceptorFn = (req, next) => next(req);
