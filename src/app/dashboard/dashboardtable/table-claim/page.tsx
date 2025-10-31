'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Form,
  Input,
  DatePicker,
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
import dayjs from 'dayjs';
import CRUDClaim from '../components/CRUDClaim';
import PlusOutlined from '@ant-design/icons/lib/icons/PlusOutlined';

export default function DashboardTablePage() {
  const [claims, setClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<any>(null);
  const [searchText, setSearchText] = useState('');
  const [form] = Form.useForm();
  const [filteredClaims, setFilteredClaims] = useState<any[]>([]);
  const [api, contextHolder] = notification.useNotification();
  const [modalImageUrls, setModalImageUrls] = useState<string[]>([]);
  const [productOptions, setProductOptions] = useState<string[]>([]);
  const [selectedProvince, setSelectedProvince] = useState<string | undefined>();
  const [selectedClaimStatus, setSelectedClaimStatus] = useState<string | undefined>();
  const [selectedInspectStatus, setSelectedInspectStatus] = useState<string | undefined>();

  // รายการจังหวัด (unique) จากข้อมูลที่ดึงมา
  const provinceOptions = useMemo(() => {
    const set = new Set<string>();
    claims.forEach((c: any) => {
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
    const fetchProducts = async () => {
      try {
        const res = await fetch('/api/get-productlist');
        const data = await res.json();
        const names = data.map((p: any) => p['สินค้า'] || p.name || 'ไม่ทราบชื่อ');
        setProductOptions(names);
      } catch (err) {
        console.error('โหลดสินค้าไม่สำเร็จ:', err);
      }
    };
    fetchProducts();
  }, []);

  const fetchClaims = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/get-claim', {
        cache: 'no-store',
      });
      const data = await res.json();

      const withId = data.map((d: any, index: number) => ({
        ...d,
        id: d.id?.trim() || `row-${index}`,
      }));

      const baseFilter = withId.slice().reverse();

      setClaims(baseFilter);
      setFilteredClaims(baseFilter);
      setSearchText('');
    } catch (err) {
      message.error('โหลดข้อมูลไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClaims();
  }, []);

  const applyFilters = () => {
    const text = searchText.toLowerCase().trim();

    let data = [...claims]; // เริ่มจากข้อมูลดิบทั้งหมด

    // กรองจังหวัด
    if (selectedProvince && selectedProvince !== 'ทั้งหมด') {
      data = data.filter((i: any) => {
        const p = i.ProvinceName || i.provinceName;
        return typeof p === 'string' && p.trim() === selectedProvince;
      });
    }

    // กรองสถานะการเคลม
    if (selectedClaimStatus && selectedClaimStatus !== 'ทั้งหมด') {
      data = data.filter((i: any) => i.status === selectedClaimStatus);
    }

    // กรองสถานะการตรวจสอบ
    if (selectedInspectStatus && selectedInspectStatus !== 'ทั้งหมด') {
      data = data.filter((i: any) => i.inspectstatus === selectedInspectStatus);
    }

    // กรองด้วยคำค้นหา (ค้นทุกฟิลด์ string)
    if (text) {
      data = data.filter((item: any) =>
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
  const getPriority = (r: any) => {
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

  const handleEdit = (record: any) => {
    const parseDate = (dateStr: any) => {
      const parsed = dayjs(dateStr, ['D/M/YYYY', 'DD/MM/YYYY'], true);
      return parsed.isValid() ? parsed : null;
    };

    form.setFieldsValue({
      provinceName: record.ProvinceName,
      customerName: record.CustomerName,
      phone: record.Phone,
      address: record.Address,
      product: record.Product,
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

    setModalImageUrls(
      record.image ? (Array.isArray(record.image) ? record.image : [record.image]) : []
    );

    setSelectedRow(record);
    setIsModalOpen(true);
  };

  const handleDelete = async (record: any) => {
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

  const replaceEmptyWithDash = (obj: any) => {
    const newObj: any = {};
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

  const handleSubmit = async (values: any) => {
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

      claimDate: values.claimDate?.isValid?.() ? values.claimDate.format('YYYY-MM-DD') : '-',
    };

    const imageUrls = modalImageUrls; // <-- เป็น array เสมอ

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
          await fetch('/api/notify-claim', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              ...notifyBase,
              claimer: fullData.claimSender || '-',
              vehicle: fullData.vehicleClaim?.[0] || '-',
              claimDate: fullData.claimDate || '-',
              amount: fullData.price || '-' + ' บาท',
              serviceFeeDeducted: fullData.serviceChargeStatus?.[0] === 'หักค่าบริการแล้ว',
              notifyType: 'จบเคลม',
              note: fullData.note ?? '-',
            }),
          });
        } else if (inspectStatus === 'จบการตรวจสอบ' && claimStatus !== 'จบเคลม') {
          await fetch('/api/notify-claim', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              ...notifyBase,
              inspector: fullData.inspector || '-',
              vehicle: fullData.vehicleInspector?.[0] || '-',
              inspectionDate: fullData.inspectionDate || '-',
              notifyType: 'จบการตรวจสอบ',
              note: fullData.note ?? '-',
            }),
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
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
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
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
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
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
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
              accept="image/*,video/mp4,video/webm"
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
                  if (data.secure_url) {
                    setModalImageUrls(prev => [...prev, data.secure_url]);
                    onSuccess?.(data, new XMLHttpRequest());
                  } else {
                    throw new Error('Upload failed');
                  }
                } catch (err) {
                  onError?.(err as any);
                }
              }}
              fileList={modalImageUrls.map((url, idx) => {
                const isVideo = url.includes('.mp4') || url.includes('video');
                const isImage =
                  url.includes('.jpg') ||
                  url.includes('.jpeg') ||
                  url.includes('.png') ||
                  url.includes('.gif') ||
                  url.includes('image');

                return {
                  uid: String(idx),
                  name: `file${idx + 1}`,
                  status: 'done',
                  url,
                  type: isVideo ? 'video/mp4' : isImage ? 'image/png' : 'file',
                };
              })}
              itemRender={(originNode, file, fileList, actions) => {
                const isVideo = file.type === 'video' || file.url?.includes('.mp4');

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
                setModalImageUrls(urls => urls.filter(u => u !== fileUrl));
                return true;
              }}>
              {modalImageUrls.length < 5 && (
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
