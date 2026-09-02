# ClaimSNProgress TODO V2

Updated: 2026-09-03

## Product decision / scope

- ระบบนี้ใช้งานภายในองค์กรเป็นหลัก
- **Auth / RBAC ถูกตัดออกจาก Active Roadmap V2 ตาม Owner Decision** และไม่ใช่ blocker ของงานในรอบนี้
- V2 โฟกัสที่ความถูกต้องของข้อมูล, ความเร็วในการทำงานของพนักงาน, งานค้าง, การเคลม/อะไหล่, notification, reporting และ maintainability
- ยังคงใช้ Google Sheets + Google Apps Script เป็น persistence/integration หลักในรอบนี้ ไม่ทำ database migration ใหญ่โดยไม่จำเป็น

## Current verified baseline

- Next.js 16.3 + React 19 + Ant Design 5
- Claim และ Spare Part มี create/read/update/delete routes แล้ว
- Claim list และ Spare list รองรับ server pagination พร้อม legacy fallback
- Dashboard รองรับ aggregate response + lazy status detail pagination
- Result Claim Person รองรับ aggregate response + lazy detail pagination
- มี shared upstream timeout/error helper (`src/lib/upstream.ts`)
- มี Vitest tests แล้ว ทั้ง shared date/media/query logic และ Google Apps Script behavior
- Navigation ปัจจุบันถูก centralize ผ่าน `src/app/dashboard/components/navigation.ts`
- `/dashboard/sparepartform` ปัจจุบันใช้ `TableAllPage` ถูกต้อง; duplicate `SparePartForm.tsx` เก่าถูกลบแล้ว

---

## Phase 0 — Cleanup Gate ✅ Completed (2026-09-03)

- [x] ลบ high-confidence dead code และ unused starter assets โดยไม่เปลี่ยน business behavior
- [x] `npx tsc --noEmit --noUnusedLocals --noUnusedParameters` ผ่าน ไม่มี unused local/parameter ที่ compiler ตรวจพบ
- [x] `npx knip` ผ่าน 0 findings สำหรับ unused files/exports/dependencies
- [x] รวม duplicate business/API/helper logic เป็น shared modules/components เช่น Sheet upstream transport, Claim options/status, media upload, product options, row filtering, table shell, Spare Part form fields และ report filters
- [x] ลด jscpd duplicated lines รวมจากประมาณ `8.77%` เหลือ `1.90%`
- [x] TypeScript duplicate logic ตาม jscpd เหลือ `0.00%`; clone ที่เหลือเป็น TSX/UI scaffolding ที่ไม่ควรฝืน abstract จน maintenance แย่ลง
- [x] `npm run lint` ผ่าน
- [x] `npm test` ผ่าน 5 test files / 30 tests
- [x] `npm run build` ผ่าน production build ครบทุก route
- [x] External App Router/API entry points เช่น `/api/part-request` ถูกเก็บไว้เมื่อยังไม่มีหลักฐานว่า external caller ไม่มีอยู่จริง

**Cleanup Gate definition:** ก่อนเริ่ม feature ใหม่ ให้ baseline นี้ยังคงผ่าน TypeScript unused checks, Knip, lint, tests และ production build; ห้ามไล่ duplication ให้เป็น 0% ด้วย abstraction ที่เพิ่มความซับซ้อนโดยไม่มีประโยชน์ทาง maintenance

---

## P0 — Reliability / correctness first

### 1. Standardize mutation success contracts

- [ ] ทำ response contract ของ `submit-part`, `update-part`, `delete-part`, `delete-claim` ให้ตรวจ upstream business result แบบเดียวกับ Claim routes
- [ ] ห้ามคืน HTTP 200 เมื่อ Apps Script ตอบกลับว่า operation ไม่สำเร็จ แม้ upstream HTTP จะเป็น 2xx
- [ ] ใช้ success/error envelope รูปแบบเดียวกันสำหรับ frontend consumers
- [ ] เพิ่ม tests ครอบคลุม upstream success, rejected result, invalid JSON และ timeout

**เหตุผล:** Claim create/update ตรวจ `result === "success"` แล้ว แต่ Spare และ delete บาง route ยังคืน 200 จาก response ที่ยังไม่ได้ยืนยัน business success

### 2. Separate persistence success from Telegram notification result

- [ ] การบันทึก Claim สำเร็จต้องถือว่าสำเร็จแม้ Telegram notification ล้มเหลว
- [ ] แสดง notification failure เป็น warning แยกจาก save/update failure
- [ ] ส่ง event `จบเคลม` / `จบการตรวจสอบ` เฉพาะตอนเกิด status transition จริง ไม่ส่งซ้ำทุกครั้งที่แก้ field อื่น
- [ ] ป้องกัน duplicate notification จาก retry/re-render ด้วย event key หรือ transition guard
- [ ] เพิ่ม tests สำหรับ save-success + notify-fail และ repeated update

**เหตุผล:** ปัจจุบัน create/update รอ Telegram หลัง persistence และ update สามารถส่ง final-status notification ซ้ำเมื่อ record ที่จบแล้วถูกแก้ไขอีกครั้ง

