# Portfolio

A React/Vite portfolio with a fixed overview, reusable sidebar, and live views and likes.

## Run locally

Use Node.js 24 or newer, then run:

```sh
npm install
npm run dev
```

Vite starts the frontend, stats API, and portfolio assistant API together. `npm run preview` also includes both APIs. Stats use Supabase; the assistant uses OpenRouter. Configure the server variables in `.env` before starting.

## Overview and guided tour

The overview uses the portraits in `src/assets/avatar-me` to look toward the cursor in eight directions. The orbital rings stay in place, with independently orbiting dots. A larger dot grid sits at the top right. Touch input keeps the portrait facing forward, and reduced motion disables orbit animations and crossfades.

An automatic cursor tour starts when the intro loading screen finishes and the homepage opens. It points to the avatar, six social links, navigation links, selected projects, experience, toolkit, views, likes, and contact links while staying on the homepage. The cursor travels with a small Ernest name tag, then opens a black typewriter tooltip when it reaches each item. On mobile, the navigation menu opens when a sidebar item is being explained.

Use Pause/Resume, Next/Back, the arrow keys, Skip tour, or Escape. Interacting with a page pauses the tour; clicking a navigation link yourself ends it and follows your chosen link. Switching browser tabs suspends the automatic timer. **Take the tour again** restarts it; refreshing or returning to Overview does not automatically repeat the tour. The tour never clicks links or changes browser history.

Playground music belongs to a persistent app provider, so opening, restarting, or switching games keeps the same track playing at its current position. Returning to Playground lets you pause, change tracks, seek, or adjust the volume. Game sound effects have their own controls.

## Contact

`/contact` contains the contact details and an email draft form. Name, email, and message are required; the selected topic becomes the subject. **Send message opens the visitor's email app with a draft**, which they must send themselves. No email delivery service is configured, and the form does not upload or store its fields. The copy button copies the public email address and reports clipboard failures.

Social icons start monochrome and show their brand colors on hover or keyboard focus. GitHub and X remain their brand's dark colors. The overview and contact page share verified profile URLs from `src/lib/social-profiles.ts`. Keep the public contact facts in `server/portfolio-context.ts` in sync when details change.

## Typing test

The **Typing test** link (or Alt + X) opens `/typing-test`. Choose a timed test (15, 30, 60, or 120 seconds) or a word target (10, 25, 50, or 100), in English or Filipino. The first character starts the test. Correct and incorrect characters are highlighted, and the passage follows the cursor as you type.

WPM uses correct characters divided by five and elapsed minutes. Accuracy counts correct character entries against all entries, so using Backspace does not erase a previous mistake from the score. Paste is disabled. Tab from the typing field, then Enter, restarts the test; Escape returns to the previous portfolio page. Scores stay in this page and are not uploaded. Run `npm run test:typing` to check scoring, timing, and reset behavior.

## Erza — portfolio assistant

The **Ask anything** link (or Alt + Y) opens Erza at `/ask`. Escape returns to the previous portfolio page, or Overview when opened directly. Enter sends, Shift + Enter adds a line, and Stop cancels the current response. New chat clears the conversation. Chat history is kept in memory while this page is open; a bounded recent history is sent for follow-up questions.

Erza uses `src/assets/avatargroup/avatar5.png` on the welcome screen and beside her replies. Responses support project headings, bold text, lists, tool summaries, and safe links, with a copy button for each reply. The composer stays visible while the conversation scrolls on desktop and mobile.

Create `.env` from `.env.example` if needed, then set:

```dotenv
OPENROUTER_API_KEY=your_openrouter_api_key
OPENROUTER_MODEL=openai/gpt-6-sol-pro
```

Restart the server after changing environment variables. Keep the key server-side: do not prefix it with `VITE_`. `.env` and `.env.local` are ignored by Git; `.env.example` contains no credentials. For deployment, set the same variables in the Vercel project environment. Existing process variables take precedence over local files.

