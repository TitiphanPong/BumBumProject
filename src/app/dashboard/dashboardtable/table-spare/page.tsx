'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Form,
  Modal,
  Input,
  Button,
  Typography,
  Divider,
  message,
  Select,
  Checkbox,
  notification,
} from 'antd';
import DatePicker from '@/components/ThaiDatePicker';
import dayjs from 'dayjs';
import CRUDSparePart from '../components/CRUDSparePart';
import type { SheetFormValues, SheetRow } from '@/lib/sheet-types';

export default function SparePartPage() {
  const [parts, setParts] = useState<SheetRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<SheetRow | null>(null);
  const [searchText, setSearchText] = useState('');
  const [form] = Form.useForm();
  const [filteredParts, setFilteredParts] = useState<SheetRow[]>([]);
  const [api, contextHolder] = notification.useNotification();
  const [selectedProvince, setSelectedProvince] = useState<string | undefined>();

  const provinceOptions = useMemo(() => {
    const set = new Set<string>();
    parts.forEach(c => {
      const p = c.ProvinceName || c.provinceName;
      if (p && typeof p === 'string') set.add(p.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'th'));
  }, [parts]);

  const fetchParts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/get-spare', { cache: 'no-store' });
      const data = await res.json();

      const withId = (data as SheetRow[]).map((d, index) => ({
        ...d,
        id: d.id?.trim() || `row-${index}`,
      }));

      const baseFilter = withId.slice().reverse();

      setParts(baseFilter);
      setFilteredParts(baseFilter);
      setSearchText('');
    } catch (err) {
      message.error('โหลดข้อมูลไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParts();
  }, []);

  const applyFilters = (args?: {
    text?: string;
    province?: string;
    claimStatus?: string;
    inspectStatus?: string;
  }) => {
    const text = (args?.text ?? searchText).toLowerCase().trim();
    const province = args?.province ?? selectedProvince;

    let data = [...parts]; // ใช้ลำดับเดิมจาก fetch

    // กรองจังหวัด
    if (province && province !== 'ทั้งหมด') {
      data = data.filter(i => {
        const p = i.ProvinceName || i.provinceName;
        return typeof p === 'string' && p.trim() === province;
      });
    }

    // กรองด้วยคำค้นหา (ค้นทุกฟิลด์ที่เป็น string)
    if (text) {
      data = data.filter(item =>
        Object.values(item).some(
          field => typeof field === 'string' && field.toLowerCase().includes(text)
        )
      );
    }

    setFilteredParts(data);
  };

  const handleSearch = (value: string) => {
    setSearchText(value);

    const lowerValue = value.toLowerCase();
    const filtered = parts.filter(item =>
      Object.values(item).some(
        field => typeof field === 'string' && field.toLowerCase().includes(lowerValue)
      )
    );
    setFilteredParts(filtered);
  };

  const handleEdit = (record: SheetRow) => {
    const parseDate = (dateStr?: string) => {
      const parsed = dayjs(dateStr, ['D/M/YYYY', 'DD/MM/YYYY'], true);
      return parsed.isValid() ? parsed : null;
    };

    form.setFieldsValue({
      provinceName: record.ProvinceName,
      customerName: record.CustomerName,
      product: record.Product,
      warranty: Array.isArray(record.Warranty)
        ? record.Warranty
        : typeof record.Warranty === 'string'
          ? record.Warranty.split(', ').map((w: string) => w.trim())
          : [],
      problem: record.Problem,
      part: record.part,
      requestDate: record.requestDate ? dayjs(record.requestDate) : null,
      requester: record.requester,
      payer: record.payer,
      receiver: record.receiver,
      receiverItemDate: record.receiverItemDate ? dayjs(record.receiverItemDate) : null,
      note: record.note,
    });

    setSelectedRow(record);
    setIsModalOpen(true);
  };

  const onProvinceChange = (val?: string) => {
    setSelectedProvince(val);
    applyFilters({ province: val });
  };

  const resetFilters = () => {
    setSelectedProvince(undefined); // ✅ ล้างจังหวัด
    setSearchText('');
  };

  const handleRefreshAndReset = async () => {
    resetFilters();
    await fetchParts();
  };

  const handleDelete = async (record: SheetRow) => {
    try {
      const res = await fetch('/api/delete-part', {
        method: 'POST',
        body: JSON.stringify({
          id: record.id,
          sheetName: 'เบิกอะไหล่',
        }),
      });
      const result = await res.json();
      if (result.result === 'success') {
        message.success('ลบข้อมูลแล้ว');
        fetchParts();
      } else {
        throw new Error(result.message);
      }
    } catch (err) {
      console.error(err);
      message.error('ลบข้อมูลไม่สำเร็จ');
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

    const cleanValues = replaceEmptyWithDash(values);

    const fullData = {
      id: selectedRow?.id,
      ...cleanValues,
      sheetName: 'เบิกอะไหล่',

      requestDate: values.requestDate?.isValid?.() ? values.requestDate.format('YYYY-MM-DD') : '-',

      receiverItemDate: values.receiverItemDate?.isValid?.()
        ? values.receiverItemDate.format('YYYY-MM-DD')
        : '-',
    };

    try {
      const res = await fetch('/api/update-part', {
        method: 'POST',
        body: JSON.stringify({ ...fullData, action: 'update' }),
      });
      const result = await res.json();
      if (result.result === 'success') {
        api.success({
          message: 'อัปเดตข้อมูลสำเร็จ',
          description: 'ระบบได้อัปเดตรายการเบิกอะไหล่เรียบร้อยแล้ว',
          placement: 'topRight',
        });
        setIsModalOpen(false);
        form.resetFields();
        fetchParts();
      } else {
        throw new Error(result.message);
      }
    } catch (err) {
      api.error({
        message: 'เกิดข้อผิดพลาด',
        description: 'อัปเดตข้อมูลไม่สำเร็จ กรุณาลองใหม่',
        placement: 'topRight',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <Select
          allowClear
          placeholder="เลือกจังหวัด"
          value={selectedProvince}
          onChange={onProvinceChange}
          options={[
            { label: 'ทั้งหมด', value: 'ทั้งหมด' },
            ...provinceOptions.map(p => ({ label: p, value: p })),
          ]}
          style={{ width: 200 }}
        />
      </div>
      {contextHolder}
      <Typography.Title level={3}>🔧 ตารางเบิกอะไหล่</Typography.Title>

      <Input.Search
        placeholder="ค้นหา..."
        enterButton
        value={searchText}
        onChange={e => setSearchText(e.target.value)}
        onSearch={handleSearch}
        style={{ marginBottom: 24 }}
        allowClear
      />

      <CRUDSparePart
        data={filteredParts}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onRefresh={handleRefreshAndReset}
      />

      <Modal
        title={
          <div style={{ fontSize: 22, fontWeight: 'bold', color: '#000000ff', marginTop: 16 }}>
            🛠️ แก้ไขรายการเบิกอะไหล่
          </div>
        }
        open={isModalOpen}
        onCancel={() => {
          form.resetFields();
          setIsModalOpen(false);
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
          <Form.Item name="product" label="สินค้า">
            <Input />
          </Form.Item>
          <Form.Item name="warranty" label="ประเภทประกัน">
            <Checkbox.Group>
              <Checkbox value="อยู่ในประกัน">อยู่ในประกัน</Checkbox>
              <Checkbox value="หมดประกัน">หมดประกัน</Checkbox>
            </Checkbox.Group>
          </Form.Item>
          <Form.Item name="problem" label="รายละเอียดปัญหา">
            <Input.TextArea />
          </Form.Item>

          <Divider />
          <Typography.Title level={4}>บัญชี / สต็อค</Typography.Title>
          <Form.Item name="part" label="ชื่ออะไหล่">
            <Input />
          </Form.Item>
          <Form.Item name="requestDate" label="วันที่เบิก">
            <DatePicker style={{ width: '100%' }} format="DD/MM/BBBB" />
          </Form.Item>
          <Form.Item label="ผู้เบิกของ" name="requester">
            <Input placeholder="ชื่อฝ่ายเครดิต" />
          </Form.Item>
          <Form.Item label="ผู้จ่ายของ" name="payer">
            <Input placeholder="ชื่อฝ่ายสต็อค" />
          </Form.Item>
          <Form.Item label="ผู้รับของ " name="receiver">
            <Input placeholder="ชื่อฝ่ายสต็อค ⚠️ *กรอกข้อมูลเมื่อได้รับอะไหล่คืน*" />
          </Form.Item>
          <Form.Item name="receiverItemDate" label="วันที่รับของ">
            <DatePicker style={{ width: '100%' }} format="DD/MM/BBBB" />
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