### 3. Add shared request validation + canonical normalization

- [ ] สร้าง shared validation สำหรับ Claim/Spare mutation payloads
- [ ] ตรวจ required fields, IDs, status enums, date formats และชนิดข้อมูลก่อนส่งเข้า Apps Script
- [ ] รวม normalization ของ `ProvinceName/provinceName`, `CustomerName/customerName`, date และค่า empty (`''` / `'-'`) ไว้จุดเดียว
- [ ] ลดการ spread arbitrary request body เข้า privileged upstream request โดยตรง
- [ ] เพิ่ม unit tests สำหรับ canonical Claim/Spare models

### 4. Critical workflow regression tests

- [ ] Claim create success/failure
- [ ] Claim update + date persistence verification
- [ ] Claim status transition notification behavior
- [ ] Spare create/update/delete success/failure
- [ ] Claim delete success/failure
- [ ] Pagination/filter query contract
- [ ] Apps Script aggregate compatibility fallback

---

## P1 — Daily operations / productivity

### 5. Add "งานวันนี้" / Action Center

- [ ] เพิ่มหน้า `/dashboard/action-center`
- [ ] รวมงานที่ต้องลงมือทำไว้หน้าเดียวแทนการไล่เปิดหลายตาราง
- [ ] แสดง bucket อย่างน้อย:
  - รอตรวจสอบ (`status = รอเคลม` + `inspectstatus = รอตรวจสอบ`)
  - ตรวจสอบเสร็จแล้วแต่ยังรอเคลม
  - ไปเคลมเอง
  - เคสที่มีรายการเบิกอะไหล่และยังไม่รับของคืน
  - งานค้างนานตาม Aging threshold
- [ ] แต่ละ bucket มี count, filter จังหวัด, search และเปิด record ไปแก้ได้โดยตรง
- [ ] ทำ aggregate/query ฝั่ง Apps Script ก่อน หากข้อมูลมากพอที่จะไม่ควรโหลด full sheet

### 6. Add Aging / SLA visibility

- [ ] คำนวณอายุเคสจากวันที่ที่มีอยู่จริง เช่น `receiverClaimDate`, `inspectionDate`, `claimDate`
- [ ] คำนวณอายุรายการอะไหล่จาก `requestDate` ถึง `receiverItemDate` หรือวันนี้ถ้ายังไม่รับ
- [ ] เพิ่ม Aging buckets เช่น `0-1`, `2-3`, `4-7`, `8+ วัน`
- [ ] แสดง overdue badge ใน Action Center และ Claim/Spare tables
- [ ] ทำ threshold เป็น config กลาง ไม่ hardcode กระจายหลายหน้า
- [ ] ยังไม่เรียก threshold ว่า SLA ทางธุรกิจจนกว่า Owner จะกำหนดเกณฑ์จริง

### 7. Make Spare Part lifecycle clearer

- [ ] สร้าง derived lifecycle จาก field ที่มีอยู่ก่อน โดยไม่เพิ่ม schema ถ้าไม่จำเป็น
- [ ] ตัวอย่างสถานะ: `เบิกแล้ว` → `จ่ายของแล้ว` → `รับของคืนแล้ว`
- [ ] ใช้ `requestDate/requester`, `payer`, `receiver/receiverItemDate` เป็นแหล่งข้อมูล
- [ ] เพิ่ม lifecycle badge + filter ในหน้า Spare Part
- [ ] เพิ่มรายการ "รอรับของคืน" ใน Action Center
- [ ] ค่อยเพิ่ม explicit `partStatus` field เฉพาะเมื่อ derived state ไม่พอสำหรับ workflow จริง

### 8. Navigation information architecture V2

- [ ] เพิ่ม `งานวันนี้` เป็นเมนูหลักหลังหน้าหลัก
- [ ] รักษา route เดิมไว้เพื่อไม่กระทบ bookmark/workflow เดิม
- [ ] พิจารณาจัดกลุ่มเมนูเป็น `เคลม`, `อะไหล่`, `รายงาน`, `แก้ไขข้อมูล` เมื่อ Feature P1 พร้อม
- [ ] Desktop/Mobile ต้องยังใช้ `DASHBOARD_NAVIGATION` source เดียวกัน

---

## P2 — Traceability / insight

### 9. Claim activity timeline

- [ ] ออกแบบ event log สำหรับ create/update/status change/part request/notification
- [ ] แสดง timeline ใน Claim detail/edit modal
- [ ] เก็บเวลา, event type, record id และ summary ของการเปลี่ยนแปลง
- [ ] ถ้าต้องมีชื่อผู้ทำรายการ ให้ใช้ข้อมูลที่ workflow มีอยู่หรือเพิ่ม operator field แบบง่าย โดยไม่พ่วงระบบ Auth
- [ ] หลีกเลี่ยงการ reconstruct history จาก current row เพราะ Google Sheet row ปัจจุบันเก็บเฉพาะ state ล่าสุด

