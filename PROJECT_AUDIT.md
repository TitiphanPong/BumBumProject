# PROJECT AUDIT

Audit baseline: 2026-08-08, before application fixes.

Overall Health: Unsafe for public production deployment. The application builds, but all customer data and mutation endpoints are unauthenticated, upstream failures are often reported as success, uploads are not safely controlled, and there are no tests.
Build: PASS (`npm run build`, Next.js 16.1.6).
TypeScript: PASS (`npx tsc --noEmit`), but safety is substantially bypassed by pervasive `any` and non-null environment assertions.
Lint: FAIL. `npm run lint` invokes removed `next lint`; direct `eslint .` also scans `.next` because ignores are absent. `npx eslint src` runs but the configured ruleset is minimal and explicitly disables `no-explicit-any`.
Tests: NOT CONFIGURED. No unit, integration, or E2E test script/files were found.
Security: CRITICAL. No authentication/authorization protects read, update, delete, notification, or webhook routes. `npm audit --omit=dev` reports five high-severity vulnerable dependency groups.
Production Readiness: NOT READY.

## P0 Critical

1. Unauthenticated access to customer records and destructive operations
   File: `src/app/api/get-claim/route.ts:1`, `get-spare/route.ts:1`, `submit-claim/route.ts:1`, `submit-part/route.ts:1`, `update-claim/route.ts:1`, `update-part/route.ts:1`, `delete-claim/route.ts:1`, `delete-part/route.ts:1`, `notify-claim/route.ts:19`
   Problem: Every API route is public. There is no middleware, session validation, role check, or per-record authorization.
   Impact: Any internet user can read personal customer data, create/alter/delete operational records, and send messages through the configured Telegram bot.
   Recommended Fix: Add an authentication provider/session, protect `/dashboard` and `/api`, and enforce backend roles (read/operator/admin) on every route. Do not rely on hidden UI controls.

2. Known high-severity vulnerabilities in production dependencies
   File: `package.json:13-24`, `package-lock.json`
   Problem: `npm audit --omit=dev` reports vulnerable `next`, `sharp`, Next's `postcss`, `form-data`, and `nanoid` dependency trees. The direct `form-data` package is unused.
   Impact: Depending on deployment/configuration, advisories include request smuggling, SSRF, cache poisoning, XSS, authorization bypass, and denial of service.
   Recommended Fix: Upgrade Next and resolved transitive dependencies to patched releases, remove unused vulnerable direct dependencies, rerun build/audit, and review breaking changes.

## P1 High

1. Upstream write failures are returned to the browser as HTTP 200
   File: `src/app/api/submit-claim/route.ts:14-23`, `submit-part/route.ts:13-22`, `part-request/route.ts:7-19`, all update/delete routes around their `fetch` calls
   Problem: Routes do not check `res.ok` and frequently wrap arbitrary upstream error text/results in a local 200 response.
   Impact: Forms can show success and reset even when Google Apps Script did not persist the record.
   Recommended Fix: Validate upstream status and response contract; propagate a safe 502/504 response on upstream failure.

2. No server-side input validation or request-size limits
   File: all POST route handlers, beginning at each `await req.json()`
   Problem: Arbitrary JSON is spread into privileged upstream requests. Required fields, types, enum values, lengths, IDs, and payload size are not validated.
   Impact: Malformed/corrupt sheet rows, formula injection risk in spreadsheet-backed storage, resource exhaustion, and unsafe Telegram content.
   Recommended Fix: Define shared request schemas, reject unknown/invalid fields, neutralize spreadsheet formula prefixes where appropriate, and enforce body limits at the edge/proxy.

3. Unsigned direct-to-Cloudinary upload is unrestricted and leaves orphaned media
   File: `src/app/dashboard/components/ClaimForm.tsx:350-390`, `dashboardtable/table-claim/page.tsx:648-745`
   Problem: Client checks only picker hints/max count. There is no enforced size/type/extension validation, signed server authorization, upload cancellation, storage cleanup on remove/replacement/form failure, or persisted-public-ID lifecycle.
   Impact: Storage abuse/cost, MIME spoofing, large uploads, and permanently orphaned files. Removing a file only removes its URL from React state.
   Recommended Fix: Add an authenticated signed upload endpoint, enforce allowlisted resource types and size, store public IDs, and delete abandoned/replaced media server-side.

