# Portfolio

A React/Vite portfolio with a fixed overview, reusable sidebar, and live views and likes.

## Run locally

Use Node.js 24 or newer, then run:

```sh
npm install
npm run dev
```

Vite starts the frontend, stats API, and portfolio assistant API together. `npm run preview` also includes both APIs. Stats work without an external account; the assistant uses OpenRouter.

## Contact

`/contact` contains the contact details and an email draft form. Name, email, and message are required; the selected topic becomes the subject. **Send message opens the visitor's email app with a draft**, which they must send themselves. No email delivery service is configured, and the form does not upload or store its fields. The copy button copies the public email address and reports clipboard failures.

Social icons start monochrome and show their brand colors on hover or keyboard focus. GitHub and X remain their brand's dark colors. Add verified profile URLs to `socials` in `src/components/Contact/Contact.tsx`; entries without URLs are explicitly unavailable rather than pointing at guessed accounts. Keep the public contact facts in `server/portfolio-context.ts` in sync when details change.

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

Restart the server after changing environment variables. Keep the key server-side: do not prefix it with `VITE_`. `.env` and `.env.local` are ignored by Git; `.env.example` contains no credentials. For deployment, set the same variables in the Node service environment. Existing process variables take precedence over local files.

The browser posts to `/api/portfolio-ai`; the server sends requests to [OpenRouter's Chat Completions API](https://openrouter.ai/docs/quickstart) using the configured model. It provides the public facts in `server/portfolio-context.ts`, which should be updated alongside the portfolio. The assistant does not have access to private files or contact details beyond those facts. Requests have size, concurrency, rate, and timeout limits. Error messages do not expose upstream credentials. Behind a proxy, the rate limit conservatively shares the proxy's socket address; this implementation is designed for one Node service.

If the assistant is unavailable, verify the key, account credits, and model access in OpenRouter. The interface supports retrying without duplicating the question. No fallback model is selected automatically.

## Production

```sh
npm run build
npm start
```

`npm start` serves `dist/`, the stats API, and the assistant API on port 3000. Set `PORT` and `HOST` if needed. Set `NODE_ENV=production` when serving the site over HTTPS to use secure visitor cookies.

Deploy this as **one running Node.js service with persistent storage**, not as a static-only upload. The database must survive deploys and restarts. Mount persistent storage and set `SITE_STATS_DB` to an absolute file path on that disk, for example `/data/site-stats.sqlite`. The default is `data/site-stats.sqlite`, ignored by Git. Back up this database along with its SQLite WAL if the server is running, or stop the server before copying the database.

The browser calls `/api/site-stats` on the same origin as the website. If using a reverse proxy, preserve the Host header, disable buffering for `/api/site-stats/events`, and allow long-lived event streams. A static-only service such as GitHub Pages cannot run this backend. Multiple server instances would need a shared database and a shared event broadcaster; this version intentionally uses one instance.

## Count behavior

- A view is one browser-tab visit, registered when the app opens (including the intro). Refreshing, React development remounts, and navigating back to Overview do not add another view in that tab session.
- A new tab normally starts another visit. Browsers can copy session storage when duplicating a tab; those duplicated tabs share the original visit ID.
- Likes are stored per anonymous browser cookie. The heart toggles like/unlike, and repeated requests do not create extra likes. The cookie lasts one year.
- Counts are stored in SQLite and pushed to connected browsers using server-sent events. Event streams automatically reconnect after a temporary network interruption.
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
npm run lint
```

Backend tests cover visit deduplication, separate visitors, like/unlike behavior, concurrent repeated requests, live broadcasts, restart persistence, and invalid requests. Existing lint issues in the Animate UI tooltip/slot and shared button components are separate from the stats implementation.

