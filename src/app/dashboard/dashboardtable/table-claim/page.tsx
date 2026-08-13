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
  Upload,
  Radio,
} from 'antd';
import DatePicker from '@/components/ThaiDatePicker';
import dayjs from 'dayjs';
import CRUDClaim from '../components/CRUDClaim';
import PlusOutlined from '@ant-design/icons/lib/icons/PlusOutlined';
import { formatClaimDateForApi, isSupportedGregorianDate, parseClaimDate } from '@/lib/claim-date';
import { ClaimMediaItem, mediaItemFromCloudinary, mediaItemFromUrl } from '@/lib/claim-media';
import type { SheetFormValues, SheetRow } from '@/lib/sheet-types';
import { fetchJsonArray } from '@/lib/client-fetch';

class BuyProductDatePersistenceError extends Error {}

export default function DashboardTablePage() {
  const [claims, setClaims] = useState<SheetRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<SheetRow | null>(null);
  const [searchText, setSearchText] = useState('');
  const [form] = Form.useForm();
  const [filteredClaims, setFilteredClaims] = useState<SheetRow[]>([]);
  const [api, contextHolder] = notification.useNotification();
  const [modalMediaItems, setModalMediaItems] = useState<ClaimMediaItem[]>([]);
  const [productOptions, setProductOptions] = useState<string[]>([]);
  const [selectedProvince, setSelectedProvince] = useState<string | undefined>();
  const [selectedClaimStatus, setSelectedClaimStatus] = useState<string | undefined>();
  const [selectedInspectStatus, setSelectedInspectStatus] = useState<string | undefined>();

  const sendNotification = async (payload: Record<string, unknown>) => {
    try {
      const response = await fetch('/api/notify-claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(result?.message || result?.error || 'Notification request failed');
      }
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

  const verifyBuyProductDate = async (id: string, expectedDate: string) => {
    const response = await fetch('/api/get-claim', { cache: 'no-store' });
    if (!response.ok) throw new BuyProductDatePersistenceError('โหลดข้อมูลเพื่อตรวจสอบไม่สำเร็จ');

    const rows: unknown = await response.json();
    if (!Array.isArray(rows)) {
      throw new BuyProductDatePersistenceError('รูปแบบข้อมูลตรวจสอบไม่ถูกต้อง');
    }

    const updatedRecord = rows.find(
      row =>
        row && typeof row === 'object' && 'id' in row && String(row.id).trim() === String(id).trim()
    ) as Record<string, unknown> | undefined;

    if (!updatedRecord) throw new BuyProductDatePersistenceError('ไม่พบรายการหลังอัปเดต');

    const persistedDate = formatClaimDateForApi(
      updatedRecord.buyProductDate ?? updatedRecord.BuyProductDate,
      '-'
    );
    if (persistedDate !== expectedDate) {
      throw new BuyProductDatePersistenceError('วันที่ซื้อใน Google Sheet ไม่ตรงกับค่าที่บันทึก');
    }
  };

  // รายการจังหวัด (unique) จากข้อมูลที่ดึงมา
  const provinceOptions = useMemo(() => {
    const set = new Set<string>();
    claims.forEach(c => {
      const p = c.ProvinceName || c.provinceName;
      if (p && typeof p === 'string') set.add(p.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'th'));
  }, [claims]);

  const claimStatusOptions = [
    { label: 'ไปเคลมเอง', value: 'ไปเคลมเอง' },
    { label: 'รอเคลม', value: 'รอเคลม' },
    { label: 'จบเคลม', value: 'จบเคลม' },
    { label: 'ยกเลิกเคลม', value: 'ยกเลิกเคลม' },
  ];

  const inspectStatusOptions = [
    { label: 'ไปตรวจสอบเอง', value: 'ไปตรวจสอบเอง' },
    { label: 'รอตรวจสอบ', value: 'รอตรวจสอบ' },
    { label: 'จบการตรวจสอบ', value: 'จบการตรวจสอบ' },
    { label: 'ยกเลิกการตรวจสอบ', value: 'ยกเลิกการตรวจสอบ' },
  ];

  useEffect(() => {
    const controller = new AbortController();
    const fetchProducts = async () => {
      try {
        const res = await fetch('/api/get-productlist', { signal: controller.signal });
        const data = await res.json();
        const names = (data as Array<Record<string, string>>).map(
          p => p['สินค้า'] || p.name || 'ไม่ทราบชื่อ'
        );
        setProductOptions(names);
      } catch (err) {
        if (controller.signal.aborted) return;
        console.error('โหลดสินค้าไม่สำเร็จ:', err);
      }
    };
    fetchProducts();
    return () => controller.abort();
  }, []);

  const fetchClaims = async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const data = await fetchJsonArray<SheetRow>('/api/get-claim', { signal });

      const withId = data.map((d, index) => ({
        ...d,
        id: d.id?.trim() || `row-${index}`,
      }));

      const baseFilter = withId.slice().reverse();

      setClaims(baseFilter);
      setFilteredClaims(baseFilter);
      setSearchText('');
    } catch (err) {
      if (signal?.aborted) return;
      message.error('โหลดข้อมูลไม่สำเร็จ');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchClaims(controller.signal);
    return () => controller.abort();
  }, []);

  const applyFilters = () => {
    const text = searchText.toLowerCase().trim();

    let data = [...claims]; // เริ่มจากข้อมูลดิบทั้งหมด

    // กรองจังหวัด
    if (selectedProvince && selectedProvince !== 'ทั้งหมด') {
      data = data.filter(i => {
        const p = i.ProvinceName || i.provinceName;
        return typeof p === 'string' && p.trim() === selectedProvince;
      });
    }

    // กรองสถานะการเคลม
    if (selectedClaimStatus && selectedClaimStatus !== 'ทั้งหมด') {
      data = data.filter(i => i.status === selectedClaimStatus);
    }

    // กรองสถานะการตรวจสอบ
    if (selectedInspectStatus && selectedInspectStatus !== 'ทั้งหมด') {
      data = data.filter(i => i.inspectstatus === selectedInspectStatus);
    }

    // กรองด้วยคำค้นหา (ค้นทุกฟิลด์ string)
    if (text) {
      data = data.filter(item =>
        Object.values(item).some(
          field => typeof field === 'string' && field.toLowerCase().includes(text)
        )
      );
    }

    setFilteredClaims(data);
  };

  useEffect(() => {
    applyFilters();
  }, [claims, selectedProvince, selectedClaimStatus, selectedInspectStatus, searchText]);

  const onProvinceChange = (val?: string) => setSelectedProvince(val);
  const onClaimStatusChange = (val?: string) => setSelectedClaimStatus(val);
  const onInspectStatusChange = (val?: string) => setSelectedInspectStatus(val);

  const handleSearch = (value: string) => setSearchText(value.trim());

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
    // ไม่แก้ของเดิม
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
  }, [filteredClaims]);

  const resetFilters = () => {
    setSelectedProvince(undefined);
    setSelectedClaimStatus(undefined);
    setSelectedInspectStatus(undefined);
    setSearchText('');
    setFilteredClaims([...claims]);
  };

  const handleRefreshAndReset = async () => {
    resetFilters();
    await fetchClaims(); // โหลดข้อมูลใหม่
  };

  const handleEdit = (record: SheetRow) => {
    form.setFieldsValue({
      provinceName: record.ProvinceName,
      customerName: record.CustomerName,
      phone: record.Phone,
      address: record.Address,
      product: record.Product,
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

  const handleDelete = async (record: SheetRow) => {
    try {
      const res = await fetch('/api/delete-claim', {
        method: 'POST',
        body: JSON.stringify({
          id: record.id,
          sheetName: 'ใบเคลม',
        }),
      });
      const result = await res.json();
      if (result.result === 'success') {
        api.success({
          message: 'ลบข้อมูลสำเร็จ',
          description: `ระบบลบข้อมูลของลูกค้า ${record.CustomerName || ''} แล้ว`,
          placement: 'topRight',
        });
        message.success('ลบข้อมูลแล้ว');
        fetchClaims();
      } else {
        throw new Error(result.message);
      }
    } catch (err) {
      api.error({
        message: 'เกิดข้อผิดพลาด',
        description: 'ลบข้อมูลไม่สำเร็จ กรุณาลองใหม่',
        placement: 'topRight',
      });
    }
  };

  const replaceEmptyWithDash = (obj: SheetFormValues) => {
    const newObj: SheetFormValues = {};
    for (const key in obj) {
      if (obj[key] === '' || obj[key] === null || obj[key] === undefined) {
        newObj[key] = '-';
      } else if (Array.isArray(obj[key]) && obj[key].length === 0) {
        newObj[key] = '-';
      } else {
        newObj[key] = obj[key];
      }
    }
    return newObj;
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

    const cleanedValues = replaceEmptyWithDash(values);

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
        const responseDate = formatClaimDateForApi(result.buyProductDate, '-');
        if ('buyProductDate' in result && responseDate !== fullData.buyProductDate) {
          throw new BuyProductDatePersistenceError('Apps Script ตอบวันที่ซื้อกลับมาไม่ตรงกัน');
        }
        await verifyBuyProductDate(selectedRow.id, fullData.buyProductDate);

        // ✅ ถ้าสถานะเป็น "จบเคลม" → ส่ง LINE

        const inspectStatus = fullData.inspectstatus;
        const claimStatus = fullData.status;

        // ✅ fallback กลางสำหรับส่งไลน์
        const notifyBase = {
          provinceName: fullData.provinceName,
          customerName: fullData.customerName,
          product: fullData.product,
          problemDetail: fullData.problem,
          warrantyStatus: fullData.warranty?.[0] || '-',
          image: imageUrls,
          note: fullData.note ?? '-',
        };

        if (claimStatus === 'จบเคลม') {
          await sendNotification({
            ...notifyBase,
            claimer: fullData.claimSender || '-',
            vehicle: fullData.vehicleClaim?.[0] || '-',
            claimDate: fullData.claimDate || '-',
            amount: fullData.price || '-' + ' บาท',
            serviceFeeDeducted: fullData.serviceChargeStatus?.[0] === 'หักค่าบริการแล้ว',
            notifyType: 'จบเคลม',
            note: fullData.note ?? '-',
          });
        } else if (inspectStatus === 'จบการตรวจสอบ' && claimStatus !== 'จบเคลม') {
          await sendNotification({
            ...notifyBase,
            inspector: fullData.inspector || '-',
            vehicle: fullData.vehicleInspector?.[0] || '-',
            inspectionDate: fullData.inspectionDate || '-',
            notifyType: 'จบการตรวจสอบ',
            note: fullData.note ?? '-',
          });
        } else {
          await sendNotification({
            ...notifyBase,
            address: fullData.address || '-',
            phone: fullData.phone || '-',
            notifyType: 'อัปเดตรายการเคลม',
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
      if (err instanceof BuyProductDatePersistenceError) {
        api.error({
          message: 'วันที่ซื้อยังไม่ถูกบันทึก',
          description: `${err.message} ข้อมูลส่วนอื่นอาจถูกอัปเดตแล้ว กรุณาตรวจสอบ Apps Script deployment`,
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
    <div style={{ padding: 24, maxWidth: 1400, margin: 'auto' }}>
      {contextHolder}

      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          marginBottom: 16,
        }}>
        <Select
          allowClear
          placeholder="เลือกจังหวัด"
          value={selectedProvince}
          onChange={onProvinceChange}
          options={[
            {
              label: 'ทั้งหมด',
              value: 'ทั้งหมด',
            },
            ...provinceOptions.map(p => ({
              label: p,
              value: p,
            })),
          ]}
          style={{ width: 200 }}
        />
      </div>

      <Typography.Title level={3}>📋 ตารางใบเคลม</Typography.Title>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap', // ✅ ให้ตัดบรรทัดอัตโนมัติ
          gap: 8,
          marginBottom: 10,
          alignItems: 'center',
        }}>
        <Select
          allowClear
          placeholder="สถานะการตรวจสอบ"
          value={selectedInspectStatus}
          onChange={onInspectStatusChange}
          options={[
            {
              label: 'ทั้งหมด',
              value: 'ทั้งหมด',
            },
            ...inspectStatusOptions,
          ]}
          style={{ width: 200, flex: '1 1 auto' }}
        />

        <Select
          allowClear
          placeholder="สถานะการเคลม"
          value={selectedClaimStatus}
          onChange={onClaimStatusChange}
          options={[
            {
              label: 'ทั้งหมด',
              value: 'ทั้งหมด',
            },
            ...claimStatusOptions,
          ]}
          style={{ width: 200, flex: '1 1 auto' }}
        />
      </div>

      <Input.Search
        placeholder="ค้นหา..."
        enterButton
        value={searchText}
        onChange={e => {
          setSearchText(e.target.value);
        }}
        onSearch={handleSearch}
        style={{ marginBottom: 24 }}
        allowClear
      />

      <CRUDClaim
        data={orderedClaims}
        title=""
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onRefresh={handleRefreshAndReset}
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
            <Select>
              <Select.Option value="กรุงเทพฯ">กรุงเทพฯ</Select.Option>
              <Select.Option value="อำนาจเจริญ">อำนาจเจริญ</Select.Option>
              <Select.Option value="โคราช">โคราช</Select.Option>
              <Select.Option value="อื่นๆ">อื่นๆ</Select.Option>
            </Select>
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
            <Select placeholder="เลือกสินค้า">
              {productOptions.map(product => (
                <Select.Option key={product} value={product}>
                  {product}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="buyProductDate"
            label="วันที่ซื้อ"
            rules={[
              {
                validator: (_, value) =>
                  isSupportedGregorianDate(value)
                    ? Promise.resolve()
                    : Promise.reject(new Error('กรุณากรอกปี ค.ศ. เช่น 2026 ไม่ใช่ปี พ.ศ. 2569')),
              },
            ]}>
            <DatePicker style={{ width: '100%' }} format="DD/MM/BBBB" />
          </Form.Item>
          <Form.Item name="problem" label="ปัญหา">
            <Input.TextArea />
          </Form.Item>
          <Form.Item name="warranty" label="ประเภทประกัน">
            <Checkbox.Group>
              <Checkbox value="อยู่ในประกัน">อยู่ในประกัน</Checkbox>
              <Checkbox value="หมดประกัน">หมดประกัน</Checkbox>
            </Checkbox.Group>
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
            <Radio.Group>
              <Radio value="รถยนต์">รถยนต์</Radio>
              <Radio value="รถมอเตอร์ไซค์">มอเตอร์ไซค์</Radio>
              <Radio value="อื่นๆ">อื่นๆ</Radio>
            </Radio.Group>
          </Form.Item>
          <Form.Item name="inspectionDate" label="วันที่ตรวจสอบ">
            <DatePicker style={{ width: '100%' }} format="DD/MM/BBBB" />
          </Form.Item>

          <Form.Item name="inspectstatus" label="สถานะการตรวจสอบ">
            <Select placeholder="เลือกสถานะการตรวจสอบ" style={{ width: '100%' }}>
              <Select.Option value="ไปตรวจสอบเอง">ไปตรวจสอบเอง</Select.Option>
              <Select.Option value="รอตรวจสอบ">รอตรวจสอบ</Select.Option>
              <Select.Option value="จบการตรวจสอบ">จบการตรวจสอบ</Select.Option>
              <Select.Option value="ยกเลิกการตรวจสอบ">ยกเลิกการตรวจสอบ</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="claimSender" label="คนไปเคลม">
            <Input />
          </Form.Item>
          <Form.Item
            name="vehicleClaim"
            label="ยานพาหนะไปเคลม"
            rules={[{ required: true, message: 'กรุณาเลือกยานพาหนะที่ใช้ไปเคลม' }]}>
            <Radio.Group>
              <Radio value="รถยนต์">รถยนต์</Radio>
              <Radio value="รถมอเตอร์ไซค์">มอเตอร์ไซค์</Radio>
              <Radio value="อื่นๆ">อื่นๆ</Radio>
            </Radio.Group>
          </Form.Item>
          <Form.Item name="claimDate" label="วันที่เคลม">
            <DatePicker style={{ width: '100%' }} format="DD/MM/BBBB" />
          </Form.Item>
          <Form.Item name="status" label="สถานะ">
            <Select>
              <Select.Option value="ไปเคลมเอง">ไปเคลมเอง</Select.Option>
              <Select.Option value="รอเคลม">รอเคลม</Select.Option>
              <Select.Option value="จบเคลม">จบเคลม</Select.Option>
              <Select.Option value="ยกเลิกเคลม">ยกเลิกเคลม</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="serviceChargeStatus" label="ค่าบริการ">
            <Checkbox.Group>
              <Checkbox value="หักค่าบริการแล้ว">หักค่าบริการแล้ว</Checkbox>
              <Checkbox value="ยังไม่หักค่าบริการ">ยังไม่หักค่าบริการ</Checkbox>
            </Checkbox.Group>
          </Form.Item>

          <Form.Item name="image" label="แนบรูปภาพ / วิดีโอ">
            <Upload
              name="file"
              listType="picture-card"
              accept="image/*,video/*"
              maxCount={5}
              showUploadList={{ showRemoveIcon: true }}
              customRequest={async ({ file, onSuccess, onError }) => {
                try {
                  const formData = new FormData();
                  formData.append('file', file as Blob);
                  formData.append(
                    'upload_preset',
                    process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!
                  );

                  const res = await fetch(
                    `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/auto/upload`,
                    {
                      method: 'POST',
                      body: formData,
                    }
                  );

                  const data = await res.json();
                  if (!res.ok) throw new Error(data?.error?.message || 'Cloudinary upload failed');
                  const item = mediaItemFromCloudinary(data, (file as File).name);
                  setModalMediaItems(prev => [...prev, item]);
                  onSuccess?.(data, new XMLHttpRequest());
                } catch (err) {
                  api.error({
                    message: 'อัปโหลดไฟล์ไม่สำเร็จ',
                    description:
                      err instanceof Error ? err.message : 'ไฟล์ไม่รองรับหรืออัปโหลดไม่ได้',
                  });
                  onError?.(err instanceof Error ? err : new Error(String(err)));
                }
              }}
              fileList={modalMediaItems.map((item, idx) => {
                return {
                  uid: String(idx),
                  name: item.name,
                  status: 'done',
                  url: item.url,
                  type:
                    item.resourceType === 'video'
                      ? `video/${item.format || 'mp4'}`
                      : `image/${item.format || 'jpeg'}`,
                };
              })}
              itemRender={(originNode, file, fileList, actions) => {
                const isVideo = file.type?.startsWith('video/');

                return (
                  <div style={{ position: 'relative', width: 100, height: 100 }}>
                    {isVideo ? (
                      <video
                        src={file.url}
                        autoPlay
                        muted
                        loop
                        playsInline
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          borderRadius: 8,
                          display: 'block',
                          pointerEvents: 'none',
                        }}
                      />
                    ) : (
                      originNode
                    )}
                    {/* ปุ่มลบของเราเอง */}
                    <Button
                      type="primary"
                      danger
                      size="small"
                      style={{
                        position: 'absolute',
                        top: 7,
                        right: 7,
                        zIndex: 1,
                      }}
                      onClick={() => actions.remove()}>
                      x
                    </Button>
                  </div>
                );
              }}
              onRemove={file => {
                const fileUrl = file.url || file.thumbUrl || file.response?.secure_url;
                setModalMediaItems(items => items.filter(item => item.url !== fileUrl));
                return true;
              }}>
              {modalMediaItems.length < 5 && (
                <div>
                  <PlusOutlined />
                  <div style={{ marginTop: 8 }}>อัปโหลด</div>
                </div>
              )}
            </Upload>
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
