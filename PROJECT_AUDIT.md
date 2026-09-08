# PROJECT AUDIT

Audit date: 2026-09-08

## Executive summary

ClaimSNProgress is in a substantially healthier state than the original 2026-08-08 audit. The current active scope is an internal-organization workflow backed by Google Sheets + Google Apps Script. Auth/RBAC remains intentionally out of the active roadmap by Owner decision and is therefore not treated as a blocker for the current internal-use scope, but the application and Apps Script endpoints should not be treated as safe anonymous public APIs.

Current health: **healthy for the current internal operational scope, with known integration/data-lifecycle risks listed below**.

The Phase A correctness gate is complete. Mutation routes now validate/canonicalize payloads, own their privileged `sheetName`/`action` controls, verify Apps Script business results, map upstream failures to non-2xx responses, and separate Claim persistence success from Telegram notification failure. Critical Claim/Spare regression coverage is in place.

This audit supersedes the stale findings in the original August audit.

## Current stack and architecture

- Next.js 16.3 / React 19.1 / TypeScript
- Ant Design 5
- Google Sheets as the operational data store
- Google Apps Script (`google-apps-script/Code.gs`) as the persistence/query layer
- Telegram for Claim notifications
- Cloudinary direct client uploads for Claim media
- Vitest for unit/integration-style regression tests
- GitHub Actions deployment workflow for Google Apps Script changes on `master`
- No local database/Prisma layer

## Verified engineering baseline

Verified after the 2026-09-08 cleanup batch:

- `npm run lint` — PASS
- `npx tsc --noEmit --noUnusedLocals --noUnusedParameters` — PASS
- `npx knip` — PASS, 0 findings
- `npm test` — PASS, 11 test files / 59 tests
- `npm run build` — PASS across all application routes
- `npm audit --omit=dev` — 0 production vulnerabilities

## Resolved historical findings

### Mutation reliability — resolved

The original audit found that several write routes could return HTTP 200 even when Apps Script reported a business failure. This has been fixed.

Current implementation:

- Claim/Spare create, update, and delete use the shared mutation response contract.
- `/api/part-request` uses the same business-result contract as `/api/submit-part`.
- Invalid Apps Script response bodies are rejected instead of being treated as success.
- Timeout and upstream failures are surfaced as non-2xx responses.
- Claim submit no longer accepts a permissive plain-text success fallback.

### Request validation and privileged routing — resolved for current mutation fields

Shared Claim/Spare mutation validation and normalization now:

- validates required Claim create fields;
- validates mutation IDs;
- validates supported Claim/inspection statuses;
- validates Gregorian `YYYY-MM-DD` dates;
- normalizes legacy casing such as `ProvinceName/provinceName` and `CustomerName/customerName`;
- normalizes array/single-choice values and empty sentinels;
- strips unknown fields from canonical mutation payloads;
- prevents request bodies from overriding route-owned `sheetName` and `action`.

### Persistence vs notification — resolved

Claim persistence success is no longer converted into a save failure when Telegram delivery fails.

- Save/update success is determined by persistence.
- Telegram failure is presented separately as a warning.
- Final `จบเคลม` and `จบการตรวจสอบ` notifications use a transition guard and are not resent merely because another field is edited later.

### Upstream latency handling — resolved

Google Apps Script requests use a shared timeout. Cold-start latency no longer relies on indefinite platform waits, and timeout behavior is covered by tests.

### Read performance and compatibility — resolved for current scale

- Claim and Spare lists support server pagination with legacy fallback.
- Dashboard and Claim-person reporting support aggregate responses.
- Exact Claim ID reads are used for post-save verification.
- Apps Script uses cache-aware read paths and global filtering/sorting only when required.

### Dependency/tooling drift — resolved

The August audit's dependency and lint findings are obsolete.

- Current production dependency audit reports 0 vulnerabilities.
- ESLint runs directly through the repository script.
- Generated/build paths are ignored by lint configuration.
- TypeScript no-unused checks and Knip are clean.

## Current high-priority findings

### P1 — Claim → Spare relationship is not persisted

`TableAllPage` sends `refId` when creating a Spare Part from a Claim, and the canonical mutation layer allows the field, but `google-apps-script/Code.gs` does not persist `refId` into the Spare Part sheet row.

Impact:

- The system cannot reliably trace a Spare Part request back to the originating Claim after persistence.
- Adding this correctly requires an explicit Sheet column/schema decision and migration strategy for existing rows.

Recommendation: decide the target column and historical-row behavior before implementing.

### P1 — Claim media URLs are not persisted in Google Sheets

The Claim UI uploads media to Cloudinary and sends URLs to Telegram. The edit UI can consume `record.image`, and mutation normalization accepts `image`, but Apps Script does not currently write an image/media column for Claim rows.

Impact:

- Media is not a reliable part of the persisted Claim record.
- Reloading/history behavior depends on data that is not written by the current Apps Script implementation.
- Cloudinary assets can become orphaned when removed/replaced because there is no delete/reconciliation lifecycle.

Recommendation: decide whether media belongs in the Claim data model. If yes, add explicit media columns/metadata and lifecycle handling rather than silently extending the existing row schema.

### P1 — Telegram webhook behavior is incomplete

`/api/telegram-webhook` checks incoming text messages and calls Telegram `sendMessage`, but its outgoing payload contains `chat_id` without `text`.

