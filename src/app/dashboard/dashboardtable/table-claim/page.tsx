'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Form,
  Input,
  Button,
  Typography,
  Checkbox,
  Select,
  Divider,
  message,
  notification,
  Radio,
} from 'antd';
import DatePicker from '@/components/ThaiDatePicker';
import dayjs from 'dayjs';
import CRUDClaim from '../components/CRUDClaim';
import ClaimBuyProductDateField from '../../components/ClaimBuyProductDateField';
import ClaimMediaUpload from '../../components/ClaimMediaUpload';
import PaginatedListToolbar from '../../components/PaginatedListToolbar';
import ProductSelect from '../../components/ProductSelect';
import { formatClaimDateForApi, parseClaimDate } from '@/lib/claim-date';
import { type ClaimMediaItem, mediaItemFromUrl } from '@/lib/claim-media';
import {
  CLAIM_STATUS_OPTIONS,
  INSPECTION_STATUS_OPTIONS,
  PROVINCE_EDIT_OPTIONS,
  SERVICE_CHARGE_OPTIONS,
  VEHICLE_EDIT_OPTIONS,
  WARRANTY_OPTIONS,
} from '@/lib/claim-options';
import { useProductOptions } from '@/hooks/useProductOptions';
import { sendClaimNotification } from '@/lib/claim-notification-client';
import { getClaimUpdateNotificationType } from '@/lib/claim-notification-transition';
import { replaceEmptySheetValuesWithDash } from '@/lib/sheet-form';
import {
  filterSheetRows,
  getSheetProvinceOptions,
  withFallbackSheetRowIds,
} from '@/lib/sheet-row-utils';
import type { SheetFormValues, SheetRow } from '@/lib/sheet-types';
import { fetchJsonArray, fetchJsonPage } from '@/lib/client-fetch';

const PAGE_SIZE = 8;

class ClaimPersistenceError extends Error {}

function normalizeClaimProduct(value: unknown): string {
  return typeof value === 'string' && value.trim() ? value.trim() : '-';
}

