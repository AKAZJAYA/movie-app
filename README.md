# NebulaFlix movie app

NebulaFlix is a React/Vite movie-discovery UI with a native HTML video player for media that you own or are licensed to stream.

The player intentionally does not use third-party movie mirror iframes. Those embeds cannot prove their resolution, can reload themselves, and do not let this app enforce a selected quality. Metadata API keys also do not grant access to commercial movie files.

## TMDB on Netlify

The app uses a Netlify Function at `/api/tmdb`, so the TMDB token is never bundled into browser JavaScript. Configure these exact environment variable names in Netlify:

- `TMDB_API_Key`
- `TMDB_Read_Access_Token`

The read access token is preferred; the API key is the fallback. If your Netlify plan exposes variable scopes, include the **Functions** scope. Redeploy after changing either value.

TMDB supplies current titles, search, artwork, trailers, episodes, similar titles, and regional legal-provider availability. It does not supply commercial movie video files.

## Run locally

1. Copy `.env.example` to `.env.local` and add your own TMDB credentials for local Netlify Function testing.
2. Set `VITE_WATCH_REGION` to the two-letter country code used for provider availability. It defaults to `LK`.
3. Add authorized video URLs to `public/streams.json` using `public/streams.example.json` as the schema reference.
4. Run the site through Netlify Dev to exercise `/api/tmdb`, or run `npm run dev` to use the bundled/OMDb fallback catalog.

When TMDB is unavailable, the app remains usable with bundled metadata. `VITE_OMDB_API_KEY` is an optional metadata fallback.

## Stream catalog keys

Movies use `movie:TMDB_OR_IMDB_ID`.

TV episodes use `tv:TMDB_OR_IMDB_ID:SEASON:EPISODE`.

Examples: `movie:693134`, `movie:tt15239678`, and `tv:1399:1:1`.

Each catalog entry can contain:

- `title` and an optional `poster`
- `sources`: one authorized URL per actual rendition
- `captions`: optional WebVTT subtitle tracks

Use the real rendition labels supplied by your encoder or CDN. The player supports entries such as 480p, 720p, 1080p, 2K (1440p), and 4K (2160p), but only displays qualities present in the catalog. Switching between direct renditions preserves the current playback time.

A native HLS master playlist can be listed as `application/vnd.apple.mpegurl`. Browsers with native HLS support choose its adaptive rendition. To provide manual HLS choices without an additional player library, list each authorized variant manifest as a separate source.

## Production notes

- Keep private signing secrets and provider API secrets on a backend. Any `VITE_*` value is visible in the browser bundle.
- Keep the two TMDB variables available to Netlify Functions; do not rename them to `VITE_*`.
- Prefer short-lived signed playback URLs from your licensed video host.
- Configure CORS, byte-range requests, and the correct video MIME types on the media host.
- Do not label a title 1080p or 4K unless the selected source actually has that encoded height.

## Commands

- `npm run dev` — start Vite
- `npm run build` — production build
- `npm run lint` — ESLint
