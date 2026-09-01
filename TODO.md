# ClaimSNProgress TODO

Updated: 2026-09-01

## Completed in safe performance cleanup

- [x] Remove duplicate filtering/search work in `TableAllPage.handleSearch`.
- [x] Replace random table row keys in `resultclaimperson` with deterministic keys.
- [x] Parse claim date once per filtered row instead of twice.
- [x] Remove unused `peopleEligible` metric and redundant shared memo object.
- [x] Memoize sorted per-person rows.
- [x] Remove confirmed-unused `src/app/dashboard/components/SparePartForm.tsx`.

## P1 — High impact / next

- [x] **Eliminate Claim save verification full-sheet fetch.** Added an exact-ID Apps Script read using `TextFinder`, an `idApplied` compatibility marker, and a frontend legacy fallback so `BuyProductDate` verification keeps the same semantics without loading the entire Claim sheet on current deployments.
- [x] **Deploy and smoke-test the exact-ID read.** Production returns `idApplied` for the requested Claim ID, and the frontend now uses the exact-row fast path while retaining the legacy fallback for deployment rollback/version mismatch.
- [x] **Add Dashboard aggregate + lazy detail pagination.** Apps Script now returns compact date/province/status buckets, Dashboard falls back safely on older deployments, and status modal rows are fetched server-side 10 at a time with the active province/date filters.
- [x] **Add Result Claim Person aggregate.** Apps Script now preserves the existing claimer aliases (`claimSender`, `claimerName`, Thai aliases, assignee/handler fields), vehicle/service-fee aliases, and fee rule. The page receives compact metrics/per-person totals and lazy-loads the selected person's raw rows with server-side province/date filters, while retaining a legacy full-list fallback for older deployments.
- [x] **Activate the new Apps Script server-pagination behavior in production.** Live Claim responses expose `sortApplied: "claimPriority"` and Spare responses expose `directionApplied: "desc"`.

## P2 — Performance / maintainability

- [x] **Reduce client component scope in dashboard layout.** The responsive Sidebar breakpoint/dynamic import now lives in `DesktopSidebarGate`, so `dashboard/layout.tsx` is no longer a Client Component.
- [x] **Make the dashboard Footer server/static.** Replaced the AntD `Layout.Footer` client wrapper with a native `<footer>` while preserving the existing layout/styling.
- [x] **Centralize duplicated desktop/mobile navigation configuration.** `navigation.ts` is now the single route/label source for Sidebar, mobile Drawer, and breadcrumb labels while preserving the desktop table submenu and flat mobile navigation.
- [x] **Target repeated table/render work instead of memoizing mechanically.** Parts Price now keeps its static AntD columns outside the component and memoizes the mobile category grouping; other table columns remain unchanged unless profiling shows a meaningful rerender cost.
- [x] **Remove duplicated `TableAllPage` filtered state.** The page now derives visible Claim rows with `useMemo` from source data, the committed Search/Enter query, and province, avoiding a second synchronized array state.
- [x] **Review full-sheet fetch consumers.** Claim/Spare tables use server pagination with rollback fallbacks; Dashboard/Result Claim Person use aggregates with fallbacks; post-save Claim verification uses exact-ID; Parts Price intentionally fetches its complete catalog for instant local search/category grouping; `TableAllPage` intentionally keeps the full Claim browse set for its local spare-request workflow and is the next candidate for server search if data volume grows materially.
- [x] **Profile mobile rendering after data/API work.** At 390×844, `sparepartform` has no page-level horizontal overflow (its wide table scrolls internally), Search remains commit-on-Search/Enter, and Parts Price switches to the card layout with no page-level horizontal overflow. Recheck tablet widths when future UI structure changes materially.

## P3 — Dead code / cleanup audit

- [ ] Search for unused components, helpers, imports, debug logs, stale TODO/FIXME comments, and unreachable branches after each feature batch.
- [ ] Treat App Router route files and API routes as public/external entry points; do not delete them only because no internal import exists.
- [ ] Confirm external callers before removing `/api/part-request` or similar integration routes.

## Validation rule

For every implementation batch, run:

1. `npm run lint`
2. `npx tsc --noEmit`
3. `npm test`
4. `npm run build`

Do not commit or push unless explicitly requested.