4. Claim persistence and notification are a non-atomic workflow with misleading error UI
   File: `src/app/dashboard/components/ClaimForm.tsx:69-159`, `dashboardtable/table-claim/page.tsx:345-427`
   Problem: The record is persisted first and Telegram is awaited afterward in the same `try`. A Telegram failure enters the generic save/update error path even though storage already succeeded. Retry can create duplicates or repeat transitions.
   Impact: Users retry successful writes, creating duplicate claims; UI reports incorrect state.
   Recommended Fix: Treat notification as a separate best-effort step with a warning, or implement an idempotent server-side workflow/outbox.

5. Spare-part form reports success for every HTTP response and targets a hardcoded Apps Script library URL
   File: `src/app/dashboard/components/SparePartForm.tsx:27-50`, `src/app/api/part-request/route.ts:7-19`
   Problem: The client ignores `response.ok`; the server ignores upstream status and uses a hardcoded `/macros/library/...` URL rather than the configured deployment endpoint.
   Impact: A failed or non-deployed request is presented as a successful save.
   Recommended Fix: Use `GOOGLE_SCRIPT_URL`, add the configured sheet name, check both response status and expected result, and only reset on confirmed success.

6. External requests have no timeout/cancellation
   File: every server `fetch` to Google Apps Script or Telegram; client data-loading effects such as `ClaimForm.tsx:35-47`
   Problem: Requests can remain open until platform timeout; client effects do not abort on unmount.
   Impact: Exhausted server capacity, slow UX, and state updates after navigation.
   Recommended Fix: Use `AbortSignal.timeout` server-side and `AbortController` in client effects; map timeout to 504.

7. “Other” province is accepted but cannot be notified
   File: `ClaimForm.tsx:207-215`, `notify-claim/route.ts:8-12,43-48`
   Problem: The form permits `อื่น ๆ`; notification routing only defines three named branches and returns 500 for any other value.
   Impact: A valid form save produces a notification failure and misleading save error.
   Recommended Fix: Remove unsupported option, collect an explicit route, or configure a default notification group.

8. No concurrency control or idempotency for create/update/delete
   File: submit/update/delete routes and form submit handlers
   Problem: Client loading state reduces ordinary double clicks but the API accepts duplicate/replayed requests; updates have no version check and sheet operations are not shown to be atomic.
   Impact: Duplicate records, lost updates, and conflicting approve/finish actions.
   Recommended Fix: Add idempotency keys for creates, immutable record IDs, optimistic versioning for updates, and atomic enforcement in Apps Script/storage. Needs verification in the external Apps Script source.

## P2 Medium

1. API response contracts are inconsistent and untyped
   File: all API routes; frontend consumers throughout `src/app/dashboard`
   Problem: Reads return raw arrays, submit returns `{message: text}`, updates/deletes return raw JSON, notification returns `{success}`, and consumers alternate among `res.ok`, `res.status`, and `result.result`.
   Impact: Integration breaks silently when upstream response shape changes.
   Recommended Fix: Define shared domain/API types and one success/error envelope; validate external responses at runtime.

2. Fetch consumers parse error objects as arrays
   File: `ClaimForm.tsx:38-41`, `table-claim/page.tsx:65-68,79-87`, `table-spare/page.tsx:43-49`, `TableAllPage.tsx:58-67`, `partsprice/page.tsx:50-62`
   Problem: Most loaders call `.map` without checking `res.ok` or `Array.isArray(data)`.
   Impact: Secondary runtime exceptions hide the real network/server error and empty/error states are weak.
   Recommended Fix: Centralize a typed fetch helper and validate status/shape before state updates.

