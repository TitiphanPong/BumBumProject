# ClaimSNProgress Performance Audit

Audit date: 2026-08-13

## Executive summary

The application was already statically prerendering its UI routes, but most dashboard screens hydrate substantial Ant Design code and fetch full Google Sheets datasets after mount. The largest confirmed avoidable delay was on `/dashboard`: every province or date-filter change repeated `/api/get-claim`, which in turn waited on Google Apps Script. The implemented changes keep one fresh page-load snapshot and perform those filters locally, remove two runtime dependencies used only for simple responsive/entrance effects, defer expensive price-list filtering behind urgent input updates, and add a route loading skeleton.

## Prioritized findings

### HIGH — filter changes repeated the full claims request

- Location: `src/app/dashboard/page.tsx`
- Evidence: the fetch effect depended on `selectedProvince` and `dateRange`.
- Request flow before: page render → GET `/api/get-claim` → Google Apps Script → state updates → filter change → the same GET/upstream flow again.
- Why it was slow: each filter interaction paid network, upstream cold-start, JSON parsing, and rendering costs even though all filtering was local.
- Fix: fetch once when the route mounts; derive statistics, chart rows, and modal rows with `useMemo`.
- Expected impact: one request per mount instead of `1 + number of filter changes`.
- Risk: low. Freshness on mount and all filtering rules remain unchanged.

### HIGH — large client-side UI/runtime footprint

- Locations: dashboard layout, dashboard pages, and table selector.
- Evidence: `framer-motion` was used only for simple entrance/hover transforms; `react-responsive` duplicated Ant Design/CSS breakpoint facilities. Production chunks include several 200–355 KB uncompressed files, primarily from the UI/chart stack.
- Why it was slow: additional JavaScript must be downloaded, parsed, and executed before interaction.
- Fix: replace motion wrappers with semantic elements/CSS interaction states, replace `react-responsive` with CSS and Ant Design breakpoints, and make the table-selector route a Server Component with a small icon client island.
- Expected impact: lower route-specific JavaScript and less animation work during mount.
- Risk: low. Decorative entrance animation was removed; hover/press feedback remains.

### MEDIUM — price search derived state caused an extra render

- Location: `src/app/dashboard/partsprice/page.tsx`
- Evidence: an effect filtered the complete dataset and stored a second copy after every search/category update; grouping and category extraction also ran on each render.
- Why it was slow: keystrokes caused a render, full scan, state update, and second render.
- Fix: derive filtered/grouped/options data with memoization and use `useDeferredValue` for the search term.
- Expected impact: removes the effect-driven render and improves input responsiveness on larger lists.
- Risk: low.

### MEDIUM — dashboard shell had avoidable render work

- Locations: `src/app/dashboard/layout.tsx`, `components/Header.tsx`, `components/Sidebar.tsx`.
- Evidence: two responsive hooks evaluated the same breakpoint; sidebar mirrored `usePathname()` into state with an effect; menu arrays are rebuilt on shell renders.
- Fix: CSS controls sidebar visibility, the header uses the existing Ant Design breakpoint hook, and pathname is used directly.
- Expected impact: fewer subscriptions and one fewer render after navigation.
- Risk: low.

### MEDIUM — no route-segment loading UI

- Location: `src/app/dashboard/loading.tsx` (previously absent).
- Why it matters: route navigation had no immediate segment fallback while code/RSC payloads load.
- Fix: lightweight responsive skeleton.
- Expected impact: better perceived navigation performance and lower risk of blank transitions.
- Risk: low.

### MEDIUM — all read APIs bypass caching

- Locations: `src/lib/upstream.ts`, `src/lib/client-fetch.ts`, GET route handlers.
- Evidence: both server upstream requests and browser reads default to `no-store`.
- Why it is slow: revisiting pages always reloads full Google Sheets responses.
- Recommendation: define an explicit freshness SLA, then add short-lived server caching and mutation invalidation.
- Risk of change: medium/high; intentionally not changed because freshness requirements are business behavior.

### MEDIUM — large tables still receive complete datasets

- Locations: claim/spare edit tables and result pages.
- Evidence: APIs return full sheets; clients scan all string fields for filters. Ant Design pagination limits visible rows but not downloaded/processed rows.
- Recommendation: measure production row counts. Add backend pagination or virtualization only if counts justify it.
- Risk of change: high because API contracts and edit workflows would change; intentionally deferred.

### LOW — asset and CSS observations

- The only product bitmap is about 54 KB and is not an oversized LCP asset. Existing `next/image` usage provides dimensions; no image rewrite was justified.
- Geist is self-hosted by `next/font`; only Latin subsets are loaded. Thai falls back to system fonts, avoiding a new blocking request but allowing platform variation.
- A few backdrop blur/shadow effects and broad transitions remain, but none are continuous animations. These are not primary bottlenecks.

## Core Web Vitals assessment

- LCP/FCP: most UI routes are prerendered, which helps. Client hydration and post-mount data fetching remain the dominant risks; no field tooling is configured, so values are not measurable in this environment.
- INP: repeated dashboard requests and synchronous list filtering were the strongest code-level risks addressed here. Large Ant Design tables remain a risk at high row counts.
- CLS: `next/image` dimensions and the new loading skeleton reduce obvious layout-instability risks. No measured CLS data is available.
- TTFB: static UI routes are favorable. API TTFB remains dependent on Google Apps Script, with a 30-second cold-start allowance and no cache.

## Before vs after

| Measure | Before | After |
| --- | --- | --- |
| `/dashboard` claim requests per mount plus N filter changes | `1 + N` | `1` |
| Filter-change upstream Google Apps Script calls | `N` | `0` |
| Price search render cycle | render → effect scan → state update → render | deferred derived scan → render |
| Direct runtime dependencies | 7 | 5 |
| `framer-motion` / `react-responsive` installed packages | 8 transitive/direct packages | 0 |
| Static UI routes | 9 | 9 |
| Automated tests | 14 passing | 14 passing |
| Production build | passing | passing |

Exact browser transfer size and Core Web Vitals are not measurable in the current environment. The initial build was captured before changes, but Next.js 16's standard build summary does not report per-route JavaScript totals. Uncompressed chunk filenames also change between builds, so they are not presented as a false like-for-like benchmark.

## Recommended next steps

### High priority

1. Add production Web Vitals/RUM collection and API duration tracing.
2. Record real sheet row counts and response byte sizes for each GET route.
3. Agree on a freshness SLA and, if acceptable, cache read routes briefly with explicit invalidation after mutations.

### Medium priority

1. Dynamically isolate the Recharts visualization if route-level measurements show it dominates dashboard startup.
2. Add request deduplication/cancellation for concurrent mounts and navigation churn.
3. Consider server pagination for edit tables only after production row-count evidence.

### Optional

1. Consolidate duplicated dashboard navigation metadata.
2. Replace remaining broad `transition` declarations with property-specific transitions.
3. Evaluate a bundled Thai font only if typography consistency outweighs the extra font bytes.
