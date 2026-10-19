---
name: nextjs-frontend
description: Implement maintainable Next.js App Router and TypeScript UI behavior, accessibility, responsive PWA integration, and frontend verification.
---

# Next.js frontend

Use for `apps/web/src/`, routes, UI, accessibility, state, service-worker integration, and frontend tests.

- Preserve App Router and strict TypeScript. Put domain/IO behavior in feature or library modules, keep components focused, and do not bypass `lib/api.ts`, storage, or compatibility contracts.
- Support keyboard navigation, visible focus, responsive/mobile layout, status/error states, and no decorative inert controls. Retain offline paths that do not require API/S3.
- Do not expose server secrets in `NEXT_PUBLIC_*`, build output, browser logs, or tests. Preserve current COOP/COEP headers and same-origin gateway behavior.
- Run `npm test`, `npm run lint`, `npm run typecheck`, and `npm run build` from `apps/web`; run focused Playwright/Chromium cases for interaction changes.

Browser acceptance must demonstrate real DOM/runtime behavior. Simulated device or controller evidence is labelled as simulated.