3. Type safety is broadly bypassed
   File: dashboard pages/components (more than 60 explicit `any` occurrences), API catches/maps, environment `!` assertions
   Problem: Domain records have no canonical type, spreadsheet column casing is inconsistent (`ProvinceName` vs `provinceName`), and environment variables are asserted present.
   Impact: Contract drift and undefined/null errors compile successfully.
   Recommended Fix: Introduce shared `Claim`, `SparePart`, DTO, and external-row normalization types incrementally; validate environment variables at runtime.

4. Spreadsheet schema is duplicated and inconsistent
   File: `ClaimForm.tsx:52-66`, `table-claim/page.tsx:213-250,319-340`, `TableAllPage.tsx:112-144`, `table-spare/page.tsx:116-133`
   Problem: The UI writes camelCase but reads a mix of PascalCase/camelCase; dates use both `DD/MM/YYYY` and `YYYY-MM-DD`; empty values alternate between `''` and `'-'`.
   Impact: Filters, edits, reports, and date parsing can disagree or lose data.
   Recommended Fix: Normalize external rows in one adapter and use one canonical internal model/date format.

5. Update notifications are resent whenever an already-finished record is edited
   File: `table-claim/page.tsx:356-405`
   Problem: Notification checks only the submitted final status, not whether status transitioned to final.
   Impact: Repeated Telegram messages on unrelated edits.
   Recommended Fix: Compare the original and new status and notify only on a transition (or use an idempotent event ID).

6. Upload media detection relies on URL substrings
   File: `notify-claim/route.ts:135-157`, `table-claim/page.tsx:683-701`
   Problem: `includes('.mp4')`/`includes('video')` guesses type from URL.
   Impact: Incorrect Telegram endpoint/rendering for transformed URLs and non-MP4 video.
   Recommended Fix: Persist Cloudinary `resource_type`/format metadata and use it explicitly.

7. Filter state has duplicated/inconsistent implementations
   File: `TableAllPage.tsx:84-95`, `table-spare/page.tsx:67-108`, `table-claim/page.tsx:105-142`
   Problem: Some handlers filter directly and then call another filter; spare-part search ignores the province selection; reset behavior differs.
   Impact: Results can unexpectedly include records outside the selected province.
   Recommended Fix: Derive filtered rows with a single `useMemo` from source rows and filter state.

8. Accessibility and locale issues
   File: `src/app/layout.tsx:26`, icon-only/custom delete controls and upload previews
   Problem: HTML language is `en` for a Thai UI; several icon/custom controls lack accessible names; autoplay preview media has no accessible alternative.
   Impact: Incorrect screen-reader pronunciation and poor keyboard/assistive usability.
   Recommended Fix: Set `lang="th"`, add labels/aria text, and verify keyboard focus/modal behavior.

## P3 Low

1. Lint/toolchain configuration drift
   File: `package.json:8`, `eslint.config.mjs`, `package.json:30`
   Problem: Next 16 is paired with `eslint-config-next` 15.4.2, lint script is obsolete, build output is not ignored by ESLint, and the custom ruleset does not extend the normal Next/React recommendations.
   Impact: Defects and unused code are not detected reliably.
   Recommended Fix: Align versions, use ESLint directly, ignore generated/vendor paths, and enable the supported Next flat configs.

2. Unused/redundant dependencies and implementations
   File: `package.json:14-21`, `CRUDSparePart.tsx:19-22,62-65`, `CRUDClaim.tsx`/`CrudTable.tsx`
   Problem: `form-data`, `raw-body`, `chart.js`, and `react-chartjs-2` have no source imports; `CRUDSparePart` defines `formatDate` twice; table/CRUD/filter logic is duplicated.
   Impact: Larger attack/update surface and maintenance cost.
   Recommended Fix: Remove confirmed unused packages/functions after tests exist; consolidate only when behavior is covered.

3. Dead or disconnected delete implementations
   File: `CRUDClaim.tsx:29-64,146-151`, `CRUDSparePart.tsx:26-60,98-103`
   Problem: Delete buttons are commented out while substantial modal/API state remains. The spare component's dormant handler calls `/api/delete-claim`, not `/api/delete-part`.
   Impact: Dead code conceals a wrong-endpoint bug if re-enabled.
   Recommended Fix: Remove the dormant feature or reconnect it deliberately with the correct endpoint and authorization.