Impact:

- If the webhook is configured and receives a matching message, the Telegram API call is invalid/useless.
- The route catches failures and returns HTTP 200, so this can remain unnoticed.

Recommendation: decide whether this route should be ACK-only, an echo/command handler, or removed. Do not add behavior until the intended purpose is confirmed.

### P1 — Apps Script record IDs are row-count based

Create operations derive IDs from the current sheet row count.

Impact:

- Deleting the last row can allow a later record to reuse a previously issued ID.
- IDs are unique in the current sheet state but are not guaranteed unique across history.
- This becomes more important if Claim/Spare relationships, timelines, or audit logs are added later.

Recommendation: move to a durable counter/UUID strategy before introducing cross-record traceability features.

## Current medium-priority findings

### P2 — Anonymous Apps Script deployment remains an accepted scope risk

`google-apps-script/appsscript.json` declares the web app as anonymously accessible. The Next.js APIs also do not implement Auth/RBAC because the system is intentionally scoped for internal organizational use.

Impact: if the deployment URL or application API is exposed outside the intended internal boundary, data/mutation endpoints are not protected as public-internet APIs.

Owner decision: Auth/RBAC remains out of the active V2 roadmap. Revisit this before any external/customer-facing deployment.

### P2 — Cloudinary upload controls are client-side/direct

Claim media uses a public upload preset and direct browser upload. The current component does not enforce a server-owned upload authorization lifecycle or asset deletion lifecycle.

Recommendation: acceptable only if the current internal usage/cost profile is understood. Harden before broader exposure or higher upload volume.

### P2 — Mutation validation has no explicit field-length/request-size policy

Canonical mutation validation checks shape, dates, enums, and required fields, but does not define business-level maximum lengths for free-text fields or an application-level request-size budget.

Recommendation: add limits when actual operational constraints are known; avoid arbitrary limits that break current internal workflows.

### P2 — Domain typing still contains compatibility breadth

The repository still uses generic/dynamic Sheet row shapes in several screens and supports legacy field aliases. This is deliberate compatibility code, not currently dead code.

Recommendation: narrow types incrementally only when touching the associated workflow and keep behavior tests around each conversion.

### P2 — Legacy fallback paths remain active compatibility code

Dashboard, Claim list, Spare list, and Claim-person reporting keep fallback paths for older Apps Script deployments.

These paths should **not** be removed as dead code until the deployed Apps Script version is known to support the current pagination/aggregate markers everywhere the app runs.

## Cleanup audit — 2026-09-08

### Static dead-code checks

- `npx knip`: 0 unused files/exports/dependencies before this cleanup batch.
- `npx tsc --noEmit --noUnusedLocals --noUnusedParameters`: 0 unused locals/parameters before this cleanup batch.
- Source scan found no commented-out executable TypeScript/JavaScript statements.
- No `TODO`, `FIXME`, `HACK`, or `XXX` markers were found in runtime source.

### Confirmed cleanup targets removed in this batch

- stale commented-out Tailwind `@theme` block in `src/app/globals.css`;
- unused custom CSS selectors with no repository callers: `custom-divider`, `sidebar-shadow`, `select-table-container`, `select-table-title`, `animated-card`, `custom-submenu-popup`;
- stale `#workflow` scroll-margin selector with no corresponding landing-page section;
- create-next-app placeholder comment in `next.config.ts`;
- stale filename comment in `eslint.config.mjs`;
- stale Claim comments including an obsolete `ส่ง LINE` note while the implementation uses Telegram;
- root create-next-app `README.md`, removed by Owner decision;
- local Checkmarx extension artifact `.vscode/.checkmarxIgnored`, with that local artifact now ignored by Git.

### Comments intentionally retained

Explanatory comments around Apps Script caching, pagination/aggregate compatibility, exact-ID verification, Thai Buddhist-date normalization, retry rules, and legacy deployed-script fallbacks are retained because they document non-obvious correctness/performance behavior.

## Documentation status

- `TODO.md` is the active roadmap/scope tracker.
- `PROJECT_AUDIT.md` is the current engineering health/risk snapshot.
- `google-apps-script/README.md` remains the operational Apps Script deployment guide.
- The root create-next-app README was intentionally removed.
- A tracked `.env.example` is still absent; environment requirements remain a documentation gap if onboarding another machine/operator becomes necessary.

## Active roadmap boundary

No new feature phase is started by this audit/cleanup work.

Still deferred unless explicitly unlocked by the Owner:

- Action Center / งานวันนี้
- Aging/SLA UI
- Spare Part lifecycle UI
- Navigation V2
- Claim activity timeline
- Notification delivery log
- Global search
- Customer history
- Data Quality / Exception Center
- Auth/RBAC/session system
- database migration away from Google Sheets / Apps Script

## Recommended next cleanup order

Before starting feature work, remaining cleanup can be limited to evidence-driven items:

1. keep `knip`, TypeScript no-unused, lint, tests, and build green;
2. remove only dead compatibility code after confirming the deployed Apps Script no longer needs its fallback path;
3. continue reducing stale/redundant comments only where they no longer describe current behavior;
4. incrementally narrow generic Sheet types when behavior tests exist;
5. decide the three unresolved integration contracts before changing Sheet schema: `refId`, Claim media persistence, and Telegram webhook purpose.
