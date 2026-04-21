# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Package manager: **bun** (`bun.lock`). Do not introduce `npm install`; it creates a stray `package-lock.json` that should not be committed.

- `bun run dev` — Next.js dev server on port 3000, tees output to `dev.log`.
- `bun run build` — `next build` followed by Unix `cp -r` to populate `.next/standalone/` with static assets and `public/`. Build script is **Linux/macOS only** (uses `cp -r`).
- `bun run start` — Runs the standalone production server with `bun`.
- `bun run lint` — ESLint. Config is deliberately permissive (most TS/React rules off); only `react-hooks/exhaustive-deps` is `warn`.
- `bun run db:push | db:generate | db:migrate | db:reset` — Prisma against SQLite.

No test runner is configured; don't add references to one.

`next.config.ts` sets `typescript.ignoreBuildErrors: true` and `reactStrictMode: false`. `tsconfig.json` is `strict: true` but `noImplicitAny: false`. Type errors will **not** block `next build`; run `bunx tsc --noEmit` manually when verifying types. Treat these policy settings as intentional unless the user asks to change them.

## Architecture

Single-page Next.js 16 App Router application that renders a Live2D canvas + control panel. There is no meaningful server logic beyond two AI image-generation API routes; Prisma/SQLite is scaffolded but unused by the Live2D feature.

### Entry point and SSR boundary

`src/app/page.tsx` does `dynamic(() => import('@/components/live2d/VividLifeContent'), { ssr: false })`. **All Live2D code must stay behind this boundary** because `pixi.js` and `pixi-live2d-display` reference `window` at import time. Inside `src/lib/live2d/*`, PIXI is imported lazily via `ensurePixiLoaded()` / `ensurePixi()` helpers — preserve that pattern when adding new modules that touch PIXI.

### Two character-rendering paths sharing one canvas

`Live2DEngine` (`src/lib/live2d/Live2DEngine.ts`) owns the PIXI `Application` and a single `Container`. It exposes a `CharacterMode` of `'live2d' | 'sprite'` and switches between two rendering paths:

1. **Live2D path** — official Cubism 4 models via `pixi-live2d-display`. `VividnessSyncManager` drives breath/blink/lookAt/emotion by broadcasting parameter IDs (`ParamAngleX`, `ParamEyeLOpen`, etc.) into the model. `OutfitPluginLoader` fetches outfit manifests and caches them in IndexedDB (7-day rule). `OcclusionManager` / `OutfitTransitionEffect` handle per-part opacity and blur-particle transitions.
2. **Sprite path** — AI-generated characters. `CharacterGenerator` prompts `/api/generate-character` seven times (base + 6 expressions) and returns a `GeneratedCharacterData`. `SpriteCharacterRenderer` loads those base64 data URLs into PIXI sprites layered on the same container and animates breath/blink/lookAt/sway via its own rAF update loop. This path deliberately reimplements vividness in sprite space — do not try to route it through `VividnessSyncManager`.

Switching paths calls `engine.switchCharacter()` (live2d) or `engine.setSpriteCharacter()` (sprite), each of which tears down the other side's display objects.

### Orchestration hook

`src/hooks/useLive2D.ts` is the one-stop integration point consumed by `VividLifeContent.tsx`. It owns:
- All engine/manager refs (`engineRef`, `syncManagerRef`, `spriteRendererRef`, etc.).
- The rAF loop for sprite animation (`startSpriteAnimation` / `stopSpriteAnimation`). Delta is capped at 100 ms to avoid tab-refocus jumps; keep that cap when touching the loop.
- `activeGenerationIdRef` — a monotonic counter bumped on each `generateLive2DCharacter` call and on unmount cleanup. Every `await` in the generation/display paths checks `isStale()` to discard results from superseded or unmounted generations. Preserve this guard when adding new async steps — there is no `AbortController` on the fetches.
- A 100 ms throttle on `setSpriteState` to avoid per-frame React re-renders.

### AI generation

`src/lib/ai/imageGen.ts` is the single entry point to `z-ai-web-dev-sdk`. Both `src/app/api/generate-character/route.ts` and `src/app/api/generate-portrait/route.ts` go through it. Responses are `data:image/png;base64,...` strings; the seven-part generation transfers ~70–140 MB per character to the client, so treat `generatedCharacters` memory growth as a known constraint.

Prompts are constructed in `CharacterGenerator.buildBasePrompt` / `buildExpressionPrompt` — edit those static builders rather than inlining prompt strings at call sites.

### Static assets

- `public/live2d/cubism4/live2dcubismcore.min.js` — loaded at runtime by `Live2DEngine.loadCubismCore()` via `<script src>` injection; keep that path stable.
- `public/live2d/models/base` and `public/live2d/models/outfits` — bundled Live2D model assets referenced by `ModelLibrary.ts` presets.
- `next.config.ts` sets `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` on `/live2d/*` — required for Cubism WASM to work. Don't remove these headers.

## Conventions specific to this repo

- `'use client';` is required on every file in `src/lib/live2d/*` and `src/hooks/useLive2D.ts`. Copy the pattern when adding sibling files.
- When destroying PIXI display objects, **always check `if (obj.parent) container.removeChild(obj)` before `obj.destroy()`** (the `clearAllModels` / `removeOutfit` pattern). Calling `removeChild` on an orphan is a silent runtime error.
- User-facing notifications go through `toast()` from `@/hooks/use-toast` (shadcn + sonner, already mounted via `<Toaster />` in `src/app/layout.tsx`). Do not add `alert()` / `confirm()` / `prompt()`.
- Commit messages are Japanese, imperative, one-line summary followed by bullet list of changes (see `git log --oneline`). Keep that style.
- `worklog.md` is an append-only record of previous task cycles with IDs like `Task ID: 3-1 to 3-9`. Read it for historical context on why certain modules exist; don't edit it for new work.
