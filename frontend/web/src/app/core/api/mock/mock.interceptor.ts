import {
  HttpEvent,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest,
  HttpResponse,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';

import { API_CONFIG } from '../api.config';
import {
  DocumentItem,
  Page,
  Role,
  SearchQuery,
  SearchResult,
  User,
} from '../../models';

import { DOCUMENTS } from './documents.fixture';
import { HISTORY } from './history.fixture';
import { PERMISSIONS } from './permissions.fixture';
import { ROLES } from './roles.fixture';
import { USERS, CURRENT_USER_ID } from './users.fixture';
import { ACTIVITY } from './activity.fixture';
import { highlight, makeSnippet } from '../../util/highlight';

let documents = [...DOCUMENTS];
let roles = [...ROLES];
let users = [...USERS];
let history = [...HISTORY];

function jsonOk<T>(body: T, delayMs = 200): Observable<HttpEvent<T>> {
  return of(new HttpResponse({ status: 200, body })).pipe(delay(delayMs));
}

function paginate<T>(items: T[], page = 1, pageSize = 20): Page<T> {
  const start = (page - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    total: items.length,
    page,
    pageSize,
  };
}

function search(q: string, mode: 'keyword' | 'semantic' | 'hybrid'): SearchResult[] {
  if (!q.trim()) return [];
  const terms = q
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 1);
  const scored = documents
    .map((d) => {
      const haystack = `${d.title} ${d.summary} ${d.body ?? ''}`.toLowerCase();
      let hits = 0;
      for (const t of terms) {
        const re = new RegExp(t, 'gi');
        hits += (haystack.match(re) ?? []).length;
      }
      const baseScore =
        hits === 0 ? 0 : Math.min(1, hits / Math.max(terms.length * 2, 4));
      const semanticBoost =
        mode === 'semantic' || mode === 'hybrid'
          ? Math.max(0, 0.35 - 0.05 * Math.abs(d.title.length - q.length * 4) / 80)
          : 0;
      const score = Math.min(1, baseScore + semanticBoost);
      return { d, score, hits };
    })
    .filter((r) => r.hits > 0 || (mode !== 'keyword' && r.score > 0.2))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  return scored.map(({ d, score }) => ({
    documentId: d.id,
    score,
    highlights: [
      { field: 'title' as const, snippet: highlight(d.title, q) },
      { field: 'summary' as const, snippet: highlight(makeSnippet(d.summary, q, 80), q) },
    ],
  }));
}

function makeAnswer(q: string, results: SearchResult[]): {
  text: string;
  citations: { index: number; documentId: string; quote: string }[];
} {
  if (results.length === 0) {
    return {
      text: `Chưa tìm thấy tài liệu nào khớp với "${q}". Thử mở rộng từ khóa hoặc chuyển sang chế độ ngữ nghĩa.`,
      citations: [],
    };
  }
  const top = results.slice(0, 3);
  const citations = top.map((r, i) => {
    const d = documents.find((x) => x.id === r.documentId)!;
    return {
      index: i + 1,
      documentId: r.documentId,
      quote: d.summary.slice(0, 140),
    };
  });
  const refs = citations.map((c) => `[${c.index}]`).join(' ');
  const lead = `Theo các tài liệu trong kho lưu trữ${refs ? ' ' + refs : ''}, "${q}" được đề cập với các góc tiếp cận sau:`;
  const bullets = top
    .map((r, i) => {
      const d = documents.find((x) => x.id === r.documentId)!;
      return `\n— [${i + 1}] ${d.title}: ${d.summary.slice(0, 160)}`;
    })
    .join('');
  return {
    text: `${lead}${bullets}\n\nGợi ý: mở từng tài liệu để xem chi tiết, hoặc thu hẹp tìm kiếm bằng bộ lọc loại file và tag.`,
    citations,
  };
}

function matchUrl(url: string, pattern: RegExp): RegExpMatchArray | null {
  return url.match(pattern);
}

