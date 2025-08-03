'use client';

import { useEffect, useState } from 'react';
import { Modal, Form, Input, DatePicker, Button, Typography, Checkbox, Select, Divider, message, notification, Upload } from 'antd';
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


  const fetchClaims = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/get-claim', { cache: 'no-store' });
      const data = await res.json();

      const dataWithIds = data
        .filter((item: any) => !!item.id)
        .map((item: any) => ({
          ...item,
          id: item.id.trim(),
        }));

      const withId = data.map((d: any, index: number) => ({
        ...d,
        id: d.id?.trim() || `row-${index}`,
      }));

      setClaims(withId);
      setFilteredClaims(dataWithIds);
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

  const handleSearch = (value: string) => {
    setSearchText(value);
    const lowerValue = value.toLowerCase();
    const filtered = claims.filter((item: any) =>
      Object.values(item).some(
        (field) => typeof field === 'string' && field.toLowerCase().includes(lowerValue)
      )
    );
    setFilteredClaims(filtered);
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
      ? record.vehicleInspector
      : typeof record.vehicleInspector === 'string'
        ? record.vehicleInspector.split(', ').map((v: string) => v.trim())
        : [],
    inspectionDate: record.inspectionDate ? dayjs(record.inspectionDate) : null,
    inspectstatus: record.inspectstatus,
    claimSender: record.claimSender,
    vehicleClaim: Array.isArray(record.vehicleClaim)
      ? record.vehicleClaim
      : typeof record.vehicleClaim === 'string'
        ? record.vehicleClaim.split(', ').map((v: string) => v.trim())
        : [],
    claimDate: record.claimDate ? dayjs(record.claimDate) : null,
    status: record.status,
    price: record.price,
    serviceChargeStatus: Array.isArray(record.serviceChargeStatus)
      ? record.serviceChargeStatus
      : typeof record.serviceChargeStatus === 'string'
        ? record.serviceChargeStatus.split(', ').map((s: string) => s.trim())
        : [],
    note: record.note,
  });

  
  setModalImageUrls(
  record.image
    ? Array.isArray(record.image)
      ? record.image
      : [record.image]
    : []
);

  setSelectedRow(record);
  setIsModalOpen(true);
};


  const handleDelete = async (record: any) => {
    try {
      const res = await fetch('/api/delete-claim', {
        method: 'POST',
        body: JSON.stringify({ id: record.id, sheetName: 'ใบเคลม' }),
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

  const fullData = {
  id: selectedRow.id,
  ...values,
  sheetName: 'ใบเคลม',

  inspectionDate: values.inspectionDate?.isValid?.()
    ? values.inspectionDate.format('YYYY-MM-DD')
    : '',

  receiverClaimDate: values.receiverClaimDate?.isValid?.()
    ? values.receiverClaimDate.format('YYYY-MM-DD')
    : '',

  claimDate: values.claimDate?.isValid?.()
    ? values.claimDate.format('YYYY-MM-DD')
    : '',
};

  const imageUrls = modalImageUrls; // <-- เป็น array เสมอ


  try {
    const res = await fetch('/api/update-claim', {
      method: 'POST',
      body: JSON.stringify({ ...fullData, image:imageUrls, action: 'update',  }), // ✔ เพิ่ม action เผื่อ script เช็กไว้
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
    };

    if (claimStatus === "จบเคลม") {
      await fetch('/api/notify-claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...notifyBase,
          claimer: fullData.claimSender || '-',
          vehicle: fullData.vehicleClaim?.[0] || '-',
          claimDate: fullData.claimDate || '-',
          amount: fullData.price || '-' + ' บาท',
          serviceFeeDeducted: fullData.serviceChargeStatus?.[0] === 'หักค่าบริการแล้ว',
          notifyType: 'จบเคลม',
        }),
      });
    } else if (inspectStatus === 'จบการตรวจสอบ' && claimStatus !== 'จบเคลม') {
      await fetch('/api/notify-claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...notifyBase,
          inspector: fullData.inspector || '-',
          vehicle: fullData.vehicleInspector?.[0] || '-',
          inspectionDate: fullData.inspectionDate || '-',
          notifyType: 'จบการตรวจสอบ',
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
      <Typography.Title level={3}>📋 รายการใบเคลม</Typography.Title>

      <Input.Search
        placeholder="ค้นหาชื่อลูกค้า"
        enterButton
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
        onSearch={handleSearch}
        style={{ marginBottom: 24 }}
        allowClear
      />

      <CRUDClaim
        data={filteredClaims}
        title=""
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onRefresh={fetchClaims}
      />

      <Modal
        title={
         <div style={{ fontSize: 22, fontWeight: 'bold', color: '#000000ff', marginTop : 16 }}>
            🛠️ แก้ไขรายการใบเคลม
          </div>
        }
        open={isModalOpen}
        onCancel={() => {
          setIsModalOpen(false);
          form.resetFields();
        }}
        footer={null}
        width={800}
      >
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
          <Form.Item name="customerName" label="ชื่อลูกค้า"><Input /></Form.Item>
          <Form.Item name="phone" label="เบอร์โทร"><Input /></Form.Item>
          <Form.Item name="address" label="ที่อยู่"><Input /></Form.Item>
          <Form.Item name="product" label="สินค้า"><Input /></Form.Item>
          <Form.Item name="problem" label="ปัญหา"><Input.TextArea /></Form.Item>
          <Form.Item name="warranty" label="ประเภทประกัน">
            <Checkbox.Group>
              <Checkbox value="อยู่ในประกัน">อยู่ในประกัน</Checkbox>
              <Checkbox value="หมดประกัน">หมดประกัน</Checkbox>
            </Checkbox.Group>
          </Form.Item>

          <Divider />
          <Typography.Title level={4}>🧑‍🔧  ส่วนของพนักงาน</Typography.Title>
          <Form.Item name="receiver" label="ผู้รับเคลม">
            <Input />
          </Form.Item>
          <Form.Item name="receiverClaimDate" label="วันที่รับเคลม"><DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" /></Form.Item>
          <Form.Item name="inspector" label="ผู้ตรวจสอบ"><Input /></Form.Item>
          <Form.Item name="vehicleInspector" label="ยานพาหนะตรวจสอบ">
            <Checkbox.Group>
              <Checkbox value="รถยนต์">รถยนต์</Checkbox>
              <Checkbox value="รถมอเตอร์ไซค์">มอเตอร์ไซค์</Checkbox>
            </Checkbox.Group>
          </Form.Item>
          <Form.Item name="inspectionDate" label="วันที่ตรวจสอบ"><DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" /></Form.Item>

          <Form.Item name="inspectstatus" label="สถานะการตรวจสอบ">
          <Select placeholder="เลือกสถานะการตรวจสอบ" style={{ width: '100%' }}>
            <Select.Option value="ไปเอง">ไปเอง</Select.Option>
            <Select.Option value="รอตรวจสอบ">รอตรวจสอบ</Select.Option>
            <Select.Option value="จบการตรวจสอบ">จบการตรวจสอบ</Select.Option>
            <Select.Option value="ยกเลิกการตรวจสอบ">ยกเลิกการตรวจสอบ</Select.Option>
          </Select>
          </Form.Item>

          <Form.Item name="claimSender" label="คนไปเคลม"><Input /></Form.Item>
          <Form.Item name="vehicleClaim" label="ยานพาหนะไปเคลม">
            <Checkbox.Group>
              <Checkbox value="รถยนต์">รถยนต์</Checkbox>
              <Checkbox value="รถมอเตอร์ไซค์">มอเตอร์ไซค์</Checkbox>
            </Checkbox.Group>
          </Form.Item>
          <Form.Item name="claimDate" label="วันที่เคลม"><DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" /></Form.Item>
          <Form.Item name="status" label="สถานะ">
            <Select>
              <Select.Option value="ไปเอง">ไปเอง</Select.Option>
              <Select.Option value="รอเคลม">รอเคลม</Select.Option>
              <Select.Option value="จบเคลม">จบเคลม</Select.Option>
              <Select.Option value="ยกเลิกเคลม">ยกเลิกเคลม</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="price" label="จำนวนเงิน"><Input prefix="฿" type="number" /></Form.Item>
          <Form.Item name="serviceChargeStatus" label="ค่าบริการ">
            <Checkbox.Group>
              <Checkbox value="หักค่าบริการแล้ว">หักค่าบริการแล้ว</Checkbox>
              <Checkbox value="ยังไม่หักค่าบริการ">ยังไม่หักค่าบริการ</Checkbox>
            </Checkbox.Group>
          </Form.Item>



          <Form.Item name="image" label="แนบรูปภาพ">
            <Upload
              name="file"
              listType="picture-card"
              showUploadList={true}
              maxCount={4}
              customRequest={async ({ file, onSuccess, onError }) => {
                try {
                  const formData = new FormData();
                  formData.append('file', file as Blob);
                  formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!);

                  const res = await fetch(`https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`, {
                    method: 'POST',
                    body: formData,
                  });

                  const data = await res.json();
                  if (data.secure_url) {
                    setModalImageUrls(prev => [...prev, data.secure_url]);
                    // ไม่ต้อง setFieldsValue({ image: ... }) อีก
                    onSuccess && onSuccess(data, new XMLHttpRequest());
                  } else {
                    throw new Error('Upload failed');
                  }
                } catch (err) {
                  onError && onError(err as any);
                }
              }}
              fileList={modalImageUrls.map((url, idx) => ({
                uid: String(idx),
                name: `image${idx + 1}.png`,
                status: 'done',
                url,
              }))}
              onRemove={file => {
                setModalImageUrls(urls => urls.filter(u => u !== file.url));
                return true;
              }}
            >
              {modalImageUrls.length < 4 && (
                <div>
                  <PlusOutlined />
                  <div style={{ marginTop: 8 }}>อัปโหลด</div>
                </div>
              )}
            </Upload>
          </Form.Item>
          <Form.Item name="note" label="หมายเหตุ"><Input.TextArea /></Form.Item>

          <Button type="primary" htmlType="submit" loading={loading}>
            บันทึกข้อมูล
          </Button>
        </Form>
      </Modal>
    </div>
  );
}