4. Development logging and stale boilerplate
   File: `SparePartForm.tsx:28`, `telegram-webhook/route.ts:4`, `README.md`
   Problem: Form/customer payloads and full webhook bodies are logged; README is unchanged create-next-app boilerplate.
   Impact: Potential PII in logs and missing operational guidance.
   Recommended Fix: Remove sensitive logs and document architecture, environment, deployment, and recovery procedures.

## Missing / Incomplete Features

- Authentication, role-based authorization, session expiry handling, and audit logging are absent.
- No `.env.example`; required variables exist only in local configuration. The local file is ignored and not tracked, but deployment requirements are undocumented.
- No CI/CD workflows, Docker configuration, health endpoint, observability, rate limiting, or operational runbook.
- No upload deletion/reconciliation workflow.
- Telegram webhook sends a `sendMessage` payload without `text` (`telegram-webhook/route.ts:8-14`) and has no Telegram secret-token verification. Its intended behavior needs verification.
- Delete UI is commented out, while delete APIs remain publicly callable.

## API Contract Problems

- `/api/part-request` is a second spare-part create implementation with a different hardcoded upstream and response contract from `/api/submit-part`.
- `/api/get-claim` does not explicitly select `DEFAULT_CLAIM_SHEET`, unlike other read routes. Needs verification against Apps Script default behavior.
- `get-productlist` maps upstream Thai column `สินค้า` to `{name}`, while one consumer still attempts both shapes.
- Update/create date formats and empty-value sentinels differ.
- No frontend/backend shared DTOs or runtime response validation.

## Database Risks

There is no local database/Prisma layer; Google Sheets via an external Apps Script is the persistence layer. The Apps Script source and sheet schema/migrations are not in this repository, so uniqueness, locking, atomicity, indexes, backups, and formula handling need verification. Client-generated fallback IDs (`row-${index}`) in table pages are unsafe for mutation if upstream IDs are absent.

## Security Findings

- P0 public data/mutation/Telegram endpoints.
- P0 vulnerable production dependencies.
- P1 unrestricted unsigned uploads and no storage cleanup.
- P1 unvalidated arbitrary payload forwarding and no rate limits/timeouts.
- Webhook lacks sender verification and logs full request bodies.
- Server error responses expose raw exception messages in multiple routes.
- No hardcoded secret values were printed or found in tracked source. `.env.local` is ignored and not tracked; its variable names were inventoried only.

## Dead Code / Duplication

- Dormant delete flows in both CRUD components; wrong endpoint in dormant spare delete handler.
- Duplicate table/filter/row-normalization/business status logic across dashboard pages.
- Duplicate `formatDate` in `CRUDSparePart`.
- Confirmed source-unused direct dependencies: `form-data`, `raw-body`, `chart.js`, `react-chartjs-2`.

## Testing Gaps

No tests exist. Highest-priority additions: route auth/roles; input and external-response validation; failed Google/Telegram/Cloudinary calls; duplicate submissions; status-transition notification idempotency; row normalization; upload size/type/removal; destructive actions; main claim and spare-part E2E flows.

## Production Deployment Risks

- Public PII and destructive APIs.
- Dependency advisories.
- False-positive saves and partial success.
- No rate limiting, timeouts, monitoring, tests, CI, environment documentation, or recovery process.
- External persistence implementation is absent from the repository and cannot be audited end to end.

## Recommended Fix Order

1. Add authentication/authorization and disable public mutation/notification/webhook abuse.
2. Patch dependencies and restore a real lint gate.
3. Add shared server validation, safe errors, timeouts, upstream status/shape checks, and request limits.
4. Make create/update flows idempotent and separate persistence success from notification status.
5. Secure and lifecycle-manage uploads.
6. Normalize the Google Sheets/API domain model and dates; verify Apps Script atomicity and backups.
7. Add route/service tests and critical E2E workflows, then CI.
8. Incrementally replace `any`, consolidate duplication, and complete accessibility/operational documentation.
