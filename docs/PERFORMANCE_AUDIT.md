# Dialed Performance Audit

Audit date: 2026-07-13

> Dieses Dokument hält Baseline und ursprüngliche Messung fest. Der aktuelle Architekturvertrag steht in [ARCHITECTURE.md](ARCHITECTURE.md); der Prüfablauf in [QUALITY.md](QUALITY.md).

## Baseline

The audit was performed against commit `7d1770c` before performance changes.

| Route | Auth checks | Database queries | Largest avoidable payload |
| --- | ---: | ---: | --- |
| Dashboard | proxy claims + layout claims + page claims + `getUser()` | 7 | all equipment, all bean fields, 100 complete shots, 50 recommendation outcomes |
| Shots | proxy claims + layout claims + page claims | 5 | 100 complete shots although 30 are rendered |
| Beans | proxy claims + layout claims + page claims | 5 | complete equipment and complete shots are unused except for bean counts |
| Setup | proxy claims + layout claims + page claims | 5 | complete beans and 100 shots are unused |
| Shot detail | proxy claims + layout claims + page claims | 7 | one shot is found by downloading up to 100 complete shots |
| Shot edit | proxy claims + layout claims + page claims | 5 | one shot is found by downloading up to 100 complete shots |

`loadAppData()` issued five parallel queries for every caller: profile, settings, all beans, all equipment, and 100 full shot rows. It was used by seven routes regardless of their actual data needs.

## Navigation findings

- Internal content navigation already used `next/link` or `router.push()`.
- The persistent bottom navigation used `next/link`, but dynamic route prefetching depended on loading boundaries and had no explicit warm-up.
- Logout used `window.location.assign()`. A hard navigation is acceptable after credentials are destroyed, but the private browser cache was not explicitly cleared first.
- Seven successful mutations called `router.refresh()` even after a route push or local state update.

## Rendering findings

- Loading files existed for dashboard, shots, and beans only.
- The protected layout awaited uncached cookie/auth work. In Next.js 16 this blocks the same segment's loading boundary, delaying immediate feedback.
- The dashboard awaited every data source before returning any UI and had no granular Suspense boundaries.

## Database findings

- Existing RLS policies already use `(select auth.uid())`, retaining per-user isolation without row-by-row auth function initialization.
- Existing indexes cover the primary shot timeline, bean timeline, equipment lookup, and recommendation status lookup.
- Beans ordered by `updated_at` and active equipment ordered by `created_at` needed dedicated indexes.

## Measurement limitations

No test-user credentials are stored in the repository. Authenticated production timings therefore use privacy-safe server timing logs and query counts rather than synthetic access to a real account. Browser navigation tests use mocked private endpoints so they cannot expose production data.

## Safety constraints

- SWR caching is memory-only and keys always include the authenticated user ID.
- Auth responses, cookies, private HTML, and mutation responses are never publicly cached.
- Supabase RLS remains the final authorization boundary.

## Result

| Route | Database queries before | Database queries after | Change |
| --- | ---: | ---: | ---: |
| Dashboard | 7 | 6 | -14% plus much smaller rows |
| Shots | 5 | 2 | -60% |
| Beans | 5 | 3 | -40% |
| Setup | 5 | 3 | -40% |
| Shot detail | 7 | 5 | -29% |
| Shot edit | 5 | 3 | -40% |

Across these primary routes the database round trips fell from 34 to 22 (-35%). More importantly, timeline routes now load 30 summary rows instead of 100 complete shot records, and detail/edit routes query the requested ID directly. The dashboard no longer loads equipment and no longer performs `getUser()`.

The protected layout no longer repeats auth work. A normal protected navigation now has the unavoidable proxy claim verification plus one request-scoped page verification; React `cache()` deduplicates repeated page-level calls in the same render. RLS remains enabled for every private table.

Recommendation generation previously held the successful `saveShot` response open while performing at least eight additional database operations. It now runs via Next.js `after()` once the mutation response has been sent. The shot insert, ownership validation, settings update, and any required target resolution remain synchronous.

## Client cache