### 10. Notification delivery log

- [ ] เก็บ sent/failed timestamp, notifyType, claim id และ error summary
- [ ] แสดงรายการ failed notification ที่ retry ได้
- [ ] เชื่อมกับ transition guard จาก P0 เพื่อไม่ส่ง final-status event ซ้ำ

### 11. Global search

- [ ] เพิ่ม search entry กลางจาก Header หรือ Action Center
- [ ] ค้น Claim + Spare Part จากข้อมูลที่มี เช่น ID, ลูกค้า, เบอร์โทร, สินค้า, ปัญหา, ชื่ออะไหล่
- [ ] ใช้ server search/query เมื่อ dataset โต ไม่โหลด full Claim + Spare sheet พร้อมกันบน client

### 12. Customer claim history

- [ ] เปิดดูประวัติเคลมของลูกค้าจากเบอร์โทร + ชื่อลูกค้า + สินค้า
- [ ] แสดงจำนวนเคสก่อนหน้า, ปัญหาซ้ำ, วันที่เคลมล่าสุด และอะไหล่ที่เคยเบิก
- [ ] ยังไม่เพิ่ม Serial Number field ใน V2 จนกว่าจะยืนยันว่าหน้างานต้องใช้จริง

### 13. Data Quality / Exception Center

- [ ] ตรวจ record ที่ไม่มี ID หรือ ID ซ้ำ
- [ ] ตรวจ date/status ที่ขัดกัน เช่น `จบเคลม` แต่ไม่มี `claimDate`
- [ ] ตรวจ Spare ที่มี `receiverItemDate` แต่ข้อมูล receiver/payer ไม่ครบ
- [ ] ตรวจ field casing/legacy values ที่ยังไม่ normalize
- [ ] แสดง warning ก่อนแก้ข้อมูล ไม่ auto-rewrite historical rows โดยไม่มี verification

---

## P3 — Maintainability / cleanup

### 14. API contract cleanup

- [ ] ตรวจว่า `/api/part-request` ยังมี external caller หรือไม่
- [ ] ถ้าไม่มี caller ให้ consolidate กับ `/api/submit-part` หลังทดสอบครบ
- [ ] ลด response shape หลายแบบ (`{message:text}`, raw JSON, `{result}`) ให้เหลือ contract กลาง

### 15. Continue type cleanup incrementally

- [ ] แยก canonical `ClaimRow`, `SpareRow`, request DTO และ aggregate DTO ออกจาก generic `SheetRow`
- [ ] ลด index signature/`any` เฉพาะบริเวณที่แตะในแต่ละ feature batch
- [ ] ห้าม refactor type ครั้งใหญ่โดยไม่มี behavior tests รองรับ

### 16. Dead code / logs / docs audit

- [ ] Search unused components/helpers/imports หลัง feature batch
- [ ] ตรวจ stale TODO/FIXME และ unreachable branches
- [ ] ลด debug logging ที่ไม่จำเป็น โดยเฉพาะข้อมูลลูกค้า/webhook payload
- [ ] อัปเดต README เรื่อง architecture, Apps Script deployment, required env และ recovery steps
- [ ] Treat App Router/API routes เป็น external entry points; ห้ามลบเพราะไม่มี internal import อย่างเดียว

---

## Completed performance work — archived baseline (2026-09-01)

- [x] Remove duplicate filtering/search work in `TableAllPage`
- [x] Deterministic table row keys
- [x] Reduce repeated date parsing/render calculations
- [x] Exact-ID Claim save verification via Apps Script
- [x] Dashboard aggregate + lazy detail pagination
- [x] Result Claim Person aggregate + lazy detail pagination
- [x] Claim/Spare server pagination activation
- [x] Dashboard layout client-boundary reduction
- [x] Static/server Footer
- [x] Centralized desktop/mobile navigation config
- [x] Parts Price mobile/render optimization
- [x] Mobile overflow/performance verification at 390×844

---

## Explicitly deferred / out of scope for V2

- Auth / RBAC / session system
- Database migration away from Google Sheets / Apps Script
- Large visual redesign unrelated to workflow
- New customer-facing portal
- Serial-number/device domain until business usage is confirmed

---

## Recommended implementation order

### Phase 0 — Cleanup gate ✅ Completed

Baseline cleanup/DRY/static-analysis/verification completed on 2026-09-03. Preserve this gate before every later phase.

### Phase A — Correctness gate

1. Mutation response contracts
2. Notification non-blocking + transition guard
3. Shared validation/normalization
4. Critical workflow tests

### Phase B — Operator workflow

1. Action Center
2. Aging visibility
3. Spare lifecycle
4. Navigation grouping

### Phase C — Traceability

1. Activity timeline
2. Notification log
3. Global search

### Phase D — Insight / cleanup

1. Customer history
2. Exception Center
3. API/type/dead-code cleanup

---

## Validation rule

For every implementation batch, run:

1. `npm run lint`
2. `npx tsc --noEmit`
3. `npm test`
4. `npm run build`

Do not commit or push unless explicitly requested.