export default function DashboardTablePage() {
  const [claims, setClaims] = useState<SheetRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<SheetRow | null>(null);
  const [searchText, setSearchText] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [form] = Form.useForm();
  const [filteredClaims, setFilteredClaims] = useState<SheetRow[]>([]);
  const [api, contextHolder] = notification.useNotification();
  const [modalMediaItems, setModalMediaItems] = useState<ClaimMediaItem[]>([]);
  const productOptions = useProductOptions();
  const [selectedProvince, setSelectedProvince] = useState<string | undefined>();
  const [selectedClaimStatus, setSelectedClaimStatus] = useState<string | undefined>();
  const [selectedInspectStatus, setSelectedInspectStatus] = useState<string | undefined>();
  const [serverPagination, setServerPagination] = useState<boolean | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [serverProvinceOptions, setServerProvinceOptions] = useState<string[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const sendNotification = async (payload: Record<string, unknown>) => {
    try {
      await sendClaimNotification(payload);
    } catch (error) {
      api.warning({
        message: 'อัปเดตข้อมูลแล้ว แต่แจ้งเตือนไม่สำเร็จ',
        description:
          error instanceof Error
            ? error.message
            : 'ข้อมูลถูกบันทึกแล้ว กรุณาแจ้งผู้ดูแลให้ตรวจสอบ Telegram',
        placement: 'topRight',
      });
    }
  };

  const verifyClaimPersistence = async (
    id: string,
    expectedProduct: unknown,
    expectedDate: string
  ) => {
    const normalizedId = String(id).trim();
    const normalizedExpectedProduct = normalizeClaimProduct(expectedProduct);
    const assertPersistedClaim = (updatedRecord: Record<string, unknown> | undefined) => {
      if (!updatedRecord) throw new ClaimPersistenceError('ไม่พบรายการหลังอัปเดต');

      const persistedProduct = normalizeClaimProduct(
        updatedRecord.Product ?? updatedRecord.product
      );
      if (persistedProduct !== normalizedExpectedProduct) {
        throw new ClaimPersistenceError('สินค้าใน Google Sheet ไม่ตรงกับค่าที่บันทึก');
      }

      const persistedDate = formatClaimDateForApi(
        updatedRecord.buyProductDate ?? updatedRecord.BuyProductDate,
        '-'
      );
      if (persistedDate !== expectedDate) {
        throw new ClaimPersistenceError('วันที่ซื้อใน Google Sheet ไม่ตรงกับค่าที่บันทึก');
      }
    };

    // New deployments can verify one row by ID. The marker prevents an older Apps Script
    // deployment that ignores `id` from being mistaken for a successful exact lookup.
    try {
      const params = new URLSearchParams({ id: normalizedId, page: '1', limit: '1' });
      const exact = await fetchJsonPage<SheetRow>(`/api/get-claim?${params.toString()}`);
      if (exact.idApplied === normalizedId) {
        const updatedRecord = exact.items.find(
          item => String(item.id || '').trim() === normalizedId
        );
        assertPersistedClaim(updatedRecord as Record<string, unknown> | undefined);
        return;
      }
    } catch (error) {
      if (error instanceof ClaimPersistenceError) throw error;
      // Compatibility fallback below keeps verification working with an older deployment.
    }

    const rows = await fetchJsonArray<SheetRow>('/api/get-claim');
    const updatedRecord = rows.find(item => String(item.id || '').trim() === normalizedId);
    assertPersistedClaim(updatedRecord as Record<string, unknown> | undefined);
  };

  const provinceOptions = useMemo(
    () => (serverPagination === true ? serverProvinceOptions : getSheetProvinceOptions(claims)),
    [claims, serverPagination, serverProvinceOptions]
  );

  const fetchClaims = async (signal?: AbortSignal, forceLegacy = false) => {
    setLoading(true);
    try {
      if (!forceLegacy && serverPagination !== false) {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(PAGE_SIZE),
          sort: 'claimPriority',
        });
        if (searchText) params.set('search', searchText);
        if (selectedProvince && selectedProvince !== 'ทั้งหมด') {
          params.set('provinceName', selectedProvince);
        }
        if (selectedClaimStatus && selectedClaimStatus !== 'ทั้งหมด') {
          params.set('status', selectedClaimStatus);
        }
        if (selectedInspectStatus && selectedInspectStatus !== 'ทั้งหมด') {
          params.set('inspectstatus', selectedInspectStatus);
        }

        const paged = await fetchJsonPage<SheetRow>(`/api/get-claim?${params.toString()}`, {
          signal,
        });

        // The marker proves that the deployed Apps Script supports global Claim ordering.
        // Older deployments fall back to the original full-list logic to avoid changing behavior.
        if (paged.sortApplied === 'claimPriority') {
          if (paged.items.length === 0 && paged.total > 0 && page > 1) {
            setPage(Math.max(1, paged.totalPages));
            return;
          }

          const withId = withFallbackSheetRowIds(paged.items, (page - 1) * PAGE_SIZE);
          setServerPagination(true);
          setClaims(withId);
          setFilteredClaims(withId);
          setTotal(paged.total);
          setServerProvinceOptions(paged.facets?.provinces || []);
          return;
        }
      }

      const data = await fetchJsonArray<SheetRow>('/api/get-claim', { signal });
      const withId = withFallbackSheetRowIds(data);
      const baseFilter = withId.slice().reverse();

      setServerPagination(false);
      setClaims(baseFilter);
      setFilteredClaims(baseFilter);
      setTotal(baseFilter.length);
    } catch (err) {
      if (signal?.aborted) return;
      message.error('โหลดข้อมูลไม่สำเร็จ');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  };

  useEffect(() => {
    if (serverPagination === false) return;
    const controller = new AbortController();
    fetchClaims(controller.signal);
    return () => controller.abort();
  }, [page, searchText, selectedProvince, selectedClaimStatus, selectedInspectStatus, refreshKey]);

  useEffect(() => {
    if (serverPagination !== false) return;

    const data = filterSheetRows(claims, {
      province: selectedProvince,
      search: searchText,
      status: selectedClaimStatus,
      inspectStatus: selectedInspectStatus,
    });
    setFilteredClaims(data);
    setTotal(data.length);
  }, [
    claims,
    selectedProvince,
    selectedClaimStatus,
    selectedInspectStatus,
    searchText,
    serverPagination,
  ]);

  const onProvinceChange = (val?: string) => {
    setSelectedProvince(val);
    setPage(1);
  };
  const onClaimStatusChange = (val?: string) => {
    setSelectedClaimStatus(val);
    setPage(1);
  };
  const onInspectStatusChange = (val?: string) => {
    setSelectedInspectStatus(val);
    setPage(1);
  };

  const handleSearch = (value: string) => {
    const normalized = value.trim();
    setSearchInput(value);
    setSearchText(normalized);
    setPage(1);
  };

  // ใส่ไว้ใน DashboardTablePage
  const getPriority = (r: SheetRow) => {
    if (r.status === 'ไปเคลมเอง') return 0;

    // เคสที่ทั้งรอเคลม และรอตรวจสอบ
    if (r.status === 'รอเคลม' && r.inspectstatus === 'รอตรวจสอบ') return 1;

    if (r.status === 'รอเคลม') return 2;

    if (r.status === 'ยกเลิกเคลม') return 3;

    if (r.status === 'จบเคลม') return 4;

    return 5; // ลำดับสุดท้ายคือรายการที่ไม่เข้าเงื่อนไขข้างต้น
  };

  // คง reverse เดิมเป็นตัวผูกลำดับในกลุ่ม (ใหม่ก่อน)
  const toTime = (d?: string) => {
    // แปลงวันที่ (ถ้าไม่มีให้เป็น 0)
    const t = d && !isNaN(Date.parse(d)) ? Date.parse(d) : 0;
    return t;
  };

  const orderedClaims = useMemo(() => {
    if (serverPagination === true) return filteredClaims;

    // Legacy fallback keeps the original client-side global ordering.
    const arr = [...filteredClaims];

    arr.sort((a, b) => {
      const pa = getPriority(a);
      const pb = getPriority(b);
      if (pa !== pb) return pa - pb;

      // ผูกอันดับในกลุ่ม: ใช้วันที่ใหม่ก่อน (claimDate > inspectionDate > receiverClaimDate > id)
      const ta = toTime(a.claimDate) || toTime(a.inspectionDate) || toTime(a.receiverClaimDate);
      const tb = toTime(b.claimDate) || toTime(b.inspectionDate) || toTime(b.receiverClaimDate);
      if (ta !== tb) return tb - ta;

      // สุดท้ายคง reverse เดิมด้วย id (กรณีเป็นเลข/สตริง)
      return String(b.id).localeCompare(String(a.id));
    });

    return arr;
  }, [filteredClaims, serverPagination]);

  const resetFilters = () => {
    setSelectedProvince(undefined);
    setSelectedClaimStatus(undefined);
    setSelectedInspectStatus(undefined);
    setSearchInput('');
    setSearchText('');
    setPage(1);
    if (serverPagination === false) setFilteredClaims([...claims]);
  };

  const handleRefreshAndReset = async () => {
    resetFilters();
    if (serverPagination === false) {
      await fetchClaims(undefined, true);
    } else {
      setRefreshKey(key => key + 1);
    }
  };

  const handleEdit = (record: SheetRow) => {
    form.setFieldsValue({
      provinceName: record.ProvinceName,
      customerName: record.CustomerName,
      phone: record.Phone,
      address: record.Address,
      product: record.Product ?? record.product,
      buyProductDate: parseClaimDate(record.buyProductDate ?? record.BuyProductDate),
      problem: record.Problem,
      warranty: Array.isArray(record.Warranty)
        ? record.Warranty
        : typeof record.Warranty === 'string'
          ? record.Warranty.split(', ').map((w: string) => w.trim())
          : [],
      receiver: record.receiver,
      receiverClaimDate: record.receiverClaimDate ? dayjs(record.receiverClaimDate) : null,
      inspector: record.inspector,
      vehicleInspector: Array.isArray(record.vehicleInspector)
        ? record.vehicleInspector[0]
        : typeof record.vehicleInspector === 'string'
          ? record.vehicleInspector
          : undefined,
      inspectionDate: record.inspectionDate ? dayjs(record.inspectionDate) : null,
      inspectstatus: record.inspectstatus,
      claimSender: record.claimSender,
      vehicleClaim: Array.isArray(record.vehicleClaim)
        ? record.vehicleClaim[0]
        : typeof record.vehicleClaim === 'string'
          ? record.vehicleClaim
          : undefined,
      claimDate: record.claimDate ? dayjs(record.claimDate) : null,
      status: record.status,
      serviceChargeStatus: Array.isArray(record.serviceChargeStatus)
        ? record.serviceChargeStatus
        : typeof record.serviceChargeStatus === 'string'
          ? record.serviceChargeStatus.split(', ').map((s: string) => s.trim())
          : [],
      note: record.note,
    });

    const storedUrls = record.image
      ? Array.isArray(record.image)
        ? record.image
        : [record.image]
      : [];
    setModalMediaItems(
      storedUrls.map((url: string, index: number) => mediaItemFromUrl(url, index))
    );

    setSelectedRow(record);
    setIsModalOpen(true);
  };

  const handleSubmit = async (values: SheetFormValues) => {
    setLoading(true);

    if (!selectedRow?.id) {
      api.error({
        message: 'ไม่พบข้อมูล',
        description: 'ไม่พบข้อมูล ID ที่ต้องการอัปเดต',
        placement: 'topRight',
      });
      setLoading(false);
      return;
    }

    const cleanedValues = replaceEmptySheetValuesWithDash(values);

    const fullData = {
      id: selectedRow.id,
      ...cleanedValues,
      sheetName: 'ใบเคลม',

      vehicleClaim: [values.vehicleClaim],
      vehicleInspector: [values.vehicleInspector],

      inspectionDate: values.inspectionDate?.isValid?.()
        ? values.inspectionDate.format('YYYY-MM-DD')
        : '-',

      receiverClaimDate: values.receiverClaimDate?.isValid?.()
        ? values.receiverClaimDate.format('YYYY-MM-DD')
        : '-',

      buyProductDate: formatClaimDateForApi(values.buyProductDate, '-'),

      claimDate: values.claimDate?.isValid?.() ? values.claimDate.format('YYYY-MM-DD') : '-',
    };

    const imageUrls = modalMediaItems.map(item => item.url);

    try {
      const res = await fetch('/api/update-claim', {
        method: 'POST',
        body: JSON.stringify({
          ...fullData,
          image: imageUrls,
          action: 'update',
        }), // ✔ เพิ่ม action เผื่อ script เช็กไว้
      });

      const result = await res.json();

      if (result?.result === 'success') {
        const expectedProduct = normalizeClaimProduct(fullData.product);
        if ('product' in result && normalizeClaimProduct(result.product) !== expectedProduct) {
          throw new ClaimPersistenceError('Apps Script ตอบสินค้ากลับมาไม่ตรงกับค่าที่บันทึก');
        }

        const responseDate = formatClaimDateForApi(result.buyProductDate, '-');
        if ('buyProductDate' in result && responseDate !== fullData.buyProductDate) {
          throw new ClaimPersistenceError('Apps Script ตอบวันที่ซื้อกลับมาไม่ตรงกัน');
        }
        await verifyClaimPersistence(
          selectedRow.id,
          fullData.product,
          fullData.buyProductDate
        );

        // ✅ ถ้าสถานะเป็น "จบเคลม" → ส่ง LINE

        const notificationType = getClaimUpdateNotificationType(
          {
            status: selectedRow.status,
            inspectstatus: selectedRow.inspectstatus,
          },
          {
            status: fullData.status,
            inspectstatus: fullData.inspectstatus,
          }
        );

        const notifyBase = {
          provinceName: fullData.provinceName,
          customerName: fullData.customerName,
          product: fullData.product,
          problemDetail: fullData.problem,
          warrantyStatus: fullData.warranty?.[0] || '-',
          image: imageUrls,
          note: fullData.note ?? '-',
        };

        if (notificationType === 'จบเคลม') {
          await sendNotification({
            ...notifyBase,
            claimer: fullData.claimSender || '-',
            vehicle: fullData.vehicleClaim?.[0] || '-',
            claimDate: fullData.claimDate || '-',
            serviceFeeDeducted: fullData.serviceChargeStatus?.[0] === 'หักค่าบริการแล้ว',
            notifyType: notificationType,
          });
        } else if (notificationType === 'จบการตรวจสอบ') {
          await sendNotification({
            ...notifyBase,
            inspector: fullData.inspector || '-',
            vehicle: fullData.vehicleInspector?.[0] || '-',
            inspectionDate: fullData.inspectionDate || '-',
            notifyType: notificationType,
          });
        } else {
          await sendNotification({
            ...notifyBase,
            address: fullData.address || '-',
            phone: fullData.phone || '-',
            notifyType: notificationType,
          });
        }

        api.success({
          message: 'อัปเดตข้อมูลสำเร็จ',
          description: 'ระบบได้อัปเดตรายการใบเคลมเรียบร้อยแล้ว',
          placement: 'topRight',
        });
        message.success('บันทึกการแก้ไขเรียบร้อย');
        form.resetFields();
        setIsModalOpen(false);
        fetchClaims();
      } else {
        throw new Error(result?.message || 'เกิดข้อผิดพลาด');
      }
    } catch (err) {
      if (err instanceof ClaimPersistenceError) {
        api.error({
          message: 'ข้อมูลยังไม่ถูกบันทึกครบ',
          description: `${err.message} ระบบจะไม่แจ้งว่าสำเร็จจนกว่าจะตรวจสอบข้อมูลใน Google Sheet ได้ตรงกัน`,
          placement: 'topRight',
        });
        return;
      }
      api.error({
        message: 'เกิดข้อผิดพลาด',
        description: 'อัปเดตข้อมูลไม่สำเร็จ กรุณาลองใหม่',
        placement: 'topRight',
      });
      message.error('อัปเดตไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1400px] px-3 py-4 sm:px-4 md:px-6">
      {contextHolder}

      <PaginatedListToolbar
        title="📋 ตารางใบเคลม"
        provinceOptions={provinceOptions}
        selectedProvince={selectedProvince}
        onProvinceChange={onProvinceChange}
        searchValue={searchInput}
        onSearchValueChange={value => {
          setSearchInput(value);
          if (!value) {
            setSearchText('');
            setPage(1);
          }
        }}
        onSearch={handleSearch}>
        <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Select
            allowClear
            placeholder="สถานะการตรวจสอบ"
            value={selectedInspectStatus}
            onChange={onInspectStatusChange}
            options={[{ label: 'ทั้งหมด', value: 'ทั้งหมด' }, ...INSPECTION_STATUS_OPTIONS]}
            className="w-full"
          />
          <Select
            allowClear
            placeholder="สถานะการเคลม"
            value={selectedClaimStatus}
            onChange={onClaimStatusChange}
            options={[{ label: 'ทั้งหมด', value: 'ทั้งหมด' }, ...CLAIM_STATUS_OPTIONS]}
            className="w-full"
          />
        </div>
      </PaginatedListToolbar>

      <CRUDClaim
        data={orderedClaims}
        loading={loading}
        onEdit={handleEdit}
        onRefresh={handleRefreshAndReset}
        pagination={{
          current: page,
          pageSize: PAGE_SIZE,
          total,
          showSizeChanger: false,
          responsive: true,
          showLessItems: true,
          onChange: nextPage => setPage(nextPage),
        }}
      />

      <Modal
        title={
          <div
            style={{
              fontSize: 22,
              fontWeight: 'bold',
              color: '#000000ff',
              marginTop: 16,
            }}>
            🛠️ แก้ไขรายการใบเคลม
          </div>
        }
        open={isModalOpen}
        onCancel={() => {
          setIsModalOpen(false);
          form.resetFields();
        }}
        footer={null}
        width={800}>
        <Form form={form} onFinish={handleSubmit} layout="vertical">
          <Divider />
          <Typography.Title level={4}>เครดิต</Typography.Title>
          <Form.Item name="provinceName" label="สาขา">
            <Select options={PROVINCE_EDIT_OPTIONS} />
          </Form.Item>
          <Form.Item name="customerName" label="ชื่อลูกค้า">
            <Input />
          </Form.Item>
          <Form.Item name="phone" label="เบอร์โทร">
            <Input />
          </Form.Item>
          <Form.Item name="address" label="ที่อยู่">
            <Input />
          </Form.Item>
          <Form.Item name="product" label="สินค้า">
            <ProductSelect products={productOptions} placeholder="เลือกสินค้า" />
          </Form.Item>
          <ClaimBuyProductDateField />
          <Form.Item name="problem" label="ปัญหา">
            <Input.TextArea />
          </Form.Item>
          <Form.Item name="warranty" label="ประเภทประกัน">
            <Checkbox.Group options={WARRANTY_OPTIONS} />
          </Form.Item>

          <Divider />
          <Typography.Title level={4}>🧑‍🔧 ส่วนของพนักงาน</Typography.Title>
          <Form.Item name="receiver" label="ผู้รับเคลม">
            <Input />
          </Form.Item>
          <Form.Item name="receiverClaimDate" label="วันที่รับเคลม">
            <DatePicker style={{ width: '100%' }} format="DD/MM/BBBB" />
          </Form.Item>
          <Form.Item name="inspector" label="ผู้ตรวจสอบ">
            <Input />
          </Form.Item>
          <Form.Item
            name="vehicleInspector"
            label="ยานพาหนะตรวจสอบ"
            rules={[{ required: true, message: 'กรุณาเลือกยานพาหนะที่ใช้ตรวจสอบ' }]}>
            <Radio.Group options={VEHICLE_EDIT_OPTIONS} />
          </Form.Item>
          <Form.Item name="inspectionDate" label="วันที่ตรวจสอบ">
            <DatePicker style={{ width: '100%' }} format="DD/MM/BBBB" />
          </Form.Item>

          <Form.Item name="inspectstatus" label="สถานะการตรวจสอบ">
            <Select
              placeholder="เลือกสถานะการตรวจสอบ"
              style={{ width: '100%' }}
              options={INSPECTION_STATUS_OPTIONS}
            />
          </Form.Item>

          <Form.Item name="claimSender" label="คนไปเคลม">
            <Input />
          </Form.Item>
          <Form.Item
            name="vehicleClaim"
            label="ยานพาหนะไปเคลม"
            rules={[{ required: true, message: 'กรุณาเลือกยานพาหนะที่ใช้ไปเคลม' }]}>
            <Radio.Group options={VEHICLE_EDIT_OPTIONS} />
          </Form.Item>
          <Form.Item name="claimDate" label="วันที่เคลม">
            <DatePicker style={{ width: '100%' }} format="DD/MM/BBBB" />
          </Form.Item>
          <Form.Item name="status" label="สถานะ">
            <Select options={CLAIM_STATUS_OPTIONS} />
          </Form.Item>
          <Form.Item name="serviceChargeStatus" label="ค่าบริการ">
            <Checkbox.Group options={SERVICE_CHARGE_OPTIONS} />
          </Form.Item>

          <Form.Item name="image" label="แนบรูปภาพ / วิดีโอ">
            <ClaimMediaUpload
              items={modalMediaItems}
              setItems={setModalMediaItems}
              maxCount={5}
              videoMode="autoplay"
              customRemoveForAll
              onUploadError={error =>
                api.error({
                  message: 'อัปโหลดไฟล์ไม่สำเร็จ',
                  description: error.message,
                })
              }
            />
          </Form.Item>
          <Form.Item name="note" label="หมายเหตุ">
            <Input.TextArea />
          </Form.Item>

          <Button type="primary" htmlType="submit" loading={loading}>
            บันทึกข้อมูล
          </Button>
        </Form>
      </Modal>
    </div>
  );
}