export const mockInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
  const config = inject(API_CONFIG);
  if (!config.useMock) return next(req);

  const url = req.url;
  if (!url.startsWith(config.baseUrl)) return next(req);

  const path = url.slice(config.baseUrl.length);
  const method = req.method.toUpperCase();

  // --- DOCUMENTS ---
  // GET /documents/{id} is served by the real backend; all other document operations stay mock.
  if (path.startsWith('/documents')) {
    const idMatch = matchUrl(path, /^\/documents\/([^/?]+)$/);
    if (idMatch && method === 'PATCH') {
      const patch = req.body as Partial<DocumentItem>;
      documents = documents.map((d) =>
        d.id === idMatch[1] ? { ...d, ...patch, updatedAt: new Date().toISOString() } : d
      );
      return jsonOk(documents.find((d) => d.id === idMatch[1]), 180);
    }
    if (idMatch && method === 'DELETE') {
      documents = documents.filter((d) => d.id !== idMatch[1]);
      return jsonOk({ ok: true }, 180);
    }
    if (path.startsWith('/documents') && method === 'GET') {
      const params = req.params;
      const q = params.get('q')?.toLowerCase() ?? '';
      const type = params.get('type') ?? '';
      const tag = params.get('tag') ?? '';
      const sort = params.get('sort') ?? 'updatedAt';
      const page = Number(params.get('page') ?? 1);
      const pageSize = Number(params.get('pageSize') ?? 20);
      let filtered = documents.slice();
      if (q)
        filtered = filtered.filter(
          (d) =>
            d.title.toLowerCase().includes(q) ||
            d.summary.toLowerCase().includes(q)
        );
      if (type) filtered = filtered.filter((d) => d.type === type);
      if (tag) filtered = filtered.filter((d) => d.tagIds.includes(tag));
      filtered.sort((a, b) => {
        if (sort === 'title') return a.title.localeCompare(b.title, 'vi');
        if (sort === 'uploadedAt') return b.uploadedAt.localeCompare(a.uploadedAt);
        return b.updatedAt.localeCompare(a.updatedAt);
      });
      return jsonOk(paginate(filtered, page, pageSize), 220);
    }
    // POST /documents is now served by the real backend (multipart upload). Pass through.
  }

  // --- SEARCH ---
  if (path === '/search' && method === 'POST') {
    const body = req.body as { q: string; mode: 'keyword' | 'semantic' | 'hybrid' };
    const started = performance.now();
    const results = search(body.q, body.mode);
    const answer = body.mode !== 'keyword' ? makeAnswer(body.q, results) : null;
    const duration = Math.round(performance.now() - started) + 120;
    history = [
      {
        id: `q-${Date.now()}`,
        userId: CURRENT_USER_ID,
        q: body.q,
        mode: body.mode,
        filters: {},
        executedAt: new Date().toISOString(),
        resultCount: results.length,
        durationMs: duration,
        pinned: false,
      },
      ...history,
    ];
    return jsonOk({ results, answer, durationMs: duration }, 260);
  }

  // --- HISTORY ---
  if (path === '/search/history' && method === 'GET') {
    return jsonOk<SearchQuery[]>(history.filter((h) => h.userId === CURRENT_USER_ID), 140);
  }
  const historyIdMatch = matchUrl(path, /^\/search\/history\/([^/?]+)$/);
  if (historyIdMatch && method === 'DELETE') {
    history = history.filter((h) => h.id !== historyIdMatch[1]);
    return jsonOk({ ok: true }, 100);
  }
  const historyPinMatch = matchUrl(path, /^\/search\/history\/([^/?]+)\/pin$/);
  if (historyPinMatch && method === 'POST') {
    history = history.map((h) =>
      h.id === historyPinMatch[1] ? { ...h, pinned: !h.pinned } : h
    );
    return jsonOk(history.find((h) => h.id === historyPinMatch[1]), 100);
  }

  // --- USERS ---
  if (path === '/users' && method === 'GET') {
    return jsonOk<User[]>(users, 180);
  }
  const userIdMatch = matchUrl(path, /^\/users\/([^/?]+)$/);
  if (userIdMatch && method === 'GET') {
    const u = users.find((x) => x.id === userIdMatch[1]);
    if (!u) return throwError(() => ({ status: 404 })).pipe(delay(100));
    return jsonOk(u, 140);
  }
  if (userIdMatch && method === 'PATCH') {
    const patch = req.body as Partial<User>;
    users = users.map((u) => (u.id === userIdMatch[1] ? { ...u, ...patch } : u));
    return jsonOk(users.find((u) => u.id === userIdMatch[1]), 180);
  }

  // --- ROLES ---
  if (path === '/roles' && method === 'GET') {
    return jsonOk<Role[]>(roles, 140);
  }
  const roleIdMatch = matchUrl(path, /^\/roles\/([^/?]+)$/);
  if (roleIdMatch && method === 'GET') {
    const r = roles.find((x) => x.id === roleIdMatch[1]);
    if (!r) return throwError(() => ({ status: 404 })).pipe(delay(100));
    return jsonOk(r, 140);
  }
  if (roleIdMatch && method === 'PATCH') {
    const patch = req.body as Partial<Role>;
    roles = roles.map((r) => (r.id === roleIdMatch[1] ? { ...r, ...patch } : r));
    return jsonOk(roles.find((r) => r.id === roleIdMatch[1]), 220);
  }

  // --- PERMISSIONS ---
  if (path === '/permissions' && method === 'GET') {
    return jsonOk(PERMISSIONS, 100);
  }

  // --- ACTIVITY ---
  if (path === '/account/activity' && method === 'GET') {
    return jsonOk(ACTIVITY, 140);
  }

  // Pass through if not matched
  return next(req);
};
