import {
  HttpErrorResponse,
  HttpEvent,
  HttpInterceptorFn,
  HttpResponse,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { API_CONFIG } from './api.config';
import { toCamel, toSnake } from './case';

const MOCK_PATH_PREFIXES = [
  '/auth/login',
  '/auth/logout',
  '/search',
  '/users',
  '/roles',
  '/permissions',
  '/account/activity',
];

function startsWithPrefix(path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(`${prefix}/`) || path.startsWith(`${prefix}?`);
}

export function isMockPath(path: string, method: string): boolean {
  if (MOCK_PATH_PREFIXES.some((p) => startsWithPrefix(path, p))) {
    return true;
  }
  if (path === '/documents' || path.startsWith('/documents?')) return true;
  if (path.startsWith('/documents/')) {
    const tail = path.slice('/documents/'.length);
    // /documents/{id}/tags → real backend; other sub-paths still mock.
    if (tail.includes('/')) {
      const [, sub] = tail.split('/');
      if (sub === 'tags') return false;
      return true;
    }
    return method.toUpperCase() !== 'GET';
  }
  return false;
}

export const caseInterceptor: HttpInterceptorFn = (req, next) => {
  const config = inject(API_CONFIG);
  if (!req.url.startsWith(config.baseUrl)) {
    return next(req);
  }
  const path = req.url.slice(config.baseUrl.length);
  if (isMockPath(path, req.method)) {
    return next(req);
  }

  const transformedReq = req.body !== null && req.body !== undefined
    ? req.clone({ body: toSnake(req.body) })
    : req;

  return next(transformedReq).pipe(
    map((event: HttpEvent<unknown>) => {
      if (event instanceof HttpResponse && event.body !== null && event.body !== undefined) {
        return event.clone({ body: toCamel(event.body) });
      }
      return event;
    }),
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse && err.error && typeof err.error === 'object') {
        return throwError(() => new HttpErrorResponse({
          error: toCamel(err.error),
          headers: err.headers,
          status: err.status,
          statusText: err.statusText,
          url: err.url ?? undefined,
        }));
      }
      return throwError(() => err);
    })
  );
};
