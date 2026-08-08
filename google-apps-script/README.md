# Google Apps Script deployment

1. Open the Apps Script project currently serving `GOOGLE_SCRIPT_URL`.
2. Replace its main source with `Code.gs` from this directory and save.
3. Set **Project Settings → Time zone** to `Asia/Bangkok`.
4. Run `backupAndMigrateBuyProductDates` once from the editor.
   - Approve the spreadsheet permission prompt.
   - Confirm a new sheet named `ใบเคลม-backup-YYYYMMDD-HHmmss` exists.
   - Confirm the former Buddhist-year value `2569-06-22` is now `2026-06-22`.
5. Choose **Deploy → Manage deployments → Edit**, select **New version**, then deploy.
6. Keep the existing Web App URL and confirm it matches `GOOGLE_SCRIPT_URL` in local and production environments.
7. Verify that a GET request with `?sheetName=ใบเคลม` returns an array and that update responses contain `result`, `id`, and `buyProductDate`.

Do not run the migration more than once unless a new Buddhist-year value was introduced. The migration ignores empty values, `-`, and years below 2400.
