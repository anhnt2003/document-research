import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { AuthStore } from './auth.store';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthStore);
  const token = auth.token();
  if (token && !req.headers.has('Authorization')) {
    return next(
      req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    );
  }
  return next(req);
};
