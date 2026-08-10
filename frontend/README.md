# 🎶 Practice Companion — Frontend

A premium, cross-platform frontend for the AI Music Practice Companion, built with
**Expo + Expo Router + React Native Web**. One codebase runs as a real website
(Playwright-testable today) and ports to **iOS / Android** later.

Dark, Apple-grade aesthetic: near-black violet base, purple accent ramp, glass
surfaces, gradient CTAs, and soft glow.

> Auth, the analyze pipeline, and practice-session history call the real FastAPI
> backend through `src/api.ts` (with a mock-data fallback when it's unreachable,
> so the app and Playwright still work offline). The song catalog, social feed,
> and practice-player audio/lyrics are still **mock/placeholder data** — see
> `src/mockData.ts`, `src/audio.ts`, `src/lyrics.ts` — pending a real content
> pipeline.

---

## ▶️ Quick start (copy-paste)

Run this in your terminal on your own machine, then open the URL it prints
(defaults to **http://localhost:8081**):

```bash
cd /Users/john/CodingWorkspace/Music_Practice_Companion/frontend
npm install
npm run web
```

- First run downloads dependencies, so `npm install` may take a minute or two.
- Press `w` in the Expo terminal to (re)open the web build in your browser.
- If `npm install` reports version mismatches, run `npx expo install --fix` once, then `npm run web` again.
- Stop the server with `Ctrl + C`.

---

## 🚀 Getting started

```bash
cd frontend
npm install

# Web (this is what Playwright drives)
npm run web          # → http://localhost:8081

# Native (optional, later)
npm run ios
npm run android
```

If `npm install` complains about version mismatches, run `npx expo install --fix`
once to align native package versions with the installed Expo SDK.

### Production web build (static, easy to serve for CI)

```bash
npm run build:web    # outputs a static site to ./dist
npx serve dist       # serve it for Playwright in CI
```

---

## 🧭 Routes / screens

| Route | File | What it is |
|-------|------|-----------|
| `/` | `app/index.tsx` | Premium marketing landing (hero, feature sections, CTA) |
| `/(auth)/login` | `app/(auth)/login.tsx` | Sign in (mock auth — any non-empty values pass) |
| `/(auth)/register` | `app/(auth)/register.tsx` | Create account |
| `/home` → Discover | `app/(tabs)/home.tsx` | Song catalog / notation browser + search + filters |
| `/analyze` | `app/(tabs)/analyze.tsx` | Upload → AI scores, plots, coaching tips |
| `/feed` | `app/(tabs)/feed.tsx` | Social performance feed + likes |
| `/profile` | `app/(tabs)/profile.tsx` | Profile, streak, badges |
| `/song/[id]` | `app/song/[id].tsx` | Song detail, notations, progression |
| `/practice/[id]` | `app/practice/[id].tsx` | Practice player: real audio playback (expo-av), seek/skip, tempo/transpose, chord-synced Spotify-style lyrics, volume, responsive layout |

---

## 🧱 Project layout

```
frontend/
├── app/                      # Expo Router file-based routes (see table above)
│   ├── _layout.tsx           # Root stack + providers
│   ├── (tabs)/_layout.tsx    # Bottom tab navigation
│   └── (auth)/_layout.tsx
├── assets/audio/             # Synthesized placeholder practice-player audio (~60-70KB each)
├── tests/                    # Playwright specs (36 tests)
└── src/
    ├── theme.ts              # Design tokens (colors, gradients, spacing, type)
    ├── mockData.ts           # Songs, notations, performances, analyses, user (mock)
    ├── lyrics.ts              # Placeholder practice-player lyrics, line-timed (mock)
    ├── audio.ts               # Maps each song to its placeholder audio loop
    ├── api.ts                # Real fetch calls (auth/analyze/sessions) + mock fallback
    └── components/
        ├── Background.tsx     # Gradient backdrop + glow
        ├── ui.tsx             # Button, GlassCard, Pill, Seekbar, ProgressBar, H1/H2…
        └── charts.tsx         # ScoreDial, DeviationChart, MiniBars
```

---

## 🔌 Swapping mock data for the real backend

The component layer never touches `fetch` directly — it only calls functions in
`src/api.ts`. To connect the FastAPI backend, replace the bodies in that one file:

```ts
const API_BASE = process.env.EXPO_PUBLIC_API_BASE ?? 'http://127.0.0.1:8000';

export async function listSongs(query?: string) {
  const res = await fetch(`${API_BASE}/songs?q=${query ?? ''}`);
  return res.json();
}
```

`login`, `register`, `analyzeRecording`, and `listAnalyses` already call the real
backend (`POST /login`, `POST /users/`, `POST /analyze`, `GET /practice/sessions`)
with a mock-data fallback when it's unreachable. `listSongs`/`getSong`,
`listPerformances`, and `toggleLike` are still mock-only — the song catalog and
social feed don't have a backend yet.

---

## 🧪 Testing with Playwright

You write the tests — this app is built to be easy to select.

**`testID` → `data-testid`:** React Native Web automatically renders the `testID`
prop as a `data-testid` attribute on web, so in Playwright:

```ts
await page.getByTestId('hero-cta-primary').click();
await expect(page.getByTestId('discover-screen')).toBeVisible();
```

Tab bar items are most reliably selected by their visible label
(`getByText('Discover')`) since tab button testIDs depend on the navigation
version.

### testID reference

**Landing** — `landing-root`, `landing-nav`, `nav-sign-in`, `nav-open-app`,
`hero-title`, `hero-cta-primary`, `hero-cta-secondary`, `hero-preview`,
`preview-dial`, `feature-catalog`, `feature-practice`, `feature-analyze`,
`feature-social`, `step-01/02/03`, `footer-cta`, `footer-open-app`.

**Auth** — `login-screen`, `login-email`, `login-password`, `login-submit`,
`login-error`, `go-register`; `register-screen`, `register-email`,
`register-password`, `register-submit`, `go-login`.

**Discover / catalog** — `discover-screen`, `search-input`, `search-clear`,
`filter-all|guitar|vocals|piano|bass`, `discover-loading`, `discover-empty`,
`song-grid`, `song-card-<songId>` (e.g. `song-card-song-wonderwall`).

**Song detail** — `song-detail-screen`, `song-back`, `song-title`,
`open-practice`, `open-analyze-from-song`, `prog-<i>`, `notation-list`,
`notation-<id>`.

**Practice player** — `practice-screen`, `practice-back`, `practice-logo-home`,
`practice-song-title`, `beat-<i>`, `practice-position`, `practice-progress`
(draggable/clickable seek bar), `practice-play-toggle`, `practice-restart`,
`skip-back`, `skip-forward` (±10s), `practice-loop-toggle`,
`practice-loop-state`, `tempo-value`, `tempo-up`, `tempo-down`,
`transpose-value`, `transpose-key`, `transpose-up`, `transpose-down`,
`volume-mute-toggle`, `volume-hover-zone`, `volume-slider-wrap`,
`volume-control`, `lyrics-panel`, `lyric-line-<i>`, `lyric-line-text-<i>`.

**Analyze** — `analyze-screen`, `uploader`, `pick-file`, `file-name`,
`instrument-vocals|guitar|piano|bass`, `run-analysis`, `analyzing-indicator`,
`analysis-result`, `overall-dial` (+ `overall-dial-value`),
`score-pitch` (+ `-value`), `score-timing`, `score-stability`, `pitch-chart`,
`onset-chart`, `feedback-list`, `tip-<i>`, `analysis-history`,
`history-<id>`.

**Feed** — `feed-screen`, `feed-loading`, `feed-list`, `post-<id>`,
`post-song-<id>`, `like-<id>`, `likes-<id>`.

**Profile** — `profile-screen`, `profile-header`, `profile-name`,
`streak-banner`, `badge-grid`, `badge-<id>`, `my-performances`,
`my-perf-<id>`, `sign-out`.

### Suggested smoke flow

1. `/` → click `hero-cta-primary` → expect `discover-screen`.
2. Type in `search-input` → assert `song-grid` filters.
3. Click a `song-card-*` → expect `song-detail-screen` → click `open-practice`.
4. In practice: click `practice-play-toggle`, `tempo-up`, `transpose-up` and
   assert `tempo-value` / `transpose-key` update.
5. Go to Analyze → `pick-file` → `run-analysis` → wait for `analysis-result`.
6. Feed → click `like-*` and assert `likes-*` increments.
```