SWR uses one memory-only provider mounted inside the protected app frame. Every key includes the user ID. Server-loaded shot and bean lists are supplied as `fallbackData`, so hydration does not immediately repeat their requests. Existing data remains visible during focus/reconnect revalidation.

| Resource | Window |
| --- | ---: |
| Dashboard, recent shots, active recommendation | 30 seconds |
| Beans, profile, settings | 5 minutes |
| Equipment | 15 minutes |
| Shot detail | 10 minutes |

There is no polling. Focus revalidation is throttled to five minutes, reconnect revalidation is enabled, and all private API responses use `Cache-Control: private, no-store` plus `Vary: Cookie`. Logout clears the complete in-memory provider before signing out and navigating to `/auth/login`.

Shot creation and deletion update an already loaded timeline optimistically and roll back automatically on failure. Shot, bean, equipment, recommendation, analytics, and consistency keys are invalidated selectively after their corresponding mutations. Broad client-side `router.refresh()` calls were removed except for the post-logout auth boundary refresh.

## Rendering and navigation

- The persistent bottom navigation uses `next/link`, explicitly prefetched links, and `router.prefetch()` warm-up for Dashboard, Shots, Beans, and Setup. Setup contains the app's settings, so no separate settings route exists.
- `experimental.staleTimes.dynamic` and `staleTimes.static` are both 30 seconds, so explicitly prefetched dashboard data cannot remain in the Next.js router cache beyond the dashboard freshness window.
- Loading boundaries now cover setup, new/detail/edit shots, and new/detail beans with route-shaped skeletons.
- The dashboard starts one aggregate request early and uses one meaningful Suspense boundary. Its sections depend on that same promise, so additional boundaries would not produce independent streaming.
- Vercel Speed Insights is mounted in the root layout.

The 2026-07-14 refactor also derives both chart view models on the server. The dashboard sends at most ten grind/time points to Recharts. Shot detail sends at most eleven comparison points instead of serializing up to twenty complete shots into the client bundle. Date and number formatters are reused rather than constructed during each render.

## Database changes

Migration `20260713050000_performance_indexes.sql` adds only:

- `beans_user_updated_idx (user_id, updated_at desc)`
- `equipment_user_archive_created_idx (user_id, archived_at, created_at asc)`

Existing indexes already cover shot timelines, per-bean shot timelines, recommendation status timelines, active recipes, and recommendation result lookup. Existing RLS policies already use `(select auth.uid())`; no policy was weakened or replaced.

## Regions

- Supabase project `DialedIn`: verified through the Supabase CLI as healthy in `eu-west-1` (Ireland).
- Vercel Functions: `preferredRegion = "fra1"` (Frankfurt) is set at the root and protected app segment for the next deployment.
- Expected primary users: Germany / Central Europe.

Both services are in Europe. The previously deployed Vercel function region could not be inspected because the local Vercel CLI has no credentials; the CLI login flow was cancelled without changing the deployment.

## Measurement

Privacy-safe server logs now emit only operation kind, query count, and elapsed milliseconds for auth, dashboard, shots, beans, equipment, shot detail, recommendation, and analytics work. No IDs, tokens, cookies, or shot values are logged.

Authenticated p50/p95 latency cannot be measured locally because no test-user credentials are stored in the repository. The reproducible static baseline is therefore the query-count reduction above. After deployment, Vercel Speed Insights and `dialed.performance` logs provide real navigation, auth, and database timings without synthetic access to private production data.

## Verification

- TypeScript: passed
- ESLint: passed with no warnings
- Vitest: 27 files, 127 tests passed
- Next.js production build: passed
- Temporary responsive Playwright harness: mobile and desktop passed; harness removed after verification
- Supabase linked migration dry-run: passed; only `20260713050000_performance_indexes.sql` would be applied
- Tests cover prefetch/navigation links, route loading states, parallel query startup, SWR deduplication and server fallback, user-key isolation, optimistic rollback, logout clearing/user switch, private response headers, and RLS migration guarantees.

The index migration has been created locally but is intentionally not applied to the remote database automatically. Run the normal reviewed Supabase migration deployment before relying on the new indexes in production.