The browser posts to `/api/portfolio-ai`; the server sends requests to [OpenRouter's Chat Completions API](https://openrouter.ai/docs/quickstart) using the configured model. It provides the public facts in `server/portfolio-context.ts`, which should be updated alongside the portfolio. The assistant does not have access to private files or contact details beyond those facts. Requests have size, concurrency, rate, and timeout limits. Error messages do not expose upstream credentials. Rate and concurrency limits use temporary memory within each function instance; they are not a distributed rate limiter. Chat messages and replies are never written to Supabase, files, or server logs.

If the assistant is unavailable, verify the key, account credits, and model access in OpenRouter. The interface supports retrying without duplicating the question. No fallback model is selected automatically.

## Supabase setup and Vercel deployment

The runtime uses Supabase's HTTPS Data API, so it needs no local database file or persistent server disk. Views and likes use database functions that commit each change atomically. Browser keys cannot access visitor records or modify these functions.

Configure these **server-only** variables locally and in Vercel **Settings > Environment Variables** for the deployment environments you use:

```dotenv
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SECRET_KEY=sb_secret_...
OPENROUTER_API_KEY=your_openrouter_api_key
OPENROUTER_MODEL=your_openrouter_model
```

Do not give secret keys a `VITE_` prefix. `SUPABASE_PUBLISHABLE_KEY` and the `VITE_SUPABASE_*` values are optional public client settings; the engagement API itself only requires the server URL and secret key.

For a new Supabase project, set `DIRECT_URL` (or `DATABASE_URL`) to its PostgreSQL connection URL and run:

```sh
npm run db:setup
```

This applies the idempotent stats migration in `supabase/migrations/`. The supplied project has already been initialized. Database tooling verifies TLS with the public production CA certificates from the [official Supabase CLI source](https://github.com/supabase/cli/tree/main/apps/cli-go/internal/gen/types/templates). Direct PostgreSQL credentials are only used by setup, import, and database tests, not by the deployed API.

The optional one-time importer preserves existing local views and likes:

```sh
npm run db:import-legacy
```

Only this importer reads the previous SQLite file. The running application uses Supabase exclusively. The original file is retained under the ignored `data/` directory.

Deploy using Vercel's Vite preset, build command `npm run build`, output directory `dist`, and Node.js 24. `vercel.json` preserves API routes and provides the SPA fallback. The functions in `api/` serve stats and the stateless AI endpoint. After adding environment variables, redeploy so the functions receive them. AI conversations stay in browser memory while the chat page is open; each request forwards the bounded history to OpenRouter and returns a reply.

Select **Production** for all four server variables when deploying the public site; add **Preview** if preview deployments should use them too. Paste each value without the surrounding quotes from a dotenv file. No `ORIGIN`, `HOST`, or `PORT` variable is needed on Vercel: browser requests use `/api/` on the same website domain, and the server checks that origin automatically. Supabase Auth redirect URLs are not used by the anonymous views/likes API. `DIRECT_URL` and `DATABASE_URL` are only needed for the database tools.

Deploy the repository root, including `api/`, `server/`, `tsconfig.json`, and `vercel.json`; uploading only `dist/` serves the frontend without the backend. The root TypeScript options explicitly configure Node and rewrite relative `.ts` imports to `.js` for compiled Vercel functions. Vercel does not use TypeScript project references to discover those options. The visit and like endpoints have explicit function files so they resolve before the API 404 fallback. A successful Vite build alone does not verify the function artifacts.

For a normal Node host, `npm run build && npm start` still serves the website and both APIs. Set `PORT` and `HOST` if needed, and `NODE_ENV=production` when serving HTTPS so visitor cookies are secure.

## Count behavior

- A view is one browser-tab visit, registered when the app opens (including the intro). Refreshing, React development remounts, and navigating back to Overview do not add another view in that tab session.
- A new tab normally starts another visit. Browsers can copy session storage when duplicating a tab; those duplicated tabs share the original visit ID.
- Likes are stored per anonymous browser cookie. The heart toggles like/unlike, and repeated requests do not create extra likes. The cookie lasts one year.
- Counts are stored in Supabase and refreshed every 10 seconds while the tab is visible. Like changes update immediately. Reads resume when the tab becomes visible or the browser reconnects, and failures retry automatically. There are no long-lived event streams or process-local broadcasts.
- The avatars use the installed Animate UI group and generic silhouettes for anonymous visitors. The number of avatars and the extra-visitor badge reflect recorded visitors; no profile photos or names are collected.
- A different browser, cleared cookies, or private browsing represents a new anonymous visitor. These are anonymous engagement counters, not authenticated unique-person analytics or an abuse-proof voting system.
- Failed connections show unavailable/retry UI rather than invented counts. The counters start from zero; previous screenshot numbers are not imported.

## Navigation

Portfolio links use normal paths such as `/projects` and update through the browser History API without reloading the document. The sidebar stays mounted; only the content and active navigation item subscribe to route changes. Content enters with a 180 ms fade and slight movement, disabled when reduced motion is requested.

The included production server serves `index.html` for browser requests to client routes, so direct links and refreshes work. If deploying the frontend with another static host, configure the same SPA fallback while keeping `/api/` pointed at the stats service.

## Components

- `src/pages/HomePage.tsx`: homepage content only.
- `src/components/Sidebar.tsx`: navigation, Animate UI avatars, and live engagement controls.
- `src/components/PortfolioLayout.tsx`: shared fixed viewport layout, internal link handling, and scroll lock.
- `src/components/PortfolioContent.tsx`: routed content, transition, and heading focus.
- `src/lib/navigation.ts`: History API navigation and Back/Forward subscriptions.
- `src/hooks/useSiteStats.ts`: browser session registration, live connection, and like actions.
- `server/site-stats.ts`: persistence and API; `server/index.ts`: production web server.

## Checks

```sh
npm run build
npm run test:stats
npm run test:ai
npm run test:vercel
npm run lint
```

Run `npm run test:vercel` to emit the API functions using the root TypeScript options, load the compiled artifacts, and verify Vercel-parsed bodies and stateless AI requests with mocked providers. This check needs no credentials or paid AI calls.

Backend tests cover visit deduplication, separate visitors, like/unlike behavior, shared server instances, Vercel-parsed bodies, and invalid requests. Run `npm run test:stats:db` with database credentials to verify live PostgreSQL transactions, concurrent RPC retries, persistence, RLS, and browser access restrictions. Temporary test records are removed afterward. Existing lint issues in the Animate UI tooltip/slot and shared button components are separate from the stats implementation.


## Playground music

The music icon opens a picker containing Sparkle, Zen Zen Zense, and Gurenge from `src/components/Playground/music/`. Select a track or use play/pause, previous/next, seek, and volume. The speaker icon toggles mute. Playback begins after a click, tracks advance automatically, and volume, mute, and track selection are remembered locally. The same audio continues playing across portfolio pages and games until paused in the player.

## Performance audits

The first screen loads only its own JavaScript and CSS. Portfolio pages, games, the assistant, and the tour load when opened. Images use checked-in WebP variants; run `npm run optimize:images` after replacing an original image. The intro uses CSS dots until mouse interaction, and its canvas stops drawing when settled or hidden.

Run `npm run build`, then `npm run audit:performance`. Install the test browser first with `PLAYWRIGHT_BROWSERS_PATH=./node_modules/.cache/playwright npx playwright install chromium` (in PowerShell, set `$env:PLAYWRIGHT_BROWSERS_PATH` before running `npx.cmd playwright install chromium`). The audit starts a production static server, uses fixture engagement counts without credentials or database writes, and saves mobile and desktop Lighthouse HTML/JSON reports under `artifacts/pagespeed/`. It fails if any scored category is below 90. To audit a deployed version, run `npm run audit:performance -- https://ernestwindeldreo.vercel.app/ live`. Local scores do not replace a PageSpeed Insights test of the deployed URL.

For browser navigation checks, run `node scripts/serve-audit.mjs` in one terminal and `node scripts/check-frontend.mjs` in another. The checks cover entering the portfolio, the tour, deferred chunks, lazy page focus, browser Back, and all main pages on mobile and desktop.

`robots.txt` and `llms.txt` are served as static text. Missing static files and discovery endpoints return 404 rather than the SPA HTML, while portfolio routes retain the SPA fallback. Hashed `/assets/` files can be cached for one year; each new build changes their filenames.
