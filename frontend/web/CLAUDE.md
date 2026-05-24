# frontend/web (Angular)

Angular SPA cho project. Đọc `../../CLAUDE.md` trước nếu mới vào.

## Stack

- Angular **latest** (qua `npx -p @angular/cli@latest ng new`)
- SCSS, routing on, SSR off, **strict mode on**
- Test: Karma + Jasmine (default Angular test runner, cần Chrome cho headless)
- Package manager: npm

## Commands

```bash
npx ng serve                                       # dev server (port 4200)
npx ng build                                       # production build → dist/web/
npx ng test --watch=false --browsers=ChromeHeadless # one-shot tests (cần Chrome)
npx ng lint                                        # nếu đã thêm ESLint package
npx ng generate component <name>                   # scaffold
```

Có thể dùng `npm start` / `npm test` / `npm run build` tương đương (xem `package.json`).

## Gotcha

- **Node 25 không phải LTS.** Build vẫn chạy nhưng có warning. Đây là môi trường của user, không fix trong code. Nếu prod build có vấn đề lạ → suspect Node version trước.
- Mỗi lần generate component / module bằng `ng g` → file mới sẽ default `standalone: true` (Angular 17+). Không tự convert sang NgModule trừ khi user yêu cầu.
- Strict TypeScript đã bật → giữ type chặt, không dùng `any`. Nếu cần escape, dùng `unknown` + narrow.

## Tích hợp với backend

- Base API URL → đặt vào `environments/environment.ts`, KHÔNG hardcode trong service.
- CORS: backend/api (.NET) phải allow origin `http://localhost:4200` cho dev.
- LLM streaming response (nếu có) → dùng `EventSource` hoặc `fetch` + ReadableStream, không Angular HttpClient (HttpClient không hỗ trợ tốt streaming).
